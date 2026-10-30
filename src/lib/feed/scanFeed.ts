// 백엔드 REST API 를 폴링해 스캔 연출(public/scan.html) 이벤트로 바꾼다.
//
//   GET /scans/:id/progress  (1.5초마다)  → scan.progress … 완료되면
//   GET /scans/:id, /report, /findings/:id → scan.started → file.scanning → finding.detected* → file.done … → scan.finished
//   (모두 고치기)  POST·GET /findings/:id/fixes → fix.applied + verify.result
//                 POST·GET /scans/:id/pull-requests → pr.created | fix.ended
//
// 백엔드는 줄 단위 진행을 주지 않으므로, 탐지가 끝난 뒤 결과를 받아 연출이 처음부터 훑는다.
// 다시 접속하면 처음부터 다시 보여 주고, 이미 열린 PR 이 있으면 고치기까지 이어서 보여 준다.
import { ApiError } from "@/lib/api/client";
import { fixesApi, pullRequestsApi, reportsApi, scansApi } from "@/lib/api";
import type { FindingDetail, Fix, PullRequest, Scan } from "@/lib/api/types";
import { CATEGORY_LABEL, STATUS_LABEL } from "./labels";
import { buildExcerpt, displayLine, fetchRepoFile, pickToken, toHunks, type Excerpt } from "./code";
import type { ScanEvent } from "./scanEvents";

const POLL_MS = 1500;
const FIX_POLL_MS = 2500;
/** 수정안 하나·PR 하나를 기다리는 최대 시간. 백엔드는 고칠 수 없는 취약점에 수정안을 끝내 만들지 않는다 */
const WAIT_MS = 90_000;
/** 마지막 수정안이 나온 뒤 남은 수정안을 더 기다리는 시간 */
const SETTLE_MS = 30_000;

export class ScanFeed {
  private readonly scanId: number;
  private readonly push: (event: ScanEvent) => void;
  private readonly signal: AbortSignal;
  /** owner/name. 대시보드·범위 설정에서 주소로 넘겨준다. 모르면 빈 문자열 */
  private readonly repo: string;
  private scan: Scan | null = null;
  private findings: FindingDetail[] = [];
  private excerpts = new Map<string, Excerpt>();
  private fixing = false;

  constructor(scanId: number, repo: string, push: (event: ScanEvent) => void, signal: AbortSignal) {
    this.scanId = scanId;
    this.repo = repo;
    this.push = push;
    this.signal = signal;
  }

  private get repoName() {
    return this.repo || `스캔 #${this.scanId}`;
  }

  private get branch() {
    return this.scan?.branch ?? "";
  }

  private sleep(ms: number) {
    return new Promise<void>((resolve, reject) => {
      const onAbort = () => {
        clearTimeout(t);
        reject(new DOMException("abort", "AbortError"));
      };
      const t = setTimeout(() => {
        this.signal.removeEventListener("abort", onAbort);
        resolve();
      }, ms);
      if (this.signal.aborted) onAbort();
      else this.signal.addEventListener("abort", onAbort, { once: true });
    });
  }

  private emit(event: ScanEvent) {
    if (!this.signal.aborted) this.push(event);
  }

  async start() {
    try {
      if (!(await this.waitForScan())) return;
      await this.playResults();
      await this.resumeFix();
    } catch (e) {
      if (this.signal.aborted) return;
      this.emit({ type: "scan.failed", message: messageOf(e, "스캔 결과를 불러오지 못했어요") });
    }
  }

  /** 백엔드가 탐지·분류를 끝낼 때까지 진행률을 폴링한다. 실패하면 false */
  private async waitForScan(): Promise<boolean> {
    let misses = 0;
    for (;;) {
      let progress;
      try {
        progress = await scansApi.progress(this.scanId);
        misses = 0;
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) {
          this.emit({ type: "scan.failed", message: "스캔을 찾을 수 없어요" });
          return false;
        }
        // 잠깐 끊긴 건 다시 시도하고, 계속 안 되면 알린다
        if (++misses >= 4) throw new Error("백엔드에 연결할 수 없어요");
        await this.sleep(POLL_MS);
        continue;
      }
      if (progress.status === "completed") return true;
      if (progress.status === "failed") {
        const scan = await scansApi.get(this.scanId).catch(() => null);
        this.emit({ type: "scan.failed", message: scan?.error_message || progress.message || "스캔에 실패했어요" });
        return false;
      }
      if (!this.scan) this.scan = await scansApi.get(this.scanId).catch(() => null);
      const label = STATUS_LABEL[progress.status];
      this.emit({
        type: "scan.progress",
        repo: this.repoName,
        branch: this.branch,
        status: label,
        message: `${progress.message || label} · ${progress.percent}%`,
      });
      await this.sleep(POLL_MS);
    }
  }

  /** 우선 조치 대상(리포트 top_findings)을 파일별로 묶어 연출에 넘긴다 */
  private async playResults() {
    const [scan, report] = await Promise.all([scansApi.get(this.scanId), reportsApi.report(this.scanId)]);
    this.scan = scan;
    const details = await Promise.all(report.top_findings.map((f) => reportsApi.finding(f.id).catch(() => null)));
    // 상세를 못 받으면 목록 정보만으로 보여 준다
    this.findings = report.top_findings.map(
      (f, i) => details[i] ?? { ...f, message: "", end_line: null, snippet: null, owasp: [], dependency: null, merged_tools: [] },
    );

    const byPath = new Map<string, FindingDetail[]>();
    for (const f of this.findings) byPath.set(f.file_path, [...(byPath.get(f.file_path) ?? []), f]);
    const ref = scan.commit_sha ?? scan.branch ?? "HEAD";
    await Promise.all(
      [...byPath].map(async ([path, list]) => {
        const source = this.repo ? await fetchRepoFile(this.repo, ref, path) : null;
        this.excerpts.set(path, buildExcerpt(source, list));
      }),
    );

    this.emit({
      type: "scan.started",
      repo: this.repoName,
      branch: scan.branch ?? scan.commit_sha?.slice(0, 7) ?? "",
      // 파일 트리도 훑는 순서(우선순위)대로
      files: [...byPath.keys()].map((path) => {
        const ex = this.excerpts.get(path)!;
        return { path, content: ex.lines.join("\n"), nums: ex.nums };
      }),
    });
    for (const [path, list] of byPath) {
      const ex = this.excerpts.get(path)!;
      this.emit({ type: "file.scanning", path });
      for (const f of list) {
        const line = displayLine(ex, f.start_line);
        this.emit({
          type: "finding.detected",
          finding: {
            id: String(f.id),
            path,
            line,
            token: pickToken(ex.lines[line - 1] ?? "", f),
            severity: f.severity,
            title: f.title,
            description: [CATEGORY_LABEL[f.category] ?? f.category, f.owasp_top10, f.cwe[0]].filter(Boolean).join(" · "),
          },
        });
      }
      this.emit({ type: "file.done", path });
    }
    this.emit({ type: "scan.finished" });
  }

  /** 이미 PR 을 요청한 스캔이면 그때 만든 수정안과 PR 을 이어서 보여 준다 */
  private async resumeFix() {
    const prs = await pullRequestsApi.list(this.scanId).catch(() => []);
    const pr = prs.find((p) => p.status !== "failed");
    if (!pr) return;
    this.fixing = true;
    const fixes = await Promise.all(
      this.findings.map((f) =>
        fixesApi
          .list(f.id)
          .then((l) => l[0])
          .catch(() => undefined),
      ),
    );
    fixes.forEach((fix, i) => fix && this.emitFix(this.findings[i], fix));
    await this.waitForPr(pr);
  }

  /** 연출 화면에서 "모두 고치고 PR 열기" 를 눌렀을 때 */
  async fixAll() {
    if (this.fixing) return;
    this.fixing = true;
    try {
      const fixes = await this.collectFixes();
      if (!fixes.length) {
        this.emit({ type: "fix.ended", message: "수정안을 만들지 못했어요" });
        return;
      }
      const pr = await pullRequestsApi.create(
        this.scanId,
        fixes.map((f) => f.id),
      );
      await this.waitForPr(pr);
    } catch (e) {
      if (this.signal.aborted) return;
      this.emit({ type: "fix.ended", message: messageOf(e, "PR 을 열지 못했어요") });
    }
  }

  /** 취약점마다 수정안을 요청하고, 만들어지는 대로 연출에 넘긴다. 이미 있는 수정안은 다시 만들지 않는다 */
  private async collectFixes(): Promise<Fix[]> {
    const done: Fix[] = [];
    // 하나라도 만들어진 뒤로 한동안 새 수정안이 없으면, 남은 것은 백엔드가 못 고치는 것으로 보고 기다리지 않는다
    let lastArrival = 0;
    const givenUp = (until: number) => Date.now() >= until || (lastArrival > 0 && Date.now() - lastArrival > SETTLE_MS);
    await Promise.all(
      this.findings.map(async (f) => {
        let fix = await fixesApi
          .list(f.id)
          .then((l) => l[0])
          .catch(() => undefined);
        if (!fix) {
          const accepted = await fixesApi.request(f.id).catch(() => null);
          if (!accepted) return;
          const until = Date.now() + WAIT_MS;
          while (!fix && !givenUp(until)) {
            await this.sleep(FIX_POLL_MS);
            fix = await fixesApi
              .list(f.id)
              .then((l) => l[0])
              .catch(() => undefined);
          }
        }
        if (!fix) return;
        lastArrival = Date.now();
        done.push(fix);
        this.emitFix(f, fix);
      }),
    );
    return done;
  }

  private emitFix(f: FindingDetail, fix: Fix) {
    const ex = this.excerpts.get(f.file_path);
    if (!ex) return;
    const id = String(f.id);
    this.emit({ type: "fix.applied", findingId: id, path: f.file_path, hunks: toHunks(ex.lines, fix, displayLine(ex, f.start_line)) });
    this.emit({ type: "verify.result", findingId: id, blocked: fix.verified });
  }

  /** PR 이 만들어질 때까지 PR 목록을 폴링한다 */
  private async waitForPr(pr: PullRequest) {
    const until = Date.now() + WAIT_MS;
    let current: PullRequest | undefined = pr;
    while (current?.status === "pending" && Date.now() < until) {
      await this.sleep(FIX_POLL_MS);
      current = (await pullRequestsApi.list(this.scanId).catch(() => [])).find((p) => p.id === pr.id) ?? current;
    }
    if (current?.status === "created" && current.pr_url) {
      this.emit({ type: "pr.created", number: current.pr_number, url: current.pr_url, title: current.branch_name });
    } else {
      this.emit({ type: "fix.ended", message: current?.status === "pending" ? "PR 이 아직 만들어지는 중이에요" : "PR 을 열지 못했어요" });
    }
  }
}

function messageOf(e: unknown, fallback: string) {
  return e instanceof Error && e.message ? e.message : fallback;
}

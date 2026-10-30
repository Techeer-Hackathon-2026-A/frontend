import "server-only";
import type { Finding, FindingDetail, Fix, PullRequest, SecurityReport } from "@/lib/api/types";
import { backendGet, type ScanOut } from "@/lib/backend";
import { listRepos, getRepoScope, blameLine } from "@/lib/github";
import { buildTree, type ScopeNode } from "@/lib/scope";
import type { User } from "@/lib/session";

// 앱 화면(public/app.html, prototype/index.html 그대로)에 넣을 데이터.
// 프로토타입의 목업 데이터(REPOS·SCANS·F·TREE_SRC·BRANCHES)와 같은 모양으로 GitHub·팀 백엔드 데이터를 바꾼다.
// 스캔 id 는 "s_<백엔드 id>", 취약점 id 는 "f_<백엔드 id>".

type DiffRow = ["h", string] | [" " | "-" | "+", number, number, string];

export interface AppFinding {
  sev: string;
  title: string;
  desc: string;
  path: string;
  line: number;
  /** 고치기 전 근거. 백엔드는 실공격 대신 탐지기 결과를 준다 */
  exploit: { kind: "log"; lines: string[] };
  /** 고친 뒤 검증(Fix.verified). ok 가 false 면 막히지 않은 것 */
  recheck?: { kind: "log"; lines: string[]; ok: boolean };
  diff: DiffRow[];
  fixId?: number;
  /** 이 줄을 마지막으로 바꾼 커밋 — 누가, 어떤 커밋·PR 에서 넣었는지 */
  who?: AppBlame;
}

export interface AppBlame {
  name: string;
  login: string | null;
  avatar: string | null;
  sha: string;
  msg: string;
  ago: string;
  url: string;
  pr: { n: number; title: string; url: string } | null;
}

export interface AppScan {
  repo: string;
  branch: string;
  commit: string;
  scope: string;
  dur: string;
  ago: string;
  status: "queued" | "scanning" | "scanned" | "fixing" | "done" | "failed";
  msg?: string;
  found?: number;
  findings?: string[];
  fixed?: string[];
  safe: { text: string; at: string }[];
  pr?: { n: number | null; title: string; add: number; del: number; files: number; merged: boolean; url: string | null };
}

const CATEGORY: Record<string, string> = { sast: "코드 취약점", sca: "라이브러리 취약점", secret: "시크릿 유출" };

const utc = (iso: string) => (/[zZ]$|[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso}Z`);

/** "2시간 전", "어제", "3일 전" (프로토타입 표기) */
export function ago(iso: string, now = Date.now()) {
  const sec = Math.max(0, (now - new Date(utc(iso)).getTime()) / 1000);
  if (sec < 60) return "방금";
  if (sec < 3600) return `${Math.floor(sec / 60)}분 전`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}시간 전`;
  if (sec < 172800) return "어제";
  if (sec < 604800) return `${Math.floor(sec / 86400)}일 전`;
  if (sec < 2592000) return `${Math.floor(sec / 604800)}주 전`;
  if (sec < 31536000) return `${Math.floor(sec / 2592000)}달 전`;
  return `${Math.floor(sec / 31536000)}년 전`;
}

function duration(from: string, to: string | null) {
  if (!to) return "—";
  const sec = Math.max(0, Math.round((new Date(utc(to)).getTime() - new Date(utc(from)).getTime()) / 1000));
  return sec >= 60 ? `${Math.floor(sec / 60)}분 ${sec % 60}초` : `${sec}초`;
}

const split = (text: string) => text.replace(/\r\n/g, "\n").replace(/\n+$/, "").split("\n");

/** original_code → fixed_code 줄 단위 diff (LCS). 줄 번호는 취약점 줄부터 센다 */
function diffRows(before: string, after: string, firstLine: number): DiffRow[] {
  const a = split(before);
  const b = split(after);
  const dp = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const rows: DiffRow[] = [["h", `@@ -${firstLine},${a.length} +${firstLine},${b.length} @@`]];
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) rows.push([" ", firstLine + i++, firstLine + j++, a[i - 1]]);
    // GitHub 처럼 지운 줄을 먼저
    else if (i < a.length && (j === b.length || dp[i + 1][j] >= dp[i][j + 1])) rows.push(["-", firstLine + i++, 0, a[i - 1]]);
    else rows.push(["+", 0, firstLine + j++, b[j - 1]]);
  }
  return rows;
}

export function findingEntry(f: Finding | FindingDetail, fix?: Fix): AppFinding {
  const detail = "message" in f && f.message ? f.message : "";
  return {
    sev: f.severity,
    title: f.title,
    desc: detail || [CATEGORY[f.category] ?? f.category, f.owasp_top10, f.cwe[0]].filter(Boolean).join(" · "),
    path: f.file_path,
    line: f.start_line,
    exploit: { kind: "log", lines: [`$ ${f.tool} --rule ${f.rule_id}`, `${f.file_path}:${f.start_line}  ${f.title}`] },
    ...(fix && {
      recheck: { kind: "log", lines: [`$ ${f.tool} ${f.file_path}`, fix.verified ? "같은 탐지가 사라졌어요" : "아직 탐지돼요"], ok: fix.verified },
      fixId: fix.id,
    }),
    diff: fix ? diffRows(fix.original_code, fix.fixed_code, f.start_line) : [],
  };
}

const firstFix = (findingId: number) =>
  backendGet<Fix[]>(`/findings/${findingId}/fixes`)
    .then((l) => l[0])
    .catch(() => undefined);

/** 고치기 중 화면이 폴링하는 취약점 하나 (수정안이 생기면 diff·fixId 가 채워진다) */
export async function loadFinding(findingId: number) {
  const [f, fix] = await Promise.all([backendGet<FindingDetail>(`/findings/${findingId}`), firstFix(findingId)]);
  return findingEntry(f, fix);
}

function prOf(pr: PullRequest, fixed: string[], F: Record<string, AppFinding>): AppScan["pr"] {
  const first = F[fixed[0]];
  const rows = fixed.flatMap((x) => F[x]?.diff ?? []);
  return {
    n: pr.pr_number,
    title: first ? `fix(security): ${first.title}${fixed.length > 1 ? ` 외 ${fixed.length - 1}건` : ""} 수정` : pr.branch_name,
    add: rows.filter((d) => d[0] === "+").length,
    del: rows.filter((d) => d[0] === "-").length,
    files: new Set(fixed.map((x) => F[x]?.path)).size,
    merged: false,
    url: pr.pr_url,
  };
}

const STATUS: Record<ScanOut["status"], AppScan["status"]> = {
  pending: "queued",
  cloning: "scanning",
  detecting: "scanning",
  classifying: "scanning",
  fixing: "scanning",
  completed: "scanned",
  failed: "failed",
};

/** 스캔한 커밋 기준으로 취약한 줄을 넣은 커밋을 찾는다. 못 찾으면 비워 둔다 */
async function whoOf(token: string, repo: string, ref: string, f: Finding): Promise<AppBlame | undefined> {
  if (!ref) return undefined;
  const c = await blameLine(token, repo, ref, f.file_path, f.start_line);
  if (!c) return undefined;
  return {
    name: c.author.name,
    login: c.author.login,
    avatar: c.author.avatarUrl,
    sha: c.sha.slice(0, 7),
    msg: c.message,
    ago: ago(c.date),
    url: c.url,
    pr: c.pr && { n: c.pr.number, title: c.pr.title, url: c.pr.url },
  };
}

/** 완료된 스캔은 우선 조치 대상·수정안·PR 까지 불러와 프로토타입 SCANS 한 칸으로 */
async function loadScan(token: string, s: ScanOut, repo: string, F: Record<string, AppFinding>): Promise<AppScan> {
  const scan: AppScan = {
    repo,
    branch: s.branch ?? "",
    commit: s.commit_sha?.slice(0, 7) ?? "",
    scope: "브랜치 전체",
    dur: duration(s.created_at, s.finished_at),
    ago: ago(s.created_at),
    status: STATUS[s.status],
    safe: [],
  };
  if (s.status === "failed") return { ...scan, msg: s.error_message || "스캔에 실패했어요" };
  if (s.status !== "completed") return scan;

  const [report, prs] = await Promise.all([
    backendGet<SecurityReport>(`/scans/${s.id}/report`),
    backendGet<PullRequest[]>(`/scans/${s.id}/pull-requests`).catch(() => []),
  ]);
  if (!report.top_findings.length) return { ...scan, status: "done", found: 0 };

  const ref = s.commit_sha || s.branch || "";
  const [fixes, whos] = await Promise.all([
    Promise.all(report.top_findings.map((f) => firstFix(f.id))),
    Promise.all(report.top_findings.map((f) => whoOf(token, repo, ref, f).catch(() => undefined))),
  ]);
  report.top_findings.forEach((f, i) => (F[`f_${f.id}`] = { ...findingEntry(f, fixes[i]), ...(whos[i] && { who: whos[i] }) }));
  const findings = report.top_findings.map((f) => `f_${f.id}`);
  const pr = prs.find((p) => p.status === "created") ?? prs.find((p) => p.status === "pending");
  if (!pr) return { ...scan, findings };
  if (pr.status === "pending") return { ...scan, status: "fixing", findings };
  const fixed = findings.filter((x) => F[x].fixId !== undefined && (pr.fix_ids ?? []).includes(F[x].fixId!));
  return { ...scan, status: "done", findings, fixed, pr: prOf(pr, fixed, F) };
}

/** 대시보드·레포·보고서에 쓰는 전체 데이터 */
export async function loadAppData(token: string, user: User, projects: Record<string, string>) {
  const [repos, scans] = await Promise.all([listRepos(token), backendGet<ScanOut[]>("/scans").catch(() => [])]);
  const mine = new Set(repos.map((r) => r.fullName));
  // 이 사용자가 시작한(레포를 아는) 스캔만. 최근 30개. 내 레포가 아니어도 링크로 스캔한 공개 레포는 보여 준다
  const known = scans
    .filter((s) => projects[s.project_id])
    .sort((a, b) => b.id - a.id)
    .slice(0, 30);

  const F: Record<string, AppFinding> = {};
  const loaded = await Promise.all(known.map((s) => loadScan(token, s, projects[s.project_id], F).catch(() => null)));
  const SCANS: Record<string, AppScan> = {};
  const last = new Map<string, string>();
  known.forEach((s, i) => {
    const scan = loaded[i];
    if (!scan) return;
    SCANS[`s_${s.id}`] = scan;
    if (!last.has(scan.repo)) last.set(scan.repo, `s_${s.id}`);
  });

  const linked = [...last.keys()].filter((r) => !mine.has(r));
  const owners = [...new Set([user.login, ...repos.map((r) => r.fullName.split("/")[0]), ...linked.map((r) => r.split("/")[0])])];
  return {
    user: { login: user.login, avatarUrl: user.avatarUrl },
    accounts: owners.map((name) => ({ name, kind: name === user.login ? "개인" : "조직" })),
    repos: repos.map((r) => {
      const [ws, name] = r.fullName.split("/");
      return {
        ws,
        name,
        lang: r.language ?? "",
        private: r.private,
        pushed: ago(r.pushedAt),
        desc: r.description ?? "",
        branch: r.defaultBranch,
        ...(last.has(r.fullName) && { last: last.get(r.fullName) }),
      };
    }).concat(
      linked.map((full) => {
        const [ws, name] = full.split("/");
        const s = SCANS[last.get(full)!];
        return { ws, name, lang: "", private: false, pushed: "", desc: "GitHub 링크로 분석", branch: s.branch, last: last.get(full)! };
      }),
    ),
    scans: SCANS,
    findings: F,
  };
}

/** 프로토타입 TREE_SRC 노드: n 이름, c 하위, l 줄 수, t 위험 태그, x 기본 제외 이유, files 접힌 폴더의 파일 수 */
interface ProtoNode {
  n: string;
  c?: ProtoNode[];
  l?: number;
  t?: string[];
  x?: string;
  files?: number;
}

function toProto(n: ScopeNode): ProtoNode {
  return {
    n: n.name,
    ...(n.children ? { c: n.children.map(toProto) } : { l: Math.max(1, Math.round(n.size / 32)) }),
    ...(n.tags.length && { t: n.tags }),
    ...(n.exclude && { x: n.exclude }),
  };
}

/** 범위 설정 화면의 브랜치·파일 트리 */
export async function loadTree(token: string, repo: string, branch?: string) {
  const scope = await getRepoScope(token, repo, branch);
  return {
    branch: scope.branch,
    branches: scope.branches.map((b) => ({ n: b.name, commit: b.commit.slice(0, 7), ago: "", def: b.isDefault })),
    tree: buildTree(scope.entries).map(toProto),
  };
}

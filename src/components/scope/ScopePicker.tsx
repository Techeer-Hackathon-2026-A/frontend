"use client";

import { useActionState, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { startScan } from "@/app/dashboard/actions";
import { scanHref } from "@/lib/links";
import { compactPaths, leaves, type Branch, type ScopeNode } from "@/lib/scope";

// 새 스캔 ② 범위 설정. prototype/index.html 의 configPage 를 옮겼다.
// 브랜치 · 범위 프리셋(추천/전체/직접 선택) · 3단 체크 트리 · 기본 제외 · 오른쪽 요약과 스캔 시작.

type Preset = "rec" | "all" | "custom";

const HINT: Record<Preset, (n: number) => string> = {
  rec: (n) => `API·인증·DB·환경설정처럼 공격받기 쉬운 ${n}개 파일을 먼저 봐요`,
  all: () => "제외 목록을 뺀 모든 파일을 봐요",
  custom: () => "체크한 파일만 봐요",
};

/** 바이트로 줄 수를 어림한다 (GitHub tree 는 크기만 준다) */
const approxLines = (size: number) => Math.max(1, Math.round(size / 32));

export default function ScopePicker({
  repo,
  branch,
  branches,
  tree,
  truncated,
  preview,
  canScan = true,
}: {
  repo: string;
  branch: string;
  branches: Branch[];
  tree: ScopeNode[];
  /** GitHub 가 파일이 너무 많아 트리를 잘라 보냈는지 */
  truncated?: boolean;
  preview?: boolean;
  canScan?: boolean;
}) {
  const router = useRouter();
  const all = useMemo(() => tree.flatMap(leaves), [tree]);
  const parent = useMemo(() => {
    const m = new Map<string, ScopeNode | undefined>();
    const walk = (list: ScopeNode[], p?: ScopeNode) => list.forEach((n) => (m.set(n.path, p), n.children && walk(n.children, n)));
    walk(tree);
    return m;
  }, [tree]);

  // 제외를 풀어 다시 넣은 노드
  const [inc, setInc] = useState<Set<string>>(new Set());
  const excludedBy = (n: ScopeNode): ScopeNode | undefined => {
    for (let p: ScopeNode | undefined = n; p; p = parent.get(p.path)) if (p.exclude && !inc.has(p.path)) return p;
  };
  const excluded = (n: ScopeNode) => Boolean(excludedBy(n));
  const pick = (p: Preset, include = inc) => {
    const ex = (n: ScopeNode) => {
      for (let q: ScopeNode | undefined = n; q; q = parent.get(q.path)) if (q.exclude && !include.has(q.path)) return true;
      return false;
    };
    return new Set(all.filter((l) => !ex(l) && (p === "all" || l.tags.length)).map((l) => l.path));
  };

  const [preset, setPreset] = useState<Preset>("rec");
  const [sel, setSel] = useState<Set<string>>(() => pick("rec"));
  // 처음에는 추천 파일이 보이도록 그 위 폴더를 펼쳐 둔다
  const [open, setOpen] = useState<Set<string>>(() => {
    const s = new Set<string>();
    for (const l of all) if (l.tags.length) for (let p = parent.get(l.path); p; p = parent.get(p.path)) s.add(p.path);
    return s;
  });
  const [verify, setVerify] = useState(true);
  const [error, formAction, pending] = useActionState(startScan, undefined);

  const state = (n: ScopeNode) => {
    const ls = leaves(n).filter((l) => !excluded(l));
    const k = ls.filter((l) => sel.has(l.path)).length;
    return { k, total: ls.length, st: !k ? "" : k === ls.length ? "on" : "mixed" };
  };

  const toggle = (n: ScopeNode) => {
    if (excluded(n)) return;
    const ls = leaves(n).filter((l) => !excluded(l));
    const on = state(n).st === "on";
    const next = new Set(sel);
    for (const l of ls) {
      if (on) next.delete(l.path);
      else next.add(l.path);
    }
    setSel(next);
    setPreset("custom");
  };

  const setExcluded = (n: ScopeNode, include: boolean) => {
    const nextInc = new Set(inc);
    const next = new Set(sel);
    if (include) nextInc.add(n.path);
    else nextInc.delete(n.path);
    // 다시 넣으면 그 안 파일을 고르고, 다시 빼면 고른 것도 지운다
    for (const l of leaves(n)) {
      if (include) next.add(l.path);
      else next.delete(l.path);
    }
    setInc(nextInc);
    setSel(next);
    if (include) setOpen(new Set(open).add(n.path));
  };

  const applyPreset = (p: Preset) => {
    setPreset(p);
    if (p !== "custom") setSel(pick(p));
  };

  const chosen = all.filter((l) => sel.has(l.path) && !excluded(l));
  const files = chosen.reduce((n, l) => n + l.files, 0);
  const lines = chosen.reduce((n, l) => n + approxLines(l.size), 0);
  const mins = Math.max(1, Math.round((lines / 600) * (verify ? 1.6 : 1)));
  const heavy = chosen.some((l) => l.files > 1);
  const recN = all.filter((l) => l.tags.length && !excluded(l)).length;
  const paths = compactPaths(tree, (l) => sel.has(l.path), excluded);
  const cur = branches.find((b) => b.name === branch);
  const folders = useMemo(() => {
    const s: string[] = [];
    const walk = (list: ScopeNode[]) => list.forEach((n) => n.children?.length && (s.push(n.path), walk(n.children)));
    walk(tree);
    return s;
  }, [tree]);

  const changeBranch = (b: string) => {
    const q = new URLSearchParams({ branch: b });
    router.replace(`?${q}`);
  };

  const start = () => {
    if (preview) router.push(scanHref({ id: "", repo, branch, paths }, true));
  };

  const rows = (list: ScopeNode[]): ReactNode =>
    list.map((n) => {
      const ex = excludedBy(n);
      const own = n.exclude;
      const folder = Boolean(n.children?.length);
      const isOpen = folder && open.has(n.path) && !ex;
      const { k, total, st } = state(n);
      return (
        <div key={n.path}>
          <div
            className={`group flex h-8 items-center gap-2 rounded-md pr-2 text-[13px] hover:bg-panel-2 ${ex ? "text-faint" : st ? "" : "text-muted"}`}
            style={{ paddingLeft: 8 + n.depth * 18 }}
          >
            <button
              type="button"
              aria-label={isOpen ? "접기" : "펼치기"}
              disabled={!folder || Boolean(ex)}
              onClick={() => setOpen((o) => (o.has(n.path) ? (o.delete(n.path), new Set(o)) : new Set(o).add(n.path)))}
              className="grid size-4 flex-none place-items-center text-faint"
            >
              {folder && !ex && (
                <svg viewBox="0 0 16 16" className={`size-3.5 transition-transform ${isOpen ? "rotate-90" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="m6 4 4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
            <button
              type="button"
              role="checkbox"
              aria-checked={st === "on" ? true : st === "mixed" ? "mixed" : false}
              aria-label={`${n.path} ${st === "on" ? "빼기" : "넣기"}`}
              disabled={Boolean(ex)}
              onClick={() => toggle(n)}
              className={`grid size-4 flex-none place-items-center rounded-[4px] border ${
                st && !ex ? "border-fg bg-fg text-bg" : "border-white/20"
              } ${ex ? "opacity-40" : ""}`}
            >
              {!ex && st === "on" && (
                <svg viewBox="0 0 16 16" className="size-3" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="m3.5 8.5 3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              {!ex && st === "mixed" && <i className="h-[2px] w-2 rounded bg-current" />}
            </button>
            <FileIcon folder={folder || n.files > 1 || n.children !== undefined} />
            <button
              type="button"
              disabled={Boolean(ex)}
              onClick={() => (folder ? setOpen((o) => (o.has(n.path) ? (o.delete(n.path), new Set(o)) : new Set(o).add(n.path))) : toggle(n))}
              className="code-font truncate text-left font-mono text-[12.5px]"
            >
              {n.name}
            </button>
            {!ex && n.tags.map((t) => (
              <span key={t} className="flex-none rounded border border-line px-1 text-[10.5px] text-muted">
                {t}
              </span>
            ))}
            <span className="ml-auto flex-none text-[12px] text-faint">
              {own ? (
                <button
                  type="button"
                  onClick={() => setExcluded(n, !inc.has(n.path))}
                  className="rounded-full border border-line px-2 py-px text-[11.5px] text-muted hover:text-fg"
                  title={inc.has(n.path) ? "다시 빼기" : "눌러서 다시 넣기"}
                >
                  {own} · {inc.has(n.path) ? "포함됨" : "제외됨"}
                </button>
              ) : ex ? null : folder ? (
                `${k}/${total}`
              ) : n.files > 1 ? (
                `${n.files.toLocaleString()}개 파일`
              ) : (
                `${approxLines(n.size)}줄`
              )}
            </span>
          </div>
          {isOpen && rows(n.children!)}
        </div>
      );
    });

  return (
    <div className="mx-auto max-w-[1040px] px-6 pt-8 pb-16 max-[560px]:px-4">
      <Steps />
      <h1 className="mt-6 text-[22px] font-medium tracking-tight">
        <span className="font-normal text-muted">{repo.split("/")[0]} / </span>
        {repo.split("/")[1]}
      </h1>
      <p className="mt-1 text-[13px] text-muted">스캔할 브랜치와 범위를 골라요</p>

      <div className="mt-6 grid items-start gap-4 md:grid-cols-[minmax(0,1fr)_280px]">
        <div className="grid gap-4">
          <div className="flex items-center gap-3 rounded-[10px] border border-line bg-panel px-4 py-3 text-[13px]">
            <span className="w-[52px] text-muted">브랜치</span>
            <select
              value={branch}
              onChange={(e) => changeBranch(e.target.value)}
              className="h-8 rounded-md border border-line bg-panel-2 px-2 font-mono text-[12.5px] outline-none"
            >
              {branches.map((b) => (
                <option key={b.name} value={b.name}>
                  {b.name}
                  {b.isDefault ? " (기본)" : ""}
                </option>
              ))}
            </select>
            {cur && <span className="font-mono text-[12px] text-faint">{cur.commit.slice(0, 7)}</span>}
          </div>

          <div className="rounded-[10px] border border-line bg-panel">
            <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 text-[13px]">
              <span className="w-[52px] text-muted">범위</span>
              <div className="flex rounded-md border border-line p-0.5">
                {(
                  [
                    ["rec", "추천"],
                    ["all", "전체"],
                    ["custom", "직접 선택"],
                  ] as const
                ).map(([v, l]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => applyPreset(v)}
                    className={`h-7 rounded-[5px] px-3 text-[12.5px] ${preset === v ? "bg-panel-2 text-fg" : "text-muted hover:text-fg"}`}
                  >
                    {l}
                  </button>
                ))}
              </div>
              <span className="flex-1" />
              <button
                type="button"
                onClick={() => setOpen(open.size ? new Set() : new Set(folders))}
                className="text-[12.5px] text-faint hover:text-fg"
              >
                {open.size ? "모두 접기" : "모두 펼치기"}
              </button>
            </div>
            <div className="flex items-center gap-2 px-4 pt-3 text-[12.5px] text-muted">
              <svg viewBox="0 0 16 16" className="size-3.5 flex-none text-ok" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M8 1.5 13.5 4v3.5c0 3.2-2.3 5.6-5.5 6.5-3.2-.9-5.5-3.3-5.5-6.5V4Z" strokeLinejoin="round" />
              </svg>
              {HINT[preset](recN)}
            </div>
            <div className="max-h-[56vh] overflow-auto px-2 py-2">
              {tree.length ? rows(tree) : <p className="px-2 py-6 text-center text-[13px] text-faint">파일이 없어요</p>}
            </div>
            <div className="border-t border-line px-4 py-2.5 text-[12px] text-faint">
              기본 제외: 의존성 · 빌드 산출물 · 테스트 · lock 파일 · 정적 파일. 눌러서 다시 넣을 수 있어요
              {truncated && <span className="block text-warn">파일이 너무 많아 GitHub 가 목록 일부만 보내 줬어요</span>}
            </div>
          </div>
        </div>

        <aside className="rounded-[10px] border border-line bg-panel p-4 md:sticky md:top-[68px]">
          <div className="text-[32px] font-medium tracking-tight">
            {files.toLocaleString()}
            <small className="ml-1 text-[13px] font-normal text-muted">개 파일</small>
          </div>
          <dl className="mt-3 grid gap-1.5 text-[13px]">
            <div className="flex justify-between">
              <dt className="text-muted">코드</dt>
              <dd>약 {lines.toLocaleString()}줄</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">브랜치</dt>
              <dd className="font-mono text-[12px]">{branch}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">예상 시간</dt>
              <dd>{!files ? "—" : mins >= 60 ? `약 ${Math.round(mins / 60)}시간` : `약 ${mins}분`}</dd>
            </div>
          </dl>
          {heavy && <p className="mt-3 rounded-md bg-warn/10 px-3 py-2 text-[12.5px] text-warn">의존성까지 넣으면 오래 걸려요. 보통은 빼고 스캔해요</p>}
          <div className="my-4 h-px bg-line" />
          <button type="button" onClick={() => setVerify(!verify)} className="flex w-full items-center gap-3 text-left">
            <span className="flex-1">
              <b className="block text-[13px] font-medium">공격으로 검증</b>
              <span className="text-[12px] text-muted">샌드박스에서 실제 요청을 보내 진짜인지 확인해요</span>
            </span>
            <span className={`relative h-5 w-9 flex-none rounded-full transition-colors ${verify ? "bg-ok" : "bg-panel-2"}`} role="switch" aria-checked={verify}>
              <i className={`absolute top-0.5 size-4 rounded-full bg-fg transition-all ${verify ? "left-[18px]" : "left-0.5"}`} />
            </span>
          </button>
          <div className="my-4 h-px bg-line" />
          {preview ? (
            <button
              type="button"
              disabled={!files}
              onClick={start}
              className="h-[38px] w-full rounded-full bg-fg text-[13.5px] font-medium text-bg disabled:opacity-40"
            >
              스캔 시작 →
            </button>
          ) : (
            <form action={formAction}>
              <input type="hidden" name="repo" value={repo} />
              <input type="hidden" name="branch" value={branch} />
              <input type="hidden" name="paths" value={JSON.stringify(paths)} />
              <input type="hidden" name="verify" value={String(verify)} />
              <button
                disabled={!files || pending || !canScan}
                className="h-[38px] w-full rounded-full bg-fg text-[13.5px] font-medium text-bg disabled:opacity-40"
              >
                {pending ? "시작 중…" : "스캔 시작 →"}
              </button>
              {!canScan && <p className="mt-2 text-[12.5px] text-faint">스캔 서버가 아직 연결되지 않았어요</p>}
            </form>
          )}
          {error && <p className="mt-2 text-[12.5px] text-danger">{error}</p>}
        </aside>
      </div>
    </div>
  );
}

function Steps() {
  return (
    <ol className="flex items-center gap-2 text-[12.5px]">
      {["레포", "범위", "스캔"].map((l, i) => (
        <li key={l} className="flex items-center gap-2">
          {i > 0 && <span className="h-px w-6 bg-line" />}
          <span className={`grid size-[18px] place-items-center rounded-full text-[11px] ${i === 1 ? "bg-fg text-bg" : i === 0 ? "bg-ok/20 text-ok" : "border border-line text-faint"}`}>
            {i === 0 ? "✓" : i + 1}
          </span>
          <span className={i === 1 ? "text-fg" : "text-muted"}>{l}</span>
        </li>
      ))}
    </ol>
  );
}

function FileIcon({ folder }: { folder: boolean }) {
  return (
    <svg viewBox="0 0 16 16" className={`size-4 flex-none ${folder ? "text-muted" : "text-faint"}`} fill="none" stroke="currentColor" strokeWidth="1.3">
      {folder ? (
        <path d="M2 4.5c0-.6.4-1 1-1h3l1.5 1.5H13c.6 0 1 .4 1 1V12c0 .6-.4 1-1 1H3c-.6 0-1-.4-1-1Z" strokeLinejoin="round" />
      ) : (
        <path d="M4 1.5h5L12.5 5v9c0 .3-.2.5-.5.5H4c-.3 0-.5-.2-.5-.5V2c0-.3.2-.5.5-.5ZM9 1.5V5h3.5" strokeLinejoin="round" />
      )}
    </svg>
  );
}

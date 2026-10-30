// 백엔드가 주는 코드 조각(snippet, Fix.original_code/fixed_code)을 화면용 줄 목록·diff 로 바꾸는 도구.
import type { Finding, FindingDetail, Fix } from "@/lib/api/types";
import type { Hunk } from "./scanEvents";

/** 백엔드 탐지기가 snippet 앞뒤로 붙이는 줄 수 (backend app/services/detection/normalizer.py) */
const SNIPPET_CONTEXT = 3;
/** 이 줄 수 이하인 파일은 통째로, 넘으면 취약점 주변만 보여 준다 */
const WHOLE_FILE_MAX = 80;
const WINDOW = 6;

export const splitLines = (text: string) => text.replace(/\r\n/g, "\n").replace(/\n$/, "").split("\n");

/** snippet 첫 줄의 원본 줄 번호. 시크릿은 해당 줄만, 나머지는 앞뒤 3줄을 붙여 저장된다 */
export function snippetStart(f: Pick<Finding, "category" | "start_line">): number {
  return f.category === "secret" ? f.start_line : Math.max(1, f.start_line - SNIPPET_CONTEXT);
}

/** GitHub 레포(owner/name)의 원본 파일. 로그인한 사용자 토큰으로 읽어서 비공개 레포도 된다. 없거나 경로가 가려져 있으면 null */
export async function fetchRepoFile(repo: string, ref: string, path: string): Promise<string | null> {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo) || path.startsWith("[")) return null;
  try {
    const res = await fetch(`/api/repo-file?${new URLSearchParams({ repo, ref, path })}`);
    return res.ok ? await res.text() : null;
  } catch {
    return null;
  }
}

export interface Excerpt {
  lines: string[];
  /** lines[i] 의 원본 줄 번호. null 은 생략 표시 줄. 파일 전체면 undefined */
  nums?: (number | null)[];
}

/**
 * 한 파일에서 보여 줄 줄을 고른다.
 * 원본 파일이 있으면 짧은 파일은 통째로, 긴 파일은 취약점 주변만 잘라 사이를 ⋯ 로 잇는다.
 * 원본이 없으면 백엔드 snippet 들을 원래 줄 번호 자리에 맞춰 붙인다.
 */
export function buildExcerpt(source: string | null, findings: FindingDetail[]): Excerpt {
  const known = new Map<number, string>();
  let total = 0;
  if (source !== null) {
    const all = splitLines(source);
    if (all.length <= WHOLE_FILE_MAX) return { lines: all };
    total = all.length;
    for (const f of findings) {
      const from = Math.max(1, f.start_line - WINDOW);
      const to = Math.min(total, (f.end_line ?? f.start_line) + WINDOW);
      for (let n = from; n <= to; n++) known.set(n, all[n - 1]);
    }
  } else {
    for (const f of findings) {
      if (f.snippet) splitLines(f.snippet).forEach((text, k) => known.set(snippetStart(f) + k, text));
      // 코드가 가려진 취약점(시크릿 등)도 그 줄에 서서 볼 수 있게 자리만 만든다
      if (!known.has(f.start_line)) known.set(f.start_line, "");
    }
  }

  const sorted = [...known.keys()].sort((a, b) => a - b);
  const lines: string[] = [];
  const nums: (number | null)[] = [];
  if (sorted[0] > 1) {
    lines.push("");
    nums.push(null);
  }
  sorted.forEach((n, k) => {
    if (k > 0 && n - sorted[k - 1] > 1) {
      lines.push("");
      nums.push(null);
    }
    lines.push(known.get(n) ?? "");
    nums.push(n);
  });
  if (total && sorted[sorted.length - 1] < total) {
    lines.push("");
    nums.push(null);
  }
  return { lines, nums };
}

/** 원본 줄 번호 → 화면 줄 번호(1부터). 없으면 가장 가까운 앞줄 */
export function displayLine(ex: Excerpt, line: number): number {
  if (!ex.nums) return Math.min(Math.max(1, line), ex.lines.length);
  let best = 0;
  ex.nums.forEach((n, i) => {
    if (n !== null && n <= line) best = i;
  });
  return best + 1;
}

/** 캐릭터가 내려다볼 부분. 그 줄 안의 문자열이어야 한다 */
export function pickToken(text: string, f: FindingDetail): string {
  const pkg = f.dependency?.package;
  if (pkg && text.includes(pkg)) return pkg;
  const body = text.trim();
  return body.length > 48 ? body.slice(0, 48) : body;
}

/**
 * Fix 의 original_code → fixed_code 를 화면 줄 기준 hunk 로 바꾼다.
 * 백엔드는 파일에서 original_code 를 찾아 한 번 바꾸므로(apply_changes) 같은 방식으로 위치를 찾고,
 * 앞뒤로 같은 줄은 덜어 내서 실제로 바뀐 줄만 지우고 쓴다.
 */
export function toHunks(lines: string[], fix: Pick<Fix, "original_code" | "fixed_code">, fallbackLine: number): Hunk[] {
  const original = fix.original_code.replace(/\r\n/g, "\n").replace(/\n+$/, "");
  const fixed = fix.fixed_code.replace(/\r\n/g, "\n").replace(/\n+$/, "");
  const content = lines.join("\n");
  const at = original ? content.indexOf(original) : -1;

  let line: number;
  let old: string[];
  let next: string[];
  if (at >= 0) {
    // 조각이 줄 중간에서 시작·끝나도 줄 단위로 바꾼다
    line = content.slice(0, at).split("\n").length;
    const end = at + original.length;
    const lineStart = content.lastIndexOf("\n", at - 1) + 1;
    const lineEndIdx = content.indexOf("\n", end);
    const lineEnd = lineEndIdx < 0 ? content.length : lineEndIdx;
    old = content.slice(lineStart, lineEnd).split("\n");
    next = (content.slice(lineStart, at) + fixed + content.slice(end, lineEnd)).split("\n");
  } else {
    // 화면에 원본 전체가 없으면 첫 줄로 자리를 찾고, 그것도 없으면 취약점 줄에서 바꾼다
    const origLines = splitLines(original);
    const first = origLines.find((l) => l.trim())?.trim();
    const found = first ? lines.findIndex((l) => l.trim() === first) : -1;
    line = found >= 0 ? found + 1 : fallbackLine;
    old = lines.slice(line - 1, line - 1 + Math.max(1, origLines.length));
    next = splitLines(fixed);
  }

  while (old.length && next.length && old[0] === next[0]) {
    old.shift();
    next.shift();
    line++;
  }
  while (old.length && next.length && old[old.length - 1] === next[next.length - 1]) {
    old.pop();
    next.pop();
  }
  if (!old.length && !next.length) return [];
  // 지울 줄이 없으면 바로 앞줄 아래에 끼운다
  if (!old.length) return [{ line: Math.max(1, line - 1), del: 0, add: next }];
  return [{ line, del: old.length, add: next }];
}

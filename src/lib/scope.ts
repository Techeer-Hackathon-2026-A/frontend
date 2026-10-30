// 새 스캔 ② 범위 설정 (prototype/index.html 의 configPage). 서버·클라이언트 공용.
// 파일 목록(GitHub git tree 또는 둘러보기 샘플)을 3단 체크 트리로 만들고, 기본 제외·위험 태그를 붙인다.

/** 트리 재료. files 는 node_modules 처럼 통째로 접어 보여 줄 폴더의 파일 수 */
export interface TreeEntry {
  path: string;
  size?: number;
  files?: number;
}

export interface ScopeNode {
  name: string;
  path: string;
  depth: number;
  children?: ScopeNode[];
  /** 바이트. 폴더는 하위 합 */
  size: number;
  /** 접힌 폴더면 그 안의 파일 수, 파일이면 1 */
  files: number;
  /** 공격받기 쉬운 경로 표시 (추천 범위의 기준) */
  tags: string[];
  /** 기본 제외 이유. 제외된 노드 자신에만 붙는다 */
  exclude?: string;
}

export interface Branch {
  name: string;
  commit: string;
  isDefault?: boolean;
}

const EXCLUDE_DIRS: Record<string, string> = {
  node_modules: "의존성",
  vendor: "의존성",
  ".pnpm-store": "의존성",
  dist: "빌드 산출물",
  build: "빌드 산출물",
  out: "빌드 산출물",
  ".next": "빌드 산출물",
  coverage: "빌드 산출물",
  tests: "테스트",
  test: "테스트",
  __tests__: "테스트",
  e2e: "테스트",
  public: "정적 파일",
  static: "정적 파일",
  assets: "정적 파일",
};
const LOCK_FILES = new Set(["package-lock.json", "yarn.lock", "pnpm-lock.yaml", "bun.lockb", "bun.lock", "Cargo.lock", "poetry.lock", "Gemfile.lock", "go.sum", "composer.lock"]);
const STATIC_EXT = /\.(png|jpe?g|gif|svg|ico|webp|avif|woff2?|ttf|otf|eot|mp4|webm|mp3|pdf|zip)$/i;

function excludeOf(name: string, folder: boolean) {
  if (folder) return EXCLUDE_DIRS[name];
  if (LOCK_FILES.has(name)) return "lock 파일";
  if (/\.(test|spec)\.[jt]sx?$/.test(name)) return "테스트";
  if (STATIC_EXT.test(name)) return "정적 파일";
  return undefined;
}

function tagsOf(path: string) {
  const tags: string[] = [];
  if (/(^|\/)(api|routes?|controllers?|handlers?)\/|(^|\/)route\.[jt]s$/i.test(path)) tags.push("API");
  if (/auth|login|session|middleware|jwt|oauth|password/i.test(path)) tags.push("auth");
  if (/(^|\/)(db|prisma|models?|migrations?|drizzle)(\/|\.)|supabase|sql|mongo/i.test(path)) tags.push("DB");
  if (/(^|\/)\.env/.test(path) || /supabase|firebase/i.test(path)) tags.push("env");
  if (/(^|\/)[\w-]+\.config\.[cm]?[jt]s$/.test(path)) tags.push("config");
  return tags;
}

/** 경로 목록 → 폴더 먼저, 이름순 트리 */
export function buildTree(entries: TreeEntry[]): ScopeNode[] {
  type Draft = { children: Map<string, Draft>; entry?: TreeEntry };
  const root: Draft = { children: new Map() };
  for (const e of entries) {
    let d = root;
    for (const part of e.path.split("/")) {
      if (!d.children.has(part)) d.children.set(part, { children: new Map() });
      d = d.children.get(part)!;
    }
    d.entry = e;
  }
  const walk = (d: Draft, parent: string, depth: number): ScopeNode[] =>
    [...d.children.entries()]
      .map(([name, c]): ScopeNode => {
        const path = parent ? `${parent}/${name}` : name;
        // files 가 있는 항목은 하위를 펼치지 않는 접힌 폴더
        const folder = c.children.size > 0 || c.entry?.files !== undefined;
        if (!folder) {
          return { name, path, depth, size: c.entry?.size ?? 0, files: 1, tags: tagsOf(path), exclude: excludeOf(name, false) };
        }
        const children = c.entry?.files !== undefined ? undefined : walk(c, path, depth + 1);
        return {
          name,
          path,
          depth,
          children: children ?? [],
          size: children ? children.reduce((n, x) => n + x.size, 0) : (c.entry?.size ?? 0),
          files: children ? children.reduce((n, x) => n + x.files, 0) : (c.entry?.files ?? 0),
          tags: [],
          exclude: excludeOf(name, true),
        };
      })
      .sort((a, b) => Number(!a.children) - Number(!b.children) || a.name.localeCompare(b.name));
  return walk(root, "", 0);
}

/** 선택 단위. 접힌 폴더(node_modules 등)는 그 자체가 하나의 잎이다 */
export function leaves(n: ScopeNode): ScopeNode[] {
  return n.children?.length ? n.children.flatMap(leaves) : [n];
}

/** 체크한 잎을 백엔드에 보낼 경로로 줄인다. 폴더 안이 전부 골라졌고 제외된 것도 없으면 폴더 하나로 */
export function compactPaths(nodes: ScopeNode[], picked: (n: ScopeNode) => boolean, excluded: (n: ScopeNode) => boolean): string[] {
  return nodes.flatMap((n) => {
    const ls = leaves(n);
    if (n.children?.length && ls.every((l) => picked(l) && !excluded(l))) return [n.path];
    return n.children?.length ? compactPaths(n.children, picked, excluded) : picked(n) ? [n.path] : [];
  });
}

/** paths(파일 또는 폴더 경로) 범위 안의 파일인지. 비어 있으면 전체 */
export function inScope(path: string, paths: string[] | undefined) {
  return !paths?.length || paths.some((p) => path === p || path.startsWith(`${p}/`));
}

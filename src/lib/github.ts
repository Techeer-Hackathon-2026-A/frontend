import "server-only";
import type { User } from "@/lib/session";

// 테스트할 때는 GITHUB_API_URL 로 흉내 서버를 가리킬 수 있다
export const GITHUB_API = (process.env.GITHUB_API_URL || "https://api.github.com").replace(/\/$/, "");
const API = GITHUB_API;

export interface Repo {
  fullName: string;
  description: string | null;
  private: boolean;
  language: string | null;
  defaultBranch: string;
  pushedAt: string;
}

/** 프록시 뒤에서 req.url 의 origin 이 틀릴 수 있어서 APP_URL 을 먼저 본다 */
export function appOrigin(req: Request) {
  return process.env.APP_URL?.replace(/\/$/, "") ?? new URL(req.url).origin;
}

function gh(token: string, path: string) {
  return fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
  });
}

export class GitHubAuthError extends Error {}

export async function getViewer(token: string): Promise<User | undefined> {
  const res = await gh(token, "/user");
  if (!res.ok) return undefined;
  const u = (await res.json()) as { login: string; name: string | null; avatar_url: string };
  return { login: u.login, name: u.name ?? u.login, avatarUrl: u.avatar_url };
}

/** 최근 푸시 순으로 최대 100개. 토큰이 무효면 GitHubAuthError */
export async function listRepos(token: string): Promise<Repo[]> {
  const res = await gh(token, "/user/repos?sort=pushed&per_page=100&affiliation=owner,collaborator,organization_member");
  if (res.status === 401) throw new GitHubAuthError();
  if (!res.ok) throw new Error(`GitHub ${res.status}`);
  const repos = (await res.json()) as {
    full_name: string;
    description: string | null;
    private: boolean;
    language: string | null;
    default_branch: string;
    pushed_at: string;
    archived: boolean;
  }[];
  return repos
    .filter((r) => !r.archived)
    .map((r) => ({
      fullName: r.full_name,
      description: r.description,
      private: r.private,
      language: r.language,
      defaultBranch: r.default_branch,
      pushedAt: r.pushed_at,
    }));
}

export class GitHubNotFoundError extends Error {}

async function ok<T>(res: Response): Promise<T> {
  if (res.status === 401) throw new GitHubAuthError();
  if (res.status === 404) throw new GitHubNotFoundError();
  if (!res.ok) throw new Error(`GitHub ${res.status}`);
  return res.json() as Promise<T>;
}

/** 새 스캔 ② 범위 설정에 쓸 레포 정보·브랜치·파일 트리. branch 가 없으면 기본 브랜치 */
export async function getRepoScope(token: string, repo: string, branch?: string) {
  const info = await ok<{ default_branch: string; private: boolean }>(await gh(token, `/repos/${repo}`));
  const ref = branch || info.default_branch;
  const [branches, tree] = await Promise.all([
    ok<{ name: string; commit: { sha: string } }[]>(await gh(token, `/repos/${repo}/branches?per_page=100`)),
    ok<{ tree: { path: string; type: string; size?: number }[]; truncated: boolean }>(
      await gh(token, `/repos/${repo}/git/trees/${encodeURIComponent(ref)}?recursive=1`),
    ),
  ]);
  return {
    branch: ref,
    private: info.private,
    branches: branches.map((b) => ({ name: b.name, commit: b.commit.sha, isDefault: b.name === info.default_branch })),
    entries: tree.tree.filter((t) => t.type === "blob").map((t) => ({ path: t.path, size: t.size })),
    truncated: tree.truncated,
  };
}

/** 취약한 줄을 마지막으로 바꾼 커밋 (GitHub blame) */
export interface BlameCommit {
  sha: string;
  message: string;
  date: string;
  url: string;
  author: { name: string; login: string | null; avatarUrl: string | null };
  /** 이 커밋이 들어온 PR */
  pr: { number: number; title: string; url: string } | null;
}

interface BlameRange {
  startingLine: number;
  endingLine: number;
  commit: {
    oid: string;
    messageHeadline: string;
    committedDate: string;
    url: string;
    author: { name: string | null; user: { login: string; avatarUrl: string } | null } | null;
    associatedPullRequests: { nodes: { number: number; title: string; url: string }[] };
  };
}

const BLAME = `query($owner: String!, $name: String!, $ref: String!, $path: String!) {
  repository(owner: $owner, name: $name) {
    object(expression: $ref) {
      ... on Commit {
        blame(path: $path) {
          ranges {
            startingLine endingLine
            commit {
              oid messageHeadline committedDate url
              author { name user { login avatarUrl } }
              associatedPullRequests(first: 1) { nodes { number title url } }
            }
          }
        }
      }
    }
  }
}`;

// 커밋 sha 로 본 blame 은 바뀌지 않으니 서버가 떠 있는 동안 기억해 둔다
const blameCache = new Map<string, Promise<BlameRange[]>>();

function blameRanges(token: string, repo: string, ref: string, path: string) {
  const key = `${repo}@${ref}:${path}`;
  const hit = blameCache.get(key);
  if (hit) return hit;
  const [owner, name] = repo.split("/");
  const job = fetch(`${API}/graphql`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: BLAME, variables: { owner, name, ref, path } }),
  })
    .then((res) => ok<{ data?: { repository?: { object?: { blame?: { ranges: BlameRange[] } } | null } | null } }>(res))
    .then((d) => d.data?.repository?.object?.blame?.ranges ?? []);
  // 실패는 기억하지 않는다. 브랜치 이름은 움직이니 sha 일 때만 남긴다
  if (/^[0-9a-f]{40}$/.test(ref)) blameCache.set(key, job.catch((e) => (blameCache.delete(key), Promise.reject(e))));
  return job;
}

/** path 의 line 을 마지막으로 바꾼 커밋. 모르면 undefined */
export async function blameLine(token: string, repo: string, ref: string, path: string, line: number): Promise<BlameCommit | undefined> {
  const ranges = await blameRanges(token, repo, ref, path).catch(() => []);
  const c = ranges.find((r) => r.startingLine <= line && line <= r.endingLine)?.commit;
  if (!c) return undefined;
  return {
    sha: c.oid,
    message: c.messageHeadline,
    date: c.committedDate,
    url: c.url,
    author: { name: c.author?.name || c.author?.user?.login || "알 수 없음", login: c.author?.user?.login ?? null, avatarUrl: c.author?.user?.avatarUrl ?? null },
    pr: c.associatedPullRequests.nodes[0] ?? null,
  };
}

/** "https://github.com/o/r", "github.com/o/r/tree/dev", "o/r.git" 같은 입력에서 owner/name·브랜치를 뽑는다 */
export function parseRepoLink(input: string): { repo: string; branch?: string } | null {
  const s = input.trim().replace(/^git@github\.com:/, "github.com/").replace(/^(https?:\/\/)?(www\.)?github\.com\//, "");
  const m = s.match(/^([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:\/tree\/([^?#]+))?\/?(?:[?#].*)?$/);
  if (!m) return null;
  return { repo: `${m[1]}/${m[2]}`, ...(m[3] && { branch: decodeURIComponent(m[3]) }) };
}

/** 레포 기본 정보. 토큰이 없으면 공개 레포만 보인다. 없으면 GitHubNotFoundError */
export async function getRepoInfo(repo: string, token?: string) {
  const res = await fetch(`${API}/repos/${repo}`, {
    headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", ...(token && { Authorization: `Bearer ${token}` }) },
  });
  const r = await ok<{ full_name: string; default_branch: string; private: boolean }>(res);
  return { repo: r.full_name, defaultBranch: r.default_branch, private: r.private };
}

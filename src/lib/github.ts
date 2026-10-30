import "server-only";
import type { User } from "@/lib/session";

const API = "https://api.github.com";

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

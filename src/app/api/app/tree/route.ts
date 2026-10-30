import { loadTree } from "@/lib/appData";
import { GitHubAuthError, GitHubNotFoundError } from "@/lib/github";
import { getToken } from "@/lib/session";

// 새 스캔 범위 설정의 브랜치·파일 트리. ?repo=owner/name&branch=
export async function GET(req: Request) {
  const token = await getToken();
  if (!token) return new Response("로그인이 필요해요", { status: 401 });
  const q = new URL(req.url).searchParams;
  const repo = q.get("repo") ?? "";
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) return new Response("잘못된 요청", { status: 400 });
  try {
    return Response.json(await loadTree(token, repo, q.get("branch") || undefined));
  } catch (e) {
    if (e instanceof GitHubAuthError) return new Response("로그인이 필요해요", { status: 401 });
    if (e instanceof GitHubNotFoundError) return new Response("레포나 브랜치를 찾을 수 없어요", { status: 404 });
    return new Response("GitHub 에서 불러오지 못했어요", { status: 502 });
  }
}

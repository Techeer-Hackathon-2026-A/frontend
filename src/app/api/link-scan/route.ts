import { BackendError, createScan } from "@/lib/backend";
import { GitHubAuthError, GitHubNotFoundError, getRepoInfo, parseRepoLink } from "@/lib/github";
import { getToken, rememberProject } from "@/lib/session";

// 첫 화면·새 스캔에서 GitHub 링크를 붙여 넣어 바로 스캔한다.
// 로그인 없이도 공개 레포는 스캔할 수 있고, 비공개 레포는 로그인한 사용자 토큰으로 보이는 것만 된다.
export async function POST(req: Request) {
  const { url } = (await req.json().catch(() => ({}))) as { url?: string };
  const link = parseRepoLink(url ?? "");
  if (!link) return new Response("GitHub 레포 링크를 넣어 주세요 (예: github.com/owner/repo)", { status: 400 });

  const token = await getToken();
  let info;
  try {
    info = await getRepoInfo(link.repo, token);
  } catch (e) {
    if (e instanceof GitHubNotFoundError || e instanceof GitHubAuthError)
      return new Response(token ? "레포를 찾을 수 없어요" : "레포를 찾을 수 없어요. 비공개 레포라면 GitHub 로 로그인해 주세요", { status: 404 });
    return new Response("GitHub 에 연결할 수 없어요", { status: 502 });
  }

  const branch = link.branch || info.defaultBranch;
  try {
    const scan = await createScan({ repo: info.repo, branch });
    if (token) await rememberProject(scan.projectId, info.repo);
    return Response.json({ id: scan.id, repo: info.repo, branch });
  } catch (e) {
    if (e instanceof BackendError) return new Response(e.message, { status: e.status < 500 ? e.status : 502 });
    return new Response("스캔 서버에 연결할 수 없어요", { status: 502 });
  }
}

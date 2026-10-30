import { BackendError, createScan } from "@/lib/backend";
import { getToken, rememberProject } from "@/lib/session";

// 스캔 시작. 백엔드 스캔 응답에 레포 이름이 없어서 project_id → owner/name 을 세션에 기억해 둔다.
// 범위(paths)·공격 검증(verify)은 백엔드가 아직 받지 않아 브랜치 전체를 스캔한다.
export async function POST(req: Request) {
  if (!(await getToken())) return new Response("로그인이 필요해요", { status: 401 });
  const { repo, branch } = (await req.json()) as { repo?: string; branch?: string };
  if (!repo || !/^[\w.-]+\/[\w.-]+$/.test(repo)) return new Response("잘못된 요청", { status: 400 });
  try {
    const scan = await createScan({ repo, branch: branch ?? "" });
    await rememberProject(scan.projectId, repo);
    return Response.json({ id: scan.id });
  } catch (e) {
    if (e instanceof BackendError) return new Response(e.message, { status: e.status < 500 ? e.status : 502 });
    return new Response("스캔 서버에 연결할 수 없어요", { status: 502 });
  }
}

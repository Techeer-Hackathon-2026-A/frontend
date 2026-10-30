import { loadFinding } from "@/lib/appData";
import { BackendError } from "@/lib/backend";
import { getToken } from "@/lib/session";

// 보고서에서 고치는 중에 폴링한다. 수정안이 만들어지면 diff·fixId 가 채워진다
export async function GET(_req: Request, ctx: RouteContext<"/api/app/findings/[id]">) {
  if (!(await getToken())) return new Response("로그인이 필요해요", { status: 401 });
  const { id } = await ctx.params;
  try {
    return Response.json(await loadFinding(Number(id)));
  } catch (e) {
    return new Response(e instanceof Error ? e.message : "불러오지 못했어요", { status: e instanceof BackendError ? e.status : 502 });
  }
}

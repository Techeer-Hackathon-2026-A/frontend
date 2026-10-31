import { backendFetch } from "@/lib/backend";

// 브라우저(스캔 화면 lib/feed/scanFeed.ts, 앱 화면 public/app.html)가 부르는 팀 백엔드 API.
// rewrite 로 그대로 넘기면 누구나 백엔드를 부를 수 있어서, 서버에서 서비스 키와 사용자 GitHub 토큰을 붙여 전달한다.
// 볼 수 있는지·고칠 수 있는지는 백엔드가 그 토큰으로 GitHub 권한을 확인해 정한다.
async function forward(req: Request, ctx: RouteContext<"/api/v1/[...path]">) {
  const { path } = await ctx.params;
  // 인코딩된 ../ 로 /api/v1 밖(백엔드 /docs 등)에 닿지 못하게 막는다
  if (path.some((p) => p === "." || p === "..")) return new Response("잘못된 요청", { status: 400 });

  try {
    const res = await backendFetch(`/${path.map(encodeURIComponent).join("/")}${new URL(req.url).search}`, {
      method: req.method,
      body: req.method === "GET" ? undefined : (await req.text()) || undefined,
    });
    return new Response(res.body, {
      status: res.status,
      headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
    });
  } catch {
    return Response.json({ detail: "스캔 서버에 연결할 수 없어요" }, { status: 502 });
  }
}

export const GET = forward;
export const POST = forward;

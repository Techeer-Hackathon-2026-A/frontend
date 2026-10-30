import { loadAppData } from "@/lib/appData";
import { GitHubAuthError } from "@/lib/github";
import { getProjects, getToken, getUser } from "@/lib/session";

// 대시보드(public/app.html)가 처음 열릴 때 불러오는 레포·스캔·취약점
export async function GET() {
  const [token, user] = await Promise.all([getToken(), getUser()]);
  if (!token || !user) return new Response("로그인이 필요해요", { status: 401 });
  try {
    return Response.json(await loadAppData(token, user, await getProjects()));
  } catch (e) {
    if (e instanceof GitHubAuthError) return new Response("로그인이 필요해요", { status: 401 });
    return new Response(e instanceof Error ? e.message : "불러오지 못했어요", { status: 502 });
  }
}

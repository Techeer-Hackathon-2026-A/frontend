import { GITHUB_API } from "@/lib/github";
import { getToken } from "@/lib/session";

// 스캔 연출에 보여 줄 원본 파일. 사용자 GitHub 토큰은 서버에서만 붙여서 비공개 레포도 읽는다.
export async function GET(req: Request) {
  const token = await getToken();
  if (!token) return new Response("로그인이 필요해요", { status: 401 });
  const q = new URL(req.url).searchParams;
  const repo = q.get("repo") ?? "";
  const path = q.get("path") ?? "";
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo) || !path) return new Response("잘못된 요청", { status: 400 });

  const filePath = path.split("/").map(encodeURIComponent).join("/");
  const res = await fetch(`${GITHUB_API}/repos/${repo}/contents/${filePath}?${new URLSearchParams({ ref: q.get("ref") || "HEAD" })}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.raw+json", "X-GitHub-Api-Version": "2022-11-28" },
    cache: "no-store",
  });
  if (!res.ok) return new Response(null, { status: res.status === 404 ? 404 : 502 });
  return new Response(await res.text(), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

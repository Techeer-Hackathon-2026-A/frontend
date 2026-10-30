import { NextResponse } from "next/server";
import { appOrigin } from "@/lib/github";

// GitHub OAuth App 으로 보낸다. repo 권한은 비공개 레포를 읽고 백엔드가 PR 을 올리는 데 필요하다.
export async function GET(req: Request) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) return NextResponse.redirect(new URL("/?error=config", req.url));

  const state = crypto.randomUUID();
  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", `${appOrigin(req)}/api/auth/callback`);
  url.searchParams.set("scope", "repo read:user");
  url.searchParams.set("state", state);

  const res = NextResponse.redirect(url);
  res.cookies.set("patchi_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}

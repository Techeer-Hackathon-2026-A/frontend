import { NextResponse, type NextRequest } from "next/server";
import { appOrigin, getViewer } from "@/lib/github";
import { SESSION_COOKIE, sealSession, sessionCookieOptions } from "@/lib/session";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const fail = (reason: string) => {
    const res = NextResponse.redirect(new URL(`/?error=${reason}`, req.url));
    res.cookies.delete("patchi_oauth_state");
    return res;
  };

  if (!code || !state || state !== req.cookies.get("patchi_oauth_state")?.value) return fail("state");

  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: `${appOrigin(req)}/api/auth/callback`,
    }),
  });
  const { access_token: token } = (await tokenRes.json()) as { access_token?: string };
  if (!token) return fail("token");

  const user = await getViewer(token);
  if (!user) return fail("token");

  const res = NextResponse.redirect(new URL("/dashboard", req.url));
  res.cookies.delete("patchi_oauth_state");
  res.cookies.set(SESSION_COOKIE, await sealSession({ token, user }), sessionCookieOptions);
  return res;
}

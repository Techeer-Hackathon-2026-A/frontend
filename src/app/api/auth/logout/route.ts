import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

function logout(req: Request) {
  const res = NextResponse.redirect(new URL("/", req.url), 303);
  res.cookies.delete(SESSION_COOKIE);
  return res;
}

// 버튼은 POST, 세션이 만료돼 서버 컴포넌트가 돌려보낼 때는 GET
export const POST = logout;
export const GET = logout;

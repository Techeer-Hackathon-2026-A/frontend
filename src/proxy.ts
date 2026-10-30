import { NextResponse, type NextRequest } from "next/server";

// 쿠키가 있는지만 보는 낙관적 리다이렉트. 세션이 진짜 유효한지는 각 페이지가 확인한다.
export function proxy(req: NextRequest) {
  const signedIn = req.cookies.has("patchi_session");
  const { pathname } = req.nextUrl;

  if (pathname === "/" && signedIn) return NextResponse.redirect(new URL("/dashboard", req.url));
  if (pathname !== "/" && !signedIn) return NextResponse.redirect(new URL("/", req.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/dashboard/:path*", "/scans/:path*"],
};

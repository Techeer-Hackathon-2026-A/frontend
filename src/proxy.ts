import { NextResponse, type NextRequest } from "next/server";

// 쿠키가 있는지만 보는 낙관적 리다이렉트. 세션이 진짜 유효한지는 각 페이지가 확인한다.
export function proxy(req: NextRequest) {
  const signedIn = req.cookies.has("patchi_session");
  const { pathname } = req.nextUrl;

  if (pathname === "/" && signedIn) return NextResponse.redirect(new URL("/dashboard", req.url));
  // 스캔 화면은 로그인 없이 링크로 시작한 공개 레포 스캔도 보여 준다
  if (pathname !== "/" && !pathname.startsWith("/scans/") && !signedIn) return NextResponse.redirect(new URL("/", req.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/dashboard/:path*", "/scans/:path*"],
};

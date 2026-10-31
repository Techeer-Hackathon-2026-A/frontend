import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  rewrites: async () => [
    // /demo 는 연출 프로토타입(public/demo.html)을 그대로 보여준다
    { source: "/demo", destination: "/demo.html" },
    // 대시보드·새 스캔·레포·보고서는 앱 프로토타입(public/app.html, 해시 라우팅) 그대로. /dashboard 는 실제 데이터, /preview 는 목업
    { source: "/dashboard", destination: "/app.html" },
    { source: "/preview", destination: "/app.html" },
    // 브라우저가 부르는 /api/v1 은 rewrite 로 넘기지 않는다. 로그인 정보를 붙여야 해서 src/app/api/v1/[...path]/route.ts 가 대신 전달한다
  ],
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

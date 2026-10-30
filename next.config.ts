import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  rewrites: async () => [
    // /demo 는 연출 프로토타입(public/demo.html)을 그대로 보여준다
    { source: "/demo", destination: "/demo.html" },
    // 스캔 화면(lib/feed/scanFeed.ts)이 브라우저에서 부르는 팀 백엔드 API. 같은 출처라 CORS 설정이 필요 없다
    { source: "/api/v1/:path*", destination: `${(process.env.BACKEND_URL || "http://localhost:8000").replace(/\/$/, "")}/api/v1/:path*` },
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

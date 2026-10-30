import type { Metadata } from "next";
import { Suspense } from "react";
import ScanFrame from "@/components/ScanFrame";

export const metadata: Metadata = { title: "스캔 둘러보기 · Patchi" };

// 로그인 없이 둘러보기의 스캔 화면. 고른 레포 이름으로 녹화된 데모 레포 스캔을 재생한다
export default function PreviewScanPage({ searchParams }: PageProps<"/preview/scan">) {
  return (
    <Suspense>
      <PreviewScan searchParams={searchParams} />
    </Suspense>
  );
}

async function PreviewScan({ searchParams }: Pick<PageProps<"/preview/scan">, "searchParams">) {
  const { repo, branch, paths } = await searchParams;
  const name = typeof repo === "string" ? repo : "acme/shop-web";
  return (
    <ScanFrame
      query={{
        feed: "demo",
        repo: name,
        branch: typeof branch === "string" ? branch : "main",
        back: "/preview",
        // 범위 설정에서 고른 파일만 재생한다
        ...(typeof paths === "string" && { paths }),
      }}
      title={`${name} 스캔 둘러보기`}
    />
  );
}

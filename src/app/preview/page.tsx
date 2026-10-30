import type { Metadata } from "next";
import Link from "next/link";
import Logo from "@/components/Logo";
import DashboardBody from "@/components/dashboard/DashboardBody";
import { PREVIEW_REPOS, PREVIEW_SCANS } from "@/lib/fixtures/preview";

export const metadata: Metadata = { title: "둘러보기 · Patchi" };

// 로그인 없이 둘러보기. 대시보드와 같은 화면에 샘플 데이터를 넣고, 스캔은 녹화된 데모로 재생한다
export default function PreviewPage() {
  return (
    <div className="h-screen overflow-auto">
      <header className="sticky top-0 z-10 flex h-[52px] items-center gap-3 border-b border-line bg-bg/90 px-4 backdrop-blur">
        <Link href="/" aria-label="처음으로">
          <Logo />
        </Link>
        <span className="text-[13px] font-medium">Patchi</span>
        <span className="rounded-md border border-line px-1.5 text-xs text-muted">둘러보기</span>
        <span className="flex-1" />
        <a href="/api/auth/login" className="flex h-8 items-center rounded-full bg-fg px-3.5 text-[13px] font-medium text-bg">
          GitHub 로 로그인
        </a>
      </header>
      <DashboardBody
        scans={PREVIEW_SCANS}
        recent={PREVIEW_SCANS}
        rows={PREVIEW_REPOS}
        canScan
        preview
        notice={
          <div className="flex items-center gap-3 rounded-[10px] border border-line bg-panel px-4 py-3 text-[13px] text-muted">
            <i className="size-1.5 flex-none rounded-full bg-ok" />
            로그인 없이 보는 예시 화면이에요. 레포 옆 스캔을 누르면 데모 레포 스캔부터 수정·PR 까지 그대로 볼 수 있어요.
          </div>
        }
      />
    </div>
  );
}

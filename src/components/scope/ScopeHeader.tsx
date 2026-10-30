import Link from "next/link";
import Logo from "@/components/Logo";

/** 범위 설정 화면 머리. 로고와 "레포 /" 는 대시보드(또는 둘러보기)로 돌아간다 */
export default function ScopeHeader({ repo, back, preview }: { repo: string; back: string; preview?: boolean }) {
  return (
    <header className="sticky top-0 z-10 flex h-[52px] items-center gap-3 border-b border-line bg-bg/90 px-4 text-[13px] backdrop-blur">
      <Link href={back} aria-label="돌아가기">
        <Logo />
      </Link>
      <Link href={back} className="text-muted hover:text-fg">
        {preview ? "둘러보기" : "대시보드"}
      </Link>
      <span className="text-faint">/</span>
      <span className="text-muted">새 스캔</span>
      <span className="text-faint">/</span>
      <span className="truncate font-medium">{repo}</span>
    </header>
  );
}

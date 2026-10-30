import Link from "next/link";
import { Suspense } from "react";
import Character from "@/components/Character";
import LoginError from "./LoginError";

// 로그인 전 첫 화면. 로그인돼 있으면 proxy 가 /dashboard 로 보낸다.
export default function Home() {
  return (
    <main className="grid h-screen place-content-center justify-items-center gap-5 px-6 text-center">
      <Character className="h-[88px] w-[92px]" />
      <h1 className="text-[28px] font-medium tracking-tight">Patchi</h1>
      <p className="-mt-2 max-w-[360px] text-[14px] text-muted">
        GitHub 레포의 취약점을 찾고, 실제 공격으로 확인하고, 고쳐서 PR 까지 올려요.
      </p>
      <div className="mt-2 flex items-center gap-2">
        <a
          href="/api/auth/login"
          className="flex h-10 items-center gap-2 rounded-full bg-fg px-5 text-[14px] font-medium text-bg transition-transform hover:-translate-y-px"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
          GitHub 로 계속하기
        </a>
        {/* 로그인 없이 샘플 대시보드 → 스캔 → 수정 → PR 까지 전부 볼 수 있다 */}
        <Link href="/preview" className="flex h-10 items-center rounded-full border border-line px-5 text-[14px] text-muted hover:text-fg">
          로그인 없이 둘러보기
        </Link>
      </div>
      {/* 원본 연출 프로토타입(public/demo.html). 정적 파일 rewrite 라 Link 대신 a */}
      <a href="/demo" className="text-[13px] text-muted hover:text-fg">
        연출 데모 보기 →
      </a>
      <Suspense>
        <LoginError />
      </Suspense>
    </main>
  );
}

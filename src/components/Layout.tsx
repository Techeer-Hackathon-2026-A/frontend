import { Link, Outlet } from 'react-router-dom'
import { Logo } from '@/components/Logo'

export function Layout() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex h-[52px] max-w-[880px] items-center gap-3 px-6">
          <Link to="/" className="flex items-center gap-3">
            <Logo />
            <span className="text-[13px] font-medium">Patchi</span>
          </Link>
          <span className="flex-1" />
          {/* 연출 프로토타입 (public/demo.html). 라우터 밖 정적 파일이라 a 태그 */}
          <a href="/demo.html" className="text-[13px] text-muted hover:text-fg">
            연출 데모
          </a>
        </div>
      </header>
      <main className="mx-auto max-w-[880px] px-6 py-10">
        <Outlet />
      </main>
    </div>
  )
}

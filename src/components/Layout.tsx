import { Fragment } from 'react'
import { Link, Outlet, useMatches, type Params } from 'react-router-dom'
import { Logo } from '@/components/Logo'

/** 라우트 handle 에 넣는 상단 경로. 마지막 칸은 굵게 보인다 */
export interface RouteHandle {
  crumbs?: (params: Params) => { label: string; to?: string }[]
}

// 프로토타입의 상단 바(.top): 로고 · 홈 / 레포 / 화면
export function Layout() {
  const matches = useMatches()
  const match = matches[matches.length - 1]
  const crumbs = (match?.handle as RouteHandle | undefined)?.crumbs?.(match.params) ?? []

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 flex h-[52px] items-center gap-2 border-b border-line bg-bg/90 px-6 whitespace-nowrap text-muted backdrop-blur max-[760px]:px-4">
        <Link to="/" className="mr-1 flex items-center gap-2.5 text-fg" aria-label="처음으로">
          <Logo />
          {!crumbs.length && <span className="font-medium">Patchi</span>}
        </Link>
        {crumbs.length > 0 && (
          <Link to="/" className="hover:text-fg">
            홈
          </Link>
        )}
        {crumbs.map((c, i) => (
          <Fragment key={i}>
            <span className="text-faint">/</span>
            {i === crumbs.length - 1 ? (
              <b className="truncate font-medium text-fg">{c.label}</b>
            ) : (
              <Link to={c.to ?? '/'} className="truncate hover:text-fg">
                {c.label}
              </Link>
            )}
          </Fragment>
        ))}
        <span className="flex-1" />
        {/* 연출 프로토타입 (public/demo.html). 라우터 밖 정적 파일이라 a 태그 */}
        <a href="/demo.html" className="hover:text-fg">
          연출 데모
        </a>
      </header>
      <main className="mx-auto max-w-[1040px] px-8 pt-9 pb-24 max-[760px]:px-4 max-[760px]:pt-6">
        <Outlet />
      </main>
    </div>
  )
}

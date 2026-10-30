// [프론트 B] PR 목록 조회
import { Link, useParams } from 'react-router-dom'
import { ErrorMessage, Loading } from '@/components/StateMessage'
import { usePullRequests } from '@/hooks/queries'

const STATUS = {
  pending: { label: '생성 중', dot: 'animate-pulse bg-ok' },
  created: { label: '생성됨', dot: 'bg-ok' },
  failed: { label: '실패', dot: 'bg-danger' },
} as const

export function PullRequestsPage() {
  const scanId = Number(useParams().scanId)
  const prs = usePullRequests(scanId)

  return (
    <div className="flex flex-col gap-6">
      <Link to={`/scans/${scanId}`} className="text-[13px] text-muted hover:text-fg">
        ← 리포트로
      </Link>
      <h1 className="text-[22px] font-medium tracking-tight">수정 PR 목록</h1>

      {prs.isLoading && <Loading />}
      {prs.error && <ErrorMessage error={prs.error} />}

      {prs.data && (
        <ul className="divide-y divide-line rounded-[10px] border border-line">
          {prs.data.length === 0 && (
            <li className="px-4 py-6 text-center text-[13px] text-faint">아직 생성된 PR이 없어요</li>
          )}
          {prs.data.map((pr) => (
            <li key={pr.id} className="flex items-center gap-4 px-4 py-3 text-[13px]">
              <span className="inline-flex w-20 items-center gap-1.5 text-muted">
                <i className={`size-1.5 rounded-full ${STATUS[pr.status].dot}`} />
                {STATUS[pr.status].label}
              </span>
              <span className="min-w-0 flex-1 truncate font-mono text-xs text-faint">{pr.branch_name}</span>
              {pr.pr_url ? (
                <a href={pr.pr_url} target="_blank" rel="noreferrer" className="text-ok hover:underline">
                  PR #{pr.pr_number}
                </a>
              ) : (
                <span className="text-faint">-</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

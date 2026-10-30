// [프론트 B] PR 목록 조회
import { Link, useParams } from 'react-router-dom'
import { ErrorMessage, Loading } from '@/components/StateMessage'
import { usePullRequests } from '@/hooks/queries'

const STATUS_STYLE = {
  pending: 'text-slate-500',
  created: 'text-emerald-700',
  failed: 'text-red-600',
} as const

export function PullRequestsPage() {
  const scanId = Number(useParams().scanId)
  const prs = usePullRequests(scanId)

  return (
    <div className="space-y-6">
      <Link to={`/scans/${scanId}`} className="text-sm text-slate-600 hover:underline">
        ← 리포트로
      </Link>
      <h1 className="text-2xl font-bold">수정 PR 목록</h1>

      {prs.isLoading && <Loading />}
      {prs.error && <ErrorMessage error={prs.error} />}
      {prs.data?.length === 0 && <p className="text-sm text-slate-500">아직 생성된 PR이 없습니다.</p>}

      <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
        {prs.data?.map((pr) => (
          <li key={pr.id} className="flex items-center gap-4 px-6 py-4 text-sm">
            <span className={`w-16 font-medium ${STATUS_STYLE[pr.status]}`}>{pr.status}</span>
            <span className="flex-1 font-mono text-xs">{pr.branch_name}</span>
            {pr.pr_url ? (
              <a href={pr.pr_url} target="_blank" rel="noreferrer" className="underline">
                #{pr.pr_number}
              </a>
            ) : (
              <span className="text-slate-400">-</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

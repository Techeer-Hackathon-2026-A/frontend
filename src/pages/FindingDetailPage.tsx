// [프론트 B] 취약점 상세 조회 + AI 수정안 + PR 생성
import { Link, useParams } from 'react-router-dom'
import { SeverityBadge } from '@/components/SeverityBadge'
import { ErrorMessage, Loading } from '@/components/StateMessage'
import { useCreatePullRequest, useFinding, useFixes, useRequestFix } from '@/hooks/queries'
import { CATEGORY_LABEL } from '@/lib/labels'

export function FindingDetailPage() {
  const findingId = Number(useParams().findingId)
  const finding = useFinding(findingId)
  const fixes = useFixes(findingId)
  const requestFix = useRequestFix(findingId)
  const createPr = useCreatePullRequest(finding.data?.scan_id ?? 0)

  if (finding.isLoading) return <Loading />
  if (finding.error || !finding.data) return <ErrorMessage error={finding.error} />
  const f = finding.data

  return (
    <div className="space-y-6">
      <Link to={`/scans/${f.scan_id}`} className="text-sm text-slate-600 hover:underline">
        ← 리포트로
      </Link>

      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <SeverityBadge severity={f.severity} />
          <span className="text-sm text-slate-500">{CATEGORY_LABEL[f.category]}</span>
          <span className="text-sm text-slate-500">· 위험도 {f.risk_score}</span>
        </div>
        <h1 className="text-2xl font-bold">{f.title}</h1>
        <p className="font-mono text-sm text-slate-500">
          {f.file_path}:{f.start_line}
        </p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-6 text-sm">
        <p>{f.message}</p>
        <dl className="mt-4 grid grid-cols-[120px_1fr] gap-y-2">
          <dt className="text-slate-500">CWE</dt>
          <dd>{f.cwe.join(', ') || '-'}</dd>
          <dt className="text-slate-500">OWASP</dt>
          <dd>{f.owasp_top10 ?? '-'}</dd>
          <dt className="text-slate-500">탐지 도구</dt>
          <dd>{f.merged_tools.join(', ') || f.tool}</dd>
          {f.dependency && (
            <>
              <dt className="text-slate-500">패키지</dt>
              <dd>
                {f.dependency.package} {f.dependency.installed_version} → {f.dependency.fixed_version ?? '수정 버전 없음'}
              </dd>
            </>
          )}
        </dl>
        {f.snippet && (
          <pre className="mt-4 overflow-x-auto rounded-lg bg-slate-900 p-4 text-xs text-slate-100">{f.snippet}</pre>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">AI 수정안</h2>
          <button
            onClick={() => requestFix.mutate(undefined, { onSuccess: () => setTimeout(() => fixes.refetch(), 3000) })}
            disabled={requestFix.isPending || !f.snippet}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {requestFix.isPending ? '요청 중…' : '수정안 만들기'}
          </button>
        </div>
        {/* TODO(프론트 B): 원본/수정 코드 diff 뷰, 생성 완료까지 폴링 */}
        {fixes.data?.map((fix) => (
          <article key={fix.id} className="rounded-xl border border-slate-200 bg-white p-6 text-sm">
            <div className="mb-3 flex items-center justify-between">
              <span className={fix.verified ? 'text-emerald-700' : 'text-amber-700'}>
                {fix.verified ? '검증 완료' : '미검증'}
              </span>
              <button
                onClick={() => createPr.mutate([fix.id])}
                disabled={createPr.isPending}
                className="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-50"
              >
                이 수정안으로 PR 만들기
              </button>
            </div>
            <p className="mb-3">{fix.explanation}</p>
            <div className="grid gap-3 md:grid-cols-2">
              <pre className="overflow-x-auto rounded-lg bg-red-50 p-3 text-xs">{fix.original_code}</pre>
              <pre className="overflow-x-auto rounded-lg bg-emerald-50 p-3 text-xs">{fix.fixed_code}</pre>
            </div>
          </article>
        ))}
        {createPr.isSuccess && (
          <p className="text-sm text-emerald-700">
            PR 생성을 요청했습니다. <Link to={`/scans/${f.scan_id}/pull-requests`} className="underline">PR 목록 보기</Link>
          </p>
        )}
      </section>
    </div>
  )
}

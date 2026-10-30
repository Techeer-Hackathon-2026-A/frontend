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
    <div className="flex flex-col gap-8">
      <Link to={`/scans/${f.scan_id}`} className="text-[13px] text-muted hover:text-fg">
        ← 리포트로
      </Link>

      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-[13px] text-muted">
          <SeverityBadge severity={f.severity} />
          <span>{CATEGORY_LABEL[f.category]}</span>
          <span className="text-faint">· 위험도 {f.risk_score}</span>
        </div>
        <h1 className="text-[22px] font-medium tracking-tight">{f.title}</h1>
        <p className="font-mono text-xs text-faint">
          {f.file_path}:{f.start_line}
        </p>
      </header>

      <section className="rounded-[10px] border border-line p-5 text-[13.5px]">
        <p className="leading-relaxed">{f.message}</p>
        <dl className="mt-4 grid grid-cols-[100px_1fr] gap-y-2 text-[13px]">
          <dt className="text-faint">CWE</dt>
          <dd className="text-muted">{f.cwe.join(', ') || '-'}</dd>
          <dt className="text-faint">OWASP</dt>
          <dd className="text-muted">{f.owasp_top10 ?? '-'}</dd>
          <dt className="text-faint">탐지 도구</dt>
          <dd className="text-muted">{f.merged_tools.join(', ') || f.tool}</dd>
          {f.dependency && (
            <>
              <dt className="text-faint">패키지</dt>
              <dd className="text-muted">
                {f.dependency.package} {f.dependency.installed_version} → {f.dependency.fixed_version ?? '수정 버전 없음'}
              </dd>
            </>
          )}
        </dl>
        {f.snippet && (
          <pre className="mt-4 overflow-x-auto rounded-lg border border-line bg-panel p-4 font-mono text-xs leading-relaxed">
            {f.snippet}
          </pre>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[13px] font-medium">AI 수정안</h2>
          <button
            onClick={() => requestFix.mutate(undefined, { onSuccess: () => setTimeout(() => fixes.refetch(), 3000) })}
            disabled={requestFix.isPending || !f.snippet}
            className="h-8 rounded-full bg-fg px-4 text-[13px] font-medium text-bg disabled:opacity-40"
          >
            {requestFix.isPending ? '요청 중…' : '수정안 만들기'}
          </button>
        </div>
        {/* TODO(프론트 B): 원본/수정 코드 diff 뷰, 생성 완료까지 폴링 */}
        {fixes.data?.map((fix) => (
          <article key={fix.id} className="rounded-[10px] border border-line p-5 text-[13.5px]">
            <div className="mb-3 flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-[12.5px] text-muted">
                <i className={`size-1.5 rounded-full ${fix.verified ? 'bg-ok' : 'bg-warn'}`} />
                {fix.verified ? '검증 완료' : '미검증'}
              </span>
              <button
                onClick={() => createPr.mutate([fix.id])}
                disabled={createPr.isPending}
                className="h-7 rounded-full border border-line px-3 text-[12.5px] font-medium hover:bg-panel-2 disabled:opacity-40"
              >
                이 수정안으로 PR 만들기
              </button>
            </div>
            <p className="mb-3 text-muted">{fix.explanation}</p>
            <div className="grid gap-3 md:grid-cols-2">
              <pre className="overflow-x-auto rounded-lg border border-danger/20 bg-danger/5 p-3 font-mono text-xs">
                {fix.original_code}
              </pre>
              <pre className="overflow-x-auto rounded-lg border border-ok/20 bg-ok/5 p-3 font-mono text-xs">
                {fix.fixed_code}
              </pre>
            </div>
          </article>
        ))}
        {createPr.isSuccess && (
          <p className="text-[13px] text-ok">
            PR 생성을 요청했어요.{' '}
            <Link to={`/scans/${f.scan_id}/pull-requests`} className="underline">
              PR 목록 보기
            </Link>
          </p>
        )}
      </section>
    </div>
  )
}

// [프론트 A] 보안 분석 리포트 — 프로토타입 보고서 화면: 한 줄 결론 + PR 카드, 왼쪽 취약점 목록, 오른쪽 상세
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Character } from '@/components/Character'
import { FindingCard } from '@/components/FindingCard'
import { Icon } from '@/components/Icon'
import { SeverityBadge } from '@/components/SeverityBadge'
import { ErrorMessage, Loading } from '@/components/StateMessage'
import { btn, btnOk, btnPrimary, btnSm, Chip, SectionHead } from '@/components/ui'
import { useFinding, useFindings, useFixes, usePullRequests, useReport, useScan } from '@/hooks/queries'
import { CATEGORY_LABEL, SEVERITY_LABEL, SEVERITY_ORDER, timeAgo } from '@/lib/labels'
import { scanTitle } from '@/lib/scanRepos'
import type { Finding, PullRequest, SecurityReport } from '@/types/api'

export function ReportPage() {
  const scanId = Number(useParams().scanId)
  const scan = useScan(scanId)
  const done = scan.data?.status === 'completed'
  const report = useReport(scanId, done)
  const findings = useFindings(scanId, {}, done)
  const prs = usePullRequests(scanId)
  const [picked, setPicked] = useState<number | null>(null)

  if (scan.isLoading) return <Loading />
  if (scan.error || !scan.data) return <ErrorMessage error={scan.error} />

  if (!done) {
    const failed = scan.data.status === 'failed'
    return (
      <div className="grid animate-rise justify-items-center gap-2.5 rounded-xl border border-line bg-panel px-4 py-14 text-center">
        <Character pose={failed ? 'alert' : 'sniff'} className="h-[60px] w-[64px]" />
        <h2 className="text-base font-medium">{failed ? scan.data.error_message || '스캔에 실패했어요' : '아직 스캔 중이에요'}</h2>
        <Link to={failed ? '/' : `/scans/${scanId}`} className={`${btn} ${btnSm} mt-1.5`}>
          {failed ? '다시 스캔' : '스캔 화면 보기'}
        </Link>
      </div>
    )
  }
  if (report.isLoading || findings.isLoading) return <Loading label="보고서를 불러오는 중…" />
  if (report.error || !report.data) return <ErrorMessage error={report.error} />

  const list = findings.data ?? report.data.top_findings
  const active = picked ?? list[0]?.id ?? null
  const pr = prs.data?.find((p) => p.status === 'created') ?? prs.data?.find((p) => p.status === 'pending')
  const fixedN = list.filter((f) => f.status === 'fixed').length

  const title = !list.length
    ? '문제를 찾지 못했어요'
    : fixedN
      ? fixedN === list.length
        ? `${fixedN}개를 모두 고쳤어요`
        : `${fixedN}개를 고쳤어요 · ${list.length - fixedN}개 남음`
      : `${list.length}개를 찾았어요`

  return (
    <div className="flex flex-col gap-10">
      <div className="flex animate-rise flex-wrap items-center gap-[18px]">
        <Character pose={!list.length || fixedN === list.length ? 'happy' : 'sniff'} className="h-14 w-[60px] flex-none" />
        <div>
          <h1 className="text-[22px] font-medium tracking-[-0.02em]">{title}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-muted">
            <span className="inline-flex items-center gap-1.5 font-mono text-xs">
              <Icon name="branch" />
              {scan.data.branch ?? '기본 브랜치'}
            </span>
            {scan.data.commit_sha && <span className="font-mono text-xs text-dim">{scan.data.commit_sha.slice(0, 7)}</span>}
            <span className="text-dim">· {scanTitle(scanId)} · {timeAgo(scan.data.created_at)}</span>
          </p>
        </div>
        <span className="flex-1" />
        <div className="flex max-w-full flex-wrap items-center gap-2">
          <Link to={`/scans/${scanId}`} className={`${btn} h-[38px]`}>
            <Icon name="play" />
            스캔 다시 보기
          </Link>
          {pr ? (
            <PrCard pr={pr} scanId={scanId} />
          ) : (
            list.length > 0 && (
              <Link to={`/scans/${scanId}`} className={`${btn} ${btnPrimary} h-[38px] px-[18px]`}>
                <Icon name="pr" />
                고치고 PR 열기
              </Link>
            )
          )}
        </div>
      </div>

      <Stats report={report.data} />

      {list.length > 0 && (
        <div className="grid animate-rise grid-cols-[minmax(0,1fr)] items-start gap-5 [animation-delay:.08s] min-[981px]:grid-cols-[340px_minmax(0,1fr)]">
          <FindingList list={list} active={active} onPick={setPicked} />
          {active !== null && <ActiveFinding id={active} />}
        </div>
      )}

      <Owasp matrix={report.data.owasp_matrix} />
    </div>
  )
}

function PrCard({ pr, scanId }: { pr: PullRequest; scanId: number }) {
  return (
    <div className="flex max-w-[420px] min-w-0 items-center gap-3 rounded-xl border border-ok/25 bg-gradient-to-b from-ok/8 to-ok/3 py-3 pr-3.5 pl-3">
      <span className="grid size-[30px] flex-none place-items-center rounded-lg bg-ok/9 text-ok">
        <Icon name="pr" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{pr.pr_number ? `#${pr.pr_number} ` : ''}{pr.branch_name}</div>
        <div className="flex gap-2 text-xs text-muted">
          <span>{pr.status === 'created' ? 'PR 열림' : 'PR 만드는 중'}</span>
          <Link to={`/scans/${scanId}/pull-requests`} className="hover:text-fg">
            · 모든 PR
          </Link>
        </div>
      </div>
      {pr.pr_url && (
        <a href={pr.pr_url} target="_blank" rel="noreferrer" className={`${btn} ${btnSm} ${btnOk}`}>
          GitHub
          <Icon name="ext" />
        </a>
      )}
    </div>
  )
}

function Stats({ report }: { report: SecurityReport }) {
  const stats = [
    { v: report.grade ?? '-', l: '보안 등급', s: 'A 가 가장 안전' },
    { v: report.total, l: '발견한 취약점', s: `Critical ${report.by_severity.critical ?? 0} · High ${report.by_severity.high ?? 0}` },
    ...Object.entries(report.by_category).map(([k, v]) => ({
      v: v ?? 0,
      l: CATEGORY_LABEL[k as keyof typeof CATEGORY_LABEL] ?? k,
      s: '',
    })),
  ].slice(0, 4)
  return (
    <section className="grid animate-rise grid-cols-4 gap-px overflow-hidden rounded-xl border border-line bg-line [animation-delay:.04s] max-[760px]:grid-cols-2">
      {stats.map((s) => (
        <div key={s.l} className="bg-bg px-[18px] pt-[18px] pb-4">
          <div className="text-[32px] leading-none font-medium tracking-[-0.035em] tabular-nums">{s.v}</div>
          <div className="mt-2.5 text-[12.5px]">{s.l}</div>
          {s.s && <div className="mt-0.5 text-xs text-dim">{s.s}</div>}
        </div>
      ))}
    </section>
  )
}

function FindingList({ list, active, onPick }: { list: Finding[]; active: number | null; onPick: (id: number) => void }) {
  const counts = SEVERITY_ORDER.map((s) => [s, list.filter((f) => f.severity === s).length] as const).filter(([, n]) => n)
  return (
    <div className="min-[981px]:sticky min-[981px]:top-[68px]">
      <div className="flex items-center gap-2.5 px-1 pb-2.5 text-muted">
        <span>취약점 {list.length}</span>
        <span className="text-dim">· {counts.map(([s, n]) => `${SEVERITY_LABEL[s]} ${n}`).join(' · ')}</span>
      </div>
      {list.map((f) => {
        const fixed = f.status === 'fixed'
        return (
          <button
            key={f.id}
            onClick={() => onPick(f.id)}
            className={`flex w-full gap-[11px] rounded-[10px] border p-3 text-left transition-colors hover:bg-panel ${f.id === active ? 'border-line-2 bg-panel' : 'border-transparent'}`}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <SeverityBadge severity={f.severity} fixed={fixed} />
                <span className="flex-1" />
                {fixed ? <Chip tone="green">고침</Chip> : f.status === 'open' ? <Chip tone="red">열림</Chip> : <Chip tone="gray">제외</Chip>}
              </div>
              <div className={`mt-1 truncate text-[13.5px] font-medium ${fixed ? 'text-muted' : ''}`}>{f.title}</div>
              <div className="mt-[3px] truncate font-mono text-[11.5px] text-dim">
                {f.file_path.split('/').slice(-2).join('/')}:{f.start_line}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

function ActiveFinding({ id }: { id: number }) {
  const finding = useFinding(id)
  const fixes = useFixes(id)
  if (finding.isLoading) return <Loading />
  if (finding.error || !finding.data) return <ErrorMessage error={finding.error} />
  return (
    <FindingCard
      finding={finding.data}
      fix={fixes.data?.[0]}
      actions={
        <Link to={`/findings/${id}`} className={`${btn} ${btnSm}`}>
          자세히 · 수정안 만들기
          <Icon name="arrow" />
        </Link>
      }
    />
  )
}

function Owasp({ matrix }: { matrix: Record<string, number> }) {
  const rows = Object.entries(matrix)
  if (!rows.length) return null
  return (
    <section className="animate-rise [animation-delay:.12s]">
      <SectionHead title="OWASP Top 10" count={rows.filter(([, v]) => v > 0).length} />
      <div className="overflow-hidden rounded-xl border border-line">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center gap-3.5 border-t border-line px-4 py-2.5 first:border-t-0">
            <span className={`size-1.5 flex-none rounded-full ${v > 0 ? 'bg-danger' : 'bg-ok'}`} />
            <span className="min-w-0 flex-1 truncate text-muted">{k}</span>
            {v > 0 ? <Chip tone="red">{v}건</Chip> : <Chip tone="green">없음</Chip>}
          </div>
        ))}
      </div>
    </section>
  )
}


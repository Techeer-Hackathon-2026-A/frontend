// [프론트 A] 분석 진행 상태 실시간 표시 + 보안 분석 리포트
import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Character, type Pose } from '@/components/Character'
import { SeverityBadge } from '@/components/SeverityBadge'
import { ErrorMessage, Loading } from '@/components/StateMessage'
import { useReport, useScanProgress } from '@/hooks/queries'
import { CATEGORY_LABEL, SEVERITY_DOT, SEVERITY_LABEL, SEVERITY_ORDER, STATUS_LABEL } from '@/lib/labels'
import type { ScanStatus, SecurityReport } from '@/types/api'

// 진행 단계마다 캐릭터 표정을 바꾼다
const POSE: Record<ScanStatus, Pose> = {
  pending: 'idle',
  cloning: 'idle',
  detecting: 'sniff',
  classifying: 'sniff',
  fixing: 'fix',
  completed: 'happy',
  failed: 'alert',
}

export function ScanPage() {
  const scanId = Number(useParams().scanId)
  const progress = useScanProgress(scanId)
  const status = progress.data?.status
  const report = useReport(scanId, status === 'completed')

  if (progress.isLoading) return <Loading />
  if (progress.error) return <ErrorMessage error={progress.error} />

  return (
    <div className="flex flex-col gap-10">
      <div className="flex items-center justify-between">
        <h1 className="text-[22px] font-medium tracking-tight">스캔 #{scanId}</h1>
        <Link to={`/scans/${scanId}/pull-requests`} className="text-[13px] text-muted hover:text-fg">
          PR 목록 →
        </Link>
      </div>

      {status !== 'completed' && progress.data && (
        <section className="flex flex-col items-center gap-5 py-6 text-center">
          <Character pose={POSE[progress.data.status]} className="h-[88px] w-[92px]" />
          <div className="w-full max-w-[420px]">
            <div className="flex justify-between text-[13px]">
              <span className="font-medium">{STATUS_LABEL[progress.data.status]}</span>
              <span className="text-muted">{progress.data.percent}%</span>
            </div>
            <div className="mt-3 h-1 overflow-hidden rounded-full bg-panel-2">
              <div
                className={`h-full transition-all ${status === 'failed' ? 'bg-danger' : 'bg-ok'}`}
                style={{ width: `${progress.data.percent}%` }}
              />
            </div>
            {progress.data.message && <p className="mt-3 text-[13px] text-muted">{progress.data.message}</p>}
          </div>
        </section>
      )}

      {report.isLoading && <Loading label="리포트를 불러오는 중…" />}
      {report.error && <ErrorMessage error={report.error} />}
      {report.data && <ReportView report={report.data} />}
    </div>
  )
}

function ReportView({ report }: { report: SecurityReport }) {
  // TODO(프론트 A): 차트, OWASP 매트릭스 시각화, 필터가 있는 전체 취약점 목록
  const stats = [
    { label: '보안 등급', value: report.grade ?? '-' },
    { label: '발견된 취약점', value: report.total },
    ...Object.entries(report.by_category).map(([k, v]) => ({
      label: CATEGORY_LABEL[k as keyof typeof CATEGORY_LABEL] ?? k,
      value: v ?? 0,
    })),
  ]

  return (
    <>
      <section className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-px overflow-hidden rounded-[10px] border border-line bg-line">
        {stats.map((s) => (
          <div key={s.label} className="bg-bg px-4 py-4">
            <div className="text-[28px] leading-none font-medium tracking-tight">{s.value}</div>
            <div className="mt-1.5 text-[12.5px] text-muted">{s.label}</div>
          </div>
        ))}
      </section>

      <Section title="심각도별">
        <div className="flex flex-wrap gap-x-6 gap-y-2 px-4 py-3 text-[13px]">
          {SEVERITY_ORDER.map((s) => (
            <span key={s} className="inline-flex items-center gap-1.5 text-muted">
              <i className={`size-1.5 rounded-full ${SEVERITY_DOT[s]}`} />
              {SEVERITY_LABEL[s]} <b className="font-medium text-fg">{report.by_severity[s] ?? 0}</b>
            </span>
          ))}
        </div>
      </Section>

      <Section title="OWASP Top 10 매트릭스">
        <ul className="divide-y divide-line text-[13px]">
          {Object.entries(report.owasp_matrix).map(([k, v]) => (
            <li key={k} className="flex justify-between px-4 py-2.5">
              <span className="text-muted">{k}</span>
              <span className={v > 0 ? 'font-medium text-danger' : 'text-faint'}>{v}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="우선 조치 대상">
        <ul className="divide-y divide-line">
          {report.top_findings.length === 0 && (
            <li className="px-4 py-6 text-center text-[13px] text-faint">조치할 취약점이 없어요</li>
          )}
          {report.top_findings.map((f) => (
            <li key={f.id}>
              <Link to={`/findings/${f.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-panel">
                <span className="w-5 text-[12.5px] text-faint">{f.priority}</span>
                <SeverityBadge severity={f.severity} />
                <span className="min-w-0 flex-1 truncate text-[13.5px]">{f.title}</span>
                <span className="truncate font-mono text-xs text-faint max-[560px]:hidden">
                  {f.file_path}:{f.start_line}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>
    </>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-[13px] font-medium">{title}</h2>
      <div className="rounded-[10px] border border-line">{children}</div>
    </section>
  )
}

// [프론트 A] 분석 진행 상태 실시간 표시 + 보안 분석 리포트
import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { SeverityBadge } from '@/components/SeverityBadge'
import { ErrorMessage, Loading } from '@/components/StateMessage'
import { useReport, useScanProgress } from '@/hooks/queries'
import { CATEGORY_LABEL, SEVERITY_LABEL, SEVERITY_ORDER, STATUS_LABEL } from '@/lib/labels'
import type { SecurityReport } from '@/types/api'

export function ScanPage() {
  const scanId = Number(useParams().scanId)
  const progress = useScanProgress(scanId)
  const status = progress.data?.status
  const report = useReport(scanId, status === 'completed')

  if (progress.isLoading) return <Loading />
  if (progress.error) return <ErrorMessage error={progress.error} />

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">스캔 #{scanId}</h1>
        <Link to={`/scans/${scanId}/pull-requests`} className="text-sm text-slate-600 hover:underline">
          PR 목록 →
        </Link>
      </div>

      {status !== 'completed' && progress.data && (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex justify-between text-sm">
            <span className="font-medium">{STATUS_LABEL[progress.data.status]}</span>
            <span className="text-slate-500">{progress.data.percent}%</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full transition-all ${status === 'failed' ? 'bg-red-500' : 'bg-slate-900'}`}
              style={{ width: `${progress.data.percent}%` }}
            />
          </div>
          {progress.data.message && <p className="mt-3 text-sm text-slate-500">{progress.data.message}</p>}
        </div>
      )}

      {report.isLoading && <Loading label="리포트를 불러오는 중…" />}
      {report.error && <ErrorMessage error={report.error} />}
      {report.data && <ReportView report={report.data} />}
    </div>
  )
}

function ReportView({ report }: { report: SecurityReport }) {
  // TODO(프론트 A): 차트, OWASP 매트릭스 시각화, 필터가 있는 전체 취약점 목록
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card title="보안 등급">
          <span className="text-4xl font-bold">{report.grade ?? '-'}</span>
        </Card>
        <Card title="발견된 취약점">
          <span className="text-4xl font-bold">{report.total}</span>
        </Card>
        <Card title="유형별">
          <ul className="space-y-1 text-sm">
            {Object.entries(report.by_category).map(([k, v]) => (
              <li key={k} className="flex justify-between">
                <span>{CATEGORY_LABEL[k as keyof typeof CATEGORY_LABEL] ?? k}</span>
                <span className="font-medium">{v}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card title="심각도별">
        <div className="flex flex-wrap gap-4 text-sm">
          {SEVERITY_ORDER.map((s) => (
            <span key={s}>
              {SEVERITY_LABEL[s]} <b>{report.by_severity[s] ?? 0}</b>
            </span>
          ))}
        </div>
      </Card>

      <Card title="OWASP Top 10 매트릭스">
        <ul className="divide-y divide-slate-100 text-sm">
          {Object.entries(report.owasp_matrix).map(([k, v]) => (
            <li key={k} className="flex justify-between py-2">
              <span>{k}</span>
              <span className="font-medium">{v}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="우선 조치 대상">
        <ul className="divide-y divide-slate-100">
          {report.top_findings.map((f) => (
            <li key={f.id}>
              <Link to={`/findings/${f.id}`} className="flex items-center gap-3 py-3 hover:bg-slate-50">
                <span className="w-6 text-sm text-slate-400">{f.priority}</span>
                <SeverityBadge severity={f.severity} />
                <span className="flex-1 truncate text-sm font-medium">{f.title}</span>
                <span className="truncate font-mono text-xs text-slate-500">
                  {f.file_path}:{f.start_line}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </>
  )
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="mb-3 text-sm font-medium text-slate-500">{title}</h2>
      {children}
    </section>
  )
}

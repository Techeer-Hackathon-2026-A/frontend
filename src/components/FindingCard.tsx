// 프로토타입 보고서의 오른쪽 상세 카드(.det): 심각도·위치 → 제목·설명 → 코드 → 수정 diff
import type { ReactNode } from 'react'
import { SeverityBadge } from '@/components/SeverityBadge'
import { Chip, CodeView, DiffView, SubHead } from '@/components/ui'
import { diffLines, fixFirstLine, snippetStart } from '@/lib/code'
import { CATEGORY_LABEL } from '@/lib/labels'
import type { FindingDetail, Fix } from '@/types/api'

export function FindingCard({ finding: f, fix, actions }: { finding: FindingDetail; fix?: Fix; actions?: ReactNode }) {
  const fixed = f.status === 'fixed'
  const meta = [
    ['분류', CATEGORY_LABEL[f.category] ?? f.category],
    ['OWASP', f.owasp_top10 ?? (f.owasp.join(', ') || null)],
    ['CWE', f.cwe.join(', ') || null],
    ['위험도', f.risk_score ? String(f.risk_score) : null],
    ['탐지 도구', f.merged_tools.join(', ') || f.tool],
    [
      '패키지',
      f.dependency
        ? `${f.dependency.package} ${f.dependency.installed_version} → ${f.dependency.fixed_version ?? '수정 버전 없음'}`
        : null,
    ],
  ].filter((m): m is [string, string] => !!m[1])

  return (
    <div className="rounded-xl border border-line bg-panel px-[22px] pt-[22px] pb-6">
      <div className="flex flex-wrap items-center gap-2.5">
        <SeverityBadge severity={f.severity} fixed={fixed} />
        <span className="rounded-md border border-line px-[7px] py-px font-mono text-xs text-muted">
          {f.file_path}:{f.start_line}
        </span>
        <span className="flex-1" />
        {fixed ? <Chip tone="green">고침</Chip> : <Chip tone="red">열림</Chip>}
      </div>
      <h3 className="mt-2.5 text-lg font-medium tracking-[-0.015em]">{f.title}</h3>
      {f.message && <p className="mt-1 text-[13.5px] text-muted">{f.message}</p>}

      <dl className="mt-4 grid grid-cols-[88px_minmax(0,1fr)] gap-y-1.5 text-[12.5px]">
        {meta.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-dim">{k}</dt>
            <dd className="break-words text-muted">{v}</dd>
          </div>
        ))}
      </dl>

      <SubHead>코드</SubHead>
      {f.snippet ? (
        <CodeView code={f.snippet} firstLine={snippetStart(f)} hit={[f.start_line, f.end_line ?? f.start_line]} />
      ) : (
        <p className="rounded-[10px] border border-line bg-code px-3 py-4 text-center text-[12.5px] text-dim">
          백엔드가 이 취약점의 코드를 공개하지 않았어요
        </p>
      )}

      <SubHead>
        {fixed ? '적용된 수정' : '제안된 수정'}
        {fix && (fix.verified ? <Chip tone="green">검증 통과</Chip> : <Chip tone="gray">미검증</Chip>)}
      </SubHead>
      {fix ? (
        <>
          <DiffView path={fix.file_path} rows={diffLines(fix.original_code, fix.fixed_code, fixFirstLine(f, fix))} />
          {fix.explanation && <p className="mt-3 text-[12.5px] text-muted">{fix.explanation}</p>}
        </>
      ) : (
        <p className="rounded-[10px] border border-line bg-code px-3 py-4 text-center text-[12.5px] text-dim">
          아직 수정안이 없어요
        </p>
      )}
      {actions && <div className="mt-4 flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

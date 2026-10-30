import { SEVERITY_DOT, SEVERITY_LABEL } from '@/lib/labels'
import type { Severity } from '@/types/api'

/** 프로토타입의 심각도 표기: 점 + 영문 라벨. 고친 항목은 초록 점 */
export function SeverityBadge({ severity, fixed }: { severity: Severity; fixed?: boolean }) {
  return (
    <span className="inline-flex items-center gap-[5px] text-[11.5px] whitespace-nowrap text-muted">
      <i className={`size-1.5 flex-none rounded-full ${fixed ? 'bg-ok' : SEVERITY_DOT[severity]}`} />
      {SEVERITY_LABEL[severity]}
    </span>
  )
}

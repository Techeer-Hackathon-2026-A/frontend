import { SEVERITY_DOT, SEVERITY_LABEL } from '@/lib/labels'
import type { Severity } from '@/types/api'

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-line px-2 py-0.5 text-xs whitespace-nowrap text-muted">
      <i className={`size-1.5 rounded-full ${SEVERITY_DOT[severity]}`} />
      {SEVERITY_LABEL[severity]}
    </span>
  )
}

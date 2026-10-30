import { SEVERITY_LABEL, SEVERITY_STYLE } from '@/lib/labels'
import type { Severity } from '@/types/api'

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${SEVERITY_STYLE[severity]}`}
    >
      {SEVERITY_LABEL[severity]}
    </span>
  )
}

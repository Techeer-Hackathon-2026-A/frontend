import { STATUS_DOT, STATUS_LABEL } from '@/lib/labels'
import type { ScanStatus } from '@/types/api'

export function ScanStatusLabel({ status }: { status: ScanStatus }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12.5px] whitespace-nowrap text-muted">
      <i className={`size-1.5 rounded-full ${STATUS_DOT[status]}`} />
      {STATUS_LABEL[status]}
    </span>
  )
}

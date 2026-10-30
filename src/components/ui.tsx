// 프로토타입(prototype 보고서·레포 화면)의 공통 부품: 버튼, 칩, 섹션 머리, 코드·diff 보기
import type { ReactNode } from 'react'
import type { DiffRow } from '@/lib/code'

export const btn =
  'inline-flex h-8 items-center justify-center gap-[7px] whitespace-nowrap rounded-full border border-line-2 px-3.5 font-medium transition hover:bg-panel-2 disabled:pointer-events-none disabled:opacity-45'
export const btnSm = 'h-7 px-[11px] text-[12.5px]'
export const btnPrimary = 'border-transparent bg-fg text-bg hover:-translate-y-px hover:bg-white'
export const btnOk = 'border-transparent bg-ok text-[#04130b] hover:bg-ok'

type ChipTone = 'red' | 'green' | 'gray'
const CHIP: Record<ChipTone, string> = {
  red: 'bg-danger/9 text-danger',
  green: 'bg-ok/9 text-ok',
  gray: 'bg-panel-2 text-muted',
}

export function Chip({ tone, children }: { tone: ChipTone; children: ReactNode }) {
  return (
    <span className={`inline-flex h-5 items-center gap-[5px] whitespace-nowrap rounded-[5px] px-[7px] text-[11.5px] font-medium ${CHIP[tone]}`}>
      {children}
    </span>
  )
}

export function Spin({ className = '' }: { className?: string }) {
  return <span className={`inline-block size-3 flex-none animate-spin rounded-full border-[1.5px] border-faint border-t-fg ${className}`} />
}

export function SectionHead({ title, count, children }: { title: string; count?: number; children?: ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2.5">
      <h2 className="flex items-center gap-2 text-[13px] font-medium">
        {title}
        {count !== undefined && <span className="font-normal text-dim">{count}</span>}
      </h2>
      <span className="flex-1" />
      {children}
    </div>
  )
}

/** 상세 카드 안 소제목: "증명 ─────" */
export function SubHead({ children }: { children: ReactNode }) {
  return (
    <h4 className="mt-6 mb-2.5 flex items-center gap-2 text-xs font-medium text-dim">
      {children}
      <span className="h-px flex-1 bg-line" />
    </h4>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="grid justify-items-center gap-2.5 px-4 py-10 text-center text-muted">{children}</div>
}

const DIFF_ROW: Record<DiffRow['kind'], string> = {
  ctx: '',
  add: 'bg-ok/8 [&_code]:text-[#a8e0c3] [&_em]:text-[#a8e0c3] [&_span]:text-ok/60',
  del: 'bg-danger/7 [&_code]:text-[#ffb4ae] [&_em]:text-[#ffb4ae] [&_span]:text-danger/55',
}

/** GitHub Files changed 스타일 diff */
export function DiffView({ path, rows }: { path: string; rows: DiffRow[] }) {
  const add = rows.filter((r) => r.kind === 'add').length
  const del = rows.filter((r) => r.kind === 'del').length
  const bar = Array.from({ length: 5 }, (_, i) => {
    const total = add + del || 1
    const a = Math.round((add / total) * 5)
    return i < a ? 'bg-ok' : i < a + Math.round((del / total) * 5) ? 'bg-danger' : 'bg-[#2a2c31]'
  })
  return (
    <div className="overflow-hidden rounded-[10px] border border-line">
      <div className="flex h-9 items-center gap-2.5 border-b border-line bg-panel-2 px-3 font-mono text-xs text-muted">
        <span className="min-w-0 truncate">{path}</span>
        <span className="text-ok">+{add}</span>
        <span className="text-danger">−{del}</span>
        <span className="ml-auto inline-flex gap-px">
          {bar.map((c, i) => (
            <i key={i} className={`size-[7px] rounded-[1px] ${c}`} />
          ))}
        </span>
      </div>
      <div className="overflow-x-auto bg-code">
        <div className="w-max min-w-full">
          {rows.map((r, i) => (
            <div key={i} className={`grid grid-cols-[40px_40px_18px_minmax(0,1fr)] font-mono text-xs leading-[22px] ${DIFF_ROW[r.kind]}`}>
              <span className="pr-2 text-right text-faint select-none">{r.oldNo ?? ''}</span>
              <span className="pr-2 text-right text-faint select-none">{r.kind === 'del' ? '' : (r.newNo ?? '')}</span>
              <em className="text-center text-dim not-italic">{r.kind === 'add' ? '+' : r.kind === 'del' ? '−' : ''}</em>
              <code className="pr-4 whitespace-pre text-[#b6b9bf]">{r.text || ' '}</code>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/** 줄 번호가 붙은 코드 조각. hit 줄은 빨갛게 */
export function CodeView({ code, firstLine, hit }: { code: string; firstLine: number; hit?: [number, number] }) {
  const lines = code.replace(/\n$/, '').split('\n')
  return (
    <div className="overflow-x-auto rounded-[10px] border border-line bg-code">
      <div className="w-max min-w-full py-1.5">
        {lines.map((text, i) => {
          const n = firstLine + i
          const bad = hit && n >= hit[0] && n <= hit[1]
          return (
            <div
              key={i}
              className={`relative grid grid-cols-[48px_minmax(0,1fr)] font-mono text-xs leading-[22px] ${bad ? 'bg-danger/9 before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-danger' : ''}`}
            >
              <span className="pr-3 text-right text-faint select-none">{n}</span>
              <code className="pr-4 whitespace-pre text-[#c9ccd1]">{text || ' '}</code>
            </div>
          )
        })}
      </div>
    </div>
  )
}

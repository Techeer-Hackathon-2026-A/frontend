import { Character } from './Character'

export function Loading({ label = '불러오는 중…' }: { label?: string }) {
  return (
    <div className="grid justify-items-center gap-3 py-16 text-[13px] text-dim">
      <Character pose="sniff" className="h-[48px] w-[52px] animate-bob" />
      {label}
    </div>
  )
}

export function ErrorMessage({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다'
  return (
    <p className="flex items-center gap-3 rounded-xl border border-line bg-panel px-4 py-3 text-[13px] text-muted">
      <i className="size-1.5 flex-none rounded-full bg-danger" />
      {message}
    </p>
  )
}

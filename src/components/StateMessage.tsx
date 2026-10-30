export function Loading({ label = '불러오는 중…' }: { label?: string }) {
  return <p className="py-10 text-center text-[13px] text-faint">{label}</p>
}

export function ErrorMessage({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다'
  return (
    <p className="flex items-center gap-3 rounded-[10px] border border-line bg-panel px-4 py-3 text-[13px] text-muted">
      <i className="size-1.5 flex-none rounded-full bg-danger" />
      {message}
    </p>
  )
}

export function Loading({ label = '불러오는 중…' }: { label?: string }) {
  return <p className="py-10 text-center text-sm text-slate-500">{label}</p>
}

export function ErrorMessage({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다'
  return <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{message}</p>
}

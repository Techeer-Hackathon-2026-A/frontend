// [프론트 A] 레포 링크 입력
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCreateScan } from '@/hooks/queries'

const GITHUB_URL = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/

export function HomePage() {
  const navigate = useNavigate()
  const createScan = useCreateScan()
  const [repoUrl, setRepoUrl] = useState('')
  const [branch, setBranch] = useState('')
  const [error, setError] = useState<string | null>(null)

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const url = repoUrl.trim().replace(/\.git$/, '')
    if (!GITHUB_URL.test(url)) {
      setError('https://github.com/owner/repo 형식으로 입력하세요')
      return
    }
    setError(null)
    createScan.mutate(
      { repo_url: url, branch: branch.trim() || null },
      { onSuccess: (scan) => navigate(`/scans/${scan.id}`) },
    )
  }

  return (
    <section className="mx-auto max-w-2xl pt-16">
      <h1 className="text-3xl font-bold tracking-tight">GitHub 레포 보안 분석</h1>
      <p className="mt-3 text-slate-600">
        레포 링크를 넣으면 코드 취약점, 라이브러리 취약점, 시크릿 유출을 찾고 수정 코드까지 만들어 드립니다.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-3">
        <input
          value={repoUrl}
          onChange={(e) => {
            setRepoUrl(e.target.value)
            setError(null)
          }}
          placeholder="https://github.com/owner/repo"
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-slate-900"
        />
        <div className="flex gap-3">
          <input
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            placeholder="브랜치 (비우면 기본 브랜치)"
            className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-slate-900"
          />
          <button
            type="submit"
            disabled={createScan.isPending}
            className="rounded-lg bg-slate-900 px-6 py-3 font-medium text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {createScan.isPending ? '요청 중…' : '분석 시작'}
          </button>
        </div>
        {(error || createScan.error) && (
          <p className="text-sm text-red-600">{error ?? createScan.error?.message}</p>
        )}
      </form>
    </section>
  )
}

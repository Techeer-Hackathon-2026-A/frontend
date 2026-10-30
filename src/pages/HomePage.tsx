// [프론트 A] 레포 링크 입력
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Character } from '@/components/Character'
import { ScanStatusLabel } from '@/components/ScanStatusLabel'
import { useCreateScan, useScans } from '@/hooks/queries'

const GITHUB_URL = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/

const input =
  'h-10 rounded-full border border-line bg-panel px-4 text-[14px] outline-none placeholder:text-faint focus:border-white/20'

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
    <div className="flex flex-col gap-14">
      <section className="flex flex-col items-center gap-5 pt-12 text-center">
        <Character className="h-[88px] w-[92px]" />
        <h1 className="text-[28px] font-medium tracking-tight">Patchi</h1>
        <p className="-mt-2 max-w-[380px] text-[14px] text-muted">
          GitHub 레포 링크를 넣으면 코드·라이브러리 취약점과 시크릿 유출을 찾고, 고쳐서 PR 까지 올려요.
        </p>

        <form onSubmit={onSubmit} className="mt-2 flex w-full max-w-[520px] flex-col gap-2">
          <input
            value={repoUrl}
            onChange={(e) => {
              setRepoUrl(e.target.value)
              setError(null)
            }}
            placeholder="https://github.com/owner/repo"
            className={input}
          />
          <div className="flex gap-2">
            <input
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder="브랜치 (비우면 기본 브랜치)"
              className={`${input} min-w-0 flex-1`}
            />
            <button
              type="submit"
              disabled={createScan.isPending}
              className="h-10 rounded-full bg-fg px-5 text-[14px] font-medium text-bg transition-transform hover:-translate-y-px disabled:opacity-50"
            >
              {createScan.isPending ? '요청 중…' : '분석 시작'}
            </button>
          </div>
          {(error || createScan.error) && (
            <p className="text-[13px] text-danger">{error ?? createScan.error?.message}</p>
          )}
        </form>
      </section>

      <RecentScans />
    </div>
  )
}

/** 최근 스캔. 백엔드가 없거나 기록이 없으면 통째로 숨긴다 */
function RecentScans() {
  const scans = useScans()
  if (!scans.data?.length) return null
  const recent = [...scans.data].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5)

  return (
    <section>
      <h2 className="mb-3 text-[13px] font-medium">최근 스캔</h2>
      <ul className="divide-y divide-line rounded-[10px] border border-line">
        {recent.map((s) => (
          <li key={s.id}>
            <Link to={`/scans/${s.id}`} className="flex items-center gap-4 px-4 py-3 hover:bg-panel">
              <span className="text-[13.5px]">스캔 #{s.id}</span>
              <span className="flex-1 truncate font-mono text-xs text-faint">{s.branch ?? ''}</span>
              <ScanStatusLabel status={s.status} />
              {s.grade && <span className="w-6 text-right text-[13px] font-medium">{s.grade}</span>}
              <span className="w-24 text-right text-[12.5px] text-faint max-[560px]:hidden">
                {new Date(s.created_at).toLocaleDateString('ko')}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

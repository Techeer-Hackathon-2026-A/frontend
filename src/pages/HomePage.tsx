// [프론트 A] 레포 링크 입력
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Character } from '@/components/Character'
import { Icon } from '@/components/Icon'
import { ScanStatusLabel } from '@/components/ScanStatusLabel'
import { btn, btnPrimary, SectionHead } from '@/components/ui'
import { useCreateScan, useScans } from '@/hooks/queries'
import { timeAgo } from '@/lib/labels'
import { getScanRepo, rememberScanRepo } from '@/lib/scanRepos'
import type { Scan } from '@/types/api'

const GITHUB_URL = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/

const field =
  'flex h-10 items-center gap-2 rounded-full border border-line bg-panel px-4 text-dim focus-within:border-line-2'
const input = 'min-w-0 flex-1 bg-transparent text-[14px] text-fg outline-none placeholder:text-dim'

export function HomePage() {
  const navigate = useNavigate()
  const createScan = useCreateScan()
  const [repoUrl, setRepoUrl] = useState('')
  const [branch, setBranch] = useState('')
  const [error, setError] = useState<string | null>(null)

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const url = repoUrl.trim().replace(/\.git$/, '').replace(/\/$/, '')
    if (!GITHUB_URL.test(url)) {
      setError('https://github.com/owner/repo 형식으로 입력하세요')
      return
    }
    setError(null)
    createScan.mutate(
      { repo_url: url, branch: branch.trim() || null },
      {
        onSuccess: (scan) => {
          rememberScanRepo(scan.id, url)
          navigate(`/scans/${scan.id}`)
        },
      },
    )
  }

  return (
    <div className="flex flex-col gap-14">
      <section className="flex animate-rise flex-col items-center gap-5 pt-12 text-center">
        <Character className="h-[88px] w-[92px]" />
        <h1 className="text-[28px] font-medium tracking-tight">Patchi</h1>
        <p className="-mt-2 max-w-[380px] text-[14px] text-muted">
          GitHub 레포의 취약점을 찾고, 고쳐서 PR 까지 올려요.
        </p>

        <form onSubmit={onSubmit} className="mt-2 flex w-full max-w-[520px] flex-col gap-2">
          <label className={field}>
            <Icon name="scan" />
            <input
              value={repoUrl}
              onChange={(e) => {
                setRepoUrl(e.target.value)
                setError(null)
              }}
              placeholder="https://github.com/owner/repo"
              className={input}
              autoFocus
            />
          </label>
          <div className="flex gap-2">
            <label className={`${field} min-w-0 flex-1`}>
              <Icon name="branch" />
              <input
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="브랜치 (비우면 기본 브랜치)"
                className={input}
              />
            </label>
            <button type="submit" disabled={createScan.isPending} className={`${btn} ${btnPrimary} h-10 px-5 text-[14px]`}>
              {createScan.isPending ? '요청 중…' : '스캔 시작'}
            </button>
          </div>
          {(error || createScan.error) && (
            <p className="text-[13px] text-danger">{error ?? createScan.error?.message}</p>
          )}
        </form>
        <a href="/demo.html" className="text-[13px] text-muted hover:text-fg">
          연출 데모 보기 →
        </a>
      </section>

      <RecentScans />
    </div>
  )
}

/** 최근 스캔. 백엔드가 없거나 기록이 없으면 통째로 숨긴다 */
function RecentScans() {
  const scans = useScans()
  if (!scans.data?.length) return null
  const recent = [...scans.data].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 8)

  return (
    <section className="animate-rise [animation-delay:.08s]">
      <SectionHead title="최근 스캔" count={scans.data.length} />
      <div className="overflow-hidden rounded-xl border border-line">
        {recent.map((s) => (
          <ScanRow key={s.id} scan={s} />
        ))}
      </div>
    </section>
  )
}

function ScanRow({ scan }: { scan: Scan }) {
  const repo = getScanRepo(scan.id)
  const [owner, name] = repo ? repo.name.split('/') : [null, `스캔 #${scan.id}`]
  const done = scan.status === 'completed'
  // 끝난 스캔은 보고서로, 진행 중이면 스캔 화면으로
  const to = done ? `/scans/${scan.id}/report` : `/scans/${scan.id}`
  const tone =
    scan.status === 'failed' ? 'bg-danger/9 text-danger' : done ? 'bg-ok/9 text-ok' : 'bg-panel-2 text-muted'

  return (
    <Link to={to} className="flex items-center gap-3.5 border-t border-line px-4 py-3 transition-colors first:border-t-0 hover:bg-panel">
      <span className={`grid size-[30px] flex-none place-items-center rounded-lg ${tone}`}>
        <Icon name={scan.status === 'failed' ? 'bug' : 'shield'} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13.5px] font-medium">
          {owner && <span className="font-normal text-muted">{owner} / </span>}
          {name}
        </div>
        <div className="mt-px flex gap-2 text-[12.5px] text-dim">
          <span className="font-mono text-xs">{scan.branch ?? scan.commit_sha?.slice(0, 7) ?? '기본 브랜치'}</span>
          <span>· #{scan.id}</span>
        </div>
      </div>
      <ScanStatusLabel status={scan.status} />
      {scan.grade && <span className="w-6 text-right text-[13px] font-medium">{scan.grade}</span>}
      <span className="w-20 text-right text-[12.5px] text-dim max-[560px]:hidden">{timeAgo(scan.created_at)}</span>
      {!done && scan.status !== 'failed' && (
        <span className="text-dim">
          <Icon name="play" />
        </span>
      )}
    </Link>
  )
}

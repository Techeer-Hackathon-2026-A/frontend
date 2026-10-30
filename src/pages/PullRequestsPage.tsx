// [프론트 B] PR 목록 조회 — 프로토타입 레포 상세의 PR 탭과 같은 행
import { Link, useParams } from 'react-router-dom'
import { Character } from '@/components/Character'
import { Icon } from '@/components/Icon'
import { ErrorMessage, Loading } from '@/components/StateMessage'
import { btn, btnOk, btnSm, Chip, Empty, SectionHead, Spin } from '@/components/ui'
import { usePullRequests } from '@/hooks/queries'
import { timeAgo } from '@/lib/labels'
import { scanTitle } from '@/lib/scanRepos'

export function PullRequestsPage() {
  const scanId = Number(useParams().scanId)
  const prs = usePullRequests(scanId)

  return (
    <div className="flex animate-rise flex-col gap-6">
      <div>
        <h1 className="text-2xl font-medium tracking-[-0.02em]">수정 PR</h1>
        <p className="mt-1 text-[13.5px] text-muted">{scanTitle(scanId)} 스캔에서 연 PR 이에요</p>
      </div>

      {prs.isLoading && <Loading />}
      {prs.error && <ErrorMessage error={prs.error} />}

      {prs.data && (
        <section>
          <SectionHead title="PR" count={prs.data.length} />
          <div className="overflow-hidden rounded-xl border border-line">
            {prs.data.length === 0 && (
              <Empty>
                <Character className="h-12 w-[52px]" />
                아직 PR 이 없어요
                <Link to={`/scans/${scanId}`} className={`${btn} ${btnSm} mt-1`}>
                  스캔 화면에서 고치기
                </Link>
              </Empty>
            )}
            {prs.data.map((pr) => (
              <div key={pr.id} className="flex items-center gap-3.5 border-t border-line px-4 py-3 first:border-t-0">
                <span
                  className={`grid size-[30px] flex-none place-items-center rounded-lg ${pr.status === 'failed' ? 'bg-danger/9 text-danger' : 'bg-ok/9 text-ok'}`}
                >
                  <Icon name="pr" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-medium">
                    {pr.pr_number ? `#${pr.pr_number} ` : ''}
                    <span className="font-mono text-[12.5px] font-normal text-muted">{pr.branch_name}</span>
                  </div>
                  <div className="mt-px text-[12.5px] text-dim">{timeAgo(pr.created_at)}</div>
                </div>
                {pr.status === 'pending' && (
                  <Chip tone="gray">
                    <Spin className="size-2.5" />
                    만드는 중
                  </Chip>
                )}
                {pr.status === 'created' && <Chip tone="green">열림</Chip>}
                {pr.status === 'failed' && <Chip tone="red">실패</Chip>}
                {pr.pr_url && (
                  <a href={pr.pr_url} target="_blank" rel="noreferrer" className={`${btn} ${btnSm} ${btnOk}`}>
                    GitHub
                    <Icon name="ext" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

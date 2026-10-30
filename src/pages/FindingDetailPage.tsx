// [프론트 B] 취약점 상세 조회 + AI 수정안 + PR 생성 — 프로토타입 보고서의 상세 카드 하나를 크게
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { FindingCard } from '@/components/FindingCard'
import { Icon } from '@/components/Icon'
import { ErrorMessage, Loading } from '@/components/StateMessage'
import { btn, btnPrimary, btnSm, Chip, Spin } from '@/components/ui'
import { useCreatePullRequest, useFinding, useFixes, useRequestFix } from '@/hooks/queries'

export function FindingDetailPage() {
  const findingId = Number(useParams().findingId)
  const finding = useFinding(findingId)
  // 수정안을 요청한 뒤에는 새 수정안이 나올 때까지 폴링한다. 요청할 때의 개수보다 늘어나면 다 만들어진 것
  const [waitingFrom, setWaitingFrom] = useState<number | null>(null)
  const fixes = useFixes(findingId, waitingFrom !== null)
  const requestFix = useRequestFix(findingId)
  const createPr = useCreatePullRequest(finding.data?.scan_id ?? 0)
  const [picked, setPicked] = useState<number | null>(null)

  if (finding.isLoading) return <Loading />
  if (finding.error || !finding.data) return <ErrorMessage error={finding.error} />
  const f = finding.data
  const list = fixes.data ?? []
  if (waitingFrom !== null && list.length > waitingFrom) setWaitingFrom(null)
  const fix = list.find((x) => x.id === picked) ?? list[0]
  const waiting = waitingFrom !== null || requestFix.isPending

  return (
    <div className="flex max-w-[760px] animate-rise flex-col gap-5">
      <Link to={`/scans/${f.scan_id}/report`} className="text-muted hover:text-fg">
        ← 보고서로
      </Link>

      <FindingCard
        finding={f}
        fix={fix}
        actions={
          <>
            <button
              onClick={() => requestFix.mutate(undefined, { onSuccess: () => setWaitingFrom(list.length) })}
              disabled={waiting}
              className={`${btn} ${btnSm}`}
            >
              {waiting ? <Spin /> : <Icon name="shield" />}
              {waiting ? '수정안 만드는 중…' : list.length ? '수정안 다시 만들기' : '수정안 만들기'}
            </button>
            {fix && (
              <button
                onClick={() => createPr.mutate([fix.id])}
                disabled={createPr.isPending || createPr.isSuccess}
                className={`${btn} ${btnSm} ${btnPrimary}`}
              >
                <Icon name="pr" />
                {createPr.isPending ? '요청 중…' : '이 수정안으로 PR 만들기'}
              </button>
            )}
            {createPr.isSuccess && (
              <Link to={`/scans/${f.scan_id}/pull-requests`} className="text-[12.5px] text-ok hover:underline">
                PR 생성을 요청했어요 · PR 목록 보기 →
              </Link>
            )}
            {(requestFix.error || createPr.error) && (
              <span className="text-[12.5px] text-danger">{(requestFix.error ?? createPr.error)?.message}</span>
            )}
          </>
        }
      />

      {list.length > 1 && (
        <section>
          <h2 className="mb-2.5 text-[13px] font-medium">
            수정안 기록 <span className="font-normal text-dim">{list.length}</span>
          </h2>
          <div className="overflow-hidden rounded-xl border border-line">
            {list.map((x) => (
              <button
                key={x.id}
                onClick={() => setPicked(x.id)}
                className={`flex w-full items-center gap-3 border-t border-line px-4 py-2.5 text-left first:border-t-0 hover:bg-panel ${x.id === fix?.id ? 'bg-panel' : ''}`}
              >
                <span className="font-mono text-xs text-dim">#{x.id}</span>
                <span className="min-w-0 flex-1 truncate text-muted">{x.explanation}</span>
                {x.verified ? <Chip tone="green">검증 통과</Chip> : <Chip tone="gray">미검증</Chip>}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

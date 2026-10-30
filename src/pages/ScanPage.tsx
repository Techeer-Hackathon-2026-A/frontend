// [프론트 A] 분석 진행 상태 실시간 표시
// 원본 연출 프로토타입(public/demo.html)에서 만든 public/scan.html 을 화면 전체에 띄우고,
// lib/scanFeed.ts 가 백엔드 API 를 폴링해 만든 이벤트를 넣어 준다. 같은 출처라 iframe 안 함수를 바로 부른다.
import { useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { ScanFeed } from '@/lib/scanFeed'
import type { ScanFrameWindow } from '@/lib/scanEvents'
import { getScanRepo } from '@/lib/scanRepos'

export function ScanPage() {
  const scanId = Number(useParams().scanId)
  const frame = useRef<HTMLIFrameElement>(null)
  const src = `/scan.html?${new URLSearchParams({
    repo: getScanRepo(scanId)?.name ?? `스캔 #${scanId}`,
    back: '/',
    report: `/scans/${scanId}/report`,
  })}`

  useEffect(() => {
    const el = frame.current
    if (!el) return
    const abort = new AbortController()
    const attach = () => {
      const win = el.contentWindow as ScanFrameWindow | null
      if (!win?.patchiScan || abort.signal.aborted) return
      const feed = new ScanFeed(scanId, (e) => win.patchiScan?.push(e), abort.signal)
      win.addEventListener('patchi:fix', () => void feed.fixAll(), { signal: abort.signal })
      void feed.start()
    }
    el.addEventListener('load', attach, { signal: abort.signal })
    // 이미 다 불러온 뒤에 붙었으면 바로 시작한다
    if (el.contentDocument?.readyState === 'complete') attach()
    return () => abort.abort()
  }, [scanId])

  return <iframe ref={frame} src={src} title="스캔" className="block h-screen w-full border-0 bg-bg" />
}

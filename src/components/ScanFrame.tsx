"use client";

import { useEffect, useRef } from "react";
import { ScanFeed } from "@/lib/feed/scanFeed";
import type { ScanFrameWindow } from "@/lib/feed/scanEvents";

// 스캔 화면은 연출 프로토타입(demo/index.html)을 이벤트로 돌게 바꾼 public/scan.html 이다.
// live 가 있으면 lib/feed/scanFeed.ts 가 팀 백엔드 REST API 를 폴링해 만든 이벤트를 프레임에 넣어 준다.
// 없으면(둘러보기) 프레임이 query 의 feed=demo 로 녹화된 이벤트를 스스로 재생한다.
export default function ScanFrame({
  query,
  title,
  live,
}: {
  query: Record<string, string>;
  title: string;
  live?: { scanId: number; repo: string };
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const scanId = live?.scanId;
  const repo = live?.repo ?? "";

  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const abort = new AbortController();
    const attach = () => {
      // Space·F 단축키가 바로 먹도록 열리자마자 프레임에 포커스를 준다
      el.contentWindow?.focus();
      const win = el.contentWindow as ScanFrameWindow | null;
      if (scanId === undefined || !win?.patchiScan || abort.signal.aborted) return;
      const feed = new ScanFeed(scanId, repo, (e) => win.patchiScan?.push(e), abort.signal);
      win.addEventListener("patchi:fix", () => void feed.fixAll(), { signal: abort.signal });
      void feed.start();
    };
    el.addEventListener("load", attach, { signal: abort.signal });
    // 하이드레이션 전에 이미 로드됐으면 load 를 놓치므로 바로 붙인다
    if (el.contentDocument?.readyState === "complete") attach();
    return () => abort.abort();
  }, [scanId, repo]);

  return (
    <iframe
      ref={frame}
      src={`/scan.html?${new URLSearchParams(live ? { ...query, feed: "manual" } : query)}`}
      title={title}
      // 모바일 Safari 툴바에 하단 요약·PR 버튼이 가리지 않게 dvh
      className="block h-dvh w-full border-0"
    />
  );
}

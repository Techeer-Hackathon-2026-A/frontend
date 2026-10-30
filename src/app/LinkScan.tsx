"use client";

import { useState } from "react";

// GitHub 레포 링크를 붙여 넣으면 바로 스캔을 시작하고 스캔 화면으로 간다 (/api/link-scan)
export default function LinkScan() {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/link-scan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) });
      if (!res.ok) throw new Error((await res.text()) || "스캔을 시작하지 못했어요");
      const { id, repo, branch } = (await res.json()) as { id: string; repo: string; branch: string };
      location.href = `/scans/${id}?${new URLSearchParams({ repo, branch })}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "스캔을 시작하지 못했어요");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-2 flex w-full max-w-[440px] flex-col items-center gap-2">
      <div className="flex h-11 w-full items-center gap-2 rounded-full border border-line bg-panel pl-4 pr-1.5 focus-within:border-white/15">
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="flex-none text-faint" aria-hidden>
          <path d="M6.5 9.5 9.5 6.5M7 4.5l1-1a2.5 2.5 0 0 1 3.5 3.5l-1 1M9 11.5l-1 1A2.5 2.5 0 0 1 4.5 9l1-1" strokeLinecap="round" />
        </svg>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="github.com/owner/repo"
          aria-label="GitHub 레포 링크"
          spellCheck={false}
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent text-[14px] text-fg outline-none placeholder:text-faint"
        />
        <button
          type="submit"
          disabled={!url.trim() || busy}
          className="flex h-8 flex-none items-center rounded-full bg-fg px-4 text-[13px] font-medium text-bg transition-transform hover:-translate-y-px disabled:opacity-45 disabled:hover:translate-y-0"
        >
          {busy ? "시작하는 중…" : "분석하기"}
        </button>
      </div>
      {error ? <p className="text-[13px] text-danger">{error}</p> : <p className="text-[12.5px] text-faint">공개 레포는 로그인 없이 바로 분석해요</p>}
    </form>
  );
}

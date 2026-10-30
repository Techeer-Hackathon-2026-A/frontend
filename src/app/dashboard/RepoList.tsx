"use client";

import Link from "next/link";
import { useState } from "react";
import ScanStatus from "@/components/dashboard/ScanStatus";
import { newScanHref, scanHref } from "@/lib/links";
import type { ScanSummary } from "@/lib/types";

export interface RepoRow {
  fullName: string;
  description: string | null;
  private: boolean;
  language: string | null;
  defaultBranch: string;
  /** 서버에서 미리 계산한 "3일 전" 같은 문구 (하이드레이션 차이 방지) */
  ago: string;
  lastScan?: ScanSummary;
}

/** preview 면 로그인 없이 둘러보기: 스캔 버튼이 녹화된 데모 스캔으로 이어진다 */
// 스캔 가능 여부(canScan)는 범위 설정 화면의 시작 버튼이 맡는다
export default function RepoList({ repos, preview }: { repos: RepoRow[]; canScan: boolean; preview?: boolean }) {
  const [query, setQuery] = useState("");
  const shown = repos.filter((r) => r.fullName.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <section>
      <div className="mb-3 flex items-center gap-3">
        <h2 className="text-[13px] font-medium">레포</h2>
        <span className="text-[12.5px] text-faint">{repos.length}</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="검색"
          className="ml-auto h-8 w-56 rounded-md border border-line bg-panel px-3 text-[13px] outline-none placeholder:text-faint focus:border-white/20 max-[560px]:w-40"
        />
      </div>

      <ul className="divide-y divide-line rounded-[10px] border border-line">
        {shown.length === 0 && (
          <li className="px-4 py-6 text-center text-[13px] text-faint">{repos.length ? "일치하는 레포가 없어요" : "레포가 없어요"}</li>
        )}
        {shown.map((r) => {
          const [owner, name] = r.fullName.split("/");
          const scan = r.lastScan;
          return (
            <li key={r.fullName} className="flex items-center gap-4 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-[13.5px]">
                  <span className="truncate">
                    <span className="text-muted">{owner} / </span>
                    {name}
                  </span>
                  {r.private && <span className="rounded border border-line px-1 text-[11px] text-muted">Private</span>}
                </div>
                <div className="mt-0.5 flex gap-2 text-[12.5px] text-faint">
                  {r.language && <span>{r.language}</span>}
                  <span>{r.ago}</span>
                  {r.description && <span className="truncate text-muted max-[560px]:hidden">{r.description}</span>}
                </div>
              </div>
              {scan && (
                <Link href={scanHref(scan, preview)} className="hover:underline">
                  <ScanStatus scan={scan} />
                </Link>
              )}
              {/* 스캔 전에 브랜치·파일 범위를 고른다 (새 스캔 ②) */}
              <Link
                href={newScanHref(r.fullName, r.defaultBranch, preview)}
                className="flex h-7 items-center rounded-full border border-line px-3 text-[12.5px] font-medium hover:bg-panel-2"
              >
                스캔
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

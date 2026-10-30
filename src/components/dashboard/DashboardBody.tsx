import type { ReactNode } from "react";
import Link from "next/link";
import RepoList, { type RepoRow } from "@/app/dashboard/RepoList";
import ScanStatus from "@/components/dashboard/ScanStatus";
import { scanHref } from "@/lib/links";
import type { ScanSummary } from "@/lib/types";

// 대시보드 본문. 로그인한 대시보드와 로그인 없이 둘러보기(preview)가 같은 화면을 쓴다
export default function DashboardBody({
  scans,
  recent,
  rows,
  canScan,
  preview,
  notice,
}: {
  scans: ScanSummary[];
  recent: (ScanSummary & { ago: string })[];
  rows: RepoRow[];
  canScan: boolean;
  preview?: boolean;
  /** 맨 위 안내 띠 */
  notice?: ReactNode;
}) {
  const stats = [
    { label: "스캔", value: scans.length },
    { label: "발견", value: scans.reduce((n, s) => n + (s.findings ?? 0), 0) },
    { label: "수정", value: scans.reduce((n, s) => n + (s.fixed ?? 0), 0) },
    { label: "PR", value: scans.filter((s) => s.pr).length },
  ];

  return (
    <main className="mx-auto flex max-w-[880px] flex-col gap-10 px-6 py-10">
      {notice}

      {scans.length > 0 && (
        <section className="grid grid-cols-4 gap-px overflow-hidden rounded-[10px] border border-line bg-line max-[560px]:grid-cols-2">
          {stats.map((s) => (
            <div key={s.label} className="bg-bg px-4 py-4">
              <div className="text-[28px] leading-none font-medium tracking-tight">{s.value}</div>
              <div className="mt-1.5 text-[12.5px] text-muted">{s.label}</div>
            </div>
          ))}
        </section>
      )}

      {scans.length > 0 && (
        <section>
          <h2 className="mb-3 text-[13px] font-medium">최근 스캔</h2>
          <ul className="divide-y divide-line rounded-[10px] border border-line">
            {recent.map((s) => (
              <li key={s.id}>
                <Link href={scanHref(s, preview)} className="flex items-center gap-4 px-4 py-3 hover:bg-panel">
                  <span className="min-w-0 flex-1 truncate text-[13.5px]">{s.repo}</span>
                  <span className="font-mono text-xs text-faint max-[560px]:hidden">{s.branch}</span>
                  <ScanStatus scan={s} />
                  {s.pr && <span className="text-[12.5px] text-ok">PR #{s.pr.number}</span>}
                  <span className="w-20 text-right text-[12.5px] text-faint max-[560px]:hidden">{s.ago}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <RepoList repos={rows} canScan={canScan} preview={preview} />
    </main>
  );
}

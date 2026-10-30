import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import Logo from "@/components/Logo";
import DashboardBody from "@/components/dashboard/DashboardBody";
import { BACKEND_URL, listScans } from "@/lib/backend";
import { GitHubAuthError, listRepos } from "@/lib/github";
import { getProjects, getToken, getUser, type User } from "@/lib/session";
import type { ScanSummary } from "@/lib/types";
import type { RepoRow } from "./RepoList";

export const metadata: Metadata = { title: "대시보드 · Patchi" };

export default function DashboardPage() {
  return (
    <div className="h-screen overflow-auto">
      <Suspense fallback={<Header />}>
        <Dashboard />
      </Suspense>
    </div>
  );
}

function Header({ user }: { user?: User }) {
  return (
    <header className="sticky top-0 z-10 flex h-[52px] items-center gap-3 border-b border-line bg-bg/90 px-4 backdrop-blur">
      <Logo />
      <span className="text-[13px] font-medium">Patchi</span>
      <span className="flex-1" />
      {user ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- GitHub 아바타는 이미지 최적화가 필요 없다 */}
          <img src={user.avatarUrl} alt="" className="size-6 rounded-full" />
          <span className="text-[13px] text-muted">{user.login}</span>
          <form action="/api/auth/logout" method="post">
            <button className="text-[13px] text-faint hover:text-fg">로그아웃</button>
          </form>
        </>
      ) : (
        <span className="text-[13px] text-faint">불러오는 중…</span>
      )}
    </header>
  );
}

const rtf = new Intl.RelativeTimeFormat("ko", { numeric: "auto" });

function ago(iso: string, now: number) {
  const sec = (new Date(iso).getTime() - now) / 1000;
  for (const [unit, size] of [
    ["year", 31536000],
    ["month", 2592000],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ] as const) {
    if (Math.abs(sec) >= size) return rtf.format(Math.round(sec / size), unit);
  }
  return "방금";
}

/** 레포·스캔을 불러와 화면에 쓸 모양으로. 상대 시간은 서버에서 한 번만 계산한다 */
async function loadDashboard(token: string) {
  let repos;
  try {
    repos = await listRepos(token);
  } catch (e) {
    if (e instanceof GitHubAuthError) redirect("/api/auth/logout");
    throw e;
  }
  const scans = (await listScans(await getProjects())).toSorted((a, b) => b.createdAt.localeCompare(a.createdAt));
  const now = Date.now();

  const latest = new Map<string, ScanSummary>();
  for (const s of scans) if (!latest.has(s.repo)) latest.set(s.repo, s);

  return {
    scans,
    recent: scans.slice(0, 5).map((s) => ({ ...s, ago: ago(s.createdAt, now) })),
    rows: repos.map((r): RepoRow => ({ ...r, ago: ago(r.pushedAt, now), lastScan: latest.get(r.fullName) })),
  };
}

async function Dashboard() {
  const [token, user] = await Promise.all([getToken(), getUser()]);
  if (!token || !user) redirect("/api/auth/logout");
  const { scans, recent, rows } = await loadDashboard(token);

  return (
    <>
      <Header user={user} />
      <DashboardBody
        scans={scans}
        recent={recent}
        rows={rows}
        canScan={Boolean(BACKEND_URL)}
        notice={
          !BACKEND_URL && (
            <div className="flex items-center gap-3 rounded-[10px] border border-line bg-panel px-4 py-3 text-[13px] text-muted">
              <i className="size-1.5 rounded-full bg-warn" />
              스캔 서버가 아직 연결되지 않았어요. 레포는 볼 수 있지만 스캔은 시작할 수 없어요.
              <a href="/demo" className="ml-auto text-fg hover:underline">
                데모 보기
              </a>
            </div>
          )
        }
      />
    </>
  );
}

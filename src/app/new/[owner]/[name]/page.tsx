import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import ScopeHeader from "@/components/scope/ScopeHeader";
import ScopePicker from "@/components/scope/ScopePicker";
import { BACKEND_URL } from "@/lib/backend";
import { GitHubAuthError, GitHubNotFoundError, getRepoScope } from "@/lib/github";
import { buildTree } from "@/lib/scope";
import { getToken } from "@/lib/session";

export const metadata: Metadata = { title: "새 스캔 · Patchi" };

// 새 스캔 ② 범위 설정. 대시보드에서 레포의 스캔을 누르면 여기로 온다
export default function NewScanPage({ params, searchParams }: PageProps<"/new/[owner]/[name]">) {
  return (
    <div className="h-screen overflow-auto">
      <Suspense fallback={<p className="p-8 text-[13px] text-faint">레포를 불러오는 중…</p>}>
        <NewScan params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function NewScan({ params, searchParams }: PageProps<"/new/[owner]/[name]">) {
  const [{ owner, name }, { branch }] = await Promise.all([params, searchParams]);
  const repo = `${owner}/${name}`;
  const token = await getToken();
  if (!token) redirect("/api/auth/logout");

  let scope;
  try {
    scope = await getRepoScope(token, repo, typeof branch === "string" ? branch : undefined);
  } catch (e) {
    if (e instanceof GitHubAuthError) redirect("/api/auth/logout");
    if (!(e instanceof GitHubNotFoundError)) throw e;
    return (
      <>
        <ScopeHeader repo={repo} back="/dashboard" />
        <div className="grid place-items-center gap-3 py-24 text-[13px] text-muted">
          레포나 브랜치를 찾을 수 없어요
          <Link href="/dashboard" className="text-fg hover:underline">
            ← 대시보드로
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <ScopeHeader repo={repo} back="/dashboard" />
      <ScopePicker
        key={scope.branch}
        repo={repo}
        branch={scope.branch}
        branches={scope.branches}
        tree={buildTree(scope.entries)}
        truncated={scope.truncated}
        canScan={Boolean(BACKEND_URL)}
      />
    </>
  );
}

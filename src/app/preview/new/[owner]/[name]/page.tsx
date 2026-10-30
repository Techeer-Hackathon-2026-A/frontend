import type { Metadata } from "next";
import { Suspense } from "react";
import ScopeHeader from "@/components/scope/ScopeHeader";
import ScopePicker from "@/components/scope/ScopePicker";
import { PREVIEW_BRANCHES, PREVIEW_TREE } from "@/lib/fixtures/preview";
import { buildTree } from "@/lib/scope";

export const metadata: Metadata = { title: "새 스캔 둘러보기 · Patchi" };

const TREE = buildTree(PREVIEW_TREE);

// 로그인 없이 둘러보기의 범위 설정. 어느 레포든 샘플 트리를 보여 주고, 고른 범위로 녹화 스캔을 재생한다
export default function PreviewNewScanPage({ params, searchParams }: PageProps<"/preview/new/[owner]/[name]">) {
  return (
    <div className="h-screen overflow-auto">
      <Suspense>
        <PreviewNewScan params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function PreviewNewScan({ params, searchParams }: PageProps<"/preview/new/[owner]/[name]">) {
  const [{ owner, name }, { branch }] = await Promise.all([params, searchParams]);
  const repo = `${owner}/${name}`;
  const b = PREVIEW_BRANCHES.some((x) => x.name === branch) ? String(branch) : PREVIEW_BRANCHES[0].name;
  return (
    <>
      <ScopeHeader repo={repo} back="/preview" preview />
      <ScopePicker key={b} repo={repo} branch={b} branches={PREVIEW_BRANCHES} tree={TREE} preview />
    </>
  );
}

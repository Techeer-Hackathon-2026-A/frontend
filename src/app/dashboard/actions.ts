"use server";

import { redirect } from "next/navigation";
import { BackendError, createScan } from "@/lib/backend";
import { getToken, rememberProject } from "@/lib/session";

export async function startScan(_prev: string | undefined, form: FormData): Promise<string | undefined> {
  const token = await getToken();
  if (!token) redirect("/api/auth/logout");
  const repo = String(form.get("repo"));
  const branch = String(form.get("branch"));
  // 범위 설정에서 고른 파일·폴더(paths)·공격 검증(verify)은 백엔드가 아직 받지 않아 브랜치 전체를 스캔한다

  let id: string;
  try {
    const scan = await createScan({ repo, branch });
    id = scan.id;
    await rememberProject(scan.projectId, repo);
  } catch (e) {
    if (e instanceof BackendError && e.status < 500) return e.message;
    return e instanceof TypeError ? "스캔 서버에 연결할 수 없어요" : `${repo} 스캔을 시작하지 못했어요`;
  }
  redirect(`/scans/${encodeURIComponent(id)}?${new URLSearchParams({ repo, branch })}`);
}

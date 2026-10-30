import "server-only";
import type { ScanSummary } from "@/lib/types";

// 팀 백엔드(FastAPI, /api/v1) 서버 호출. 브라우저 쪽 호출은 next.config 의 /api/v1 rewrite 로 같은 백엔드에 간다.
// 백엔드 스키마는 src/lib/api/types.ts (백엔드 app/schemas/api.py 와 1:1).

export const BACKEND_URL = (process.env.BACKEND_URL || "http://localhost:8000").replace(/\/$/, "");

export class BackendError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function backendFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (process.env.BACKEND_API_KEY) headers.set("Authorization", `Bearer ${process.env.BACKEND_API_KEY}`);
  if (init.body) headers.set("Content-Type", "application/json");
  return fetch(`${BACKEND_URL}/api/v1${path}`, { ...init, headers, cache: "no-store" });
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { detail?: unknown } | null;
    throw new BackendError(typeof body?.detail === "string" ? body.detail : `백엔드 ${res.status}`, res.status);
  }
  return res.json() as Promise<T>;
}

interface ScanOut {
  id: number;
  project_id: number;
  status: "pending" | "cloning" | "detecting" | "classifying" | "fixing" | "completed" | "failed";
  branch: string | null;
  commit_sha: string | null;
  summary: { total?: number } | null;
  created_at: string;
}

const STATUS: Record<ScanOut["status"], ScanSummary["status"]> = {
  pending: "queued",
  cloning: "scanning",
  detecting: "scanning",
  classifying: "scanning",
  fixing: "scanning",
  completed: "scanned",
  failed: "failed",
};

/**
 * 대시보드용 스캔 목록. 백엔드 ScanOut 에는 레포 이름이 없어서 projects(project_id → owner/name)로 채운다.
 * 백엔드가 없거나 실패하면 빈 목록 — 대시보드가 스캔 기록 없이도 열려야 해서다
 */
export async function listScans(projects: Record<string, string>): Promise<ScanSummary[]> {
  let scans: ScanOut[];
  try {
    scans = await json<ScanOut[]>(await backendFetch("/scans"));
  } catch {
    return [];
  }
  return scans.map((s) => ({
    id: String(s.id),
    repo: projects[s.project_id] ?? `스캔 #${s.id}`,
    branch: s.branch ?? s.commit_sha?.slice(0, 7) ?? "",
    status: STATUS[s.status],
    // 백엔드는 시간대 없이 UTC 를 줄 수 있다
    createdAt: /[zZ]$|[+-]\d\d:?\d\d$/.test(s.created_at) ? s.created_at : `${s.created_at}Z`,
    ...(s.status === "completed" && typeof s.summary?.total === "number" && { findings: s.summary.total }),
  }));
}

/** 레포 링크로 스캔을 요청한다. 백엔드는 브랜치 전체를 스캔한다 (범위 paths 는 아직 받지 않는다) */
export async function createScan(body: { repo: string; branch: string }) {
  const scan = await json<ScanOut>(
    await backendFetch("/scans", {
      method: "POST",
      body: JSON.stringify({ repo_url: `https://github.com/${body.repo}`, branch: body.branch || null }),
    }),
  );
  return { id: String(scan.id), projectId: scan.project_id };
}

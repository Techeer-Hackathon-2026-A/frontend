import "server-only";
import { getToken } from "@/lib/session";

// 팀 백엔드(FastAPI, /api/v1) 서버 호출. 브라우저 쪽 호출은 src/app/api/v1/[...path]/route.ts 가 이 함수로 전달한다.
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

/** 서비스 키와 로그인한 사용자의 GitHub 토큰을 붙인다. 백엔드는 이 토큰으로 레포 권한을 확인한다 (없으면 익명: 공개 레포만) */
export async function backendFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (process.env.BACKEND_API_KEY) headers.set("Authorization", `Bearer ${process.env.BACKEND_API_KEY}`);
  const token = await getToken();
  if (token) headers.set("X-GitHub-Token", token);
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

/** 백엔드 GET. 실패하면 BackendError */
export async function backendGet<T>(path: string): Promise<T> {
  return json<T>(await backendFetch(path));
}

export interface ScanOut {
  id: number;
  project_id: number;
  status: "pending" | "cloning" | "detecting" | "classifying" | "fixing" | "completed" | "failed";
  branch: string | null;
  commit_sha: string | null;
  summary: { total?: number } | null;
  error_message: string | null;
  created_at: string;
  finished_at: string | null;
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

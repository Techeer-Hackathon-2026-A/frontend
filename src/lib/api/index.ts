import type {
  Finding,
  FindingDetail,
  FindingFilters,
  Fix,
  PullRequest,
  Scan,
  ScanCreate,
  ScanProgress,
  SecurityReport,
  TaskAccepted,
} from "./types";
import { request, toQuery } from "./client";

// 스캔 (백엔드 A)
export const scansApi = {
  create: (body: ScanCreate) => request<Scan>("/scans", { method: "POST", body: JSON.stringify(body) }),
  list: () => request<Scan[]>("/scans"),
  get: (scanId: number) => request<Scan>(`/scans/${scanId}`),
  progress: (scanId: number) => request<ScanProgress>(`/scans/${scanId}/progress`),
};

// 리포트·취약점 (백엔드 C)
export const reportsApi = {
  report: (scanId: number) => request<SecurityReport>(`/scans/${scanId}/report`),
  findings: (scanId: number, filters: FindingFilters = {}) => request<Finding[]>(`/scans/${scanId}/findings${toQuery(filters)}`),
  finding: (findingId: number) => request<FindingDetail>(`/findings/${findingId}`),
};

// AI 수정 (백엔드 D)
export const fixesApi = {
  request: (findingId: number) => request<TaskAccepted>(`/findings/${findingId}/fixes`, { method: "POST" }),
  list: (findingId: number) => request<Fix[]>(`/findings/${findingId}/fixes`),
};

// PR (백엔드 A)
export const pullRequestsApi = {
  create: (scanId: number, fixIds: number[]) =>
    request<PullRequest>(`/scans/${scanId}/pull-requests`, {
      method: "POST",
      body: JSON.stringify({ fix_ids: fixIds }),
    }),
  list: (scanId: number) => request<PullRequest[]>(`/scans/${scanId}/pull-requests`),
};

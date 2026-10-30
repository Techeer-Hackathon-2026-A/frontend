// 스캔 화면 주소. 둘러보기(preview)에서는 녹화된 데모 스캔으로 간다
export function scanHref(scan: { id: string; repo: string; branch: string; paths?: string[] }, preview?: boolean) {
  const query = new URLSearchParams({ repo: scan.repo, branch: scan.branch });
  // 둘러보기는 백엔드가 없어서 고른 범위를 주소로 넘겨 녹화에서 걸러 낸다
  if (preview && scan.paths?.length) query.set("paths", JSON.stringify(scan.paths));
  return preview ? `/preview/scan?${query}` : `/scans/${encodeURIComponent(scan.id)}?${query}`;
}

/** 새 스캔 ② 범위 설정 */
export function newScanHref(repo: string, branch: string, preview?: boolean) {
  const query = new URLSearchParams({ branch });
  return `${preview ? "/preview" : ""}/new/${repo}?${query}`;
}

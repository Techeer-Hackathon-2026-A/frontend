// 백엔드 ScanOut 에는 레포 주소가 없어서, 스캔을 만들 때 넣은 주소를 브라우저에 기억해 둔다.
// 화면에 레포 이름을 보여 주고, 스캔 화면에서 GitHub 원본 파일을 불러올 때 쓴다.

const KEY = 'patchi:scan-repos'

export interface ScanRepo {
  /** https://github.com/owner/name */
  url: string
  /** owner/name */
  name: string
}

function readAll(): Record<string, ScanRepo> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, ScanRepo>
  } catch {
    return {}
  }
}

export function repoName(url: string): string {
  return url.replace(/^https:\/\/github\.com\//, '').replace(/\/$/, '')
}

export function rememberScanRepo(scanId: number, url: string) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...readAll(), [scanId]: { url, name: repoName(url) } }))
  } catch {
    // 저장이 막혀 있으면 레포 이름 없이 보여 준다
  }
}

export function getScanRepo(scanId: number): ScanRepo | null {
  return readAll()[scanId] ?? null
}

/** 화면에 보일 스캔 이름: 레포를 알면 owner/name, 모르면 스캔 번호 */
export function scanTitle(scanId: number): string {
  return getScanRepo(scanId)?.name ?? `스캔 #${scanId}`
}

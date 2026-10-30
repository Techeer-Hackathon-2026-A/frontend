import type { Category, ScanStatus, Severity } from '@/types/api'

export const SEVERITY_ORDER: Severity[] = ['critical', 'high', 'medium', 'low', 'info']

// 스캔 연출 화면(scan.html)과 같은 표기
export const SEVERITY_LABEL: Record<Severity, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  info: 'Info',
}

export const SEVERITY_DOT: Record<Severity, string> = {
  critical: 'bg-danger',
  high: 'bg-warn',
  medium: 'bg-muted',
  low: 'bg-faint',
  info: 'bg-faint',
}

export const CATEGORY_LABEL: Record<Category, string> = {
  sast: '코드 취약점',
  sca: '라이브러리 취약점',
  secret: '시크릿 유출',
}

export const STATUS_LABEL: Record<ScanStatus, string> = {
  pending: '대기 중',
  cloning: '레포 클론 중',
  detecting: '취약점 탐지 중',
  classifying: '분류·평가 중',
  fixing: '수정안 생성 중',
  completed: '완료',
  failed: '실패',
}

export const STATUS_DOT: Record<ScanStatus, string> = {
  pending: 'bg-faint',
  cloning: 'animate-pulse bg-ok',
  detecting: 'animate-pulse bg-ok',
  classifying: 'animate-pulse bg-ok',
  fixing: 'animate-pulse bg-ok',
  completed: 'bg-ok',
  failed: 'bg-danger',
}

export function timeAgo(iso: string): string {
  const sec = (Date.now() - new Date(iso).getTime()) / 1000
  if (sec < 60) return '방금'
  if (sec < 3600) return `${Math.floor(sec / 60)}분 전`
  if (sec < 86400) return `${Math.floor(sec / 3600)}시간 전`
  if (sec < 86400 * 7) return `${Math.floor(sec / 86400)}일 전`
  return new Date(iso).toLocaleDateString('ko')
}

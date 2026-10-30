import type { Category, ScanStatus, Severity } from '@/types/api'

export const SEVERITY_ORDER: Severity[] = ['critical', 'high', 'medium', 'low', 'info']

export const SEVERITY_LABEL: Record<Severity, string> = {
  critical: '치명',
  high: '높음',
  medium: '중간',
  low: '낮음',
  info: '정보',
}

export const SEVERITY_DOT: Record<Severity, string> = {
  critical: 'bg-danger',
  high: 'bg-danger/70',
  medium: 'bg-warn',
  low: 'bg-muted',
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

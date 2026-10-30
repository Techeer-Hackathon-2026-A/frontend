import type { Category, ScanStatus, Severity } from '@/types/api'

export const SEVERITY_ORDER: Severity[] = ['critical', 'high', 'medium', 'low', 'info']

export const SEVERITY_LABEL: Record<Severity, string> = {
  critical: '치명',
  high: '높음',
  medium: '중간',
  low: '낮음',
  info: '정보',
}

export const SEVERITY_STYLE: Record<Severity, string> = {
  critical: 'bg-red-100 text-red-800 ring-red-200',
  high: 'bg-orange-100 text-orange-800 ring-orange-200',
  medium: 'bg-amber-100 text-amber-800 ring-amber-200',
  low: 'bg-sky-100 text-sky-800 ring-sky-200',
  info: 'bg-slate-100 text-slate-700 ring-slate-200',
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

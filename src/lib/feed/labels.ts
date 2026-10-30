import type { Category, ScanStatus } from "@/lib/api/types";

export const CATEGORY_LABEL: Record<Category, string> = {
  sast: "코드 취약점",
  sca: "라이브러리 취약점",
  secret: "시크릿 유출",
};

export const STATUS_LABEL: Record<ScanStatus, string> = {
  pending: "대기 중",
  cloning: "레포 클론 중",
  detecting: "취약점 탐지 중",
  classifying: "분류·평가 중",
  fixing: "수정안 생성 중",
  completed: "완료",
  failed: "실패",
};

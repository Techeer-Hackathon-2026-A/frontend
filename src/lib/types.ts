// 백엔드와 공유하는 이벤트 계약. 줄 번호는 모두 원본 파일 기준 1부터.

export type Severity = "critical" | "high" | "medium";

export interface RepoFile {
  path: string;
  content: string;
}

export interface Finding {
  id: string;
  path: string;
  line: number;
  /** 캐릭터가 내려다볼 토큰 (해당 줄 안의 부분 문자열) */
  token: string;
  severity: Severity;
  title: string;
  description: string;
}

/** line 부터 del 줄을 지우고 그 자리에 add 를 넣는다. del 이 0이면 line 아래에 삽입. */
export interface Hunk {
  line: number;
  del?: number;
  add: string[];
}

/**
 * 검증 증거. 샌드박스 실공격이든 LLM 판단이든 백엔드가 가진 만큼 골라 보낸다.
 * 프론트는 kind 별로 그리기만 하므로 방식이 바뀌어도 계약은 그대로다.
 */
export type Evidence =
  /** 실제로 보낸 공격 요청과 응답 */
  | { kind: "http"; method: string; url: string; body?: string; status: number; response?: string }
  /** 터미널 출력 그대로 (익스플로잇 스크립트, 테스트 러너 등) */
  | { kind: "log"; lines: string[] }
  /** 실행 없이 판단한 근거. refs 는 근거가 된 코드 위치 */
  | { kind: "reasoning"; text: string; refs?: { path: string; line: number }[] };

export type ScanEvent =
  | { type: "scan.started"; repo: string; branch: string; files: RepoFile[] }
  | { type: "file.scanning"; path: string }
  | { type: "line.inspected"; path: string; line: number; token: string; verdict: "safe"; note?: string }
  | { type: "finding.detected"; finding: Finding }
  /** 고치기 전 공격. exploitable 이 false 면 오탐으로 걸러낸 것. finding.detected 이후 아무 때나 와도 된다 */
  | { type: "exploit.result"; findingId: string; exploitable: boolean; evidence?: Evidence[] }
  | { type: "file.done"; path: string }
  | { type: "scan.finished" }
  | { type: "fix.applied"; findingId: string; path: string; hunks: Hunk[] }
  /** 고친 뒤 같은 공격을 다시 보낸 결과 */
  | { type: "verify.result"; findingId: string; blocked: boolean; evidence?: Evidence[] }
  | { type: "pr.created"; number: number; url: string; title: string }
  /** 어느 단계에서든 더 진행할 수 없을 때 */
  | { type: "scan.failed"; message: string };

/** 대시보드 목록용 스캔 요약. 백엔드가 아는 만큼만 채우면 되고, 없는 필드는 화면에서 숨긴다 */
export interface ScanSummary {
  id: string;
  repo: string;
  branch: string;
  status: "queued" | "scanning" | "scanned" | "fixing" | "done" | "failed";
  createdAt: string;
  findings?: number;
  fixed?: number;
  pr?: { number: number; url: string };
}

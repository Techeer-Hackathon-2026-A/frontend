// 스캔 연출 화면(public/scan.html)이 받는 이벤트. 백엔드 계약이 아니라 프론트 안의 약속이다.
// 백엔드 API(lib/api/types.ts)를 폴링해 이 이벤트로 바꾸는 일은 lib/feed/scanFeed.ts 가 한다.
// 줄 번호는 모두 화면에 보여 주는 파일 내용 기준 1부터.

export type EventSeverity = "critical" | "high" | "medium" | "low" | "info";

export interface EventFile {
  path: string;
  content: string;
  /** 파일 일부만 보여 줄 때 각 줄의 원본 줄 번호. null 은 생략 표시(⋯) 줄 */
  nums?: (number | null)[];
}

/** line 부터 del 줄을 지우고 그 자리에 add 를 넣는다. del 이 0이면 line 아래에 삽입 */
export interface Hunk {
  line: number;
  del: number;
  add: string[];
}

export type ScanEvent =
  /** 백엔드가 아직 클론·탐지·분류 중. 인트로 화면에 상태만 보여 준다 */
  | { type: "scan.progress"; repo: string; branch: string; status: string; message: string }
  | { type: "scan.started"; repo: string; branch: string; files: EventFile[] }
  | { type: "file.scanning"; path: string }
  | {
      type: "finding.detected";
      finding: { id: string; path: string; line: number; token: string; severity: EventSeverity; title: string; description: string };
    }
  | { type: "file.done"; path: string }
  | { type: "scan.finished" }
  | { type: "fix.applied"; findingId: string; path: string; hunks: Hunk[] }
  /** 백엔드 검증(Fix.verified) 결과 */
  | { type: "verify.result"; findingId: string; blocked: boolean }
  | { type: "pr.created"; number: number | null; url: string; title: string }
  /** 수정안을 하나도 못 만들었거나 PR 을 열지 못해 고치기를 끝낸다 */
  | { type: "fix.ended"; message: string }
  | { type: "scan.failed"; message: string };

/** public/scan.html 이 window 에 열어 두는 입구 */
export interface ScanFrameWindow extends Window {
  patchiScan?: { push: (event: ScanEvent) => void };
}

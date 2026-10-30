import type { ScanSummary } from "@/lib/types";

const LABEL: Record<ScanSummary["status"], string> = {
  queued: "대기",
  scanning: "스캔 중",
  scanned: "검토 대기",
  fixing: "수정 중",
  done: "PR 생성됨",
  failed: "실패",
};

const DOT: Record<ScanSummary["status"], string> = {
  queued: "bg-faint",
  scanning: "animate-pulse bg-ok",
  scanned: "bg-warn",
  fixing: "animate-pulse bg-ok",
  done: "bg-ok",
  failed: "bg-danger",
};

/** 백엔드가 준 필드만 보여준다. findings 가 없으면 숫자를 빼고 상태만 */
export default function ScanStatus({ scan }: { scan: Pick<ScanSummary, "status" | "findings" | "fixed"> }) {
  const open = scan.findings !== undefined ? scan.findings - (scan.fixed ?? 0) : undefined;
  return (
    <span className="inline-flex items-center gap-1.5 text-[12.5px] whitespace-nowrap text-muted">
      <i className={`size-1.5 rounded-full ${DOT[scan.status]}`} />
      {LABEL[scan.status]}
      {scan.status === "scanned" && open !== undefined && (
        <span className={open > 0 ? "text-danger" : "text-ok"}>{open > 0 ? `· ${open}개 발견` : "· 문제 없음"}</span>
      )}
      {scan.status === "done" && scan.fixed !== undefined && <span>· {scan.fixed}개 수정</span>}
    </span>
  );
}

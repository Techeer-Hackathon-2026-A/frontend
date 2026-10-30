// 팀 백엔드 app/schemas/api.py 와 1:1로 맞춘 타입. 백엔드 스키마가 바뀌면 같이 수정한다.

export type ScanStatus = "pending" | "cloning" | "detecting" | "classifying" | "fixing" | "completed" | "failed";

export type Severity = "critical" | "high" | "medium" | "low" | "info";
export type Category = "sast" | "sca" | "secret";
export type FindingStatus = "open" | "fixed" | "ignored" | "false_positive";
export type Grade = "A" | "B" | "C" | "D" | "E";

export interface ScanCreate {
  repo_url: string;
  branch?: string | null;
}

export interface Scan {
  id: number;
  project_id: number;
  status: ScanStatus;
  branch: string | null;
  commit_sha: string | null;
  grade: Grade | null;
  summary: Record<string, unknown> | null;
  error_message: string | null;
  created_at: string;
  finished_at: string | null;
}

export interface ScanProgress {
  scan_id: number;
  status: ScanStatus;
  step: string | null;
  percent: number;
  message: string;
}

export interface Finding {
  id: number;
  scan_id: number;
  tool: string;
  category: Category;
  rule_id: string;
  title: string;
  severity: Severity;
  file_path: string;
  start_line: number;
  cwe: string[];
  owasp_top10: string | null;
  risk_score: number;
  priority: number;
  status: FindingStatus;
}

export interface DependencyInfo {
  package: string;
  ecosystem: string;
  installed_version: string;
  fixed_version: string | null;
  vuln_ids: string[];
}

export interface FindingDetail extends Finding {
  message: string;
  end_line: number | null;
  snippet: string | null;
  owasp: string[];
  dependency: DependencyInfo | null;
  merged_tools: string[];
}

export interface SecurityReport {
  scan_id: number;
  grade: Grade | null;
  total: number;
  by_severity: Partial<Record<Severity, number>>;
  by_category: Partial<Record<Category, number>>;
  owasp_matrix: Record<string, number>;
  top_findings: Finding[];
}

export interface Fix {
  id: number;
  finding_id: number;
  file_path: string;
  original_code: string;
  fixed_code: string;
  explanation: string;
  verified: boolean;
  created_at: string;
}

export interface PullRequest {
  id: number;
  scan_id: number;
  branch_name: string;
  pr_number: number | null;
  pr_url: string | null;
  status: "pending" | "created" | "failed";
  created_at: string;
}

export interface TaskAccepted {
  task_id: string;
  message: string;
}

export interface FindingFilters {
  severity?: Severity;
  category?: Category;
  owasp?: string;
}

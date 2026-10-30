// 브라우저에서 백엔드를 부르는 fetch 래퍼. 같은 출처의 /api/v1 을 next.config rewrite 가 백엔드(BACKEND_URL)로 전달한다.

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/v1${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body?.detail ?? `요청 실패 (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export function toQuery(params: object): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "");
  return entries.length ? `?${new URLSearchParams(entries as [string, string][])}` : "";
}

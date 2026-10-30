"use client";

import { useSearchParams } from "next/navigation";

const MESSAGES: Record<string, string> = {
  config: "GitHub 로그인이 아직 설정되지 않았어요",
  state: "로그인 요청이 만료됐어요. 다시 시도해 주세요",
  token: "GitHub 로그인에 실패했어요",
};

export default function LoginError() {
  const error = useSearchParams().get("error");
  if (!error) return null;
  return <p className="text-[13px] text-danger">{MESSAGES[error] ?? MESSAGES.token}</p>;
}

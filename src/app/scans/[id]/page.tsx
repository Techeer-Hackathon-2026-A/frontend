import { Suspense } from "react";
import ScanFrame from "@/components/ScanFrame";
import { getUser } from "@/lib/session";

// repo·branch 쿼리는 대시보드·범위 설정에서 넘겨주는 값. 백엔드 스캔 응답에 레포 이름이 없어서 GitHub 원본 파일을 읽을 때도 쓴다.
export default function ScanPage({ params, searchParams }: PageProps<"/scans/[id]">) {
  return (
    <Suspense>
      <Scan params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Scan({ params, searchParams }: PageProps<"/scans/[id]">) {
  const { id } = await params;
  const { repo, branch, report } = await searchParams;
  const name = typeof repo === "string" && !repo.startsWith("스캔 #") ? repo : "";
  // 로그인 없이 링크로 시작한 스캔은 대시보드·보고서가 없고, 고치기(PR)는 로그인한 뒤에 한다
  const signedIn = Boolean(await getUser().catch(() => undefined));
  return (
    <ScanFrame
      query={{
        id,
        repo: name || `스캔 #${id}`,
        branch: typeof branch === "string" ? branch : "",
        ...(signedIn
          ? { report: typeof report === "string" && report.startsWith("/dashboard") ? report : `/dashboard#/scan/s_${id}` }
          : { back: "/", fix: "login" }),
      }}
      title={`${name || "레포"} 스캔`}
      live={{ scanId: Number(id), repo: name }}
    />
  );
}

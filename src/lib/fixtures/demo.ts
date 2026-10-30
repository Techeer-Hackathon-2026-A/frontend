import type { Evidence, Finding, Hunk, RepoFile } from "@/lib/types";

// demo/index.html 프로토타입과 같은 데모 레포. 백엔드가 붙기 전까지 MockStream 이 이 데이터를 재생한다.

export const DEMO_REPO = "acme/shop-web";
export const DEMO_BRANCH = "main";

export const DEMO_FILES: RepoFile[] = [
  {
    path: "src/app/page.tsx",
    content: `import Link from "next/link";

export default function Home() {
  return (
    <main className="p-8">
      <h1>Shop</h1>
      <Link href="/orders">My orders</Link>
    </main>
  );
}`,
  },
  {
    path: "src/app/api/users/route.ts",
    content: `import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";

  const users = await db.query(
    \`SELECT id, email FROM users WHERE name LIKE '%\${q}%'\`
  );

  return NextResponse.json(users.rows);
}

export async function DELETE(req: Request) {
  const { id } = await req.json();
  await db.query("DELETE FROM users WHERE id = $1", [id]);
  return NextResponse.json({ ok: true });
}`,
  },
  {
    path: "src/lib/supabase.ts",
    content: `import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SERVICE_ROLE_KEY!;

export const supabase = createClient(url, key);`,
  },
  {
    path: "src/app/api/orders/[id]/route.ts",
    content: `import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return new Response(null, { status: 401 });

  const order = await db.order.findUnique({
    where: { id: params.id },
  });

  return Response.json(order);
}`,
  },
];

export interface SafeCheck {
  path: string;
  line: number;
  token: string;
  note: string;
}

export const DEMO_SAFE_CHECKS: SafeCheck[] = [
  { path: "src/app/api/users/route.ts", line: 17, token: "$1", note: "이건 안전해" },
  { path: "src/lib/supabase.ts", line: 3, token: "NEXT_PUBLIC_SUPABASE_URL", note: "공개해도 돼" },
  { path: "src/app/api/orders/[id]/route.ts", line: 9, token: "if (!session)", note: "로그인 체크 OK" },
];

export const DEMO_FINDINGS: { finding: Finding; fix: Hunk[] }[] = [
  {
    finding: {
      id: "f1",
      path: "src/app/api/users/route.ts",
      line: 9,
      token: "${q}",
      severity: "critical",
      title: "SQL Injection",
      description: "입력값이 쿼리에 그대로 들어가요",
    },
    fix: [{ line: 9, del: 1, add: ['    "SELECT id, email FROM users WHERE name LIKE $1",', "    [`%${q}%`]"] }],
  },
  {
    finding: {
      id: "f2",
      path: "src/app/api/users/route.ts",
      line: 15,
      token: "DELETE",
      severity: "critical",
      title: "인증 없는 삭제 API",
      description: "누구나 유저를 지울 수 있어요",
    },
    fix: [
      {
        line: 15,
        add: [
          "  const session = await getSession();",
          '  if (session?.role !== "admin") return new Response(null, { status: 403 });',
        ],
      },
      { line: 2, add: ['import { getSession } from "@/lib/auth";'] },
    ],
  },
  {
    finding: {
      id: "f3",
      path: "src/lib/supabase.ts",
      line: 4,
      token: "NEXT_PUBLIC_SERVICE_ROLE_KEY",
      severity: "critical",
      title: "관리자 키 노출",
      description: "service_role 키가 브라우저에 번들돼요",
    },
    fix: [{ line: 4, del: 1, add: ["const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;"] }],
  },
  {
    finding: {
      id: "f4",
      path: "src/app/api/orders/[id]/route.ts",
      line: 12,
      token: "{ id: params.id }",
      severity: "high",
      title: "남의 주문 조회 (IDOR)",
      description: "주문 주인을 확인하지 않아요",
    },
    fix: [{ line: 12, del: 1, add: ["    where: { id: params.id, userId: session.user.id },"] }],
  },
];

// 고치기 전 공격(exploit)과 고친 뒤 재공격(recheck)의 증거. 백엔드 방식이 정해지기 전이라 kind 를 섞어 둔다.
export const DEMO_PROOFS: Record<string, { exploit: Evidence[]; recheck: Evidence[] }> = {
  f1: {
    exploit: [{ kind: "http", method: "GET", url: "/api/users?q=' OR '1'='1", status: 200, response: "1,204 users (email 포함)" }],
    recheck: [{ kind: "http", method: "GET", url: "/api/users?q=' OR '1'='1", status: 200, response: "[]" }],
  },
  f2: {
    exploit: [{ kind: "http", method: "DELETE", url: "/api/users", body: '{"id":1}', status: 200, response: "로그인 없이 삭제됨" }],
    recheck: [{ kind: "http", method: "DELETE", url: "/api/users", body: '{"id":1}', status: 403 }],
  },
  f3: {
    exploit: [{ kind: "log", lines: ["$ grep -l service_role .next/static/chunks/*.js", "app-4f2a.js  ← 브라우저로 내려감"] }],
    recheck: [{ kind: "log", lines: ["$ grep -l service_role .next/static/chunks/*.js", "(없음)"] }],
  },
  f4: {
    exploit: [{ kind: "http", method: "GET", url: "/api/orders/1043  (다른 유저 세션)", status: 200, response: "남의 주소·결제 내역" }],
    recheck: [
      { kind: "http", method: "GET", url: "/api/orders/1043  (다른 유저 세션)", status: 404 },
      { kind: "reasoning", text: "where 에 userId 조건이 생겨 본인 주문만 조회돼요", refs: [{ path: "src/app/api/orders/[id]/route.ts", line: 12 }] },
    ],
  },
};

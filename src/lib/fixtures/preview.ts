import type { RepoRow } from "@/app/dashboard/RepoList";
import { DEMO_FILES } from "@/lib/fixtures/demo";
import type { Branch, TreeEntry } from "@/lib/scope";
import type { ScanSummary } from "@/lib/types";

// 로그인 없이 둘러보기(/preview)에 보여 줄 샘플 대시보드. 어느 레포를 스캔해도 데모 레포 녹화가 재생된다.

const shopWebDone: ScanSummary = {
  id: "preview-1",
  repo: "acme/shop-web",
  branch: "main",
  status: "done",
  createdAt: "2026-10-30T09:00:00Z",
  findings: 4,
  fixed: 4,
  pr: { number: 128, url: "" },
};

const apiScanned: ScanSummary = {
  id: "preview-2",
  repo: "acme/api",
  branch: "main",
  status: "scanned",
  createdAt: "2026-10-29T09:00:00Z",
  findings: 3,
  fixed: 0,
};

const adminFailed: ScanSummary = {
  id: "preview-3",
  repo: "acme/admin",
  branch: "develop",
  status: "done",
  createdAt: "2026-10-27T09:00:00Z",
  findings: 1,
  fixed: 1,
  pr: { number: 42, url: "" },
};

export const PREVIEW_SCANS: (ScanSummary & { ago: string })[] = [
  { ...shopWebDone, ago: "어제" },
  { ...apiScanned, ago: "2일 전" },
  { ...adminFailed, ago: "4일 전" },
];

export const PREVIEW_REPOS: RepoRow[] = [
  {
    fullName: "acme/shop-web",
    description: "쇼핑몰 프론트엔드",
    private: false,
    language: "TypeScript",
    defaultBranch: "main",
    ago: "3시간 전",
    lastScan: shopWebDone,
  },
  {
    fullName: "acme/api",
    description: "주문·결제 API",
    private: true,
    language: "TypeScript",
    defaultBranch: "main",
    ago: "어제",
    lastScan: apiScanned,
  },
  {
    fullName: "acme/admin",
    description: "사내 관리자 페이지",
    private: true,
    language: "TypeScript",
    defaultBranch: "develop",
    ago: "4일 전",
    lastScan: adminFailed,
  },
  { fullName: "acme/landing", description: "마케팅 랜딩", private: false, language: "Astro", defaultBranch: "main", ago: "2주 전" },
  { fullName: "acme/mobile", description: null, private: true, language: "Swift", defaultBranch: "main", ago: "한 달 전" },
];

// 범위 설정 화면의 샘플 레포 (prototype/index.html 의 TREE_SRC). 데모 레포 파일 4개가 들어 있어서
// 고른 범위대로 녹화 스캔이 걸러진다. 나머지 파일은 크기만 있는 자리 채움이다.
const sample = (path: string, lines: number): TreeEntry => ({ path, size: lines * 32 });

export const PREVIEW_TREE: TreeEntry[] = [
  ...DEMO_FILES.map((f) => sample(f.path, f.content.split("\n").length)),
  sample(".github/workflows/ci.yml", 42),
  { path: "node_modules", files: 1203, size: 184200 * 32 },
  sample("public/hero.png", 0),
  sample("public/logo.svg", 0),
  sample("src/app/api/auth/[...nextauth]/route.ts", 38),
  sample("src/app/api/webhooks/stripe/route.ts", 54),
  sample("src/app/checkout/page.tsx", 112),
  sample("src/app/login/page.tsx", 76),
  sample("src/app/layout.tsx", 28),
  sample("src/components/CartDrawer.tsx", 94),
  sample("src/components/Header.tsx", 41),
  sample("src/components/ProductCard.tsx", 63),
  sample("src/lib/auth.ts", 47),
  sample("src/lib/db.ts", 22),
  sample("src/lib/stripe.ts", 31),
  sample("src/middleware.ts", 33),
  sample("tests/orders.test.ts", 58),
  sample("tests/users.test.ts", 71),
  sample(".env.example", 9),
  sample("next.config.ts", 14),
  sample("package-lock.json", 8420),
  sample("package.json", 38),
  sample("README.md", 61),
];

export const PREVIEW_BRANCHES: Branch[] = [
  { name: "main", commit: "a41c9e2", isDefault: true },
  { name: "dev", commit: "3b77f01" },
  { name: "feat/checkout-v2", commit: "c90aa31" },
];

# Frontend — Patchi (AI 코드 보안 분석 플랫폼)

GitHub 로 로그인해 레포를 고르면, 캐릭터가 코드를 훑으며 백엔드가 찾은 취약점을 보여 주고
"모두 고치고 PR 열기" 한 번으로 AI 수정안 → PR 까지 이어지는 웹 앱입니다.
화면은 Patchi 프로토타입과 같은 코드입니다. 대시보드·새 스캔·레포·보고서는 앱 프로토타입(`public/app.html`)을, 스캔 연출은 `public/scan.html` 을 그대로 쓰고,
데이터만 GitHub·팀 백엔드 REST API(`/api/v1`)에서 받아 프로토타입의 목업과 같은 모양으로 넣습니다.

## 기술 스택

| 영역 | 스택 |
|---|---|
| 프레임워크 | Next.js 16 (App Router) · React 19 · TypeScript |
| 스타일 | Tailwind CSS v4 |
| 인증 | GitHub OAuth App + iron-session 암호화 쿠키 (GitHub 토큰은 서버에만) |
| 앱 화면 | `public/app.html` (단일 HTML, 해시 라우팅). `/dashboard` 는 실제 데이터, `/preview` 는 목업 |
| 스캔 연출 | `public/scan.html` (단일 HTML 연출, iframe 으로 띄움) |

## 빠른 시작

```bash
npm install
cp .env.example .env.local   # GITHUB_CLIENT_ID/SECRET, SESSION_SECRET 채우기
npm run dev                  # http://localhost:3000
```

- **GitHub OAuth App** 을 github.com/settings/developers 에서 만들고 callback URL 을 `<주소>/api/auth/callback` 으로 둡니다.
- 브라우저의 `/api/v1/*` 요청은 `next.config.ts` rewrite 로 `BACKEND_URL`(기본 `http://localhost:8000`)에 전달됩니다. CORS 설정이 필요 없습니다.
- 백엔드 없이 보려면 `npm run mock-backend` (포트 8000, `PORT=8010` 처럼 바꿀 수 있음). 어떤 레포든 OWASP/NodeGoat 취약점 4건을 찾은 것처럼 답합니다.
- 로그인 없이 보려면 랜딩의 **로그인 없이 둘러보기**(`/preview`): 프로토타입 목업 그대로 (스캔 시작은 녹화된 스캔 재생).

```bash
npm run build           # 타입 체크 + 프로덕션 빌드
npm run lint
npm run build:timeline  # src/lib/fixtures/demo.ts 를 고친 뒤 둘러보기 녹화(public/demo-scan.json) 다시 만들기
```

## 화면 · 라우트

| 경로 | 화면 | 사용하는 API |
|---|---|---|
| `/` | 랜딩. GitHub 로 계속하기 / 로그인 없이 둘러보기 / 연출 데모 | — |
| `/dashboard#/` | 홈: 열린 취약점·차단 확인·머지 대기 PR, 확인이 필요해요, 레포 표 | `/api/app/data` |
| `/dashboard#/new` · `#/new/owner/name` | 새 스캔 ① 레포 가져오기 · ② 브랜치·범위 설정 → 스캔 시작 | `/api/app/tree`, `/api/app/scans` |
| `/dashboard#/repo/owner/name` | 레포 상세: 스캔 기록·열린 취약점·PR | `/api/app/data` |
| `/dashboard#/scan/s_<id>` | 스캔 보고서: 취약점 목록·근거·수정 diff, 고르고 고치기 → PR | `/api/v1/findings/:id/fixes`, `/api/v1/scans/:id/pull-requests` |
| `/scans/[id]` | 스캔 연출 → 모두 고치기 → PR, "보고서 보기" | 아래 "스캔 화면" |
| `/preview` · `/preview/scan` | 로그인 없이 둘러보기 (목업, 녹화 재생) | — |
| `/demo` | 원본 연출 프로토타입 (`public/demo.html`) | — |

`/api/app/*` 은 Next 서버가 GitHub(로그인 토큰)·팀 백엔드를 불러 프로토타입 데이터 모양(`REPOS`·`SCANS`·`F`·`TREE_SRC`)으로 바꿔 줍니다 (`src/lib/appData.ts`).
백엔드가 실공격 증거를 주지 않아서 보고서의 "고치기 전" 칸에는 탐지기 결과를, "고친 뒤" 칸에는 수정안 검증(`Fix.verified`)을 보여 줍니다.

### 스캔 화면 (`/scans/[id]`)

`src/lib/feed/scanFeed.ts` 가 백엔드를 폴링해 연출 이벤트(`src/lib/feed/scanEvents.ts`)로 바꿔 `public/scan.html` 에 넣습니다.

```
GET /scans/:id/progress (1.5초마다)             → 인트로에 진행 상황
GET /scans/:id, /report, /findings/:id          → 우선 조치 대상을 캐릭터가 훑음
(모두 고치기) POST·GET /findings/:id/fixes        → 수정 연출 + 검증(Fix.verified)
             POST·GET /scans/:id/pull-requests   → PR 버튼
```

- 코드는 `/api/repo-file` 로 GitHub 원본을 읽어 보여 줍니다(로그인 토큰이라 비공개 레포도 됨). 못 읽으면 백엔드 snippet.
- 백엔드 `ScanOut` 에 레포 이름이 없어서, 스캔을 시작할 때 `project_id → owner/name` 을 세션 쿠키에 기억해 대시보드에 씁니다.
- 범위 설정의 파일 선택·공격 검증 토글은 백엔드가 아직 받지 않아, 지금은 브랜치 전체를 스캔합니다.

## 폴더 구조

```
src/
├── proxy.ts                 # 로그인 여부로 / ↔ /dashboard 이동
├── app/
│   ├── page.tsx             # /            랜딩
│   ├── scans/[id]/          # 스캔 화면 (public/scan.html 을 iframe 으로)
│   ├── preview/scan/        # 둘러보기 스캔 (녹화 재생)
│   └── api/                 # auth/{login,callback,logout}, repo-file, app/{data,tree,scans,findings/[id]}
├── components/              # Character, Logo, ScanFrame, dashboard/, scope/
└── lib/
    ├── api/                 # ★ 팀 백엔드 타입(types.ts, app/schemas/api.py 와 1:1)·브라우저용 클라이언트
    ├── feed/                # 백엔드 REST → 스캔 연출 이벤트 (scanFeed.ts)
    ├── appData.ts           # 서버 전용: GitHub·백엔드 → app.html 데이터
    ├── session.ts · github.ts · backend.ts   # 서버 전용
    ├── scope.ts             # 범위 설정 파일 트리 (기본 제외·위험 태그)
    ├── types.ts             # 둘러보기 녹화 타입
    └── fixtures/demo.ts     # 둘러보기 녹화의 데모 레포

public/
├── app.html                 # 대시보드·새 스캔·레포·보고서 (prototype/index.html 그대로 + 실제 데이터 계층)
├── scan.html                # 스캔 연출 (feed=manual: 부모가 이벤트를 넣음, feed=demo: 녹화 재생)
├── demo.html                # /demo 원본 연출
└── demo-scan.json           # 둘러보기 녹화 (npm run build:timeline)

scripts/mock-backend.mjs     # 백엔드 흉내 서버
```

디자인 토큰(다크 테마 색·폰트)은 `src/app/globals.css` 의 `@theme` 에 있습니다.

## 협업 규칙

- **브랜치**: `feat/<기능>` (예: `feat/report-chart`) → PR 후 `main` 머지
- **커밋**: `feat:`, `fix:`, `refactor:`, `style:`, `docs:`, `chore:` + 한 줄 설명
- **백엔드 API 타입**은 `src/lib/api/types.ts` 한 곳에서만 정의하고, 백엔드 스키마가 바뀌면 같이 수정
- `.env*`는 커밋하지 않기 (`.env.example` 만)

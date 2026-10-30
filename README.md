# Frontend — AI 코드 보안 분석 플랫폼

GitHub 레포 링크를 입력하면 보안 분석 진행 상황, OWASP Top 10 기준 리포트, 취약점 상세와 AI 수정안을 보여주고
수정 PR 생성까지 요청할 수 있는 웹 대시보드입니다.

## 기술 스택

| 영역 | 스택 |
|---|---|
| 프레임워크 | React 19 · TypeScript · Vite |
| 스타일 | Tailwind CSS v4 (`@tailwindcss/vite`) |
| 라우팅 | React Router v7 |
| 서버 상태 | TanStack Query v5 (진행률 폴링, 캐싱) |

## 빠른 시작

```bash
npm install
cp .env.example .env    # 기본값 그대로 사용 가능
npm run dev             # http://localhost:5173
```

개발 서버는 `/api` 요청을 `http://localhost:8000`(백엔드)로 프록시합니다. 백엔드를 먼저 띄워 두세요.
백엔드 API 문서: http://localhost:8000/docs

백엔드 없이 화면 흐름만 볼 때는 백엔드 대신 흉내 서버를 띄웁니다 (같은 8000 포트, 공개 레포 OWASP/NodeGoat 의 실제 취약 코드 4건).

```bash
npm run mock-backend    # http://localhost:8000/api/v1
```

```bash
npm run build           # 타입 체크 + 프로덕션 빌드
npm run lint
npm run build:scan      # public/demo.html 을 고친 뒤 public/scan.html 다시 만들기
```

## 폴더 구조

```
src/
├── main.tsx              # QueryClient 설정
├── App.tsx               # 라우트 정의 (스캔 화면만 Layout 밖, 화면 전체)
├── index.css             # Tailwind + 디자인 토큰 (프로토타입과 같은 값)
├── types/api.ts          # ★ 백엔드 app/schemas/api.py 와 맞춘 타입
├── api/
│   ├── client.ts         # fetch 래퍼, 에러 처리
│   └── index.ts          # scansApi · reportsApi · fixesApi · pullRequestsApi
├── hooks/queries.ts      # TanStack Query 훅 (진행률·수정안·PR 폴링)
├── lib/
│   ├── scanFeed.ts       # ★ 백엔드 REST API 를 폴링해 스캔 연출 이벤트로 바꾸는 어댑터
│   ├── scanEvents.ts     # 연출 화면(scan.html)이 받는 이벤트 타입
│   ├── code.ts           # snippet·수정안 → 보여 줄 줄, hunk, diff
│   ├── scanRepos.ts      # 스캔별 레포 주소 기억 (localStorage)
│   └── labels.ts         # 심각도·상태 라벨, 색상
├── components/           # Layout(상단 경로), Character, FindingCard(상세 카드), ui(버튼·칩·diff·코드 보기) …
└── pages/
    ├── HomePage.tsx          # A  레포 링크 입력 + 최근 스캔
    ├── ScanPage.tsx          # A  연출 스캔 화면 (public/scan.html 을 iframe 으로)
    ├── ReportPage.tsx        # A  보안 분석 리포트
    ├── FindingDetailPage.tsx # B  취약점 상세 + AI 수정안 + PR 생성
    └── PullRequestsPage.tsx  # B  PR 목록

public/demo.html          # 원본 연출 프로토타입 (캐릭터가 코드를 훑으며 찾고 고치는 장면, /demo.html)
public/scan.html          # demo.html 에서 만든 실제 스캔 화면. 직접 고치지 말고 npm run build:scan
scripts/build-scan-page.py  # demo.html → scan.html 변환
scripts/mock-backend.mjs    # 백엔드 흉내 서버
```

디자인 토큰(다크 테마 색·폰트)은 `src/index.css` 의 `@theme` 에 있습니다. `bg-bg`, `text-muted`, `border-line`, `bg-ok` 처럼 씁니다.

## 화면 · 라우트

| 경로 | 화면 | 사용하는 API | 담당 |
|---|---|---|---|
| `/` | 레포 링크 입력, 최근 스캔 | `POST /scans`, `GET /scans` | 프론트 A |
| `/scans/:scanId` | 연출 스캔 화면: 진행률 → 캐릭터가 파일을 훑으며 취약점을 찾고 → 모두 고치고 PR | 아래 "스캔 화면" | 프론트 A |
| `/scans/:scanId/report` | 보고서: 결론·PR 카드, 등급·개수, 취약점 목록 + 상세(코드·수정 diff), OWASP | `GET /scans/:id`, `/report`, `/findings`, `GET /findings/:id`, `/fixes`, `GET /scans/:id/pull-requests` | 프론트 A |
| `/findings/:findingId` | 취약점 상세, 코드, AI 수정안 diff(생성될 때까지 폴링), PR 생성 | `GET /findings/:id`, `GET·POST /findings/:id/fixes`, `POST /scans/:id/pull-requests` | 프론트 B |
| `/scans/:scanId/pull-requests` | 수정 PR 목록 (만드는 중이면 폴링) | `GET /scans/:id/pull-requests` | 프론트 B |

### 스캔 화면은 어떻게 도나

연출은 원본 프로토타입(`public/demo.html`) 그대로이고, 데이터만 백엔드에서 옵니다. `lib/scanFeed.ts` 가 백엔드 API 를 폴링해
연출 이벤트로 바꾼 뒤 iframe 안 `window.patchiScan.push()` 로 넣습니다. 백엔드 API 형식은 바꾸지 않았습니다.

1. `GET /scans/:id/progress` 를 1.5초마다 → 클론·탐지·분류 중에는 인트로에 상태와 %를 보여 줌
2. 완료되면 `GET /scans/:id/report` 의 `top_findings`(우선 조치 대상 최대 10개)와 각 `GET /findings/:id` 를 받아,
   파일 내용은 **GitHub 원본**(`raw.githubusercontent.com`, `commit_sha` 기준)에서 가져와 캐릭터가 처음부터 훑음.
   80줄 넘는 파일은 취약점 주변만 보여 주고, 비공개 레포라 원본을 못 받으면 백엔드 `snippet` 으로 대신함
3. "모두 고치고 PR 열기" → 취약점마다 `POST /findings/:id/fixes`(이미 있으면 재사용) 후 `GET` 폴링.
   만들어지는 대로 `original_code → fixed_code` 를 그 자리에서 고치고, `verified` 로 Fixed 여부를 표시
4. 만든 수정안으로 `POST /scans/:id/pull-requests` → `status` 가 `created` 가 될 때까지 폴링 → "PR #n 열기"

- 백엔드는 고칠 수 없는 취약점(코드가 없는 시크릿 등)에 수정안을 끝내 만들지 않으므로, 하나가 나온 뒤 30초(최대 90초) 동안 새 수정안이 없으면 있는 것만으로 PR 을 엽니다.
- 다시 접속하면 처음부터 다시 보여 주고, 이미 PR 을 요청한 스캔이면 고치기와 PR 까지 이어서 보여 줍니다.
- 수정안 대기와 PR 요청은 브라우저가 하므로, 고치는 도중 화면을 떠나면 PR 요청이 나가지 않습니다.
- `ScanOut` 에 레포 주소가 없어서, 스캔을 만들 때 넣은 주소를 `localStorage` 에 기억해 레포 이름 표시와 원본 파일 조회에 씁니다.
  다른 브라우저에서 만든 스캔은 "스캔 #id" 로 보이고 `snippet` 으로만 보여 줍니다. 백엔드가 `repo_url` 을 주면 이 부분은 없앨 수 있습니다.

## 기능 목록 (P1)

| 기능 | 담당 | 백엔드 API 담당 |
|---|---|---|
| 레포 링크 입력 | 프론트 A | 백엔드 A (박소연) |
| 분석 진행 상태 실시간 표시 | 프론트 A | 백엔드 A (박소연) |
| 보안 분석 리포트 | 프론트 A | 백엔드 C (김장군) |
| 취약점 상세 조회 | 프론트 B | 백엔드 C (김장군) |
| AI 수정안 표시 | 프론트 B | 백엔드 D (이광해) |
| PR 목록 조회 | 프론트 B | 백엔드 A (박소연) |

### 남은 작업 (TODO)

- **프론트 A**: 리포트 차트(심각도·유형 분포), 취약점 목록 필터(심각도·유형·OWASP)
- **프론트 B**: 여러 수정안을 골라 한 번에 PR 만들기 (지금은 스캔 화면의 "모두 고치기" 또는 상세에서 하나씩)
- **백엔드와 맞출 것**: `ScanOut` 에 `repo_url` 추가되면 `lib/scanRepos.ts` 의 localStorage 대신 사용

## 협업 규칙

- **브랜치**: `feat/<기능>` (예: `feat/report-chart`) → PR 후 `main` 머지
- **커밋**: `feat:`, `fix:`, `refactor:`, `style:`, `docs:`, `chore:` + 한 줄 설명
- **API 타입**은 `src/types/api.ts` 한 곳에서만 정의하고, 백엔드 스키마가 바뀌면 같이 수정
- API 호출은 컴포넌트에서 직접 `fetch`하지 말고 `hooks/queries.ts`의 훅을 사용 (예외: React 밖에서 도는 스캔 연출 어댑터 `lib/scanFeed.ts` 는 `api/` 를 직접 부름)
- `.env`는 커밋하지 않기

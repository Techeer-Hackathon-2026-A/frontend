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

```bash
npm run build           # 타입 체크 + 프로덕션 빌드
npm run lint
```

## 폴더 구조

```
src/
├── main.tsx              # QueryClient 설정
├── App.tsx               # 라우트 정의
├── index.css             # Tailwind
├── types/api.ts          # ★ 백엔드 app/schemas/api.py 와 맞춘 타입
├── api/
│   ├── client.ts         # fetch 래퍼, 에러 처리
│   └── index.ts          # scansApi · reportsApi · fixesApi · pullRequestsApi
├── hooks/queries.ts      # TanStack Query 훅 (useScanProgress 등)
├── lib/labels.ts         # 심각도·상태 한글 라벨, 색상
├── components/           # Layout, Logo, Character(캐릭터), SeverityBadge, ScanStatusLabel, Loading/Error
└── pages/
    ├── HomePage.tsx          # A  레포 링크 입력
    ├── ScanPage.tsx          # A  진행 상태 실시간 표시 + 보안 분석 리포트
    ├── FindingDetailPage.tsx # B  취약점 상세 + AI 수정안 + PR 생성 요청
    └── PullRequestsPage.tsx  # B  PR 목록

public/demo.html          # 연출 프로토타입 (캐릭터가 코드를 훑으며 찾고 고치는 장면, /demo.html)
```

디자인 토큰(다크 테마 색·폰트)은 `src/index.css` 의 `@theme` 에 있습니다. `bg-bg`, `text-muted`, `border-line`, `bg-ok` 처럼 씁니다.

## 화면 · 라우트

| 경로 | 화면 | 사용하는 API | 담당 |
|---|---|---|---|
| `/` | 레포 링크 입력 | `POST /scans` | 프론트 A |
| `/scans/:scanId` | 진행률 → 완료 시 리포트 (등급, 심각도별, OWASP 매트릭스, 우선 조치 대상) | `GET /scans/:id/progress`, `GET /scans/:id/report` | 프론트 A |
| `/findings/:findingId` | 취약점 상세, 코드 조각, AI 수정안(원본/수정 비교), PR 생성 | `GET /findings/:id`, `GET·POST /findings/:id/fixes`, `POST /scans/:id/pull-requests` | 프론트 B |
| `/scans/:scanId/pull-requests` | 수정 PR 목록 | `GET /scans/:id/pull-requests` | 프론트 B |

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

- **프론트 A**: 리포트 차트(심각도·유형 분포), OWASP 매트릭스 시각화, 필터가 있는 전체 취약점 목록(`useFindings`), 스캔 실패 화면
- **프론트 B**: 원본/수정 코드 diff 뷰, 수정안 생성 완료까지 폴링, 여러 수정안을 골라 한 번에 PR 만들기, PR 상태 폴링

## 협업 규칙

- **브랜치**: `feat/<기능>` (예: `feat/report-chart`) → PR 후 `main` 머지
- **커밋**: `feat:`, `fix:`, `refactor:`, `style:`, `docs:`, `chore:` + 한 줄 설명
- **API 타입**은 `src/types/api.ts` 한 곳에서만 정의하고, 백엔드 스키마가 바뀌면 같이 수정
- API 호출은 컴포넌트에서 직접 `fetch`하지 말고 `hooks/queries.ts`의 훅을 사용
- `.env`는 커밋하지 않기

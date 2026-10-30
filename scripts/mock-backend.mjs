// 백엔드 API(app/api/v1) 를 흉내 내는 로컬 서버. 백엔드 없이 화면 흐름을 확인할 때 쓴다.
//   npm run mock-backend   → http://localhost:8000 (vite 가 /api 를 여기로 보낸다)
// 어떤 레포를 넣어도 공개 레포 OWASP/NodeGoat 의 실제 취약 코드 4건을 찾은 것처럼 답한다.
// 스캔: 약 4초 동안 클론 → 탐지 → 분류 후 완료. 수정안: 요청 1~2초 뒤 생성. PR: 1~2초 뒤 생성.
import { createServer } from 'node:http'

const PORT = 8000
const now = () => new Date().toISOString()

const FINDINGS = [
  {
    category: 'sast', tool: 'semgrep', severity: 'critical', rule_id: 'javascript.lang.security.eval-injection',
    title: 'eval() 로 사용자 입력 실행', file_path: 'app/routes/contributions.js', start_line: 32, end_line: 34,
    cwe: ['CWE-95'], owasp_top10: 'A03:2021-Injection', risk_score: 9.8,
    message: 'req.body 값을 eval() 로 실행해 서버에서 임의 코드가 돌 수 있어요',
    snippet: [
      '',
      '        /*jslint evil: true */',
      '        // Insecure use of eval() to parse inputs',
      '        const preTax = eval(req.body.preTax);',
      '        const afterTax = eval(req.body.afterTax);',
      '        const roth = eval(req.body.roth);',
      '',
      '        /*',
      '        //Fix for A1 -1 SSJS Injection attacks - uses alternate method to eval',
    ].join('\n'),
    fix: {
      original_code: '        const preTax = eval(req.body.preTax);\n        const afterTax = eval(req.body.afterTax);\n        const roth = eval(req.body.roth);',
      fixed_code: '        const preTax = parseInt(req.body.preTax, 10);\n        const afterTax = parseInt(req.body.afterTax, 10);\n        const roth = parseInt(req.body.roth, 10);',
      explanation: 'eval 대신 parseInt 로 숫자만 받아요', verified: true,
    },
  },
  {
    category: 'sast', tool: 'semgrep', severity: 'high', rule_id: 'javascript.mongodb.nosql-where-injection',
    title: 'NoSQL $where 인젝션', file_path: 'app/data/allocations-dao.js', start_line: 78, end_line: 78,
    cwe: ['CWE-943'], owasp_top10: 'A03:2021-Injection', risk_score: 8.1,
    message: 'threshold 를 그대로 $where 자바스크립트에 넣어 쿼리를 바꿀 수 있어요',
    snippet: null,
    fix: {
      original_code: "                    $where: `this.userId == ${parsedUserId} && this.stocks > '${threshold}'`",
      fixed_code: '                    userId: parsedUserId,\n                    stocks: { $gt: parseInt(threshold, 10) || 0 }',
      explanation: '$where 대신 일반 쿼리 조건을 써요', verified: true,
    },
  },
  {
    category: 'sca', tool: 'osv-scanner', severity: 'medium', rule_id: 'GHSA-xxxx-marked',
    title: 'marked 0.3.5 XSS 취약점', file_path: 'package.json', start_line: 17, end_line: 17,
    cwe: ['CWE-79'], owasp_top10: 'A06:2021-Vulnerable and Outdated Components', risk_score: 6.1,
    message: '마크다운 렌더러 marked 0.3.5 에 알려진 XSS 가 있어요',
    snippet: null,
    dependency: { package: 'marked', ecosystem: 'npm', installed_version: '0.3.5', fixed_version: '4.0.10', vuln_ids: ['GHSA-xxxx'] },
    fix: { original_code: '    "marked": "0.3.5",', fixed_code: '    "marked": "4.0.10",', explanation: '고쳐진 버전으로 올려요', verified: false },
  },
  {
    category: 'secret', tool: 'gitleaks', severity: 'high', rule_id: 'redacted',
    title: '하드코딩된 세션 비밀키', file_path: '[redacted]', start_line: 12, end_line: 12,
    cwe: ['CWE-798'], owasp_top10: 'A07:2021-Identification and Authentication Failures', risk_score: 7.4,
    message: '보안 분석 결과', snippet: null,
    fix: null,
  },
]

const STEPS = [
  ['pending', 0, '대기 중'],
  ['cloning', 10, '레포 클론 중'],
  ['detecting', 30, 'Semgrep · OSV-Scanner · Gitleaks 실행 중'],
  ['classifying', 70, '중복 통합 · OWASP 분류 · 위험도 산정 중'],
  ['completed', 100, '완료'],
]

const scans = []
const findings = []
const fixes = []
const prs = []

function scanStatus(scan) {
  const k = Math.min(STEPS.length - 1, Math.floor((Date.now() - scan.startedAt) / 1000))
  return STEPS[k]
}

function scanOut(scan) {
  const [status] = scanStatus(scan)
  const done = status === 'completed'
  if (done && !scan.findingsCreated) {
    scan.findingsCreated = true
    FINDINGS.forEach((f, i) => {
      findings.push({
        id: findings.length + 1, scan_id: scan.id, priority: i + 1, status: 'open', owasp: [f.owasp_top10.slice(0, 8)],
        merged_tools: [f.tool], dependency: null, ...f,
      })
    })
  }
  return {
    id: scan.id, project_id: 1, status, branch: scan.branch, commit_sha: done ? 'HEAD' : null,
    grade: done ? 'D' : null, summary: null, error_message: null, created_at: scan.created_at, finished_at: done ? now() : null,
  }
}

const pub = ({ fix: _fix, ...f }) => f
const listItem = ({ message: _m, end_line: _e, snippet: _s, owasp: _o, dependency: _d, merged_tools: _t, ...f }) => f

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(body))
}

async function readBody(req) {
  let raw = ''
  for await (const chunk of req) raw += chunk
  return raw ? JSON.parse(raw) : {}
}

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  const path = url.pathname.replace(/^\/api\/v1/, '')
  const m = (re) => path.match(re)
  let r

  if (req.method === 'POST' && path === '/scans') {
    const body = await readBody(req)
    const scan = { id: scans.length + 1, repo_url: body.repo_url, branch: body.branch, created_at: now(), startedAt: Date.now() }
    scans.push(scan)
    return send(res, 202, scanOut(scan))
  }
  if (req.method === 'GET' && path === '/scans') return send(res, 200, [...scans].reverse().map(scanOut))
  if ((r = m(/^\/scans\/(\d+)$/))) {
    const scan = scans[r[1] - 1]
    return scan ? send(res, 200, scanOut(scan)) : send(res, 404, { detail: '스캔을 찾을 수 없습니다' })
  }
  if ((r = m(/^\/scans\/(\d+)\/progress$/))) {
    const scan = scans[r[1] - 1]
    if (!scan) return send(res, 404, { detail: '스캔을 찾을 수 없습니다' })
    const [status, percent, message] = scanStatus(scan)
    scanOut(scan)
    return send(res, 200, { scan_id: scan.id, status, step: status, percent, message })
  }
  if ((r = m(/^\/scans\/(\d+)\/report$/))) {
    const list = findings.filter((f) => f.scan_id === Number(r[1]))
    const count = (key) => list.reduce((o, f) => ({ ...o, [f[key]]: (o[f[key]] ?? 0) + 1 }), {})
    return send(res, 200, {
      scan_id: Number(r[1]), grade: 'D', total: list.length, by_severity: count('severity'), by_category: count('category'),
      owasp_matrix: { 'A01:2021-Broken Access Control': 0, ...count('owasp_top10') }, top_findings: list.map((f) => listItem(pub(f))),
    })
  }
  if ((r = m(/^\/scans\/(\d+)\/findings$/))) {
    return send(res, 200, findings.filter((f) => f.scan_id === Number(r[1])).map((f) => listItem(pub(f))))
  }
  if ((r = m(/^\/findings\/(\d+)$/))) {
    const f = findings[r[1] - 1]
    return f ? send(res, 200, pub(f)) : send(res, 404, { detail: '취약점을 찾을 수 없습니다' })
  }
  if ((r = m(/^\/findings\/(\d+)\/fixes$/))) {
    const f = findings[r[1] - 1]
    if (!f) return send(res, 404, { detail: '취약점을 찾을 수 없습니다' })
    if (req.method === 'POST') {
      // 실제 백엔드처럼 고칠 수 없는 취약점(코드가 없는 시크릿)은 수정안이 끝내 생기지 않는다
      if (f.fix) {
        setTimeout(() => fixes.push({ id: fixes.length + 1, finding_id: f.id, file_path: f.file_path, created_at: now(), ...f.fix }), 1000 + Math.random() * 1000)
      }
      return send(res, 202, { task_id: `fix-${f.id}`, message: 'accepted' })
    }
    return send(res, 200, fixes.filter((x) => x.finding_id === f.id).reverse())
  }
  if ((r = m(/^\/scans\/(\d+)\/pull-requests$/))) {
    const scanId = Number(r[1])
    if (req.method === 'POST') {
      const { fix_ids } = await readBody(req)
      if (!fix_ids?.length) return send(res, 400, { detail: '수정안을 하나 이상 선택하세요' })
      const pr = { id: prs.length + 1, scan_id: scanId, branch_name: `security-fix/scan-${scanId}-${prs.length + 1}`, pr_number: null, pr_url: null, status: 'pending', created_at: now() }
      prs.push(pr)
      setTimeout(() => {
        Object.assign(pr, { status: 'created', pr_number: 40 + pr.id, pr_url: `https://github.com/OWASP/NodeGoat/pull/${40 + pr.id}` })
        fix_ids.forEach((id) => {
          const f = findings.find((x) => x.id === fixes[id - 1]?.finding_id)
          if (f) f.status = 'fixed'
        })
      }, 1000 + Math.random() * 1000)
      return send(res, 202, pr)
    }
    return send(res, 200, prs.filter((p) => p.scan_id === scanId).reverse())
  }
  send(res, 404, { detail: 'Not Found' })
}).listen(PORT, () => console.log(`mock backend http://localhost:${PORT}/api/v1`))

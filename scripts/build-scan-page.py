#!/usr/bin/env python3
# public/demo.html (원본 연출 프로토타입) → public/scan.html (실제 스캔 화면)
# 연출은 그대로 두고, 데모 레포 파일과 NOTES 대신 src/lib/scanFeed.ts 가 백엔드 API 로 만든 이벤트를 받는다.
# 프로토타입을 고친 뒤 다시 만들 때: npm run build:scan
import sys

src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding="utf-8").read()


def rep(old, new, count=1):
    global s
    n = s.count(old)
    assert n == count, f"expected {count} of:\n{old[:120]}\n(found {n})"
    s = s.replace(old, new)


def cut(start, end_marker):
    """start 부터 end_marker 직전까지 지운다"""
    global s
    i = s.index(start)
    j = s.index(end_marker, i)
    s = s[:i] + s[j:]


# ---------- 문서 ----------
rep("<title>Patchi Scan</title>", "<title>스캔 · Patchi</title>")
rep(
    "  .intro p { font: 13px var(--mono); color: var(--muted); margin-top: -10px; }",
    "  .intro p { font: 13px var(--mono); color: var(--muted); margin-top: -10px; }\n"
    "  .intro p.err { font-family: inherit; color: var(--red); }\n"
    "  .intro .back { font-size: 13px; color: var(--muted); }\n"
    "  .intro .back:hover { color: var(--text); }\n"
    "  .card[data-sev=\"medium\"] .dot { background: var(--muted); }\n"
    "  .card[data-sev=\"low\"] .dot, .card[data-sev=\"info\"] .dot { background: var(--faint); }\n"
    "  .line.gap .ln, .line.gap .src { color: var(--faint); }\n"
    "  .summary .sub { display: block; margin-top: 10px; text-align: center; font-size: 12.5px; color: var(--muted); }\n"
    "  .summary .sub:hover { color: var(--text); }",
)

# 헤더: 로고는 처음 화면으로, 레포·브랜치는 이벤트로 채운다
rep(
    """    <!-- web 에 합치면서 로고를 처음 화면으로 가는 링크로 감쌌다. 나머지는 demo/index.html 원본 그대로 -->
    <a href="/" title="처음으로" aria-label="처음으로" style="display: contents"><div class="logo"><svg""",
    '    <a href="/" target="_top" id="backLink" title="처음으로" aria-label="처음으로" style="display: contents"><div class="logo"><svg',
)
rep(
    '<span class="crumb">acme / <b>shop-web</b></span>\n    <span class="branch">main</span>',
    '<span class="crumb" id="crumb"></span>\n    <span class="branch" id="branch"></span>',
)

# 실제 스캔은 다시 재생(R)하지 않는다
rep(
    '<div class="keys"><span><kbd>Space</kbd> 정지</span><span><kbd>R</kbd> 다시</span><span><kbd>F</kbd> 속도</span></div>',
    '<div class="keys"><span><kbd>Space</kbd> 정지</span><span><kbd>F</kbd> 속도</span></div>',
)

# 인트로: 스캔은 홈에서 이미 시작됐으므로 버튼 대신 백엔드 진행 상황 / 실패 안내
rep(
    """        <h1>acme/shop-web</h1>
        <p>4 files · main</p>
        <button class="primary" id="startBtn">스캔 시작 <kbd style="color:#08090a;border-color:rgba(0,0,0,.2)">Space</kbd></button>""",
    """        <h1 id="introRepo"></h1>
        <p id="introText">스캔 정보를 불러오는 중…</p>
        <a class="back" id="introBack" href="/" target="_top" hidden>← 처음으로</a>""",
)

# 요약 아래에 보고서 링크
rep(
    '<button class="primary" id="fixBtn">모두 고치고 PR 열기</button>',
    '<button class="primary" id="fixBtn">모두 고치고 PR 열기</button>\n'
    '        <a class="sub" id="reportLink" href="/" target="_top">보고서 보기 →</a>',
)

# 데모 레포 파일과 NOTES 는 지운다. 파일·발견은 이벤트로 온다
cut('<script type="text/plain" data-path="src/app/page.tsx">', "<script>\n// 나중에 백엔드 이벤트")
i = s.index("<script>\n// 나중에 백엔드 이벤트")
j = s.index("\n};\n", i) + len("\n};\n")
s = s[:i] + "<script>\n" + s[j:]

rep(
    """const FILES = [...document.querySelectorAll('script[data-path]')].map(s => ({
  path: s.dataset.path,
  lines: s.textContent.split('\\n'),
  notes: NOTES[s.dataset.path] || {},
  rows: [],
}));""",
    """// demo.html 의 연출을 그대로 쓰되, 파일과 NOTES 를 이벤트(src/lib/scanEvents.ts 의 ScanEvent)로 채운다.
// 이벤트는 부모 페이지(src/pages/ScanPage.tsx)가 백엔드 API 를 폴링해 window.patchiScan.push 로 넣어 준다.
// 연출은 자기 속도로 걷고, 소식보다 앞서면 다음 소식이 올 때까지 그 줄에서 기다린다.
// FILES[i].notes[줄 번호, 1부터] = { token, safe } | { token, finding }
// FILES[i].nums[줄 index] = 원본 파일의 줄 번호 (파일 일부만 보여 줄 때. null 이면 생략 표시 줄)
let FILES = [];""",
)

# 심각도: 백엔드의 5단계를 그대로 보여 준다
rep(
    "  const label = fixed ? 'Fixed' : f.sev === 'critical' ? 'Critical' : 'High';",
    "  const label = fixed ? 'Fixed' : SEV[f.sev] || 'High';",
)
rep(
    "<span class=\"sev\">${f.sev === 'critical' ? 'Critical' : 'High'}</span>",
    "<span class=\"sev\">${SEV[f.sev] || 'High'}</span>",
)
rep(
    "// ---------- 상태 ----------",
    "const SEV = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low', info: 'Info' };\n\n// ---------- 상태 ----------",
)

# 줄 번호: 파일 일부만 보여 줄 때는 원본 줄 번호를, 고친 뒤에는 늘고 준 만큼 밀어서 보여 준다
rep(
    """  let num = 0;
  els.lines.innerHTML = f.rows.map(row => {
    const bad = s.bad.get(row), fixed = s.fixed.get(row);
    const cls = ['line', row.kind !== 'ctx' && row.kind, s.seen.has(row) && 'seen', bad && 'bad', fixed && 'fixed', row.fresh && 'new'].filter(Boolean).join(' ');
    const ln = row.kind === 'del' ? '−' : ++num;""",
    """  let num = 0, shift = 0;
  els.lines.innerHTML = f.rows.map(row => {
    const bad = s.bad.get(row), fixed = s.fixed.get(row);
    const gap = row.kind === 'ctx' && f.nums && f.nums[row.orig] == null;
    const cls = ['line', row.kind !== 'ctx' && row.kind, gap && 'gap', s.seen.has(row) && 'seen', bad && 'bad', fixed && 'fixed', row.fresh && 'new'].filter(Boolean).join(' ');
    let ln;
    if (row.kind === 'del') { ln = '−'; shift--; }
    else if (row.kind === 'add') { ln = ++num; shift++; }
    else if (gap) ln = '⋯';
    else ln = num = (f.nums ? f.nums[row.orig] : row.orig + 1) + shift;""",
)
rep(
    "<span class=\"loc\">${esc(FILES[f.file].path.split('/').pop())}:${f.line + 1}</span>",
    "<span class=\"loc\">${esc(FILES[f.file].path.split('/').pop())}:${lineNo(FILES[f.file], f.line)}</span>",
)
rep(
    "const lineEl = n => els.lines.children[n];",
    "const lineEl = n => els.lines.children[n];\nconst lineNo = (f, n) => (f.nums ? f.nums[n] : n + 1);",
)

# ---------- 스캔 시퀀스: 파일 순서와 진행을 이벤트에서 ----------
i = s.index("async function run() {")
j = s.index("function finish() {")
s = (
    s[:i]
    + """/** 조건이 맞을 때까지 기다린다. 일시정지·중단(gen)을 sleep 과 똑같이 따른다 */
async function until(cond) {
  while (!cond()) await sleep(80);
}

/** 이 파일에서 line(1부터)까지 살펴봤다는 소식이 왔는지 */
function reached(f, line) {
  if (live.done.has(f.path) || live.finished || live.failed) return true;
  return Object.keys(f.notes).some(n => Number(n) >= line);
}

async function run() {
  ++gen;
  reset();
  state.phase = 'running';
  els.intro.classList.add('out');
  els.spot.classList.add('on');
  try {
    for (let k = 0; ; k++) {
      await until(() => live.order[k] || live.finished || live.failed);
      if (live.failed) return fail();
      const path = live.order[k];
      if (!path) break;
      const i = FILES.findIndex(f => f.path === path);
      if (i < 0) continue;
      setStatus(`스캔 중 · ${k + 1}/${FILES.length}`, 'live');
      state.files[i].status = 'scanning';
      await switchFile(i);
      const f = FILES[i];
      for (let n = 0; n < f.rows.length; n++) {
        await until(() => reached(f, n + 1));
        if (live.failed) return fail();
        charToLine(n);
        state.files[i].seen.add(f.rows[n]);
        lineEl(n).classList.add('seen');
        els.bar.style.width = (++state.seen / state.total) * 100 + '%';
        await sleep(f.rows[n].text.trim() ? 150 : 60);
        if (f.notes[n + 1]) await inspect(n, f.notes[n + 1]);
      }
      state.files[i].status = state.files[i].bad.size ? 'issues' : 'clean';
      renderTree();
      await sleep(300);
    }
    finish();
  } catch (e) {
    if (e !== 'abort') throw e;
  }
}

"""
    + s[j:]
)

rep(
    """  els.summary.classList.add('show');
}""",
    """  els.summary.classList.add('show');
  if (!n) {
    els.sumL.textContent = '발견된 취약점이 없어요';
    els.fixBtn.hidden = true;
  }
  // 다시 접속했는데 이미 고치기가 시작돼 있었다면 이어서 보여 준다
  if (live.fixes.length || live.pr || live.fixEnd) fixAll();
}""",
)

# 발견 카드 개수 문구: 심각도별로 센다
rep(
    "  els.sumL.textContent = `${crit} critical · ${n - crit} high`;",
    "  els.sumL.textContent = Object.entries(SEV).map(([k, label]) => [label, state.findings.filter(f => f.sev === k).length])\n"
    "    .filter(([, c]) => c).map(([label, c]) => `${c} ${label.toLowerCase()}`).join(' · ');",
)

# ---------- 수정 시퀀스: 고칠 내용·재검증 결과·PR 을 이벤트에서 ----------
rep(
    """  const n = rowsOf().indexOf(f.fixedRow);
  charOver(lineBox(n), 300);
  pose('sniff');
  say('다시 공격…');
  showLens(lineBox(n), 'look');
  await sleep(700);
  showLens(lineBox(n), 'ok');
  pose('happy');
  say('막혔다!');
  f.card.classList.remove('active');
  f.card.classList.add('fixed');
  f.card.querySelector('.sev').textContent = 'Fixed';
  await sleep(750);""",
    """  const n = rowsOf().indexOf(f.fixedRow);
  charOver(lineBox(n), 300);
  pose('sniff');
  say('다시 확인…');
  showLens(lineBox(n), 'look');
  await sleep(700);
  await until(() => live.verify.has(f.id) || live.failed);
  f.card.classList.remove('active');
  if (live.verify.get(f.id)) {
    showLens(lineBox(n), 'ok');
    pose('happy');
    say('막혔다!');
    f.card.classList.add('fixed');
    f.card.querySelector('.sev').textContent = 'Fixed';
  } else {
    // 백엔드 검증을 통과하지 못한 수정은 Fixed 로 바꾸지 않는다
    showLens(lineBox(n), 'hit');
    pose('alert');
    say('아직 불안해');
  }
  await sleep(750);""",
)

i = s.index("async function fixAll() {")
j = s.index("// 완료 후 카드를 누르면")
s = (
    s[:i]
    + """async function fixAll() {
  if (state.phase !== 'done') return;
  state.phase = 'fixing';
  els.fixBtn.disabled = true;
  els.fixBtn.textContent = '고치는 중…';
  els.spot.classList.add('on');
  setStatus('수정안 만드는 중', 'live');
  if (!live.fixRequested && !live.fixes.length && !live.pr && !live.fixEnd) {
    live.fixRequested = true;
    dispatchEvent(new CustomEvent('patchi:fix'));
  }
  try {
    for (let k = 0; ; k++) {
      await until(() => live.fixes[k] || live.pr || live.fixEnd || live.failed);
      if (live.failed) return fail();
      const e = live.fixes[k];
      if (!e) break;
      const f = state.findings.find(x => x.id === e.findingId);
      if (!f) continue;
      f.fix = e.hunks;
      setStatus(`수정 중 · ${k + 1}/${state.findings.length}`, 'live');
      if (state.file !== f.file) {
        await switchFile(f.file, FILES[f.file].rows.indexOf(f.row));
      }
      await applyFix(f);
    }
    setStatus('PR 여는 중', 'live');
    await until(() => live.pr || live.fixEnd || live.failed);
    if (live.failed) return fail();
  } catch (e) {
    if (e !== 'abort') throw e;
    return;
  }
  els.spot.classList.remove('on');
  els.fixBtn.disabled = false;
  if (!live.pr) {
    // 수정안을 하나도 못 만들었거나 PR 을 열지 못했다. 결과 화면은 그대로 두고 이유만 알린다
    state.phase = 'ended';
    pose('alert');
    say('');
    els.fixBtn.disabled = true;
    els.fixBtn.textContent = live.fixEndMessage;
    setStatus('PR 없음');
    return;
  }
  state.phase = 'fixed';
  pose('happy');
  say('PR 보냈어!');
  setTimeout(() => { if (state.phase === 'fixed') { say(''); pose(); } }, 1800);
  els.fixBtn.classList.add('done');
  els.fixBtn.textContent = live.pr.number ? `PR #${live.pr.number} 열기 ↗` : 'PR 열기 ↗';
  const fixed = state.findings.filter(f => f.card.classList.contains('fixed')).length;
  els.sumL.innerHTML = `${fixed} fixed · <span class="plus">+${state.added}</span> <span class="minus">−${state.removed}</span>`;
  setStatus('PR 생성됨', 'done');
}

"""
    + s[j:]
)

rep("  showLens(box, f.fixedRow ? 'ok' : 'hit');", "  showLens(box, f.fixedRow && live.verify.get(f.id) !== false ? 'ok' : 'hit');")

# 다시 접속해 처음부터 재생할 때 숨겼던 버튼을 되살린다
rep("  els.fixBtn.textContent = '모두 고치고 PR 열기';", "  els.fixBtn.textContent = '모두 고치고 PR 열기';\n  els.fixBtn.hidden = false;")

# ---------- 컨트롤 ----------
rep(
    """function togglePause() {
  if (state.phase === 'idle') return run();""",
    """function togglePause() {""",
)
rep(
    "$('startBtn').onclick = run;\nels.fixBtn.onclick = fixAll;",
    "els.fixBtn.onclick = () => (live.pr ? open(live.pr.url, '_blank', 'noopener') : fixAll());",
)
rep("  else if (e.key === 'r' || e.key === 'R') run();\n", "")

# 시작 화면: 파일이 아직 없으므로 첫 파일을 그리지 않는다
rep(
    """  reset();
  state.file = 0;
  renderTree();
  renderFile(0);
});""",
    """  reset();
  ready = true;
  queue.splice(0).forEach(onEvent);
});

// ---------- 이벤트 ----------
const params = new URLSearchParams(location.search);
const back = params.get('back') || '/';
$('backLink').href = $('introBack').href = back;
$('reportLink').href = params.get('report') || back;
let live;

function freshLive() {
  return { order: [], done: new Set(), finished: false, failed: '', fixes: [], verify: new Map(), pr: null, fixRequested: false, fixEnd: '', fixEndMessage: '' };
}
live = freshLive();

function setRepo(repo, branch) {
  const [owner, name] = (repo || '').split('/');
  $('crumb').innerHTML = name ? `${esc(owner)} / <b>${esc(name)}</b>` : `<b>${esc(repo || '')}</b>`;
  $('branch').textContent = branch || '';
  $('branch').hidden = !branch;
  $('introRepo').textContent = repo || '';
}
setRepo(params.get('repo'), params.get('branch'));

function onEvent(e) {
  switch (e.type) {
    case 'scan.progress':
      // 백엔드가 아직 클론·탐지·분류 중일 때. 인트로에 진행 상황만 보여 준다
      if (state.phase !== 'idle') break;
      setRepo(e.repo, e.branch);
      $('introText').textContent = e.message;
      setStatus(e.status, 'live');
      break;
    case 'scan.started': {
      // 다시 접속하면 처음부터 다시 받는다. 그때도 처음부터 연출한다
      live = freshLive();
      FILES = e.files.map(f => ({ path: f.path, lines: f.content.split('\\n'), nums: f.nums || null, notes: {}, rows: [] }));
      setRepo(e.repo, e.branch);
      $('introText').textContent = `${FILES.length} files · ${e.branch}`;
      run();
      break;
    }
    case 'file.scanning': live.order.push(e.path); break;
    case 'file.done': live.done.add(e.path); break;
    case 'line.inspected': {
      const f = FILES.find(x => x.path === e.path);
      if (f && !f.notes[e.line]) f.notes[e.line] = { token: e.token, safe: e.note || '안전해' };
      break;
    }
    case 'finding.detected': {
      const x = e.finding, f = FILES.find(y => y.path === x.path);
      if (f) f.notes[x.line] = { token: x.token, finding: { id: x.id, sev: x.severity, title: x.title, desc: x.description } };
      break;
    }
    case 'scan.finished': live.finished = true; break;
    case 'fix.applied': live.fixes.push(e); break;
    case 'verify.result': live.verify.set(e.findingId, e.blocked); break;
    case 'fix.ended': live.fixEnd = 'ended'; live.fixEndMessage = e.message; break;
    case 'pr.created': live.pr = e; break;
    case 'scan.failed':
      live.failed = e.message || '스캔에 실패했어요';
      // 연출이 돌고 있으면 그 루프가 실패를 보고 멈춘다
      if (!FILES.length || state.phase === 'idle') fail();
      break;
  }
}

/** 실패하면 연출을 멈추고 이유와 돌아갈 길을 보여 준다 */
function fail(message) {
  if (message) live.failed = message;
  ++gen;
  if (state) state.phase = 'failed';
  els.spot.classList.remove('on');
  say('');
  pose('alert');
  setStatus('실패');
  $('introText').textContent = live.failed;
  $('introText').classList.add('err');
  $('introBack').hidden = false;
  els.intro.classList.remove('out');
}

// 글자 폭을 재기 전에 온 이벤트는 모아 뒀다가 넘긴다
let ready = false;
const queue = [];
window.patchiScan = { push: e => (ready ? onEvent(e) : queue.push(e)) };
dispatchEvent(new CustomEvent('patchi:ready'));""",
)

open(dst, "w", encoding="utf-8").write(s)
print("ok", len(s))

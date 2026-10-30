// 로그인 없이 둘러보기(scan.html?feed=demo)가 재생할 이벤트. mock-backend.mjs 와 같은 순서·간격
//   node scripts/build-demo-timeline.mjs > public/demo-scan.json
import { DEMO_FILES, DEMO_FINDINGS, DEMO_PROOFS, DEMO_SAFE_CHECKS } from "../src/lib/fixtures/demo.ts";
const scale = Number(process.argv[2] ?? 1);
const scan = [], fix = [];
let t = 600;
const at = (list, event) => list.push({ at: Math.round(t * scale), event });
at(scan, { type: "scan.started", repo: "acme/shop-web", branch: "main", files: DEMO_FILES });
for (const file of DEMO_FILES) {
  at(scan, { type: "file.scanning", path: file.path });
  file.content.split("\n").forEach((_, i) => {
    const line = i + 1; t += 40;
    const safe = DEMO_SAFE_CHECKS.find((c) => c.path === file.path && c.line === line);
    if (safe) { at(scan, { type: "line.inspected", verdict: "safe", ...safe }); t += 800; }
    const found = DEMO_FINDINGS.find(({ finding }) => finding.path === file.path && finding.line === line);
    if (found) { at(scan, { type: "finding.detected", finding: found.finding }); t += 1000;
      at(scan, { type: "exploit.result", findingId: found.finding.id, exploitable: true, evidence: DEMO_PROOFS[found.finding.id].exploit }); }
  });
  at(scan, { type: "file.done", path: file.path });
}
at(scan, { type: "scan.finished" });
t = 0;
for (const { finding, fix: hunks } of DEMO_FINDINGS) {
  at(fix, { type: "fix.applied", findingId: finding.id, path: finding.path, hunks }); t += 1200;
  at(fix, { type: "verify.result", findingId: finding.id, blocked: true, evidence: DEMO_PROOFS[finding.id].recheck }); t += 600;
}
at(fix, { type: "pr.created", number: 128, url: "https://github.com/acme/shop-web/pull/128", title: "Fix 4 security issues" });
process.stdout.write(JSON.stringify({ scan, fix }));

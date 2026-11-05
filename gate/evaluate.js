'use strict';
// Quality-gate evaluator for the CPS 5981 Unit 10 pipeline.
// Reads the JSON rule block from gate-policy.md, reads every raw scanner output,
// applies the policy, writes run-output/gate-decision.md, and exits 1 if
// anything is decided "block". You do not need to edit this file.
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'run-output');
const DAST = path.join(ROOT, 'dast');

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

function loadPolicy() {
  const md = fs.readFileSync(path.join(ROOT, 'gate-policy.md'), 'utf8');
  const m = md.match(/```json\s*([\s\S]*?)```/);
  if (!m) throw new Error('gate-policy.md has no ```json rule block');
  return JSON.parse(m[1]);
}

const DECISIONS = ['block', 'warn', 'record'];

function collect() {
  const findings = [];
  const missing = [];

  // Security tests: the workflow passes the step outcome in an env var.
  const testOutcome = process.env.SECURITY_TESTS_OUTCOME || 'unknown';
  const tap = fs.existsSync(path.join(OUT, 'security-tests.tap'))
    ? fs.readFileSync(path.join(OUT, 'security-tests.tap'), 'utf8') : '';
  const failed = tap.split('\n').filter((l) => /^\s*not ok \d+/.test(l));
  if (testOutcome === 'failure' || failed.length) {
    (failed.length ? failed : ['not ok - security test step failed']).forEach((l) =>
      findings.push({ source: 'security_tests', level: 'fail', id: l.replace(/^\s*not ok \d+ - /, '').trim(), where: 'security-tests/' }));
  }
  if (!tap) missing.push('run-output/security-tests.tap');

  // Secrets: gitleaks JSON report (array).
  const gl = readJson(path.join(OUT, 'gitleaks.json'));
  if (gl === null) missing.push('run-output/gitleaks.json');
  (gl || []).forEach((f) => findings.push({
    // The fingerprint (commit:file:rule:line) names ONE leak. Exceptions must use it,
    // or they would silently excuse every future leak of the same kind.
    source: 'secrets', level: 'any', id: f.Fingerprint || f.RuleID,
    where: `${f.RuleID} in ${f.File}:${f.StartLine} (commit ${(f.Commit || '?').slice(0, 7)})`
  }));

  // SAST: Semgrep JSON.
  const sg = readJson(path.join(OUT, 'semgrep.json'));
  if (sg === null) missing.push('run-output/semgrep.json');
  ((sg && sg.results) || []).forEach((r) => findings.push({
    source: 'sast', level: r.extra.severity, id: r.check_id.split('.').pop(), where: `${r.path}:${r.start.line}`
  }));

  // SCA: npm audit JSON (npm 7+ format).
  const na = readJson(path.join(OUT, 'npm-audit.json'));
  if (na === null) missing.push('run-output/npm-audit.json');
  Object.values((na && na.vulnerabilities) || {}).forEach((v) => {
    // Each advisory carries its own severity; a package with no direct advisory
    // inherits the severity of the dependency that makes it vulnerable.
    const adv = (v.via || []).filter((x) => typeof x === 'object');
    if (!adv.length) {
      findings.push({ source: 'sca', level: v.severity, id: v.name, where: `${v.name}@${v.range} (via ${(v.via || []).join(', ')})` });
    }
    adv.forEach((a) => findings.push({
      source: 'sca', level: a.severity || v.severity, id: (a.url || '').split('/').pop() || a.title,
      where: `${v.name} ${a.range || v.range}`
    }));
  });

  // DAST: ZAP baseline JSON.
  const zap = readJson(path.join(DAST, 'zap-baseline.json'));
  if (zap === null) missing.push('dast/zap-baseline.json');
  const RISK = { 3: 'high', 2: 'medium', 1: 'low', 0: 'informational' };
  ((zap && zap.site) || []).forEach((site) => (site.alerts || []).forEach((a) => findings.push({
    source: 'dast', level: RISK[a.riskcode] || 'informational', id: `${a.pluginid} ${a.name}`, where: `${a.count} instance(s)`
  })));

  return { findings, missing };
}

function decide(policy, findings) {
  const today = new Date().toISOString().slice(0, 10);
  return findings.map((f) => {
    const exc = (policy.exceptions || []).find((e) =>
      e.source === f.source && (e.id === f.id || f.id.includes(e.id)) && (!e.expires || e.expires >= today));
    if (exc) {
      return { ...f, decision: exc.decision || 'record', why: `exception: ${exc.reason} (approved by ${exc.approved_by || '?'}, expires ${exc.expires || 'never'})` };
    }
    const rule = (policy.rules[f.source] || {})[f.level];
    const decision = DECISIONS.includes(rule) ? rule : 'block';
    return { ...f, decision, why: rule ? `rule ${f.source}.${f.level}` : `no rule for ${f.source}.${f.level} - default block` };
  });
}

function main() {
  const policy = loadPolicy();
  const { findings, missing } = collect();
  const decided = decide(policy, findings);
  const count = (d) => decided.filter((f) => f.decision === d).length;
  const blocked = count('block') > 0 || missing.length > 0;

  const lines = [];
  lines.push(`# Gate decision: ${blocked ? 'BLOCKED' : 'PASSED'}`);
  lines.push('');
  lines.push(`| Item | Value |`);
  lines.push(`|---|---|`);
  lines.push(`| Policy version | ${policy.policy_version} |`);
  lines.push(`| Policy owner | ${policy.owner} |`);
  lines.push(`| Run ID | ${process.env.GITHUB_RUN_ID || 'local'} |`);
  lines.push(`| Commit | ${process.env.GITHUB_SHA || 'local'} |`);
  lines.push(`| Findings | ${decided.length} (block ${count('block')}, warn ${count('warn')}, record ${count('record')}) |`);
  lines.push('');
  if (missing.length) {
    lines.push('## Missing evidence (blocks the gate)');
    missing.forEach((m) => lines.push(`- ${m} was not produced - a check that did not run is not a check that passed`));
    lines.push('');
  }
  lines.push('| Decision | Source | Level | Finding | Where | Why |');
  lines.push('|---|---|---|---|---|---|');
  ['block', 'warn', 'record'].forEach((d) => decided.filter((f) => f.decision === d).forEach((f) =>
    lines.push(`| ${d.toUpperCase()} | ${f.source} | ${f.level} | ${String(f.id).replace(/\|/g, '/')} | ${f.where} | ${f.why} |`)));
  lines.push('');
  lines.push('> A clean run is not evidence of assurance. It is evidence that these checks did not fire.');

  const text = lines.join('\n');
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'gate-decision.md'), text);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, text + '\n');
  console.log(text);
  process.exit(blocked ? 1 : 0);
}

main();

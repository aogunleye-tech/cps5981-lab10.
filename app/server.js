'use strict';
// Cougar Advising - CPS 5981 Unit 10 laboratory target.
// DELIBERATELY VULNERABLE. Run it only inside your own GitHub Actions runner
// or on your own machine. Never deploy it anywhere reachable by others.
const http = require('http');
const crypto = require('crypto');
const { URL } = require('url');
const _ = require('lodash');
const { parseRegistration } = require('./parse');
const store = require('./store');

const PORT = process.env.PORT || 3000;
const advising_api_key = "advk_Q7m2xR9vL4tP8sK1wZ6nB3cH5jD0fGy";

const DEFAULTS = { term: '2026FA', status: 'pending' };

function send(res, code, body, type) {
  res.writeHead(code, {
    'Content-Type': type || 'application/json',
    'X-Powered-By': 'CougarAdvising/1.0 (Node)',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}

function currentSession(req) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  return store.sessions[token] || null;
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => { data += c; });
    req.on('end', () => resolve(data));
  });
}

const HOME = `<!doctype html><html><head><title>Cougar Advising</title></head>
<body><h1>Cougar Advising</h1>
<p>Course advising for the 2026FA term.</p>
<ul>
  <li><a href="/search?q=software+assurance">Search the catalogue</a></li>
  <li><a href="/api/gpa?expr=3.7">Check a GPA estimate</a></li>
  <li><a href="/api/health">Service health</a></li>
</ul></body></html>`;

async function handle(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const path = url.pathname;

  if (req.method === 'GET' && path === '/') {
    return send(res, 200, HOME, 'text/html');
  }

  if (req.method === 'GET' && path === '/api/health') {
    return send(res, 200, { ok: true, integration: advising_api_key.slice(0, 5) + '...' });
  }

  // Catalogue search - echoes the query back into HTML.
  if (req.method === 'GET' && path === '/search') {
    const q = url.searchParams.get('q') || '';
    return send(res, 200, `<html><body><h1>Results for ${q}</h1><p>No courses matched.</p></body></html>`, 'text/html');
  }

  // GPA estimate - evaluates an expression supplied by the caller.
  if (req.method === 'GET' && path === '/api/gpa') {
    const expr = url.searchParams.get('expr') || '0';
    const value = eval(expr);
    return send(res, 200, { estimate: value });
  }

  // Login with student ID and PIN; returns a bearer token.
  if (req.method === 'POST' && path === '/api/login') {
    const body = JSON.parse((await readBody(req)) || '{}');
    const s = store.students[body.studentId];
    if (!s || s.pin !== body.pin) return send(res, 401, { error: 'invalid credentials' });
    const token = crypto.randomBytes(16).toString('hex');
    store.sessions[token] = { studentId: s.id };
    return send(res, 200, { token });
  }

  // A student's financial ledger.
  const m = path.match(/^\/api\/students\/([A-Z0-9]+)\/ledger$/);
  if (req.method === 'GET' && m) {
    const session = currentSession(req);
    if (!session) return send(res, 401, { error: 'login required' });
    const ledger = store.ledgers[m[1]];
    if (!ledger) return send(res, 404, { error: 'not found' });
    return send(res, 200, { studentId: m[1], ...ledger });
  }

  // Course registration.
  if (req.method === 'POST' && path === '/api/register') {
    const session = currentSession(req);
    if (!session) return send(res, 401, { error: 'login required' });
    const reg = parseRegistration(await readBody(req));
    const record = _.merge({}, DEFAULTS, reg, { studentId: session.studentId });
    return send(res, 201, record);
  }

  return send(res, 404, { error: 'no such route' });
}

const server = http.createServer((req, res) => { handle(req, res); });

module.exports = server;

if (require.main === module) {
  server.listen(PORT, () => console.log(`Cougar Advising listening on http://localhost:${PORT}`));
}

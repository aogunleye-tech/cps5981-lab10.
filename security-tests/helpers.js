'use strict';
// Starts the app on a random free port for each test file and gives you
// small helpers for making requests. You do not need to edit this file.
const server = require('../app/server');

let base = null;

async function start() {
  if (base) return base;
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
  return base;
}

function stop() {
  return new Promise((r) => server.close(() => { base = null; r(); }));
}

async function login(studentId, pin) {
  const res = await fetch(`${base}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentId, pin })
  });
  const body = await res.json();
  return body.token;
}

function get(path, token) {
  return fetch(`${base}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
}

module.exports = { start, stop, login, get };

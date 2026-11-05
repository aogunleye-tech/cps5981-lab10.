'use strict';
// WORKED EXAMPLE - read this before writing your own tests.
//
// Requirement : SR-AUTH-01  "A ledger is never returned to an unauthenticated caller."
//               (replace with the matching ID from your Unit 3 SRS)
// Property    : no bearer token  =>  HTTP 401 and no ledger fields in the body.
// Proves      : under this test, an anonymous GET of one known ledger URL is refused.
// Does NOT prove: that every route is protected, or that a logged-in student
//               is limited to their own ledger. That second gap is yours to test.
const test = require('node:test');
const assert = require('node:assert/strict');
const { start, stop, get } = require('./helpers');

test.before(start);
test.after(stop);

test('SR-AUTH-01: anonymous caller cannot read a ledger', async () => {
  const res = await get('/api/students/S1001/ledger');
  assert.equal(res.status, 401);
  const body = await res.json();
  assert.equal(body.balance, undefined, 'ledger data leaked to an anonymous caller');
});

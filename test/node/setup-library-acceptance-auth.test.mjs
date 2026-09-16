import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseEnvText,
  setEnvValues,
  validateRoleType,
  discoverBookFixture,
} from '../../scripts/setup-library-acceptance-auth.mjs';

test('parseEnvText preserves simple key/value pairs', () => {
  assert.deepEqual(parseEnvText('A=1\nB="two"\n# comment\n'), { A: '1', B: 'two' });
});

test('setEnvValues replaces existing values and appends missing keys without exposing secrets elsewhere', () => {
  const input = 'A=1\nE2E_ADMIN_PASSWORD=secret\n';
  const output = setEnvValues(input, { A: '2', E2E_BOOK_ID: 'doc-123' });
  assert.match(output, /^A=2$/m);
  assert.match(output, /^E2E_ADMIN_PASSWORD=secret$/m);
  assert.match(output, /^E2E_BOOK_ID=doc-123$/m);
});

test('validateRoleType accepts Administrator or Super Administrator for the admin slot', () => {
  assert.equal(validateRoleType('administrator', 'administrator'), true);
  assert.equal(validateRoleType('administrator', 'super-administrator'), true);
  assert.equal(validateRoleType('administrator', 'librarian'), false);
  assert.equal(validateRoleType('student', 'student'), true);
});

test('discoverBookFixture selects a published book using the first credential that can read books', async () => {
  const calls = [];
  const fakeFetch = async (url, options = {}) => {
    calls.push([String(url), options.headers?.Authorization ?? '']);
    if ((options.headers?.Authorization ?? '') === 'Bearer librarian-token') {
      return new Response(JSON.stringify({
        data: [{ id: 41, documentId: 'book-doc-41', title: 'Fixture Book' }],
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    return new Response(JSON.stringify({ error: { message: 'Forbidden' } }), {
      status: 403,
      headers: { 'content-type': 'application/json' },
    });
  };

  const fixture = await discoverBookFixture(fakeFetch, 'http://localhost:1337', [
    { label: 'student', jwt: 'student-token' },
    { label: 'librarian', jwt: 'librarian-token' },
  ]);

  assert.deepEqual(fixture, {
    bookId: 'book-doc-41',
    bookDocumentId: 'book-doc-41',
    title: 'Fixture Book',
    sourceRole: 'librarian',
  });
  assert.equal(calls.length, 2);
});

import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runSetup } from '../../scripts/setup-library-acceptance-auth.mjs';

test('runSetup verifies four roles and writes only read-only dynamic fixtures', async () => {
  const cwd = mkdtempSync(join(tmpdir(), 'sncbt-e2e-setup-'));
  writeFileSync(join(cwd, '.env.e2e.example'), 'E2E_ALLOW_WRITES=false\n');
  writeFileSync(join(cwd, '.env.e2e.local'), [
    'E2E_BACKEND_URL=http://localhost:1337',
    'E2E_ADMIN_USERNAME=admin-test',
    'E2E_ADMIN_PASSWORD=admin-pass',
    'E2E_LIBRARIAN_USERNAME=librarian-test',
    'E2E_LIBRARIAN_PASSWORD=librarian-pass',
    'E2E_STUDENT_USERNAME=student-test',
    'E2E_STUDENT_PASSWORD=student-pass',
    'E2E_FACULTY_USERNAME=faculty-test',
    'E2E_FACULTY_PASSWORD=faculty-pass',
    'E2E_ALLOW_WRITES=true',
    '',
  ].join('\n'));

  const roleByToken = {
    'token-admin-test': { id: 5, role: { id: 8, name: 'Administrator', type: 'administrator' } },
    'token-librarian-test': { id: 3, role: { id: 6, name: 'Librarian', type: 'librarian' } },
    'token-student-test': { id: 11, role: { id: 4, name: 'Student', type: 'student' } },
    'token-faculty-test': { id: 16, role: { id: 5, name: 'Faculty', type: 'faculty' } },
  };

  const fakeFetch = async (url, options = {}) => {
    const target = String(url);
    if (target.endsWith('/api/auth/local')) {
      const body = JSON.parse(options.body);
      return new Response(JSON.stringify({ jwt: `token-${body.identifier}` }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    if (target.includes('/api/users/me')) {
      const token = String(options.headers?.Authorization ?? '').replace('Bearer ', '');
      return new Response(JSON.stringify({ username: 'fixture', ...roleByToken[token] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    if (target.includes('/api/books')) {
      const token = String(options.headers?.Authorization ?? '').replace('Bearer ', '');
      if (token === 'token-librarian-test') {
        return new Response(JSON.stringify({ data: [{ id: 77, documentId: 'fixture-book-doc', title: 'Acceptance Fixture' }] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      return new Response('{}', { status: 403, headers: { 'content-type': 'application/json' } });
    }
    return new Response('{}', { status: 404, headers: { 'content-type': 'application/json' } });
  };

  await runSetup({ cwd, fetchImpl: fakeFetch, target: 'localhost' });
  const configured = parseEnvText(readFileSync(join(cwd, '.env.e2e.local'), 'utf8'));
  assert.equal(configured.E2E_BOOK_DOCUMENT_ID, 'fixture-book-doc');
  assert.equal(configured.E2E_BOOK_ID, 'fixture-book-doc');
  assert.equal(configured.E2E_ADMIN_USER_ID, '5');
  assert.equal(configured.E2E_ADMIN_ROLE_ID, '8');
  assert.equal(configured.E2E_ALLOW_WRITES, 'false');
  assert.equal(configured.E2E_ADMIN_PASSWORD, 'admin-pass');
});

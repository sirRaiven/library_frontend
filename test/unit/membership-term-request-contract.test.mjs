import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('app/pages/librarian/students.vue', 'utf8');

test('Register Student reuses a successfully loaded membership term instead of forcing a duplicate GET', () => {
  const match = source.match(/async function openRegistrationModal\(\)[\s\S]*?\n}\n/);
  assert.ok(match, 'openRegistrationModal must exist');
  assert.match(match[0], /await termManager\.load\(\);/);
  assert.doesNotMatch(match[0], /termManager\.load\(true\)/);
});

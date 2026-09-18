import { readFile } from 'node:fs/promises';
const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const requiredScripts = [
  'test','test:watch','test:unit','test:nuxt','test:e2e:chromium','test:e2e:firefox','test:e2e:webkit',
  'test:e2e','test:live','test:regression','test:full','test:browsers:install','verify:test-dependencies',
  'verify:security','build:production'
];
const requiredDeps = ['@nuxt/test-utils','vitest','@vue/test-utils','happy-dom','playwright-core'];
const missingScripts = requiredScripts.filter(k => !pkg.scripts?.[k]);
const allDeps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
const missingDeps = requiredDeps.filter(k => !allDeps[k]);
if (missingScripts.length || missingDeps.length) {
  if (missingScripts.length) console.error('Missing scripts:', missingScripts.join(', '));
  if (missingDeps.length) console.error('Missing test dependencies:', missingDeps.join(', '));
  process.exit(1);
}
if (!pkg.scripts['test:e2e'].includes('&&')) {
  console.error('test:e2e is not using the sequential browser runner.');
  process.exit(1);
}
if (!pkg.scripts['test:browsers:install'].startsWith('playwright-core ')) {
  console.error('Browser install command is not using playwright-core.');
  process.exit(1);
}
console.log('Phase 12 testing restoration verification PASSED');

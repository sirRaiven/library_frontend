import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packagePath = resolve(root, 'package.json');
const lockPath = resolve(root, 'package-lock.json');
const pkg = JSON.parse(await readFile(packagePath, 'utf8'));

pkg.scripts = {
  ...pkg.scripts,
  test: 'vitest --run --project unit --project nuxt',
  'test:watch': 'vitest --watch --project unit --project nuxt',
  'test:unit': 'vitest --run --project unit',
  'test:nuxt': 'vitest --run --project nuxt',
  'test:e2e:chromium': 'vitest --run --project e2e-chromium',
  'test:e2e:firefox': 'vitest --run --project e2e-firefox',
  'test:e2e:webkit': 'vitest --run --project e2e-webkit',
  'test:e2e': 'npm run test:e2e:chromium && npm run test:e2e:firefox && npm run test:e2e:webkit',
  'test:live': 'vitest --run --project live',
  'test:regression': 'npm run test:unit && npm run test:nuxt && npm run test:e2e:chromium',
  'test:full': 'npm run test:unit && npm run test:nuxt && npm run test:e2e',
  'test:browsers:install': 'playwright-core install chromium firefox webkit',
  'verify:test-dependencies': 'node scripts/verify-test-dependencies.mjs'
};

const required = [
  '@nuxt/test-utils',
  'vitest',
  '@vue/test-utils',
  'happy-dom',
  'playwright-core'
];

pkg.devDependencies ??= {};
let lock = null;
if (existsSync(lockPath)) {
  try { lock = JSON.parse(await readFile(lockPath, 'utf8')); } catch {}
}

async function resolveVersion(name) {
  if (pkg.devDependencies?.[name]) return pkg.devDependencies[name];
  if (pkg.dependencies?.[name]) return pkg.dependencies[name];

  const rootDecl = lock?.packages?.['']?.devDependencies?.[name]
    ?? lock?.packages?.['']?.dependencies?.[name];
  if (rootDecl) return rootDecl;

  const lockedVersion = lock?.packages?.[`node_modules/${name}`]?.version;
  if (lockedVersion) return `^${lockedVersion}`;

  try {
    const installed = JSON.parse(await readFile(resolve(root, 'node_modules', name, 'package.json'), 'utf8'));
    if (installed.version) return `^${installed.version}`;
  } catch {}
  return null;
}

const unresolved = [];
for (const name of required) {
  if (pkg.devDependencies[name] || pkg.dependencies?.[name]) continue;
  const version = await resolveVersion(name);
  if (version) pkg.devDependencies[name] = version;
  else unresolved.push(name);
}

await writeFile(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);

console.log('Restored SNCBT testing scripts while preserving Phase 12 production-security scripts.');
if (unresolved.length) {
  console.warn(`Could not infer versions for: ${unresolved.join(', ')}`);
  console.warn(`Run: npm install -D ${unresolved.join(' ')}`);
}

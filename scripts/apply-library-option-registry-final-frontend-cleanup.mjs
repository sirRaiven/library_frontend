import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const apply = process.argv.includes('--apply')
const confirm = process.argv.find(arg => arg.startsWith('--confirm='))?.slice('--confirm='.length)
const required = 'REMOVE_RETIRED_LIBRARY_FRONTEND_REFERENCE_LAYER'
const paths = [
  'app/composables/useReferenceData.ts',
  'docs/LIBRARY_OPTION_REGISTRY_V2_RUNBOOK.md',
  'docs/LIBRARY_OPTION_REGISTRY_V2_PAGE_TESTING.md',
  'test/unit/library-option-registry-v2-task16-artifacts-contract.test.mjs',
]

const existing = paths.filter(relative => fs.existsSync(path.join(root, relative)))
console.log(`Retired frontend path(s) present: ${existing.length}`)
for (const relative of existing) console.log(`- ${relative}`)

if (!apply) {
  console.log('Preview only. No files were removed.')
  process.exit(0)
}
if (confirm !== required) {
  console.error(`Refusing cleanup. Re-run with --confirm=${required}`)
  process.exit(2)
}
for (const relative of existing) fs.rmSync(path.join(root, relative), { recursive: true, force: true })
for (const relative of paths) {
  if (fs.existsSync(path.join(root, relative))) {
    console.error(`Cleanup postcondition failed: ${relative}`)
    process.exit(3)
  }
}
console.log(`Removed ${existing.length} retired frontend path(s). Final frontend cleanup postcondition passed.`)

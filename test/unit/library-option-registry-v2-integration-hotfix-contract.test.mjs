import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read = (p) => fs.readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8')

test('Task 11 composable exists and exposes fixed semester options', () => {
  const path = new URL('../../app/composables/useLibraryOptions.ts', import.meta.url)
  assert.equal(fs.existsSync(path), true)
  const source = fs.readFileSync(path, 'utf8')
  assert.match(source, /semesters/)
  assert.match(source, /loadOperational/)
  assert.match(source, /withHistoricalValue/)
  assert.match(source, /value/)
  assert.match(source, /label/)
})

test('Task 14 semester pages use V2 library options and no academic-semester relation code', () => {
  for (const file of [
    'app/pages/admin/settings.vue',
    'app/pages/librarian/membership-term.vue',
    'app/pages/librarian/memberships.vue',
  ]) {
    const source = read(file)
    assert.match(source, /useLibraryOptions\(\)/)
    assert.match(source, /libraryOptions\.semesters\.value/)
    assert.doesNotMatch(source, /referenceData\.academicSemesters/)
    assert.doesNotMatch(source, /academicSemesterCode/)
  }
})

test('Nuxt project allows enough setup time on Windows and runs serially', () => {
  const source = read('vitest.config.ts')
  const start = source.indexOf('name: "nuxt"')
  assert.notEqual(start, -1)
  const block = source.slice(start, start + 700)
  assert.match(block, /hookTimeout:/)
  assert.match(block, /fileParallelism:\s*false/)
  assert.match(block, /maxWorkers:\s*1/)
})


test('Task 11 loaders match the V2 Promise<void> contract and membership term has no academic-semester code', () => {
  const options = read('app/composables/useLibraryOptions.ts')
  const termApi = read('app/composables/useMembershipTerm.ts')
  assert.doesNotMatch(options, /return publicPayload\.value/)
  assert.doesNotMatch(options, /return operationalPayload\.value/)
  assert.doesNotMatch(termApi, /academicSemesterCode/)
})

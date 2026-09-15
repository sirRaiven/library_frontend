import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')

test('admin settings uses fixed V2 semester options directly', () => {
  const src = read('app/pages/admin/settings.vue')
  assert.match(src, /const\s+libraryOptions\s*=\s*useLibraryOptions\(\)/)
  assert.doesNotMatch(src, /useReferenceData\(\)/)
  assert.match(src, /v-model="forms\.general\.currentSemester"/)
  assert.match(src, /:items="libraryOptions\.semesters\.value"/)
  assert.doesNotMatch(src, /academicSemesterCode/)
})

test('membership term saves authoritative semester string without academic-semester lookup code', () => {
  const page = read('app/pages/librarian/membership-term.vue')
  const composable = read('app/composables/useMembershipTerm.ts')
  assert.match(page, /const\s+libraryOptions\s*=\s*useLibraryOptions\(\)/)
  assert.doesNotMatch(page, /useReferenceData\(\)/)
  assert.match(page, /v-model="form\.semester"/)
  assert.match(page, /:items="libraryOptions\.semesters\.value"/)
  assert.doesNotMatch(page, /academicSemesterCode/)
  assert.doesNotMatch(composable, /academicSemesterCode:\s*string;/)
  assert.match(composable, /body:\s*\{\s*data:\s*input\s*\}/)
})

test('membership filters use non-empty sentinel and never send it as semester', () => {
  const src = read('app/pages/librarian/memberships.vue')
  assert.match(src, /const\s+libraryOptions\s*=\s*useLibraryOptions\(\)/)
  assert.match(src, /const\s+ALL_SEMESTERS\s*=\s*["']__all__["']/)
  assert.match(src, /semesterFilter\.value\s*===\s*ALL_SEMESTERS\s*\?\s*["']{2}\s*:\s*semesterFilter\.value/)
  assert.match(src, /libraryOptions\.semesters\.value/)
  assert.doesNotMatch(src, /useReferenceData\(\)/)
})

test('student library card semester fallback is stored membership -> current term -> Not recorded', () => {
  const src = read('app/pages/student/library-card.vue')
  assert.match(src, /const\s+membershipSemester\s*=\s*computed/)
  assert.match(src, /membership\.semester/)
  assert.match(src, /currentAcademicTerm\?\.semesterName/)
  assert.match(src, /Not recorded/)
  assert.match(src, /\{\{\s*membershipSemester\s*\}\}/)
})

test('task 14 direct option consumers expose retryable loading errors', () => {
  for (const file of [
    'app/pages/admin/settings.vue',
    'app/pages/librarian/membership-term.vue',
    'app/pages/librarian/memberships.vue',
  ]) {
    const src = read(file)
    assert.match(src, /libraryOptions\.error\.value/, `${file} must surface option errors`)
    assert.match(src, /Retry/, `${file} must expose Retry`)
    assert.match(src, /libraryOptions\.loadOperational\(\)/, `${file} must reload operational options`)
  }
})

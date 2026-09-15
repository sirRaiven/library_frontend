import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')
const exists = (file) => fs.existsSync(path.join(root, file))

const pages = [
  'app/pages/student-registration.vue',
  'app/pages/librarian/students.vue',
  'app/pages/librarian/faculty.vue',
  'app/pages/admin/users/index.vue',
  'app/pages/admin/librarians/create.vue',
  'app/pages/librarian/books/index.vue',
  'app/pages/librarian/books/register.vue',
  'app/pages/librarian/books/[id]/edit.vue',
  'app/pages/student/books/index.vue',
  'app/pages/faculty/books/index.vue',
  'app/pages/admin/settings.vue',
  'app/pages/librarian/membership-term.vue',
  'app/pages/librarian/memberships.vue',
  'app/pages/librarian/reports.vue',
  'app/pages/admin/reports.vue',
]

test('final frontend removes the legacy reference-data composable', () => {
  assert.equal(exists('app/composables/useReferenceData.ts'), false)
  for (const file of pages) assert.doesNotMatch(read(file), /useReferenceData\(\)/, file)
})

test('all direct option consumers use the final option registry', () => {
  for (const file of pages) assert.match(read(file), /useLibraryOptions\(\)/, file)
})

test('student choices use program registry plus educational-level year derivation', () => {
  for (const file of ['app/pages/student-registration.vue', 'app/pages/librarian/students.vue']) {
    const source = read(file)
    assert.match(source, /programsForEducationalLevel/)
    assert.match(source, /yearLevelsForEducationalLevel/)
    assert.doesNotMatch(source, /yearLevelsForProgram/)
  }
})

test('final option composable exposes academic terms and historical support', () => {
  const source = read('app/composables/useLibraryOptions.ts')
  for (const marker of ['academicTerms', 'currentAcademicTerm', 'withHistoricalValue', 'semesters']) {
    assert.match(source, new RegExp(marker))
  }
})

test('final frontend has no retired relation identifiers', () => {
  const retired = [
    'academicSemesterCode', 'educational_level_ref', 'academic_program', 'program_year_level',
    'department_ref', 'employment_type_ref', 'position_ref', 'category_ref', 'shelf_location_ref', 'academic_semester',
  ]
  for (const file of pages.concat(['app/composables/useLibraryOptions.ts', 'app/composables/useMembershipTerm.ts'])) {
    const source = read(file)
    for (const marker of retired) assert.equal(source.includes(marker), false, `${file}: ${marker}`)
  }
})

import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import assert from 'node:assert/strict'

const root = process.cwd()
const overlayOnly = process.env.LIBRARY_V2_TASK14_16_OVERLAY === '1'
const exists = (file) => fs.existsSync(path.join(root, file))
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')

const ROUTES = [
  ['/student-registration', 'app/pages/student-registration.vue'],
  ['/librarian/students', 'app/pages/librarian/students.vue'],
  ['/librarian/faculty', 'app/pages/librarian/faculty.vue'],
  ['/admin/users', 'app/pages/admin/users/index.vue'],
  ['/admin/librarians/create', 'app/pages/admin/librarians/create.vue'],
  ['/librarian/books', 'app/pages/librarian/books/index.vue'],
  ['/librarian/books/register', 'app/pages/librarian/books/register.vue'],
  ['/librarian/books/:id/edit', 'app/pages/librarian/books/[id]/edit.vue'],
  ['/librarian/books/import', 'app/pages/librarian/books/import.vue'],
  ['/student/books', 'app/pages/student/books/index.vue'],
  ['/faculty/books', 'app/pages/faculty/books/index.vue'],
  ['/admin/settings', 'app/pages/admin/settings.vue'],
  ['/librarian/membership-term', 'app/pages/librarian/membership-term.vue'],
  ['/librarian/memberships', 'app/pages/librarian/memberships.vue'],
  ['/student/library-card', 'app/pages/student/library-card.vue'],
  ['/librarian/reports', 'app/pages/librarian/reports.vue'],
  ['/admin/reports', 'app/pages/admin/reports.vue'],
]

const TASK14_ROUTES = new Set([
  '/admin/settings',
  '/librarian/membership-term',
  '/librarian/memberships',
  '/student/library-card',
])

const STATIC_PATTERNS = [
  /STUDENT_EDUCATIONAL_LEVELS/,
  /STUDENT_PROGRAMS/,
  /INVENTORY_SHELF_LOCATIONS/,
  /const\s+educationalLevelItems\s*=\s*\[/,
  /const\s+departmentItems\s*=\s*\[/,
  /const\s+employmentTypeItems(?:\s*:[^=]+)?\s*=\s*\[/,
  /const\s+positionItems\s*=\s*\[/,
  /const\s+bookCategories\s*=\s*\[/,
  /const\s+shelfLocations\s*=\s*\[/,
]

const inScopeRoutes = overlayOnly ? ROUTES.filter(([route]) => TASK14_ROUTES.has(route)) : ROUTES

test('release guard: every in-scope route source exists', () => {
  for (const [route, file] of inScopeRoutes) assert.equal(exists(file), true, `${route} must resolve to ${file}`)
})

test('release guard: in-scope pages contain no institution-maintained static arrays or literal empty select values', () => {
  const emptySelectValue = /value\s*:\s*(['"])\s*\1/g
  for (const [route, file] of inScopeRoutes) {
    const source = read(file)
    for (const pattern of STATIC_PATTERNS) assert.doesNotMatch(source, pattern, `${route} contains static option pattern ${pattern}`)
    assert.doesNotMatch(source, emptySelectValue, `${route} contains a literal empty option value`)
  }
})

test('release guard: Task 14 uses fixed semester strings and UI-only all sentinel', () => {
  const settings = read('app/pages/admin/settings.vue')
  assert.match(settings, /useLibraryOptions\(\)/)
  assert.match(settings, /v-model="forms\.general\.currentSemester"/)
  assert.doesNotMatch(settings, /academicSemesterCode/)

  const term = read('app/pages/librarian/membership-term.vue')
  assert.match(term, /v-model="form\.semester"/)
  assert.doesNotMatch(term, /academicSemesterCode/)

  const memberships = read('app/pages/librarian/memberships.vue')
  assert.match(memberships, /const\s+ALL_SEMESTERS\s*=\s*["']__all__["']/)
  assert.match(memberships, /semesterFilter\.value\s*===\s*ALL_SEMESTERS\s*\?\s*["']{2}/)

  const card = read('app/pages/student/library-card.vue')
  assert.match(card, /currentAcademicTerm\?\.semesterName/)
  assert.match(card, /Not recorded/)
})

test('release guard: Task 14 registry consumers expose retryable option errors', () => {
  for (const file of [
    'app/pages/admin/settings.vue',
    'app/pages/librarian/membership-term.vue',
    'app/pages/librarian/memberships.vue',
  ]) {
    const source = read(file)
    assert.match(source, /libraryOptions\.error\.value/)
    assert.match(source, /Retry/)
    assert.match(source, /libraryOptions\.loadOperational\(\)/)
    assert.doesNotMatch(source, /useReferenceData\(\)/)
  }
})

test('strict release guard: all direct V2 option consumers use useLibraryOptions()', { skip: overlayOnly }, () => {
  const directRoutes = [
    '/student-registration', '/librarian/students', '/librarian/faculty', '/admin/users', '/admin/librarians/create',
    '/librarian/books', '/librarian/books/register', '/librarian/books/:id/edit', '/student/books', '/faculty/books',
    '/admin/settings', '/librarian/membership-term', '/librarian/memberships', '/librarian/reports', '/admin/reports',
  ]
  const byRoute = new Map(ROUTES)
  for (const route of directRoutes) {
    const file = byRoute.get(route)
    assert.ok(file && exists(file), `${route} source must exist`)
    const source = read(file)
    assert.ok(source.includes('useLibraryOptions()'), `${route} must use useLibraryOptions()`)
    assert.equal(source.includes('useReferenceData()'), false, `${route} must not use legacy useReferenceData()`)
  }
})

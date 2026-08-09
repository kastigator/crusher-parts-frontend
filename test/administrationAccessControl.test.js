import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import assert from 'node:assert/strict'

const root = path.resolve(import.meta.dirname, '..')
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')

test('Administration routes and navigation are capability-aware', () => {
  const router = read('src/router/AppRouter.jsx')
  const sidebar = read('src/components/Sidebar.jsx')
  assert.match(router, /CapabilityAccessRoute capability="administration\.access"/)
  assert.match(sidebar, /can\("administration\.access"\)/)
})

test('Administration UI exposes multiple roles, effective access, audit, and legacy diagnostics', () => {
  const users = read('src/components/users/UsersTable.jsx')
  const administration = read('src/components/users/UsersMain.jsx')
  assert.match(users, /mode="multiple"/)
  assert.match(users, /effective-access/)
  assert.match(administration, /Роли и полномочия/)
  assert.match(administration, /Аудит и сессии/)
  assert.match(administration, /Legacy-диагностика/)
})

test('frontend Super Administrator behavior no longer depends on role id 1', () => {
  const capabilities = read('src/hooks/useCapabilities.js')
  assert.match(capabilities, /user\?\.is_super_admin === true/)
  assert.doesNotMatch(capabilities, /role_id\).*1|role_id\s*===\s*1/)
})

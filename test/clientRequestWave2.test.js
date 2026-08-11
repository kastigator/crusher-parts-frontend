import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8")

test("Client Request routing and navigation use Wave 1 capabilities", () => {
  const router = read("src", "router", "AppRouter.jsx")
  const sidebar = read("src", "components", "Sidebar.jsx")
  assert.match(router, /capability="client_requests\.access"/)
  assert.match(sidebar, /can\("client_requests\.access"\)/)
})

test("Client Request workspace exposes identification and release while downstream is read-only", () => {
  const workspace = read("src", "pages", "ClientRequestsPage.jsx")
  assert.match(workspace, /Позиция каталога и требования/)
  assert.match(workspace, /Передать .* позиций в закупку/)
  assert.doesNotMatch(workspace, /RequestCommercialFlowTabContent|RequestProcurementTabContent|RequestExecutionTabContent/)
  assert.match(workspace, /ведутся в своих разделах/)
})

test("Procurement Release API is explicit and capability-gated in UI", () => {
  const api = read("src", "features", "clientRequests", "api", "clientRequestsApi.js")
  const release = read("src", "pages", "ClientRequestsPage.jsx")
  assert.match(api, /axios\.post\("\/procurement-releases"/)
  assert.match(api, /\/finalize/)
  assert.match(release, /client_requests\.release_to_procurement/)
  assert.match(release, /client_requests\.manage_revisions/)
})

test("Frontend v2 has one contextual primary action and line-level release selection", () => {
  const page = read("src", "pages", "ClientRequestsPage.jsx")
  assert.match(page, /primaryLabel/)
  assert.match(page, /getCheckboxProps/)
  assert.match(page, /disabled: !canRelease \|\| !row\.readiness\?\.ready/)
  assert.match(page, /Проверка передачи в закупку/)
  assert.match(page, /Предыдущая ревизия открыта только для просмотра/)
})

test("Frontend v2 presents human-readable blockers and preserves domain boundaries", () => {
  const page = read("src", "pages", "ClientRequestsPage.jsx")
  for (const label of ["Укажите количество больше нуля", "Укажите единицу измерения", "Подтвердите позицию каталога", "Заполните требования для закупки"]) assert.match(page, new RegExp(label))
  assert.match(page, /Создание позиции выполняется только в Classifier & Engineering/)
  assert.doesNotMatch(page, /assign-rfq|sync-rfq|oem_only|original_part_id/)
})

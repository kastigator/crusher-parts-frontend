import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8")

test("Client Request creation uses one atomic intake command instead of sequential row POSTs", () => {
  const page = read("src", "pages", "ClientRequestsPage.jsx")
  const wizard = read("src", "features", "clientRequests", "components", "ClientRequestIntakeWizard.jsx")
  const api = read("src", "features", "clientRequests", "api", "clientRequestsApi.js")
  assert.match(page, /ClientRequestIntakeWizard/)
  assert.match(api, /\/client-requests\/intake\/validate/)
  assert.match(api, /\/client-requests\/intake\/commit/)
  assert.match(wizard, /commitClientRequestIntake/)
  assert.match(wizard, /payload_hash/)
  assert.match(wizard, /idempotency_key/)
  assert.match(wizard, /setHeader\(values\)/)
  assert.match(wizard, /header \|\| await form\.validateFields\(\)/)
  assert.doesNotMatch(wizard, /for\s*\([^)]*lines[^)]*\).*addClientRequestItem/s)
})

test("manual intake is a compact keyboard-first grid with add, duplicate and delete", () => {
  const grid = read("src", "features", "clientRequests", "components", "MassIntakeGrid.jsx")
  assert.match(grid, /cr-intake-grid/)
  assert.match(grid, /event\.key !== "Enter"/)
  assert.match(grid, /Enter\/Tab — переход по ячейкам/)
  assert.match(grid, /Дублировать/)
  assert.match(grid, /Удалить/)
  assert.match(grid, /scroll=\{\{ x: 1700, y: 410 \}\}/)
  assert.doesNotMatch(grid, /title=\{`Позиция/)
})

test("mass intake supports paste, Excel/CSV mapping, preview and safe match states", () => {
  const grid = read("src", "features", "clientRequests", "components", "MassIntakeGrid.jsx")
  const wizard = read("src", "features", "clientRequests", "components", "ClientRequestIntakeWizard.jsx")
  for (const token of ["Excel", "CSV", "буфера", "соответствие колонок", "Точное совпадение", "Нужна проверка", "Будет задача", "Дубликат"]) {
    assert.match(`${grid}\n${wizard}`, new RegExp(token))
  }
  assert.match(wizard, /Неоднозначный результат никогда не выбирается автоматически/)
  assert.match(grid, /onSelectCandidate/)
})

test("Classifier exposes a separate Russian Technical Identification queue and transactional resolve", () => {
  const page = read("src", "pages", "EquipmentClassifierPage.jsx")
  const queue = read("src", "features", "technicalIdentification", "components", "TechnicalIdentificationWorkspace.jsx")
  const api = read("src", "features", "technicalIdentification", "api", "technicalIdentificationApi.js")
  assert.match(page, /Требует идентификации/)
  assert.match(page, /TechnicalIdentificationWorkspace/)
  assert.match(queue, /Рабочая очередь Classifier & Engineering — не раздел технического дерева/)
  assert.match(queue, /Исходный запрос клиента/)
  assert.match(queue, /Подтвердить позицию и вернуть в заявку/)
  assert.match(queue, /Открыть заявку/)
  assert.match(api, /\/resolve/)
  assert.doesNotMatch(queue, />UUID<|>row_version<|>catalog_position_id</)
})

test("registry consumes the aggregate projection and no longer loads up to 80 workspaces", () => {
  const page = read("src", "pages", "ClientRequestsPage.jsx")
  assert.match(page, /getClientRequestRegistry/)
  assert.match(page, /open_task_lines/)
  assert.match(page, /ready_for_release_lines/)
  assert.doesNotMatch(page, /requestRows\.slice\(0, 80\)/)
  assert.doesNotMatch(page, /Promise\.allSettled/)
})

test("Client Request operator labels hide substitution enum codes", () => {
  const page = read("src", "pages", "ClientRequestsPage.jsx")
  assert.match(page, /value: "unspecified", label: "Уточнить позже"/)
})

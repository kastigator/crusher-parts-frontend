import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8")

test("Client Request UOM uses active measurement_units without a duplicated fallback dictionary", () => {
  const hook = read("src", "hooks", "useMeasurementUnits.js")
  const wizard = read("src", "features", "clientRequests", "components", "ClientRequestIntakeWizard.jsx")
  const grid = read("src", "features", "clientRequests", "components", "MassIntakeGrid.jsx")
  assert.match(hook, /axios\.get\("\/measurement-units"/)
  assert.doesNotMatch(hook, /FALLBACK_UNITS/)
  assert.match(wizard, /find\(\(unit\).*=== "шт"/)
  assert.match(wizard, /disabled=\{!defaultUom\|\|!!uomError\}/)
  assert.match(grid, /options=\{uomOptions\}/)
  assert.match(grid, /Единица по умолчанию/)
  assert.doesNotMatch(grid, /onChange=\{\(event\)=>setDefaults\(\(current\)=>\(\{\.\.\.current,uom:event\.target\.value/)
})

test("manual row receives visible editable шт only after the canonical dictionary loads", () => {
  const wizard = read("src", "features", "clientRequests", "components", "ClientRequestIntakeWizard.jsx")
  const rows = read("src", "features", "clientRequests", "components", "intakeRows.js")
  assert.match(wizard, /defaultUom/)
  assert.match(wizard, /row\.uom \? row : \{ \.\.\.row, uom: defaultUom \}/)
  assert.match(wizard, /uomOptions=\{uomOptions\}/)
  assert.match(rows, /uom: null/)
})

test("paste and file import preserve original UOM and source metadata before normalization", () => {
  const grid = read("src", "features", "clientRequests", "components", "MassIntakeGrid.jsx")
  for (const token of ["source_uom", "original_row_number", "original_order", "original_values", "source_type", "file_name", "sheet_name"]) {
    assert.match(grid, new RegExp(token))
  }
  assert.match(grid, /Исходно: \{preview\.source_uom\} → \{preview\.uom \|\| "ошибка"\}/)
  assert.match(grid, /originalUom \|\| defaultUom \|\| null/)
})

test("exact confirmation is off by default and requires an explicit auditable bulk action", () => {
  const wizard = read("src", "features", "clientRequests", "components", "ClientRequestIntakeWizard.jsx")
  const grid = read("src", "features", "clientRequests", "components", "MassIntakeGrid.jsx")
  assert.match(wizard, /useState\(false\)/)
  assert.match(wizard, /bulk_confirm_exact_unique/)
  assert.match(wizard, /confirmation_key/)
  assert.match(wizard, /Подтвердить все единственные точные совпадения явным групповым действием/)
  assert.match(grid, /Предложение системы — ещё не подтверждено/)
  assert.match(grid, /Будет подтверждено явным групповым действием/)
})

test("match preview exposes exact, probable, ambiguous, no-match and validation states", () => {
  const grid = read("src", "features", "clientRequests", "components", "MassIntakeGrid.jsx")
  const wizard = read("src", "features", "clientRequests", "components", "ClientRequestIntakeWizard.jsx")
  for (const token of ["exact_unique", "probable", "ambiguous", "no_match", "duplicate", "malformed"]) {
    assert.match(`${grid}\n${wizard}`, new RegExp(token))
  }
  assert.match(grid, /candidates\?\.\[0\]\?\.reasons/)
})

test("Technical Identification workbench supports assignment, due date, waiting/resume, close, reopen and transactional resolve", () => {
  const workspace = read("src", "features", "technicalIdentification", "components", "TechnicalIdentificationWorkspace.jsx")
  const api = read("src", "features", "technicalIdentification", "api", "technicalIdentificationApi.js")
  for (const token of [
    "assignTechnicalIdentificationTask",
    "listTechnicalIdentificationAssignees",
    "DatePicker",
    "waitTechnicalIdentificationTask",
    "resumeTechnicalIdentificationTask",
    "closeTechnicalIdentificationTask",
    "reopenTechnicalIdentificationTask",
    "resolveTechnicalIdentificationTask",
  ]) assert.match(`${workspace}\n${api}`, new RegExp(token))
  assert.match(workspace, /task\.status!=="in_progress"/)
  assert.match(workspace, /Подтвердить позицию и вернуть в заявку/)
  assert.match(workspace, /Открыть новое поколение задачи/)
  assert.match(workspace, /equipment-classifier\?mode=identification&task=/)
  assert.match(read("src", "pages", "EquipmentClassifierPage.jsx"), /searchParams\.has\("task"\)/)
})

test("10/50/100 workflows remain one-grid and one atomic commit without add-row loops", () => {
  const wizard = read("src", "features", "clientRequests", "components", "ClientRequestIntakeWizard.jsx")
  const grid = read("src", "features", "clientRequests", "components", "MassIntakeGrid.jsx")
  assert.match(wizard, /commitClientRequestIntake/)
  assert.match(wizard, /Создать заявку одной операцией/)
  assert.match(grid, /sourceRows\.map/)
  assert.match(grid, /scroll=\{\{ x: 1700, y: 410 \}\}/)
  assert.match(grid, /maxHeight: "calc\(100vh - 230px\)"/)
  assert.doesNotMatch(wizard, /for\s*\([^)]*rows[^)]*\)[\s\S]*axios\.post/)
})

test("Client Request retries reuse one idempotency key and optional admin lookup cannot block the registry", () => {
  const wizard = read("src", "features", "clientRequests", "components", "ClientRequestIntakeWizard.jsx")
  const page = read("src", "pages", "ClientRequestsPage.jsx")
  assert.match(wizard, /commitAttemptRef/)
  assert.match(wizard, /payloadHash: preview\.payload_hash/)
  assert.match(wizard, /idempotency_key: commitAttemptRef\.current\.idempotencyKey/)
  assert.match(page, /can\("administration\.access"\) \? listUsers\(\)\.catch\(\(\) => \[\]\) : Promise\.resolve\(\[\]\)/)
})

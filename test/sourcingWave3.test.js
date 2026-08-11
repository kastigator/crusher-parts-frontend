import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8")

test("Sourcing workspace is capability-gated and is the primary procurement search navigation", () => {
  const router = read("src", "router", "AppRouter.jsx")
  const sidebar = read("src", "components", "Sidebar.jsx")
  assert.match(router, /path="sourcing"/)
  assert.match(router, /capability="sourcing\.access"/)
  assert.match(sidebar, /can\("sourcing\.access"\)/)
  assert.match(sidebar, /paths: \["\/sourcing"\]/)
  assert.match(sidebar, /Закупочная проработка/)
})

test("workspace follows Case to Decision and excludes downstream economics and fulfilment", () => {
  const page = read("src", "pages", "SourcingWorkspacePage.jsx")
  for (const stage of ["Обзор", "Позиции", "Запросы", "Предложения", "Покрытие", "Решение", "История"]) {
    assert.match(page, new RegExp(stage))
  }
  assert.match(page, /createSupplierInquiry/)
  assert.match(page, /createSupplierOffer/)
  assert.match(page, /createCoverageOption/)
  assert.match(page, /finalizeSourcingDecision/)
  assert.doesNotMatch(page, /createPurchaseOrder|createSalesQuote|warehouseReceipt|landedCost|marginPct/)
})

test("Supplier master data promotion is an explicit review request", () => {
  const page = read("src", "pages", "SourcingWorkspacePage.jsx")
  const api = read("src", "features", "sourcing", "api", "sourcingApi.js")
  assert.match(page, /не изменяет справочник поставщиков/i)
  assert.match(page, /провер/i)
  assert.match(api, /master-data-promotion-requests/)
  assert.doesNotMatch(api, /supplier-parts|supplier-part-prices/)
})

test("Client Request receives only a navigation link into Sourcing", () => {
  const overview = read("src", "pages", "ClientRequestsPage.jsx")
  assert.match(overview, /downstream\?\.sourcing_cases/)
  assert.match(overview, /\/sourcing\?case=/)
  assert.match(overview, /Закупочная проработка, расчёт цены, КП и договор ведутся в своих разделах/)
})

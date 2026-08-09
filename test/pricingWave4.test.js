import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8")

test("Pricing workspace is capability-gated and has primary navigation", () => {
  const router = read("src", "router", "AppRouter.jsx")
  const sidebar = read("src", "components", "Sidebar.jsx")
  assert.match(router, /path="pricing"/)
  assert.match(router, /capability="pricing\.access"/)
  assert.match(sidebar, /can\("pricing\.access"\)/)
  assert.match(sidebar, /paths: \["\/pricing"\]/)
})

test("workspace covers the canonical Pricing lifecycle", () => {
  const page = read("src", "pages", "PricingWorkspacePage.jsx")
  for (const stage of ["Исходные позиции", "Группы и маршруты", "Структура цены", "Цены клиенту", "Решение и история"]) {
    assert.match(page, new RegExp(stage))
  }
  for (const operation of ["fixPricingInput", "createCalculationGroup", "createRouteVariant", "calculateRouteVariant", "selectRouteVariant", "approveClientPrices", "finalizePricingDecision"]) {
    assert.match(page, new RegExp(operation))
  }
})

test("workspace uses aliases and explicit audited supplier reveal", () => {
  const page = read("src", "pages", "PricingWorkspacePage.jsx")
  const api = read("src", "features", "pricing", "api", "pricingApi.js")
  assert.match(page, /supplier_alias/)
  assert.match(page, /Показать поставщика/)
  assert.match(api, /supplier-identity/)
  assert.match(page, /Зафиксированное решение поставщика останется неизменным/)
})

test("Pricing frontend does not own Sourcing edits, Commercial Offer or physical logistics", () => {
  const files = [
    read("src", "pages", "PricingWorkspacePage.jsx"),
    read("src", "features", "pricing", "api", "pricingApi.js"),
  ].join("\n")
  assert.doesNotMatch(files, /createSupplierOffer|createCoverageOption|finalizeSourcingDecision|createSalesQuote|createContract|createPurchaseOrder|warehouseReceipt|createShipment|createDispatch/)
})

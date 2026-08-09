import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8")

test("Commercial Offer workspace is capability-gated and primary navigation", () => {
  const router = read("src", "router", "AppRouter.jsx")
  const sidebar = read("src", "components", "Sidebar.jsx")
  assert.match(router, /path="commercial-offers"/)
  assert.match(router, /capability="commercial_offers\.access"/)
  assert.match(sidebar, /can\("commercial_offers\.access"\)/)
  assert.match(sidebar, /paths: \["\/commercial-offers"\]/)
})

test("workspace covers offer revisions, approvals, issue, feedback and acceptance", () => {
  const page = read("src", "pages", "CommercialOfferWorkspacePage.jsx")
  for (const label of ["Позиции", "Условия", "Готовность и вид для клиента", "Согласования", "Общение с клиентом", "Версии", "Принятый результат для договора", "История"]) assert.match(page, new RegExp(label))
  for (const operation of ["createCommercialOffer", "submitCommercialOfferReview", "markCommercialOfferReady", "renderCommercialOffer", "sendCommercialOffer", "registerCommercialFeedback", "assessCommercialFeedback", "acceptCommercialOffer"]) assert.match(page, new RegExp(operation))
})

test("frontend uses server-generated client preview and does not request supplier identity or pricing calculations", () => {
  const files = [
    read("src", "pages", "CommercialOfferWorkspacePage.jsx"),
    read("src", "features", "commercialOffers", "api", "commercialOfferApi.js"),
  ].join("\n")
  assert.match(files, /client-preview/)
  assert.match(files, /поставщики, закупочные цены, себестоимость, маржа/)
  assert.doesNotMatch(files, /supplier-identity|procurement_projection|calculateRouteVariant|createCoverageOption|finalizeSourcingDecision|createContract|createPurchaseOrder/)
})

test("issued revision is presented as immutable and negotiation creates a new revision", () => {
  const page = read("src", "pages", "CommercialOfferWorkspacePage.jsx")
  const api = read("src", "features", "commercialOffers", "api", "commercialOfferApi.js")
  assert.match(page, /После выпуска версия неизменяема/)
  assert.match(page, /Создать следующую версию/)
  assert.match(api, /create-next-revision/)
  assert.match(api, /accepted-result/)
})

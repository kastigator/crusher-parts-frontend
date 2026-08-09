import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..")
const read = (...parts) => fs.readFileSync(path.join(root,...parts),"utf8")

test("Contract workspace is capability-gated and primary navigation",() => {
  const router=read("src","router","AppRouter.jsx")
  const sidebar=read("src","components","Sidebar.jsx")
  assert.match(router,/path="contracts"/)
  assert.match(router,/capability="contracts\.access"/)
  assert.match(sidebar,/can\("contracts\.access"\)/)
  assert.match(sidebar,/paths: \["\/contracts"\]/)
})

test("task-oriented workspace covers the canonical Contract lifecycle",() => {
  const page=read("src","pages","ContractWorkspacePage.jsx")
  for (const label of ["Обзор","Предмет договора","Коммерческие условия","Юридические условия","Отклонения и согласования","Документы и подписание","Версии","Обязательства","История"]) assert.match(page,new RegExp(label))
  for (const operation of ["createContractCase","submitContractReview","generateContractDocument","sendContractRevision","markContractReadyForSignature","registerContractDocument","registerContractSignature","makeContractEffective"]) assert.match(page,new RegExp(operation))
})

test("frontend uses Contract Domain API and contains no downstream execution commands",() => {
  const files=[read("src","pages","ContractWorkspacePage.jsx"),read("src","features","contracts","api","contractApi.js")].join("\n")
  assert.match(files,/contract-domain/)
  assert.match(files,/Принятое коммерческое предложение/)
  assert.doesNotMatch(files,/createPurchaseOrder|dispatchShipment|receiveWarehouse|postInvoice|recordPayment/)
})

test("workspace exposes readiness, immutable send, signature evidence and commitment handoff",() => {
  const page=read("src","pages","ContractWorkspacePage.jsx")
  assert.match(page,/После отправки версия блокируется/)
  assert.match(page,/Подтверждение подписи/)
  assert.match(page,/повторно подтверждается в исполнении закупки/i)
  assert.match(page,/договор сам не создаёт заказ поставщику/)
})

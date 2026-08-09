import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const read=(...parts)=>fs.readFileSync(path.join(root,...parts),'utf8')
test('Procurement Execution replaces the primary legacy PO route and is capability gated',()=>{const router=read('src','router','AppRouter.jsx'),sidebar=read('src','components','Sidebar.jsx');assert.match(router,/path="purchase-orders"/);assert.match(router,/capability="procurement_execution\.access"/);assert.match(sidebar,/can\("procurement_execution\.access"\)/);assert.match(sidebar,/Исполнение закупки/)})
test('workspace covers readiness, trace, candidates, immutable PO and confirmations',()=>{const page=read('src','pages','ProcurementExecutionWorkspacePage.jsx');for(const label of ['Готовность','Обязательства договора','Связь с закупочной проработкой','Подтверждения параметров','Кандидаты заказов','Заказы поставщикам','Подтверждения заказов','Запросы на изменение','История'])assert.match(page,new RegExp(label));for(const operation of ['createProcurementCase','reconfirmProcurementItem','generatePoCandidates','createPurchaseOrder','createPurchaseOrderRevision','issuePurchaseOrder','sendPurchaseOrder','registerSupplierConfirmation','acceptSupplierConfirmation'])assert.match(page,new RegExp(operation))})
test('frontend keeps excluded downstream domains outside Procurement Execution API',()=>{const api=read('src','features','procurementExecution','api','procurementExecutionApi.js'),page=read('src','pages','ProcurementExecutionWorkspacePage.jsx');assert.match(api,/procurement-execution/);assert.doesNotMatch(api,/warehouse|invoice|payment|accounting|completion/);assert.match(page,/Принятие подтверждения не создаёт складские, платёжные или бухгалтерские документы/)})

import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const read=(...parts)=>fs.readFileSync(path.join(root,...parts),'utf8')

test('Financial Operations route and sidebar use capability access',()=>{const router=read('src','router','AppRouter.jsx'),sidebar=read('src','components','Sidebar.jsx');assert.match(router,/path="financial-operations"/);assert.match(router,/capability="financial_operations\.access"/);assert.match(sidebar,/can\("financial_operations\.access"\)/);assert.match(sidebar,/path: "\/financial-operations"/)})
test('workspace exposes operational AP AR reconciliation and completion projection',()=>{const page=read('src','pages','FinancialOperationsWorkspacePage.jsx');for(const label of ['Задолженность поставщикам','Обязательства','Счета поставщиков','Оплаты поставщикам','Задолженность клиентов','Оплаты клиентов','Исключения и споры','Платёжный календарь','Прогноз','Готовность к завершению','История'])assert.match(page,new RegExp(label));for(const capability of ['financial_operations.ap.manage','financial_operations.ap.invoices','financial_operations.ap.payments','financial_operations.ar.manage','financial_operations.ar.payments'])assert.match(page,new RegExp(capability.replaceAll('.','\\.')));assert.match(page,/Только оценка готовности/)})

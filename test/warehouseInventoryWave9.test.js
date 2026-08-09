import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
const root=path.resolve(process.cwd())
const read=(...parts)=>fs.readFileSync(path.join(root,...parts),'utf8')

test('Warehouse workspace exposes task-oriented inbound, stock, reservation, count and boundary views',()=>{const page=read('src','pages','WarehouseInventoryWorkspacePage.jsx');for(const text of ['Поступления и приёмка','Остатки и доступность','Резервы','Инвентаризации','Правила раздела','Физический остаток','На удержании','Зарезервировано','Доступно'])assert.match(page,new RegExp(text));assert.match(page,/warehouse-inventory\/inbound\/from-accepted-confirmations/);assert.match(page,/warehouse-inventory\/inbound\/\$\{receipt.id\}\/receipts/)})
test('Warehouse route and navigation require capability access',()=>{const router=read('src','router','AppRouter.jsx'),sidebar=read('src','components','Sidebar.jsx');assert.match(router,/warehouse_inventory\.access/);assert.match(router,/WarehouseInventoryWorkspacePage/);assert.match(sidebar,/warehouse_inventory\.access/)})

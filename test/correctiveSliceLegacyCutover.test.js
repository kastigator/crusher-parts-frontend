import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import assert from 'node:assert/strict'

const root=path.resolve(import.meta.dirname,'..')
const read=(file)=>fs.readFileSync(path.join(root,file),'utf8')

test('direct legacy process routes are removed and target routes remain capability guarded',()=>{
  const router=read('src/router/AppRouter.jsx')
  for(const route of ['rfq','rfq-workspace','supplier-responses','coverage','scorecard','economics','selection','sales-quotes'])assert.doesNotMatch(router,new RegExp(`path="${route}"`))
  for(const [route,capability] of [['sourcing','sourcing.access'],['pricing','pricing.access'],['commercial-offers','commercial_offers.access'],['contracts','contracts.access'],['purchase-orders','procurement_execution.access'],['warehouse','warehouse_inventory.access'],['completion-lifecycle','completion.access'],['after-sales','after_sales.access']])assert.match(router,new RegExp(`path="${route}"[^\n]+${capability.replace('.','\\.')}`))
})

test('Client Request UI no longer calls legacy RFQ assignment or sync commands',()=>{
  const page=read('src/pages/ClientRequestsPage.jsx')
  const home=read('src/pages/HomePage.jsx')
  for(const source of [page,home])assert.doesNotMatch(source,/assign-rfq|sync-rfq|mark-rfq-needs-sync|\/rfq-workspace/)
})

test('Classifier reads target warehouse availability and has no legacy warehouse writes',()=>{
  const source=read('src/components/equipmentClassifier/EquipmentClassifierMain.jsx')
  assert.match(source,/\/warehouse-inventory\/availability\/catalog-positions/)
  assert.doesNotMatch(source,/\/warehouse\/positions|axios\.post\("\/warehouse\/documents"/)
})

test('Supplier Quality no longer reads or creates links from legacy Supplier PO truth',()=>{
  const source=read('src/components/suppliers/SupplierQualityMain.jsx')
  assert.doesNotMatch(source,/\/purchase-orders|supplier_purchase_order_id|supplier_purchase_order_line_id|rfq_response_line_id|sales_quote_id/)
})

test('Completion navigation is present and new Client Request payloads do not emit identity aliases',()=>{
  const sidebar=read('src/components/Sidebar.jsx')
  const page=read('src/pages/ClientRequestsPage.jsx')
  assert.match(sidebar,/paths: \["\/completion-lifecycle"\]/)
  assert.doesNotMatch(page,/original_part_id:\s*(?:target|row|item|payload|normalizedPart|values)/)
})

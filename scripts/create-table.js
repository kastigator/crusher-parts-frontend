#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

// --- аргументы ---
const [,, rawName, rawTitle] = process.argv

if (!rawName || !rawTitle) {
  console.error('❗ Использование: node scripts/create-table.js clients "Клиенты"')
  process.exit(1)
}

const entity = rawName.toLowerCase()
const title = rawTitle
const Entity = entity.charAt(0).toUpperCase() + entity.slice(1)

const pageFile = `src/pages/${Entity}Page.jsx`
const mainFile = `src/components/${entity}/${Entity}Main.jsx`
const columnsEntry = `export const ${entity}TableColumns = [\n  // { field: '', title: '', type: 'text' },\n];\n`

// --- создаём директорию ---
const entityDir = path.join('src', 'components', entity)
if (!fs.existsSync(entityDir)) {
  fs.mkdirSync(entityDir, { recursive: true })
  console.log(`📁 Создана папка: ${entityDir}`)
}

// --- создаём ClientsMain.jsx ---
if (!fs.existsSync(mainFile)) {
  fs.writeFileSync(mainFile, `import BaseTable from '@/components/common/BaseTable'
import { ${entity}TableColumns } from '@/components/common/tableDefinitions'

export default function ${Entity}Main() {
  return (
    <BaseTable
      rows={[]}
      columns={${entity}TableColumns}
      onSave={() => {}}
      onDelete={() => {}}
    />
  )
}
`)
  console.log(`✅ Создан файл: ${mainFile}`)
}

// --- создаём ClientsPage.jsx ---
if (!fs.existsSync(pageFile)) {
  fs.writeFileSync(pageFile, `import TabRendererPage from '@/components/common/TabRendererPage'
import ${Entity}Main from '@/components/${entity}/${Entity}Main'

export default function ${Entity}Page() {
  return (
    <TabRendererPage tabKey="${entity}">
      <${Entity}Main />
    </TabRendererPage>
  )
}
`)
  console.log(`✅ Создан файл: ${pageFile}`)
}

// --- добавляем запись в tableDefinitions.js ---
const defFile = path.join('src', 'components', 'common', 'tableDefinitions.js')
if (fs.existsSync(defFile)) {
  const defContent = fs.readFileSync(defFile, 'utf-8')
  const entry = `export const ${entity}TableColumns = [`
  if (!defContent.includes(entry)) {
    fs.appendFileSync(defFile, '\n' + columnsEntry)
    console.log(`🧩 Добавлена заготовка в tableDefinitions.js`)
  } else {
    console.log(`ℹ️ tableDefinitions.js уже содержит ${entity}TableColumns`)
  }
} else {
  console.warn('⚠️ Не найден файл tableDefinitions.js — пропущено')
}

console.log(`\n🚀 Готово! Не забудь:`)
console.log(`1. Создать вкладку "${title}" с tab_name = "${entity}"`)
console.log(`2. Назначить права в "Роли и доступы"`)
console.log(`3. Добавить маршрут в AppRouter.jsx: /${entity} → ${Entity}Page`)

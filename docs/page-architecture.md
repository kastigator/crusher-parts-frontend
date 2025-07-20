# 📐 Структура табличных страниц (Page Architecture)

Этот документ описывает, как в проекте `crusher-parts-frontend` устроены страницы, содержащие таблицы, импорты и действия. Используется как шаблон при создании новых вкладок.

---

## 🧱 Общий шаблон страницы

Каждая страница состоит из следующих блоков:

<MainLayout> <PageWrapper> <TableToolbar title="..." onAdd={...} onImport={...} /> {loading ? <TableSkeleton /> : <EditableTable data={...} />} <TableFooter ... /> </PageWrapper> </MainLayout> ```
🧩 Компоненты, общие для всех страниц
Компонент	Назначение
PageWrapper.jsx	Отступы, minWidth, Paper, layout всей страницы
TableToolbar.jsx	Заголовок страницы + кнопки (добавить, импорт)
TableWrapper.jsx	Обёртка конкретной таблицы
TableFooter.jsx	Пагинация
EditableCell.jsx	Универсальная редактируемая ячейка
ActionIcons.jsx	Иконки "сохранить", "редактировать", "удалить"
ValueDisplay.jsx	Отображение значений по типу
TableSkeleton.jsx	Скелет при загрузке
ImportModal.jsx	Диалог импорта Excel-файлов

📄 Логика таблиц
Все таблицы подключаются на основе описания в tableDefinitions

Если нужен импорт — используется схема из entitySchemas.js

Внутри таблицы используется EditableCell, которая выбирает редактор по типу

✅ Поведение страницы
Поведение	Как реализовано
Редактирование	Внутри строки, isEditing
Добавление строки	Через кнопку onAdd, добавляется isNew
Сохранение/отмена	ActionIcons управляет действиями
Импорт	Через ImportModal и схему
Пагинация	В TableFooter, управляет page, rows
Состояние загрузки	Через loading, отображается Skeleton

🧠 Когда добавляется новая страница:
Создать компонент, например: OrdersPage.jsx

Добавить tableDefinitions['orders']

(если нужен импорт) — добавить entitySchemas.orders

Использовать:

jsx
Копировать
Редактировать
<PageWrapper>
  <TableToolbar title="Заказы" onAdd={...} />
  {loading ? <TableSkeleton /> : (
    <EditableTable
      rows={...}
      columns={tableDefinitions.orders}
      ...
    />
  )}
  <TableFooter ... />
</PageWrapper>
📦 Опциональные элементы
Компонент	Когда подключать
EmailField, PhoneField	Если колонка содержит email или телефон
StatusChip	Для отображения статусов (ValueDisplay)
CustomToolbarRight	Если нужны кастомные действия справа

📌 Где лежат компоненты
Папка	Назначение
components/common/	Все переиспользуемые части
components/[module]/	Таблицы для конкретной вкладки
pages/	Сами страницы
tableDefinitions	Колонки
entitySchemas.js	Импорт схемы

Документ создан 2025-07-15. Используется при проектировании и расширении системы вкладок.

yaml
Копировать
Редактировать

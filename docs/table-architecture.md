Этот файл описывает всю инфраструктуру таблиц в проекте crusher-parts-frontend. Он помогает быстро восстановить или расширить таблицы, не анализируя вручную десятки компонентов.

🧩 Основные компоненты таблиц
Компонент (путь)	Назначение
components/common/TableWrapper.jsx	Обёртка таблицы в Paper, оформление, minWidth: 1200
components/common/TableToolbar.jsx	Панель с заголовком, фильтрами, кнопками "Добавить", "Импорт" и др.
components/common/TableFooter.jsx	Компонент пагинации (TablePagination)
components/common/TableSkeleton.jsx	Скелетон-заполнитель при загрузке
components/common/EditableCell.jsx	Универсальная редактируемая ячейка с автоопределением типа
components/common/ActionIcons.jsx	Иконки внутри строк: редактировать, сохранить, отменить, удалить
components/common/ValueDisplay.jsx	Отображение значений по типу: статус, дата, сумма, boolean и др.
components/common/EmailField.jsx	Поле email с mailto: и копированием
components/common/PhoneField.jsx	Поле телефона с tel: и форматированием

📄 Метаданные таблиц
Файл	Назначение
components/common/tableDefinitions	Конфигурация колонок таблиц: users, tabs, rolePermissions
components/common/fieldRenderers.js	Описание типов редакторов: text, enum, boolean, percent, date и др.
components/common/entitySchemas.js	Импорт-схемы для таблиц: поля, шаблон, required, endpoint
components/common/importHelpers.js	Валидация строк при импорте по схеме (validateRowAgainstSchema)
components/common/ImportModal.jsx	Диалог импорта: загрузка Excel, валидация, отправка

🔁 Общая логика работы
Таблица строится на основе tableDefinitions

Каждое поле:

отображается через ValueDisplay

редактируется через EditableCell

имеет editorType и editorProps

fieldRenderers.js сопоставляет editorType с React-компонентом

TableWrapper оборачивает, TableToolbar и TableFooter добавляют управление

При импорте используется entitySchemas.js + ImportModal

📥 Импорт
Каждый тип (tnved_codes, ...) описан в entitySchemas.js

Используется validateImportRow() на основе tableDefinitions

Шаблоны Excel подгружаются через templateUrl

🛠 Если создаётся новая таблица
Опиши колонки в tableDefinitions

Добавь схему импорта в entitySchemas.js (если нужно)

Используй готовые компоненты:

EditableCell

TableWrapper

TableToolbar

TableFooter

Подключи ImportModal при необходимости

Передавай editorProps.options, если поле enum, autocomplete, role_id

🧠 Примеры используемых editorType
text, number, currency, percent, boolean

enum — через Autocomplete с options

status — отображается как Chip с цветом

date, datetime — с валидацией даты

array — ввод через запятую

link — отображается как <a> с target="_blank"

📌 Связанные документы
project_guidelines.md — стандарты по таблицам

auth-refresh-fix.md — авторизация, интерсептор

project_state.md — текущее состояние проекта

Файл создан автоматически 2025-07-15 для восстановления архитектуры таблиц в случае потери контекста.
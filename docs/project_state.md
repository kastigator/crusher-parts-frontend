# 📦 Project State — каталог запчастей (на 15 июля 2025)

Этот документ фиксирует текущее состояние проекта "каталоги продажи деталей" — как для фронтенда, так и для бэкенда. Используется как опорная точка при разработке новых компонентов.

---

## ☁️ Общие технологии

* **Frontend:** React + Vite + MUI, деплой через Cloud Build в GCS Bucket
* **Backend:** Node.js (Express), развёрнут на Google Cloud Run, подключён к Cloud SQL
* **CI/CD:** `cloudbuild.yaml`, `Dockerfile`, `.env.production`, `nginx.conf`

---

## ✅ Статус по разделам

| Раздел                   | Статус     | Комментарий                                               |
| ------------------------ | ---------- | --------------------------------------------------------- |
| 🔧 Backend               | ✅ Готов    | Авторизация, CORS, Cloud SQL, middleware работают         |
| 🎨 Frontend              | ✅ Готов    | Загружаются вкладки, таблицы, авторизация                 |
| 🧠 Универсальные таблицы | ❌ Отменены | Используется ручное подключение через `tableDefinitions`  |
| 🛡 Role Permissions      | ✅ Особая   | Кастомная логика, inline-редактирование, без перезагрузки |
| 📘 Документация          | ✅ Ведётся  | Есть `Project Guidelines` и текущий `Project State`       |

---

## 📁 Структура Frontend (`src/`)

* `components/common/` — `EditableCell`, `ActionIcons`, `TableToolbar`, `TableFooter`, `ValueDisplay`, `TableSkeleton`
* `context/` — `TabsContext`, `AuthContext`
* `pages/` — отображение страниц вкладок (например, `UsersPage.jsx`)
* `api/` — все запросы вынесены в отдельные функции (`getUsers`, `getTabs`, ...)
* `tableDefinitions` — колонка + `editorType` для каждой таблицы
* `entitySchemas.js` — схема импорта (если используется)
* `layout/` — обёртки, шапка, сайдбар (`PageWrapper`, `Sidebar`, `Header`)
* `auth/` — хранение токена, логин, `useAuth`

---

## 📁 Структура Backend

* `server.js` — основной запуск Express
* `routes/` — `users.js`, `auth.js`, `tabs.js`, `rolePermissions.js`, `hsCodes.js`
* `controllers/` — бизнес-логика API
* `middleware/` — `authMiddleware`, `adminOnly`
* `utils/` — общие утилиты (валидация, helper-функции)
* `cloudbuild.yaml`, `Dockerfile` — деплой в Cloud Run

---

## 📌 Активные вкладки и таблицы (UI + API)

| Вкладка          | Таблица в БД       | Особенности UI                |
| ---------------- | ------------------ | ----------------------------- |
| Users            | `users`            | Редактируемые поля, роли      |
| HS Codes         | `hs_codes`         | Классификатор ТН ВЭД          |
| Role Permissions | `role_permissions` | Особая логика, без универсала |

---

## 🧩 Компоненты, которые **уже реализованы** (Frontend)

* `EditableCell` — поддержка типов: `text`, `number`, `enum`, `bool`, `date`
* `ActionIcons` — сохранить, отменить, удалить, редактировать
* `ValueDisplay` — дата, валюта, статусы и пр.
* `TableWrapper`, `TableToolbar`, `TableFooter`, `TableSkeleton`

---

## 🚫 Что **не используется**

* `GenericTable.jsx` — универсальные таблицы **отклонены** из-за сложных исключений
* Автоматическая генерация колонок — всё через `tableDefinitions`

---

## ✅ Что можно делать дальше

> Просто опиши словами:
>
> "Хочу добавить таблицу `suppliers` с полями: `name`, `region`, `is_active`, редактировать только `is_active`."
>
> Я сам предложу конфигурацию для `tableDefinitions`, `entitySchemas` и компонентов.

---

*Документ поддерживается автоматически на основе состояния проекта и твоих действий.*

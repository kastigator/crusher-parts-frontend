
---

## 🔍 Комментарии по структуре

- `auth/` — логика авторизации, хранение токена, глобальный logout
- `components/common/` — унифицированные таблицы, редакторы, обёртки, схемы
- `components/users/` и `tnved/` — таблицы для конкретных вкладок
- `context/` — контексты (`TabsContext`, `AuthContext`)
- `api/` — axios-инстанс с `interceptors` и `refresh`
- `pages/` — роутируемые компоненты (страницы)
- `layout/` — `MainLayout`, `Header`, `Sidebar` и структура страниц
- `router/` — маршруты через `AppRouter.jsx`
- `tableDefinitions` / `entitySchemas.js` — описание колонок и импорт-схем (см. `project_guidelines.md`)

---

## 🔗 Связанные документы

- [`project_guidelines.md`](./project_guidelines.md) — правила подключения таблиц
- [`project_state.md`](./project_state.md) — актуальное состояние
- [`auth-refresh-fix.md`](./auth-refresh-fix.md) — исправление logout и refresh

---

*Файл создан автоматически 2025-07-15.*

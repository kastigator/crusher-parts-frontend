# useTableData.jsx — Универсальный хук для таблиц

## Назначение
`useTableData` обеспечивает единый подход к загрузке и отправке данных:
- GET / POST / PUT / DELETE
- Генерация пустой строки newRow
- Универсален для всех таблиц

## Использование
```js
const {
  data,
  newRow,
  setNewRow,
  onAdd,
  onSave,
  onDelete
} = useTableData("/users", {}, usersTableColumns)
```

## Аргументы
| Аргумент | Тип | Описание |
|----------|-----|----------|
| endpoint | string | URL API (например, "/users") |
| queryParams | object | GET-параметры (например, { clientId: 42 }) |
| columns | array | Описание колонок для генерации newRow |

## Возвращает
| Переменная | Назначение |
|------------|------------|
| data | Массив данных |
| newRow | Новая строка |
| setNewRow | Установить значения новой строки |
| onAdd(row) | POST запрос |
| onSave(row) | PUT запрос по id |
| onDelete(row) | DELETE запрос по id |

## Поведение
- Загружает данные при монтировании
- Автоматически обновляется при изменении queryParams
- Удаляет лишние поля с помощью sanitizePayload

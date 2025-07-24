# useTableData.jsx — Универсальный хук для таблиц

## Назначение
`useTableData` обеспечивает единый подход к загрузке и отправке данных:
- GET / POST / PUT / DELETE
- Управляет локальным состоянием и пагинацией
- Универсален для всех таблиц

## Использование
```js
const {
  data,
  paginatedData,
  newRow,
  setNewRow,
  onAdd,
  onSave,
  onDelete,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange
} = useTableData("/users")
```

## Аргументы
| Аргумент | Тип | Описание |
|----------|-----|----------|
| endpoint | string | URL API (например, "/users") |
| queryParams | object | GET-параметры (например, { clientId: 42 }) |
| options | object | { pagination, filterable } настройки |

## Возвращает
| Переменная | Назначение |
|------------|------------|
| data | Массив данных |
| paginatedData | Срез данных для текущей страницы |
| newRow | Новая строка (по умолчанию `{}`) |
| setNewRow | Установить значения новой строки |
| onAdd(row) | POST запрос |
| onSave(row) | PUT запрос по id |
| onDelete(row) | DELETE запрос по id |
| page, rowsPerPage | Состояние пагинации |
| onPageChange / onRowsPerPageChange | Обработчики пагинации |

## Поведение
- Загружает данные при монтировании
- Автоматически обновляется при изменении `queryParams`
- Удаляет лишние поля с помощью `sanitizePayload`
- Поддерживает пагинацию и фильтр при передаче опций

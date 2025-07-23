# tableDefinitions.js — определение колонок таблиц

## Назначение
Файл описывает колонки всех таблиц проекта. Используется в `BaseTable`.

## Формат записи
```js
export const usersTableColumns = [
  fieldSchemas.username,
  fieldSchemas.email,
  {
    field: "role_id",
    ...fieldSchemas.role_id
  },
  { field: "actions" }
]
```

## Структура колонки
| Поле | Назначение |
|------|------------|
| field | Название поля |
| title | Заголовок |
| type | Тип (text, checkbox, autocomplete, etc.) |
| required | Обязательное поле |
| editorProps | Доп. опции для редактора |
| display | Кастомный вывод |
| defaultValue | Значение по умолчанию |

## Поведение
- Используется `EditableCell` для рендера ячеек
- Автоматически подставляется в `useTableData` для генерации newRow

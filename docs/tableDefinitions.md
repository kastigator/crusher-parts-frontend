# tableDefinitions.js — определение колонок таблиц

## Назначение
Ранние версии проекта хранили колонки всех таблиц в отдельном файле.
Сейчас этот файл отсутствует: описания находятся прямо в компонентах или внутри `fieldSchemas.js`.

## Пример старого формата
```js
export const usersTableColumns = [
  fieldSchemas.username,
  fieldSchemas.email,
  { field: "role_id", ...fieldSchemas.role_id },
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
Если файл будет восстановлен, его содержимое можно использовать совместно с `EditableCell` и `useTableData`.

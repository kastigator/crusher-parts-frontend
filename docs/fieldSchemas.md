# fieldSchemas.js — описание общих типов полей

## Назначение
Централизованно описывает свойства полей:
- title (человекочитаемое имя)
- type (для EditableCell)
- editorProps (options и т.п.)
- display (кастомный вывод)

## Пример
```js
export const fieldSchemas = {
  username: { title: "Логин", type: "text", required: true },
  email: { title: "Email", type: "email" },
  role_id: {
    title: "Роль",
    type: "autocomplete",
    required: true,
    editorProps: {
      lazyOptions: true,
      fetchOptions: async () => [...], // загрузка ролей
      getOptionLabel: (opt) => opt.label
    }
  }
}
```

## Использование
Импортируется в tableDefinitions:
```js
import { fieldSchemas } from "./fieldSchemas"
const usersTableColumns = [
  fieldSchemas.username,
  fieldSchemas.email,
  { field: "actions" }
]
```

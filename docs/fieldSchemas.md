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
Некоторые таблицы хранят описание колонок прямо здесь, например:
```js
export const fieldSchemas = {
  tnved_code: {
    columns: [
      { field: "code", title: "Код" },
      { field: "description", title: "Описание" }
    ]
  }
}
```
Другие компоненты могут объявлять массив `columns` локально и использовать поля из `fieldSchemas` по необходимости.

# EditableCell.jsx — универсальный редактор ячеек

## Назначение
Рендерит ячейку таблицы в виде:
- текста (в обычном режиме)
- текстового поля, select, checkbox, Autocomplete (в режиме редактирования)

## Поддерживаемые типы через column.type:
- text
- password
- checkbox
- autocomplete (в т.ч. lazyOptions)
- custom (через column.editor)
- кастомный display (через column.display)

## Пример
```jsx
{
  field: "email",
  type: "text",
  title: "Email",
  required: true,
  width: 250
}
```

## Поведение
- Отображает значение с Tooltip
- Показывает редактор только при isEditing
- Для autocomplete поддерживает options или lazy fetch

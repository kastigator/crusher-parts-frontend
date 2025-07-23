# EditableRow.jsx — строка таблицы с редактированием

## Назначение
Рендерит строку таблицы, поддерживает:
- Режим редактирования
- Добавление новой строки
- Вывод иконок действий

## Пропсы
| Название | Тип | Назначение |
|----------|-----|------------|
| row | object | Данные строки |
| columns | array | Колонки таблицы |
| onChange(field, value) | function | Изменение ячеек |
| onSave(row) | function | Сохранение строки |
| onAdd(row) | function | Добавление новой строки |
| onDelete(row) | function | Удаление строки |
| onCancel() | function | Отмена редактирования |
| onEdit(row) | function | Включить режим редактирования |
| onResetPassword(row) | function | Сброс пароля (иконка) |
| onShowLogs(row) | function | История изменений (иконка) |
| isNewRow | boolean | Это строка добавления? |
| isEditing | boolean | Сейчас редактируется? |
| readonlyRow | boolean | Строка заблокирована? |
| sx | object | Стили для строки |

## Поведение
- При Enter вызывает onAdd или onSave
- При Escape вызывает onCancel
- Автоматически рендерит ActionIcons и EditableCell

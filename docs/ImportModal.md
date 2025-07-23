# ImportModal.jsx — модальное окно импорта

## Назначение
Позволяет импортировать записи из Excel-файла. Использует:
- entitySchemas.js для схемы полей
- confirmAction для подтверждения
- drag & drop или кнопку выбора файла

## Пропсы
| Название | Тип | Назначение |
|----------|-----|------------|
| type | string | Имя схемы из entitySchemas |
| onImported(data) | function | Колбэк после успешного импорта |

## entitySchemas.js
Формат:
```js
export const entitySchemas = {
  users: {
    displayNames: {
      username: "Логин",
      email: "Email"
    },
    required: ["username"],
    fields: ["username", "email", "role_id"]
  }
}
```

## Поведение
- Проверяет дубликаты по ключам
- Показывает ошибки
- Передаёт массив объектов в onImported

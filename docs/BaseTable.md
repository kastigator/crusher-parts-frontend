# BaseTable.jsx — Универсальный компонент таблицы

## Назначение
Отображает таблицу с возможностью добавления, редактирования и удаления строк. Используется со всеми сущностями.

## Использование
```jsx
<BaseTable
  columns={usersTableColumns}
  data={data}
  onAdd={onAdd}
  onSave={onSave}
  onDelete={onDelete}
  readonlyRow={(row) => row.role_slug === "admin"}
  sxRow={(row) => !row.is_active ? { opacity: 0.5 } : {}}
/>
```

## Пропсы
| Название | Тип | Назначение |
|----------|-----|------------|
| columns | array | Описание колонок |
| data | array | Строки таблицы |
| onAdd / onSave / onDelete | function | Обработчики действий |
| onResetPassword / onShowLogs | function | Кнопки сброса и логов |
| readonlyRow(row) | function | Блокировка строки |
| sxRow(row) | function | Стили для строки |
| validateRow(row) | function | Проверка перед сохранением |
| hideToolbar / hideFooter | boolean | Скрытие панели и подвала |
| title | string | Заголовок таблицы |

## Поведение
- Добавление сверху
- Редактирование по двойному клику
- Enter — сохранить, Escape — отмена
- Поддержка действий через ActionIcons

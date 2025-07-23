/**
 * Убирает "мусорные" или UI-поля перед отправкой данных на сервер
 * Используется в POST и PUT-запросах, чтобы избежать ошибок и не отправлять лишнее.
 *
 * Поддерживает все таблицы — универсален.
 * Если появляются новые временные/отображаемые поля, просто добавь их в список ниже.
 */

export function sanitizePayload(obj = {}) {
  const excludedFields = [
    "id",             // автоинкрементируемый ключ — не нужен при POST
    "slug",           // вычисляется на сервере
    "tab_name",       // только для отображения
    "role_name",      // только для отображения
    "sort_order",     // обновляется отдельно, не через PUT
    "created_at",     // системное поле БД
    "updated_at",     // системное поле БД
    "isEditing",      // UI-флаг
    "actions"         // колонка с иконками, не существует в БД
  ]

  const cleaned = {}

  Object.entries(obj).forEach(([key, value]) => {
    if (excludedFields.includes(key)) return
    if (typeof value === "undefined") return
    cleaned[key] = value
  })

  return cleaned
}

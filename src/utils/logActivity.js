// src/utils/logActivity.js
import axios from "@/api/axiosInstance"

/**
 * Отправка действия в /activity-logs на сервер
 * @param {string} action - 'create', 'update', 'delete', и т.п.
 * @param {string} entity_type - название сущности (например, 'tnved_code')
 * @param {number|string} entity_id - ID сущности
 * @param {string|null} field_changed - если логируем конкретное поле
 * @param {string|number|null} old_value - предыдущее значение
 * @param {Object} meta - дополнительные параметры: comment, new_value
 */
export default async function logActivity(
  action,
  entity_type,
  entity_id,
  field_changed = null,
  old_value = null,
  meta = {}
) {
  if (!action || !entity_type || !entity_id) {
    console.warn("⛔ logActivity: отсутствуют обязательные поля", {
      action,
      entity_type,
      entity_id
    })
    return
  }

  try {
    await axios.post("/activity-logs", {
      action: action.trim().toLowerCase(), // нормализуем
      entity_type,
      entity_id,
      field_changed,
      old_value,
      new_value: meta?.new_value ?? null,
      comment: meta?.comment ?? null
    })
  } catch (err) {
    console.error("❌ Ошибка логирования (frontend):", err?.message || err)
  }
}

// src/utils/logActivity.js
import axios from "@/api/axiosInstance"

/**
 * Логирование действия в /activity-logs
 * @param {'create'|'update'|'delete'} action
 * @param {string} entity_type
 * @param {number|string|null} entity_id
 * @param {string|null} [field_changed]
 * @param {string|number|null} [old_value]
 * @param {{new_value?: any, comment?: string}} [meta]
 */
export default async function logActivity(
  action,
  entity_type,
  entity_id,
  field_changed = null,
  old_value = null,
  meta = {}
) {
  // 1) action
  const act = String(action || "").trim().toLowerCase()
  const allowed = new Set(["create", "update", "delete"])
  if (!allowed.has(act)) {
    console.warn("⛔ logActivity: invalid action", { action })
    console.trace()
    return
  }

  // 2) entity_type
  if (typeof entity_type !== "string" || !entity_type.trim()) {
    console.warn("⛔ logActivity: entity_type must be non-empty string", { entity_type })
    console.trace()
    return
  }

  // 3) entity_id → number|null
  let idToSend = null
  if (entity_id !== undefined && entity_id !== null && entity_id !== "") {
    const num = Number(entity_id)
    if (Number.isNaN(num)) {
      console.warn("⛔ logActivity: entity_id must be numeric or null", { entity_id })
      console.trace()
      return
    }
    idToSend = num
  }

  // 4) field_changed → string|null
  let field = null
  if (field_changed !== undefined && field_changed !== null && field_changed !== "") {
    if (typeof field_changed !== "string") {
      console.warn("⛔ logActivity: field_changed must be a string or null", { field_changed })
      console.trace()
      return
    }
    field = field_changed
  }

  // 5) Значения (не шлём undefined)
  const payload = {
    action: act,
    entity_type,
    entity_id: idToSend,
    field_changed: field,
    old_value: old_value ?? null,
    new_value: meta?.new_value ?? null,
    comment: meta?.comment ?? null
  }

  try {
    await axios.post("/activity-logs", payload)
    // console.debug("✅ logActivity sent:", payload) // ← включи при необходимости
  } catch (err) {
    console.error("❌ Ошибка логирования (frontend):", err?.message || err)
  }
}

import logActivity from "./logActivity"

/**
 * Сравнивает два объекта и логирует отличающиеся поля
 * @param {Object} params
 * @param {Object} params.oldData
 * @param {Object} params.newData
 * @param {string} params.entity_type
 * @param {string|number} params.entity_id
 */
export default async function logFieldDiffs({ oldData, newData, entity_type, entity_id }) {
  // ✅ Базовая валидация
  if (!oldData || !newData) {
    console.warn("⛔ logFieldDiffs: oldData/newData is required")
    console.trace()
    return
  }
  if (typeof entity_type !== "string" || !entity_type.trim()) {
    console.warn("⛔ logFieldDiffs: entity_type must be non-empty string", { entity_type })
    console.trace()
    return
  }

  const idNum = Number(entity_id)
  if (Number.isNaN(idNum)) {
    console.warn("⛔ logFieldDiffs: entity_id must be numeric", { entity_id })
    console.trace()
    return
  }

  // ✅ Обход по ключам newData, сравнение как строк
  for (const key in newData) {
    if (!Object.prototype.hasOwnProperty.call(oldData, key)) continue

    const oldVal = oldData[key]
    const newVal = newData[key]

    const oldStr = oldVal == null ? "" : String(oldVal)
    const newStr = newVal == null ? "" : String(newVal)

    if (oldStr !== newStr) {
      await logActivity("update", entity_type, idNum, key, oldVal, { new_value: newVal })
    }
  }
}

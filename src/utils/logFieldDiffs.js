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
  for (const key in newData) {
    if (!(key in oldData)) continue
    const oldVal = oldData[key]
    const newVal = newData[key]
    if (String(oldVal ?? "") !== String(newVal ?? "")) {
      await logActivity("update", entity_type, entity_id, key, oldVal, {
        new_value: newVal
      })
    }
  }
}

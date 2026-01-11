const normalizeConflictValue = (value) => {
  if (value === undefined || value === null) return null
  if (typeof value === "string") {
    const trimmed = value.trim()
    return trimmed === "" ? null : trimmed
  }
  if (typeof value === "boolean") return value ? 1 : 0
  return value
}

const toNumberOrNull = (value) => {
  if (value === undefined || value === null) return null
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  if (typeof value === "boolean") return value ? 1 : 0
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) return null
    const num = Number(trimmed)
    return Number.isFinite(num) ? num : null
  }
  return null
}

const fieldKey = (field) =>
  typeof field === "string" ? field : field?.key

export const isSameByFields = (current, draft, fields = []) => {
  if (!current || !draft) return false
  const list = Array.isArray(fields) ? fields : []
  return list.every((f) => {
    const key = fieldKey(f)
    if (!key) return true
    const left = normalizeConflictValue(current[key])
    const right = normalizeConflictValue(draft[key])
    const numLeft = toNumberOrNull(left)
    const numRight = toNumberOrNull(right)
    if (numLeft !== null && numRight !== null) return numLeft === numRight
    return (left ?? null) === (right ?? null)
  })
}

export const mergeConflictDraft = (current = {}, draft = {}) => {
  const merged = { ...current, ...draft }
  if (current?.id !== undefined) merged.id = current.id
  if (current?.version !== undefined) merged.version = current.version
  return merged
}

export default {
  isSameByFields,
  mergeConflictDraft,
}

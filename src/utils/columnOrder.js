export function getOrderedKeys(orderKeys, defaultKeys) {
  const safeDefault = Array.isArray(defaultKeys) ? defaultKeys.filter(Boolean) : []
  const source = Array.isArray(orderKeys) ? orderKeys.filter(Boolean) : []
  const normalizeActionsLast = (keys) => {
    const list = Array.isArray(keys) ? keys.filter(Boolean) : []
    if (!list.includes("actions")) return list
    return [...list.filter((key) => key !== "actions"), "actions"]
  }
  if (!source.length) return normalizeActionsLast(safeDefault)

  const next = []
  const used = new Set()

  source.forEach((key) => {
    if (safeDefault.includes(key) && !used.has(key)) {
      used.add(key)
      next.push(key)
    }
  })

  safeDefault.forEach((key) => {
    if (!used.has(key)) {
      used.add(key)
      next.push(key)
    }
  })

  return normalizeActionsLast(next)
}

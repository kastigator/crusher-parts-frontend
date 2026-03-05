export function getOrderedKeys(orderKeys, defaultKeys) {
  const safeDefault = Array.isArray(defaultKeys) ? defaultKeys.filter(Boolean) : []
  const source = Array.isArray(orderKeys) ? orderKeys.filter(Boolean) : []
  if (!source.length) return safeDefault

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

  return next
}

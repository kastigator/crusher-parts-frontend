export const parseAltKey = (key) => {
  const parts = String(key).split(":")
  if (parts[0] !== "alt" || parts.length < 4) return null
  return {
    rfqItemId: Number(parts[1]),
    basePartId: Number(parts[2]),
    altPartId: Number(parts[3]),
  }
}

export const parseBomKey = (key) => {
  const parts = String(key).split(":")
  if (parts[0] !== "bom" || parts.length < 3) return null
  return {
    rfqItemId: Number(parts[1]),
    basePartId: Number(parts[2]),
  }
}

export const parseKitKey = (key) => {
  const parts = String(key).split(":")
  if (parts[0] !== "kit" || parts.length < 4) return null
  return {
    rfqItemId: Number(parts[1]),
    bundleId: Number(parts[2]),
    roleId: Number(parts[3]),
  }
}

export const parseProfileKey = (key) => {
  const parts = String(key).split(":")
  if (parts[0] !== "profile" || parts.length < 4) return null
  return {
    rfqItemId: Number(parts[1]),
    basePartId: Number(parts[2]),
    profileId: Number(parts[3]),
  }
}

const removeAltForBase = (next, rfqItemId, basePartId) => {
  const prefix = `alt:${rfqItemId}:${basePartId}:`
  Array.from(next).forEach((key) => {
    if (String(key).startsWith(prefix)) next.delete(key)
  })
}

const removeOriginalForBase = (next, lineType, rfqItemId, basePartId) => {
  if (lineType === "DEMAND") {
    next.delete(`demand:${rfqItemId}`)
  } else if (lineType === "BOM_COMPONENT") {
    const prefix = `bom:${rfqItemId}:${basePartId}`
    Array.from(next).forEach((key) => {
      if (String(key).startsWith(prefix)) next.delete(key)
    })
  }
}

const removeProfileForBase = (next, rfqItemId, basePartId) => {
  const prefix = `profile:${rfqItemId}:${basePartId}:`
  Array.from(next).forEach((key) => {
    if (String(key).startsWith(prefix)) next.delete(key)
  })
}

const removeKitRolesForBase = (next, rfqItemId, basePartId, selectionNodeMap) => {
  Array.from(next).forEach((key) => {
    const node = selectionNodeMap.get(key)
    if (
      node?.line_type === "KIT_ROLE" &&
      Number(node.rfq_item_id) === Number(rfqItemId) &&
      Number(node.original_part_id) === Number(basePartId)
    ) {
      next.delete(key)
    }
  })
}

export const applyAltExclusionToKeys = (
  prevKeys,
  actionKey,
  actionChecked,
  selectionNodeMap,
) => {
  const next = new Set(prevKeys)
  if (!actionChecked) return next
  const keyStr = String(actionKey)
  if (keyStr.startsWith("alt:")) {
    const parsed = parseAltKey(keyStr)
    if (!parsed) return next
    const lineType = selectionNodeMap.get(keyStr)?.line_type
    if (!lineType) return next
    removeOriginalForBase(next, lineType, parsed.rfqItemId, parsed.basePartId)
    removeProfileForBase(next, parsed.rfqItemId, parsed.basePartId)
    removeKitRolesForBase(next, parsed.rfqItemId, parsed.basePartId, selectionNodeMap)
    return next
  }
  if (keyStr.startsWith("profile:")) {
    const parsed = parseProfileKey(keyStr)
    if (!parsed) return next
    const lineType = selectionNodeMap.get(keyStr)?.line_type
    if (!lineType) return next
    removeOriginalForBase(next, lineType, parsed.rfqItemId, parsed.basePartId)
    removeAltForBase(next, parsed.rfqItemId, parsed.basePartId)
    removeKitRolesForBase(next, parsed.rfqItemId, parsed.basePartId, selectionNodeMap)
    return next
  }
  if (keyStr.startsWith("kit:")) {
    const parsed = parseKitKey(keyStr)
    if (!parsed) return next
    const node = selectionNodeMap.get(keyStr)
    const basePartId = node?.original_part_id
    if (basePartId) {
      removeOriginalForBase(next, "DEMAND", parsed.rfqItemId, basePartId)
      removeOriginalForBase(next, "BOM_COMPONENT", parsed.rfqItemId, basePartId)
      removeAltForBase(next, parsed.rfqItemId, basePartId)
      removeProfileForBase(next, parsed.rfqItemId, basePartId)
    }
    return next
  }
  if (keyStr.startsWith("demand:")) {
    const node = selectionNodeMap.get(keyStr)
    if (node?.original_part_id) {
      removeAltForBase(next, node.rfq_item_id, node.original_part_id)
      removeProfileForBase(next, node.rfq_item_id, node.original_part_id)
      removeKitRolesForBase(next, node.rfq_item_id, node.original_part_id, selectionNodeMap)
    }
    return next
  }
  if (keyStr.startsWith("bom:")) {
    const parsed = parseBomKey(keyStr)
    if (parsed) {
      removeAltForBase(next, parsed.rfqItemId, parsed.basePartId)
      removeProfileForBase(next, parsed.rfqItemId, parsed.basePartId)
      removeKitRolesForBase(next, parsed.rfqItemId, parsed.basePartId, selectionNodeMap)
    }
  }
  return next
}

import React, { useMemo, useState } from "react"
import {
  Button,
  Card,
  Empty,
  message,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd"
import axios from "@/api/axiosInstance"

const { Text } = Typography

const STATUS_META = {
  NQ: { color: "default", label: "NQ", hint: "Не запрашивали" },
  NS: { color: "default", label: "NS", hint: "Выбрано, но не отправлено" },
  "Q?": { color: "gold", label: "Q?", hint: "Запрошено, ждём ответ" },
  "Q-": { color: "volcano", label: "Q-", hint: "Ответ есть, но элемент не закрыт" },
  "Q+": { color: "blue", label: "Q+", hint: "Элемент закрыт, но без цены/неполно" },
  "Q+P": { color: "green", label: "Q+P", hint: "Элемент закрыт, есть цена" },
  "Q+OEM": { color: "green", label: "Q+OEM", hint: "Элемент закрыт (OEM), есть цена" },
  "Q!": { color: "red", label: "Q!", hint: "Конфликт/неоднозначность" },
}

const STATUS_RANK = {
  NQ: 0,
  NS: 1,
  "Q?": 2,
  "Q-": 3,
  "Q+": 4,
  "Q+P": 5,
  "Q+OEM": 6,
  "Q!": 7,
}

const CLOSED_STATUSES = new Set(["Q+", "Q+P", "Q+OEM"])
const PRICED_STATUSES = new Set(["Q+P", "Q+OEM"])

const safeNum = (v, fallback = 0) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

const uniqBy = (arr, keyFn) => {
  const out = []
  const seen = new Set()
  ;(arr || []).forEach((item) => {
    const key = keyFn(item)
    if (seen.has(key)) return
    seen.add(key)
    out.push(item)
  })
  return out
}

const parseStatus = (row, oemRequired = false) => {
  const workspaceStatus = String(row?.workspace_status || "").toUpperCase()
  const lineStatus = String(row?.line_status_raw || row?.line_status || "").toUpperCase()
  const replyStatus = String(row?.latest_supplier_reply_status || "").toUpperCase()
  const offerType = String(row?.latest_offer_type || "").toUpperCase()
  const hasExplicitPrice =
    Number.isFinite(Number(row?.latest_price)) &&
    String(row?.latest_currency || "").trim().length > 0
  const acceptedExisting = lineStatus === "ACCEPTED_EXISTING"
  const hasPrice = hasExplicitPrice || acceptedExisting

  if (workspaceStatus === "ARCHIVED") {
    return { code: "NQ", reason: "ARCHIVED" }
  }
  if (workspaceStatus === "NOT_SENT") {
    return { code: "NS", reason: "NOT_SENT" }
  }
  if (workspaceStatus === "WAITING_RESPONSE") {
    return { code: "Q?", reason: "WAITING_RESPONSE" }
  }
  if (workspaceStatus !== "RESPONDED") {
    return { code: "NQ", reason: workspaceStatus || "UNKNOWN" }
  }

  if (replyStatus && replyStatus !== "QUOTED" && !hasPrice) {
    return { code: "Q-", reason: replyStatus }
  }

  if (oemRequired) {
    if (offerType === "OEM") {
      return { code: hasPrice ? "Q+OEM" : "Q+", reason: "OEM" }
    }
    if (offerType && offerType !== "UNKNOWN") {
      return { code: "Q-", reason: `OEM_REQUIRED:${offerType}` }
    }
  }

  return { code: hasPrice ? "Q+P" : "Q+", reason: hasPrice ? "PRICED" : "NO_PRICE" }
}

const chooseBestCellStatus = (rows, { oemRequired = false } = {}) => {
  if (!Array.isArray(rows) || !rows.length) {
    return { code: "NQ", rows: [], reason: "NO_ROWS" }
  }

  let best = null
  rows.forEach((row) => {
    const parsed = parseStatus(row, oemRequired)
    const rank = STATUS_RANK[parsed.code] ?? 0
    if (!best || rank > best.rank) {
      best = {
        code: parsed.code,
        rank,
        row,
        reason: parsed.reason,
      }
    }
  })

  return { code: best?.code || "NQ", row: best?.row || null, rows, reason: best?.reason || null }
}

const flattenBomNodes = (nodes, collector = [], pathPrefix = "") => {
  ;(nodes || []).forEach((node, idx) => {
    const path = pathPrefix ? `${pathPrefix}.${idx + 1}` : `${idx + 1}`
    const hasChildren = Array.isArray(node.children) && node.children.length > 0
    if (!hasChildren) {
      collector.push({
        key: `BOM:${node.original_part_id || path}`,
        path_key: path,
        path_group: "STRUCTURE",
        line_type: "BOM_COMPONENT",
        label: node.cat_number || "Компонент BOM",
        description: node.description || node.description_ru || node.description_en || "—",
        original_part_id: Number(node.original_part_id || 0) || null,
        bundle_item_id: null,
        required_qty: node.required_qty ?? null,
        qty_per_parent: node.qty_per_parent ?? null,
        uom: node.uom || null,
        bundle_ids: Array.isArray(node.bundle_ids) ? node.bundle_ids : [],
        bundle_role_options: Array.isArray(node.bundle_role_options) ? node.bundle_role_options : [],
        parent_original_part_id: null,
        is_oem_required: false,
      })
    }
    if (hasChildren) {
      flattenBomNodes(node.children, collector, path)
    }
  })
  return collector
}

const buildCoverageElementsForItem = (item, workspaceRowsForItem) => {
  const enabledOptions = Array.isArray(item?.options)
    ? item.options.filter((opt) => opt?.enabled)
    : []

  const elements = []
  const bomElements = []

  enabledOptions.forEach((opt) => {
    const type = String(opt?.type || "").toUpperCase()
    if (type === "WHOLE") {
      elements.push({
        key: `WHOLE:${item.rfq_item_id}`,
        path_group: "WHOLE",
        line_type: "DEMAND",
        label: item.original_cat_number || item.client_part_number || "Позиция клиента",
        description: "Узел целиком",
        original_part_id: Number(item.original_part_id || 0) || null,
        bundle_item_id: null,
        required_qty: item.requested_qty ?? null,
        uom: item.uom || null,
        is_oem_required: Number(item.oem_only || 0) === 1,
      })
    }
    if (type === "BOM") {
      flattenBomNodes(opt.children || [], bomElements)
    }
  })

  const kitRows = (workspaceRowsForItem || []).filter(
    (r) => String(r?.selected_line_type || "").toUpperCase() === "KIT_ROLE"
  )

  const decomposedPartIds = new Set()
  const kitRoleElements = []
  const bomByPartId = new Map(bomElements.map((el) => [Number(el.original_part_id || 0), el]))
  const kitRowsByParent = new Map()

  kitRows.forEach((row) => {
    const parentPartId = Number(row?.selected_original_part_id || 0) || null
    if (!parentPartId) return
    const list = kitRowsByParent.get(parentPartId) || []
    list.push(row)
    kitRowsByParent.set(parentPartId, list)
  })

  kitRowsByParent.forEach((rows, parentPartId) => {
    if (!parentPartId) return
    decomposedPartIds.add(parentPartId)
    const bomEl = bomByPartId.get(parentPartId) || null
    const selectedBundleIds = uniqBy(
      rows
        .map((row) => Number(row?.selected_bundle_id || 0) || null)
        .filter(Boolean)
        .map((bundleId) => ({ bundleId })),
      (x) => x.bundleId
    ).map((x) => x.bundleId)

    let roleDefs = []
    const roleOptions = Array.isArray(bomEl?.bundle_role_options) ? bomEl.bundle_role_options : []

    if (selectedBundleIds.length === 1) {
      const selectedOpt = roleOptions.find(
        (opt) => Number(opt?.bundle_id || 0) === Number(selectedBundleIds[0])
      )
      if (selectedOpt?.roles?.length) roleDefs = selectedOpt.roles
    }
    if (!roleDefs.length && roleOptions.length === 1 && Array.isArray(roleOptions[0]?.roles)) {
      roleDefs = roleOptions[0].roles
    }

    const fallbackObservedRoles = uniqBy(
      rows
        .map((row) => ({
          bundle_item_id: Number(row?.selected_bundle_item_id || 0) || null,
          role_label: String(row?.selected_line_label || "").trim() || "Роль",
          qty_per_parent: null,
        }))
        .filter((r) => r.bundle_item_id || r.role_label),
      (r) => `${r.bundle_item_id || 0}:${r.role_label}`
    )

    const effectiveRoles = roleDefs.length
      ? roleDefs.map((role) => ({
          bundle_item_id: Number(role?.bundle_item_id || 0) || null,
          role_label: String(role?.role_label || "").trim() || "Роль",
          qty_per_parent: role?.qty_per_parent ?? null,
        }))
      : fallbackObservedRoles

    effectiveRoles.forEach((role) => {
      const roleLabel = String(role.role_label || "").trim() || "Роль"
      const bundleItemId = Number(role.bundle_item_id || 0) || null
      kitRoleElements.push({
        key: bundleItemId
          ? `KIT_ROLE:${parentPartId}:${bundleItemId}`
          : `KIT_ROLE_LABEL:${parentPartId}:${roleLabel}`,
        path_group: "STRUCTURE",
        line_type: "KIT_ROLE",
        label: roleLabel,
        description: `Роль комплекта: ${roleLabel}`,
        original_part_id: parentPartId,
        bundle_item_id: bundleItemId,
        required_qty:
          bomEl?.required_qty != null && role?.qty_per_parent != null
            ? safeNum(bomEl.required_qty, 0) * safeNum(role.qty_per_parent, 1)
            : null,
        uom: bomEl?.uom || item.uom || null,
        parent_original_part_id: parentPartId,
        is_oem_required: false,
      })
    })
  })

  const filteredBom = bomElements.filter((el) => !decomposedPartIds.has(el.original_part_id))
  elements.push(...filteredBom, ...kitRoleElements)

  return elements
}

const mapWorkspaceRowToElementKey = (row, item) => {
  const lineType = String(row?.selected_line_type || "").toUpperCase()
  if (lineType === "DEMAND") {
    return `WHOLE:${item.rfq_item_id}`
  }
  if (lineType === "BOM_COMPONENT") {
    const partId = Number(row?.selected_original_part_id || row?.selected_alt_original_part_id || 0) || null
    return partId ? `BOM:${partId}` : null
  }
  if (lineType === "KIT_ROLE") {
    const parentPartId = Number(row?.selected_original_part_id || 0) || 0
    const bundleItemId = Number(row?.selected_bundle_item_id || 0) || 0
    const label = String(row?.selected_line_label || "").trim()
    if (bundleItemId) return `KIT_ROLE:${parentPartId}:${bundleItemId}`
    if (label) return `KIT_ROLE_LABEL:${parentPartId}:${label}`
  }
  return null
}

const cartesianConcatVariants = (variantGroups) => {
  if (!variantGroups.length) return []
  let acc = [{ atoms: [], labels: [] }]
  for (const group of variantGroups) {
    const next = []
    for (const prefix of acc) {
      for (const variant of group) {
        next.push({
          atoms: [...prefix.atoms, ...(variant?.atoms || [])],
          labels: [...prefix.labels, variant?.label || "вариант"],
        })
      }
    }
    acc = next
  }
  return acc
}

const uniqAtoms = (atoms) =>
  uniqBy(
    (atoms || []).filter((a) => a?.key),
    (a) => a.key
  )

const dedupeCoverageVariants = (variants) => {
  const seen = new Set()
  const out = []
  ;(variants || []).forEach((variant, idx) => {
    const atoms = uniqAtoms(variant?.atoms || [])
    const sig = atoms
      .map((a) => a.key)
      .sort()
      .join("|")
    if (!sig || seen.has(sig)) return
    seen.add(sig)
    out.push({
      key: variant?.key || `variant-${idx + 1}`,
      label: variant?.label || `Вариант ${idx + 1}`,
      type: variant?.type || "ALT",
      atoms,
    })
  })
  return out
}

const buildCoverageSlotsForItem = (item, workspaceRowsForItem) => {
  const enabledOptions = Array.isArray(item?.options)
    ? item.options.filter((opt) => opt?.enabled)
    : []
  const bomOption = enabledOptions.find((opt) => String(opt?.type || "").toUpperCase() === "BOM")
  const hasWhole = enabledOptions.some((opt) => String(opt?.type || "").toUpperCase() === "WHOLE")
  const kitRows = (workspaceRowsForItem || []).filter(
    (r) => String(r?.selected_line_type || "").toUpperCase() === "KIT_ROLE"
  )
  const kitRowsByParent = new Map()
  kitRows.forEach((row) => {
    const parentPartId = Number(row?.selected_original_part_id || 0) || null
    if (!parentPartId) return
    const list = kitRowsByParent.get(parentPartId) || []
    list.push(row)
    kitRowsByParent.set(parentPartId, list)
  })

  const buildNodeVariants = (node) => {
    const partId = Number(node?.original_part_id || 0) || null
    if (!partId) return []
    const variants = []
    const directLabel = node?.cat_number || node?.description || "Подсборка"
    variants.push({
      key: `DIR:${partId}`,
      label: directLabel,
      type: "DIRECT",
      atoms: [
        {
          key: `BOM:${partId}`,
          label: node?.cat_number || "BOM",
          kind: "BOM_COMPONENT",
        },
      ],
    })

    const children = Array.isArray(node?.children) ? node.children : []
    if (children.length) {
      const childGroups = children.map((child) => buildNodeVariants(child)).filter((g) => g.length)
      if (childGroups.length === children.length) {
        const combos = cartesianConcatVariants(childGroups)
        combos.forEach((combo, idx) => {
          variants.push({
            key: `DEC:${partId}:${idx + 1}`,
            label: `Состав (${combo.labels.join(" + ")})`,
            type: "DECOMPOSED",
            atoms: combo.atoms,
          })
        })
      }
    }

    const roleOptions = Array.isArray(node?.bundle_role_options) ? node.bundle_role_options : []
    const observedRows = kitRowsByParent.get(partId) || []
    const observedBundleIds = uniqBy(
      observedRows
        .map((r) => Number(r?.selected_bundle_id || 0) || null)
        .filter(Boolean)
        .map((bundle_id) => ({ bundle_id })),
      (x) => x.bundle_id
    ).map((x) => x.bundle_id)

    let effectiveRoleOptions = roleOptions
    if (observedBundleIds.length === 1) {
      effectiveRoleOptions = roleOptions.filter(
        (opt) => Number(opt?.bundle_id || 0) === Number(observedBundleIds[0])
      )
    }
    if (!effectiveRoleOptions.length && roleOptions.length === 1) {
      effectiveRoleOptions = roleOptions
    }

    if (effectiveRoleOptions.length) {
      effectiveRoleOptions.forEach((opt, idx) => {
        const roles = Array.isArray(opt?.roles) ? opt.roles : []
        if (!roles.length) return
        variants.push({
          key: `KIT:${partId}:${Number(opt?.bundle_id || idx + 1)}`,
          label: `Комплект${opt?.title ? `: ${opt.title}` : ""}`,
          type: "KIT",
          atoms: roles.map((role) => {
            const bundleItemId = Number(role?.bundle_item_id || 0) || null
            const roleLabel = String(role?.role_label || "").trim() || "Роль"
            return {
              key: bundleItemId
                ? `KIT_ROLE:${partId}:${bundleItemId}`
                : `KIT_ROLE_LABEL:${partId}:${roleLabel}`,
              label: roleLabel,
              kind: "KIT_ROLE",
            }
          }),
        })
      })
    } else if (observedRows.length) {
      const observedRoles = uniqBy(
        observedRows
          .map((r) => ({
            bundle_item_id: Number(r?.selected_bundle_item_id || 0) || null,
            role_label: String(r?.selected_line_label || "").trim() || "Роль",
          }))
          .filter((r) => r.bundle_item_id || r.role_label),
        (r) => `${r.bundle_item_id || 0}:${r.role_label}`
      )
      if (observedRoles.length) {
        variants.push({
          key: `KIT_OBS:${partId}`,
          label: "Комплект (по наблюдаемым ролям)",
          type: "KIT",
          atoms: observedRoles.map((role) => ({
            key: role.bundle_item_id
              ? `KIT_ROLE:${partId}:${role.bundle_item_id}`
              : `KIT_ROLE_LABEL:${partId}:${role.role_label}`,
            label: role.role_label,
            kind: "KIT_ROLE",
          })),
        })
      }
    }

    return dedupeCoverageVariants(variants)
  }

  const structureSlots = Array.isArray(bomOption?.children)
    ? bomOption.children.map((node, idx) => ({
        key: `SLOT:${Number(node?.original_part_id || 0) || idx + 1}`,
        label: node?.cat_number || `Слот ${idx + 1}`,
        description: node?.description || node?.description_ru || node?.description_en || "—",
        required_qty: node?.required_qty ?? null,
        uom: node?.uom || item?.uom || null,
        is_oem_required: false,
        variants: buildNodeVariants(node),
      }))
    : []

  const validStructureSlots = structureSlots.filter((slot) => Array.isArray(slot.variants) && slot.variants.length)

  const wholeSlot = hasWhole
    ? {
        key: `WHOLE_SLOT:${item?.rfq_item_id}`,
        label: item?.original_cat_number || item?.client_part_number || "Позиция клиента",
        description: "Узел целиком",
        required_qty: item?.requested_qty ?? null,
        uom: item?.uom || null,
        is_oem_required: Number(item?.oem_only || 0) === 1,
        variants: [
          {
            key: `WHOLE_VARIANT:${item?.rfq_item_id}`,
            label: "Узел целиком",
            type: "WHOLE",
            atoms: [{ key: `WHOLE:${item?.rfq_item_id}`, label: "Узел целиком", kind: "DEMAND" }],
          },
        ],
      }
    : null

  return {
    structureSlots: validStructureSlots,
    wholeSlot,
  }
}

const normalizePotentialConsolidation = (countries) => {
  const list = [...new Set((countries || []).filter(Boolean))]
  if (list.length === 0) return "Неизвестно"
  if (list.length <= 1) return "Высокий"
  if (list.length === 2) return "Средний"
  return "Низкий"
}

const computeComboScore = ({ structureCoveragePct, pricedCoveragePct, oemOk, supplierCount, countriesCount }) => {
  const oemScore = oemOk ? 100 : 0
  const supplierPenalty = Math.max(0, 100 - Math.max(0, supplierCount - 1) * 18)
  const countryPenalty = Math.max(0, 100 - Math.max(0, countriesCount - 1) * 25)
  const score =
    structureCoveragePct * 0.4 +
    pricedCoveragePct * 0.2 +
    oemScore * 0.15 +
    supplierPenalty * 0.15 +
    countryPenalty * 0.1
  return Math.round(score)
}

const comboKey = (ids) => ids.slice().sort((a, b) => a - b).join("+")

export default function CoverageTabContent({
  rfqId,
  structure,
  workspaceRows,
  suppliers,
}) {
  const [selectedRfqItemId, setSelectedRfqItemId] = useState(null)
  const [mode, setMode] = useState("matrix")
  const [supplierVisibilityFilter, setSupplierVisibilityFilter] = useState("all")
  const [showOnlyGaps, setShowOnlyGaps] = useState(false)
  const [selectedCell, setSelectedCell] = useState(null)
  const [comboRows, setComboRows] = useState([])
  const [importingToEconomics, setImportingToEconomics] = useState(false)

  const structureItems = useMemo(
    () => (Array.isArray(structure?.items) ? structure.items : []),
    [structure]
  )
  const workspace = useMemo(
    () => (Array.isArray(workspaceRows) ? workspaceRows.filter((r) => !Number(r?.is_archived)) : []),
    [workspaceRows]
  )

  const itemOptions = useMemo(
    () =>
      structureItems.map((item) => ({
        value: Number(item.rfq_item_id),
        label: `${item.line_number || "?"} · ${item.original_cat_number || item.client_part_number || "—"}${
          item.description ? ` · ${item.description}` : ""
        }`,
      })),
    [structureItems]
  )

  const activeItemId = useMemo(() => {
    if (selectedRfqItemId && itemOptions.some((opt) => Number(opt.value) === Number(selectedRfqItemId))) {
      return Number(selectedRfqItemId)
    }
    return itemOptions[0]?.value ?? null
  }, [selectedRfqItemId, itemOptions])

  const activeItem = useMemo(
    () => structureItems.find((item) => Number(item.rfq_item_id) === Number(activeItemId)) || null,
    [structureItems, activeItemId]
  )

  const workspaceRowsForItem = useMemo(
    () => workspace.filter((row) => Number(row?.rfq_item_id) === Number(activeItemId)),
    [workspace, activeItemId]
  )

  const supplierCatalog = useMemo(() => {
    const byId = new Map()
    ;(suppliers || []).forEach((s) => {
      const id = Number(s?.supplier_id || 0)
      if (!id) return
      byId.set(id, {
        supplier_id: id,
        rfq_supplier_id: Number(s?.id || 0) || null,
        supplier_name: s?.supplier_name || `Поставщик #${id}`,
        supplier_country: s?.supplier_country || s?.country || null,
      })
    })
    workspace.forEach((row) => {
      const id = Number(row?.supplier_id || 0)
      if (!id) return
      if (!byId.has(id)) {
        byId.set(id, {
          supplier_id: id,
          rfq_supplier_id: Number(row?.rfq_supplier_id || 0) || null,
          supplier_name: row?.supplier_name || `Поставщик #${id}`,
          supplier_country: row?.supplier_country || row?.country || null,
        })
      }
    })
    return [...byId.values()].sort((a, b) =>
      String(a.supplier_name || "").localeCompare(String(b.supplier_name || ""))
    )
  }, [suppliers, workspace])

  const coverageModel = useMemo(() => {
    if (!activeItem) return null

    const elements = buildCoverageElementsForItem(activeItem, workspaceRowsForItem)
    const suppliersForItemMap = new Map()
    workspaceRowsForItem.forEach((row) => {
      const sid = Number(row?.supplier_id || 0)
      if (!sid) return
      const base = supplierCatalog.find((s) => Number(s.supplier_id) === sid)
      suppliersForItemMap.set(sid, base || { supplier_id: sid, supplier_name: row?.supplier_name || `#${sid}` })
    })

    // Include all RFQ suppliers even if no rows for this item, to show NQ.
    supplierCatalog.forEach((s) => suppliersForItemMap.set(Number(s.supplier_id), s))
    const suppliersForItem = [...suppliersForItemMap.values()]

    const rowsBySupplierElement = new Map()
    workspaceRowsForItem.forEach((row) => {
      const sid = Number(row?.supplier_id || 0)
      if (!sid) return
      const eKey = mapWorkspaceRowToElementKey(row, activeItem)
      if (!eKey) return
      const mapKey = `${sid}:${eKey}`
      if (!rowsBySupplierElement.has(mapKey)) rowsBySupplierElement.set(mapKey, [])
      rowsBySupplierElement.get(mapKey).push(row)
    })

    const matrixRows = elements.map((el, idx) => {
      const supplierCells = {}
      let suppliersRequested = 0
      let suppliersResponded = 0
      let suppliersPriced = 0

      suppliersForItem.forEach((supplier) => {
        const sid = Number(supplier.supplier_id)
        const key = `${sid}:${el.key}`
        const matchedRows = rowsBySupplierElement.get(key) || []
        const cell = chooseBestCellStatus(matchedRows, { oemRequired: !!el.is_oem_required })
        supplierCells[sid] = {
          ...cell,
          supplier,
          element: el,
        }
        if (matchedRows.length) suppliersRequested += 1
        if (CLOSED_STATUSES.has(cell.code) || cell.code === "Q-" || cell.code === "Q?" || cell.code === "NS") {
          if (cell.code !== "NQ") suppliersResponded += cell.code === "Q?" || cell.code === "NS" ? 0 : 1
        }
        if (PRICED_STATUSES.has(cell.code)) suppliersPriced += 1
      })

      return {
        key: el.key,
        order: idx,
        path_group: el.path_group,
        line_type: el.line_type,
        label: el.label,
        description: el.description,
        original_part_id: el.original_part_id,
        bundle_item_id: el.bundle_item_id,
        required_qty: el.required_qty,
        uom: el.uom,
        is_oem_required: !!el.is_oem_required,
        supplierCells,
        suppliersRequested,
        suppliersResponded,
        suppliersPriced,
      }
    })

    const wholeElements = matrixRows.filter((r) => r.path_group === "WHOLE")
    const structureElements = matrixRows.filter((r) => r.path_group === "STRUCTURE")
    const slotPack = buildCoverageSlotsForItem(activeItem, workspaceRowsForItem)
    const requiredSlots = slotPack.structureSlots.length
      ? slotPack.structureSlots
      : slotPack.wholeSlot
        ? [slotPack.wholeSlot]
        : []
    const totalRequired = requiredSlots.length
    const oemRequiredTotal = requiredSlots.filter((s) => s.is_oem_required).length

    const evaluateVariantForSupplierIds = (variant, supplierIds = [], { oemRequired = false } = {}) => {
      const atomStates = (variant?.atoms || []).map((atom) => {
        let bestCell = null
        supplierIds.forEach((sid) => {
          const rows = rowsBySupplierElement.get(`${sid}:${atom.key}`) || []
          const candidate = chooseBestCellStatus(rows, { oemRequired })
          const rank = STATUS_RANK[candidate.code] ?? 0
          if (!bestCell || rank > (STATUS_RANK[bestCell.code] ?? 0)) {
            bestCell = {
              ...candidate,
              supplier_id: sid,
              atom,
            }
          }
        })
        return (
          bestCell || {
            code: "NQ",
            rows: [],
            row: null,
            supplier_id: null,
            atom,
          }
        )
      })

      const atomCount = atomStates.length
      const closedCount = atomStates.filter((a) => CLOSED_STATUSES.has(a.code)).length
      const pricedCount = atomStates.filter((a) => PRICED_STATUSES.has(a.code)).length
      const anyPending = atomStates.some((a) => a.code === "Q?")
      const anyActive = atomStates.some((a) => a.code !== "NQ")
      const oemAtomCount = atomStates.filter((a) => a.code === "Q+OEM").length
      const allClosed = atomCount > 0 && closedCount === atomCount
      const allPriced = atomCount > 0 && pricedCount === atomCount
      const oemOk = !oemRequired || (atomCount > 0 && oemAtomCount === atomCount)
      const supplierIdsUsed = [...new Set(atomStates.map((a) => a.supplier_id).filter(Boolean))]

      return {
        variant_key: variant?.key,
        variant_label: variant?.label || "Вариант",
        atomStates,
        atomCount,
        closedCount,
        pricedCount,
        progressPct: atomCount ? Math.round((closedCount / atomCount) * 100) : 0,
        pricedProgressPct: atomCount ? Math.round((pricedCount / atomCount) * 100) : 0,
        allClosed,
        allPriced,
        anyPending,
        anyActive,
        oemOk,
        supplierIdsUsed,
      }
    }

    const evaluateSlotForSupplierIds = (slot, supplierIds = []) => {
      const variantEvaluations = (slot?.variants || []).map((variant) =>
        evaluateVariantForSupplierIds(variant, supplierIds, { oemRequired: !!slot?.is_oem_required })
      )

      const sortedVariants = [...variantEvaluations].sort((a, b) => {
        if (Number(b.allPriced) !== Number(a.allPriced)) return Number(b.allPriced) - Number(a.allPriced)
        if (Number(b.allClosed) !== Number(a.allClosed)) return Number(b.allClosed) - Number(a.allClosed)
        if (b.progressPct !== a.progressPct) return b.progressPct - a.progressPct
        if (b.pricedProgressPct !== a.pricedProgressPct) return b.pricedProgressPct - a.pricedProgressPct
        if (b.pricedCount !== a.pricedCount) return b.pricedCount - a.pricedCount
        if (b.closedCount !== a.closedCount) return b.closedCount - a.closedCount
        return a.atomCount - b.atomCount
      })
      const bestVariant = sortedVariants[0] || null

      const anyPriced = variantEvaluations.some((v) => v.allPriced && v.oemOk)
      const anyClosed = variantEvaluations.some((v) => v.allClosed && v.oemOk)
      const anyPending = variantEvaluations.some((v) => v.anyPending)
      const anyActive = variantEvaluations.some((v) => v.anyActive)

      let statusCode = "NQ"
      if (anyPriced) statusCode = slot?.is_oem_required ? "Q+OEM" : "Q+P"
      else if (anyClosed) statusCode = "Q+"
      else if (anyPending) statusCode = "Q?"
      else if (anyActive) statusCode = "Q-"

      return {
        slot_key: slot?.key,
        slot_label: slot?.label,
        statusCode,
        closed: anyClosed || anyPriced,
        priced: anyPriced,
        oemOk: !slot?.is_oem_required || anyPriced,
        progressPct: variantEvaluations.reduce((m, v) => Math.max(m, safeNum(v.progressPct)), 0),
        pricedProgressPct: variantEvaluations.reduce((m, v) => Math.max(m, safeNum(v.pricedProgressPct)), 0),
        bestVariant,
        variantEvaluations,
      }
    }

    const supplierSummary = suppliersForItem.map((supplier) => {
      const sid = Number(supplier.supplier_id)
      const cellList = matrixRows.map((row) => row.supplierCells[sid]).filter(Boolean)
      const respondedAny = cellList.some((c) =>
        ["Q-", "Q+", "Q+P", "Q+OEM", "Q!"].includes(String(c?.code || ""))
      )
      const requested = cellList.filter((c) => c.rows?.length).length
      const slotEvals = requiredSlots.map((slot) => evaluateSlotForSupplierIds(slot, [sid]))
      const closedRequired = slotEvals.filter((e) => e.closed).length
      const pricedRequired = slotEvals.filter((e) => e.priced).length
      const wholeClosed = wholeElements.some((row) => CLOSED_STATUSES.has(row.supplierCells[sid]?.code))
      const wholePriced = wholeElements.some((row) => PRICED_STATUSES.has(row.supplierCells[sid]?.code))
      const structureCoveragePct = totalRequired
        ? Math.round(
            slotEvals.reduce((sum, e) => sum + safeNum(e.progressPct), 0) / Math.max(totalRequired, 1)
          )
        : 0
      const structurePricedPct = totalRequired
        ? Math.round(
            slotEvals.reduce((sum, e) => sum + safeNum(e.pricedProgressPct), 0) / Math.max(totalRequired, 1)
          )
        : 0
      const coverageGoalPct = wholeClosed ? 100 : structureCoveragePct
      const pricedGoalPct = wholePriced ? 100 : structurePricedPct
      const oemCovered = slotEvals.filter((e, idx) => requiredSlots[idx]?.is_oem_required && e.oemOk).length
      return {
        supplier_id: sid,
        supplier_name: supplier.supplier_name,
        supplier_country: supplier.supplier_country || null,
        responded_any: respondedAny,
        requested_elements: requested,
        closed_required: closedRequired,
        priced_required: pricedRequired,
        coverage_goal_pct: coverageGoalPct,
        coverage_priced_pct: pricedGoalPct,
        oem_required_total: oemRequiredTotal,
        oem_covered: oemCovered,
        whole_closed: wholeClosed,
        whole_priced: wholePriced,
      }
    })

    return {
      item: activeItem,
      matrixRows,
      suppliers: suppliersForItem,
      rowsBySupplierElement,
      wholeElements,
      structureElements,
      requiredElements: structureElements.length ? structureElements : wholeElements,
      coverageSlots: requiredSlots,
      coverageWholeSlot: slotPack.wholeSlot || null,
      totalRequired,
      oemRequiredTotal,
      supplierSummary,
    }
  }, [activeItem, workspaceRowsForItem, supplierCatalog])

  const visibleSuppliers = useMemo(() => {
    const list = coverageModel?.suppliers || []
    if (supplierVisibilityFilter === "responded") {
      return list.filter((supplier) =>
        (coverageModel?.matrixRows || []).some((row) => {
          const code = row.supplierCells?.[supplier.supplier_id]?.code
          return code && code !== "NQ" && code !== "NS" && code !== "Q?"
        })
      )
    }
    if (supplierVisibilityFilter === "active") {
      return list.filter((supplier) =>
        (coverageModel?.matrixRows || []).some((row) => {
          const code = row.supplierCells?.[supplier.supplier_id]?.code
          return code && code !== "NQ"
        })
      )
    }
    return list
  }, [coverageModel, supplierVisibilityFilter])

  const matrixDisplayRows = useMemo(() => {
    const rows = coverageModel?.matrixRows || []
    if (!showOnlyGaps) return rows
    return rows.filter((row) =>
      visibleSuppliers.some((supplier) => {
        const code = row?.supplierCells?.[supplier.supplier_id]?.code
        return !PRICED_STATUSES.has(code)
      })
    )
  }, [coverageModel, visibleSuppliers, showOnlyGaps])

  const kpis = useMemo(() => {
    if (!coverageModel) {
      return {
        suppliersInRfq: 0,
        respondedSuppliers: 0,
        singleSupplierFullCoverage: 0,
        fullComboCoverage: 0,
        bestPricedCoveragePct: 0,
        oemCoveredText: "—",
      }
    }
    const summary = coverageModel.supplierSummary
    const respondedSuppliers = summary.filter(
      (s) => s.responded_any
    ).length
    const singleSupplierFullCoverage = summary.filter((s) => s.coverage_goal_pct >= 100).length
    const bestPricedCoveragePct = summary.reduce(
      (max, s) => Math.max(max, safeNum(s.coverage_priced_pct)),
      0
    )
    const oemCovered =
      coverageModel.oemRequiredTotal === 0
        ? "—"
        : `${summary.reduce((m, s) => Math.max(m, s.oem_covered), 0)}/${coverageModel.oemRequiredTotal}`
    const fullComboCoverage = comboRows.filter((row) => safeNum(row.structure_coverage_pct) >= 100).length
    return {
      suppliersInRfq: coverageModel.suppliers.length,
      respondedSuppliers,
      singleSupplierFullCoverage,
      fullComboCoverage,
      bestPricedCoveragePct,
      oemCoveredText: oemCovered,
    }
  }, [coverageModel, comboRows])

  const buildCombinationSuggestions = () => {
    if (!coverageModel) {
      setComboRows([])
      return
    }
    const { suppliers: supplierList, coverageSlots = [], wholeElements } = coverageModel
    const activeSuppliers = supplierList.filter((supplier) =>
      coverageModel.matrixRows.some((row) => row.supplierCells?.[supplier.supplier_id]?.code !== "NQ")
    )

    const combos = []
    const maxSize = Math.min(3, activeSuppliers.length)
    const ids = activeSuppliers.map((s) => s.supplier_id)

    const pick = (start, chosen) => {
      if (chosen.length > 0) {
        combos.push([...chosen])
      }
      if (chosen.length >= maxSize) return
      for (let i = start; i < ids.length; i += 1) {
        chosen.push(ids[i])
        pick(i + 1, chosen)
        chosen.pop()
      }
    }
    pick(0, [])

    const result = combos.map((supplierIds) => {
      const suppliersMap = new Map(coverageModel.suppliers.map((s) => [s.supplier_id, s]))
      const comboSuppliers = supplierIds.map((id) => suppliersMap.get(id)).filter(Boolean)
      const assignmentPreview = []

      const slotEvaluations = coverageSlots.map((slot) => {
        const variantEvaluations = (slot?.variants || []).map((variant) => {
          const atomStates = (variant?.atoms || []).map((atom) => {
            let bestCell = null
            supplierIds.forEach((sid) => {
              const atomRows = coverageModel.rowsBySupplierElement?.get(`${sid}:${atom.key}`) || []
              const cell = chooseBestCellStatus(atomRows, { oemRequired: !!slot?.is_oem_required })
              const rank = STATUS_RANK[cell.code] ?? 0
              if (!bestCell || rank > (STATUS_RANK[bestCell.code] ?? 0)) {
                bestCell = { ...cell, supplier_id: sid, atom }
              }
            })
            return (
              bestCell || {
                code: "NQ",
                rows: [],
                row: null,
                supplier_id: null,
                atom,
              }
            )
          })

          const atomCount = atomStates.length
          const closedCount = atomStates.filter((a) => CLOSED_STATUSES.has(a.code)).length
          const pricedCount = atomStates.filter((a) => PRICED_STATUSES.has(a.code)).length
          const allClosed = atomCount > 0 && closedCount === atomCount
          const allPriced = atomCount > 0 && pricedCount === atomCount
          const anyPending = atomStates.some((a) => a.code === "Q?")
          const anyActive = atomStates.some((a) => a.code !== "NQ")
          const oemAtomCount = atomStates.filter((a) => a.code === "Q+OEM").length
          const oemOkVariant =
            !slot?.is_oem_required || (atomCount > 0 && oemAtomCount === atomCount)
          const supplierIdsUsed = [...new Set(atomStates.map((a) => a.supplier_id).filter(Boolean))]
          return {
            variant_key: variant?.key,
            variant_label: variant?.label || "Вариант",
            atomStates,
            atomCount,
            closedCount,
            pricedCount,
            progressPct: atomCount ? Math.round((closedCount / atomCount) * 100) : 0,
            pricedProgressPct: atomCount ? Math.round((pricedCount / atomCount) * 100) : 0,
            allClosed,
            allPriced,
            anyPending,
            anyActive,
            oemOkVariant,
            supplierIdsUsed,
          }
        })

        const sortedVariants = [...variantEvaluations].sort((a, b) => {
          if (Number(b.allPriced) !== Number(a.allPriced)) return Number(b.allPriced) - Number(a.allPriced)
          if (Number(b.allClosed) !== Number(a.allClosed)) return Number(b.allClosed) - Number(a.allClosed)
          if (b.progressPct !== a.progressPct) return b.progressPct - a.progressPct
          if (b.pricedProgressPct !== a.pricedProgressPct) return b.pricedProgressPct - a.pricedProgressPct
          if (b.pricedCount !== a.pricedCount) return b.pricedCount - a.pricedCount
          if (b.closedCount !== a.closedCount) return b.closedCount - a.closedCount
          return a.atomCount - b.atomCount
        })
        const bestVariant = sortedVariants[0] || null
        const anyPriced = variantEvaluations.some((v) => v.allPriced && v.oemOkVariant)
        const anyClosed = variantEvaluations.some((v) => v.allClosed && v.oemOkVariant)
        const anyPending = variantEvaluations.some((v) => v.anyPending)
        const anyActive = variantEvaluations.some((v) => v.anyActive)

        let status = "NQ"
        if (anyPriced) status = slot?.is_oem_required ? "Q+OEM" : "Q+P"
        else if (anyClosed) status = "Q+"
        else if (anyPending) status = "Q?"
        else if (anyActive) status = "Q-"

        const chosenSupplierNames = [...new Set((bestVariant?.supplierIdsUsed || [])
          .map((sid) => suppliersMap.get(sid)?.supplier_name)
          .filter(Boolean))]

        assignmentPreview.push({
          element_key: slot.key,
          element_label: slot.label,
          chosen_supplier_id: null,
          chosen_supplier_name: chosenSupplierNames.length ? chosenSupplierNames.join(" + ") : null,
          status,
          variant_label: bestVariant?.variant_label || null,
          progress_pct: variantEvaluations.reduce((m, v) => Math.max(m, safeNum(v.progressPct)), 0),
          priced_progress_pct: variantEvaluations.reduce((m, v) => Math.max(m, safeNum(v.pricedProgressPct)), 0),
        })

        return {
          slot,
          status,
          closed: anyClosed || anyPriced,
          priced: anyPriced,
          oemOk: !slot?.is_oem_required || anyPriced,
          progressPct: variantEvaluations.reduce((m, v) => Math.max(m, safeNum(v.progressPct)), 0),
          pricedProgressPct: variantEvaluations.reduce((m, v) => Math.max(m, safeNum(v.pricedProgressPct)), 0),
        }
      })

      const closedRequired = slotEvaluations.filter((e) => e.closed).length
      const pricedRequired = slotEvaluations.filter((e) => e.priced).length
      const oemRequired = coverageSlots.filter((s) => s.is_oem_required).length
      const oemOk = slotEvaluations.filter((e, idx) => coverageSlots[idx]?.is_oem_required && e.oemOk).length

      const wholeClosed = wholeElements.some((el) =>
        supplierIds.some((sid) => CLOSED_STATUSES.has(el.supplierCells?.[sid]?.code))
      )
      const wholePriced = wholeElements.some((el) =>
        supplierIds.some((sid) => PRICED_STATUSES.has(el.supplierCells?.[sid]?.code))
      )

      const totalRequired = coverageSlots.length || (wholeElements.length ? 1 : 0)
      const progressFromSlots = coverageSlots.length
        ? Math.round(
            slotEvaluations.reduce((sum, e) => sum + safeNum(e.progressPct), 0) /
              Math.max(coverageSlots.length, 1)
          )
        : 0
      const pricedProgressFromSlots = coverageSlots.length
        ? Math.round(
            slotEvaluations.reduce((sum, e) => sum + safeNum(e.pricedProgressPct), 0) /
              Math.max(coverageSlots.length, 1)
          )
        : 0
      const structureCoveragePct = totalRequired
        ? wholeClosed
          ? 100
          : progressFromSlots
        : 0
      const pricedCoveragePct = totalRequired
        ? wholePriced
          ? 100
          : pricedProgressFromSlots
        : 0
      const oemOkBool = oemRequired === 0 ? true : oemOk === oemRequired

      const countries = comboSuppliers.map((s) => s?.supplier_country).filter(Boolean)
      const consolidationHint = normalizePotentialConsolidation(countries)
      const score = computeComboScore({
        structureCoveragePct,
        pricedCoveragePct,
        oemOk: oemOkBool,
        supplierCount: comboSuppliers.length,
        countriesCount: new Set(countries).size || 1,
      })

      let status = "Потенциально"
      if (structureCoveragePct >= 100 && pricedCoveragePct >= 100 && oemOkBool) status = "Готова в экономику"
      else if (structureCoveragePct < 100) status = "Есть дыры"
      else if (pricedCoveragePct < 100) status = "Нужны цены"

      return {
        key: comboKey(supplierIds),
        supplier_ids: supplierIds,
        supplier_names: comboSuppliers.map((s) => s?.supplier_name || `#${s?.supplier_id}`).join(" + "),
        supplier_count: comboSuppliers.length,
        countries,
        countries_count: new Set(countries).size,
        structure_coverage_pct: structureCoveragePct,
        priced_coverage_pct: pricedCoveragePct,
        oem_ok: oemOkBool,
        consolidation_hint: consolidationHint,
        score,
        status,
        assignment_preview: assignmentPreview,
      }
    })

    result.sort(
      (a, b) =>
        b.score - a.score ||
        b.structure_coverage_pct - a.structure_coverage_pct ||
        b.priced_coverage_pct - a.priced_coverage_pct ||
        a.supplier_count - b.supplier_count
    )

    setComboRows(result.slice(0, 20))
  }

  const transferCombosToEconomics = async () => {
    if (!rfqId) {
      message.error("RFQ не выбран")
      return
    }
    if (!activeItemId) {
      message.error("Позиция RFQ не выбрана")
      return
    }
    if (!comboRows.length) {
      message.warning("Нет комбинаций для передачи")
      return
    }

    setImportingToEconomics(true)
    try {
      const { data } = await axios.post(`/economics/v2/rfq/${rfqId}/candidates/import-from-coverage`, {
        rfq_item_id: Number(activeItemId),
        combos: comboRows,
      })
      try {
        window.dispatchEvent(
          new CustomEvent("rfq:econ2-candidates-updated", {
            detail: { rfqId: Number(rfqId), rfqItemId: Number(activeItemId) },
          })
        )
      } catch (_e) {
        // no-op
      }
      message.success(
        data?.message || `Передано в Экономику: ${Number(data?.imported_count || comboRows.length)}`
      )
    } catch (e) {
      message.error(e?.response?.data?.message || "Ошибка при передаче в Экономику")
    } finally {
      setImportingToEconomics(false)
    }
  }

  const supplierSummaryRows = useMemo(() => {
    if (!coverageModel) return []
    return [...coverageModel.supplierSummary].sort(
      (a, b) =>
        safeNum(b.coverage_goal_pct) - safeNum(a.coverage_goal_pct) ||
        safeNum(b.coverage_priced_pct) - safeNum(a.coverage_priced_pct) ||
        String(a.supplier_name || "").localeCompare(String(b.supplier_name || ""))
    )
  }, [coverageModel])

  const matrixColumns = useMemo(() => {
    const base = [
      {
        title: "Элемент покрытия",
        dataIndex: "label",
        key: "label",
        width: 240,
        fixed: "left",
        render: (_, row) => (
          <Space direction="vertical" size={0}>
            <Space wrap size={6}>
              <Text strong>{row.label || "—"}</Text>
              {row.path_group === "WHOLE" ? <Tag>Узел целиком</Tag> : <Tag color="blue">Состав</Tag>}
              {row.line_type === "KIT_ROLE" ? <Tag color="green">Роль</Tag> : null}
              {row.is_oem_required ? <Tag color="gold">OEM only</Tag> : null}
            </Space>
            {row.description && row.description !== row.label ? (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {row.description}
              </Text>
            ) : null}
          </Space>
        ),
      },
      {
        title: "Qty",
        dataIndex: "required_qty",
        key: "required_qty",
        width: 90,
        render: (value, row) => (value != null ? `${value}${row.uom ? ` ${row.uom}` : ""}` : "—"),
      },
    ]

    const supplierCols = visibleSuppliers.map((supplier) => ({
      title: supplier.supplier_name || `#${supplier.supplier_id}`,
      key: `supplier-${supplier.supplier_id}`,
      width: 170,
      render: (_, row) => {
        const cell = row?.supplierCells?.[supplier.supplier_id] || { code: "NQ", rows: [] }
        const meta = STATUS_META[cell.code] || STATUS_META.NQ
        const latest = cell.row || null
        const extra = []
        if (latest?.latest_price != null && latest?.latest_currency) {
          extra.push(`${latest.latest_price} ${latest.latest_currency}`)
        }
        if (latest?.latest_offer_type) {
          extra.push(String(latest.latest_offer_type).toUpperCase())
        }
        if (latest?.latest_lead_time_days != null) {
          extra.push(`${latest.latest_lead_time_days}д`)
        }
        return (
          <div
            role="button"
            tabIndex={0}
            onClick={() =>
              setSelectedCell({
                supplier,
                row,
                cell,
              })
            }
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                setSelectedCell({ supplier, row, cell })
              }
            }}
            style={{ cursor: "pointer" }}
          >
            <Tooltip title={meta.hint}>
              <Tag color={meta.color} style={{ marginRight: 0 }}>
                {meta.label}
              </Tag>
            </Tooltip>
            {extra.length ? (
              <div style={{ marginTop: 4, fontSize: 12, lineHeight: 1.2, color: "#666" }}>
                {extra.join(" · ")}
              </div>
            ) : null}
          </div>
        )
      },
    }))

    return [...base, ...supplierCols]
  }, [visibleSuppliers])

  const matrixTableRows = useMemo(
    () =>
      matrixDisplayRows.map((row) => ({
        ...row,
        key: row.key,
      })),
    [matrixDisplayRows]
  )

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      {!structureItems.length ? (
        <Empty description="Нет структуры RFQ для анализа покрытия" />
      ) : (
        <>
          <Space wrap align="center" style={{ width: "100%", justifyContent: "space-between" }}>
            <Space wrap>
              <Select
                style={{ minWidth: 420 }}
                value={activeItemId ?? undefined}
                options={itemOptions}
                onChange={(value) => {
                  setSelectedRfqItemId(value)
                  setSelectedCell(null)
                  setComboRows([])
                }}
                placeholder="Позиция клиента"
              />
              <Select
                style={{ width: 220 }}
                value={mode}
                onChange={setMode}
                options={[
                  { value: "matrix", label: "Матрица покрытия" },
                  { value: "suppliers", label: "Сводка поставщиков" },
                  { value: "combos", label: "Комбинации" },
                ]}
              />
            </Space>
            <Space wrap>
              <Tag color="blue">
                Стратегия: {activeItem?.strategy?.mode || "—"}
              </Tag>
              {Number(activeItem?.strategy?.allow_kit) === 1 ? <Tag color="green">Kit разрешен</Tag> : null}
            </Space>
          </Space>

          <Space wrap>
            <Tag color="blue">Поставщиков в RFQ: {kpis.suppliersInRfq}</Tag>
            <Tag color="cyan">Ответили: {kpis.respondedSuppliers}</Tag>
            <Tag color="green">Полное покрытие (1): {kpis.singleSupplierFullCoverage}</Tag>
            <Tag color="purple">Полное покрытие (комбо): {kpis.fullComboCoverage}</Tag>
            <Tag color="gold">Лучший прогресс с ценой: {kpis.bestPricedCoveragePct}%</Tag>
            <Tag color="orange">OEM критичные: {kpis.oemCoveredText}</Tag>
          </Space>

          {mode === "matrix" ? (
            <>
              <Space wrap>
                <Select
                  style={{ minWidth: 220 }}
                  value={supplierVisibilityFilter}
                  onChange={setSupplierVisibilityFilter}
                  options={[
                    { value: "all", label: "Все поставщики" },
                    { value: "active", label: "Только где запрашивали" },
                    { value: "responded", label: "Только ответившие/закрывшие" },
                  ]}
                />
                <Select
                  style={{ minWidth: 220 }}
                  value={showOnlyGaps ? "gaps" : "all"}
                  onChange={(v) => setShowOnlyGaps(v === "gaps")}
                  options={[
                    { value: "all", label: "Все элементы" },
                    { value: "gaps", label: "Только дыры/неполные" },
                  ]}
                />
              </Space>

              <Table
                size="small"
                rowKey="key"
                dataSource={matrixTableRows}
                columns={matrixColumns}
                pagination={{ pageSize: 100, hideOnSinglePage: true }}
                scroll={{ x: "max-content" }}
              />

              {Array.isArray(coverageModel?.coverageSlots) && coverageModel.coverageSlots.length ? (
                <Card size="small" title="Слоты покрытия (варианты закрытия)">
                  <Space direction="vertical" size={8} style={{ width: "100%" }}>
                    {coverageModel.coverageSlots.map((slot) => (
                      <div key={slot.key}>
                        <Space wrap size={6}>
                          <Text strong>{slot.label}</Text>
                          <Tag color="blue">Слот</Tag>
                          {slot.is_oem_required ? <Tag color="gold">OEM only</Tag> : null}
                          {slot.required_qty != null ? (
                            <Text type="secondary">
                              Qty: {slot.required_qty}
                              {slot.uom ? ` ${slot.uom}` : ""}
                            </Text>
                          ) : null}
                        </Space>
                        <div style={{ marginTop: 4, marginLeft: 8 }}>
                          {(slot.variants || []).map((variant) => (
                            <div key={variant.key} style={{ marginBottom: 4 }}>
                              <Text type="secondary">OR</Text>{" "}
                              <Tag>{variant.label || "Вариант"}</Tag>{" "}
                              <Text type="secondary">
                                {(variant.atoms || []).map((a) => a.label || a.key).join(" + ")}
                              </Text>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </Space>
                </Card>
              ) : null}

              <Card size="small" title="Легенда статусов">
                <Space wrap>
                  {Object.entries(STATUS_META).map(([code, meta]) => (
                    <Tooltip title={meta.hint} key={code}>
                      <Tag color={meta.color}>
                        {code}: {meta.hint}
                      </Tag>
                    </Tooltip>
                  ))}
                </Space>
              </Card>

              {selectedCell ? (
                <Card size="small" title="Детализация ячейки">
                  <Space direction="vertical" size={8} style={{ width: "100%" }}>
                    <Text>
                      <Text strong>Элемент:</Text> {selectedCell.row?.label || "—"}
                    </Text>
                    <Text>
                      <Text strong>Поставщик:</Text> {selectedCell.supplier?.supplier_name || "—"}
                    </Text>
                    <Space wrap>
                      <Tag color={(STATUS_META[selectedCell.cell?.code] || STATUS_META.NQ).color}>
                        {(STATUS_META[selectedCell.cell?.code] || STATUS_META.NQ).label}
                      </Tag>
                      {selectedCell.cell?.reason ? <Tag>{selectedCell.cell.reason}</Tag> : null}
                    </Space>
                    <Text type="secondary">
                      Строк в рабочем слое (по этой ячейке): {selectedCell.cell?.rows?.length || 0}
                    </Text>
                    {selectedCell.cell?.row ? (
                      <Space direction="vertical" size={4}>
                        <Text>Что отправляли: {selectedCell.cell.row.selected_line_label || "—"}</Text>
                        <Text>
                          Ответ: {selectedCell.cell.row.latest_supplier_part_number || "—"}{" "}
                          {selectedCell.cell.row.latest_supplier_part_description
                            ? `· ${selectedCell.cell.row.latest_supplier_part_description}`
                            : ""}
                        </Text>
                        <Text>
                          Цена/срок:{" "}
                          {selectedCell.cell.row.latest_price != null && selectedCell.cell.row.latest_currency
                            ? `${selectedCell.cell.row.latest_price} ${selectedCell.cell.row.latest_currency}`
                            : "—"}{" "}
                          {selectedCell.cell.row.latest_lead_time_days != null
                            ? `· ${selectedCell.cell.row.latest_lead_time_days} дн`
                            : ""}
                        </Text>
                        <Text>
                          MOQ/упаковка: {selectedCell.cell.row.latest_moq ?? "—"} /{" "}
                          {selectedCell.cell.row.latest_packaging || "—"}
                        </Text>
                      </Space>
                    ) : (
                      <Text type="secondary">Нет ответной строки для детализации.</Text>
                    )}
                    <Space>
                      <Button size="small" disabled>
                        Открыть в Ответах
                      </Button>
                      <Button size="small" disabled>
                        Открыть структуру поставщика
                      </Button>
                    </Space>
                  </Space>
                </Card>
              ) : null}
            </>
          ) : null}

          {mode === "suppliers" ? (
            <Table
              size="small"
              rowKey="supplier_id"
              dataSource={supplierSummaryRows}
              pagination={{ pageSize: 50, hideOnSinglePage: true }}
              columns={[
                { title: "Поставщик", dataIndex: "supplier_name", width: 240 },
                {
                  title: "Страна",
                  dataIndex: "supplier_country",
                  width: 100,
                  render: (v) => v || "—",
                },
                { title: "Запрошено эл.", dataIndex: "requested_elements", width: 130 },
                {
                  title: "Закрыто (полностью)",
                  dataIndex: "closed_required",
                  width: 150,
                },
                {
                  title: "С ценой (полностью)",
                  dataIndex: "priced_required",
                  width: 160,
                },
                {
                  title: "Прогресс покрытия, %",
                  dataIndex: "coverage_goal_pct",
                  width: 140,
                  render: (v) => <Tag color={safeNum(v) >= 100 ? "green" : "blue"}>{safeNum(v)}%</Tag>,
                },
                {
                  title: "Прогресс с ценой, %",
                  dataIndex: "coverage_priced_pct",
                  width: 150,
                  render: (v) => `${safeNum(v)}%`,
                },
                {
                  title: "OEM-критичные",
                  width: 130,
                  render: (_, row) =>
                    row.oem_required_total ? `${row.oem_covered}/${row.oem_required_total}` : "—",
                },
                {
                  title: "Потенциал консолидации",
                  width: 170,
                  render: (_, row) =>
                    row.supplier_country ? (
                      <Tag color="cyan">{row.supplier_country}</Tag>
                    ) : (
                      <Text type="secondary">неизвестно</Text>
                    ),
                },
              ]}
            />
          ) : null}

          {mode === "combos" ? (
            <Space direction="vertical" style={{ width: "100%" }} size={12}>
              <Space wrap>
                <Button type="primary" onClick={buildCombinationSuggestions}>
                  Подсказать комбинации
                </Button>
                <Button
                  loading={importingToEconomics}
                  disabled={comboRows.length === 0 || !rfqId || !activeItemId}
                  onClick={transferCombosToEconomics}
                >
                  Передать в Экономику
                </Button>
              </Space>

              <Table
                size="small"
                rowKey="key"
                dataSource={comboRows}
                pagination={{ pageSize: 20, hideOnSinglePage: true }}
                expandable={{
                  expandedRowRender: (record) => (
                    <Table
                      size="small"
                      rowKey={(r) => r.element_key}
                      dataSource={record.assignment_preview || []}
                      pagination={false}
                      columns={[
                        { title: "Слот", dataIndex: "element_label", width: 220 },
                        { title: "Выбранный вариант", dataIndex: "variant_label", width: 260, render: (v) => v || "—" },
                        { title: "Поставщик(и)", dataIndex: "chosen_supplier_name", width: 240, render: (v) => v || "—" },
                        {
                          title: "Прогресс",
                          width: 140,
                          render: (_, row) =>
                            `${safeNum(row.progress_pct)}% / ${safeNum(row.priced_progress_pct)}% с ценой`,
                        },
                        {
                          title: "Статус",
                          dataIndex: "status",
                          width: 120,
                          render: (code) => {
                            const meta = STATUS_META[code] || STATUS_META.NQ
                            return <Tag color={meta.color}>{meta.label}</Tag>
                          },
                        },
                      ]}
                    />
                  ),
                }}
                columns={[
                  { title: "Комбинация", dataIndex: "supplier_names", width: 340 },
                  {
                    title: "Прогресс структуры",
                    dataIndex: "structure_coverage_pct",
                    width: 130,
                    render: (v) => <Tag color={safeNum(v) >= 100 ? "green" : "blue"}>{safeNum(v)}%</Tag>,
                  },
                  {
                    title: "Прогресс с ценой",
                    dataIndex: "priced_coverage_pct",
                    width: 130,
                    render: (v) => `${safeNum(v)}%`,
                  },
                  {
                    title: "OEM",
                    dataIndex: "oem_ok",
                    width: 90,
                    render: (v) => (v ? <Tag color="green">OK</Tag> : <Tag color="red">Нет</Tag>),
                  },
                  { title: "Поставщиков", dataIndex: "supplier_count", width: 110 },
                  {
                    title: "Стран",
                    width: 130,
                    render: (_, row) => {
                      const uniqueCountries = [...new Set((row.countries || []).filter(Boolean))]
                      return uniqueCountries.length ? uniqueCountries.join(", ") : "—"
                    },
                  },
                  {
                    title: "Потенциал консолидации",
                    dataIndex: "consolidation_hint",
                    width: 170,
                    render: (v) => {
                      const color =
                        v === "Высокий"
                          ? "green"
                          : v === "Средний"
                            ? "gold"
                            : v === "Низкий"
                              ? "red"
                              : "default"
                      return <Tag color={color}>{v}</Tag>
                    },
                  },
                  {
                    title: "Score",
                    dataIndex: "score",
                    width: 90,
                    sorter: (a, b) => safeNum(a.score) - safeNum(b.score),
                  },
                  {
                    title: "Статус",
                    dataIndex: "status",
                    width: 150,
                    render: (v) => {
                      let color = "default"
                      if (String(v).includes("Готова")) color = "green"
                      else if (String(v).includes("Нужны")) color = "gold"
                      else if (String(v).includes("дыры")) color = "red"
                      return <Tag color={color}>{v}</Tag>
                    },
                  },
                ]}
              />
            </Space>
          ) : null}
        </>
      )}
    </Space>
  )
}

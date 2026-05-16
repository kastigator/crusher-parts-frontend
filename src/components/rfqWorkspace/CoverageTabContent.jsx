import React, { useEffect, useMemo, useRef, useState } from "react"
import {
  Alert,
  Button,
  Card,
  Drawer,
  Empty,
  Form,
  message,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Input,
  InputNumber,
  Tooltip,
  Typography,
} from "antd"
import axios from "@/api/axiosInstance"
import DraggableColumnsTable from "@/components/common/DraggableColumnsTable"
import useTableScrollHints from "@/utils/useTableScrollHints"
import "@/styles/tableStyles.css"
import {
  COVERAGE_KIND_LABELS,
  COVERAGE_LINE_ROLE_LABELS,
  formatQtyWithUomLabel,
  formatUomLabel,
} from "./rfqDisplayUtils"
import { getClientFacingDescription, getClientFacingPartNumber } from "@/components/rfqWorkspace/partDisplay"
import useMeasurementUnits from "@/hooks/useMeasurementUnits"
import { compactInputNumberProps } from "@/utils/numberFormat"

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

const COVERAGE_OPTION_WARNING_LABELS = {
  whole_uom_mismatch: "Ед. изм. whole-строки не совпадает с RFQ",
  multiple_whole_lines: "В whole-варианте больше одной whole-строки",
}

const safeNum = (v, fallback = 0) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

const positiveNumOrNull = (v) => {
  const n = safeNum(v, null)
  return n !== null && n > 0 ? n : null
}

const buildLineLogisticsFromLatest = (latest, qty = 1) => {
  const qtyNum = positiveNumOrNull(qty) || 1
  const unitWeightKg = positiveNumOrNull(latest?.latest_supplier_part_weight_kg)
  const lengthCm = positiveNumOrNull(latest?.latest_supplier_part_length_cm)
  const widthCm = positiveNumOrNull(latest?.latest_supplier_part_width_cm)
  const heightCm = positiveNumOrNull(latest?.latest_supplier_part_height_cm)

  return {
    weight_kg: unitWeightKg === null ? null : unitWeightKg * qtyNum,
    volume_cbm:
      lengthCm === null || widthCm === null || heightCm === null
        ? null
        : (lengthCm * widthCm * heightCm * qtyNum) / 1000000,
  }
}

const buildCoverageOptionWarnings = (option, requestedUom) => {
  const optionKind = String(option?.option_kind || "").toUpperCase()
  const lines = Array.isArray(option?.lines) ? option.lines : []
  const wholeLikeLines = lines.filter((line) => ["WHOLE", "MANUAL"].includes(String(line?.line_role || "").toUpperCase()))
  const warnings = []

  if (optionKind === "WHOLE" && wholeLikeLines.length > 1) warnings.push("multiple_whole_lines")
  if (
    requestedUom &&
    wholeLikeLines.some((line) => {
      const uom = String(line?.uom || "").trim()
      return uom && uom !== requestedUom
    })
  ) {
    warnings.push("whole_uom_mismatch")
  }

  return warnings
}

const summarizeCoverageWarnings = (options = [], itemsById = new Map()) => {
  const unique = new Set()
  options.forEach((option) => {
    const item = itemsById.get(Number(option?.rfq_item_id || 0)) || null
    buildCoverageOptionWarnings(option, item?.uom || null).forEach((warning) => unique.add(warning))
  })
  return Array.from(unique).map((warning) => COVERAGE_OPTION_WARNING_LABELS[warning] || warning)
}

const COVERAGE_HELP_SECTIONS = [
  {
    title: "Зачем нужна вкладка",
    body:
      "Покрытие показывает, как каждая строка RFQ может быть исполнена: целиком, по составу или комбинированно от нескольких поставщиков. Здесь вы не выбираете победителя по всему заказу, а собираете допустимые варианты по каждой строке.",
  },
  {
    title: "Как читать матрицу",
    body:
      "Строки матрицы — это элементы покрытия. Для сборки это может быть либо узел целиком, либо обязательные компоненты состава. Ячейка поставщика показывает, закрывает ли он этот элемент и есть ли цена.",
  },
  {
    title: "Что делает «Сохранить покрытие RFQ»",
    body:
      "Кнопка сохраняет библиотеку вариантов исполнения по строкам RFQ. Например, для одной строки могут существовать вариант «Поставщик A — узел целиком» и вариант «Поставщик B — по составу». Эти варианты потом используются на вкладке Сценарии.",
  },
  {
    title: "Что такое «Комбинации по позиции»",
    body:
      "Этот режим комбинирует поставщиков только внутри одной выбранной строки RFQ. Например, две детали сборки от одного поставщика и две от другого. Комбинации между разными строками всего заказа делаются уже в Сценариях.",
  },
  {
    title: "Когда нужен ручной вариант",
    body:
      "Ручной вариант нужен, когда автоматическая логика не описывает ваш кейс: временное решение, ручная разбивка по ролям, особые договорённости или ещё неформализованный ответ поставщика.",
  },
  {
    title: "Когда переходить в Сценарии",
    body:
      "Когда на этой вкладке вы видите корректные варианты исполнения по строкам и сохранили покрытие RFQ. В Сценариях вы уже собираете полный план исполнения всего заказа из этих вариантов.",
  },
]

const STRATEGY_MODE_LABELS = {
  SINGLE: "Одна позиция",
  BOM: "По составу",
  MIXED: "Комбинированно",
}

const riskLabel = (value) =>
  ({
    low: "низкий риск",
    medium: "средний риск",
    high: "высокий риск",
    critical: "критичный риск",
  }[String(value || "").trim().toLowerCase()] || null)

const riskColor = (value) =>
  ({
    low: "green",
    medium: "gold",
    high: "volcano",
    critical: "red",
  }[String(value || "").trim().toLowerCase()] || "default")

const renderSupplierQualityTags = (supplier) => {
  const reliability =
    supplier?.reliability_rating === undefined || supplier?.reliability_rating === null
      ? null
      : Number(supplier.reliability_rating)
  const risk = riskLabel(supplier?.risk_level)
  if (reliability === null && !risk) return null
  return (
    <Space size={[4, 4]} wrap>
      {reliability !== null ? <Tag color="blue">Надежность: {reliability}</Tag> : null}
      {risk ? <Tag color={riskColor(supplier?.risk_level)}>{risk}</Tag> : null}
    </Space>
  )
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

const getCoverageOptionState = (item, workspaceRowsForItem) => {
  const availableOptions = Array.isArray(item?.options)
    ? item.options.filter((opt) => opt?.available)
    : []
  const observedLineTypes = new Set(
    (workspaceRowsForItem || [])
      .map((row) => String(row?.selected_line_type || "").toUpperCase())
      .filter(Boolean)
  )

  const wholeOption = availableOptions.find((opt) => String(opt?.type || "").toUpperCase() === "WHOLE") || null
  const bomOption = availableOptions.find((opt) => String(opt?.type || "").toUpperCase() === "BOM") || null
  const kitOption = availableOptions.find((opt) => String(opt?.type || "").toUpperCase() === "KIT") || null

  return {
    wholeOption,
    bomOption,
    kitOption,
    allowWhole: !!wholeOption || observedLineTypes.has("DEMAND"),
    allowBom: !!bomOption || observedLineTypes.has("BOM_COMPONENT"),
    allowKit: !!kitOption || observedLineTypes.has("KIT_ROLE"),
  }
}

const buildCoverageElementsForItem = (item, workspaceRowsForItem) => {
  const { allowWhole, allowBom } = getCoverageOptionState(item, workspaceRowsForItem)

  const elements = []
  const bomElements = []

  if (allowWhole) {
    elements.push({
      key: `WHOLE:${item.rfq_item_id}`,
      path_group: "WHOLE",
      line_type: "DEMAND",
      label: getClientFacingPartNumber(item, "Позиция клиента"),
      description: "Целиком",
      original_part_id: Number(item.original_part_id || 0) || null,
      bundle_item_id: null,
      required_qty: item.requested_qty ?? null,
      uom: item.uom || null,
      is_oem_required: Number(item.oem_only || 0) === 1,
    })
  }
  if (allowBom) {
    const bomOption = (item?.options || []).find((opt) => String(opt?.type || "").toUpperCase() === "BOM")
    flattenBomNodes(bomOption?.children || [], bomElements)
  }

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
  const { bomOption, allowWhole, allowBom } = getCoverageOptionState(item, workspaceRowsForItem)
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

  const structureSlots = allowBom && Array.isArray(bomOption?.children)
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

  const wholeSlot = allowWhole
    ? {
        key: `WHOLE_SLOT:${item?.rfq_item_id}`,
        label: getClientFacingPartNumber(item, "Позиция клиента"),
        description: "Целиком",
        required_qty: item?.requested_qty ?? null,
        uom: item?.uom || null,
        is_oem_required: Number(item?.oem_only || 0) === 1,
        variants: [
          {
            key: `WHOLE_VARIANT:${item?.rfq_item_id}`,
            label: "Целиком",
            type: "WHOLE",
            atoms: [{ key: `WHOLE:${item?.rfq_item_id}`, label: "Целиком", kind: "DEMAND" }],
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

const aggregateSlotEvaluations = (slotEvaluations = []) => {
  const totals = slotEvaluations.reduce(
    (acc, evaluation) => {
      acc.atomCount += safeNum(evaluation?.bestVariant?.atomCount, 0)
      acc.closedCount += safeNum(evaluation?.bestVariant?.closedCount, 0)
      acc.pricedCount += safeNum(evaluation?.bestVariant?.pricedCount, 0)
      return acc
    },
    { atomCount: 0, closedCount: 0, pricedCount: 0 }
  )

  return {
    atomCount: totals.atomCount,
    closedCount: totals.closedCount,
    pricedCount: totals.pricedCount,
    progressPct: totals.atomCount ? Math.round((totals.closedCount / totals.atomCount) * 100) : 0,
    pricedProgressPct: totals.atomCount ? Math.round((totals.pricedCount / totals.atomCount) * 100) : 0,
  }
}

const deriveCoverageMetrics = ({ slotEvaluations = [], wholeEvaluation = null } = {}) => {
  const aggregated = aggregateSlotEvaluations(slotEvaluations)
  return {
    atomCount: aggregated.atomCount,
    closedCount: aggregated.closedCount,
    pricedCount: aggregated.pricedCount,
    structureCoveragePct: wholeEvaluation?.closed ? 100 : aggregated.progressPct,
    pricedCoveragePct: wholeEvaluation?.priced ? 100 : aggregated.pricedProgressPct,
  }
}

export default function CoverageTabContent({
  rfqId,
  onNavigateTab,
  structure,
  workspaceRows,
  suppliers,
}) {
  const { options: uomOptions, loading: uomLoading } = useMeasurementUnits()
  const [scopeMode, setScopeMode] = useState("item")
  const [selectedRfqItemId, setSelectedRfqItemId] = useState(null)
  const [mode, setMode] = useState("matrix")
  const [supplierVisibilityFilter, setSupplierVisibilityFilter] = useState("all")
  const [matrixSupplierFocusMode, setMatrixSupplierFocusMode] = useState("focus")
  const [showOnlyGaps, setShowOnlyGaps] = useState(false)
  const [selectedCell, setSelectedCell] = useState(null)
  const [comboRows, setComboRows] = useState([])
  const [savingCoverage, setSavingCoverage] = useState(false)
  const [manualModalOpen, setManualModalOpen] = useState(false)
  const [manualSaving, setManualSaving] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [manualForm] = Form.useForm()
  const [savingComboKey, setSavingComboKey] = useState(null)
  const [savedCoverageOptions, setSavedCoverageOptions] = useState([])
  const [matrixColumnKeys, setMatrixColumnKeys] = useState([])
  const [supplierSummaryColumnKeys, setSupplierSummaryColumnKeys] = useState([])
  const [comboColumnKeys, setComboColumnKeys] = useState([])
  const matrixTableWrapRef = useRef(null)
  const supplierSummaryWrapRef = useRef(null)
  const combosTableWrapRef = useRef(null)

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
        label: `${item.line_number || "?"} · ${getClientFacingPartNumber(item)}${
          getClientFacingDescription(item) ? ` · ${getClientFacingDescription(item)}` : ""
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
  const savedOptionCodeSet = useMemo(() => {
    const codes = new Set()
    savedCoverageOptions.forEach((option) => {
      if (Number(option?.rfq_item_id || 0) !== Number(activeItemId || 0)) return
      if (String(option?.option_kind || "").toUpperCase() !== "MIXED") return
      const code = String(option?.option_code || "").trim()
      if (code) codes.add(code)
    })
    return codes
  }, [savedCoverageOptions, activeItemId])

  const matrixScrollHints = useTableScrollHints(matrixTableWrapRef, [
    mode,
    scopeMode,
    matrixSupplierFocusMode,
    supplierVisibilityFilter,
    showOnlyGaps,
    workspaceRows,
    suppliers,
    matrixColumnKeys,
  ])
  const supplierSummaryScrollHints = useTableScrollHints(supplierSummaryWrapRef, [
    mode,
    suppliers,
    supplierSummaryColumnKeys,
  ])
  const combosScrollHints = useTableScrollHints(combosTableWrapRef, [
    mode,
    comboRows,
    comboColumnKeys,
  ])

  const itemsById = useMemo(
    () => new Map(structureItems.map((item) => [Number(item.rfq_item_id || 0), item])),
    [structureItems]
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
        reliability_rating:
          s?.reliability_rating === undefined || s?.reliability_rating === null ? null : Number(s.reliability_rating),
        risk_level: s?.risk_level || null,
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
          reliability_rating:
            row?.reliability_rating === undefined || row?.reliability_rating === null
              ? null
              : Number(row.reliability_rating),
          risk_level: row?.risk_level || null,
        })
      }
    })
    return [...byId.values()].sort((a, b) =>
      String(a.supplier_name || "").localeCompare(String(b.supplier_name || ""))
    )
  }, [suppliers, workspace])

  const coverageModelAllItems = useMemo(() => {
    if (!structureItems.length) return null
    const allRows = []
    const rowsBySupplierElement = new Map()
    const supplierItemTotals = new Map()

    structureItems.forEach((item) => {
      const itemId = Number(item?.rfq_item_id || 0)
      if (!itemId) return
      const workspaceRowsForCurrentItem = workspace.filter((row) => Number(row?.rfq_item_id) === itemId)
      const elements = buildCoverageElementsForItem(item, workspaceRowsForCurrentItem)
      const itemRowsBySupplierElement = new Map()

      workspaceRowsForCurrentItem.forEach((row) => {
        const sid = Number(row?.supplier_id || 0)
        if (!sid) return
        const eKey = mapWorkspaceRowToElementKey(row, item)
        if (!eKey) return
        const itemMapKey = `${sid}:${eKey}`
        if (!itemRowsBySupplierElement.has(itemMapKey)) itemRowsBySupplierElement.set(itemMapKey, [])
        itemRowsBySupplierElement.get(itemMapKey).push(row)
      })

      elements.forEach((el, idx) => {
        const supplierCells = {}

        supplierCatalog.forEach((supplier) => {
          const sid = Number(supplier.supplier_id)
          const key = `${sid}:${el.key}`
          const matchedRows = itemRowsBySupplierElement.get(key) || []
          const cell = chooseBestCellStatus(matchedRows, { oemRequired: !!el.is_oem_required })
          supplierCells[sid] = {
            ...cell,
            supplier,
            element: el,
          }
          const globalKey = `${itemId}:${key}`
          if (!rowsBySupplierElement.has(globalKey)) rowsBySupplierElement.set(globalKey, [])
          matchedRows.forEach((r) => rowsBySupplierElement.get(globalKey).push(r))
        })

        allRows.push({
          key: `${itemId}:${el.key}`,
          local_key: el.key,
          rfq_item_id: itemId,
          line_number: item?.line_number || "?",
          item_label: getClientFacingPartNumber(item),
          item_description: item?.description || "",
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
        })
      })

      const slotPack = buildCoverageSlotsForItem(item, workspaceRowsForCurrentItem)
      const requiredSlots = slotPack.structureSlots.length
        ? slotPack.structureSlots
        : slotPack.wholeSlot
          ? [slotPack.wholeSlot]
          : []

      const evaluateVariantForSupplier = (variant, supplierId, { oemRequired = false } = {}) => {
        const atomStates = (variant?.atoms || []).map((atom) => {
          const rowsForAtom = itemRowsBySupplierElement.get(`${supplierId}:${atom.key}`) || []
          const candidate = chooseBestCellStatus(rowsForAtom, { oemRequired })
          return {
            ...candidate,
            atom,
          }
        })
        const atomCount = atomStates.length
        const closedCount = atomStates.filter((a) => CLOSED_STATUSES.has(a.code)).length
        const pricedCount = atomStates.filter((a) => PRICED_STATUSES.has(a.code)).length
        const oemAtomCount = atomStates.filter((a) => a.code === "Q+OEM").length
        return {
          atomCount,
          closedCount,
          pricedCount,
          progressPct: atomCount ? Math.round((closedCount / atomCount) * 100) : 0,
          pricedProgressPct: atomCount ? Math.round((pricedCount / atomCount) * 100) : 0,
          allClosed: atomCount > 0 && closedCount === atomCount,
          allPriced: atomCount > 0 && pricedCount === atomCount,
          oemOk: !oemRequired || (atomCount > 0 && oemAtomCount === atomCount),
        }
      }

      const evaluateSlotForSupplier = (slot, supplierId) => {
        const variantEvaluations = (slot?.variants || []).map((variant) =>
          evaluateVariantForSupplier(variant, supplierId, { oemRequired: !!slot?.is_oem_required })
        )
        const best = [...variantEvaluations].sort((a, b) => {
          if (Number(b.allPriced) !== Number(a.allPriced)) return Number(b.allPriced) - Number(a.allPriced)
          if (Number(b.allClosed) !== Number(a.allClosed)) return Number(b.allClosed) - Number(a.allClosed)
          if (b.progressPct !== a.progressPct) return b.progressPct - a.progressPct
          if (b.pricedProgressPct !== a.pricedProgressPct) return b.pricedProgressPct - a.pricedProgressPct
          return 0
        })[0] || null
        return {
          closed: !!best?.allClosed,
          priced: !!best?.allPriced,
          oemOk: !!best?.oemOk,
          progressPct: safeNum(best?.progressPct),
          pricedProgressPct: safeNum(best?.pricedProgressPct),
          bestVariant: best,
        }
      }

      supplierCatalog.forEach((supplier) => {
        const sid = Number(supplier.supplier_id)
        const itemCells = elements.map((el) => {
          const matchedRows = itemRowsBySupplierElement.get(`${sid}:${el.key}`) || []
          return chooseBestCellStatus(matchedRows, { oemRequired: !!el.is_oem_required })
        })
        const requestedForItem = itemCells.some((cell) => Array.isArray(cell?.rows) && cell.rows.length > 0)

        const slotEvaluations = requiredSlots.map((slot) => evaluateSlotForSupplier(slot, sid))
        const wholeEvaluation = slotPack.wholeSlot ? evaluateSlotForSupplier(slotPack.wholeSlot, sid) : null
        const { structureCoveragePct, pricedCoveragePct } = deriveCoverageMetrics({
          slotEvaluations,
          wholeEvaluation,
        })

        const current = supplierItemTotals.get(sid) || {
          requested_items: 0,
          closed_items: 0,
          priced_items: 0,
          coverage_goal_sum: 0,
          coverage_priced_sum: 0,
          oem_required_total: 0,
          oem_covered: 0,
        }

        current.requested_items += requestedForItem ? 1 : 0
        current.closed_items += structureCoveragePct >= 100 ? 1 : 0
        current.priced_items += pricedCoveragePct >= 100 ? 1 : 0
        current.coverage_goal_sum += structureCoveragePct
        current.coverage_priced_sum += pricedCoveragePct
        if (requiredSlots.some((slot) => slot.is_oem_required)) {
          current.oem_required_total += 1
          const oemOk = requiredSlots.every((slot, idx) =>
            !slot.is_oem_required || slotEvaluations[idx]?.oemOk
          )
          if (oemOk) current.oem_covered += 1
        }
        supplierItemTotals.set(sid, current)
      })
    })

    const supplierSummary = supplierCatalog.map((supplier) => {
      const sid = Number(supplier.supplier_id)
      const cellList = allRows.map((row) => row.supplierCells?.[sid]).filter(Boolean)
      const respondedAny = cellList.some((c) =>
        ["Q-", "Q+", "Q+P", "Q+OEM", "Q!"].includes(String(c?.code || ""))
      )
      const totals = supplierItemTotals.get(sid) || {
        requested_items: 0,
        closed_items: 0,
        priced_items: 0,
        coverage_goal_sum: 0,
        coverage_priced_sum: 0,
        oem_required_total: 0,
        oem_covered: 0,
      }
      return {
        supplier_id: sid,
        supplier_name: supplier.supplier_name,
        supplier_country: supplier.supplier_country || null,
        responded_any: respondedAny,
        requested_elements: totals.requested_items,
        closed_required: totals.closed_items,
        priced_required: totals.priced_items,
        coverage_goal_pct: structureItems.length
          ? Math.round(totals.coverage_goal_sum / structureItems.length)
          : 0,
        coverage_priced_pct: structureItems.length
          ? Math.round(totals.coverage_priced_sum / structureItems.length)
          : 0,
        oem_required_total: totals.oem_required_total,
        oem_covered: totals.oem_covered,
      }
    })

    return {
      item: null,
      matrixRows: allRows.sort((a, b) => {
        if (Number(a.line_number) !== Number(b.line_number)) return Number(a.line_number) - Number(b.line_number)
        if (a.path_group !== b.path_group) return a.path_group === "WHOLE" ? -1 : 1
        return safeNum(a.order) - safeNum(b.order)
      }),
      suppliers: supplierCatalog,
      rowsBySupplierElement,
      wholeElements: allRows.filter((r) => r.path_group === "WHOLE"),
      structureElements: allRows.filter((r) => r.path_group === "STRUCTURE"),
      requiredElements: allRows,
      coverageSlots: [],
      coverageWholeSlot: null,
      totalRequired: allRows.length,
      oemRequiredTotal: allRows.filter((r) => r.is_oem_required).length,
      supplierSummary,
    }
  }, [structureItems, workspace, supplierCatalog])

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
      const { structureCoveragePct, pricedCoveragePct } = deriveCoverageMetrics({
        slotEvaluations: slotEvals,
        wholeEvaluation: {
          closed: wholeClosed,
          priced: wholePriced,
        },
      })
      const coverageGoalPct = wholeClosed ? 100 : structureCoveragePct
      const pricedGoalPct = wholePriced ? 100 : pricedCoveragePct
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

  const effectiveCoverageModel = scopeMode === "rfq" ? coverageModelAllItems : coverageModel

  const visibleSuppliers = useMemo(() => {
    const list = effectiveCoverageModel?.suppliers || []
    if (supplierVisibilityFilter === "responded") {
      return list.filter((supplier) =>
        (effectiveCoverageModel?.matrixRows || []).some((row) => {
          const code = row.supplierCells?.[supplier.supplier_id]?.code
          return code && code !== "NQ" && code !== "NS" && code !== "Q?"
        })
      )
    }
    if (supplierVisibilityFilter === "active") {
      return list.filter((supplier) =>
        (effectiveCoverageModel?.matrixRows || []).some((row) => {
          const code = row.supplierCells?.[supplier.supplier_id]?.code
          return code && code !== "NQ"
        })
      )
    }
    return list
  }, [effectiveCoverageModel, supplierVisibilityFilter])

  const matrixVisibleSuppliers = useMemo(() => {
    if (matrixSupplierFocusMode === "all") return visibleSuppliers
    if (visibleSuppliers.length <= 6) return visibleSuppliers

    const summaryBySupplierId = new Map(
      (effectiveCoverageModel?.supplierSummary || []).map((row) => [Number(row.supplier_id || 0), row])
    )

    const getSupplierScore = (supplier) => {
      const summary = summaryBySupplierId.get(Number(supplier?.supplier_id || 0)) || {}
      if (matrixSupplierFocusMode === "priced") {
        return (
          safeNum(summary.coverage_priced_pct) * 10000 +
          safeNum(summary.coverage_goal_pct) * 100 +
          safeNum(summary.oem_covered) * 10 +
          (summary.responded_any ? 1 : 0)
        )
      }
      if (matrixSupplierFocusMode === "oem") {
        return (
          safeNum(summary.oem_covered) * 10000 +
          safeNum(summary.coverage_priced_pct) * 100 +
          safeNum(summary.coverage_goal_pct) * 10 +
          (summary.responded_any ? 1 : 0)
        )
      }
      return (
        safeNum(summary.coverage_goal_pct) * 10000 +
        safeNum(summary.coverage_priced_pct) * 100 +
        safeNum(summary.oem_covered) * 10 +
        (summary.responded_any ? 1 : 0)
      )
    }

    return [...visibleSuppliers]
      .sort((a, b) => getSupplierScore(b) - getSupplierScore(a))
      .slice(0, 6)
  }, [effectiveCoverageModel, matrixSupplierFocusMode, visibleSuppliers])

  const matrixDisplayRows = useMemo(() => {
    const rows = effectiveCoverageModel?.matrixRows || []
    if (!showOnlyGaps) return rows
    return rows.filter((row) =>
      matrixVisibleSuppliers.some((supplier) => {
        const code = row?.supplierCells?.[supplier.supplier_id]?.code
        return !PRICED_STATUSES.has(code)
      })
    )
  }, [effectiveCoverageModel, matrixVisibleSuppliers, showOnlyGaps])

  const kpis = useMemo(() => {
    if (!effectiveCoverageModel) {
      return {
        suppliersInRfq: 0,
        respondedSuppliers: 0,
        singleSupplierFullCoverage: 0,
        fullComboCoverage: 0,
        bestPricedCoveragePct: 0,
        oemCoveredText: "—",
      }
    }
    const summary = effectiveCoverageModel.supplierSummary
    const respondedSuppliers = summary.filter(
      (s) => s.responded_any
    ).length
    const singleSupplierFullCoverage = summary.filter((s) => s.coverage_goal_pct >= 100).length
    const bestPricedCoveragePct = summary.reduce(
      (max, s) => Math.max(max, safeNum(s.coverage_priced_pct)),
      0
    )
    const oemCovered =
      effectiveCoverageModel.oemRequiredTotal === 0
        ? "—"
        : `${summary.reduce((m, s) => Math.max(m, s.oem_covered), 0)}/${effectiveCoverageModel.oemRequiredTotal}`
    const fullComboCoverage =
      scopeMode === "rfq"
        ? 0
        : comboRows.filter((row) => safeNum(row.structure_coverage_pct) >= 100).length
    return {
      suppliersInRfq: effectiveCoverageModel.suppliers.length,
      respondedSuppliers,
      singleSupplierFullCoverage,
      fullComboCoverage,
      bestPricedCoveragePct,
      oemCoveredText: oemCovered,
    }
  }, [effectiveCoverageModel, comboRows, scopeMode])

  const buildCombinationSuggestions = () => {
    if (!coverageModel) {
      setComboRows([])
      return
    }
    const { suppliers: supplierList, coverageSlots = [], wholeElements, coverageWholeSlot } = coverageModel
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

      const evaluateSlotForCombo = (slot) => {
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

        const persistedLines = (bestVariant?.atomStates || [])
          .filter((state) => state?.row && state?.supplier_id)
          .map((state, index) => {
            const latest = state.row
            const atom = state.atom || {}
            const qty =
              safeNum(atom?.required_qty, null) ??
              safeNum(atom?.qty_per_parent, null) ??
              safeNum(activeItem?.requested_qty, 1) ??
              1
            const unitPrice = Number.isFinite(Number(latest?.latest_price)) ? Number(latest.latest_price) : null
            const logistics = buildLineLogisticsFromLatest(latest, qty)
            return {
              rfq_response_line_id: Number(latest?.latest_response_line_id || 0) || null,
              supplier_id: Number(state.supplier_id || 0) || null,
              original_part_id:
                Number(
                  atom?.original_part_id ||
                    latest?.selected_original_part_id ||
                    latest?.selected_alt_original_part_id ||
                    0
                ) || null,
              line_code: `${slot?.key || "SLOT"}:${atom?.key || index + 1}:${state.supplier_id}`,
              line_role:
                atom?.line_type === "DEMAND"
                  ? "WHOLE"
                  : atom?.line_type === "KIT_ROLE"
                    ? "KIT_ROLE"
                    : "COMPONENT",
              line_status: PRICED_STATUSES.has(String(state.code || "")) ? "SELECTED" : "CANDIDATE",
              qty,
              uom: atom?.uom || activeItem?.uom || null,
              unit_price: unitPrice,
              goods_amount: unitPrice === null ? null : unitPrice * qty,
              goods_currency: latest?.latest_currency || null,
              weight_kg: logistics.weight_kg,
              volume_cbm: logistics.volume_cbm,
              lead_time_days: latest?.latest_lead_time_days ?? null,
              has_price: PRICED_STATUSES.has(String(state.code || "")) ? 1 : 0,
              is_oem_offer: String(latest?.latest_offer_type || "").toUpperCase() === "OEM" ? 1 : 0,
              origin_country: latest?.origin_country || null,
              note: latest?.selected_line_label || atom?.label || null,
            }
          })

        return {
          slot,
          status,
          closed: anyClosed || anyPriced,
          priced: anyPriced,
          oemOk: !slot?.is_oem_required || anyPriced,
          progressPct: variantEvaluations.reduce((m, v) => Math.max(m, safeNum(v.progressPct)), 0),
          pricedProgressPct: variantEvaluations.reduce((m, v) => Math.max(m, safeNum(v.pricedProgressPct)), 0),
          bestVariant,
          chosenSupplierNames,
          persistedLines,
        }
      }

      const slotEvaluations = coverageSlots.map((slot) => evaluateSlotForCombo(slot))

      const oemRequired = coverageSlots.filter((s) => s.is_oem_required).length
      const oemOk = slotEvaluations.filter((e, idx) => coverageSlots[idx]?.is_oem_required && e.oemOk).length

      const wholeEvaluation = coverageWholeSlot ? evaluateSlotForCombo(coverageWholeSlot) : null
      const wholeClosed = !!wholeEvaluation?.closed
      const wholePriced = !!wholeEvaluation?.priced

      const totalRequired = coverageSlots.length || (wholeElements.length ? 1 : 0)
      const slotMetrics = aggregateSlotEvaluations(slotEvaluations)
      const progressFromSlots = slotMetrics.progressPct
      const pricedProgressFromSlots = slotMetrics.pricedProgressPct
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
      const useWholePath =
        !!wholeEvaluation &&
        (
          safeNum(wholeEvaluation.pricedProgressPct) > pricedProgressFromSlots ||
          (
            safeNum(wholeEvaluation.pricedProgressPct) === pricedProgressFromSlots &&
            safeNum(wholeEvaluation.progressPct) >= progressFromSlots
          )
        )

      const assignmentPreview = useWholePath
        ? [
            {
              element_key: coverageWholeSlot?.key,
              element_label: coverageWholeSlot?.label,
              chosen_supplier_id: null,
              chosen_supplier_name: wholeEvaluation?.chosenSupplierNames?.length
                ? wholeEvaluation.chosenSupplierNames.join(" + ")
                : null,
              status: wholeEvaluation?.status || "NQ",
              variant_label: wholeEvaluation?.bestVariant?.variant_label || null,
              progress_pct: safeNum(wholeEvaluation?.progressPct),
              priced_progress_pct: safeNum(wholeEvaluation?.pricedProgressPct),
              persisted_lines: wholeEvaluation?.persistedLines || [],
            },
          ]
        : slotEvaluations.map((evaluation) => ({
            element_key: evaluation.slot?.key,
            element_label: evaluation.slot?.label,
            chosen_supplier_id: null,
            chosen_supplier_name: evaluation.chosenSupplierNames?.length
              ? evaluation.chosenSupplierNames.join(" + ")
              : null,
            status: evaluation.status,
            variant_label: evaluation.bestVariant?.variant_label || null,
            progress_pct: safeNum(evaluation.progressPct),
            priced_progress_pct: safeNum(evaluation.pricedProgressPct),
            persisted_lines: evaluation.persistedLines || [],
          }))

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
        status: savedOptionCodeSet.has(`COMBO_${comboKey(supplierIds)}`) ? "Уже сохранена" : status,
        is_saved: savedOptionCodeSet.has(`COMBO_${comboKey(supplierIds)}`),
        assignment_preview: assignmentPreview,
        persist_option: {
          rfq_item_id: Number(activeItem?.rfq_item_id || 0) || null,
          option_code: `COMBO_${comboKey(supplierIds)}`,
          option_kind: "MIXED",
          coverage_status:
            structureCoveragePct >= 100 && pricedCoveragePct >= 100
              ? "FULL"
              : structureCoveragePct > 0
                ? "PARTIAL"
                : "BLOCKED",
          completeness_pct: structureCoveragePct,
          priced_pct: pricedCoveragePct,
          is_oem_ok: oemOkBool ? 1 : 0,
          goods_total: assignmentPreview
            .flatMap((row) => row.persisted_lines || [])
            .reduce((sum, line) => sum + safeNum(line.goods_amount, 0), 0) || null,
          goods_currency:
            (() => {
              const currencies = [
                ...new Set(
                  assignmentPreview
                    .flatMap((row) => row.persisted_lines || [])
                    .map((line) => line.goods_currency)
                    .filter(Boolean)
                ),
              ]
              return currencies.length === 1 ? currencies[0] : null
            })(),
          supplier_count: comboSuppliers.length,
          lead_time_min_days:
            (() => {
              const vals = assignmentPreview
                .flatMap((row) => row.persisted_lines || [])
                .map((line) => safeNum(line.lead_time_days, null))
                .filter((value) => value !== null)
              return vals.length ? Math.min(...vals) : null
            })(),
          lead_time_max_days:
            (() => {
              const vals = assignmentPreview
                .flatMap((row) => row.persisted_lines || [])
                .map((line) => safeNum(line.lead_time_days, null))
                .filter((value) => value !== null)
              return vals.length ? Math.max(...vals) : null
            })(),
          note: `Комбинированный вариант: ${comboSuppliers.map((s) => s?.supplier_name || `#${s?.supplier_id}`).join(" + ")}`,
          lines: assignmentPreview.flatMap((row) => row.persisted_lines || []),
        },
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

  const saveComboOption = async (comboRow) => {
    const option = comboRow?.persist_option
    if (!rfqId || !option?.rfq_item_id || !Array.isArray(option?.lines) || !option.lines.length) {
      message.warning("Комбинация пока не готова для сохранения")
      return
    }
    if (comboRow?.is_saved) {
      message.info("Этот смешанный вариант уже сохранён")
      return
    }
    setSavingComboKey(comboRow.key)
    try {
      const { data } = await axios.post(`/coverage/rfq/${rfqId}/options`, { option })
      message.success(data?.message || "Комбинированный вариант сохранён")
      const refreshed = await axios.get(`/coverage/rfq/${rfqId}/options`)
      setSavedCoverageOptions(Array.isArray(refreshed?.data?.rows) ? refreshed.data.rows : [])
    } catch (e) {
      message.error(e?.response?.data?.message || "Не удалось сохранить комбинированный вариант")
    } finally {
      setSavingComboKey(null)
    }
  }

  const buildPersistedCoverageOptions = () => {
    if (!coverageModelAllItems) return []
    const options = []
    const rowsByItem = new Map()
    coverageModelAllItems.matrixRows.forEach((row) => {
      const itemId = Number(row?.rfq_item_id || 0)
      if (!itemId) return
      const list = rowsByItem.get(itemId) || []
      list.push(row)
      rowsByItem.set(itemId, list)
    })

    structureItems.forEach((item) => {
      const itemId = Number(item?.rfq_item_id || 0)
      const itemRows = rowsByItem.get(itemId) || []
      if (!itemRows.length) return

      coverageModelAllItems.suppliers.forEach((supplier) => {
        const supplierId = Number(supplier?.supplier_id || 0)
        if (!supplierId) return

        const lines = []
        let closedCount = 0
        let pricedCount = 0
        let oemRequired = 0
        let oemCovered = 0
        let goodsTotal = 0
        const currencies = new Set()
        const leadTimes = []

        itemRows.forEach((row) => {
          const cell = row?.supplierCells?.[supplierId]
          const latest = cell?.row || null
          if (!cell || !latest || !Array.isArray(cell.rows) || !cell.rows.length) return

          if (CLOSED_STATUSES.has(String(cell.code || ""))) closedCount += 1
          if (PRICED_STATUSES.has(String(cell.code || ""))) pricedCount += 1
          if (row?.is_oem_required) {
            oemRequired += 1
            if (String(cell.code || "") === "Q+OEM") oemCovered += 1
          }

          const qty = safeNum(row?.required_qty, safeNum(latest?.latest_offered_qty, 1)) || 1
          const unitPrice = Number.isFinite(Number(latest?.latest_price)) ? Number(latest.latest_price) : null
          const goodsAmount = unitPrice === null ? null : unitPrice * qty
          const logistics = buildLineLogisticsFromLatest(latest, qty)
          if (goodsAmount !== null) goodsTotal += goodsAmount
          if (latest?.latest_currency) currencies.add(String(latest.latest_currency))
          if (latest?.latest_lead_time_days != null) leadTimes.push(safeNum(latest.latest_lead_time_days, 0))

          lines.push({
            rfq_response_line_id: Number(latest?.latest_response_line_id || 0) || null,
            supplier_id: supplierId,
            original_part_id:
              Number(latest?.selected_original_part_id || latest?.selected_alt_original_part_id || 0) || null,
            line_code: `${row?.local_key || row?.key}:${supplierId}`,
            line_role:
              row?.line_type === "DEMAND"
                ? "WHOLE"
                : row?.line_type === "KIT_ROLE"
                  ? "KIT_ROLE"
                  : "COMPONENT",
            line_status: PRICED_STATUSES.has(String(cell.code || "")) ? "SELECTED" : "CANDIDATE",
            qty,
            uom: row?.uom || item?.uom || null,
            unit_price: unitPrice,
            goods_amount: goodsAmount,
            goods_currency: latest?.latest_currency || null,
            weight_kg: logistics.weight_kg,
            volume_cbm: logistics.volume_cbm,
            lead_time_days: latest?.latest_lead_time_days ?? null,
            has_price: PRICED_STATUSES.has(String(cell.code || "")) ? 1 : 0,
            is_oem_offer: String(latest?.latest_offer_type || "").toUpperCase() === "OEM" ? 1 : 0,
            origin_country: latest?.origin_country || null,
            note: latest?.selected_line_label || null,
          })
        })

        if (!lines.length) return
        const workspaceRowsForCurrentItem = workspace.filter((row) => Number(row?.rfq_item_id) === itemId)
        const slotPack = buildCoverageSlotsForItem(item, workspaceRowsForCurrentItem)
        const requiredSlots = slotPack.structureSlots.length
          ? slotPack.structureSlots
          : slotPack.wholeSlot
            ? [slotPack.wholeSlot]
            : []
        const itemRowsBySupplierElement = new Map()

        workspaceRowsForCurrentItem.forEach((row) => {
          const sid = Number(row?.supplier_id || 0)
          if (!sid) return
          const eKey = mapWorkspaceRowToElementKey(row, item)
          if (!eKey) return
          const itemMapKey = `${sid}:${eKey}`
          if (!itemRowsBySupplierElement.has(itemMapKey)) itemRowsBySupplierElement.set(itemMapKey, [])
          itemRowsBySupplierElement.get(itemMapKey).push(row)
        })

        const evaluatePersistedVariant = (variant, { oemRequired = false } = {}) => {
          const atomStates = (variant?.atoms || []).map((atom) => {
            const atomRows = itemRowsBySupplierElement.get(`${supplierId}:${atom.key}`) || []
            const candidate = chooseBestCellStatus(atomRows, { oemRequired })
            return {
              ...candidate,
              atom,
            }
          })
          const atomCount = atomStates.length
          const closedAtoms = atomStates.filter((a) => CLOSED_STATUSES.has(a.code)).length
          const pricedAtoms = atomStates.filter((a) => PRICED_STATUSES.has(a.code)).length
          const oemAtoms = atomStates.filter((a) => a.code === "Q+OEM").length
          return {
            atomCount,
            closedCount: closedAtoms,
            pricedCount: pricedAtoms,
            allClosed: atomCount > 0 && closedAtoms === atomCount,
            allPriced: atomCount > 0 && pricedAtoms === atomCount,
            oemOk: !oemRequired || (atomCount > 0 && oemAtoms === atomCount),
            progressPct: atomCount ? Math.round((closedAtoms / atomCount) * 100) : 0,
            pricedProgressPct: atomCount ? Math.round((pricedAtoms / atomCount) * 100) : 0,
          }
        }

        const evaluatePersistedSlot = (slot) => {
          const best = [...((slot?.variants || []).map((variant) =>
            evaluatePersistedVariant(variant, { oemRequired: !!slot?.is_oem_required })
          ))].sort((a, b) => {
            if (Number(b.allPriced) !== Number(a.allPriced)) return Number(b.allPriced) - Number(a.allPriced)
            if (Number(b.allClosed) !== Number(a.allClosed)) return Number(b.allClosed) - Number(a.allClosed)
            if (b.progressPct !== a.progressPct) return b.progressPct - a.progressPct
            if (b.pricedProgressPct !== a.pricedProgressPct) return b.pricedProgressPct - a.pricedProgressPct
            if (b.pricedCount !== a.pricedCount) return b.pricedCount - a.pricedCount
            if (b.closedCount !== a.closedCount) return b.closedCount - a.closedCount
            return a.atomCount - b.atomCount
          })[0] || null

          return {
            closed: !!best?.allClosed,
            priced: !!best?.allPriced,
            oemOk: !!best?.oemOk,
            bestVariant: best,
          }
        }

        const slotEvaluations = requiredSlots.map((slot) => evaluatePersistedSlot(slot))
        const wholeEvaluation = slotPack.wholeSlot ? evaluatePersistedSlot(slotPack.wholeSlot) : null
        const { structureCoveragePct: completenessPct, pricedCoveragePct: pricedPct } = deriveCoverageMetrics({
          slotEvaluations,
          wholeEvaluation,
        })
        const isOemOk = oemRequired === 0 ? true : oemCovered === oemRequired
        let coverageStatus = "PARTIAL"
        if (completenessPct >= 100 && pricedPct >= 100) coverageStatus = "FULL"
        else if (lines.length === 0) coverageStatus = "BLOCKED"

        options.push({
          rfq_item_id: itemId,
          option_code: `SUPPLIER_${supplierId}`,
          option_kind: lines.every((line) => line.line_role === "WHOLE")
            ? "WHOLE"
            : lines.some((line) => line.line_role === "KIT_ROLE")
              ? "KIT"
              : "BOM",
          coverage_status: coverageStatus,
          completeness_pct: completenessPct,
          priced_pct: pricedPct,
          is_oem_ok: isOemOk ? 1 : 0,
          goods_total: goodsTotal || null,
          goods_currency: currencies.size === 1 ? [...currencies][0] : null,
          supplier_count: 1,
          lead_time_min_days: leadTimes.length ? Math.min(...leadTimes) : null,
          lead_time_max_days: leadTimes.length ? Math.max(...leadTimes) : null,
          note: `Вариант по поставщику ${supplier?.supplier_name || supplierId}`,
          lines,
        })
      })
    })

    return options
  }

  const saveCoverageOptions = async () => {
    if (!rfqId) {
      message.error("RFQ не выбран")
      return
    }
    const options = buildPersistedCoverageOptions()
    if (!options.length) {
      message.warning("Нет вариантов покрытия для сохранения")
      return
    }

    const warningMessages = summarizeCoverageWarnings(options, itemsById)
    if (warningMessages.length) {
      message.warning(`Покрытие сохранится с предупреждениями: ${warningMessages.join("; ")}`)
    }

    setSavingCoverage(true)
    try {
      const { data } = await axios.post(`/coverage/rfq/${rfqId}/options/replace`, {
        options,
      })
      message.success(data?.message || `Сохранено вариантов покрытия: ${Number(data?.inserted_count || options.length)}`)
    } catch (e) {
      message.error(e?.response?.data?.message || "Ошибка сохранения покрытия")
    } finally {
      setSavingCoverage(false)
    }
  }

  const openManualModal = () => {
    manualForm.setFieldsValue({
      rfq_item_id: activeItemId || undefined,
      option_code: "",
      option_kind: "MANUAL",
      goods_currency: "USD",
      lines: [
        {
          supplier_id: undefined,
          line_role: "MANUAL",
          qty: activeItem?.requested_qty || 1,
          uom: activeItem?.uom || "шт",
          unit_price: null,
          goods_currency: "USD",
          lead_time_days: null,
          note: "",
        },
      ],
    })
    setManualModalOpen(true)
  }

  const handleCreateManualOption = async () => {
    let values
    try {
      values = await manualForm.validateFields()
    } catch (_e) {
      return
    }

    const lines = Array.isArray(values?.lines) ? values.lines : []
    if (!lines.length) {
      message.warning("Добавьте хотя бы одну строку в ручной вариант")
      return
    }

    const normalizedLines = lines
      .map((line, index) => {
        const qty = safeNum(line?.qty, 0)
        const unitPrice = line?.unit_price === null || line?.unit_price === undefined ? null : safeNum(line?.unit_price, 0)
        return {
          supplier_id: Number(line?.supplier_id || 0) || null,
          line_code: line?.line_code || `MANUAL-${index + 1}`,
          line_role: line?.line_role || "MANUAL",
          qty,
          uom: line?.uom || activeItem?.uom || "шт",
          unit_price: unitPrice,
          goods_amount: unitPrice === null ? null : qty * unitPrice,
          goods_currency: line?.goods_currency || values?.goods_currency || "USD",
          lead_time_days: line?.lead_time_days ?? null,
          weight_kg: line?.weight_kg ?? null,
          volume_cbm: line?.volume_cbm ?? null,
          has_price: unitPrice === null ? 0 : 1,
          is_oem_offer: Number(line?.is_oem_offer) ? 1 : 0,
          origin_country: line?.origin_country || null,
          incoterms: line?.incoterms || null,
          incoterms_place: line?.incoterms_place || null,
          note: line?.note || null,
        }
      })
      .filter((line) => line.supplier_id)

    if (!normalizedLines.length) {
      message.warning("У каждой ручной строки должен быть выбран поставщик")
      return
    }

    const lineCount = normalizedLines.length
    const pricedCount = normalizedLines.filter((line) => Number(line.has_price) === 1).length
    const goodsTotal = normalizedLines.reduce((sum, line) => sum + (safeNum(line.goods_amount, 0) || 0), 0)
    const leadTimes = normalizedLines
      .map((line) => safeNum(line.lead_time_days, null))
      .filter((value) => value !== null)
    const option = {
      rfq_item_id: Number(values.rfq_item_id),
      option_code: values.option_code || `MANUAL-${Date.now()}`,
      option_kind: values.option_kind || "MANUAL",
      coverage_status: pricedCount === lineCount ? "FULL" : "PARTIAL",
      completeness_pct: 100,
      priced_pct: lineCount ? Math.round((pricedCount / lineCount) * 100) : 0,
      is_oem_ok: normalizedLines.some((line) => Number(line.is_oem_offer) === 1) ? 1 : 0,
      goods_total: goodsTotal || null,
      goods_currency: values.goods_currency || "USD",
      supplier_count: new Set(normalizedLines.map((line) => line.supplier_id)).size,
      lead_time_min_days: leadTimes.length ? Math.min(...leadTimes) : null,
      lead_time_max_days: leadTimes.length ? Math.max(...leadTimes) : null,
      note: values.note || "Ручной вариант покрытия",
      lines: normalizedLines,
    }

    const manualWarnings = buildCoverageOptionWarnings(option, activeItem?.uom || null)
    if (manualWarnings.length) {
      message.warning(
        `Ручной вариант будет сохранён с предупреждениями: ${manualWarnings
          .map((warning) => COVERAGE_OPTION_WARNING_LABELS[warning] || warning)
          .join("; ")}`
      )
    }

    setManualSaving(true)
    try {
      const { data } = await axios.post(`/coverage/rfq/${rfqId}/options`, { option })
      message.success(data?.message || "Ручной вариант покрытия создан")
      setManualModalOpen(false)
    } catch (e) {
      message.error(e?.response?.data?.message || "Не удалось создать ручной вариант покрытия")
    } finally {
      setManualSaving(false)
    }
  }

  const supplierSummaryRows = useMemo(() => {
    if (!effectiveCoverageModel) return []
    return [...effectiveCoverageModel.supplierSummary].sort(
      (a, b) =>
        safeNum(b.coverage_goal_pct) - safeNum(a.coverage_goal_pct) ||
        safeNum(b.coverage_priced_pct) - safeNum(a.coverage_priced_pct) ||
        String(a.supplier_name || "").localeCompare(String(b.supplier_name || ""))
    )
  }, [effectiveCoverageModel])

  const matrixColumns = useMemo(() => {
    const base = [
      ...(scopeMode === "rfq"
        ? [
            {
              title: "Позиция RFQ",
              dataIndex: "line_number",
              key: "rfq_item",
              width: 220,
              fixed: "left",
              render: (_, row) => (
                <Space direction="vertical" size={0}>
                  <Text strong>
                    {row.line_number} · {row.item_label || "—"}
                  </Text>
                  {row.item_description ? (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {row.item_description}
                    </Text>
                  ) : null}
                </Space>
              ),
            },
          ]
        : []),
      {
        title: "Элемент покрытия",
        dataIndex: "label",
        key: "label",
        width: 220,
        fixed: scopeMode === "rfq" ? undefined : "left",
        render: (_, row) => (
          <Space direction="vertical" size={0}>
            <Space wrap size={6}>
              <Text strong>{row.label || "—"}</Text>
              {row.path_group === "WHOLE" ? <Tag>Целиком</Tag> : <Tag color="blue">Состав</Tag>}
              {row.line_type === "KIT_ROLE" ? <Tag color="green">Роль</Tag> : null}
              {row.is_oem_required ? <Tag color="gold">Только OEM</Tag> : null}
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
        title: "Кол-во",
        dataIndex: "required_qty",
        key: "required_qty",
        width: 90,
        render: (value, row) => formatQtyWithUomLabel(value, row.uom),
      },
    ]

    const supplierCols = matrixVisibleSuppliers.map((supplier) => ({
      title: (
        <Space direction="vertical" size={2}>
          <Text strong style={{ fontSize: 12 }}>{supplier.supplier_name || `#${supplier.supplier_id}`}</Text>
          {renderSupplierQualityTags(supplier)}
        </Space>
      ),
      key: `supplier-${supplier.supplier_id}`,
      width: 150,
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
  }, [matrixVisibleSuppliers, scopeMode])

  const supplierSummaryColumns = useMemo(
    () => [
      {
        title: "Поставщик",
        dataIndex: "supplier_name",
        key: "supplier_name",
        width: 220,
        render: (_, row) => (
          <Space direction="vertical" size={2}>
            <Text>{row.supplier_name || "—"}</Text>
            {renderSupplierQualityTags(row)}
          </Space>
        ),
      },
      {
        title: "Страна",
        dataIndex: "supplier_country",
        key: "supplier_country",
        width: 100,
        render: (v) => v || "—",
      },
      { title: "Запрошено эл.", dataIndex: "requested_elements", key: "requested_elements", width: 130 },
      {
        title: "Закрыто (полностью)",
        dataIndex: "closed_required",
        key: "closed_required",
        width: 150,
      },
      {
        title: "С ценой (полностью)",
        dataIndex: "priced_required",
        key: "priced_required",
        width: 160,
      },
      {
        title: "Прогресс покрытия, %",
        dataIndex: "coverage_goal_pct",
        key: "coverage_goal_pct",
        width: 140,
        render: (v) => <Tag color={safeNum(v) >= 100 ? "green" : "blue"}>{safeNum(v)}%</Tag>,
      },
      {
        title: "Прогресс с ценой, %",
        dataIndex: "coverage_priced_pct",
        key: "coverage_priced_pct",
        width: 150,
        render: (v) => `${safeNum(v)}%`,
      },
      {
        title: "OEM-критичные",
        key: "oem_required",
        width: 130,
        render: (_, row) =>
          row.oem_required_total ? `${row.oem_covered}/${row.oem_required_total}` : "—",
      },
      {
        title: "Потенциал консолидации",
        key: "consolidation",
        width: 140,
        render: (_, row) =>
          row.supplier_country ? (
            <Tag color="cyan">{row.supplier_country}</Tag>
          ) : (
            <Text type="secondary">неизвестно</Text>
          ),
      },
    ],
    []
  )

  const comboColumns = useMemo(
    () => [
      { title: "Комбинация", dataIndex: "supplier_names", key: "supplier_names", width: 280 },
      {
        title: "Прогресс структуры",
        dataIndex: "structure_coverage_pct",
        key: "structure_coverage_pct",
        width: 130,
        render: (v) => <Tag color={safeNum(v) >= 100 ? "green" : "blue"}>{safeNum(v)}%</Tag>,
      },
      {
        title: "Прогресс с ценой",
        dataIndex: "priced_coverage_pct",
        key: "priced_coverage_pct",
        width: 130,
        render: (v) => `${safeNum(v)}%`,
      },
      {
        title: "OEM",
        dataIndex: "oem_ok",
        key: "oem_ok",
        width: 90,
        render: (v) => (v ? <Tag color="green">OK</Tag> : <Tag color="red">Нет</Tag>),
      },
      { title: "Поставщиков", dataIndex: "supplier_count", key: "supplier_count", width: 110 },
      {
        title: "Стран",
        key: "countries",
        width: 130,
        render: (_, row) => {
          const uniqueCountries = [...new Set((row.countries || []).filter(Boolean))]
          return uniqueCountries.length ? uniqueCountries.join(", ") : "—"
        },
      },
      {
        title: "Потенциал консолидации",
        dataIndex: "consolidation_hint",
        key: "consolidation_hint",
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
        key: "score",
        width: 90,
        sorter: (a, b) => safeNum(a.score) - safeNum(b.score),
      },
      {
        title: "Статус",
        dataIndex: "status",
        key: "status",
        width: 150,
        render: (v) => {
          let color = "default"
          if (String(v).includes("Готова")) color = "green"
          else if (String(v).includes("Нужны")) color = "gold"
          else if (String(v).includes("дыры")) color = "red"
          else if (String(v).includes("Уже сохран")) color = "blue"
          return <Tag color={color}>{v}</Tag>
        },
      },
      {
        title: "Действия",
        key: "actions",
        width: 160,
        render: (_, row) => (
          <Button
            size="small"
            onClick={() => saveComboOption(row)}
            loading={savingComboKey === row.key}
            disabled={!row?.persist_option?.lines?.length || row?.is_saved}
          >
            {row?.is_saved ? "Уже сохранён" : "Сохранить смешанный"}
          </Button>
        ),
      },
    ],
    [savingComboKey]
  )

  useEffect(() => {
    let cancelled = false
    const loadSavedCoverageOptions = async () => {
      if (!rfqId) {
        setSavedCoverageOptions([])
        return
      }
      try {
        const { data } = await axios.get(`/coverage/rfq/${rfqId}/options`)
        if (!cancelled) {
          setSavedCoverageOptions(Array.isArray(data?.rows) ? data.rows : [])
        }
      } catch (_) {
        if (!cancelled) {
          setSavedCoverageOptions([])
        }
      }
    }
    loadSavedCoverageOptions()
    return () => {
      cancelled = true
    }
  }, [rfqId])

  useEffect(() => {
    setComboRows((prev) =>
      prev.map((row) => {
        const optionCode = String(row?.persist_option?.option_code || "").trim()
        const isSaved = !!optionCode && savedOptionCodeSet.has(optionCode)
        let nextStatus = "Потенциально"
        if (safeNum(row?.structure_coverage_pct) >= 100 && safeNum(row?.priced_coverage_pct) >= 100 && row?.oem_ok) {
          nextStatus = "Готова в экономику"
        } else if (safeNum(row?.structure_coverage_pct) < 100) {
          nextStatus = "Есть дыры"
        } else if (safeNum(row?.priced_coverage_pct) < 100) {
          nextStatus = "Нужны цены"
        }
        return {
          ...row,
          is_saved: isSaved,
          status: isSaved ? "Уже сохранена" : nextStatus,
        }
      })
    )
  }, [savedOptionCodeSet])

  useEffect(() => {
    setMatrixColumnKeys((prev) => {
      const keys = matrixColumns.map((column) => column.key).filter(Boolean)
      const prevSet = new Set(prev)
      const kept = prev.filter((key) => keys.includes(key))
      const appended = keys.filter((key) => !prevSet.has(key))
      return kept.length || appended.length ? [...kept, ...appended] : keys
    })
  }, [matrixColumns])

  useEffect(() => {
    setSupplierSummaryColumnKeys((prev) => {
      const keys = supplierSummaryColumns.map((column) => column.key).filter(Boolean)
      const prevSet = new Set(prev)
      const kept = prev.filter((key) => keys.includes(key))
      const appended = keys.filter((key) => !prevSet.has(key))
      return kept.length || appended.length ? [...kept, ...appended] : keys
    })
  }, [supplierSummaryColumns])

  useEffect(() => {
    setComboColumnKeys((prev) => {
      const keys = comboColumns.map((column) => column.key).filter(Boolean)
      const prevSet = new Set(prev)
      const kept = prev.filter((key) => keys.includes(key))
      const appended = keys.filter((key) => !prevSet.has(key))
      return kept.length || appended.length ? [...kept, ...appended] : keys
    })
  }, [comboColumns])

  const orderedMatrixColumns = useMemo(() => {
    const byKey = new Map(matrixColumns.map((column) => [column.key, column]))
    return (matrixColumnKeys.length ? matrixColumnKeys : matrixColumns.map((column) => column.key))
      .map((key) => byKey.get(key))
      .filter(Boolean)
  }, [matrixColumns, matrixColumnKeys])

  const orderedSupplierSummaryColumns = useMemo(() => {
    const byKey = new Map(supplierSummaryColumns.map((column) => [column.key, column]))
    return (
      supplierSummaryColumnKeys.length
        ? supplierSummaryColumnKeys
        : supplierSummaryColumns.map((column) => column.key)
    )
      .map((key) => byKey.get(key))
      .filter(Boolean)
  }, [supplierSummaryColumns, supplierSummaryColumnKeys])

  const orderedComboColumns = useMemo(() => {
    const byKey = new Map(comboColumns.map((column) => [column.key, column]))
    return (comboColumnKeys.length ? comboColumnKeys : comboColumns.map((column) => column.key))
      .map((key) => byKey.get(key))
      .filter(Boolean)
  }, [comboColumns, comboColumnKeys])

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
          <Alert
            type="info"
            showIcon
            message="Где исправлять страну происхождения, вес и Incoterms"
            description={
              <Space direction="vertical" size={8} style={{ width: "100%" }}>
                <Text>Если строка пришла из ответа поставщика, исправляйте страну происхождения, Incoterms, пункт Incoterms и срок на вкладке «Ответы».</Text>
                <Text>Если вы создаёте ручной вариант покрытия, заполните эти поля прямо в ручных строках. Вес особенно важен: без него Логистика и Экономика будут давать предупреждение и грубое распределение фрахта.</Text>
                <Space wrap>
                  {typeof onNavigateTab === "function" ? (
                    <Button size="small" onClick={() => onNavigateTab("responses")}>
                      Открыть Ответы
                    </Button>
                  ) : null}
                  <Button size="small" onClick={openManualModal} disabled={!rfqId || !activeItemId}>
                    Открыть ручной вариант
                  </Button>
                </Space>
              </Space>
            }
          />

          <Space wrap align="center" style={{ width: "100%", justifyContent: "space-between" }}>
            <Space wrap>
              <Select
                style={{ width: 220 }}
                value={scopeMode}
                onChange={(value) => {
                  setScopeMode(value)
                  if (value === "rfq") setMode("matrix")
                  setSelectedCell(null)
                  setComboRows([])
                }}
                options={[
                  { value: "item", label: "Позиция RFQ" },
                  { value: "rfq", label: "Весь RFQ (матрица)" },
                ]}
              />
              {scopeMode === "item" ? (
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
              ) : null}
              <Select
                style={{ width: 220 }}
                value={mode}
                onChange={setMode}
                options={
                  scopeMode === "rfq"
                    ? [
                        { value: "matrix", label: "Матрица покрытия" },
                        { value: "suppliers", label: "Сводка поставщиков" },
                      ]
                    : [
                        { value: "matrix", label: "Матрица покрытия" },
                        { value: "suppliers", label: "Сводка поставщиков" },
                        { value: "combos", label: "Комбинации по позиции" },
                      ]
                }
              />
              <Button type="primary" loading={savingCoverage} onClick={saveCoverageOptions}>
                Сохранить варианты покрытия
              </Button>
              <Button onClick={openManualModal} disabled={!rfqId || !activeItemId}>
                Ручной вариант
              </Button>
              <Button onClick={() => setHelpOpen(true)}>Справка</Button>
            </Space>
            <Space wrap>
              {scopeMode === "item" ? (
                <>
                  <Tag color="blue">
                    Стратегия: {STRATEGY_MODE_LABELS[String(activeItem?.strategy?.mode || "").toUpperCase()] || activeItem?.strategy?.mode || "—"}
                  </Tag>
                  {Number(activeItem?.strategy?.allow_kit) === 1 ? <Tag color="green">Комплект разрешён</Tag> : null}
                </>
              ) : (
                <Tag color="blue">Сводно по всему RFQ</Tag>
              )}
            </Space>
          </Space>

          <Space wrap>
            <Tag color="blue">Поставщиков в RFQ: {kpis.suppliersInRfq}</Tag>
            <Tag color="cyan">Ответили: {kpis.respondedSuppliers}</Tag>
            <Tag color="green">Полное покрытие (1): {kpis.singleSupplierFullCoverage}</Tag>
            {scopeMode === "item" ? <Tag color="purple">Полное покрытие (комбо): {kpis.fullComboCoverage}</Tag> : null}
            <Tag color="gold">Лучший прогресс с ценой: {kpis.bestPricedCoveragePct}%</Tag>
            <Tag color="orange">OEM критичные: {kpis.oemCoveredText}</Tag>
          </Space>

          <Text type="secondary">
            {scopeMode === "item"
              ? "Покрытие в режиме позиции показывает, как закрыть одну строку RFQ: целиком, по составу или комбинированно от нескольких поставщиков. Комбинации по всему заказу собираются на вкладке Сценарии."
              : "В режиме всего RFQ показывается общая картина покрытия по заказу. Комбинирование вариантов между разными позициями выполняется на вкладке Сценарии."}
          </Text>

          {mode === "matrix" ? (
            <>
              <Space direction="vertical" size={4} style={{ width: "100%" }}>
                <Text strong>Режим диагностики покрытия</Text>
                <Text type="secondary">
                  Здесь вы смотрите, кто реально закрывает элементы позиции или всего RFQ, где есть цена, где остаются дыры и какие ответы требуют разбирательства.
                </Text>
              </Space>

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
                <Select
                  style={{ minWidth: 260 }}
                  value={matrixSupplierFocusMode}
                  onChange={setMatrixSupplierFocusMode}
                  options={[
                    { value: "focus", label: "Фокус: лучшее покрытие" },
                    { value: "priced", label: "Фокус: лучшее покрытие с ценой" },
                    { value: "oem", label: "Фокус: OEM и критичные" },
                    { value: "all", label: "Показать всех поставщиков" },
                  ]}
                />
                <Text type="secondary">
                  {matrixSupplierFocusMode === "all"
                    ? `В матрице показаны все поставщики: ${visibleSuppliers.length}.`
                    : matrixSupplierFocusMode === "priced"
                      ? `В матрице показаны ${matrixVisibleSuppliers.length} поставщиков с лучшим покрытием и ценами из ${visibleSuppliers.length}.`
                      : matrixSupplierFocusMode === "oem"
                        ? `В матрице показаны ${matrixVisibleSuppliers.length} поставщиков, наиболее полезных для OEM и критичных строк, из ${visibleSuppliers.length}.`
                        : `В матрице показаны ${matrixVisibleSuppliers.length} поставщиков с лучшим общим покрытием из ${visibleSuppliers.length}.`}
                </Text>
                <Text type="secondary">Колонки можно перетаскивать мышью за заголовки.</Text>
              </Space>

              <div
                ref={matrixTableWrapRef}
                className={`op-table-wrap${matrixScrollHints.left ? " scroll-left" : ""}${
                  matrixScrollHints.right ? " scroll-right" : ""
                }`}
              >
                {matrixScrollHints.right && !matrixScrollHints.left ? (
                  <Text type="secondary" className="op-table-scroll-note">
                    В таблице есть продолжение вправо
                  </Text>
                ) : null}
                <DraggableColumnsTable
                  columnSizingKey="rfq_coverage_matrix_column_widths_v1"
                  className="op-table"
                  size="small"
                  rowKey="key"
                  dataSource={matrixTableRows}
                  columns={orderedMatrixColumns}
                  pagination={{ pageSize: 100, hideOnSinglePage: true }}
                  tableLayout="auto"
                  scroll={{ x: "max-content" }}
                  nonDraggableKeys={scopeMode === "rfq" ? ["rfq_item"] : []}
                  onColumnOrderChange={({ orderedVisibleKeys }) => setMatrixColumnKeys(orderedVisibleKeys)}
                />
              </div>

              {scopeMode === "item" &&
              Array.isArray(coverageModel?.coverageSlots) &&
              coverageModel.coverageSlots.length ? (
                <Card size="small" title="Слоты покрытия (варианты закрытия)">
                  <Space direction="vertical" size={8} style={{ width: "100%" }}>
                    {coverageModel.coverageSlots.map((slot) => (
                      <div key={slot.key}>
                        <Space wrap size={6}>
                          <Text strong>{slot.label}</Text>
                          <Tag color="blue">Слот</Tag>
                          {slot.is_oem_required ? <Tag color="gold">Только OEM</Tag> : null}
                          {slot.required_qty != null ? (
                            <Text type="secondary">
                              Требуется: {formatQtyWithUomLabel(slot.required_qty, slot.uom)}
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

              <Card size="small" title="Справочник статусов матрицы">
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
                    {renderSupplierQualityTags(selectedCell.supplier)}
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
            <Space direction="vertical" size={12} style={{ width: "100%" }}>
              <Space direction="vertical" size={4} style={{ width: "100%" }}>
                <Text strong>Режим обзора по поставщикам</Text>
                <Text type="secondary">
                  Здесь удобнее смотреть общую картину по каждому поставщику: прогресс покрытия, цены, OEM-критичность и потенциал консолидации без детализации по ячейкам.
                </Text>
              </Space>

              <div
                ref={supplierSummaryWrapRef}
                className={`op-table-wrap${supplierSummaryScrollHints.left ? " scroll-left" : ""}${
                  supplierSummaryScrollHints.right ? " scroll-right" : ""
                }`}
              >
                {supplierSummaryScrollHints.right && !supplierSummaryScrollHints.left ? (
                  <Text type="secondary" className="op-table-scroll-note">
                    В таблице есть продолжение вправо
                  </Text>
                ) : null}
                <DraggableColumnsTable
                  columnSizingKey="rfq_coverage_supplier_summary_column_widths_v1"
                  className="op-table"
                  size="small"
                  rowKey="supplier_id"
                  dataSource={supplierSummaryRows}
                  pagination={{ pageSize: 50, hideOnSinglePage: true }}
                  columns={orderedSupplierSummaryColumns}
                  tableLayout="auto"
                  scroll={{ x: "max-content" }}
                  onColumnOrderChange={({ orderedVisibleKeys }) => setSupplierSummaryColumnKeys(orderedVisibleKeys)}
                />
              </div>
            </Space>
          ) : null}

          {mode === "combos" && scopeMode === "item" ? (
            <Space direction="vertical" style={{ width: "100%" }} size={12}>
              <Space direction="vertical" size={4} style={{ width: "100%" }}>
                <Text strong>Режим подготовки комбинаций</Text>
                <Text type="secondary">
                  Здесь система не диагностирует покрытие, а предлагает конкретные смешанные варианты закрытия выбранной позиции несколькими поставщиками.
                </Text>
              </Space>

              <Space wrap>
                <Button type="primary" onClick={buildCombinationSuggestions}>
                  Подсказать комбинации по позиции
                </Button>
              </Space>

              <Text type="secondary">
                Здесь система комбинирует поставщиков только внутри выбранной позиции RFQ. Например, две детали сборки от одного поставщика и две от другого. Комбинации между разными позициями всего заказа формируются на вкладке Сценарии.
              </Text>

              <div
                ref={combosTableWrapRef}
                className={`op-table-wrap${combosScrollHints.left ? " scroll-left" : ""}${
                  combosScrollHints.right ? " scroll-right" : ""
                }`}
              >
                {combosScrollHints.right && !combosScrollHints.left ? (
                  <Text type="secondary" className="op-table-scroll-note">
                    В таблице есть продолжение вправо
                  </Text>
                ) : null}
                <DraggableColumnsTable
                  columnSizingKey="rfq_coverage_combos_column_widths_v1"
                  className="op-table"
                  size="small"
                  rowKey="key"
                  dataSource={comboRows}
                  pagination={{ pageSize: 20, hideOnSinglePage: true }}
                  tableLayout="auto"
                  scroll={{ x: "max-content" }}
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
                  columns={orderedComboColumns}
                  onColumnOrderChange={({ orderedVisibleKeys }) => setComboColumnKeys(orderedVisibleKeys)}
                />
              </div>
            </Space>
          ) : null}
        </>
      )}
      <Modal
        open={manualModalOpen}
        onCancel={() => setManualModalOpen(false)}
        onOk={handleCreateManualOption}
        confirmLoading={manualSaving}
        width={920}
        title="Ручной вариант покрытия"
      >
        <Form form={manualForm} layout="vertical">
          <Card
            size="small"
            style={{ marginBottom: 16, background: "#fafafa" }}
            bodyStyle={{ padding: 12 }}
          >
            <Text type="secondary">
              Соберите вариант исполнения вручную, если нужно зафиксировать нестандартную схему: особую договорённость, смешанную поставку, временное решение или вариант, который система не собрала автоматически.
            </Text>
          </Card>
          <Space wrap align="start">
            <Form.Item name="rfq_item_id" label="Строка RFQ" rules={[{ required: true }]}>
              <Select style={{ width: 360 }} options={itemOptions} />
            </Form.Item>
            <Form.Item
              name="option_kind"
              label="Тип варианта"
              tooltip="Определяет, как интерпретировать вариант: вручную, целиком, по составу, комплектом или комбинированно."
            >
              <Select
                style={{ width: 160 }}
                options={[
                  { value: "MANUAL", label: COVERAGE_KIND_LABELS.MANUAL },
                  { value: "MIXED", label: COVERAGE_KIND_LABELS.MIXED },
                  { value: "KIT", label: COVERAGE_KIND_LABELS.KIT },
                  { value: "BOM", label: COVERAGE_KIND_LABELS.BOM },
                  { value: "WHOLE", label: COVERAGE_KIND_LABELS.WHOLE },
                ]}
              />
            </Form.Item>
            <Form.Item name="goods_currency" label="Валюта">
              <Select style={{ width: 120 }} options={[{ value: "USD", label: "USD" }, { value: "EUR", label: "EUR" }, { value: "RUB", label: "RUB" }]} />
            </Form.Item>
          </Space>
          <Form.Item name="note" label="Комментарий">
            <Input.TextArea rows={2} placeholder="Почему собираем вариант вручную" />
          </Form.Item>
          <Form.List name="lines">
            {(fields, { add, remove }) => (
              <Space direction="vertical" style={{ width: "100%" }} size={8}>
                {fields.map((field, index) => (
                  <Card
                    key={field.key}
                    size="small"
                    title={`Строка варианта #${index + 1}`}
                    extra={
                      fields.length > 1 ? (
                        <Button danger type="text" onClick={() => remove(field.name)}>
                          Удалить
                        </Button>
                      ) : null
                    }
                  >
                    <Space wrap align="start">
                      <Form.Item
                        {...field}
                        name={[field.name, "supplier_id"]}
                        label="Поставщик"
                        rules={[{ required: true, message: "Выберите поставщика" }]}
                      >
                        <Select
                          style={{ width: 260 }}
                          options={supplierCatalog.map((supplier) => ({
                            value: supplier.supplier_id,
                            label: supplier.supplier_name,
                          }))}
                        />
                      </Form.Item>
                      <Form.Item {...field} name={[field.name, "line_role"]} label="Роль">
                        <Select
                          style={{ width: 160 }}
                          options={[
                            { value: "MANUAL", label: COVERAGE_LINE_ROLE_LABELS.MANUAL },
                            { value: "WHOLE", label: COVERAGE_LINE_ROLE_LABELS.WHOLE },
                            { value: "COMPONENT", label: COVERAGE_LINE_ROLE_LABELS.COMPONENT },
                            { value: "KIT_ROLE", label: COVERAGE_LINE_ROLE_LABELS.KIT_ROLE },
                          ]}
                        />
                      </Form.Item>
                      <Form.Item {...field} name={[field.name, "qty"]} label="Кол-во">
                        <InputNumber style={{ width: 120 }} min={0} />
                      </Form.Item>
                      <Form.Item {...field} name={[field.name, "uom"]} label="Ед.">
                        <Select style={{ width: 100 }} options={uomOptions} loading={uomLoading} allowClear />
                      </Form.Item>
                      <Form.Item {...field} name={[field.name, "unit_price"]} label="Цена">
                        <InputNumber style={{ width: 140 }} min={0} />
                      </Form.Item>
                      <Form.Item {...field} name={[field.name, "goods_currency"]} label="Валюта">
                        <Select style={{ width: 120 }} options={[{ value: "USD", label: "USD" }, { value: "EUR", label: "EUR" }, { value: "RUB", label: "RUB" }]} />
                      </Form.Item>
                      <Form.Item {...field} name={[field.name, "lead_time_days"]} label="Срок, дн">
                        <InputNumber style={{ width: 120 }} min={0} />
                      </Form.Item>
                      <Form.Item {...field} name={[field.name, "weight_kg"]} label="Вес, кг">
                        <InputNumber style={{ width: 120 }} min={0} {...compactInputNumberProps} />
                      </Form.Item>
                      <Form.Item {...field} name={[field.name, "origin_country"]} label="Страна происхождения">
                        <Input style={{ width: 140 }} placeholder="Например: Китай" />
                      </Form.Item>
                      <Form.Item {...field} name={[field.name, "incoterms"]} label="Incoterms">
                        <Input style={{ width: 120 }} placeholder="FOB" />
                      </Form.Item>
                      <Form.Item {...field} name={[field.name, "incoterms_place"]} label="Пункт Incoterms">
                        <Input style={{ width: 220 }} placeholder="Например: Shanghai Port" />
                      </Form.Item>
                    </Space>
                    <Form.Item {...field} name={[field.name, "note"]} label="Комментарий">
                      <Input placeholder="Причина, ограничение, временное решение" />
                    </Form.Item>
                  </Card>
                ))}
                <Button
                  onClick={() =>
                    add({
                      line_role: "MANUAL",
                      qty: activeItem?.requested_qty || 1,
                      uom: activeItem?.uom || "шт",
                      goods_currency: manualForm.getFieldValue("goods_currency") || "USD",
                    })
                  }
                >
                  Добавить строку
                </Button>
              </Space>
            )}
          </Form.List>
        </Form>
      </Modal>
      <Drawer
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        width={520}
        title="Справка по вкладке «Покрытие»"
      >
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          {COVERAGE_HELP_SECTIONS.map((section) => (
            <Card key={section.title} size="small" title={section.title}>
              <Text>{section.body}</Text>
            </Card>
          ))}
          <Card size="small" title="Формализованный пример">
            <Space direction="vertical" size={8}>
              <Text>
                В заказе есть <Text strong>строка 1</Text> со сборкой и <Text strong>строка 2</Text> с обычной деталью.
              </Text>
              <Text>
                По строке 1 система может увидеть два варианта: <Text strong>Поставщик A — узел целиком</Text> или <Text strong>Поставщик B — по составу</Text>.
              </Text>
              <Text>
                По строке 2 может быть вариант <Text strong>Поставщик C — узел целиком</Text>.
              </Text>
              <Text>
                Сначала на этой вкладке вы сохраняете эти варианты как допустимые. Затем в <Text strong>Сценариях</Text> выбираете по одному варианту на каждую строку RFQ и собираете полный план исполнения всего заказа.
              </Text>
            </Space>
          </Card>
        </Space>
      </Drawer>
    </Space>
  )
}

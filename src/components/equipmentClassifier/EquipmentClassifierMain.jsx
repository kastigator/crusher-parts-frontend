import React, { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Button,
  Card,
  Alert,
  Checkbox,
  Col,
  Descriptions,
  Divider,
  Drawer,
  Dropdown,
  Empty,
  Form,
  Image,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Statistic,
  Switch,
  Tabs,
  Tag,
  Table,
  Tree,
  Typography,
  Upload,
  message,
} from "antd"
import {
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  InboxOutlined,
  LockOutlined,
  MoreOutlined,
  ReloadOutlined,
  SearchOutlined,
  StarFilled,
  StarOutlined,
  UnlockOutlined,
  UploadOutlined,
} from "@ant-design/icons"
import axios from "@/api/axiosInstance"
import useMeasurementUnits from "@/hooks/useMeasurementUnits"
import { runTrashDeleteFlow } from "@/utils/trashUi"
import TnvedPicker from "@/components/fields/TnvedPicker"

const CLIENT_PART_TYPE_LABELS = {
  client_drawing: "По чертежу клиента",
  oem_variant: "Отличается от детали производителя",
  oem_replacement: "Замена детали производителя",
  unknown_oem: "Номер производителя неизвестен",
}

const CLIENT_PART_TYPE_COLORS = {
  client_drawing: "blue",
  oem_variant: "orange",
  oem_replacement: "purple",
  unknown_oem: "default",
}

const UNIT_BOM_STATUS_OPTIONS = [
  { value: "as_original", label: "Как в базовой модели", color: "green" },
  { value: "replaced", label: "Заменена", color: "purple" },
  { value: "client_drawing", label: "По чертежу клиента", color: "blue" },
  { value: "unknown_oem", label: "OEM неизвестен", color: "default" },
  { value: "not_applicable", label: "Не применяется", color: "red" },
  { value: "needs_review", label: "Требует уточнения", color: "orange" },
]

const UNIT_BOM_STATUS_BY_VALUE = Object.fromEntries(UNIT_BOM_STATUS_OPTIONS.map((item) => [item.value, item]))

const SEARCH_TYPE_LABELS = {
  classifier_node: "Раздел",
  equipment_model: "Модель",
  catalog_position: "Карточка товара",
  client_equipment_unit: "Машина клиента",
  client_part: "Деталь клиента",
}

const SEARCH_TYPE_COLORS = {
  classifier_node: "blue",
  equipment_model: "green",
  catalog_position: "purple",
  client_equipment_unit: "orange",
  client_part: "cyan",
}

const SEARCH_TYPE_ORDER = [
  "classifier_node",
  "equipment_model",
  "catalog_position",
  "client_equipment_unit",
  "client_part",
]

const ATTRIBUTE_TYPE_OPTIONS = [
  { value: "number", label: "Число" },
  { value: "text", label: "Текст" },
  { value: "textarea", label: "Многострочный текст" },
  { value: "boolean", label: "Да / нет" },
  { value: "select", label: "Список" },
  { value: "multiselect", label: "Несколько значений" },
  { value: "date", label: "Дата" },
]

const ATTRIBUTE_TYPE_LABELS = Object.fromEntries(ATTRIBUTE_TYPE_OPTIONS.map((item) => [item.value, item.label]))

const CARD_KIND_OPTIONS = [
  {
    value: "auto",
    label: "Наследовать / папка",
    description: "Раздел не задает собственный тип карточек. Он наследует тип родителя или работает как папка.",
    when: "Для промежуточных разделов, которые только группируют дочерние классы.",
    opens: "Раздел показывает обзор ветки: подразделы, модели и/или товарные карточки.",
    primaryCard: "Не задается",
    tabs: ["Обзор раздела", "Списки внутри раздела", "Фильтры по найденному содержимому"],
  },
  {
    value: "equipment_model",
    label: "Оборудование",
    description: "Ветка предназначена для моделей машин или оборудования.",
    when: "Для верхних веток и классов вроде Горное оборудование, Грохоты, Питатели, Дробилки конусные.",
    opens: "При клике открывается карточка конкретной модели оборудования.",
    primaryCard: "Модель оборудования",
    tabs: ["Паспорт модели", "BOM модели", "Машины клиентов", "Клиентские исполнения"],
  },
  {
    value: "catalog_position",
    label: "Товар / номенклатура",
    description: "Ветка предназначена для товарных и номенклатурных карточек: детали, материалы, крепеж, расходники.",
    when: "Для верхних веток и классов вроде Крепеж, Болты, Подшипники, Рукава, Масла, Электрокомпоненты.",
    opens: "При клике открывается карточка товара/позиции классификатора.",
    primaryCard: "Карточка товара",
    tabs: ["Паспорт товара", "Где используется в BOM", "Поставщики", "Документы"],
  },
]

const CARD_KIND_LABELS = {
  auto: "Наследовать / папка",
  mixed: "Наследовать / папка",
  equipment_model: "Оборудование",
  catalog_position: "Товар / номенклатура",
  service: "Услуги",
  material: "Материалы",
}

const CARD_KIND_COLORS = {
  auto: "default",
  mixed: "default",
  equipment_model: "green",
  catalog_position: "purple",
  service: "cyan",
  material: "orange",
}

const PRIMARY_CARD_LABELS = {
  auto: "По содержимому раздела",
  mixed: "По содержимому раздела",
  equipment_model: "Модель оборудования",
  catalog_position: "Карточка товара",
  service: "Карточка услуги",
  material: "Карточка материала",
}

const EMPTY_FORM = {
  name: "",
  notes: "",
  card_kind: "auto",
}

const CARD_IMAGE_STYLE = {
  width: "100%",
  aspectRatio: "4 / 3",
  objectFit: "cover",
  borderRadius: 6,
  background: "#f5f5f5",
}

const formatFileSize = (bytes) => {
  if (bytes === null || bytes === undefined || bytes === "") return "—"
  const n = Number(bytes)
  if (!Number.isFinite(n)) return "—"
  const units = ["B", "KB", "MB", "GB"]
  const idx = Math.min(Math.floor(Math.log(Math.max(n, 1)) / Math.log(1024)), units.length - 1)
  return `${(n / 1024 ** idx).toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`
}

const API_ORIGIN = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "")

const resolveAssetUrl = (url) => {
  if (!url) return ""
  if (/^(https?:)?\/\//i.test(url) || url.startsWith("data:") || url.startsWith("blob:")) return url
  if (url.startsWith("/")) return `${API_ORIGIN}${url}`
  return url
}

const treeKey = {
  node: (id) => `node:${id}`,
  manufacturer: (nodeId, manufacturerId) => `manufacturer:${nodeId}:${manufacturerId}`,
  model: (id) => `model:${id}`,
  catalogPosition: (id) => `catalog_position:${id}`,
  unit: (id) => `unit:${id}`,
}

const CLASSIFIER_UI_SCOPE = "equipment_classifier"
const CLASSIFIER_FAVORITES_KEY = "tree_favorites_v1"

const compareClassifierNames = (a, b) =>
  String(a || "").localeCompare(String(b || ""), "ru", {
    numeric: true,
    sensitivity: "base",
  })

const parseTreeKey = (value) => {
  const [type, first, second] = String(value || "").split(":")
  return {
    type,
    id: Number(first) || null,
    extraId: Number(second) || null,
  }
}

const flattenTree = (nodes, map = new Map()) => {
  ;(nodes || []).forEach((node) => {
    map.set(Number(node.id), node)
    flattenTree(node.children || [], map)
  })
  return map
}

const buildBomTree = (rows) => {
  const byId = new Map()
  const roots = []
  ;(rows || []).forEach((row) => {
    byId.set(Number(row.id), { ...row, key: row.id, children: [] })
  })
  byId.forEach((row) => {
    const parentId = Number(row.parent_item_id)
    if (parentId && byId.has(parentId)) {
      byId.get(parentId).children.push(row)
    } else {
      roots.push(row)
    }
  })
  const sortRows = (items) => {
    items.sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0) || Number(a.id) - Number(b.id))
    items.forEach((item) => sortRows(item.children || []))
  }
  sortRows(roots)
  return roots
}

const getBomItemLabel = (row) =>
  row?.manufacturer_part_number ||
  row?.part_number ||
  row?.catalog_position_code ||
  row?.catalog_position_name ||
  row?.title ||
  "—"

const getBomItemName = (row) =>
  row?.manufacturer_part_name_en ||
  row?.manufacturer_part_name_ru ||
  row?.manufacturer_part_name ||
  row?.description_ru ||
  row?.description_en ||
  row?.catalog_position_name ||
  row?.client_part_name ||
  row?.title ||
  ""

const isBomOwnCatalogPosition = (row) => {
  if (!row?.catalog_position_id) return false
  if (row.catalog_position_source_kind !== "model_bom") return false
  const sourceBomItemId = Number(row.catalog_position_source_bom_item_id || 0)
  return !sourceBomItemId || sourceBomItemId === Number(row.id)
}

const BOM_ROW_KIND_LABELS = {
  assembly: "Сборка",
  part: "Деталь",
  kit: "Комплект",
  document: "Документ",
  service: "Услуга",
  material: "Материал",
  unknown: "Не определено",
}

const BOM_ROW_KIND_OPTIONS = [
  {
    value: "assembly",
    label: "Сборка / узел",
    description: "Контейнер в parts book: внутрь добавляют детали, комплекты, материалы или документы.",
    example: "Main Frame, Adjustment Ring",
  },
  {
    value: "part",
    label: "Деталь / позиция",
    description: "Обычная строка каталога, которую можно купить, изготовить или заменить аналогом.",
    example: "Piston, Hex bolt, Bearing",
  },
  {
    value: "kit",
    label: "Комплект",
    description: "Набор, который производитель ведет как одну строку каталога.",
    example: "Seal kit, Repair kit",
  },
  {
    value: "document",
    label: "Документ / схема / чертеж",
    description: "Схема, чертеж или документ из каталога. Обычно не является закупочной деталью.",
    example: "Wiring Schematic",
  },
  {
    value: "service",
    label: "Услуга / работа",
    description: "Работа или операция, которую можно заказать как услугу.",
    example: "Inspection, machining, repair",
  },
  {
    value: "material",
    label: "Материал",
    description: "Расходуемый материал или сырье, которое используется в узле.",
    example: "Loctite, grease, plate steel",
  },
]

const getBomEffectiveRowKind = (row) => {
  if (Array.isArray(row?.children) && row.children.length > 0) return "assembly"
  return row?.row_kind || "unknown"
}

const getBomItemTypeLabel = (row) => {
  return BOM_ROW_KIND_LABELS[getBomEffectiveRowKind(row)] || "Строка каталога"
}

const getBomLinkStatusLabel = (row) => {
  if (isBomOwnCatalogPosition(row)) return "Отдельная позиция этой модели"
  if (row?.catalog_position_id) return "Связана с общей позицией"
  if (row?.client_part_id || row?.bom_client_part_id) return "Деталь по чертежу клиента"
  return "Отдельная позиция этой модели"
}

const formatBomQuantity = (row) => {
  const rawQuantity = Number(row?.quantity ?? 0)
  const quantity = Number.isFinite(rawQuantity) ? rawQuantity : 0
  return `${quantity.toLocaleString("ru-RU", { maximumFractionDigits: 3 })} ${row?.uom || row?.catalog_position_uom || "шт"}`
}

const getBomManufacturerNumber = (row) => row?.manufacturer_part_number || row?.part_number || row?.catalog_position_code || "—"

const normalizeCatalogIdentity = (value) => String(value || "").trim().toLowerCase()

const getBomTitleEn = (row) =>
  row?.manufacturer_part_name_en ||
  row?.manufacturer_part_name ||
  row?.description_en ||
  row?.catalog_position_name ||
  row?.title ||
  "—"

const getBomTitleRu = (row) => row?.manufacturer_part_name_ru || row?.description_ru || "—"

const formatNullableNumber = (value, suffix = "") => {
  if (value === undefined || value === null || value === "") return "—"
  const number = Number(value)
  if (!Number.isFinite(number)) return "—"
  return `${number.toLocaleString("ru-RU", { maximumFractionDigits: 3 })}${suffix ? ` ${suffix}` : ""}`
}

const formatMoney = (value, currency) => {
  if (value === undefined || value === null || value === "") return "—"
  const number = Number(value)
  if (!Number.isFinite(number)) return "—"
  return `${number.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency || ""}`.trim()
}

const WAREHOUSE_DOC_TYPE_LABELS = {
  receipt: "Приход",
  transfer: "Перемещение",
  writeoff: "Списание",
  reserve: "Резерв",
  unreserve: "Снятие резерва",
}

const WAREHOUSE_MOVEMENT_LABELS = {
  receipt: "Приход",
  transfer_out: "Перемещение - расход",
  transfer_in: "Перемещение - приход",
  writeoff: "Списание",
  reserve: "Резерв",
  unreserve: "Снятие резерва",
}

const WAREHOUSE_DOC_COLORS = {
  receipt: "green",
  transfer: "blue",
  writeoff: "red",
  reserve: "gold",
  unreserve: "purple",
}

const formatWarehouseQuantity = (value, uom = "шт") => {
  const number = Number(value || 0)
  const formatted = Number.isFinite(number) ? number.toLocaleString("ru-RU", { maximumFractionDigits: 3 }) : "0"
  return `${formatted} ${uom || "шт"}`
}

const formatWarehouseDate = (value) => {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const getWarehouseSourceTitle = (row) => {
  if (row?.source_label) return row.source_label
  if (row?.source_id) return `${row.source_type || "Источник"} #${row.source_id}`
  return row?.basis_document || "Ручной документ"
}

const getUnitSymbol = (units, code, fallback) => {
  const unit = (Array.isArray(units) ? units : []).find((item) => item.code === code)
  return unit?.symbol || unit?.code || fallback
}

const formatDimensions = (row, unitSymbol = "мм") => {
  const length = row?.length_mm
  const width = row?.width_mm
  const height = row?.height_mm
  if ([length, width, height].some((value) => value === undefined || value === null || value === "")) return "—"
  return `${formatNullableNumber(length, unitSymbol)} × ${formatNullableNumber(width, unitSymbol)} × ${formatNullableNumber(height, unitSymbol)}`
}

const BOM_VISIBLE_FIELD_OPTIONS = [
  { value: "tnved", label: "ТН ВЭД" },
  { value: "weight", label: "Масса" },
  { value: "dimensions", label: "Габариты" },
  { value: "material", label: "Материал" },
  { value: "description", label: "Описание" },
]

const parseJsonObject = (value) => {
  if (!value) return {}
  if (typeof value === "object") return value
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch {
    return {}
  }
}

const getBomRowCardMeta = (row) => parseJsonObject(row?.catalog_position_meta_json || row?.meta_json)

const hasBomExtraValue = (value) => value !== undefined && value !== null && value !== "" && value !== "null"

const getBomRowWeight = (row) => {
  const meta = getBomRowCardMeta(row)
  const value = row?.catalog_position_weight_kg ?? row?.weight_kg ?? meta.weight_kg
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

const toBomNumber = (value) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

const toLegacyCmAsMm = (value) => {
  const number = toBomNumber(value)
  return number === null ? null : number * 10
}

const getBomRowDimensions = (row) => {
  const meta = getBomRowCardMeta(row)
  return {
    length_mm:
      toBomNumber(row?.catalog_position_length_mm ?? row?.length_mm ?? meta.length_mm) ?? toLegacyCmAsMm(meta.length_cm),
    width_mm:
      toBomNumber(row?.catalog_position_width_mm ?? row?.width_mm ?? meta.width_mm) ?? toLegacyCmAsMm(meta.width_cm),
    height_mm:
      toBomNumber(row?.catalog_position_height_mm ?? row?.height_mm ?? meta.height_mm) ?? toLegacyCmAsMm(meta.height_cm),
  }
}

const getBomRowDimensionsText = (row, unitSymbol = "мм") => {
  const dimensions = getBomRowDimensions(row)
  return formatDimensions({
    length_mm: dimensions.length_mm,
    width_mm: dimensions.width_mm,
    height_mm: dimensions.height_mm,
  }, unitSymbol)
}

const splitBomFilterValues = (value) =>
  String(value || "")
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter(Boolean)

const getBomRowFilterValue = (row, key) => {
  const meta = getBomRowCardMeta(row)
  if (key === "tnved") return row?.catalog_position_tnved_code || row?.tnved_code || meta.tnved_code
  if (key === "weight") return getBomRowWeight(row)
  if (key === "dimensions") {
    const dimensions = getBomRowDimensionsText(row)
    return dimensions !== "—" ? dimensions : null
  }
  if (key === "material") {
    return row?.catalog_position_materials_summary || row?.materials_summary || meta.material || meta.material_name
  }
  if (key === "description") {
    return row?.catalog_position_description || row?.description || row?.description_ru || row?.description_en
  }
  return null
}

const makeBomExtraField = (key, label, value) => ({
  key,
  label,
  value: hasBomExtraValue(value) ? value : "—",
})

const getBomRowExtraFields = (row, visibleFields = [], dimensionUnitSymbol = "мм") => {
  if (!Array.isArray(visibleFields) || !visibleFields.length) return []
  const result = []
  const hasField = (field) => visibleFields.includes(field)

  if (hasField("tnved")) {
    const value = getBomRowFilterValue(row, "tnved")
    result.push(makeBomExtraField("tnved", "ТН ВЭД", value))
  }

  if (hasField("weight")) {
    const value = getBomRowWeight(row)
    result.push(makeBomExtraField("weight", "Масса", hasBomExtraValue(value) ? formatNullableNumber(value, "кг") : null))
  }

  if (hasField("dimensions")) {
    const dimensions = getBomRowDimensionsText(row, dimensionUnitSymbol)
    result.push(makeBomExtraField("dimensions", "Габариты", dimensions !== "—" ? dimensions : null))
  }

  if (hasField("material")) {
    const value = getBomRowFilterValue(row, "material")
    result.push(makeBomExtraField("material", "Материал", value))
  }

  if (hasField("description")) {
    const value = getBomRowFilterValue(row, "description")
    result.push(makeBomExtraField("description", "Описание", value))
  }

  return result
}

const getRelationshipLabel = (value) => {
  if (value === "exact") return "Точное соответствие"
  if (value === "analog") return "Аналог"
  if (value === "can_supply") return "Может поставить"
  return "Связь"
}

const flattenBomTreeRows = (rows, level = 0, acc = []) => {
  ;(rows || []).forEach((row, index) => {
    const children = Array.isArray(row.children) ? row.children : []
    acc.push({
      ...row,
      bom_level: level,
      bom_is_last: index === rows.length - 1,
      bom_has_children: children.length > 0,
    })
    flattenBomTreeRows(children, level + 1, acc)
  })
  return acc
}

const buildBomTreeData = (rows, actions = {}) =>
  (rows || []).map((row) => {
    const effectiveKind = getBomEffectiveRowKind(row)
    const children = Array.isArray(row.children) ? row.children : []
    const isGroup = children.length > 0 || effectiveKind === "assembly"
    const label = getBomItemLabel(row)
    const itemName = getBomItemName(row)
    const uom = row.uom || row.catalog_position_uom || "шт"
    const extraFields = getBomRowExtraFields(row, actions.visibleFields, actions.dimensionUnitSymbol)
    const menuItems = [
      { key: "edit", label: "Изменить строку", icon: <EditOutlined /> },
      { key: "reuse", label: "Добавить применение", icon: <CopyOutlined /> },
      { type: "divider" },
      { key: "delete", label: "Удалить", danger: true, icon: <DeleteOutlined /> },
    ]

    return {
      key: row.id,
      title: (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            width: "100%",
            padding: "3px 0",
          }}
        >
          <Space direction="vertical" size={1} style={{ minWidth: 0, flex: 1, width: "100%" }}>
            <Space size={8} wrap>
              <Typography.Link strong={isGroup} onClick={() => actions.onOpen?.(row)}>
                {label}
              </Typography.Link>
              {itemName && itemName !== label ? <Typography.Text>{itemName}</Typography.Text> : null}
              <Tag title="Количество в этом месте BOM">
                {Number(row.quantity || 0).toLocaleString("ru-RU")} {uom}
              </Tag>
            </Space>
            {extraFields.length ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                  gap: "4px 18px",
                  alignItems: "start",
                  width: "100%",
                  minWidth: 0,
                  paddingRight: 12,
                }}
              >
                {extraFields.map((field) => (
                  <div
                    key={field.key}
                    style={{
                      display: "flex",
                      gap: 4,
                      minWidth: 0,
                      alignItems: "baseline",
                    }}
                  >
                    <Typography.Text type="secondary" style={{ fontSize: 12, flex: "0 0 auto" }}>
                      {field.label}:
                    </Typography.Text>
                    <Typography.Text
                      type="secondary"
                      title={String(field.value)}
                      style={{
                        fontSize: 12,
                        minWidth: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        maxWidth: "100%",
                      }}
                    >
                      {field.value}
                    </Typography.Text>
                  </div>
                ))}
              </div>
            ) : null}
          </Space>

          <Space size={4} onClick={(event) => event.stopPropagation()}>
            <Dropdown
              trigger={["click"]}
              menu={{
                items: menuItems,
                onClick: ({ key, domEvent }) => {
                  domEvent.stopPropagation()
                  if (key === "edit") actions.onEdit?.(row)
                  if (key === "reuse") actions.onReuse?.(row)
                  if (key === "delete") actions.onDelete?.(row)
                },
              }}
            >
              <Button size="small" icon={<MoreOutlined />} title="Действия" />
            </Dropdown>
          </Space>
        </div>
      ),
      children: buildBomTreeData(children, actions),
    }
  })

export default function EquipmentClassifierMain() {
  const navigate = useNavigate()
  const { options: measurementUnitOptions, loading: measurementUnitsLoading } = useMeasurementUnits()
  const { units: lengthMeasurementUnits } = useMeasurementUnits({ dimensionType: "length" })
  const dimensionUnitSymbol = getUnitSymbol(lengthMeasurementUnits, "мм", "мм")
  const [treeRows, setTreeRows] = useState([])
  const [allModels, setAllModels] = useState([])
  const [allUnits, setAllUnits] = useState([])
  const [clients, setClients] = useState([])
  const [classifierFavoriteKeys, setClassifierFavoriteKeys] = useState([])
  const [classifierExpandedKeys, setClassifierExpandedKeys] = useState([])
  const [loading, setLoading] = useState(false)
  const [workspaceLoading, setWorkspaceLoading] = useState(false)
  const [workspace, setWorkspace] = useState(null)
  const [attributes, setAttributes] = useState([])
  const [attributeFilters, setAttributeFilters] = useState({})
  const [attributesLoading, setAttributesLoading] = useState(false)
  const [attributeManagerOpen, setAttributeManagerOpen] = useState(false)
  const [attributeSaving, setAttributeSaving] = useState(false)
  const [editingAttribute, setEditingAttribute] = useState(null)
  const [attributeEditorMode, setAttributeEditorMode] = useState(null)
  const [modelAttributesOpen, setModelAttributesOpen] = useState(false)
  const [modelDetailsOpen, setModelDetailsOpen] = useState(false)
  const [modelAttributesLoading, setModelAttributesLoading] = useState(false)
  const [modelAttributesSaving, setModelAttributesSaving] = useState(false)
  const [modelDetailsSaving, setModelDetailsSaving] = useState(false)
  const [modelAttributeRows, setModelAttributeRows] = useState([])
  const [unitModalOpen, setUnitModalOpen] = useState(false)
  const [unitSaving, setUnitSaving] = useState(false)
  const [unitAttributesLoading, setUnitAttributesLoading] = useState(false)
  const [unitAttributeRows, setUnitAttributeRows] = useState([])
  const [unitPassportLoading, setUnitPassportLoading] = useState(false)
  const [unitPassportRows, setUnitPassportRows] = useState([])
  const [editingUnit, setEditingUnit] = useState(null)
  const [unitBomLoading, setUnitBomLoading] = useState(false)
  const [unitBomItems, setUnitBomItems] = useState([])
  const [unitBomOverrideOpen, setUnitBomOverrideOpen] = useState(false)
  const [unitBomOverrideSaving, setUnitBomOverrideSaving] = useState(false)
  const [unitBomClientPartSaving, setUnitBomClientPartSaving] = useState(false)
  const [unitClientPartOptions, setUnitClientPartOptions] = useState([])
  const [unitClientPartLoading, setUnitClientPartLoading] = useState(false)
  const [editingUnitBomItem, setEditingUnitBomItem] = useState(null)
  const [clientPartDrawerOpen, setClientPartDrawerOpen] = useState(false)
  const [clientPartDetails, setClientPartDetails] = useState(null)
  const [clientPartDocuments, setClientPartDocuments] = useState([])
  const [clientPartDetailsLoading, setClientPartDetailsLoading] = useState(false)
  const [clientPartDocumentUploading, setClientPartDocumentUploading] = useState(false)
  const [attributeModel, setAttributeModel] = useState(null)
  const [detailsModel, setDetailsModel] = useState(null)
  const [modelMedia, setModelMedia] = useState([])
  const [modelMediaLoading, setModelMediaLoading] = useState(false)
  const [modelMediaUploading, setModelMediaUploading] = useState(false)
  const [modelDocuments, setModelDocuments] = useState([])
  const [modelDocumentsLoading, setModelDocumentsLoading] = useState(false)
  const [modelDocumentUploading, setModelDocumentUploading] = useState(false)
  const [modelBomItems, setModelBomItems] = useState([])
  const [modelBomLoading, setModelBomLoading] = useState(false)
  const [modelActiveTab, setModelActiveTab] = useState("passport")
  const [modelClientExecutions, setModelClientExecutions] = useState([])
  const [modelClientExecutionsLoading, setModelClientExecutionsLoading] = useState(false)
  const [clientExecutionStatusFilter, setClientExecutionStatusFilter] = useState(null)
  const [clientExecutionMissingDocsOnly, setClientExecutionMissingDocsOnly] = useState(false)
  const [bomImportOpen, setBomImportOpen] = useState(false)
  const [bomImportLoading, setBomImportLoading] = useState(false)
  const [bomImportCommitting, setBomImportCommitting] = useState(false)
  const [bomImportRows, setBomImportRows] = useState([])
  const [bomImportErrors, setBomImportErrors] = useState([])
  const [bomImportWarnings, setBomImportWarnings] = useState([])
  const [bomImportSourceRows, setBomImportSourceRows] = useState([])
  const [bomImportReplace, setBomImportReplace] = useState(false)
  const [bomSearchQuery, setBomSearchQuery] = useState("")
  const [bomVisibleFields, setBomVisibleFields] = useState([])
  const [bomFilters, setBomFilters] = useState({})
  const [bomExpandedKeys, setBomExpandedKeys] = useState([])
  const [bomItemModalOpen, setBomItemModalOpen] = useState(false)
  const [bomItemSaving, setBomItemSaving] = useState(false)
  const [editingBomItem, setEditingBomItem] = useState(null)
  const [reuseBomSource, setReuseBomSource] = useState(null)
  const [crossModelBomSource, setCrossModelBomSource] = useState(null)
  const [crossModelBomRows, setCrossModelBomRows] = useState([])
  const [crossModelBomLoading, setCrossModelBomLoading] = useState(false)
  const [crossModelBomSaving, setCrossModelBomSaving] = useState(false)
  const [bomItemCardOpen, setBomItemCardOpen] = useState(false)
  const [selectedBomItem, setSelectedBomItem] = useState(null)
  const [bomPositionDetails, setBomPositionDetails] = useState(null)
  const [bomPositionDetailsLoading, setBomPositionDetailsLoading] = useState(false)
  const [bomWarehouseDetails, setBomWarehouseDetails] = useState(null)
  const [bomWarehouseDetailsLoading, setBomWarehouseDetailsLoading] = useState(false)
  const [bomWarehouseAction, setBomWarehouseAction] = useState(null)
  const [bomWarehouseActionSaving, setBomWarehouseActionSaving] = useState(false)
  const [bomCardActiveTab, setBomCardActiveTab] = useState("main")
  const [bomCardSaving, setBomCardSaving] = useState(false)
  const [bomCardPhotoUploading, setBomCardPhotoUploading] = useState(false)
  const [bomMaterialModalOpen, setBomMaterialModalOpen] = useState(false)
  const [editingBomMaterial, setEditingBomMaterial] = useState(null)
  const [bomMaterialOptions, setBomMaterialOptions] = useState([])
  const [bomMaterialOptionsLoading, setBomMaterialOptionsLoading] = useState(false)
  const [catalogPositionOptions, setCatalogPositionOptions] = useState([])
  const [catalogPositionsLoading, setCatalogPositionsLoading] = useState(false)
  const [catalogPositionUsage, setCatalogPositionUsage] = useState([])
  const [catalogPositionUsageLoading, setCatalogPositionUsageLoading] = useState(false)
  const [nodeCardImageUrl, setNodeCardImageUrl] = useState("")
  const [nodeCardImageUploading, setNodeCardImageUploading] = useState(false)
  const [nsiSearchQuery, setNsiSearchQuery] = useState("")
  const [nsiSearchRows, setNsiSearchRows] = useState([])
  const [nsiSearchLoading, setNsiSearchLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [modelModalOpen, setModelModalOpen] = useState(false)
  const [moveModelOpen, setMoveModelOpen] = useState(false)
  const [manufacturerModalOpen, setManufacturerModalOpen] = useState(false)
  const [manufacturers, setManufacturers] = useState([])
  const [modelSaving, setModelSaving] = useState(false)
  const [moveModelSaving, setMoveModelSaving] = useState(false)
  const [manufacturerSaving, setManufacturerSaving] = useState(false)
  const [movingModel, setMovingModel] = useState(null)
  const [moveTargetNodeId, setMoveTargetNodeId] = useState(null)
  const [editingNode, setEditingNode] = useState(null)
  const [parentForCreate, setParentForCreate] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [selectedTreeKey, setSelectedTreeKey] = useState(null)
  const [selectedTreeEntity, setSelectedTreeEntity] = useState({ type: "node", id: null })
  const [form] = Form.useForm()
  const nodeCardKind = Form.useWatch("card_kind", form)
  const [modelForm] = Form.useForm()
  const [manufacturerForm] = Form.useForm()
  const [attributeForm] = Form.useForm()
  const [modelAttributesForm] = Form.useForm()
  const [modelDetailsForm] = Form.useForm()
  const [unitForm] = Form.useForm()
  const [unitAttributesForm] = Form.useForm()
  const [unitBomOverrideForm] = Form.useForm()
  const [bomItemForm] = Form.useForm()
  const [bomCrossModelForm] = Form.useForm()
  const [bomCardForm] = Form.useForm()
  const [bomMaterialForm] = Form.useForm()
  const [bomWarehouseActionForm] = Form.useForm()
  const bomLinkClassifier = Form.useWatch("link_classifier", bomItemForm)
  const bomLinkedCatalogPositionId = Form.useWatch("catalog_position_id", bomItemForm)
  const bomCrossModelTargetId = Form.useWatch("target_model_id", bomCrossModelForm)
  const selectableCatalogPositionOptions = useMemo(() => {
    const currentItemId = Number(editingBomItem?.id || 0)
    return catalogPositionOptions.filter((row) => {
      if (row.source_kind !== "model_bom") return true
      return Number(row.source_bom_item_id || 0) !== currentItemId
    })
  }, [catalogPositionOptions, editingBomItem?.id])
  const selectedBomLinkCatalogPosition = useMemo(
    () =>
      selectableCatalogPositionOptions.find(
        (row) => Number(row.id) === Number(bomLinkedCatalogPositionId),
      ) || null,
    [bomLinkedCatalogPositionId, selectableCatalogPositionOptions],
  )
  const selectedBomLinkCatalogPositionPreview = useMemo(() => {
    if (!selectedBomLinkCatalogPosition) return null
    const meta = getBomRowCardMeta(selectedBomLinkCatalogPosition)
    const dimensions = getBomRowDimensionsText(selectedBomLinkCatalogPosition, dimensionUnitSymbol)
    const tnvedCode =
      selectedBomLinkCatalogPosition.catalog_position_tnved_code ||
      selectedBomLinkCatalogPosition.tnved_code ||
      selectedBomLinkCatalogPosition.tnved?.code ||
      meta.tnved_code
    return {
      title:
        [
          selectedBomLinkCatalogPosition.manufacturer_part_number ||
            selectedBomLinkCatalogPosition.position_code,
          selectedBomLinkCatalogPosition.display_name,
        ]
          .filter(Boolean)
          .join(" — ") || `Позиция #${selectedBomLinkCatalogPosition.id}`,
      context:
        [
          selectedBomLinkCatalogPosition.manufacturer_name,
          selectedBomLinkCatalogPosition.model_name,
          selectedBomLinkCatalogPosition.classifier_node_name,
        ]
          .filter(Boolean)
          .join(" / ") || "Общий каталог",
      weight: formatNullableNumber(getBomRowWeight(selectedBomLinkCatalogPosition), "кг"),
      dimensions,
      uom:
        selectedBomLinkCatalogPosition.uom ||
        selectedBomLinkCatalogPosition.catalog_position_uom ||
        "—",
      tnved:
        [tnvedCode, selectedBomLinkCatalogPosition.tnved_description || meta.tnved_description]
          .filter(Boolean)
          .join(" — ") || "—",
      description:
        selectedBomLinkCatalogPosition.catalog_position_description ||
        selectedBomLinkCatalogPosition.description ||
        meta.description ||
        "—",
    }
  }, [dimensionUnitSymbol, selectedBomLinkCatalogPosition])
  const [nsiSearchActive, setNsiSearchActive] = useState(false)
  const [manufacturerFilter, setManufacturerFilter] = useState(null)
  const [branchSectionFilter, setBranchSectionFilter] = useState(null)
  const [branchSubsectionsOpen, setBranchSubsectionsOpen] = useState(false)
  const [classifierTreeWidth, setClassifierTreeWidth] = useState(() => {
    if (typeof window === "undefined") return 300
    const saved = Number(window.localStorage.getItem("equipmentClassifier.treeWidth"))
    return Number.isFinite(saved) && saved >= 240 && saved <= 520 ? saved : 300
  })
  const [filtersPanelOpen, setFiltersPanelOpen] = useState(() => {
    if (typeof window === "undefined") return false
    return window.localStorage.getItem("equipmentClassifier.filtersOpen") === "1"
  })

  const loadTree = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await axios.get("/equipment-classifier-nodes", {
        params: { tree: 1, limit: 5000 },
      })
      setTreeRows(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("GET /equipment-classifier-nodes error:", err)
      message.error(err?.response?.data?.message || "Не удалось загрузить классификатор")
    } finally {
      setLoading(false)
    }
  }, [])

  const loadTreeInventory = useCallback(async () => {
    try {
      const [modelsResult, unitsResult] = await Promise.all([
        axios.get("/equipment-models"),
        axios.get("/client-equipment-units", { params: { limit: 1000 } }),
      ])
      setAllModels(Array.isArray(modelsResult.data) ? modelsResult.data : [])
      setAllUnits(Array.isArray(unitsResult.data) ? unitsResult.data : [])
    } catch (err) {
      console.error("load classifier tree inventory error:", err)
      setAllModels([])
      setAllUnits([])
    }
  }, [])

  const loadClients = useCallback(async () => {
    try {
      const { data } = await axios.get("/clients", { params: { limit: 1000 } })
      setClients(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("GET /clients error:", err)
      message.error(err?.response?.data?.message || "Не удалось загрузить клиентов")
      setClients([])
    }
  }, [])

  const loadClassifierFavorites = useCallback(async () => {
    try {
      const { data } = await axios.get("/user-ui-settings", {
        params: { scope: CLASSIFIER_UI_SCOPE, key: CLASSIFIER_FAVORITES_KEY },
      })
      const value = data?.value_json
      const rawItems = Array.isArray(value?.items) ? value.items : Array.isArray(value) ? value : []
      const nextKeys = rawItems
        .map((item) => {
          if (typeof item === "string") return item
          if (item?.type && item?.id) return `${item.type}:${item.id}`
          return null
        })
        .filter(Boolean)
      setClassifierFavoriteKeys([...new Set(nextKeys)])
    } catch (err) {
      console.warn("Failed to load classifier favorites", err?.message || err)
      setClassifierFavoriteKeys([])
    }
  }, [])

  useEffect(() => {
    loadTree()
    loadTreeInventory()
    loadClients()
    loadClassifierFavorites()
  }, [loadClassifierFavorites, loadClients, loadTree, loadTreeInventory])

  const loadWorkspace = useCallback(async (nodeId) => {
    if (!nodeId) {
      setWorkspace(null)
      return
    }
    setWorkspaceLoading(true)
    try {
      const { data } = await axios.get(`/equipment-classifier-nodes/${nodeId}/workspace`)
      setWorkspace(data || null)
    } catch (err) {
      console.error("GET /equipment-classifier-nodes/:id/workspace error:", err)
      message.error(err?.response?.data?.message || "Не удалось загрузить выбранный раздел")
      setWorkspace(null)
    } finally {
      setWorkspaceLoading(false)
    }
  }, [])

  const loadAttributes = useCallback(async (nodeId) => {
    if (!nodeId) {
      setAttributes([])
      return
    }
    setAttributesLoading(true)
    try {
      const { data } = await axios.get(`/equipment-classifier-nodes/${nodeId}/attributes`)
      setAttributes(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("GET /equipment-classifier-nodes/:id/attributes error:", err)
      message.error(err?.response?.data?.message || "Не удалось загрузить характеристики")
      setAttributes([])
    } finally {
      setAttributesLoading(false)
    }
  }, [])

  const loadManufacturers = useCallback(async () => {
    try {
      const { data } = await axios.get("/equipment-manufacturers")
      setManufacturers(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("GET /equipment-manufacturers error:", err)
      message.error("Не удалось загрузить производителей")
    }
  }, [])

  const loadModelMedia = useCallback(async (modelId) => {
    if (!modelId) {
      setModelMedia([])
      return
    }
    setModelMediaLoading(true)
    try {
      const { data } = await axios.get(`/equipment-models/${modelId}/media`)
      setModelMedia(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("GET /equipment-models/:id/media error:", err)
      message.error(err?.response?.data?.message || "Не удалось загрузить фото модели")
      setModelMedia([])
    } finally {
      setModelMediaLoading(false)
    }
  }, [])

  const loadModelDocuments = useCallback(async (modelId) => {
    if (!modelId) {
      setModelDocuments([])
      return
    }
    setModelDocumentsLoading(true)
    try {
      const { data } = await axios.get(`/equipment-models/${modelId}/documents`)
      setModelDocuments(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("GET /equipment-models/:id/documents error:", err)
      message.error(err?.response?.data?.message || "Не удалось загрузить документы модели")
      setModelDocuments([])
    } finally {
      setModelDocumentsLoading(false)
    }
  }, [])

  const loadModelBom = useCallback(async (modelId) => {
    if (!modelId) {
      setModelBomItems([])
      return
    }
    setModelBomLoading(true)
    try {
      const { data } = await axios.get(`/equipment-models/${modelId}/bom`)
      setModelBomItems(Array.isArray(data?.items) ? data.items : [])
    } catch (err) {
      console.error("GET /equipment-models/:id/bom error:", err)
      message.error(err?.response?.data?.message || "Не удалось загрузить BOM модели")
      setModelBomItems([])
    } finally {
      setModelBomLoading(false)
    }
  }, [])

  const loadCrossModelBomRows = useCallback(async (modelId) => {
    if (!modelId) {
      setCrossModelBomRows([])
      return
    }
    setCrossModelBomLoading(true)
    try {
      const { data } = await axios.get(`/equipment-models/${modelId}/bom`)
      setCrossModelBomRows(flattenBomTreeRows(buildBomTree(Array.isArray(data?.items) ? data.items : [])))
    } catch (err) {
      console.error("GET target /equipment-models/:id/bom error:", err)
      message.error(err?.response?.data?.message || "Не удалось загрузить BOM выбранной модели")
      setCrossModelBomRows([])
    } finally {
      setCrossModelBomLoading(false)
    }
  }, [])

  const loadModelClientExecutions = useCallback(async (modelId) => {
    if (!modelId) {
      setModelClientExecutions([])
      return
    }
    setModelClientExecutionsLoading(true)
    try {
      const { data } = await axios.get(`/equipment-models/${modelId}/client-executions`)
      setModelClientExecutions(Array.isArray(data?.rows) ? data.rows : [])
    } catch (err) {
      console.error("GET /equipment-models/:id/client-executions error:", err)
      message.error(err?.response?.data?.message || "Не удалось загрузить клиентские исполнения")
      setModelClientExecutions([])
    } finally {
      setModelClientExecutionsLoading(false)
    }
  }, [])

  const loadCatalogPositions = useCallback(async (query = "") => {
    setCatalogPositionsLoading(true)
    try {
      const { data } = await axios.get("/catalog-positions", {
        params: {
          q: query || undefined,
          limit: 100,
        },
      })
      setCatalogPositionOptions(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("GET /catalog-positions error:", err)
      message.error(err?.response?.data?.message || "Не удалось загрузить позиции классификатора")
    } finally {
      setCatalogPositionsLoading(false)
    }
  }, [])

  const loadCatalogPositionUsage = useCallback(async (positionId) => {
    if (!positionId) {
      setCatalogPositionUsage([])
      return
    }
    setCatalogPositionUsageLoading(true)
    try {
      const { data } = await axios.get(`/catalog-positions/${positionId}/usage`)
      setCatalogPositionUsage(Array.isArray(data?.rows) ? data.rows : [])
    } catch (err) {
      console.error("GET /catalog-positions/:id/usage error:", err)
      message.error(err?.response?.data?.message || "Не удалось загрузить применяемость карточки товара")
      setCatalogPositionUsage([])
    } finally {
      setCatalogPositionUsageLoading(false)
    }
  }, [])

  const handleNsiSearch = useCallback(async (value) => {
    const q = String(value || "").trim()
    setNsiSearchQuery(q)
    if (q.length < 2) {
      setNsiSearchActive(false)
      setNsiSearchRows([])
      return
    }
    setNsiSearchActive(true)
    setNsiSearchLoading(true)
    try {
      const { data } = await axios.get("/equipment-classifier-nodes/search", {
        params: { q, limit: 80 },
      })
      setNsiSearchRows(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("GET /equipment-classifier-nodes/search error:", err)
      message.error(err?.response?.data?.message || "Не удалось выполнить поиск по классификатору")
    } finally {
      setNsiSearchLoading(false)
    }
  }, [])

  const openSearchResult = useCallback(async (row) => {
    if (!row) return
    setNsiSearchActive(false)
    if (row.entity_type === "client_part" && row.client_id) {
      navigate(`/clients/${row.client_id}`)
      return
    }
    if (row.entity_type === "equipment_model" && row.classifier_node_id && row.entity_id) {
      const nodeId = String(row.classifier_node_id)
      setSelectedId(nodeId)
      setSelectedTreeKey(treeKey.node(nodeId))
      setSelectedTreeEntity({ type: "model", id: Number(row.entity_id) })
      await loadWorkspace(nodeId)
      return
    }
    if (row.entity_type === "catalog_position" && row.classifier_node_id && row.entity_id) {
      const nodeId = String(row.classifier_node_id)
      setSelectedId(nodeId)
      setSelectedTreeKey(treeKey.catalogPosition(row.entity_id))
      setSelectedTreeEntity({ type: "catalog_position", id: Number(row.entity_id) })
      await loadWorkspace(nodeId)
      return
    }
    if (row.entity_type === "client_equipment_unit" && row.classifier_node_id && row.entity_id) {
      const nodeId = String(row.classifier_node_id)
      setSelectedId(nodeId)
      setSelectedTreeKey(treeKey.node(nodeId))
      setSelectedTreeEntity({ type: "unit", id: Number(row.entity_id) })
      await loadWorkspace(nodeId)
      return
    }
    if (row.entity_type === "client_equipment_unit" && row.client_id) {
      navigate(`/clients/${row.client_id}`)
      return
    }
    if (row.classifier_node_id) {
      const nodeId = String(row.classifier_node_id)
      setSelectedId(nodeId)
      setSelectedTreeKey(treeKey.node(nodeId))
      setSelectedTreeEntity({ type: "node", id: Number(nodeId) })
      await loadWorkspace(nodeId)
      return
    }
    if (row.entity_type === "classifier_node" && row.entity_id) {
      const nodeId = String(row.entity_id)
      setSelectedId(nodeId)
      setSelectedTreeKey(treeKey.node(nodeId))
      setSelectedTreeEntity({ type: "node", id: Number(nodeId) })
      await loadWorkspace(nodeId)
    }
  }, [loadWorkspace, navigate])

  useEffect(() => {
    if (selectedId) {
      loadWorkspace(selectedId)
      loadAttributes(selectedId)
    } else {
      setWorkspace(null)
      setAttributes([])
    }
  }, [selectedId, loadAttributes, loadWorkspace])

  useEffect(() => {
    setAttributeFilters({})
    setManufacturerFilter(null)
    setBranchSectionFilter(null)
  }, [selectedId])

  const nodeMap = useMemo(() => flattenTree(treeRows), [treeRows])
  const selectedNode = selectedId ? nodeMap.get(Number(selectedId)) || null : null
  const selectedNodeChildren = Array.isArray(selectedNode?.children) ? selectedNode.children : []
  const selectedNodeIsLeaf = !!selectedNode && selectedNodeChildren.length === 0
  const selectedBranchNodeIds = useMemo(() => {
    if (!selectedNode) return []
    const ids = []
    const walk = (node) => {
      if (!node?.id) return
      ids.push(Number(node.id))
      ;(node.children || []).forEach(walk)
    }
    walk(selectedNode)
    return ids
  }, [selectedNode])
  const selectedBranchNodeIdSet = useMemo(
    () => new Set(selectedBranchNodeIds.map((id) => Number(id))),
    [selectedBranchNodeIds],
  )
  const getNodePathLabel = useCallback(
    (nodeId) => {
      const node = nodeMap.get(Number(nodeId))
      if (!node) return ""
      const path = []
      let current = node
      const guard = new Set()
      while (current?.id && !guard.has(Number(current.id))) {
        guard.add(Number(current.id))
        path.unshift(current.name)
        current = current.parent_id ? nodeMap.get(Number(current.parent_id)) : null
      }
      return path.join(" / ")
    },
    [nodeMap],
  )
  const selectedNodePath = useMemo(() => {
    if (!selectedNode) return []
    const path = []
    let current = selectedNode
    const guard = new Set()
    while (current?.id && !guard.has(Number(current.id))) {
      guard.add(Number(current.id))
      path.unshift(current)
      current = current.parent_id ? nodeMap.get(Number(current.parent_id)) : null
    }
    return path
  }, [nodeMap, selectedNode])
  const selectClassifierNode = useCallback((node) => {
    if (!node?.id) return
    setNsiSearchActive(false)
    setSelectedId(String(node.id))
    setSelectedTreeKey(treeKey.node(node.id))
    setSelectedTreeEntity({ type: "node", id: Number(node.id) })
  }, [])
  const selectedModelFromTree = useMemo(() => {
    if (selectedTreeEntity.type !== "model" || !selectedTreeEntity.id) return null
    return allModels.find((model) => Number(model.id) === Number(selectedTreeEntity.id)) || null
  }, [allModels, selectedTreeEntity])

  const selectedUnitFromTree = useMemo(() => {
    if (selectedTreeEntity.type !== "unit" || !selectedTreeEntity.id) return null
    return allUnits.find((unit) => Number(unit.id) === Number(selectedTreeEntity.id)) || null
  }, [allUnits, selectedTreeEntity])

  const selectedManufacturerFromTree = useMemo(() => {
    if (selectedTreeEntity.type !== "manufacturer" || !selectedTreeEntity.id) return null
    const manufacturerId = Number(selectedTreeEntity.id)
    return {
      id: manufacturerId,
      name:
        allModels.find((model) => Number(model.manufacturer_id) === manufacturerId)?.manufacturer_name ||
        "Производитель",
    }
  }, [allModels, selectedTreeEntity])

  const measurementUnitLabelByCode = useMemo(
    () => new Map(measurementUnitOptions.map((option) => [String(option.value), option.label])),
    [measurementUnitOptions]
  )
  const clientOptions = useMemo(
    () =>
      clients.map((client) => ({
        value: client.id,
        label: client.company_name || `Клиент #${client.id}`,
      })),
    [clients],
  )

  const formatMeasurementUnit = useCallback(
    (unit) => {
      if (!unit) return ""
      return measurementUnitLabelByCode.get(String(unit)) || unit
    },
    [measurementUnitLabelByCode]
  )
  const formatMeasurementUnitShort = useCallback(
    (unit) => {
      const label = formatMeasurementUnit(unit)
      return label.split(" · ")[0] || label
    },
    [formatMeasurementUnit]
  )

  const normalizeCardKind = useCallback((value) => {
    const kind = String(value || "auto").trim() || "auto"
    return CARD_KIND_LABELS[kind] ? kind : "auto"
  }, [])

  const isInheritedCardKind = useCallback((value) => {
    const kind = normalizeCardKind(value)
    return kind === "auto" || kind === "mixed"
  }, [normalizeCardKind])

  const getEffectiveCardKindInfo = useCallback((node) => {
    if (!node) {
      return { kind: "auto", sourceNode: null, isInherited: false, directKind: "auto" }
    }
    const path = []
    let current = node
    const guard = new Set()
    while (current?.id && !guard.has(Number(current.id))) {
      guard.add(Number(current.id))
      path.unshift(current)
      current = current.parent_id ? nodeMap.get(Number(current.parent_id)) : null
    }
    for (let index = path.length - 1; index >= 0; index -= 1) {
      const candidate = path[index]
      const candidateKind = normalizeCardKind(candidate.card_kind)
      if (!isInheritedCardKind(candidateKind)) {
        return {
          kind: candidateKind,
          sourceNode: candidate,
          isInherited: Number(candidate.id) !== Number(node.id),
          directKind: normalizeCardKind(node.card_kind),
        }
      }
    }
    return {
      kind: "auto",
      sourceNode: null,
      isInherited: false,
      directKind: normalizeCardKind(node.card_kind),
    }
  }, [isInheritedCardKind, nodeMap, normalizeCardKind])

  const getCardKindDescription = useCallback((kind) => {
    if (kind === "equipment_model") {
      return "В этой ветке основные карточки — модели оборудования: паспорт, BOM, машины клиентов и клиентские исполнения."
    }
    if (kind === "catalog_position") {
      return "В этой ветке основные карточки — товары/номенклатура: паспорт, характеристики и где используется в BOM."
    }
    return "Раздел работает как папка или наследует тип от родителя. Если это верхняя ветка, задайте ей основной тип."
  }, [])

  const renderCardKindTag = useCallback((node, { compact = false } = {}) => {
    const { kind } = getEffectiveCardKindInfo(node)
    if (compact && kind === "auto") return null
    return (
      <Tag color={CARD_KIND_COLORS[kind] || "default"} style={compact ? { marginInlineEnd: 0 } : undefined}>
        {CARD_KIND_LABELS[kind] || CARD_KIND_LABELS.auto}
      </Tag>
    )
  }, [getEffectiveCardKindInfo])

  const selectedCardKindInfo = useMemo(
    () => getEffectiveCardKindInfo(selectedNode),
    [getEffectiveCardKindInfo, selectedNode],
  )
  const selectedEffectiveCardKind = selectedCardKindInfo.kind

  const saveClassifierFavorites = useCallback(async (nextKeys) => {
    try {
      await axios.put("/user-ui-settings", {
        scope: CLASSIFIER_UI_SCOPE,
        key: CLASSIFIER_FAVORITES_KEY,
        value_json: {
          version: 1,
          items: nextKeys.map((key) => {
            const parsed = parseTreeKey(key)
            return { type: parsed.type, id: parsed.id, key }
          }),
        },
      })
    } catch (err) {
      console.warn("Failed to save classifier favorites", err?.message || err)
      message.warning("Не удалось сохранить избранное")
    }
  }, [])

  const toggleClassifierFavorite = useCallback(
    (key) => {
      if (!key) return
      setClassifierFavoriteKeys((current) => {
        const exists = current.includes(key)
        const next = exists ? current.filter((item) => item !== key) : [...current, key]
        saveClassifierFavorites(next)
        return next
      })
    },
    [saveClassifierFavorites],
  )

  const attributeUnitOptions = useMemo(() => {
    const seen = new Set(measurementUnitOptions.map((option) => String(option.value)))
    const extra = attributes
      .map((attribute) => attribute.unit)
      .filter(Boolean)
      .filter((unit) => {
        const key = String(unit)
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .map((unit) => ({ value: unit, label: unit }))
    return [...measurementUnitOptions, ...extra]
  }, [attributes, measurementUnitOptions])

  const treeData = useMemo(() => {
    const favoriteSet = new Set(classifierFavoriteKeys)
    const build = (nodes) =>
      [...(nodes || [])]
        .sort((a, b) => {
          const aFavorite = favoriteSet.has(treeKey.node(a?.id))
          const bFavorite = favoriteSet.has(treeKey.node(b?.id))
          if (aFavorite !== bFavorite) return aFavorite ? -1 : 1
          return compareClassifierNames(a?.name, b?.name)
        })
        .map((node) => {
          const key = treeKey.node(node.id)
          const isFavorite = favoriteSet.has(key)
          return {
            key,
            title: (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  minWidth: 0,
                }}
              >
                <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{node.name}</span>
                <Button
                  type="text"
                  size="small"
                  icon={isFavorite ? <StarFilled style={{ color: "#faad14" }} /> : <StarOutlined />}
                  title={isFavorite ? "Убрать из избранного" : "Добавить в избранное"}
                  aria-label={isFavorite ? "Убрать из избранного" : "Добавить в избранное"}
                  onClick={(event) => {
                    event.stopPropagation()
                    toggleClassifierFavorite(key)
                  }}
                  style={{ flex: "0 0 auto" }}
                />
              </div>
            ),
            children: build(node.children || []),
          }
        })

    return build(treeRows)
  }, [classifierFavoriteKeys, toggleClassifierFavorite, treeRows])

  const plainTreeData = useMemo(() => {
    const build = (nodes) =>
      [...(nodes || [])]
        .sort((a, b) => compareClassifierNames(a?.name, b?.name))
        .map((node) => ({
          key: treeKey.node(node.id),
          title: node.name,
          children: build(node.children || []),
        }))

    return build(treeRows)
  }, [treeRows])

  const getDefaultNodeType = (parent) => {
    if (!parent) return "ROOT"
    if (parent.node_type === "ROOT") return "CATEGORY"
    if (parent.node_type === "CATEGORY") return "SUBCATEGORY"
    return "EQUIPMENT_TYPE"
  }

  const openCreateRoot = () => {
    setEditingNode(null)
    setParentForCreate(null)
    setNodeCardImageUrl("")
    form.setFieldsValue({ ...EMPTY_FORM })
    setModalOpen(true)
  }

  const openCreateChild = () => {
    if (!selectedNode) {
      message.warning("Сначала выберите родительский раздел")
      return
    }
    setEditingNode(null)
    setParentForCreate(selectedNode)
    setNodeCardImageUrl("")
    form.setFieldsValue({ ...EMPTY_FORM, card_kind: "auto" })
    setModalOpen(true)
  }

  const openEditNode = (node) => {
    if (!node) {
      message.warning("Сначала выберите раздел")
      return
    }
    setParentForCreate(null)
    setEditingNode(node)
    setNodeCardImageUrl(node.card_image_url || "")
    form.setFieldsValue({
      name: node.name || "",
      notes: node.notes || "",
      card_kind: node.card_kind || "auto",
    })
    setModalOpen(true)
  }

  const openEdit = () => openEditNode(selectedNode)

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const payload = {
        parent_id: editingNode ? editingNode.parent_id : parentForCreate?.id || null,
        name: values.name,
        code: editingNode ? editingNode.code || null : null,
        node_type: editingNode?.node_type || getDefaultNodeType(parentForCreate),
        sort_order: editingNode ? editingNode.sort_order || 0 : 0,
        is_active: editingNode ? (editingNode.is_active ? 1 : 0) : 1,
        notes: values.notes || null,
        card_kind: values.card_kind || "auto",
        card_image_url: nodeCardImageUrl || null,
      }

      setSaving(true)
      if (editingNode?.id) {
        await axios.put(`/equipment-classifier-nodes/${editingNode.id}`, payload)
        message.success("Раздел классификатора обновлён")
      } else {
        await axios.post("/equipment-classifier-nodes", payload)
        message.success("Раздел классификатора создан")
      }
      setModalOpen(false)
      await loadTree()
    } catch (err) {
      if (err?.errorFields) return
      console.error("save equipment classifier node error:", err)
      message.error(err?.response?.data?.message || "Не удалось сохранить раздел классификатора")
    } finally {
      setSaving(false)
    }
  }

  const handleUploadNodeCardImage = async ({ file, onSuccess, onError }) => {
    if (!editingNode?.id) {
      message.warning("Сначала сохраните раздел")
      onError?.(new Error("node not saved"))
      return
    }
    const formData = new FormData()
    formData.append("file", file)
    setNodeCardImageUploading(true)
    try {
      const { data } = await axios.post(`/equipment-classifier-nodes/${editingNode.id}/card-image`, formData)
      setNodeCardImageUrl(data?.card_image_url || "")
      message.success("Фото карточки загружено")
      onSuccess?.(data)
      await loadTree()
    } catch (err) {
      console.error("POST /equipment-classifier-nodes/:id/card-image error:", err)
      message.error(err?.response?.data?.message || "Не удалось загрузить фото карточки")
      onError?.(err)
    } finally {
      setNodeCardImageUploading(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedNode?.id) return
    try {
      const result = await runTrashDeleteFlow({
        entityType: "equipment_classifier_nodes",
        entityId: selectedNode.id,
        deleteUrl: `/equipment-classifier-nodes/${selectedNode.id}`,
        successMessage: "Раздел классификатора перемещён в корзину",
      })
      if (!result?.deleted) return
      setSelectedId(null)
      await loadTree()
    } catch (err) {
      console.error("delete equipment classifier node error:", err)
      message.error(err?.response?.data?.message || "Не удалось удалить раздел классификатора")
    }
  }

  const openCreateModel = () => {
    if (!selectedNode) {
      message.warning("Сначала выберите раздел классификатора")
      return
    }
    if (!selectedNodeIsLeaf) {
      message.warning("Модели создаются только в нижнем разделе без подразделов")
      return
    }
    modelForm.resetFields()
    if (selectedTreeEntity.type === "manufacturer" && selectedTreeEntity.id) {
      modelForm.setFieldsValue({ manufacturer_id: selectedTreeEntity.id })
    }
    loadManufacturers()
    setModelModalOpen(true)
  }

  const openCreateManufacturer = () => {
    manufacturerForm.resetFields()
    setManufacturerModalOpen(true)
  }

  const handleCreateModel = async () => {
    if (!selectedNode) return
    try {
      const values = await modelForm.validateFields()
      setModelSaving(true)
      await axios.post("/equipment-models", {
        source: "classifier",
        manufacturer_id: values.manufacturer_id,
        model_name: values.model_name,
        classifier_node_id: selectedNode.id,
        notes: values.notes || null,
      })
      message.success("Модель создана в выбранном разделе")
      setModelModalOpen(false)
      await loadWorkspace(selectedNode.id)
    } catch (err) {
      if (err?.errorFields) return
      console.error("POST /equipment-models error:", err)
      message.error(err?.response?.data?.message || "Не удалось создать модель")
    } finally {
      setModelSaving(false)
    }
  }

  const openMoveModel = (row) => {
    setMovingModel(row || null)
    setMoveTargetNodeId(row?.classifier_node_id ? Number(row.classifier_node_id) : null)
    setMoveModelOpen(true)
  }

  const handleMoveModel = async () => {
    if (!movingModel?.id) return
    if (!moveTargetNodeId) {
      message.warning("Выберите целевой раздел классификатора")
      return
    }
    if (Number(moveTargetNodeId) === Number(movingModel.classifier_node_id)) {
      setMoveModelOpen(false)
      return
    }
    setMoveModelSaving(true)
    try {
      await axios.put(`/equipment-models/${movingModel.id}`, {
        classifier_node_id: moveTargetNodeId,
      })
      message.success("Модель перенесена")
      setMoveModelOpen(false)
      setMovingModel(null)
      setMoveTargetNodeId(null)
      await loadTree()
      await loadTreeInventory()
      if (selectedId) await loadWorkspace(selectedId)
    } catch (err) {
      console.error("PUT /equipment-models/:id classifier_node_id error:", err)
      message.error(err?.response?.data?.message || "Не удалось перенести модель")
    } finally {
      setMoveModelSaving(false)
    }
  }

  const handleCreateManufacturer = async () => {
    try {
      const values = await manufacturerForm.validateFields()
      setManufacturerSaving(true)
      const { data } = await axios.post("/equipment-manufacturers", {
        source: "classifier",
        name: values.name,
        country: values.country || null,
        website: values.website || null,
        notes: values.notes || null,
      })
      message.success("Производитель создан")
      await loadManufacturers()
      if (data?.id) {
        modelForm.setFieldsValue({ manufacturer_id: data.id })
      }
      setManufacturerModalOpen(false)
    } catch (err) {
      if (err?.errorFields) return
      console.error("POST /equipment-manufacturers error:", err)
      message.error(err?.response?.data?.message || "Не удалось создать производителя")
    } finally {
      setManufacturerSaving(false)
    }
  }

  const parseAttributeOptions = (value) =>
    String(value || "")
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean)
      .map((label) => ({ value_label: label }))

  const openCreateAttribute = () => {
    if (!selectedNode) {
      message.warning("Сначала выберите раздел классификатора")
      return
    }
    if (!selectedNodeIsLeaf) {
      message.warning("Характеристики задаются только для нижнего раздела")
      return
    }
    setEditingAttribute(null)
    attributeForm.setFieldsValue({
      label: "",
      value_type: "number",
      unit: "",
      sort_order: (attributes || []).length * 10 + 10,
      is_required: false,
      is_filterable: true,
      help_text: "",
      options_text: "",
    })
    setAttributeEditorMode("create")
  }

  const openManageAttributes = () => {
    if (!selectedNode) {
      message.warning("Сначала выберите раздел классификатора")
      return
    }
    if (!selectedNodeIsLeaf) {
      message.warning("Характеристики задаются только для нижнего раздела")
      return
    }
    setEditingAttribute(null)
    setAttributeEditorMode(null)
    setAttributeManagerOpen(true)
  }

  const openEditAttribute = (row) => {
    if (!row?.id) return
    setEditingAttribute(row)
    attributeForm.setFieldsValue({
      label: row.label || "",
      value_type: row.value_type || "number",
      unit: row.unit || "",
      sort_order: row.sort_order || 0,
      is_required: !!row.is_required,
      is_filterable: !!row.is_filterable,
      help_text: row.help_text || "",
      options_text: (row.options || []).map((option) => option.value_label).join("\n"),
    })
    setAttributeEditorMode("edit")
  }

  const handleSaveAttribute = async () => {
    if (!selectedNode || !attributeEditorMode) return
    try {
      const values = await attributeForm.validateFields()
      const payload = {
        label: values.label,
        value_type: values.value_type || "number",
        unit: values.unit || null,
        sort_order: values.sort_order ?? 0,
        is_required: values.is_required ? 1 : 0,
        is_filterable: values.is_filterable ? 1 : 0,
        help_text: values.help_text || null,
      }
      if (["select", "multiselect"].includes(payload.value_type)) {
        payload.options = parseAttributeOptions(values.options_text)
      }

      setAttributeSaving(true)
      if (editingAttribute?.id) {
        await axios.put(`/equipment-classifier-nodes/attributes/${editingAttribute.id}`, payload)
        message.success("Характеристика обновлена")
      } else {
        await axios.post(`/equipment-classifier-nodes/${selectedNode.id}/attributes`, payload)
        message.success("Характеристика добавлена")
      }
      setEditingAttribute(null)
      setAttributeEditorMode(null)
      await loadAttributes(selectedNode.id)
      await loadWorkspace(selectedNode.id)
    } catch (err) {
      if (err?.errorFields) return
      console.error("save equipment attribute error:", err)
      message.error(err?.response?.data?.message || "Не удалось сохранить характеристику")
    } finally {
      setAttributeSaving(false)
    }
  }

  const handleDeleteAttribute = async (row) => {
    if (!row?.id || !selectedNode?.id) return
    try {
      await axios.delete(`/equipment-classifier-nodes/attributes/${row.id}`)
      message.success("Характеристика отключена")
      if (Number(editingAttribute?.id) === Number(row.id)) {
        setEditingAttribute(null)
        setAttributeEditorMode(null)
      }
      await loadAttributes(selectedNode.id)
      await loadWorkspace(selectedNode.id)
    } catch (err) {
      console.error("DELETE /equipment-classifier-nodes/attributes/:id error:", err)
      message.error(err?.response?.data?.message || "Не удалось отключить характеристику")
    }
  }

  const normalizeValueForForm = (attribute, valueRow) => {
    if (!valueRow) return undefined
    if (attribute.value_type === "number") {
      return valueRow.value_number === null || valueRow.value_number === undefined ? undefined : Number(valueRow.value_number)
    }
    if (attribute.value_type === "boolean") {
      if (valueRow.value_boolean === null || valueRow.value_boolean === undefined) return undefined
      return Number(valueRow.value_boolean) === 1
    }
    if (attribute.value_type === "date") return valueRow.value_date || undefined
    if (attribute.value_type === "multiselect") {
      try {
        return Array.isArray(valueRow.value_json) ? valueRow.value_json : JSON.parse(valueRow.value_json || "[]")
      } catch {
        return []
      }
    }
    return valueRow.value_text || undefined
  }

  const openModelAttributes = async (row) => {
    if (!selectedNode?.id || !row?.id) return
    setAttributeModel(row)
    setModelAttributesOpen(true)
    setModelAttributesLoading(true)
    try {
      const { data } = await axios.get(`/equipment-classifier-nodes/${selectedNode.id}/attribute-values`, {
        params: { entity_type: "equipment_model", entity_id: row.id },
      })
      const attrRows = Array.isArray(data?.attributes) ? data.attributes : []
      const valuesByAttrId = new Map((data?.values || []).map((item) => [Number(item.attribute_id), item]))
      setModelAttributeRows(attrRows)
      const formValues = {}
      attrRows.forEach((attribute) => {
        formValues[`attr_${attribute.id}`] = normalizeValueForForm(attribute, valuesByAttrId.get(Number(attribute.id)))
      })
      modelAttributesForm.setFieldsValue(formValues)
    } catch (err) {
      console.error("GET /equipment-classifier-nodes/:id/attribute-values error:", err)
      message.error(err?.response?.data?.message || "Не удалось загрузить значения характеристик")
      setModelAttributeRows([])
    } finally {
      setModelAttributesLoading(false)
    }
  }

  const handleSaveModelAttributes = async () => {
    if (!selectedNode?.id || !attributeModel?.id) return
    try {
      const values = await modelAttributesForm.validateFields()
      setModelAttributesSaving(true)
      await axios.put(`/equipment-classifier-nodes/${selectedNode.id}/attribute-values`, {
        entity_type: "equipment_model",
        entity_id: attributeModel.id,
        values: modelAttributeRows.map((attribute) => ({
          attribute_id: attribute.id,
          value: values[`attr_${attribute.id}`],
        })),
      })
      message.success("Характеристики модели сохранены")
      setModelAttributesOpen(false)
      await loadWorkspace(selectedNode.id)
    } catch (err) {
      if (err?.errorFields) return
      console.error("PUT /equipment-classifier-nodes/:id/attribute-values error:", err)
      message.error(err?.response?.data?.message || "Не удалось сохранить характеристики модели")
    } finally {
      setModelAttributesSaving(false)
    }
  }

  const getClassifierNodeIdForUnit = (unit = null) =>
    Number(unit?.classifier_node_id || currentModel?.classifier_node_id || selectedNode?.id || selectedId || 0) || null

  const buildAttributeFormValues = (attrRows, valuesRows) => {
    const valuesByAttrId = new Map((valuesRows || []).map((item) => [Number(item.attribute_id), item]))
    const formValues = {}
    attrRows.forEach((attribute) => {
      formValues[`attr_${attribute.id}`] = normalizeValueForForm(attribute, valuesByAttrId.get(Number(attribute.id)))
    })
    return formValues
  }

  const loadUnitAttributesForForm = async (unit, nodeId) => {
    if (!nodeId) {
      setUnitAttributeRows([])
      unitAttributesForm.resetFields()
      return
    }
    setUnitAttributesLoading(true)
    try {
      if (!unit?.id) {
        const { data } = await axios.get(`/equipment-classifier-nodes/${nodeId}/attributes`)
        const attrRows = Array.isArray(data) ? data : []
        setUnitAttributeRows(attrRows)
        unitAttributesForm.resetFields()
        return
      }
      const { data } = await axios.get(`/equipment-classifier-nodes/${nodeId}/attribute-values`, {
        params: { entity_type: "client_equipment_unit", entity_id: unit.id },
      })
      const attrRows = Array.isArray(data?.attributes) ? data.attributes : []
      setUnitAttributeRows(attrRows)
      unitAttributesForm.setFieldsValue(buildAttributeFormValues(attrRows, data?.values || []))
    } catch (err) {
      console.error("GET client unit attribute values error:", err)
      message.error(err?.response?.data?.message || "Не удалось загрузить паспортные поля машины")
      setUnitAttributeRows([])
    } finally {
      setUnitAttributesLoading(false)
    }
  }

  const loadUnitPassport = async (unit) => {
    const nodeId = getClassifierNodeIdForUnit(unit)
    if (!unit?.id || !nodeId) {
      setUnitPassportRows([])
      return
    }
    setUnitPassportLoading(true)
    try {
      const { data } = await axios.get(`/equipment-classifier-nodes/${nodeId}/attribute-values`, {
        params: { entity_type: "client_equipment_unit", entity_id: unit.id },
      })
      const attrRows = Array.isArray(data?.attributes) ? data.attributes : []
      const valuesByAttrId = new Map((data?.values || []).map((item) => [Number(item.attribute_id), item]))
      setUnitPassportRows(
        attrRows.map((attribute) => {
          const valueRow = valuesByAttrId.get(Number(attribute.id))
          const value = normalizeValueForForm(attribute, valueRow)
          const displayValue = Array.isArray(value) ? value.join(", ") : value
          return {
            ...attribute,
            display_value:
              displayValue === undefined || displayValue === null || displayValue === ""
                ? ""
                : String(displayValue),
          }
        }),
      )
    } catch (err) {
      console.error("GET client unit passport error:", err)
      message.error(err?.response?.data?.message || "Не удалось загрузить паспорт машины")
      setUnitPassportRows([])
    } finally {
      setUnitPassportLoading(false)
    }
  }

  const loadUnitBom = async (unit) => {
    if (!unit?.id) {
      setUnitBomItems([])
      return
    }
    setUnitBomLoading(true)
    try {
      const { data } = await axios.get(`/client-equipment-units/${unit.id}/bom`)
      setUnitBomItems(Array.isArray(data?.items) ? data.items : [])
    } catch (err) {
      console.error("GET client equipment unit BOM error:", err)
      message.error(err?.response?.data?.message || "Не удалось загрузить BOM машины клиента")
      setUnitBomItems([])
    } finally {
      setUnitBomLoading(false)
    }
  }

  const loadUnitClientParts = async (unit = selectedUnitFromTree, q = "") => {
    if (!unit?.client_id) {
      setUnitClientPartOptions([])
      return []
    }
    setUnitClientPartLoading(true)
    try {
      const { data } = await axios.get("/client-parts", {
        params: {
          client_id: unit.client_id,
          q: q || undefined,
          limit: 100,
        },
      })
      const rows = Array.isArray(data) ? data : []
      setUnitClientPartOptions(rows)
      return rows
    } catch (err) {
      console.error("GET /client-parts for BOM override error:", err)
      message.error(err?.response?.data?.message || "Не удалось загрузить детали клиента")
      setUnitClientPartOptions([])
      return []
    } finally {
      setUnitClientPartLoading(false)
    }
  }

  const handleSelectUnitClientPart = (clientPartId) => {
    const row = unitClientPartOptions.find((item) => Number(item.id) === Number(clientPartId))
    if (!row) return
    unitBomOverrideForm.setFieldsValue({
      client_part_id: row.id,
      client_part_number: row.client_part_number || "",
      client_drawing_number: row.drawing_number || "",
      client_revision: row.revision_code || "",
      difference_summary: unitBomOverrideForm.getFieldValue("difference_summary") || row.difference_summary || "",
    })
  }

  const getUnitBomRelationshipType = (status) => {
    if (status === "unknown_oem") return "unknown_oem"
    if (status === "replaced") return "oem_replacement"
    return "client_drawing"
  }

  const handleCreateUnitClientPartFromBom = async () => {
    if (!selectedUnitFromTree?.id || !selectedUnitFromTree?.client_id || !editingUnitBomItem?.id) return
    try {
      const values = await unitBomOverrideForm.validateFields()
      const displayName =
        values.client_part_number ||
        values.client_drawing_number ||
        getBomItemName(editingUnitBomItem) ||
        getBomItemLabel(editingUnitBomItem)
      if (!displayName) {
        message.warning("Укажите номер, чертеж или название клиентской детали")
        return
      }

      setUnitBomClientPartSaving(true)
      const { data: created } = await axios.post("/client-parts", {
        client_id: selectedUnitFromTree.client_id,
        classifier_node_id: selectedUnitFromTree.classifier_node_id || null,
        base_oem_part_id: editingUnitBomItem.oem_part_id || null,
        relationship_type: getUnitBomRelationshipType(values.status || "client_drawing"),
        client_part_number: values.client_part_number || null,
        drawing_number: values.client_drawing_number || null,
        revision_code: values.client_revision || null,
        display_name: displayName,
        description_ru: getBomItemName(editingUnitBomItem) || null,
        difference_summary: values.difference_summary || null,
        uom: editingUnitBomItem.uom || editingUnitBomItem.catalog_position_uom || "шт",
        status: "active",
        notes: values.notes || null,
      })

      if (created?.id) {
        await axios.post(`/client-parts/${created.id}/applications`, {
          client_equipment_unit_id: selectedUnitFromTree.id,
          note: `BOM: ${[editingUnitBomItem.item_no, getBomItemLabel(editingUnitBomItem)].filter(Boolean).join(" / ")}`,
        })
        const rows = await loadUnitClientParts(selectedUnitFromTree)
        if (!rows.some((row) => Number(row.id) === Number(created.id))) {
          setUnitClientPartOptions((prev) => [created, ...prev])
        }
        unitBomOverrideForm.setFieldsValue({
          client_part_id: created.id,
          client_part_number: created.client_part_number || values.client_part_number || "",
          client_drawing_number: created.drawing_number || values.client_drawing_number || "",
          client_revision: created.revision_code || values.client_revision || "",
        })
        if (selectedId) await loadWorkspace(selectedId)
        message.success("Клиентская деталь создана и привязана к машине")
      }
    } catch (err) {
      if (err?.errorFields) return
      console.error("create client part from BOM override error:", err)
      message.error(err?.response?.data?.message || "Не удалось создать деталь клиента")
    } finally {
      setUnitBomClientPartSaving(false)
    }
  }

  const loadClientPartDocuments = async (clientPartId) => {
    if (!clientPartId) {
      setClientPartDocuments([])
      return
    }
    try {
      const { data } = await axios.get(`/client-parts/${clientPartId}/documents`)
      setClientPartDocuments(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("GET /client-parts/:id/documents error:", err)
      message.error(err?.response?.data?.message || "Не удалось загрузить документы детали клиента")
      setClientPartDocuments([])
    }
  }

  const openClientPartDrawer = async (row) => {
    if (!row?.id) return
    setClientPartDrawerOpen(true)
    setClientPartDetails(row)
    setClientPartDocuments([])
    setClientPartDetailsLoading(true)
    try {
      const [{ data: details }, { data: documents }] = await Promise.all([
        axios.get(`/client-parts/${row.id}`),
        axios.get(`/client-parts/${row.id}/documents`),
      ])
      setClientPartDetails(details || row)
      setClientPartDocuments(Array.isArray(documents) ? documents : [])
    } catch (err) {
      console.error("GET client part details error:", err)
      message.error(err?.response?.data?.message || "Не удалось открыть деталь клиента")
    } finally {
      setClientPartDetailsLoading(false)
    }
  }

  const handleUploadClientPartDocument = async ({ file, onSuccess, onError }) => {
    if (!clientPartDetails?.id) {
      onError?.(new Error("Деталь клиента не выбрана"))
      return
    }
    const formData = new FormData()
    formData.append("file", file)
    setClientPartDocumentUploading(true)
    try {
      await axios.post(`/client-parts/${clientPartDetails.id}/documents`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      await loadClientPartDocuments(clientPartDetails.id)
      message.success("Документ детали клиента загружен")
      onSuccess?.()
    } catch (err) {
      console.error("POST /client-parts/:id/documents error:", err)
      message.error(err?.response?.data?.message || "Не удалось загрузить документ детали клиента")
      onError?.(err)
    } finally {
      setClientPartDocumentUploading(false)
    }
  }

  const handleDeleteClientPartDocument = async (documentId) => {
    if (!clientPartDetails?.id || !documentId) return
    try {
      await axios.delete(`/client-parts/documents/${documentId}`)
      await loadClientPartDocuments(clientPartDetails.id)
      message.success("Документ детали клиента перемещен в корзину")
    } catch (err) {
      console.error("DELETE /client-parts/documents/:documentId error:", err)
      message.error(err?.response?.data?.message || "Не удалось удалить документ детали клиента")
    }
  }

  const openUnitBomOverride = (item) => {
    if (!item?.id) return
    setEditingUnitBomItem(item)
    unitBomOverrideForm.setFieldsValue({
      status: item.override_status || "as_original",
      difference_summary: item.difference_summary || "",
      client_part_id: item.client_part_id || null,
      client_part_number: item.client_part_number || "",
      client_drawing_number: item.client_drawing_number || "",
      client_revision: item.client_revision || "",
      notes: item.override_notes || "",
    })
    loadUnitClientParts(selectedUnitFromTree)
    setUnitBomOverrideOpen(true)
  }

  const handleSaveUnitBomOverride = async () => {
    if (!selectedUnitFromTree?.id || !editingUnitBomItem?.id) return
    try {
      const values = await unitBomOverrideForm.validateFields()
      setUnitBomOverrideSaving(true)
      await axios.put(`/client-equipment-units/${selectedUnitFromTree.id}/bom/items/${editingUnitBomItem.id}/override`, {
        status: values.status || "as_original",
        difference_summary: values.difference_summary || null,
        client_part_id: values.client_part_id || null,
        client_part_number: values.client_part_number || null,
        client_drawing_number: values.client_drawing_number || null,
        client_revision: values.client_revision || null,
        notes: values.notes || null,
      })
      message.success("Отличие по строке BOM сохранено")
      setUnitBomOverrideOpen(false)
      setEditingUnitBomItem(null)
      await loadUnitBom(selectedUnitFromTree)
      if (selectedUnitFromTree?.equipment_model_id) {
        await loadModelClientExecutions(selectedUnitFromTree.equipment_model_id)
      }
    } catch (err) {
      if (err?.errorFields) return
      console.error("PUT client equipment unit BOM override error:", err)
      message.error(err?.response?.data?.message || "Не удалось сохранить отличие")
    } finally {
      setUnitBomOverrideSaving(false)
    }
  }

  const handleResetUnitBomOverride = async () => {
    if (!selectedUnitFromTree?.id || !editingUnitBomItem?.id) return
    try {
      setUnitBomOverrideSaving(true)
      await axios.delete(`/client-equipment-units/${selectedUnitFromTree.id}/bom/items/${editingUnitBomItem.id}/override`)
      message.success("Строка снова используется как в базовой модели")
      setUnitBomOverrideOpen(false)
      setEditingUnitBomItem(null)
      await loadUnitBom(selectedUnitFromTree)
    } catch (err) {
      console.error("DELETE client equipment unit BOM override error:", err)
      message.error(err?.response?.data?.message || "Не удалось сбросить отличие")
    } finally {
      setUnitBomOverrideSaving(false)
    }
  }

  const openCreateUnit = async () => {
    if (!currentModel?.id) {
      message.warning("Сначала откройте модель оборудования")
      return
    }
    setEditingUnit(null)
    unitForm.resetFields()
    unitAttributesForm.resetFields()
    unitForm.setFieldsValue({
      equipment_model_id: currentModel.id,
    })
    setUnitModalOpen(true)
    await loadClients()
    await loadUnitAttributesForForm(null, getClassifierNodeIdForUnit())
  }

  const openEditUnit = async (unit) => {
    if (!unit?.id) return
    setEditingUnit(unit)
    unitForm.setFieldsValue({
      client_id: unit.client_id || undefined,
      equipment_model_id: unit.equipment_model_id || currentModel?.id || undefined,
      serial_number: unit.serial_number || "",
      internal_name: unit.internal_name || "",
      manufacture_year: unit.manufacture_year ?? undefined,
      site_name: unit.site_name || "",
      notes: unit.notes || "",
    })
    setUnitModalOpen(true)
    await loadClients()
    await loadUnitAttributesForForm(unit, getClassifierNodeIdForUnit(unit))
  }

  const handleSaveUnit = async () => {
    if (!currentModel?.id && !editingUnit?.equipment_model_id) return
    try {
      const [unitValues, attributeValues] = await Promise.all([
        unitForm.validateFields(),
        unitAttributesForm.validateFields(),
      ])
      const modelId = editingUnit?.equipment_model_id || currentModel?.id
      const payload = {
        client_id: unitValues.client_id,
        equipment_model_id: modelId,
        serial_number: unitValues.serial_number || null,
        internal_name: unitValues.internal_name || null,
        manufacture_year: unitValues.manufacture_year ?? null,
        site_name: unitValues.site_name || null,
        commissioning_date: editingUnit?.commissioning_date || null,
        decommissioned_date: editingUnit?.decommissioned_date || null,
        status: "active",
        notes: unitValues.notes || null,
      }
      setUnitSaving(true)
      const { data } = editingUnit?.id
        ? await axios.put(`/client-equipment-units/${editingUnit.id}`, payload)
        : await axios.post("/client-equipment-units", payload)

      const savedUnit = data || editingUnit
      const nodeId = getClassifierNodeIdForUnit(savedUnit)
      if (nodeId && savedUnit?.id && unitAttributeRows.length) {
        await axios.put(`/equipment-classifier-nodes/${nodeId}/attribute-values`, {
          entity_type: "client_equipment_unit",
          entity_id: savedUnit.id,
          values: unitAttributeRows.map((attribute) => ({
            attribute_id: attribute.id,
            value: attributeValues[`attr_${attribute.id}`],
          })),
        })
      }
      message.success(editingUnit?.id ? "Машина клиента сохранена" : "Машина клиента создана")
      setUnitModalOpen(false)
      setEditingUnit(null)
      await loadTreeInventory()
      if (selectedId) await loadWorkspace(selectedId)
      if (savedUnit?.id) {
        const savedNodeId = getClassifierNodeIdForUnit(savedUnit)
        if (savedNodeId) setSelectedId(String(savedNodeId))
        setSelectedTreeKey(treeKey.unit(savedUnit.id))
        setSelectedTreeEntity({ type: "unit", id: Number(savedUnit.id) })
      }
    } catch (err) {
      if (err?.errorFields) return
      console.error("save client equipment unit error:", err)
      message.error(err?.response?.data?.message || "Не удалось сохранить машину клиента")
    } finally {
      setUnitSaving(false)
    }
  }

  const rawWorkspaceModels = Array.isArray(workspace?.models) ? workspace.models : []
  const rawWorkspaceCatalogPositions = Array.isArray(workspace?.catalog_positions) ? workspace.catalog_positions : []
  const rawWorkspaceManufacturers = Array.isArray(workspace?.manufacturers) ? workspace.manufacturers : []
  const rawWorkspaceUnits = Array.isArray(workspace?.client_equipment_units) ? workspace.client_equipment_units : []
  const rawWorkspaceClientParts = Array.isArray(workspace?.client_parts) ? workspace.client_parts : []
  const filterableAttributes = useMemo(
    () =>
      selectedNodeIsLeaf
        ? attributes.filter((attribute) => Number(attribute.is_filterable || 0) === 1)
        : [],
    [attributes, selectedNodeIsLeaf],
  )
  const hasActiveAttributeFilters = useMemo(
    () =>
      Object.values(attributeFilters).some((filter) => {
        if (!filter) return false
        if (filter.min !== undefined && filter.min !== null && filter.min !== "") return true
        if (filter.max !== undefined && filter.max !== null && filter.max !== "") return true
        if (Array.isArray(filter.value)) return filter.value.length > 0
        return filter.value !== undefined && filter.value !== null && filter.value !== ""
      }),
    [attributeFilters],
  )
  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (manufacturerFilter) count += 1
    if (branchSectionFilter) count += 1
    Object.values(attributeFilters).forEach((filter) => {
      if (!filter) return
      if (filter.min !== undefined && filter.min !== null && filter.min !== "") count += 1
      if (filter.max !== undefined && filter.max !== null && filter.max !== "") count += 1
      if (Array.isArray(filter.value) && filter.value.length) count += 1
      if (!Array.isArray(filter.value) && filter.value !== undefined && filter.value !== null && filter.value !== "") count += 1
    })
    return count
  }, [attributeFilters, branchSectionFilter, manufacturerFilter])
  const isModelBomContext = selectedTreeEntity.type === "model" && modelActiveTab === "model-bom"
  const activeBomFiltersCount = useMemo(() => {
    let count = 0
    if (bomFilters.rowKind) count += 1
    if (Array.isArray(bomFilters.tnvedCodes) && bomFilters.tnvedCodes.length) count += 1
    if (bomFilters.weightMin !== undefined && bomFilters.weightMin !== null && bomFilters.weightMin !== "") count += 1
    if (bomFilters.weightMax !== undefined && bomFilters.weightMax !== null && bomFilters.weightMax !== "") count += 1
    if (bomFilters.lengthMin !== undefined && bomFilters.lengthMin !== null && bomFilters.lengthMin !== "") count += 1
    if (bomFilters.lengthMax !== undefined && bomFilters.lengthMax !== null && bomFilters.lengthMax !== "") count += 1
    if (bomFilters.widthMin !== undefined && bomFilters.widthMin !== null && bomFilters.widthMin !== "") count += 1
    if (bomFilters.widthMax !== undefined && bomFilters.widthMax !== null && bomFilters.widthMax !== "") count += 1
    if (bomFilters.heightMin !== undefined && bomFilters.heightMin !== null && bomFilters.heightMin !== "") count += 1
    if (bomFilters.heightMax !== undefined && bomFilters.heightMax !== null && bomFilters.heightMax !== "") count += 1
    if (Array.isArray(bomFilters.materialValues) && bomFilters.materialValues.length) count += 1
    return count
  }, [bomFilters])
  const currentFiltersCount = isModelBomContext ? activeBomFiltersCount : activeFiltersCount

  const setStoredFiltersPanelOpen = (open) => {
    setFiltersPanelOpen(open)
    if (typeof window !== "undefined") {
      window.localStorage.setItem("equipmentClassifier.filtersOpen", open ? "1" : "0")
    }
  }

  const handleTreeResizeStart = (event) => {
    event.preventDefault()
    const startX = event.clientX
    const startWidth = classifierTreeWidth
    const handleMouseMove = (moveEvent) => {
      const nextWidth = Math.min(520, Math.max(240, startWidth + moveEvent.clientX - startX))
      setClassifierTreeWidth(nextWidth)
      if (typeof window !== "undefined") {
        window.localStorage.setItem("equipmentClassifier.treeWidth", String(nextWidth))
      }
    }
    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }
    document.body.style.cursor = "col-resize"
    document.body.style.userSelect = "none"
    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
  }

  const setAttributeFilterValue = (attributeId, patch) => {
    setAttributeFilters((prev) => {
      const next = {
        ...prev,
        [attributeId]: {
          ...(prev[attributeId] || {}),
          ...patch,
        },
      }
      const value = next[attributeId]
      const isEmpty =
        (!value ||
          ((value.min === undefined || value.min === null || value.min === "") &&
            (value.max === undefined || value.max === null || value.max === "") &&
            (Array.isArray(value.value)
              ? value.value.length === 0
              : value.value === undefined || value.value === null || value.value === "")))
      if (isEmpty) delete next[attributeId]
      return next
    })
  }

  const setBomFilterValue = (key, value) => {
    setBomFilters((prev) => {
      const next = { ...prev, [key]: value }
      if (value === undefined || value === null || value === "") delete next[key]
      return next
    })
  }

  const getModelAttributeValue = (model, attributeId) =>
    (Array.isArray(model?.attribute_values) ? model.attribute_values : []).find(
      (value) => Number(value.attribute_id) === Number(attributeId),
    ) || null

  const splitIds = (value) =>
    String(value || "")
      .split(",")
      .map((item) => Number(item.trim()))
      .filter(Boolean)

  const selectedModelUnits = useMemo(() => {
    if (!detailsModel?.id) return []
    const modelId = Number(detailsModel.id)
    return rawWorkspaceUnits.filter((row) => Number(row.equipment_model_id) === modelId)
  }, [detailsModel, rawWorkspaceUnits])

  const selectedModelClientParts = useMemo(() => {
    if (!detailsModel?.id) return []
    const modelId = Number(detailsModel.id)
    return rawWorkspaceClientParts.filter((row) => {
      const modelIds = splitIds(row.application_model_ids)
      const unitModelIds = splitIds(row.application_unit_model_ids)
      return modelIds.includes(modelId) || unitModelIds.includes(modelId)
    })
  }, [detailsModel, rawWorkspaceClientParts])

  const currentModel = useMemo(() => {
    if (selectedTreeEntity.type !== "model" || !selectedTreeEntity.id) return null
    return rawWorkspaceModels.find((model) => Number(model.id) === Number(selectedTreeEntity.id)) || selectedModelFromTree
  }, [rawWorkspaceModels, selectedModelFromTree, selectedTreeEntity])

  const selectedCatalogPosition = useMemo(() => {
    if (selectedTreeEntity.type !== "catalog_position" || !selectedTreeEntity.id) return null
    return rawWorkspaceCatalogPositions.find((row) => Number(row.id) === Number(selectedTreeEntity.id)) || null
  }, [rawWorkspaceCatalogPositions, selectedTreeEntity])

  useEffect(() => {
    if (selectedTreeEntity.type !== "catalog_position" || !selectedTreeEntity.id) {
      setCatalogPositionUsage([])
      return
    }
    loadCatalogPositionUsage(selectedTreeEntity.id)
  }, [loadCatalogPositionUsage, selectedTreeEntity])

  useEffect(() => {
    setBranchSubsectionsOpen(false)
  }, [selectedNode?.id])

  const currentModelBomTree = useMemo(() => buildBomTree(modelBomItems), [modelBomItems])
  const currentModelBomRows = useMemo(() => flattenBomTreeRows(currentModelBomTree), [currentModelBomTree])
  const bomTnvedFilterOptions = useMemo(() => {
    const values = new Set()
    currentModelBomRows.forEach((row) => {
      const value = getBomRowFilterValue(row, "tnved")
      if (hasBomExtraValue(value)) values.add(String(value).trim())
    })
    return Array.from(values)
      .sort((a, b) => a.localeCompare(b, "ru"))
      .map((value) => ({ value, label: value }))
  }, [currentModelBomRows])
  const bomMaterialFilterOptions = useMemo(() => {
    const values = new Set()
    currentModelBomRows.forEach((row) => {
      splitBomFilterValues(getBomRowFilterValue(row, "material")).forEach((value) => values.add(value))
    })
    return Array.from(values)
      .sort((a, b) => a.localeCompare(b, "ru"))
      .map((value) => ({ value, label: value }))
  }, [currentModelBomRows])
  const currentModelBomStats = useMemo(() => {
    const rows = currentModelBomRows
    const groups = rows.filter((row) => row.bom_has_children || getBomEffectiveRowKind(row) === "assembly").length
    const cardRows = rows.filter((row) => row.catalog_position_id).length
    return {
      total: rows.length,
      groups,
      positions: Math.max(rows.length - groups, 0),
      cardRows,
      needsReview: Math.max(rows.length - cardRows, 0),
    }
  }, [currentModelBomRows])
  const filteredModelBomTree = useMemo(() => {
    const query = bomSearchQuery.trim().toLowerCase()
    const matchesNumberRange = (value, minValue, maxValue) => {
      const minNumber = minValue !== undefined && minValue !== "" ? Number(minValue) : null
      const maxNumber = maxValue !== undefined && maxValue !== "" ? Number(maxValue) : null
      if (Number.isFinite(minNumber) && (value === null || value < minNumber)) return false
      if (Number.isFinite(maxNumber) && (value === null || value > maxNumber)) return false
      return true
    }
    const matchesBomFilters = (row) => {
      if (bomFilters.rowKind && getBomEffectiveRowKind(row) !== bomFilters.rowKind) return false

      if (Array.isArray(bomFilters.tnvedCodes) && bomFilters.tnvedCodes.length) {
        const tnved = getBomRowFilterValue(row, "tnved")
        if (!tnved || !bomFilters.tnvedCodes.includes(String(tnved).trim())) return false
      }

      const weight = getBomRowWeight(row)
      if (!matchesNumberRange(weight, bomFilters.weightMin, bomFilters.weightMax)) return false

      const dimensions = getBomRowDimensions(row)
      if (!matchesNumberRange(dimensions.length_mm, bomFilters.lengthMin, bomFilters.lengthMax)) return false
      if (!matchesNumberRange(dimensions.width_mm, bomFilters.widthMin, bomFilters.widthMax)) return false
      if (!matchesNumberRange(dimensions.height_mm, bomFilters.heightMin, bomFilters.heightMax)) return false

      if (Array.isArray(bomFilters.materialValues) && bomFilters.materialValues.length) {
        const rowMaterials = splitBomFilterValues(getBomRowFilterValue(row, "material"))
        if (!rowMaterials.some((material) => bomFilters.materialValues.includes(material))) return false
      }

      return true
    }
    const matchesSearch = (row) => {
      if (!query) return true
      return [
        row.item_no,
        row.manufacturer_part_number,
        row.manufacturer_part_name,
        row.manufacturer_part_name_en,
        row.manufacturer_part_name_ru,
        row.title,
        row.part_number,
        row.description_ru,
        row.description_en,
        row.catalog_position_name,
        row.catalog_position_code,
        row.client_part_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)
    }
    const walk = (rows) =>
      (rows || [])
        .map((row) => {
          const children = walk(row.children || [])
          const selfMatches = matchesSearch(row) && matchesBomFilters(row)
          if (!selfMatches && !children.length) return null
          return { ...row, children }
        })
        .filter(Boolean)
    return walk(currentModelBomTree)
  }, [bomFilters, bomSearchQuery, currentModelBomTree])
  const currentModelBomExpandableKeys = useMemo(
    () => currentModelBomRows
      .filter((row) => Array.isArray(row.children) && row.children.length > 0)
      .map((row) => row.id),
    [currentModelBomRows],
  )
  const crossModelBomParentOptions = useMemo(
    () => crossModelBomRows
      .filter((row) => {
        if (crossModelBomSource?.catalog_position_id &&
          Number(row.catalog_position_id) === Number(crossModelBomSource.catalog_position_id)) {
          return false
        }
        return row.bom_has_children || getBomEffectiveRowKind(row) === "assembly"
      })
      .map((row) => ({
        value: row.id,
        label: `${"— ".repeat(row.bom_level || 0)}${row.item_no ? `${row.item_no}. ` : ""}${getBomItemLabel(row)}${getBomItemName(row) ? ` — ${getBomItemName(row)}` : ""}`,
      })),
    [crossModelBomRows, crossModelBomSource],
  )
  const crossModelOptions = useMemo(() => {
    if (!currentModel?.id) return []

    const currentModelId = Number(currentModel.id)
    const currentManufacturerId = Number(currentModel.manufacturer_id)
    const hasManufacturerId = Number.isFinite(currentManufacturerId) && currentManufacturerId > 0
    const currentManufacturerName = String(currentModel.manufacturer_name || "").trim().toLowerCase()

    return allModels
      .filter((model) => {
        const isCurrent = Number(model.id) === currentModelId
        if (isCurrent) return true

        const modelManufacturerId = Number(model.manufacturer_id)
        if (hasManufacturerId && Number.isFinite(modelManufacturerId) && modelManufacturerId > 0) {
          return modelManufacturerId === currentManufacturerId
        }

        if (currentManufacturerName) {
          return String(model.manufacturer_name || "").trim().toLowerCase() === currentManufacturerName
        }

        return false
      })
      .map((model) => ({
        value: Number(model.id),
        label: `${[model.manufacturer_name, model.model_name].filter(Boolean).join(" ") || `Модель #${model.id}`}${
          Number(model.id) === currentModelId ? " (текущая модель)" : ""
        }`,
        isCurrent: Number(model.id) === currentModelId,
      }))
      .sort((a, b) => {
        if (a.isCurrent !== b.isCurrent) return a.isCurrent ? -1 : 1
        return String(a.label).localeCompare(String(b.label), "ru")
      })
  }, [allModels, currentModel?.id, currentModel?.manufacturer_id, currentModel?.manufacturer_name])

  useEffect(() => {
    setBomExpandedKeys(currentModelBomExpandableKeys)
  }, [currentModel?.id, currentModelBomExpandableKeys])

  useEffect(() => {
    if (!crossModelBomSource || !bomCrossModelTargetId) {
      setCrossModelBomRows([])
      return
    }
    loadCrossModelBomRows(bomCrossModelTargetId)
  }, [bomCrossModelTargetId, crossModelBomSource, loadCrossModelBomRows])
  const selectedBomParent = useMemo(() => {
    if (!selectedBomItem?.parent_item_id) return null
    return currentModelBomRows.find((row) => Number(row.id) === Number(selectedBomItem.parent_item_id)) || null
  }, [currentModelBomRows, selectedBomItem])
  const selectedBomChildren = useMemo(
    () => (Array.isArray(selectedBomItem?.children) ? selectedBomItem.children : []),
    [selectedBomItem],
  )
  const bomCardSupplierParts = useMemo(
    () => (Array.isArray(bomPositionDetails?.supplier_parts) ? bomPositionDetails.supplier_parts : []),
    [bomPositionDetails],
  )
  const bomCardMaterials = useMemo(
    () => (Array.isArray(bomPositionDetails?.materials) ? bomPositionDetails.materials : []),
    [bomPositionDetails],
  )
  const bomCardSupplierMaterials = useMemo(
    () => (Array.isArray(bomPositionDetails?.supplier_materials) ? bomPositionDetails.supplier_materials : []),
    [bomPositionDetails],
  )
  const bomCardMedia = useMemo(
    () => (Array.isArray(bomPositionDetails?.media) ? bomPositionDetails.media : []),
    [bomPositionDetails],
  )
  const bomPrimaryPhoto = bomCardMedia[0] || null
  const bomCardUsage = useMemo(
    () => (Array.isArray(bomPositionDetails?.usage) ? bomPositionDetails.usage : []),
    [bomPositionDetails],
  )
  const bomCardAnalogPositions = useMemo(
    () => (Array.isArray(bomPositionDetails?.analog_positions) ? bomPositionDetails.analog_positions : []),
    [bomPositionDetails],
  )
  const bomCardPrimaryPositions = useMemo(
    () => (Array.isArray(bomPositionDetails?.primary_positions) ? bomPositionDetails.primary_positions : []),
    [bomPositionDetails],
  )
  const bomCardPosition = bomPositionDetails?.position || null
  const selectedBomAnalogPosition = useMemo(() => {
    if (!selectedBomItem || !bomCardPosition || !bomCardAnalogPositions.length) return null
    const bomNumber = normalizeCatalogIdentity(selectedBomItem.manufacturer_part_number || selectedBomItem.part_number)
    const primaryNumber = normalizeCatalogIdentity(bomCardPosition.manufacturer_part_number || bomCardPosition.position_code)
    if (!bomNumber || bomNumber === primaryNumber) return null
    return (
      bomCardAnalogPositions.find((row) => {
        const rowNumber = normalizeCatalogIdentity(row.manufacturer_part_number || row.position_code)
        return rowNumber && rowNumber === bomNumber
      }) || null
    )
  }, [bomCardAnalogPositions, bomCardPosition, selectedBomItem])
  const visibleBomCardAnalogPositions = useMemo(() => {
    if (!selectedBomAnalogPosition) return bomCardAnalogPositions
    return bomCardAnalogPositions.filter((row) => Number(row.id) !== Number(selectedBomAnalogPosition.id))
  }, [bomCardAnalogPositions, selectedBomAnalogPosition])
  const bomWarehouseStock = useMemo(
    () => (Array.isArray(bomWarehouseDetails?.stock) ? bomWarehouseDetails.stock : []),
    [bomWarehouseDetails],
  )
  const bomWarehouseReservations = useMemo(
    () => (Array.isArray(bomWarehouseDetails?.reservations) ? bomWarehouseDetails.reservations : []),
    [bomWarehouseDetails],
  )
  const bomWarehouseMovements = useMemo(
    () => (Array.isArray(bomWarehouseDetails?.movements) ? bomWarehouseDetails.movements : []),
    [bomWarehouseDetails],
  )

  const reloadBomWarehouseDetails = useCallback(async () => {
    if (!bomItemCardOpen || !selectedBomItem?.catalog_position_id) {
      setBomWarehouseDetails(null)
      setBomWarehouseDetailsLoading(false)
      return
    }
    setBomWarehouseDetailsLoading(true)
    try {
      const { data } = await axios.get(`/warehouse/positions/${selectedBomItem.catalog_position_id}`)
      setBomWarehouseDetails(data || null)
    } catch (err) {
      console.error("GET /warehouse/positions/:id error:", err)
      setBomWarehouseDetails(null)
    } finally {
      setBomWarehouseDetailsLoading(false)
    }
  }, [bomItemCardOpen, selectedBomItem?.catalog_position_id])

  const reloadBomPositionDetails = useCallback(async () => {
    if (!bomItemCardOpen || !selectedBomItem?.catalog_position_id) {
      setBomPositionDetails(null)
      setBomPositionDetailsLoading(false)
      return
    }
    setBomPositionDetailsLoading(true)
    try {
      const { data } = await axios.get(`/catalog-positions/${selectedBomItem.catalog_position_id}/card`)
      setBomPositionDetails(data || null)
    } catch (err) {
      console.error("GET /catalog-positions/:id/card error:", err)
      setBomPositionDetails(null)
    } finally {
      setBomPositionDetailsLoading(false)
    }
  }, [bomItemCardOpen, selectedBomItem?.catalog_position_id])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!bomItemCardOpen || !selectedBomItem?.catalog_position_id) {
        setBomWarehouseDetails(null)
        setBomWarehouseDetailsLoading(false)
        return
      }
      setBomWarehouseDetailsLoading(true)
      try {
        const { data } = await axios.get(`/warehouse/positions/${selectedBomItem.catalog_position_id}`)
        if (!cancelled) setBomWarehouseDetails(data || null)
      } catch (err) {
        if (cancelled) return
        console.error("GET /warehouse/positions/:id error:", err)
        setBomWarehouseDetails(null)
      } finally {
        if (!cancelled) setBomWarehouseDetailsLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [bomItemCardOpen, selectedBomItem?.catalog_position_id])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!bomItemCardOpen || !selectedBomItem?.catalog_position_id) {
        setBomPositionDetails(null)
        setBomPositionDetailsLoading(false)
        return
      }
      setBomPositionDetailsLoading(true)
      try {
        const { data } = await axios.get(`/catalog-positions/${selectedBomItem.catalog_position_id}/card`)
        if (!cancelled) setBomPositionDetails(data || null)
      } catch (err) {
        if (cancelled) return
        console.error("GET /catalog-positions/:id/card error:", err)
        setBomPositionDetails(null)
      } finally {
        if (!cancelled) setBomPositionDetailsLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [bomItemCardOpen, selectedBomItem?.catalog_position_id])

  useEffect(() => {
    const meta = bomPositionDetails?.position?.meta || {}
    bomCardForm.setFieldsValue({
      weight_kg: meta.weight_kg ?? null,
      length_mm: meta.length_mm ?? null,
      width_mm: meta.width_mm ?? null,
      height_mm: meta.height_mm ?? null,
      description: bomPositionDetails?.position?.description || "",
      tnved: bomPositionDetails?.tnved
        ? {
            id: bomPositionDetails.tnved.id,
            code: bomPositionDetails.tnved.code,
            description: bomPositionDetails.tnved.description,
          }
      : null,
    })
  }, [bomCardForm, bomPositionDetails])

  const handleUploadBomCardPhoto = async ({ file, onSuccess, onError }) => {
    if (!selectedBomItem?.catalog_position_id) {
      message.warning("Сначала выберите позицию BOM")
      onError?.(new Error("catalog_position_id is empty"))
      return
    }
    setBomCardPhotoUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      await axios.post(`/catalog-positions/${selectedBomItem.catalog_position_id}/media`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      await reloadBomPositionDetails()
      message.success("Фото добавлено")
      onSuccess?.({})
    } catch (err) {
      console.error("POST /catalog-positions/:id/media error:", err)
      message.error(err?.response?.data?.message || "Не удалось загрузить фото")
      onError?.(err)
    } finally {
      setBomCardPhotoUploading(false)
    }
  }

  const handleSaveBomCardData = async () => {
    if (!selectedBomItem?.catalog_position_id) return
    try {
      const values = await bomCardForm.validateFields()
      setBomCardSaving(true)
      await axios.patch(`/catalog-positions/${selectedBomItem.catalog_position_id}/card`, {
        weight_kg: values.weight_kg ?? null,
        length_mm: values.length_mm ?? null,
        width_mm: values.width_mm ?? null,
        height_mm: values.height_mm ?? null,
        description: values.description || null,
        tnved_code_id: values.tnved?.id || null,
      })
      await reloadBomPositionDetails()
      message.success("Данные карточки сохранены")
    } catch (err) {
      if (err?.errorFields) return
      console.error("PATCH /catalog-positions/:id/card error:", err)
      message.error(err?.response?.data?.message || "Не удалось сохранить данные карточки")
    } finally {
      setBomCardSaving(false)
    }
  }

  const openBomWarehouseAction = (type, row) => {
    if (!selectedBomItem?.catalog_position_id || !row?.warehouse_id || !row?.supplier_part_id) return
    const maxQty = type === "reserve" ? Number(row.free_qty || 0) : Number(row.reserved_qty || 0)
    if (maxQty <= 0) {
      message.warning(type === "reserve" ? "Свободного остатка для резерва нет" : "Активного резерва для снятия нет")
      return
    }
    setBomWarehouseAction({ type, row, maxQty })
    bomWarehouseActionForm.resetFields()
    bomWarehouseActionForm.setFieldsValue({
      quantity: maxQty,
      source_label:
        type === "unreserve"
          ? row.source_label || ""
          : `Резерв из карточки ${getBomManufacturerNumber(selectedBomItem)}`,
      source_type: row.source_type || "manual",
      source_id: row.source_id || "",
      source_line_id: row.source_line_id || "",
    })
  }

  const openBomWarehousePage = (action = null) => {
    if (!selectedBomItem?.catalog_position_id) {
      navigate("/warehouse")
      return
    }
    const partNumber = getBomManufacturerNumber(selectedBomItem)
    const title = partNumber && partNumber !== "—" ? partNumber : selectedBomItem.display_name || selectedBomItem.name_en || "Позиция"
    const subtitle = [
      selectedBomItem.display_name || selectedBomItem.name_en || selectedBomItem.name_ru,
      currentModel?.manufacturer_name,
      currentModel?.model_name,
    ]
      .filter(Boolean)
      .join(" · ")
    const params = new URLSearchParams({
      mode: "stock",
      position_id: String(selectedBomItem.catalog_position_id),
      position_title: title,
      position_subtitle: subtitle,
      uom: selectedBomItem.uom || selectedBomItem.catalog_position_uom || "шт",
    })
    if (action) params.set("action", action)
    navigate(`/warehouse?${params.toString()}`)
  }

  const handleSubmitBomWarehouseAction = async () => {
    if (!selectedBomItem?.catalog_position_id || !bomWarehouseAction?.row) return
    try {
      const values = await bomWarehouseActionForm.validateFields()
      const row = bomWarehouseAction.row
      const type = bomWarehouseAction.type
      setBomWarehouseActionSaving(true)
      await axios.post("/warehouse/documents", {
        doc_type: type,
        document_date: new Date().toISOString(),
        warehouse_id: row.warehouse_id,
        basis_document: `Карточка позиции ${getBomManufacturerNumber(selectedBomItem)}`,
        source_type: values.source_type || "manual",
        source_id: values.source_id || null,
        source_line_id: values.source_line_id || null,
        source_label: values.source_label || null,
        post: true,
        lines: [
          {
            supplier_part_id: row.supplier_part_id,
            catalog_position_id: selectedBomItem.catalog_position_id,
            storage_place_id: row.storage_place_id,
            quantity: values.quantity,
          },
        ],
      })
      message.success(type === "reserve" ? "Резерв создан" : "Резерв снят")
      setBomWarehouseAction(null)
      bomWarehouseActionForm.resetFields()
      await reloadBomWarehouseDetails()
    } catch (err) {
      if (err?.errorFields) return
      console.error("POST /warehouse/documents reserve action error:", err)
      message.error(err?.response?.data?.message || "Не удалось выполнить складское действие")
    } finally {
      setBomWarehouseActionSaving(false)
    }
  }

  const fetchBomMaterialOptions = async (q = "") => {
    setBomMaterialOptionsLoading(true)
    try {
      const { data } = await axios.get("/materials", { params: { q, limit: 50 } })
      setBomMaterialOptions(
        (Array.isArray(data) ? data : []).map((material) => ({
          value: material.id,
          label: [material.name, material.code, material.standard].filter(Boolean).join(" / "),
        })),
      )
    } catch (err) {
      console.error("GET /materials error:", err)
      setBomMaterialOptions([])
    } finally {
      setBomMaterialOptionsLoading(false)
    }
  }

  const openBomMaterialModal = (record = null) => {
    setEditingBomMaterial(record)
    bomMaterialForm.resetFields()
    bomMaterialForm.setFieldsValue({
      material_id: record?.material_id || null,
      variant_name: record?.variant_name || "",
      is_default: Boolean(record?.is_default),
      note: record?.note || "",
    })
    setBomMaterialModalOpen(true)
    fetchBomMaterialOptions(record?.name || "")
  }

  const handleSaveBomMaterial = async () => {
    if (!selectedBomItem?.catalog_position_id) return
    try {
      const values = await bomMaterialForm.validateFields()
      setBomCardSaving(true)
      const payload = {
        material_id: values.material_id,
        variant_name: values.variant_name || null,
        is_default: values.is_default ? 1 : 0,
        note: values.note || null,
      }
      if (editingBomMaterial?.id) {
        await axios.patch(
          `/catalog-positions/${selectedBomItem.catalog_position_id}/materials/${editingBomMaterial.id}`,
          payload,
        )
      } else {
        await axios.post(`/catalog-positions/${selectedBomItem.catalog_position_id}/materials`, payload)
      }
      setBomMaterialModalOpen(false)
      setEditingBomMaterial(null)
      await reloadBomPositionDetails()
      message.success(editingBomMaterial?.id ? "Материал обновлен" : "Материал добавлен")
    } catch (err) {
      if (err?.errorFields) return
      console.error("SAVE catalog position material error:", err)
      message.error(err?.response?.data?.message || "Не удалось сохранить материал")
    } finally {
      setBomCardSaving(false)
    }
  }

  const handleDeleteBomMaterial = async (record) => {
    if (!selectedBomItem?.catalog_position_id || !record?.id) return
    try {
      await axios.delete(`/catalog-positions/${selectedBomItem.catalog_position_id}/materials/${record.id}`)
      await reloadBomPositionDetails()
      message.success("Материал удален")
    } catch (err) {
      console.error("DELETE catalog position material error:", err)
      message.error(err?.response?.data?.message || "Не удалось удалить материал")
    }
  }

  const openBomItemModal = useCallback(
    (item = null, parent = null, options = {}) => {
      if (!currentModel?.id) return
      const reuseFrom = options?.reuseFrom || null
      const sourceItem = reuseFrom || item
      const usesExistingCatalogPosition = Boolean(
        sourceItem?.catalog_position_id && (reuseFrom || !isBomOwnCatalogPosition(sourceItem)),
      )
      const sourceDimensions = getBomRowDimensions(sourceItem)
      const sourceMeta = getBomRowCardMeta(sourceItem)
      const sourceTnvedId = Number(sourceMeta.tnved_code_id || 0)
      const sourceRowKind =
        sourceItem?.bom_has_children || (Array.isArray(sourceItem?.children) && sourceItem.children.length > 0)
          ? "assembly"
          : sourceItem?.row_kind || "part"
      setEditingBomItem(item)
      setReuseBomSource(reuseFrom)
      bomItemForm.resetFields()
      bomItemForm.setFieldsValue({
        link_classifier: usesExistingCatalogPosition,
        row_kind: sourceRowKind,
        parent_item_id: item ? item.parent_item_id || null : parent?.id || null,
        item_no: reuseFrom ? "" : item?.item_no || "",
        manufacturer_part_number: sourceItem?.manufacturer_part_number || sourceItem?.part_number || "",
        manufacturer_part_name_en:
          sourceItem?.manufacturer_part_name_en ||
          sourceItem?.manufacturer_part_name ||
          sourceItem?.description_en ||
          sourceItem?.catalog_position_name ||
          "",
        manufacturer_part_name_ru: sourceItem?.manufacturer_part_name_ru || sourceItem?.description_ru || "",
        manufacturer_part_name:
          sourceItem?.manufacturer_part_name ||
          sourceItem?.description_ru ||
          sourceItem?.description_en ||
          sourceItem?.catalog_position_name ||
          "",
        drawing_number: sourceItem?.drawing_number || "",
        catalog_position_id: usesExistingCatalogPosition ? sourceItem?.catalog_position_id || null : null,
        quantity: sourceItem?.quantity || 1,
        sort_order: item?.sort_order || 0,
        notes: reuseFrom ? "" : item?.notes || "",
        card_weight_kg: getBomRowWeight(sourceItem),
        card_length_mm: sourceDimensions.length_mm,
        card_width_mm: sourceDimensions.width_mm,
        card_height_mm: sourceDimensions.height_mm,
        card_tnved: sourceTnvedId
          ? {
              id: sourceTnvedId,
              code: sourceMeta.tnved_code || sourceItem?.catalog_position_tnved_code,
              description: sourceMeta.tnved_description,
            }
          : undefined,
        card_description: sourceItem?.catalog_position_description || sourceItem?.description || "",
      })
      const seed =
        sourceItem?.manufacturer_part_number ||
        sourceItem?.part_number ||
        sourceItem?.manufacturer_part_name_en ||
        sourceItem?.manufacturer_part_name ||
        sourceItem?.catalog_position_name ||
        ""
      if (usesExistingCatalogPosition || !catalogPositionOptions.length) loadCatalogPositions(seed)
      setBomItemModalOpen(true)
    },
    [bomItemForm, catalogPositionOptions.length, currentModel?.id, loadCatalogPositions],
  )

  const openCrossModelBomModal = useCallback((item) => {
    if (!item?.catalog_position_id) {
      message.warning("У этой строки еще нет карточки позиции")
      return
    }
    setCrossModelBomSource(item)
    setCrossModelBomRows([])
    bomCrossModelForm.resetFields()
    bomCrossModelForm.setFieldsValue({
      target_model_id: currentModel?.id ? Number(currentModel.id) : null,
      parent_item_id: null,
      quantity: item.quantity || 1,
    })
  }, [bomCrossModelForm, currentModel?.id])

  const handleAddBomItemToAnotherModel = async () => {
    if (!crossModelBomSource?.catalog_position_id) return
    try {
      const values = await bomCrossModelForm.validateFields()
      setCrossModelBomSaving(true)
      const targetModelId = Number(values.target_model_id)
      const payload = {
        parent_item_id: values.parent_item_id || null,
        row_kind: crossModelBomSource.row_kind || "part",
        item_type: "catalog_position",
        item_no: values.item_no || null,
        manufacturer_part_number:
          crossModelBomSource.manufacturer_part_number || crossModelBomSource.part_number || null,
        manufacturer_part_name:
          getBomItemName(crossModelBomSource) || crossModelBomSource.catalog_position_name || null,
        manufacturer_part_name_en:
          crossModelBomSource.manufacturer_part_name_en ||
          crossModelBomSource.description_en ||
          crossModelBomSource.catalog_position_name ||
          null,
        manufacturer_part_name_ru: crossModelBomSource.manufacturer_part_name_ru || crossModelBomSource.description_ru || null,
        catalog_position_id: crossModelBomSource.catalog_position_id,
        quantity: values.quantity || 1,
        notes: values.notes || null,
      }
      await axios.post(`/equipment-models/${targetModelId}/bom/items`, payload)
      if (Number(targetModelId) === Number(currentModel?.id)) {
        await loadModelBom(currentModel.id)
      }
      setCrossModelBomSource(null)
      setCrossModelBomRows([])
      bomCrossModelForm.resetFields()
      message.success("Применение позиции добавлено")
    } catch (err) {
      if (err?.errorFields) return
      console.error("ADD BOM item to another model error:", err)
      message.error(err?.response?.data?.message || "Не удалось добавить применение позиции")
    } finally {
      setCrossModelBomSaving(false)
    }
  }

  const handleSaveBomItem = async (confirmedOtherManufacturerDuplicate = false, forcedCatalogPositionId = null) => {
    if (!currentModel?.id) return
    try {
      const values = await bomItemForm.validateFields()
      setBomItemSaving(true)
      const confirmDuplicatePartNumber = confirmedOtherManufacturerDuplicate === true
      const linkClassifier = Boolean((values.link_classifier && values.catalog_position_id) || forcedCatalogPositionId)
      const keepOwnCatalogPosition = Boolean(editingBomItem?.id && !linkClassifier && isBomOwnCatalogPosition(editingBomItem))
      const manufacturerPartName =
        values.manufacturer_part_name_en || values.manufacturer_part_name_ru || values.manufacturer_part_name
      const hasChildren = Boolean(
        editingBomItem?.bom_has_children || (Array.isArray(editingBomItem?.children) && editingBomItem.children.length > 0),
      )
      const inferredRowKind = reuseBomSource ? values.row_kind || "part" : hasChildren ? "assembly" : "part"
      const payload = {
        row_kind: inferredRowKind,
        item_type: linkClassifier || keepOwnCatalogPosition
          ? "catalog_position"
          : "unlinked",
        parent_item_id: values.parent_item_id || null,
        item_no: values.item_no || null,
        manufacturer_part_number: values.manufacturer_part_number || null,
        manufacturer_part_name: manufacturerPartName || null,
        manufacturer_part_name_en: values.manufacturer_part_name_en || null,
        manufacturer_part_name_ru: values.manufacturer_part_name_ru || null,
        drawing_number: values.drawing_number || null,
        title: null,
        catalog_position_id: linkClassifier
          ? forcedCatalogPositionId || values.catalog_position_id
          : keepOwnCatalogPosition
            ? editingBomItem.catalog_position_id
            : null,
        quantity: values.quantity || 1,
        sort_order: values.sort_order ?? editingBomItem?.sort_order ?? 0,
        notes: values.notes || null,
        confirm_duplicate_part_number: confirmDuplicatePartNumber,
      }
      if (!linkClassifier) {
        const cardFields = {
          card_weight_kg: values.card_weight_kg ?? null,
          card_length_mm: values.card_length_mm ?? null,
          card_width_mm: values.card_width_mm ?? null,
          card_height_mm: values.card_height_mm ?? null,
        }
        if (values.card_tnved?.id) cardFields.card_tnved_code_id = values.card_tnved.id
        if (values.card_description) cardFields.card_description = values.card_description
        Object.assign(payload, cardFields)
      }
      const { data } = editingBomItem?.id
        ? await axios.put(`/equipment-models/${currentModel.id}/bom/items/${editingBomItem.id}`, payload)
        : await axios.post(`/equipment-models/${currentModel.id}/bom/items`, payload)
      setModelBomItems(Array.isArray(data?.items) ? data.items : [])
      setBomItemModalOpen(false)
      setEditingBomItem(null)
      setReuseBomSource(null)
      message.success(editingBomItem?.id ? "Строка BOM изменена" : "Строка BOM добавлена")
    } catch (err) {
      if (err?.errorFields) return
      console.error("SAVE equipment model BOM item error:", err)
      const errorData = err?.response?.data
      if (err?.response?.status === 409 && errorData?.type === "duplicate_part_number_same_manufacturer") {
        const duplicate = Array.isArray(errorData.duplicates) ? errorData.duplicates[0] : null
        if (duplicate?.id) {
          Modal.confirm({
            title: "Такая карточка уже есть у этого производителя",
            content: (
              <Space direction="vertical" size={8}>
                <Typography.Text>
                  {errorData.message || "У этого производителя уже есть карточка с таким номером."}
                </Typography.Text>
                <Typography.Text type="secondary">
                  {[duplicate.manufacturer_name, duplicate.equipment_model_name, duplicate.display_name || duplicate.position_code]
                    .filter(Boolean)
                    .join(" — ")}
                </Typography.Text>
                <Typography.Text>Использовать существующую карточку в этой строке BOM?</Typography.Text>
              </Space>
            ),
            okText: "Использовать",
            cancelText: "Отмена",
            onOk: () => handleSaveBomItem(false, duplicate.id),
          })
          return
        }
      }
      if (err?.response?.status === 409 && errorData?.type === "duplicate_part_number_other_manufacturer") {
        const duplicateText = Array.isArray(errorData.duplicates)
          ? errorData.duplicates
              .slice(0, 3)
              .map((row) => [row.manufacturer_name, row.display_name || row.position_code].filter(Boolean).join(" — "))
              .filter(Boolean)
              .join("; ")
          : ""
        Modal.confirm({
          title: "Такой номер есть у другого производителя",
          content: (
            <Space direction="vertical" size={8}>
              <Typography.Text>
                {errorData.message || "Номер уже встречается у другого производителя."}
              </Typography.Text>
              {duplicateText ? <Typography.Text type="secondary">{duplicateText}</Typography.Text> : null}
              <Typography.Text>Создать отдельную карточку для текущего производителя?</Typography.Text>
            </Space>
          ),
          okText: "Создать",
          cancelText: "Отмена",
          onOk: () => handleSaveBomItem(true),
        })
        return
      }
      message.error(err?.response?.data?.message || "Не удалось сохранить строку BOM")
    } finally {
      setBomItemSaving(false)
    }
  }

  const handleDeleteBomItem = useCallback(async (item) => {
    if (!currentModel?.id || !item?.id) return
    try {
      const result = await runTrashDeleteFlow({
        entityType: "equipment_model_bom_items",
        entityId: item.id,
        deleteUrl: `/equipment-models/${currentModel.id}/bom/items/${item.id}`,
        successMessage: "Строка удалена из BOM модели",
      })
      if (!result?.deleted) return
      setModelBomItems(Array.isArray(result.response?.items) ? result.response.items : [])
      if (Number(selectedBomItem?.id) === Number(item.id)) {
        setBomItemCardOpen(false)
        setSelectedBomItem(null)
      }
    } catch (err) {
      console.error("DELETE equipment model BOM item error:", err)
      message.error(err?.response?.data?.message || "Не удалось удалить строку BOM")
    }
  }, [currentModel?.id, selectedBomItem?.id])

  const downloadBomTemplate = async () => {
    if (!currentModel?.id) return
    try {
      const { data, headers } = await axios.get(`/equipment-models/${currentModel.id}/bom/template`, {
        responseType: "blob",
      })
      const disposition = headers?.["content-disposition"] || ""
      const match = disposition.match(/filename="?([^"]+)"?/i)
      const filename = match?.[1] || `equipment_model_${currentModel.id}_bom_template.xlsx`
      const url = window.URL.createObjectURL(data)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error("GET equipment model BOM template error:", err)
      message.error(err?.response?.data?.message || "Не удалось скачать шаблон BOM")
    }
  }

  const parseBomExcelFile = async (file) => {
    const { default: readXlsxFile } = await import("read-excel-file")
    const rows = await readXlsxFile(file)
    if (!Array.isArray(rows) || rows.length < 2) throw new Error("Файл пустой или не распознан")

    const headerRow = rows[0].map((value) => String(value ?? "").trim())
    const headerMap = {
      "Каталожный номер производителя": "manufacturer_part_number",
      "Название EN": "manufacturer_part_name_en",
      "Название RU": "manufacturer_part_name_ru",
      "Количество": "quantity",
      "Масса, кг": "weight_kg",
      "Длина, мм": "length_mm",
      "Ширина, мм": "width_mm",
      "Высота, мм": "height_mm",
      "Код ТН ВЭД": "tnved_code",
    }
    const hasQuantityHeader = headerRow.includes("Количество")
    const hasIdentityHeader = ["Каталожный номер производителя", "Название EN", "Название RU"].some((header) =>
      headerRow.includes(header),
    )
    const missingHeaders = []
    if (!hasQuantityHeader) missingHeaders.push("Количество")
    if (!hasIdentityHeader) missingHeaders.push("Каталожный номер производителя или название")
    if (missingHeaders.length) {
      throw new Error(`В файле нет обязательных колонок: ${missingHeaders.join(", ")}`)
    }

    return rows.slice(1).map((row, index) => {
      const result = { row_number: index + 2 }
      headerRow.forEach((label, columnIndex) => {
        const key = headerMap[label]
        if (key) result[key] = row[columnIndex]
      })
      return result
    })
  }

  const previewBomImportRows = async (rows, replaceMode = bomImportReplace) => {
    if (!currentModel?.id) return
    setBomImportLoading(true)
    setBomImportRows([])
    setBomImportErrors([])
    setBomImportWarnings([])
    try {
      const { data } = await axios.post(`/equipment-models/${currentModel.id}/bom/import/preview`, {
        rows,
        mode: replaceMode ? "replace" : "append",
      })
      setBomImportRows(Array.isArray(data?.rows) ? data.rows : [])
      setBomImportErrors(Array.isArray(data?.errors) ? data.errors : [])
      setBomImportWarnings(Array.isArray(data?.warnings) ? data.warnings : [])
    } catch (err) {
      console.error("POST equipment model BOM import preview error:", err)
      setBomImportErrors([{ message: err?.response?.data?.message || "Не удалось проверить BOM" }])
    } finally {
      setBomImportLoading(false)
    }
  }

  const handleBomImportUpload = async ({ file, onSuccess, onError }) => {
    try {
      const rows = await parseBomExcelFile(file)
      setBomImportSourceRows(rows)
      await previewBomImportRows(rows)
      onSuccess?.("ok")
    } catch (err) {
      console.error("parse BOM Excel error:", err)
      const text = err?.message || "Не удалось прочитать Excel"
      setBomImportErrors([{ message: text }])
      onError?.(err)
    }
  }

  const handleCommitBomImport = async () => {
    if (!currentModel?.id || !bomImportSourceRows.length) return
    setBomImportCommitting(true)
    try {
      const { data } = await axios.post(`/equipment-models/${currentModel.id}/bom/import/commit`, {
        rows: bomImportSourceRows,
        mode: bomImportReplace ? "replace" : "append",
      })
      setModelBomItems(Array.isArray(data?.items) ? data.items : [])
      setBomImportOpen(false)
      setBomImportRows([])
      setBomImportErrors([])
      setBomImportWarnings([])
      setBomImportSourceRows([])
      message.success(`BOM импортирован: ${data?.imported || 0} строк`)
    } catch (err) {
      console.error("POST equipment model BOM import commit error:", err)
      const data = err?.response?.data
      setBomImportErrors(
        Array.isArray(data?.errors) && data.errors.length
          ? data.errors
          : [{ message: data?.message || "Не удалось импортировать BOM" }],
      )
    } finally {
      setBomImportCommitting(false)
    }
  }

  const currentModelBomTreeData = useMemo(
    () =>
      buildBomTreeData(filteredModelBomTree, {
        onOpen: (row) => {
          setSelectedBomItem(row)
          setBomItemCardOpen(true)
        },
        onEdit: (row) => openBomItemModal(row),
        onReuse: (row) => openCrossModelBomModal(row),
        onDelete: (row) => handleDeleteBomItem(row),
        visibleFields: bomVisibleFields,
        dimensionUnitSymbol,
      }),
    [filteredModelBomTree, openBomItemModal, openCrossModelBomModal, handleDeleteBomItem, bomVisibleFields, dimensionUnitSymbol],
  )

  const bomImportColumns = useMemo(
    () => [
      {
        title: "Каталожный номер производителя",
        dataIndex: "manufacturer_part_number",
        width: 250,
        render: (value) => value || "—",
      },
      {
        title: "Название EN",
        dataIndex: "manufacturer_part_name_en",
        width: 220,
        render: (value, row) => (
          <Space direction="vertical" size={0}>
            <Typography.Text strong>
              {value || row.manufacturer_part_name || row.resolved_label || row.title || row.item_key || "—"}
            </Typography.Text>
            {row.resolved_subtitle ? <Typography.Text type="secondary">{row.resolved_subtitle}</Typography.Text> : null}
          </Space>
        ),
      },
      {
        title: "Название RU",
        dataIndex: "manufacturer_part_name_ru",
        width: 220,
        render: (value) => value || "—",
      },
      {
        title: "Количество",
        dataIndex: "quantity",
        width: 120,
      },
      {
        title: "Масса, кг",
        dataIndex: "weight_kg",
        width: 120,
        render: (value) => formatNullableNumber(value),
      },
      {
        title: "Длина, мм",
        dataIndex: "length_mm",
        width: 120,
        render: (value) => formatNullableNumber(value),
      },
      {
        title: "Ширина, мм",
        dataIndex: "width_mm",
        width: 120,
        render: (value) => formatNullableNumber(value),
      },
      {
        title: "Высота, мм",
        dataIndex: "height_mm",
        width: 120,
        render: (value) => formatNullableNumber(value),
      },
      {
        title: "Код ТН ВЭД",
        dataIndex: "tnved_code",
        width: 140,
        render: (value, row) => (
          <Space direction="vertical" size={0}>
            <Typography.Text>{value || "—"}</Typography.Text>
            {row.tnved_description ? (
              <Typography.Text type="secondary" ellipsis style={{ maxWidth: 180 }}>
                {row.tnved_description}
              </Typography.Text>
            ) : null}
          </Space>
        ),
      },
    ],
    [],
  )

  const currentModelUnits = useMemo(() => {
    if (!currentModel?.id) return []
    const modelId = Number(currentModel.id)
    return rawWorkspaceUnits.filter((row) => Number(row.equipment_model_id) === modelId)
  }, [currentModel, rawWorkspaceUnits])

  const currentModelClientParts = useMemo(() => {
    if (!currentModel?.id) return []
    const modelId = Number(currentModel.id)
    return rawWorkspaceClientParts.filter((row) => {
      const modelIds = splitIds(row.application_model_ids)
      const unitModelIds = splitIds(row.application_unit_model_ids)
      return modelIds.includes(modelId) || unitModelIds.includes(modelId)
    })
  }, [currentModel, rawWorkspaceClientParts])

  const filteredModelClientExecutions = useMemo(
    () =>
      modelClientExecutions.filter((row) => {
        if (clientExecutionStatusFilter && row.override_status !== clientExecutionStatusFilter) return false
        if (clientExecutionMissingDocsOnly && Number(row.client_part_documents_count || 0) > 0) return false
        return true
      }),
    [clientExecutionMissingDocsOnly, clientExecutionStatusFilter, modelClientExecutions],
  )

  useEffect(() => {
    if (selectedTreeEntity.type !== "model" || !currentModel?.id) return
    setDetailsModel(currentModel)
    modelDetailsForm.setFieldsValue({
      notes: currentModel.notes || "",
    })
    loadModelMedia(currentModel.id)
    loadModelDocuments(currentModel.id)
    loadModelBom(currentModel.id)
    loadModelClientExecutions(currentModel.id)
  }, [currentModel, loadModelBom, loadModelClientExecutions, loadModelDocuments, loadModelMedia, modelDetailsForm, selectedTreeEntity.type])

  const currentUnitClientParts = useMemo(() => {
    if (!selectedUnitFromTree?.id && !selectedUnitFromTree?.equipment_model_id) return []
    const unitId = Number(selectedUnitFromTree?.id)
    const modelId = Number(selectedUnitFromTree?.equipment_model_id)
    return rawWorkspaceClientParts.filter((row) => {
      const unitModelIds = splitIds(row.application_unit_model_ids)
      const modelIds = splitIds(row.application_model_ids)
      return unitModelIds.includes(modelId) || modelIds.includes(modelId) || Number(row.client_equipment_unit_id) === unitId
    })
  }, [rawWorkspaceClientParts, selectedUnitFromTree])
  const currentUnitBomTree = useMemo(() => buildBomTree(unitBomItems), [unitBomItems])
  const currentUnitBomRows = useMemo(() => flattenBomTreeRows(currentUnitBomTree), [currentUnitBomTree])
  const currentUnitBomOverridesCount = useMemo(
    () => currentUnitBomRows.filter((row) => row.override_status && row.override_status !== "as_original").length,
    [currentUnitBomRows],
  )

  useEffect(() => {
    if (selectedTreeEntity.type === "unit" && selectedUnitFromTree?.id) {
      loadUnitPassport(selectedUnitFromTree)
      loadUnitBom(selectedUnitFromTree)
    } else {
      setUnitPassportRows([])
      setUnitBomItems([])
    }
  }, [selectedTreeEntity.type, selectedUnitFromTree])

  const handleTreeSelect = (keys) => {
    const key = keys?.[0] || null
    setNsiSearchActive(false)
    setSelectedTreeKey(key)
    if (!key) {
      setSelectedTreeEntity({ type: "node", id: null })
      setSelectedId(null)
      return
    }

    const parsed = parseTreeKey(key)
    if (parsed.type === "node") {
      setSelectedTreeEntity({ type: "node", id: parsed.id })
      setSelectedId(parsed.id ? String(parsed.id) : null)
      return
    }
    if (parsed.type === "manufacturer") {
      setSelectedTreeEntity({ type: "manufacturer", id: parsed.extraId, nodeId: parsed.id })
      setSelectedId(parsed.id ? String(parsed.id) : null)
      return
    }
    if (parsed.type === "model") {
      const model = allModels.find((item) => Number(item.id) === Number(parsed.id))
      setSelectedTreeEntity({ type: "model", id: parsed.id })
      setSelectedId(model?.classifier_node_id ? String(model.classifier_node_id) : null)
      return
    }
    if (parsed.type === "unit") {
      const unit = allUnits.find((item) => Number(item.id) === Number(parsed.id))
      setSelectedTreeEntity({ type: "unit", id: parsed.id })
      setSelectedId(unit?.classifier_node_id ? String(unit.classifier_node_id) : null)
    }
  }

  const openModelDetails = (row) => {
    if (!row?.id) return
    setDetailsModel(row || null)
    modelDetailsForm.setFieldsValue({
      notes: row?.notes || "",
    })
    if (row?.id) {
      loadModelMedia(row.id)
      loadModelBom(row.id)
    }
    if (row?.classifier_node_id) {
      setSelectedId(String(row.classifier_node_id))
      setSelectedTreeKey(treeKey.node(row.classifier_node_id))
    }
    setSelectedTreeEntity({ type: "model", id: Number(row.id) })
    setNsiSearchActive(false)
  }

  const handleSaveModelDetails = async () => {
    if (!detailsModel?.id) return
    try {
      const values = await modelDetailsForm.validateFields()
      setModelDetailsSaving(true)
      const { data } = await axios.put(`/equipment-models/${detailsModel.id}`, {
        notes: values.notes || null,
      })
      setDetailsModel(data || detailsModel)
      message.success("Карточка модели сохранена")
      if (selectedId) await loadWorkspace(selectedId)
    } catch (err) {
      if (err?.errorFields) return
      console.error("PUT /equipment-models/:id card error:", err)
      message.error(err?.response?.data?.message || "Не удалось сохранить карточку модели")
    } finally {
      setModelDetailsSaving(false)
    }
  }

  const handleUploadModelMedia = async ({ file, onSuccess, onError }) => {
    if (!detailsModel?.id) {
      onError?.(new Error("Модель не выбрана"))
      return
    }
    const formData = new FormData()
    formData.append("file", file)
    setModelMediaUploading(true)
    try {
      await axios.post(`/equipment-models/${detailsModel.id}/media`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      await loadModelMedia(detailsModel.id)
      if (selectedId) await loadWorkspace(selectedId)
      message.success("Фото модели загружено")
      onSuccess?.()
    } catch (err) {
      console.error("POST /equipment-models/:id/media error:", err)
      message.error(err?.response?.data?.message || "Не удалось загрузить фото модели")
      onError?.(err)
    } finally {
      setModelMediaUploading(false)
    }
  }

  const handleDeleteModelMedia = async (mediaId) => {
    if (!detailsModel?.id || !mediaId) return
    try {
      await axios.delete(`/equipment-models/${detailsModel.id}/media/${mediaId}`)
      await loadModelMedia(detailsModel.id)
      if (selectedId) await loadWorkspace(selectedId)
      message.success("Фото удалено")
    } catch (err) {
      console.error("DELETE /equipment-models/:id/media/:mediaId error:", err)
      message.error(err?.response?.data?.message || "Не удалось удалить фото")
    }
  }

  const handleUploadModelDocument = async ({ file, onSuccess, onError }) => {
    if (!detailsModel?.id) {
      onError?.(new Error("Модель не выбрана"))
      return
    }
    const formData = new FormData()
    formData.append("file", file)
    setModelDocumentUploading(true)
    try {
      await axios.post(`/equipment-models/${detailsModel.id}/documents`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      await loadModelDocuments(detailsModel.id)
      message.success("Документ модели загружен")
      onSuccess?.()
    } catch (err) {
      console.error("POST /equipment-models/:id/documents error:", err)
      message.error(err?.response?.data?.message || "Не удалось загрузить документ модели")
      onError?.(err)
    } finally {
      setModelDocumentUploading(false)
    }
  }

  const handleDeleteModelDocument = async (documentId) => {
    if (!detailsModel?.id || !documentId) return
    try {
      await axios.delete(`/equipment-models/${detailsModel.id}/documents/${documentId}`)
      await loadModelDocuments(detailsModel.id)
      message.success("Документ удален")
    } catch (err) {
      console.error("DELETE /equipment-models/:id/documents/:documentId error:", err)
      message.error(err?.response?.data?.message || "Не удалось удалить документ")
    }
  }

  const modelMatchesAttributeFilters = (model) =>
    filterableAttributes.every((attribute) => {
      const filter = attributeFilters[attribute.id]
      if (!filter) return true
      const valueRow = getModelAttributeValue(model, attribute.id)

      if (attribute.value_type === "number") {
        const hasMin = filter.min !== undefined && filter.min !== null && filter.min !== ""
        const hasMax = filter.max !== undefined && filter.max !== null && filter.max !== ""
        if (!hasMin && !hasMax) return true
        const value = Number(valueRow?.value_number)
        if (!Number.isFinite(value)) return false
        if (hasMin && value < Number(filter.min)) return false
        if (hasMax && value > Number(filter.max)) return false
        return true
      }

      if (attribute.value_type === "boolean") {
        if (filter.value === undefined || filter.value === null || filter.value === "") return true
        if (!valueRow || valueRow.value_boolean === null || valueRow.value_boolean === undefined) return false
        return Number(valueRow.value_boolean) === (filter.value ? 1 : 0)
      }

      if (attribute.value_type === "multiselect") {
        const selected = Array.isArray(filter.value) ? filter.value : []
        if (!selected.length) return true
        let actual = []
        try {
          actual = Array.isArray(valueRow?.value_json) ? valueRow.value_json : JSON.parse(valueRow?.value_json || "[]")
        } catch {
          actual = []
        }
        return selected.every((item) => actual.includes(item))
      }

      const raw = String(valueRow?.value_text || valueRow?.value_date || "").trim()
      if (filter.value === undefined || filter.value === null || filter.value === "") return true
      if (!raw) return false
      if (attribute.value_type === "select") return raw === filter.value
      return raw.toLowerCase().includes(String(filter.value).trim().toLowerCase())
    })

  const workspaceModels = useMemo(() => {
    let rows = rawWorkspaceModels
    if (manufacturerFilter) {
      rows = rows.filter((row) => Number(row.manufacturer_id) === Number(manufacturerFilter))
    }
    if (hasActiveAttributeFilters) {
      rows = rows.filter((row) => modelMatchesAttributeFilters(row))
    }
    return rows
  }, [attributeFilters, filterableAttributes, hasActiveAttributeFilters, manufacturerFilter, rawWorkspaceModels])

  const workspaceCatalogPositions = useMemo(
    () =>
      rawWorkspaceCatalogPositions
        .filter((row) => !selectedNodeIsLeaf || Number(row.classifier_node_id) === Number(selectedId))
        .sort((a, b) => String(a.display_name || "").localeCompare(String(b.display_name || ""), "ru")),
    [rawWorkspaceCatalogPositions, selectedId, selectedNodeIsLeaf],
  )

  const shouldShowModelSection =
    selectedEffectiveCardKind === "equipment_model" ||
    (selectedEffectiveCardKind === "auto" && (workspaceModels.length > 0 || workspaceCatalogPositions.length === 0))
  const shouldShowCatalogPositionSection =
    selectedEffectiveCardKind === "catalog_position" ||
    (selectedEffectiveCardKind === "auto" && workspaceCatalogPositions.length > 0)

  const branchModelsRaw = useMemo(() => {
    if (!selectedNode || selectedNodeIsLeaf) return []
    return allModels
      .filter((row) => selectedBranchNodeIdSet.has(Number(row.classifier_node_id)))
      .map((row) => ({
        ...row,
        classifier_path: getNodePathLabel(row.classifier_node_id),
      }))
      .sort((a, b) => {
        const byPath = String(a.classifier_path || "").localeCompare(String(b.classifier_path || ""), "ru")
        if (byPath !== 0) return byPath
        const byManufacturer = String(a.manufacturer_name || "").localeCompare(String(b.manufacturer_name || ""), "ru")
        if (byManufacturer !== 0) return byManufacturer
        return String(a.model_name || "").localeCompare(String(b.model_name || ""), "ru")
      })
  }, [allModels, getNodePathLabel, selectedBranchNodeIdSet, selectedNode, selectedNodeIsLeaf])

  const branchCatalogPositionsRaw = useMemo(() => {
    if (!selectedNode || selectedNodeIsLeaf) return []
    return rawWorkspaceCatalogPositions
      .filter((row) => selectedBranchNodeIdSet.has(Number(row.classifier_node_id)))
      .map((row) => ({
        ...row,
        classifier_path: getNodePathLabel(row.classifier_node_id),
      }))
  }, [getNodePathLabel, rawWorkspaceCatalogPositions, selectedBranchNodeIdSet, selectedNode, selectedNodeIsLeaf])

  const branchChildStats = useMemo(() => {
    const result = new Map()
    if (!selectedNodeChildren.length) return result

    const childNodeIds = new Map()
    selectedNodeChildren.forEach((child) => {
      const ids = []
      const walk = (node) => {
        if (!node?.id) return
        ids.push(Number(node.id))
        ;(node.children || []).forEach(walk)
      }
      walk(child)
      childNodeIds.set(Number(child.id), new Set(ids))
      result.set(Number(child.id), { modelCount: 0, catalogPositionCount: 0, manufacturerIds: new Set() })
    })

    branchModelsRaw.forEach((model) => {
      const modelNodeId = Number(model.classifier_node_id)
      selectedNodeChildren.forEach((child) => {
        const ids = childNodeIds.get(Number(child.id))
        if (!ids?.has(modelNodeId)) return
        const stat = result.get(Number(child.id))
        stat.modelCount += 1
        if (model.manufacturer_id) stat.manufacturerIds.add(Number(model.manufacturer_id))
      })
    })

    branchCatalogPositionsRaw.forEach((position) => {
      const positionNodeId = Number(position.classifier_node_id)
      selectedNodeChildren.forEach((child) => {
        const ids = childNodeIds.get(Number(child.id))
        if (!ids?.has(positionNodeId)) return
        const stat = result.get(Number(child.id))
        stat.catalogPositionCount += 1
      })
    })

    return result
  }, [branchCatalogPositionsRaw, branchModelsRaw, selectedNodeChildren])

  const branchSectionFilterOptions = useMemo(
    () =>
      selectedNodeChildren.map((child) => {
        const stat = branchChildStats.get(Number(child.id))
        const modelCount = stat?.modelCount || 0
        const catalogPositionCount = stat?.catalogPositionCount || 0
        const totalCount = modelCount + catalogPositionCount
        return {
          value: Number(child.id),
          label: `${child.name || "Раздел"} · ${totalCount}`,
        }
      }),
    [branchChildStats, selectedNodeChildren],
  )

  const branchModels = useMemo(() => {
    let rows = branchModelsRaw
    if (branchSectionFilter) {
      const child = selectedNodeChildren.find((item) => Number(item.id) === Number(branchSectionFilter))
      const ids = new Set()
      const walk = (node) => {
        if (!node?.id) return
        ids.add(Number(node.id))
        ;(node.children || []).forEach(walk)
      }
      walk(child)
      rows = rows.filter((row) => ids.has(Number(row.classifier_node_id)))
    }
    if (manufacturerFilter) {
      rows = rows.filter((row) => Number(row.manufacturer_id) === Number(manufacturerFilter))
    }
    return rows
  }, [branchModelsRaw, branchSectionFilter, manufacturerFilter, selectedNodeChildren])

  const manufacturerFilterOptions = useMemo(() => {
    const byId = new Map()
    const sourceModels = selectedNode && !selectedNodeIsLeaf ? branchModelsRaw : rawWorkspaceModels
    if (selectedNodeIsLeaf) {
      rawWorkspaceManufacturers.forEach((row) => {
        if (row.id) byId.set(Number(row.id), row.name || "Производитель")
      })
    }
    sourceModels.forEach((row) => {
      if (row.manufacturer_id) byId.set(Number(row.manufacturer_id), row.manufacturer_name || "Производитель")
    })
    return Array.from(byId.entries())
      .sort((a, b) => String(a[1]).localeCompare(String(b[1]), "ru"))
      .map(([value, label]) => ({ value, label }))
  }, [branchModelsRaw, rawWorkspaceManufacturers, rawWorkspaceModels, selectedNode, selectedNodeIsLeaf])

  const currentManufacturerModels = useMemo(() => {
    if (selectedTreeEntity.type !== "manufacturer" || !selectedTreeEntity.id) return []
    return workspaceModels.filter((model) => Number(model.manufacturer_id) === Number(selectedTreeEntity.id))
  }, [selectedTreeEntity, workspaceModels])

  const openCatalogPositionCard = (row) => {
    if (!row?.id) return
    if (row.classifier_node_id) {
      setSelectedId(String(row.classifier_node_id))
      setSelectedTreeKey(treeKey.catalogPosition(row.id))
    }
    setSelectedTreeEntity({ type: "catalog_position", id: Number(row.id) })
    setNsiSearchActive(false)
  }

  const openBomItemCatalogPosition = async (row) => {
    const catalogPositionId = Number(row?.catalog_position_id || 0)
    if (!catalogPositionId) {
      message.warning("У этой строки еще нет карточки позиции")
      return
    }
    const classifierNodeId =
      row.catalog_position_classifier_node_id ||
      row.catalog_classifier_node_id ||
      row.catalog_position_node_id ||
      row.classifier_node_id ||
      row.model_classifier_node_id ||
      selectedId
    if (classifierNodeId) {
      setSelectedId(String(classifierNodeId))
      setSelectedTreeKey(treeKey.catalogPosition(catalogPositionId))
      await loadWorkspace(String(classifierNodeId))
    }
    setBomItemCardOpen(false)
    setSelectedBomItem(null)
    setSelectedTreeEntity({ type: "catalog_position", id: catalogPositionId })
  }

  const openBomRelatedCatalogPosition = async (row) => {
    const catalogPositionId = Number(row?.catalog_position_id || row?.id || 0)
    if (!catalogPositionId) return

    const bomRow = currentModelBomRows.find((item) => Number(item.catalog_position_id) === catalogPositionId)
    if (bomRow) {
      setSelectedBomItem(bomRow)
      setBomItemCardOpen(true)
      return
    }

    await openBomItemCatalogPosition({
      ...row,
      catalog_position_id: catalogPositionId,
      catalog_position_code: row?.position_code,
      catalog_position_name: row?.display_name,
      catalog_position_classifier_node_id: row?.classifier_node_id,
    })
  }

  const openUsageModel = async (row) => {
    if (!row?.equipment_model_id) return
    const nodeId = row.model_classifier_node_id || selectedId
    if (nodeId) {
      setSelectedId(String(nodeId))
      setSelectedTreeKey(treeKey.node(nodeId))
      await loadWorkspace(nodeId)
    }
    setSelectedTreeEntity({ type: "model", id: Number(row.equipment_model_id) })
    setNsiSearchActive(false)
  }

  const modelsColumns = [
    {
      title: "Фото",
      width: 92,
      render: (_, row) =>
        row.primary_photo_url ? (
          <Image
            src={resolveAssetUrl(row.primary_photo_url)}
            alt={row.model_name || "Фото модели"}
            width={64}
            height={48}
            style={{ objectFit: "cover", borderRadius: 6 }}
          />
        ) : (
          <div
            style={{
              width: 64,
              height: 48,
              border: "1px solid #d9d9d9",
              borderRadius: 6,
              background: "#fafafa",
              color: "#bfbfbf",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            Фото
          </div>
        ),
    },
    {
      title: "Модель оборудования",
      render: (_, row) => (
        <Space direction="vertical" size={2}>
          <Typography.Link strong onClick={() => openModelDetails(row)}>
            {row.model_name || "—"}
          </Typography.Link>
          <Typography.Text type="secondary">
            {[row.manufacturer_name, row.classifier_path || row.classifier_node_name].filter(Boolean).join(" / ") || "—"}
          </Typography.Text>
          <Space size={8} wrap>
            <Typography.Link onClick={() => openModelAttributes(row)}>Характеристики</Typography.Link>
            <Typography.Link onClick={() => openMoveModel(row)}>Перенести</Typography.Link>
          </Space>
        </Space>
      ),
    },
  ]

  const catalogPositionColumns = [
    {
      title: "Карточка товара",
      render: (_, row) => (
        <Space direction="vertical" size={2}>
          <Typography.Link strong onClick={() => openCatalogPositionCard(row)}>
            {row.display_name || "—"}
          </Typography.Link>
          <Typography.Text type="secondary">
            {[row.position_code, row.classifier_node_name].filter(Boolean).join(" / ") || "без кода"}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: "Ед.",
      dataIndex: "uom",
      width: 90,
      render: (value) => formatMeasurementUnit(value) || value || "—",
    },
    {
      title: "Характеристики",
      width: 180,
      render: (_, row) => {
        const count = Array.isArray(row.attribute_values) ? row.attribute_values.length : 0
        return count ? <Tag color="purple">{count}</Tag> : <Typography.Text type="secondary">не заполнены</Typography.Text>
      },
    },
  ]

  const catalogPositionUsageColumns = [
    {
      title: "Модель",
      render: (_, row) => (
        <Space direction="vertical" size={2}>
          <Typography.Link strong onClick={() => openUsageModel(row)}>
            {[row.manufacturer_name, row.model_name].filter(Boolean).join(" ") || `Модель #${row.equipment_model_id}`}
          </Typography.Link>
          <Typography.Text type="secondary">
            {[row.model_classifier_node_name, row.model_code].filter(Boolean).join(" / ") || "—"}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: "Место в BOM",
      render: (_, row) => (
        <Space direction="vertical" size={2}>
          <Typography.Text strong>
            {[row.item_no, row.manufacturer_part_number || row.title || selectedCatalogPosition?.position_code]
              .filter(Boolean)
              .join(" / ") || `Строка #${row.bom_item_id}`}
          </Typography.Text>
          <Typography.Text type="secondary">
            {[row.manufacturer_part_name, row.drawing_number ? `чертеж ${row.drawing_number}` : null]
              .filter(Boolean)
              .join(" / ") || "—"}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: "Родитель",
      width: 190,
      render: (_, row) =>
        [row.parent_item_no, row.parent_title || row.parent_manufacturer_part_name || row.parent_catalog_position_name]
          .filter(Boolean)
          .join(" / ") || "Корень модели",
    },
    {
      title: "Кол-во",
      dataIndex: "quantity",
      width: 100,
      render: (value) => `${Number(value || 0).toLocaleString("ru-RU")} ${selectedCatalogPosition?.uom || "шт"}`,
    },
    {
      title: "Машины",
      dataIndex: "client_units_count",
      width: 90,
      render: (value) => Number(value || 0),
    },
  ]

  const searchColumns = [
    {
      title: "Найдено",
      render: (_, row) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{row.title || "—"}</Typography.Text>
          <Typography.Text type="secondary">{row.subtitle || "—"}</Typography.Text>
        </Space>
      ),
    },
    {
      title: "Раздел классификатора",
      dataIndex: "classifier_node_name",
      width: 220,
      render: (value) => (value ? <Tag color="blue">{value}</Tag> : "—"),
    },
    {
      title: "Детали",
      dataIndex: "detail",
      render: (value) => value || "—",
    },
    {
      title: "Действие",
      key: "action",
      width: 120,
      render: (_, row) => (
        <Button size="small" onClick={() => openSearchResult(row)}>
          {row.entity_type === "client_part" ? "Клиент" : "Показать"}
        </Button>
      ),
    },
  ]

  const searchGroups = useMemo(() => {
    const byType = new Map()
    nsiSearchRows.forEach((row) => {
      const type = row.entity_type || "unknown"
      if (!byType.has(type)) byType.set(type, [])
      byType.get(type).push(row)
    })
    return Array.from(byType.entries())
      .sort(([a], [b]) => {
        const ai = SEARCH_TYPE_ORDER.indexOf(a)
        const bi = SEARCH_TYPE_ORDER.indexOf(b)
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
      })
      .map(([type, rows]) => ({ type, rows }))
  }, [nsiSearchRows])

  const getAttributeDisplayName = (row) =>
    row?.unit ? `${row.label || "—"}, ${formatMeasurementUnitShort(row.unit)}` : row?.label || "—"

  const getAttributeMetaText = (row) =>
    [
      row?.is_filterable ? "в фильтрах" : null,
      row?.is_required ? "обязательное" : null,
      row?.value_type === "select" || row?.value_type === "multiselect" ? "список значений" : null,
    ]
      .filter(Boolean)
      .join(" · ")

  const attributeColumns = [
    {
      title: "Поле паспорта",
      render: (_, row) => (
        <Space direction="vertical" size={4}>
          <Typography.Text strong>{getAttributeDisplayName(row)}</Typography.Text>
          {row.help_text ? <Typography.Text type="secondary">{row.help_text}</Typography.Text> : null}
          {getAttributeMetaText(row) ? (
            <Typography.Text type="secondary">{getAttributeMetaText(row)}</Typography.Text>
          ) : null}
          {Number(row.classifier_node_id) !== Number(selectedNode?.id) ? (
            <Typography.Text type="secondary">
              Наследуется из раздела: {row.source_node_name || "родительский раздел"}
            </Typography.Text>
          ) : null}
        </Space>
      ),
    },
    {
      title: "",
      key: "actions",
      width: 80,
      render: (_, row) => {
        const inherited = Number(row.classifier_node_id) !== Number(selectedNode?.id)
        return (
          <span onClick={(event) => event.stopPropagation()}>
            <Popconfirm
              title={inherited ? "Убрать поле из родительского паспорта?" : "Убрать поле из паспорта?"}
              description={
                inherited
                  ? `Поле задано в разделе "${row.source_node_name || "родительский раздел"}" и исчезнет у разделов, которые его наследуют.`
                  : getAttributeDisplayName(row)
              }
              okText="Убрать"
              cancelText="Отмена"
              onConfirm={() => handleDeleteAttribute(row)}
            >
              <Button size="small" type="link" danger style={{ paddingInline: 0 }}>
                {inherited ? "Убрать в источнике" : "Убрать"}
              </Button>
            </Popconfirm>
          </span>
        )
      },
    },
  ]

  const renderAttributeValueInput = (attribute) => {
    const name = `attr_${attribute.id}`
    const label = attribute.unit ? `${attribute.label}, ${formatMeasurementUnitShort(attribute.unit)}` : attribute.label
    const rules = attribute.is_required ? [{ required: true, message: "Заполните характеристику" }] : []
    const options = (attribute.options || []).map((option) => ({
      value: option.value_code,
      label: option.value_label,
    }))

    if (attribute.value_type === "number") {
      return (
        <Form.Item key={attribute.id} label={label} name={name} rules={rules}>
          <InputNumber style={{ width: "100%" }} decimalSeparator="," />
        </Form.Item>
      )
    }
    if (attribute.value_type === "boolean") {
      return (
        <Form.Item key={attribute.id} label={attribute.label} name={name}>
          <Select
            allowClear
            options={[
              { value: true, label: "Да" },
              { value: false, label: "Нет" },
            ]}
          />
        </Form.Item>
      )
    }
    if (attribute.value_type === "textarea") {
      return (
        <Form.Item key={attribute.id} label={attribute.label} name={name} rules={rules}>
          <Input.TextArea rows={3} />
        </Form.Item>
      )
    }
    if (attribute.value_type === "select") {
      return (
        <Form.Item key={attribute.id} label={attribute.label} name={name} rules={rules}>
          <Select allowClear options={options} />
        </Form.Item>
      )
    }
    if (attribute.value_type === "multiselect") {
      return (
        <Form.Item key={attribute.id} label={attribute.label} name={name} rules={rules}>
          <Select mode="multiple" allowClear options={options} />
        </Form.Item>
      )
    }
    return (
      <Form.Item key={attribute.id} label={attribute.label} name={name} rules={rules}>
        <Input />
      </Form.Item>
    )
  }

  const renderAttributeFilterControl = (attribute) => {
    const filter = attributeFilters[attribute.id] || {}
    const label = attribute.unit ? `${attribute.label}, ${formatMeasurementUnitShort(attribute.unit)}` : attribute.label
    const commonLabel = (
      <Typography.Text type="secondary" style={{ display: "block", marginBottom: 4 }}>
        {label}
      </Typography.Text>
    )

    if (attribute.value_type === "number") {
      return (
        <div key={attribute.id} style={{ width: "100%" }}>
          {commonLabel}
          <Space.Compact style={{ width: "100%" }}>
            <InputNumber
              placeholder="от"
              value={filter.min}
              onChange={(value) => setAttributeFilterValue(attribute.id, { min: value })}
              style={{ width: "50%" }}
            />
            <InputNumber
              placeholder="до"
              value={filter.max}
              onChange={(value) => setAttributeFilterValue(attribute.id, { max: value })}
              style={{ width: "50%" }}
            />
          </Space.Compact>
        </div>
      )
    }

    if (attribute.value_type === "boolean") {
      return (
        <div key={attribute.id} style={{ width: "100%" }}>
          {commonLabel}
          <Select
            allowClear
            placeholder="Любое"
            value={filter.value}
            onChange={(value) => setAttributeFilterValue(attribute.id, { value })}
            options={[
              { value: true, label: "Да" },
              { value: false, label: "Нет" },
            ]}
            style={{ width: "100%" }}
          />
        </div>
      )
    }

    if (attribute.value_type === "select") {
      return (
        <div key={attribute.id} style={{ width: "100%" }}>
          {commonLabel}
          <Select
            allowClear
            placeholder="Любое"
            value={filter.value}
            onChange={(value) => setAttributeFilterValue(attribute.id, { value })}
            options={(attribute.options || []).map((option) => ({
              value: option.value_code,
              label: option.value_label,
            }))}
            style={{ width: "100%" }}
          />
        </div>
      )
    }

    if (attribute.value_type === "multiselect") {
      return (
        <div key={attribute.id} style={{ width: "100%" }}>
          {commonLabel}
          <Select
            mode="multiple"
            allowClear
            placeholder="Любое"
            value={filter.value || []}
            onChange={(value) => setAttributeFilterValue(attribute.id, { value })}
            options={(attribute.options || []).map((option) => ({
              value: option.value_code,
              label: option.value_label,
            }))}
            style={{ width: "100%" }}
          />
        </div>
      )
    }

    return (
      <div key={attribute.id} style={{ width: "100%" }}>
        {commonLabel}
        <Input
          allowClear
          placeholder="Содержит"
          value={filter.value}
          onChange={(event) => setAttributeFilterValue(attribute.id, { value: event.target.value })}
        />
      </div>
    )
  }

  const modelDetailsAttributeColumns = [
    {
      title: "Характеристика",
      dataIndex: "label",
      render: (value) => value || "—",
    },
    {
      title: "Значение",
      dataIndex: "display_value",
      width: 220,
      render: (value) => value || "—",
    },
  ]

  const modelBomColumns = [
    {
      title: "Позиция BOM",
      render: (_, row) => (
        <div style={{ display: "flex", gap: 10, paddingLeft: Number(row.bom_level || 0) * 28 }}>
          <div
            style={{
              width: 18,
              minWidth: 18,
              color: row.bom_has_children ? "#1677ff" : "#bfbfbf",
              fontWeight: row.bom_has_children ? 700 : 400,
              textAlign: "center",
            }}
          >
            {row.bom_has_children ? "▾" : row.bom_level ? "•" : ""}
          </div>
          <Space direction="vertical" size={0}>
            <Typography.Text strong={row.bom_has_children}>
              {row.part_number || row.title || "—"}
            </Typography.Text>
            <Typography.Text type="secondary">
              {[row.description_ru || row.description_en, row.manufacturer_name].filter(Boolean).join(" / ") || "—"}
            </Typography.Text>
          </Space>
        </div>
      ),
    },
    {
      title: "Кол-во",
      dataIndex: "quantity",
      width: 100,
      render: (value) => Number(value || 0).toLocaleString("ru-RU"),
    },
    {
      title: "Ед.",
      dataIndex: "uom",
      width: 90,
      render: (value) => value || "шт",
    },
    {
      title: "Действие",
      key: "action",
      width: 190,
      render: () => (
        <Space wrap size={8}>
          <Button size="small" onClick={() => message.info("Редактирование строки BOM добавим следующим проходом")}>
            Изменить
          </Button>
        </Space>
      ),
    },
  ]

  const compactUnitColumns = [
    {
      title: "Клиент",
      dataIndex: "client_name",
      render: (value) => value || "—",
    },
    {
      title: "Машина",
      render: (_, row) => (
        <Space direction="vertical" size={0}>
          <Typography.Link
            strong
            onClick={() => {
              setSelectedTreeEntity({ type: "unit", id: Number(row.id) })
              setSelectedTreeKey(treeKey.unit(row.id))
              setSelectedId(row.classifier_node_id ? String(row.classifier_node_id) : selectedId)
            }}
          >
            {row.internal_name || row.serial_number || row.site_name || "Машина клиента"}
          </Typography.Link>
          <Typography.Text type="secondary">
            {[row.serial_number ? `сер. ${row.serial_number}` : null, row.site_name, row.manufacture_year].filter(Boolean).join(" / ") || "—"}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: "Действия",
      width: 170,
      render: (_, row) => (
        <Space wrap>
          <Button size="small" onClick={() => openEditUnit(row)}>
            Паспорт
          </Button>
          <Button size="small" onClick={() => navigate(`/clients/${row.client_id}`)}>
            Клиент
          </Button>
        </Space>
      ),
    },
  ]

  const compactClientPartColumns = [
    {
      title: "Деталь клиента",
      render: (_, row) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{row.display_name || "—"}</Typography.Text>
          <Typography.Text type="secondary">
            {[row.client_part_number, row.drawing_number, row.revision_code].filter(Boolean).join(" / ") || "без номера"}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: "Отличие",
      dataIndex: "difference_summary",
      render: (value) => value || "—",
    },
    {
      title: "Действие",
      width: 100,
      render: (_, row) => (
        <Button size="small" onClick={() => openClientPartDrawer(row)}>
          Карточка
        </Button>
      ),
    },
  ]

  const openExecutionUnit = (row) => {
    if (!row?.client_equipment_unit_id) return
    setSelectedTreeEntity({ type: "unit", id: Number(row.client_equipment_unit_id) })
    setSelectedTreeKey(treeKey.unit(row.client_equipment_unit_id))
  }

  const openExecutionClientPart = (row) => {
    if (!row?.client_part_id) {
      message.warning("Для этого отличия еще не выбрана деталь клиента")
      return
    }
    openClientPartDrawer({
      id: row.client_part_id,
      client_id: row.client_part_client_id || row.client_id,
      client_name: row.client_name,
      classifier_node_id: row.client_part_classifier_node_id,
      classifier_node_name: row.client_part_classifier_node_name,
      base_oem_part_id: row.base_oem_part_id,
      base_oem_part_number: row.base_oem_part_number,
      base_oem_description_ru: row.base_oem_description_ru,
      base_oem_manufacturer_name: row.base_oem_manufacturer_name,
      relationship_type: row.relationship_type,
      client_part_number: row.client_part_number,
      revision_code: row.revision_code,
      drawing_number: row.client_part_drawing_number,
      display_name: row.client_part_name,
      description_ru: row.client_part_description_ru,
      difference_summary: row.client_part_difference_summary,
      uom: row.client_part_uom,
      material_note: row.material_note,
      status: row.client_part_status,
      notes: row.client_part_notes,
    })
  }

  const modelClientExecutionColumns = [
    {
      title: "Клиент / машина",
      width: 220,
      render: (_, row) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{row.client_name || "—"}</Typography.Text>
          <Typography.Link onClick={() => openExecutionUnit(row)}>
            {row.unit_internal_name || row.serial_number || row.site_name || `Машина #${row.client_equipment_unit_id}`}
          </Typography.Link>
          <Typography.Text type="secondary">
            {[row.serial_number ? `сер. ${row.serial_number}` : null, row.site_name].filter(Boolean).join(" / ") || "—"}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: "Строка BOM",
      render: (_, row) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>
            {[row.item_no, row.manufacturer_part_number || row.catalog_position_code || row.title]
              .filter(Boolean)
              .join(" / ") || `BOM #${row.equipment_model_bom_item_id}`}
          </Typography.Text>
          <Typography.Text type="secondary">
            {[row.manufacturer_part_name || row.catalog_position_name, row.difference_summary]
              .filter(Boolean)
              .join(" / ") || "—"}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: "Статус",
      dataIndex: "override_status",
      width: 150,
      render: (value) => {
        const status = UNIT_BOM_STATUS_BY_VALUE[value] || { label: value || "—", color: "default" }
        return <Tag color={status.color}>{status.label}</Tag>
      },
    },
    {
      title: "Деталь клиента",
      width: 220,
      render: (_, row) =>
        row.client_part_id ? (
          <Space direction="vertical" size={0}>
            <Typography.Link strong onClick={() => openExecutionClientPart(row)}>
              {row.client_part_name || row.client_part_number || `Деталь #${row.client_part_id}`}
            </Typography.Link>
            <Typography.Text type="secondary">
              {[row.client_part_number || row.override_client_part_number, row.client_part_drawing_number || row.client_drawing_number, row.revision_code || row.client_revision ? `рев. ${row.revision_code || row.client_revision}` : null]
                .filter(Boolean)
                .join(" / ") || "без номера"}
            </Typography.Text>
          </Space>
        ) : (
          <Space direction="vertical" size={0}>
            <Typography.Text type="secondary">Деталь клиента не выбрана</Typography.Text>
            <Typography.Text type="secondary">
              {[row.override_client_part_number, row.client_drawing_number, row.client_revision ? `рев. ${row.client_revision}` : null]
                .filter(Boolean)
                .join(" / ") || "—"}
            </Typography.Text>
          </Space>
        ),
    },
    {
      title: "Документы",
      width: 115,
      render: (_, row) =>
        row.client_part_id ? (
          <Tag color={Number(row.client_part_documents_count || 0) > 0 ? "green" : "orange"}>
            {Number(row.client_part_documents_count || 0) > 0
              ? `${Number(row.client_part_documents_count)} док.`
              : "нет"}
          </Tag>
        ) : (
          <Tag>—</Tag>
        ),
    },
    {
      title: "Действия",
      width: 170,
      render: (_, row) => (
        <Space wrap>
          <Button size="small" onClick={() => openExecutionUnit(row)}>
            Машина
          </Button>
          <Button size="small" disabled={!row.client_part_id} onClick={() => openExecutionClientPart(row)}>
            Деталь
          </Button>
        </Space>
      ),
    },
  ]

  const unitBomColumns = [
    {
      title: "Позиция BOM",
      render: (_, row) => {
        const status = UNIT_BOM_STATUS_BY_VALUE[row.override_status || "as_original"] || UNIT_BOM_STATUS_BY_VALUE.as_original
        return (
          <div style={{ display: "flex", gap: 10, paddingLeft: Number(row.bom_level || 0) * 24 }}>
            <div
              style={{
                width: 18,
                minWidth: 18,
                color: row.bom_has_children ? "#1677ff" : "#bfbfbf",
                fontWeight: row.bom_has_children ? 700 : 400,
                textAlign: "center",
              }}
            >
              {row.bom_has_children ? "▾" : row.bom_level ? "•" : ""}
            </div>
            <Space direction="vertical" size={2}>
              <Space wrap size={6}>
                {row.item_no ? <Typography.Text type="secondary">{row.item_no}</Typography.Text> : null}
                <Typography.Text strong={row.bom_has_children}>
                  {getBomItemLabel(row)}
                </Typography.Text>
                <Tag color={status.color}>{status.label}</Tag>
              </Space>
              <Typography.Text type="secondary">
                {[getBomItemName(row), row.difference_summary || row.override_notes].filter(Boolean).join(" / ") || "—"}
              </Typography.Text>
            </Space>
          </div>
        )
      },
    },
    {
      title: "База",
      width: 110,
      render: (_, row) =>
        `${Number(row.quantity || 0).toLocaleString("ru-RU")} ${row.uom || row.catalog_position_uom || "шт"}`,
    },
    {
      title: "Клиент",
      width: 190,
      render: (_, row) => {
        const numberLine = [
          row.client_part_number,
          row.client_drawing_number,
          row.client_revision ? `рев. ${row.client_revision}` : null,
        ]
          .filter(Boolean)
          .join(" / ")
        return (
          <Space direction="vertical" size={0}>
            {row.client_part_name ? <Typography.Text>{row.client_part_name}</Typography.Text> : null}
            <Typography.Text type={row.client_part_name ? "secondary" : undefined}>{numberLine || "—"}</Typography.Text>
          </Space>
        )
      },
    },
    {
      title: "Действие",
      width: 110,
      render: (_, row) => (
        <Button size="small" onClick={() => openUnitBomOverride(row)}>
          Отметить
        </Button>
      ),
    },
  ]

  const clientPartApplicationColumns = [
    {
      title: "Где применяется",
      render: (_, row) => (
        <Space direction="vertical" size={0}>
          <Typography.Text>
            {row.client_equipment_unit_id
              ? row.internal_name || row.serial_number || `Машина #${row.client_equipment_unit_id}`
              : row.model_name || row.model_code || `Модель #${row.equipment_model_id}`}
          </Typography.Text>
          <Typography.Text type="secondary">
            {[row.manufacturer_name, row.model_name, row.serial_number ? `сер. ${row.serial_number}` : null, row.site_name]
              .filter(Boolean)
              .join(" / ") || "—"}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: "Заметка",
      dataIndex: "note",
      width: 180,
      render: (value) => value || "—",
    },
  ]

  const clientPartDocumentColumns = [
    {
      title: "Файл",
      render: (_, row) => (
        <Space direction="vertical" size={0}>
          {row.file_url ? (
            <Typography.Link href={row.file_url} target="_blank" rel="noreferrer">
              {row.file_name || `Документ #${row.id}`}
            </Typography.Link>
          ) : (
            <Typography.Text>{row.file_name || `Документ #${row.id}`}</Typography.Text>
          )}
          <Typography.Text type="secondary">
            {[row.file_type, formatFileSize(row.file_size)].filter(Boolean).join(" / ")}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: "Описание",
      dataIndex: "description",
      render: (value) => value || "—",
    },
    {
      title: "Действие",
      width: 100,
      render: (_, row) => (
        <Popconfirm
          title="Удалить документ?"
          description="Документ будет перемещен в корзину, файл в хранилище останется доступен по снимку."
          okText="Удалить"
          cancelText="Отмена"
          onConfirm={() => handleDeleteClientPartDocument(row.id)}
        >
          <Button size="small" danger>
            Удалить
          </Button>
        </Popconfirm>
      ),
    },
  ]

  const renderChildSectionCards = () => {
    if (!selectedNodeChildren.length) return null
    return (
      <Row gutter={[12, 12]}>
        {selectedNodeChildren.map((child) => {
          const stat = branchChildStats.get(Number(child.id))
          const modelCount = stat?.modelCount || 0
          const catalogPositionCount = stat?.catalogPositionCount || 0
          const manufacturerCount = stat?.manufacturerIds?.size || 0
          return (
            <Col key={child.id} xs={24} sm={12} lg={6}>
              <Card
                hoverable
                size="small"
                onClick={() => selectClassifierNode(child)}
                styles={{ body: { minHeight: 104 } }}
              >
                <Space direction="vertical" size={6} style={{ width: "100%" }}>
                  <Space size={4} wrap>
                    <Typography.Text strong>{child.name || "Раздел"}</Typography.Text>
                    {renderCardKindTag(child, { compact: true })}
                  </Space>
                  <Space size={4} wrap>
                    <Tag color={modelCount ? "blue" : "default"}>{modelCount} моделей</Tag>
                    <Tag color={catalogPositionCount ? "purple" : "default"}>{catalogPositionCount} товаров</Tag>
                    <Tag>{manufacturerCount} производителей</Tag>
                  </Space>
                  {child.notes ? (
                    <Typography.Paragraph
                      type="secondary"
                      ellipsis={{ rows: 2, tooltip: child.notes }}
                      style={{ marginBottom: 0 }}
                    >
                      {child.notes}
                    </Typography.Paragraph>
                  ) : null}
                  <Typography.Link
                    onClick={(event) => {
                      event.stopPropagation()
                      openEditNode(child)
                    }}
                  >
                    Настроить
                  </Typography.Link>
                </Space>
              </Card>
            </Col>
          )
        })}
      </Row>
    )
  }

  const renderBranchOverview = () => {
    const manufacturerIds = new Set(branchModelsRaw.map((model) => Number(model.manufacturer_id)).filter(Boolean))
    return (
      <Space direction="vertical" size={12} style={{ width: "100%" }}>
        <Row gutter={[8, 8]}>
          <Col xs={24} sm={12} lg={6}>
            <Card size="small">
              <Typography.Text type="secondary">Подразделы</Typography.Text>
              <Typography.Title level={4} style={{ margin: 0 }}>
                {selectedNodeChildren.length}
              </Typography.Title>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card size="small">
              <Typography.Text type="secondary">Модели в ветке</Typography.Text>
              <Typography.Title level={4} style={{ margin: 0 }}>
                {branchModelsRaw.length}
              </Typography.Title>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card size="small">
              <Typography.Text type="secondary">Карточки товара</Typography.Text>
              <Typography.Title level={4} style={{ margin: 0 }}>
                {branchCatalogPositionsRaw.length}
              </Typography.Title>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card size="small">
              <Typography.Text type="secondary">Производители</Typography.Text>
              <Typography.Title level={4} style={{ margin: 0 }}>
                {manufacturerIds.size}
              </Typography.Title>
            </Card>
          </Col>
        </Row>

        <Card
          size="small"
          title={
            <Space wrap>
              <Typography.Text strong>Модели в выбранной ветке</Typography.Text>
              <Tag>{branchModels.length} из {branchModelsRaw.length}</Tag>
            </Space>
          }
        >
          <Table
            size="small"
            rowKey="id"
            columns={modelsColumns}
            dataSource={branchModels}
            loading={workspaceLoading}
            pagination={{ pageSize: 12, showSizeChanger: false }}
            locale={{ emptyText: "В этой ветке пока нет моделей" }}
            onRow={(row) => ({
              onDoubleClick: () => openModelDetails(row),
            })}
          />
        </Card>

        <Card
          size="small"
          title={
            <Button type="link" style={{ padding: 0 }} onClick={() => setBranchSubsectionsOpen((value) => !value)}>
              Подразделы ({selectedNodeChildren.length})
            </Button>
          }
        >
          {branchSubsectionsOpen ? renderChildSectionCards() : null}
          {branchSubsectionsOpen && !selectedNodeChildren.length ? (
            <Empty description="В этом разделе пока нет подразделов" />
          ) : null}
        </Card>
      </Space>
    )
  }

  const renderNodeBreadcrumbs = () => {
    if (selectedNodePath.length < 2) return null
    const parentNode = selectedNodePath.length > 1 ? selectedNodePath[selectedNodePath.length - 2] : null
    const ancestors = selectedNodePath.slice(0, -1)
    return (
      <Space wrap size={8}>
        {parentNode ? (
          <Button size="small" onClick={() => selectClassifierNode(parentNode)}>
            Назад
          </Button>
        ) : null}
        {ancestors.map((node, index) => {
          return (
            <React.Fragment key={node.id}>
              {index > 0 ? <Typography.Text type="secondary">/</Typography.Text> : null}
              <Typography.Link onClick={() => selectClassifierNode(node)}>{node.name}</Typography.Link>
            </React.Fragment>
          )
        })}
      </Space>
    )
  }

  const renderSearchResults = () => {
    if (!nsiSearchActive) return null
    if (!nsiSearchLoading && !nsiSearchRows.length) {
      return <Empty description="Ничего не найдено" />
    }
    return (
      <Space direction="vertical" size={12} style={{ width: "100%" }}>
        {searchGroups.map((group) => (
          <Card
            key={group.type}
            size="small"
            title={
              <Space>
                <Tag color={SEARCH_TYPE_COLORS[group.type] || "default"}>
                  {SEARCH_TYPE_LABELS[group.type] || group.type}
                </Tag>
                <Typography.Text type="secondary">{group.rows.length}</Typography.Text>
              </Space>
            }
          >
            <Table
              size="small"
              rowKey={(row) => `${row.entity_type}-${row.entity_id}`}
              columns={searchColumns}
              dataSource={group.rows}
              loading={nsiSearchLoading}
              pagination={group.rows.length > 5 ? { pageSize: 5, showSizeChanger: false } : false}
              scroll={{ x: 840 }}
              onRow={(row) => ({
                onClick: () => openSearchResult(row),
                style: { cursor: "pointer" },
              })}
            />
          </Card>
        ))}
        {nsiSearchLoading && !searchGroups.length ? <Table size="small" loading columns={searchColumns} dataSource={[]} /> : null}
      </Space>
    )
  }

  const renderNodeContent = () => (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      {renderNodeBreadcrumbs()}
      <Card size="small">
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} lg={16}>
            <Space direction="vertical" size={4}>
              <Space wrap>
                <Typography.Text strong>Тип ветки</Typography.Text>
                {renderCardKindTag(selectedNode)}
                {selectedCardKindInfo.isInherited && selectedCardKindInfo.sourceNode ? (
                  <Tag>наследуется от {selectedCardKindInfo.sourceNode.name}</Tag>
                ) : selectedEffectiveCardKind === "auto" ? (
                  <Tag>папка / не задан</Tag>
                ) : (
                  <Tag>задан здесь</Tag>
                )}
              </Space>
              <Space wrap>
                <Typography.Text strong>Основная карточка</Typography.Text>
                <Tag color={CARD_KIND_COLORS[selectedEffectiveCardKind] || "default"}>
                  {PRIMARY_CARD_LABELS[selectedEffectiveCardKind] || PRIMARY_CARD_LABELS.auto}
                </Tag>
              </Space>
              <Typography.Text type="secondary">
                {getCardKindDescription(selectedEffectiveCardKind)}
              </Typography.Text>
            </Space>
          </Col>
          <Col xs={24} lg={8}>
            <Space wrap style={{ width: "100%", justifyContent: "flex-end" }}>
              <Tag color={workspaceModels.length || branchModelsRaw.length ? "blue" : "default"}>
                Модели: {selectedNodeIsLeaf ? workspaceModels.length : branchModelsRaw.length}
              </Tag>
              <Tag color={workspaceCatalogPositions.length || branchCatalogPositionsRaw.length ? "purple" : "default"}>
                Товары: {selectedNodeIsLeaf ? workspaceCatalogPositions.length : branchCatalogPositionsRaw.length}
              </Tag>
              {canEditSelectedNode ? (
                <Button size="small" onClick={openEdit}>
                  Настроить
                </Button>
              ) : null}
            </Space>
          </Col>
        </Row>
      </Card>
      <Space wrap>
        {!selectedNodeIsLeaf ? (
          <Button type="primary" onClick={openCreateChild}>
            Добавить подраздел
          </Button>
        ) : null}
        {canEditSelectedNode ? (
          <>
            <Button onClick={openEdit}>
              Изменить раздел
            </Button>
            <Popconfirm
              title="Удалить раздел классификатора?"
              description={selectedNode?.name || ""}
              okText="Удалить"
              cancelText="Отмена"
              onConfirm={handleDelete}
            >
              <Button danger>
                Удалить раздел
              </Button>
            </Popconfirm>
          </>
        ) : null}
      </Space>

      {selectedNodeIsLeaf ? (
        <>
          {shouldShowModelSection ? (
            <Card size="small" title={`Модели оборудования (${workspaceModels.length})`}>
              <Table
                size="small"
                rowKey="id"
                columns={modelsColumns}
                dataSource={workspaceModels}
                loading={workspaceLoading}
                pagination={{ pageSize: 8, showSizeChanger: false }}
                locale={{ emptyText: "В этом разделе пока нет моделей оборудования" }}
                onRow={(row) => ({
                  onDoubleClick: () => openModelDetails(row),
                })}
              />
            </Card>
          ) : null}
          {shouldShowCatalogPositionSection ? (
            <Card size="small" title={`Карточки товара (${workspaceCatalogPositions.length})`}>
              <Table
                size="small"
                rowKey="id"
                columns={catalogPositionColumns}
                dataSource={workspaceCatalogPositions}
                loading={workspaceLoading}
                pagination={{ pageSize: 8, showSizeChanger: false }}
                locale={{ emptyText: "В этом разделе пока нет товарных карточек" }}
                onRow={(row) => ({
                  onDoubleClick: () => openCatalogPositionCard(row),
                })}
              />
            </Card>
          ) : null}
        </>
      ) : (
        renderBranchOverview()
      )}
    </Space>
  )

  const renderManufacturerContent = () => (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <Space wrap>
        <Button type="primary" onClick={openCreateModel}>
          Добавить модель {selectedManufacturerFromTree?.name ? selectedManufacturerFromTree.name : ""}
        </Button>
      </Space>
      <Table
        size="small"
        rowKey="id"
        columns={modelsColumns}
        dataSource={currentManufacturerModels}
        loading={workspaceLoading}
        pagination={false}
        locale={{ emptyText: "У производителя пока нет моделей в этом разделе" }}
        scroll={{ x: 860 }}
      />
    </Space>
  )

  const renderModelPassportTab = () => (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <Space wrap style={{ width: "100%", justifyContent: "space-between" }}>
        <Space wrap>
          <Button size="small" onClick={() => selectedNode && selectClassifierNode(selectedNode)}>
            Назад к моделям
          </Button>
          <Button size="small" onClick={() => openMoveModel(currentModel)}>
            Перенести
          </Button>
        </Space>
        <Button size="small" type="primary" onClick={() => currentModel && openModelAttributes(currentModel)} disabled={!currentModel}>
          Изменить характеристики
        </Button>
      </Space>

      <Card size="small" title="Технические параметры">
        <Table
          size="small"
          rowKey={(row) => row.attribute_id}
          columns={modelDetailsAttributeColumns}
          dataSource={Array.isArray(currentModel?.attribute_values) ? currentModel.attribute_values : []}
          pagination={false}
          locale={{ emptyText: "У модели пока не заполнены характеристики" }}
        />
      </Card>

      <Card
        size="small"
        title="Документы"
        loading={modelDocumentsLoading}
        extra={
          <Upload
            accept=".pdf,.doc,.docx,.xls,.xlsx,image/*,text/plain"
            showUploadList={false}
            customRequest={handleUploadModelDocument}
          >
            <Button size="small" loading={modelDocumentUploading}>
              Загрузить
            </Button>
          </Upload>
        }
      >
        {modelDocuments.length ? (
          <Table
            size="small"
            rowKey="id"
            pagination={false}
            dataSource={modelDocuments}
            columns={[
              {
                title: "Документ",
                render: (_, row) => (
                  <Space direction="vertical" size={0}>
                    <a href={resolveAssetUrl(row.file_url)} target="_blank" rel="noreferrer">
                      {row.file_name || "Документ"}
                    </a>
                    {row.description ? <Typography.Text type="secondary">{row.description}</Typography.Text> : null}
                  </Space>
                ),
              },
              {
                title: "",
                width: 90,
                render: (_, row) => (
                  <Button size="small" danger onClick={() => handleDeleteModelDocument(row.id)}>
                    Удалить
                  </Button>
                ),
              },
            ]}
          />
        ) : (
          <Empty description="Документы модели пока не загружены" />
        )}
      </Card>

      <Card
        size="small"
        title="Фото"
        loading={modelMediaLoading}
        extra={
          <Upload accept="image/*" showUploadList={false} customRequest={handleUploadModelMedia}>
            <Button size="small" loading={modelMediaUploading}>
              Загрузить
            </Button>
          </Upload>
        }
      >
        {modelMedia.length ? (
          <Row gutter={[8, 8]}>
            {modelMedia.map((item) => (
              <Col key={item.id} xs={24} sm={12} lg={8}>
                <Space direction="vertical" size={6} style={{ width: "100%" }}>
                  <Image
                    src={resolveAssetUrl(item.file_url)}
                    alt={item.caption || item.file_name || "Фото модели"}
                    width="100%"
                    height={96}
                    style={{ objectFit: "cover", borderRadius: 6 }}
                  />
                  <Typography.Text type="secondary" ellipsis={{ tooltip: item.caption || item.file_name }}>
                    {item.caption || item.file_name || "Фото"}
                  </Typography.Text>
                  <Button size="small" danger onClick={() => handleDeleteModelMedia(item.id)}>
                    Удалить
                  </Button>
                </Space>
              </Col>
            ))}
          </Row>
        ) : (
          <Empty description="Фото модели пока не загружены" />
        )}
      </Card>

      <Card size="small" title="Заметки">
        <Typography.Paragraph style={{ marginBottom: 0 }}>
          {currentModel?.notes || "Заметки по модели пока не заполнены"}
        </Typography.Paragraph>
      </Card>
    </Space>
  )

  const renderModelBomTab = () => (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <Card
        size="small"
        title={`BOM модели: ${currentModel?.manufacturer_name || ""} ${currentModel?.model_name || ""}`.trim()}
        extra={
          <Space wrap>
            <Button size="small" onClick={() => openBomItemModal()}>
              Добавить строку
            </Button>
            <Button size="small" onClick={() => setBomImportOpen(true)}>
              Импорт Excel
            </Button>
          </Space>
        }
      >
        <Space direction="vertical" size={10} style={{ width: "100%", marginBottom: 12 }}>
          <Space wrap style={{ width: "100%", justifyContent: "space-between" }}>
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="Поиск в BOM: номер, название, классификатор..."
              value={bomSearchQuery}
              onChange={(event) => setBomSearchQuery(event.target.value)}
              style={{ width: 360, maxWidth: "100%" }}
            />
            <Space size={8}>
              <Dropdown
                trigger={["click"]}
                dropdownRender={() => (
                  <Card size="small" style={{ width: 220 }} bodyStyle={{ padding: 10 }}>
                    <Checkbox.Group
                      value={bomVisibleFields}
                      onChange={(values) => setBomVisibleFields(values)}
                      style={{ display: "flex", flexDirection: "column", gap: 8 }}
                    >
                      {BOM_VISIBLE_FIELD_OPTIONS.map((option) => (
                        <Checkbox key={option.value} value={option.value}>
                          {option.label}
                        </Checkbox>
                      ))}
                    </Checkbox.Group>
                  </Card>
                )}
              >
                <Button size="small">Колонки</Button>
              </Dropdown>
              <Button size="small" onClick={() => setBomExpandedKeys(currentModelBomExpandableKeys)}>
                Развернуть все
              </Button>
              <Button size="small" onClick={() => setBomExpandedKeys([])}>
                Свернуть все
              </Button>
            </Space>
          </Space>
        </Space>
        {modelBomLoading ? (
          <Table size="small" loading columns={modelBomColumns} dataSource={[]} pagination={false} />
        ) : currentModelBomTreeData.length ? (
          <Tree
            className="model-bom-tree"
            showLine
            expandedKeys={bomExpandedKeys}
            onExpand={(keys) => setBomExpandedKeys(keys)}
            treeData={currentModelBomTreeData}
            style={{ background: "transparent" }}
          />
        ) : (
          <Empty description="BOM модели пока не собран" />
        )}
      </Card>

    </Space>
  )

  const renderModelUnitsTab = () => (
    <Card
      size="small"
      title="Машины клиентов этой модели"
      extra={
        <Button size="small" type="primary" onClick={openCreateUnit}>
          Добавить машину
        </Button>
      }
    >
      <Table
        size="small"
        rowKey="id"
        columns={compactUnitColumns}
        dataSource={currentModelUnits}
        loading={workspaceLoading}
        pagination={{ pageSize: 10, showSizeChanger: false }}
        locale={{ emptyText: "Для этой модели пока нет машин клиентов" }}
      />
    </Card>
  )

  const renderModelClientPartsTab = () => (
    <Card size="small" title={`Клиентская номенклатура этой модели (${currentModelClientParts.length})`}>
      <Table
        size="small"
        rowKey="id"
        columns={compactClientPartColumns}
        dataSource={currentModelClientParts}
        loading={workspaceLoading}
        pagination={{ pageSize: 10, showSizeChanger: false }}
        locale={{ emptyText: "Для этой модели пока нет деталей клиента" }}
      />
    </Card>
  )

  const renderModelClientExecutionsTab = () => (
    <Card
      size="small"
      title={`Клиентские исполнения (${modelClientExecutions.length})`}
      extra={
        <Space wrap>
          <Select
            allowClear
            size="small"
            placeholder="Статус"
            style={{ width: 190 }}
            value={clientExecutionStatusFilter}
            onChange={setClientExecutionStatusFilter}
            options={UNIT_BOM_STATUS_OPTIONS.filter((item) => item.value !== "as_original").map(({ value, label }) => ({
              value,
              label,
            }))}
          />
          <Checkbox
            checked={clientExecutionMissingDocsOnly}
            onChange={(event) => setClientExecutionMissingDocsOnly(event.target.checked)}
          >
            Без документов
          </Checkbox>
          <Button size="small" onClick={() => currentModel?.id && loadModelClientExecutions(currentModel.id)}>
            Обновить
          </Button>
        </Space>
      }
    >
      <Table
        size="small"
        rowKey={(row) => row.override_id}
        columns={modelClientExecutionColumns}
        dataSource={filteredModelClientExecutions}
        loading={modelClientExecutionsLoading}
        pagination={{ pageSize: 10, showSizeChanger: false }}
        locale={{ emptyText: "Для этой модели пока нет BOM-отличий по машинам клиентов" }}
      />
    </Card>
  )

  const renderModelContent = () => {
    if (!currentModel) return <Empty description="Модель не найдена в выбранном разделе" />
    return (
      <Space direction="vertical" size={12} style={{ width: "100%" }}>
        <Tabs
          activeKey={modelActiveTab}
          onChange={setModelActiveTab}
          items={[
            {
              key: "passport",
              label: "Паспорт",
              children: renderModelPassportTab(),
            },
            {
              key: "model-bom",
              label: `BOM модели (${modelBomItems.length})`,
              children: renderModelBomTab(),
            },
            {
              key: "units",
              label: `Машины клиентов (${currentModelUnits.length})`,
              children: renderModelUnitsTab(),
            },
            {
              key: "client-parts",
              label: `Детали клиента (${currentModelClientParts.length})`,
              children: renderModelClientPartsTab(),
            },
            {
              key: "client-executions",
              label: `Исполнения (${modelClientExecutions.length})`,
              children: renderModelClientExecutionsTab(),
            },
          ]}
        />
      </Space>
    )
  }

  const renderUnitContent = () => (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <Space wrap>
        <Button size="small" onClick={() => selectedUnitFromTree?.equipment_model_id && setSelectedTreeEntity({ type: "model", id: Number(selectedUnitFromTree.equipment_model_id) })}>
          Назад к модели
        </Button>
        <Button size="small" type="primary" onClick={() => openEditUnit(selectedUnitFromTree)}>
          Изменить паспорт
        </Button>
      </Space>

      <Descriptions bordered size="small" column={2}>
        <Descriptions.Item label="Клиент">
          {selectedUnitFromTree?.client_name || "—"}
        </Descriptions.Item>
        <Descriptions.Item label="Модель">
          {[selectedUnitFromTree?.manufacturer_name, selectedUnitFromTree?.model_name].filter(Boolean).join(" ") || "—"}
        </Descriptions.Item>
        <Descriptions.Item label="Серийный номер">
          {selectedUnitFromTree?.serial_number || "—"}
        </Descriptions.Item>
        <Descriptions.Item label="Год">
          {selectedUnitFromTree?.manufacture_year || "—"}
        </Descriptions.Item>
        <Descriptions.Item label="Площадка" span={2}>
          {selectedUnitFromTree?.site_name || "—"}
        </Descriptions.Item>
        <Descriptions.Item label="Заметки" span={2}>
          {selectedUnitFromTree?.notes || "—"}
        </Descriptions.Item>
      </Descriptions>
      <Space wrap>
        <Button onClick={() => selectedUnitFromTree?.client_id && navigate(`/clients/${selectedUnitFromTree.client_id}`)}>
          Открыть клиента
        </Button>
      </Space>

      <Card size="small" title="Паспорт машины">
        <Table
          size="small"
          rowKey={(row) => row.id}
          columns={modelDetailsAttributeColumns}
          dataSource={unitPassportRows}
          loading={unitPassportLoading}
          pagination={false}
          locale={{ emptyText: "Для этой машины пока не заполнены паспортные характеристики" }}
        />
      </Card>

      <Card
        size="small"
        title={`BOM базовой модели (${currentUnitBomRows.length})`}
        extra={
          currentUnitBomOverridesCount ? (
            <Tag color="orange">Отличий: {currentUnitBomOverridesCount}</Tag>
          ) : (
            <Tag color="green">Как в базовой модели</Tag>
          )
        }
      >
        <Table
          size="small"
          rowKey="id"
          columns={unitBomColumns}
          dataSource={currentUnitBomRows}
          loading={unitBomLoading}
          pagination={{ pageSize: 20, showSizeChanger: false }}
          locale={{ emptyText: "Для модели этой машины пока не собран BOM" }}
        />
      </Card>

      <Card size="small" title={`Особенности и детали клиента (${currentUnitClientParts.length})`}>
        <Table
          size="small"
          rowKey="id"
          columns={compactClientPartColumns}
          dataSource={currentUnitClientParts}
          loading={workspaceLoading}
          pagination={{ pageSize: 8, showSizeChanger: false }}
          locale={{ emptyText: "Для этой машины пока нет клиентских отличий" }}
        />
      </Card>
    </Space>
  )

  const renderCatalogPositionContent = () => {
    if (!selectedCatalogPosition) return <Empty description="Карточка товара не найдена в выбранном разделе" />
    const attributeRows = Array.isArray(selectedCatalogPosition.attribute_values)
      ? selectedCatalogPosition.attribute_values
      : []

    const passportTab = (
      <Card size="small" title="Паспорт">
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Descriptions bordered size="small" column={2}>
            <Descriptions.Item label="Наименование" span={2}>
              {selectedCatalogPosition.display_name || "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Код">
              {selectedCatalogPosition.position_code || "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Единица измерения">
              {formatMeasurementUnit(selectedCatalogPosition.uom) || selectedCatalogPosition.uom || "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Раздел классификатора" span={2}>
              {selectedCatalogPosition.classifier_node_name || selectedNode?.name || "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Описание" span={2}>
              {selectedCatalogPosition.description || "—"}
            </Descriptions.Item>
          </Descriptions>

          <Divider style={{ margin: "8px 0" }} />
          <Typography.Title level={5} style={{ margin: 0 }}>
            Характеристики
          </Typography.Title>
          <Table
            size="small"
            rowKey={(row) => row.attribute_id}
            columns={modelDetailsAttributeColumns}
            dataSource={attributeRows}
            pagination={false}
            locale={{ emptyText: "У карточки товара пока не заполнены характеристики" }}
          />
        </Space>
      </Card>
    )

    const usageTab = (
      <Card
        size="small"
        title={`Где используется в BOM (${catalogPositionUsage.length})`}
        extra={
          <Button size="small" onClick={() => loadCatalogPositionUsage(selectedCatalogPosition.id)}>
            Обновить
          </Button>
        }
      >
        <Table
          size="small"
          rowKey="bom_item_id"
          columns={catalogPositionUsageColumns}
          dataSource={catalogPositionUsage}
          loading={catalogPositionUsageLoading}
          pagination={{ pageSize: 12, showSizeChanger: false }}
          locale={{ emptyText: "Эта карточка товара пока не используется в BOM моделей" }}
        />
      </Card>
    )

    return (
      <Space direction="vertical" size={12} style={{ width: "100%" }}>
        <Space wrap>
          <Button size="small" onClick={() => selectedNode && selectClassifierNode(selectedNode)}>
            Назад к разделу
          </Button>
          <Tag color="purple">Карточка товара</Tag>
          {selectedCatalogPosition.position_code ? <Tag>{selectedCatalogPosition.position_code}</Tag> : null}
          <Tag color={catalogPositionUsage.length ? "blue" : "default"}>BOM: {catalogPositionUsage.length}</Tag>
        </Space>

        <Tabs
          items={[
            {
              key: "passport",
              label: "Паспорт",
              children: passportTab,
            },
            {
              key: "usage",
              label: `Где используется (${catalogPositionUsage.length})`,
              children: usageTab,
            },
            {
              key: "suppliers",
              label: "Поставщики",
              children: (
                <Card size="small" title="Поставщики">
                  <Empty description="Связь поставщиков с карточкой товара еще не настроена" />
                </Card>
              ),
            },
            {
              key: "documents",
              label: "Документы",
              children: (
                <Card size="small" title="Документы">
                  <Empty description="Документы карточки товара будут следующим слоем" />
                </Card>
              ),
            },
          ]}
        />
      </Space>
    )
  }

  const renderContextContent = () => {
    if (nsiSearchActive) return renderSearchResults()
    if (!selectedNode) return <Empty description="Выберите раздел слева" />
    if (selectedTreeEntity.type === "manufacturer") return renderManufacturerContent()
    if (selectedTreeEntity.type === "model") return renderModelContent()
    if (selectedTreeEntity.type === "catalog_position") return renderCatalogPositionContent()
    if (selectedTreeEntity.type === "unit") return renderUnitContent()
    return renderNodeContent()
  }

  const contextTitle =
    nsiSearchActive
      ? "Результаты поиска"
      : selectedTreeEntity.type === "manufacturer"
      ? selectedManufacturerFromTree?.name || "Производитель"
      : selectedTreeEntity.type === "model"
        ? [currentModel?.manufacturer_name, currentModel?.model_name].filter(Boolean).join(" ") || "Модель"
        : selectedTreeEntity.type === "catalog_position"
          ? selectedCatalogPosition?.display_name || "Карточка товара"
        : selectedTreeEntity.type === "unit"
          ? selectedUnitFromTree?.client_name || "Машина клиента"
          : selectedNode?.name || null

  const canEditSelectedNode = selectedTreeEntity.type === "node" && selectedNode
  const nodeCardKindOption = CARD_KIND_OPTIONS.find((option) => option.value === nodeCardKind) || CARD_KIND_OPTIONS[0]
  const addMenuItems = [
    {
      key: "root-section",
      label: "Раздел верхнего уровня",
    },
    {
      key: "child-section",
      label: selectedNode ? `Подраздел в "${selectedNode.name}"` : "Подраздел",
      disabled: !canEditSelectedNode,
    },
    {
      key: "model",
      label: selectedNode ? `Модель в "${selectedNode.name}"` : "Модель",
      disabled: !selectedNode || !selectedNodeIsLeaf,
    },
  ]

  const renderBomFiltersPanel = () => (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <div>
        <Typography.Text type="secondary" style={{ display: "block", marginBottom: 4 }}>
          Тип строки
        </Typography.Text>
        <Select
          allowClear
          placeholder="Любой"
          value={bomFilters.rowKind}
          onChange={(value) => setBomFilterValue("rowKind", value)}
          options={BOM_ROW_KIND_OPTIONS.map((option) => ({
            value: option.value,
            label: option.label,
          }))}
          style={{ width: "100%" }}
        />
      </div>

      <div>
        <Typography.Text type="secondary" style={{ display: "block", marginBottom: 4 }}>
          ТН ВЭД
        </Typography.Text>
        <Select
          allowClear
          mode="multiple"
          maxTagCount="responsive"
          placeholder={bomTnvedFilterOptions.length ? "Выберите код" : "В этом BOM кодов пока нет"}
          value={bomFilters.tnvedCodes || []}
          onChange={(value) => setBomFilterValue("tnvedCodes", value)}
          options={bomTnvedFilterOptions}
          disabled={!bomTnvedFilterOptions.length}
          style={{ width: "100%" }}
        />
      </div>

      <div>
        <Typography.Text type="secondary" style={{ display: "block", marginBottom: 4 }}>
          Масса, кг
        </Typography.Text>
        <Space.Compact style={{ width: "100%" }}>
          <InputNumber
            placeholder="от"
            min={0}
            value={bomFilters.weightMin}
            onChange={(value) => setBomFilterValue("weightMin", value)}
            style={{ width: "50%" }}
          />
          <InputNumber
            placeholder="до"
            min={0}
            value={bomFilters.weightMax}
            onChange={(value) => setBomFilterValue("weightMax", value)}
            style={{ width: "50%" }}
          />
        </Space.Compact>
      </div>

      <div>
        <Typography.Text type="secondary" style={{ display: "block", marginBottom: 4 }}>
          Габариты, {dimensionUnitSymbol}
        </Typography.Text>
        <Typography.Text type="secondary" style={{ display: "block", fontSize: 12, marginBottom: 4 }}>
          Длина
        </Typography.Text>
        <Space.Compact style={{ width: "100%", marginBottom: 6 }}>
          <InputNumber
            placeholder="от"
            min={0}
            value={bomFilters.lengthMin}
            onChange={(value) => setBomFilterValue("lengthMin", value)}
            style={{ width: "50%" }}
          />
          <InputNumber
            placeholder="до"
            min={0}
            value={bomFilters.lengthMax}
            onChange={(value) => setBomFilterValue("lengthMax", value)}
            style={{ width: "50%" }}
          />
        </Space.Compact>
        <Typography.Text type="secondary" style={{ display: "block", fontSize: 12, marginBottom: 4 }}>
          Ширина
        </Typography.Text>
        <Space.Compact style={{ width: "100%", marginBottom: 6 }}>
          <InputNumber
            placeholder="от"
            min={0}
            value={bomFilters.widthMin}
            onChange={(value) => setBomFilterValue("widthMin", value)}
            style={{ width: "50%" }}
          />
          <InputNumber
            placeholder="до"
            min={0}
            value={bomFilters.widthMax}
            onChange={(value) => setBomFilterValue("widthMax", value)}
            style={{ width: "50%" }}
          />
        </Space.Compact>
        <Typography.Text type="secondary" style={{ display: "block", fontSize: 12, marginBottom: 4 }}>
          Высота
        </Typography.Text>
        <Space.Compact style={{ width: "100%" }}>
          <InputNumber
            placeholder="от"
            min={0}
            value={bomFilters.heightMin}
            onChange={(value) => setBomFilterValue("heightMin", value)}
            style={{ width: "50%" }}
          />
          <InputNumber
            placeholder="до"
            min={0}
            value={bomFilters.heightMax}
            onChange={(value) => setBomFilterValue("heightMax", value)}
            style={{ width: "50%" }}
          />
        </Space.Compact>
      </div>

      <div>
        <Typography.Text type="secondary" style={{ display: "block", marginBottom: 4 }}>
          Материал
        </Typography.Text>
        <Select
          allowClear
          mode="multiple"
          maxTagCount="responsive"
          placeholder={bomMaterialFilterOptions.length ? "Выберите материал" : "В этом BOM материалов пока нет"}
          value={bomFilters.materialValues || []}
          onChange={(value) => setBomFilterValue("materialValues", value)}
          options={bomMaterialFilterOptions}
          disabled={!bomMaterialFilterOptions.length}
          style={{ width: "100%" }}
        />
      </div>

      {activeBomFiltersCount ? (
        <Button size="small" onClick={() => setBomFilters({})}>
          Сбросить фильтры BOM
        </Button>
      ) : null}
    </Space>
  )

  const renderFiltersPanel = () => {
    if (isModelBomContext) return renderBomFiltersPanel()

    const manufacturerFilterControl = manufacturerFilterOptions.length ? (
      <div>
        <Typography.Text type="secondary" style={{ display: "block", marginBottom: 4 }}>
          Производитель
        </Typography.Text>
        <Select
          allowClear
          placeholder="Любой"
          value={manufacturerFilter}
          onChange={setManufacturerFilter}
          options={manufacturerFilterOptions}
          style={{ width: "100%" }}
        />
      </div>
    ) : null
    const branchSectionFilterControl =
      !selectedNodeIsLeaf && branchSectionFilterOptions.length ? (
        <div>
          <Typography.Text type="secondary" style={{ display: "block", marginBottom: 4 }}>
            Подраздел
          </Typography.Text>
          <Select
            allowClear
            placeholder="Все подразделы"
            value={branchSectionFilter}
            onChange={setBranchSectionFilter}
            options={branchSectionFilterOptions}
            style={{ width: "100%" }}
          />
        </div>
      ) : null

    if (!selectedNode) return <Empty description="Выберите раздел" />
    if (!selectedNodeIsLeaf) {
      if (!manufacturerFilterControl && !branchSectionFilterControl) {
        return <Empty description="В этой ветке пока нет моделей" />
      }
      return (
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          {branchSectionFilterControl}
          {manufacturerFilterControl}
        </Space>
      )
    }
    if (!filterableAttributes.length) {
      return manufacturerFilterControl ? (
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          {manufacturerFilterControl}
        </Space>
      ) : (
        <Empty description="Характеристики для фильтров не настроены" />
      )
    }
    return (
      <Space direction="vertical" size={12} style={{ width: "100%" }}>
        {manufacturerFilterControl}
        {filterableAttributes.map((attribute) => renderAttributeFilterControl(attribute))}
        {hasActiveAttributeFilters ? (
          <Button size="small" onClick={() => setAttributeFilters({})}>
            Сбросить фильтры
          </Button>
        ) : null}
      </Space>
    )
  }

  const sidePanelBodyStyle = {
    height: "calc(100vh - 230px)",
    minHeight: 440,
    overflowY: "auto",
  }
  const sidePanelStyle = {
    position: "sticky",
    top: 8,
  }

  return (
    <Space direction="vertical" size={10} style={{ width: "100%" }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <Input.Search
          allowClear
          enterButton="Найти"
          placeholder="Номер детали производителя, модель, клиент, серийный номер, чертеж или название детали"
          value={nsiSearchQuery}
          onChange={(event) => {
            const value = event.target.value
            setNsiSearchQuery(value)
            if (!value) {
              setNsiSearchActive(false)
              setNsiSearchRows([])
            }
          }}
          onSearch={handleNsiSearch}
          loading={nsiSearchLoading}
          style={{ flex: 1, minWidth: 0 }}
        />
        <Button
          onClick={() => setStoredFiltersPanelOpen(!filtersPanelOpen)}
          type={filtersPanelOpen || currentFiltersCount ? "primary" : "default"}
        >
          {currentFiltersCount ? `Фильтры: ${currentFiltersCount}` : "Фильтры"}
        </Button>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "flex-start", width: "100%" }}>
        <div style={{ width: classifierTreeWidth, flex: `0 0 ${classifierTreeWidth}px`, position: "relative" }}>
          <Card
            title="Дерево классификатора"
            loading={loading}
            extra={
              <Dropdown
                menu={{
                  items: addMenuItems,
                  onClick: ({ key }) => {
                    if (key === "root-section") openCreateRoot()
                    if (key === "child-section") openCreateChild()
                    if (key === "model") openCreateModel()
                  },
                }}
                trigger={["click"]}
              >
                <Button type="primary" size="small">+ Добавить</Button>
              </Dropdown>
            }
            size="small"
            style={sidePanelStyle}
            styles={{ body: sidePanelBodyStyle }}
          >
            {treeData.length ? (
              <Tree
                expandedKeys={classifierExpandedKeys}
                onExpand={(keys) => setClassifierExpandedKeys(keys)}
                selectedKeys={selectedTreeKey ? [selectedTreeKey] : []}
                onSelect={handleTreeSelect}
                treeData={treeData}
              />
            ) : (
              <Empty description="Классификатор пока пуст" />
            )}
          </Card>
          <div
            role="separator"
            aria-label="Изменить ширину дерева классификатора"
            onMouseDown={handleTreeResizeStart}
            title="Потяните, чтобы изменить ширину дерева"
            style={{
              position: "absolute",
              top: 0,
              right: -6,
              width: 10,
              height: "100%",
              cursor: "col-resize",
              zIndex: 2,
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: 4,
                transform: "translateY(-50%)",
                width: 3,
                height: 44,
                borderRadius: 4,
                background: "#d9d9d9",
                boxShadow: "0 0 0 1px #f5f5f5",
              }}
            />
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <Card
            title={contextTitle}
            size="small"
            styles={{ body: { minHeight: 520 } }}
          >
            {renderContextContent()}
          </Card>
        </div>

        {filtersPanelOpen ? (
          <div style={{ width: 320, flex: "0 0 320px" }}>
          <Card
            title="Фильтры"
            extra={
              <Space size={6}>
                {isModelBomContext && activeBomFiltersCount ? (
                  <Button size="small" onClick={() => setBomFilters({})}>
                    Сбросить
                  </Button>
                ) : null}
                {!isModelBomContext && (hasActiveAttributeFilters || manufacturerFilter || branchSectionFilter) ? (
                  <Button
                    size="small"
                    onClick={() => {
                      setManufacturerFilter(null)
                      setBranchSectionFilter(null)
                      setAttributeFilters({})
                    }}
                  >
                    Сбросить
                  </Button>
                ) : null}
                {!isModelBomContext && selectedNodeIsLeaf ? (
                  <Button size="small" onClick={openManageAttributes}>
                    Настроить
                  </Button>
                ) : null}
              </Space>
            }
            size="small"
            style={sidePanelStyle}
            styles={{ body: sidePanelBodyStyle }}
          >
            {renderFiltersPanel()}
          </Card>
          </div>
        ) : null}
      </div>

      <Drawer
        open={modelDetailsOpen}
        title={
          detailsModel
            ? `${detailsModel.manufacturer_name || ""} ${detailsModel.model_name || ""}`.trim() || "Модель оборудования"
            : "Модель оборудования"
        }
        onClose={() => setModelDetailsOpen(false)}
        width={760}
      >
        {detailsModel ? (
          <Space direction="vertical" size={12} style={{ width: "100%" }}>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="Производитель">
                {detailsModel.manufacturer_name || "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Модель">
                {detailsModel.model_name || "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Раздел классификатора">
                {detailsModel.classifier_node_name || "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Позиции BOM">
                {Number(currentModelBomStats.total) || 0}
              </Descriptions.Item>
              <Descriptions.Item label="Машин клиентов">
                {Number(detailsModel.units_count) || 0}
              </Descriptions.Item>
              <Descriptions.Item label="Заметки" span={2}>
                {detailsModel.notes || "—"}
              </Descriptions.Item>
            </Descriptions>

            <Card
              size="small"
              title="Заметки"
              extra={
                <Button size="small" type="primary" loading={modelDetailsSaving} onClick={handleSaveModelDetails}>
                  Сохранить
                </Button>
              }
            >
              <Form form={modelDetailsForm} layout="vertical">
                <Form.Item label="Заметки" name="notes">
                  <Input.TextArea rows={3} />
                </Form.Item>
              </Form>
            </Card>

            <Card
              size="small"
              title={`Фото модели (${modelMedia.length})`}
              loading={modelMediaLoading}
              extra={
                <Upload
                  accept="image/*"
                  showUploadList={false}
                  customRequest={handleUploadModelMedia}
                >
                  <Button size="small" loading={modelMediaUploading}>
                    Загрузить фото
                  </Button>
                </Upload>
              }
            >
              {modelMedia.length ? (
                <Space wrap align="start">
                  {modelMedia.map((item) => (
                    <div key={item.id} style={{ width: 132 }}>
                      <Image
                        src={resolveAssetUrl(item.file_url)}
                        alt={item.caption || item.file_name || "Фото модели"}
                        width={132}
                        height={96}
                        preview={false}
                        style={{ objectFit: "cover", borderRadius: 6 }}
                      />
                      <Button
                        size="small"
                        danger
                        style={{ marginTop: 6, width: "100%" }}
                        onClick={() => handleDeleteModelMedia(item.id)}
                      >
                        Удалить
                      </Button>
                    </div>
                  ))}
                </Space>
              ) : (
                <Empty description="Фото модели пока не загружены" />
              )}
            </Card>

            <Card
              size="small"
              title="Характеристики модели"
              extra={
                <Button size="small" onClick={() => openModelAttributes(detailsModel)}>
                  Изменить
                </Button>
              }
            >
              <Table
                size="small"
                rowKey={(row) => row.attribute_id}
                columns={modelDetailsAttributeColumns}
                dataSource={Array.isArray(detailsModel.attribute_values) ? detailsModel.attribute_values : []}
                pagination={false}
                locale={{ emptyText: "У модели пока не заполнены характеристики" }}
              />
            </Card>

            <Card size="small" title={`Машины клиентов (${selectedModelUnits.length})`}>
              <Table
                size="small"
                rowKey="id"
                columns={compactUnitColumns}
                dataSource={selectedModelUnits}
                pagination={{ pageSize: 6, showSizeChanger: false }}
                locale={{ emptyText: "Для этой модели пока нет машин клиентов" }}
              />
            </Card>

            <Card size="small" title={`Детали клиентов (${selectedModelClientParts.length})`}>
              <Table
                size="small"
                rowKey="id"
                columns={compactClientPartColumns}
                dataSource={selectedModelClientParts}
                pagination={{ pageSize: 6, showSizeChanger: false }}
                locale={{ emptyText: "Для этой модели пока нет деталей клиентов" }}
              />
            </Card>
          </Space>
        ) : (
          <Empty description="Модель не выбрана" />
        )}
      </Drawer>

      <Drawer
        open={clientPartDrawerOpen}
        title={clientPartDetails?.display_name || clientPartDetails?.client_part_number || "Деталь клиента"}
        width={720}
        loading={clientPartDetailsLoading}
        onClose={() => {
          setClientPartDrawerOpen(false)
          setClientPartDetails(null)
          setClientPartDocuments([])
        }}
        extra={
          clientPartDetails?.client_id ? (
            <Button size="small" onClick={() => navigate(`/clients/${clientPartDetails.client_id}`)}>
              Открыть клиента
            </Button>
          ) : null
        }
      >
        {clientPartDetails ? (
          <Space direction="vertical" size={12} style={{ width: "100%" }}>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="Клиент" span={2}>
                {clientPartDetails.client_name || "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Номер клиента">
                {clientPartDetails.client_part_number || "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Чертеж / ревизия">
                {[clientPartDetails.drawing_number, clientPartDetails.revision_code ? `рев. ${clientPartDetails.revision_code}` : null]
                  .filter(Boolean)
                  .join(" / ") || "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Тип">
                <Tag color={CLIENT_PART_TYPE_COLORS[clientPartDetails.relationship_type] || "default"}>
                  {CLIENT_PART_TYPE_LABELS[clientPartDetails.relationship_type] || clientPartDetails.relationship_type || "—"}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Раздел">
                {clientPartDetails.classifier_node_name || "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Базовая деталь производителя" span={2}>
                {[clientPartDetails.base_oem_part_number, clientPartDetails.base_oem_manufacturer_name, clientPartDetails.base_oem_description_ru || clientPartDetails.base_oem_description_en]
                  .filter(Boolean)
                  .join(" / ") || "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Отличие" span={2}>
                {clientPartDetails.difference_summary || "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Описание" span={2}>
                {clientPartDetails.description_ru || "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Заметки" span={2}>
                {clientPartDetails.notes || "—"}
              </Descriptions.Item>
            </Descriptions>

            <Card size="small" title={`Применяемость (${Array.isArray(clientPartDetails.applications) ? clientPartDetails.applications.length : 0})`}>
              <Table
                size="small"
                rowKey="id"
                columns={clientPartApplicationColumns}
                dataSource={Array.isArray(clientPartDetails.applications) ? clientPartDetails.applications : []}
                pagination={false}
                locale={{ emptyText: "Применяемость пока не указана" }}
              />
            </Card>

            <Card
              size="small"
              title={`Документы и чертежи (${clientPartDocuments.length})`}
              extra={
                <Upload showUploadList={false} customRequest={handleUploadClientPartDocument}>
                  <Button size="small" loading={clientPartDocumentUploading}>
                    Загрузить
                  </Button>
                </Upload>
              }
            >
              <Table
                size="small"
                rowKey="id"
                columns={clientPartDocumentColumns}
                dataSource={clientPartDocuments}
                pagination={false}
                locale={{ emptyText: "Документы детали клиента пока не загружены" }}
              />
            </Card>
          </Space>
        ) : (
          <Empty description="Деталь клиента не выбрана" />
        )}
      </Drawer>

      <Drawer
        open={bomItemCardOpen}
        title={
          selectedBomItem ? (
            <Space direction="vertical" size={0}>
              <Typography.Text strong>{getBomItemName(selectedBomItem) || getBomItemLabel(selectedBomItem)}</Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {getBomManufacturerNumber(selectedBomItem)} · {getBomItemTypeLabel(selectedBomItem)} ·{" "}
                {formatBomQuantity(selectedBomItem)}
              </Typography.Text>
            </Space>
          ) : (
            "Позиция BOM"
          )
        }
        width={720}
        onClose={() => {
          setBomItemCardOpen(false)
          setSelectedBomItem(null)
          setBomPositionDetails(null)
          setBomWarehouseDetails(null)
          setBomWarehouseAction(null)
          setBomCardActiveTab("main")
        }}
        extra={
          selectedBomItem ? (
            <Space>
              <Button size="small" onClick={() => openBomItemModal(selectedBomItem)}>
                Редактировать
              </Button>
              <Button
                size="small"
                danger
                onClick={() => handleDeleteBomItem(selectedBomItem)}
              >
                Удалить
              </Button>
            </Space>
          ) : null
        }
      >
        {selectedBomItem ? (
          <Tabs
            className="bom-card-tabs"
            activeKey={bomCardActiveTab}
            onChange={setBomCardActiveTab}
            items={[
              {
                key: "main",
                label: "Основное",
                children: (
                  <Space direction="vertical" size={16} style={{ width: "100%" }}>
                    <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                      <div
                        style={{
                          width: 148,
                          minWidth: 148,
                          border: "1px solid #f0f0f0",
                          borderRadius: 6,
                          background: "#fafafa",
                          padding: 8,
                        }}
                      >
                        {bomPrimaryPhoto?.file_url ? (
                          <Image
                            src={bomPrimaryPhoto.file_url}
                            alt={bomPrimaryPhoto.caption || getBomItemName(selectedBomItem) || "Фото позиции"}
                            width="100%"
                            height={120}
                            style={{ objectFit: "cover", borderRadius: 4 }}
                          />
                        ) : (
                          <div
                            style={{
                              height: 120,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#999",
                            }}
                          >
                            Фото пока нет
                          </div>
                        )}
                        <Upload accept="image/*" showUploadList={false} customRequest={handleUploadBomCardPhoto}>
                          <Button
                            size="small"
                            icon={<UploadOutlined />}
                            loading={bomCardPhotoUploading}
                            block
                            style={{ marginTop: 8 }}
                          >
                            Загрузить
                          </Button>
                        </Upload>
                      </div>
                      <Space direction="vertical" size={8} style={{ flex: 1 }}>
                        <Space size={6} wrap>
                          <Tag>{getBomItemTypeLabel(selectedBomItem)}</Tag>
                          <Tag>{getBomLinkStatusLabel(selectedBomItem)}</Tag>
                          {selectedBomChildren.length ? <Tag>{selectedBomChildren.length} внутри</Tag> : null}
                        </Space>
                        <div>
                          <Typography.Text type="secondary">Каталожный номер производителя</Typography.Text>
                          <Typography.Title level={4} style={{ margin: "2px 0 0" }}>
                            {getBomManufacturerNumber(selectedBomItem)}
                          </Typography.Title>
                        </div>
                        <Typography.Text strong>{getBomItemName(selectedBomItem) || "Название не заполнено"}</Typography.Text>
                        {selectedBomItem.notes ? (
                          <Typography.Paragraph style={{ marginBottom: 0 }}>{selectedBomItem.notes}</Typography.Paragraph>
                        ) : null}
                      </Space>
                    </div>

                    <Descriptions size="small" bordered column={1}>
                      <Descriptions.Item label="Производитель">
                        {selectedBomItem.manufacturer_name || currentModel?.manufacturer_name || "—"}
                      </Descriptions.Item>
                      <Descriptions.Item label="Модель">
                        {[currentModel?.manufacturer_name, currentModel?.model_name].filter(Boolean).join(" ") || "—"}
                      </Descriptions.Item>
                      <Descriptions.Item label="Название EN">{getBomTitleEn(selectedBomItem)}</Descriptions.Item>
                      <Descriptions.Item label="Название RU">{getBomTitleRu(selectedBomItem)}</Descriptions.Item>
                      <Descriptions.Item label="Количество в этом месте">
                        {formatBomQuantity(selectedBomItem)}
                      </Descriptions.Item>
                      <Descriptions.Item label="Где находится">
                        {selectedBomParent
                          ? `${getBomItemLabel(selectedBomParent)} — ${getBomItemName(selectedBomParent) || "узел"}`
                          : "В корне BOM модели"}
                      </Descriptions.Item>
                      <Descriptions.Item label="Связь с общей позицией">
                        {selectedBomItem.catalog_position_id && !isBomOwnCatalogPosition(selectedBomItem) ? (
                          <Typography.Link onClick={() => openBomItemCatalogPosition(selectedBomItem)}>
                            {[
                              bomCardPosition?.manufacturer_part_number || selectedBomItem.catalog_position_code,
                              bomCardPosition?.display_name || selectedBomItem.catalog_position_name,
                            ]
                              .filter(Boolean)
                              .join(" — ") || "Открыть связанную позицию"}
                          </Typography.Link>
                        ) : (
                          "Не связана"
                        )}
                      </Descriptions.Item>
                    </Descriptions>

                    <Form form={bomCardForm} layout="vertical">
                      <Space direction="vertical" size={16} style={{ width: "100%" }}>
                        <Card
                          size="small"
                          title="Характеристики"
                          loading={bomPositionDetailsLoading}
                          extra={
                            <Button size="small" type="primary" loading={bomCardSaving} onClick={handleSaveBomCardData}>
                              Сохранить
                            </Button>
                          }
                        >
                          <Row gutter={12}>
                            <Col span={8}>
                              <Form.Item label="Масса, кг" name="weight_kg">
                                <InputNumber min={0} precision={3} style={{ width: "100%" }} placeholder="например 1250" />
                              </Form.Item>
                            </Col>
                            <Col span={16}>
                              <Form.Item label={`Габариты, ${dimensionUnitSymbol}`}>
                                <Space.Compact style={{ width: "100%" }}>
                                  <Form.Item name="length_mm" noStyle>
                                    <InputNumber min={0} precision={1} style={{ width: "33.33%" }} placeholder="Длина" />
                                  </Form.Item>
                                  <Form.Item name="width_mm" noStyle>
                                    <InputNumber min={0} precision={1} style={{ width: "33.33%" }} placeholder="Ширина" />
                                  </Form.Item>
                                  <Form.Item name="height_mm" noStyle>
                                    <InputNumber min={0} precision={1} style={{ width: "33.33%" }} placeholder="Высота" />
                                  </Form.Item>
                                </Space.Compact>
                              </Form.Item>
                            </Col>
                          </Row>
                          <Row gutter={12}>
                            <Col span={10}>
                              <Form.Item label="Единица измерения">
                                <Input
                                  value={selectedBomItem.uom || selectedBomItem.catalog_position_uom || bomPositionDetails?.position?.uom || "шт"}
                                  disabled
                                />
                              </Form.Item>
                            </Col>
                            <Col span={14}>
                              <Form.Item label="Код ТН ВЭД" name="tnved">
                                <TnvedPicker
                                  placeholder="Искать по названию детали, материалу или описанию"
                                  catalogPositionId={selectedBomItem?.catalog_position_id}
                                />
                              </Form.Item>
                            </Col>
                          </Row>
                          <Form.Item label="Описание" name="description">
                            <Input.TextArea autoSize={{ minRows: 2, maxRows: 5 }} placeholder="Краткое описание позиции для карточки и поиска" />
                          </Form.Item>
                        </Card>

                        {selectedBomAnalogPosition || bomCardPrimaryPositions.length || visibleBomCardAnalogPositions.length ? (
                          <Card size="small" title="Основная карточка и аналоги" loading={bomPositionDetailsLoading}>
                            <Space direction="vertical" size={12} style={{ width: "100%" }}>
                              {selectedBomAnalogPosition && bomCardPosition ? (
                                <Alert
                                  type="info"
                                  showIcon
                                  message="Эта строка BOM является аналогом основной карточки"
                                  description={
                                    <Space direction="vertical" size={2}>
                                      <Typography.Text>
                                        Основная карточка:{" "}
                                        <Typography.Text strong>
                                          {[
                                            bomCardPosition.manufacturer_part_number || bomCardPosition.position_code,
                                            bomCardPosition.display_name,
                                          ]
                                            .filter(Boolean)
                                            .join(" — ") || "—"}
                                        </Typography.Text>
                                      </Typography.Text>
                                      <Typography.Text type="secondary">
                                        Номер в этой BOM:{" "}
                                        <Typography.Link onClick={() => openBomRelatedCatalogPosition(selectedBomAnalogPosition)}>
                                          {[
                                            selectedBomAnalogPosition.manufacturer_part_number || getBomManufacturerNumber(selectedBomItem),
                                            selectedBomAnalogPosition.display_name || getBomItemName(selectedBomItem),
                                          ]
                                            .filter(Boolean)
                                            .join(" — ") || "—"}
                                        </Typography.Link>
                                      </Typography.Text>
                                    </Space>
                                  }
                                />
                              ) : null}
                              {bomCardPrimaryPositions.length ? (
                                <div>
                                  <Typography.Text type="secondary">Основная карточка для этой позиции</Typography.Text>
                                  <Table
                                    size="small"
                                    rowKey="relation_id"
                                    pagination={false}
                                    dataSource={bomCardPrimaryPositions}
                                    columns={[
                                      {
                                        title: "Карточка",
                                        render: (_, row) => (
                                          <Space direction="vertical" size={0}>
                                            <Typography.Link strong onClick={() => openBomRelatedCatalogPosition(row)}>
                                              {[row.manufacturer_part_number || row.position_code, row.display_name].filter(Boolean).join(" — ") || "—"}
                                            </Typography.Link>
                                            <Typography.Text type="secondary">
                                              {[row.manufacturer_name, row.model_name].filter(Boolean).join(" / ") || "Общий каталог"}
                                            </Typography.Text>
                                          </Space>
                                        ),
                                      },
                                      { title: "Роль", width: 110, render: () => <Tag color="blue">Основная</Tag> },
                                    ]}
                                  />
                                </div>
                              ) : null}
                              {visibleBomCardAnalogPositions.length ? (
                                <div>
                                  <Typography.Text type="secondary">Аналоги этой карточки</Typography.Text>
                                  <Table
                                    size="small"
                                    rowKey="relation_id"
                                    pagination={false}
                                    dataSource={visibleBomCardAnalogPositions}
                                    columns={[
                                      {
                                        title: "Карточка",
                                        render: (_, row) => (
                                          <Space direction="vertical" size={0}>
                                            <Typography.Link strong onClick={() => openBomRelatedCatalogPosition(row)}>
                                              {[row.manufacturer_part_number || row.position_code, row.display_name].filter(Boolean).join(" — ") || "—"}
                                            </Typography.Link>
                                            <Typography.Text type="secondary">
                                              {[row.manufacturer_name, row.model_name].filter(Boolean).join(" / ") || "Общий каталог"}
                                            </Typography.Text>
                                          </Space>
                                        ),
                                      },
                                      { title: "Роль", width: 110, render: () => <Tag color="green">Аналог</Tag> },
                                    ]}
                                  />
                                </div>
                              ) : null}
                            </Space>
                          </Card>
                        ) : null}

                        <Card
                          size="small"
                          title="Материалы и исполнения"
                          loading={bomPositionDetailsLoading}
                          extra={
                            <Button size="small" onClick={() => openBomMaterialModal()}>
                              Добавить материал
                            </Button>
                          }
                        >
                          {bomCardMaterials.length ? (
                            <Table
                              size="small"
                              rowKey="id"
                              pagination={false}
                              dataSource={bomCardMaterials}
                              columns={[
                                {
                                  title: "Материал",
                                  render: (_, row) => (
                                    <Space direction="vertical" size={0}>
                                      <Typography.Text strong>
                                        {[row.name, row.code, row.standard].filter(Boolean).join(" / ") || "—"}
                                      </Typography.Text>
                                      {row.variant_name ? <Typography.Text type="secondary">{row.variant_name}</Typography.Text> : null}
                                    </Space>
                                  ),
                                },
                                { title: "Статус", width: 110, render: (_, row) => (row.is_default ? <Tag color="green">Основной</Tag> : "—") },
                                { title: "Примечание", render: (_, row) => row.note || "—" },
                                {
                                  title: "",
                                  width: 150,
                                  render: (_, row) => (
                                    <Space size={4}>
                                      <Button size="small" onClick={() => openBomMaterialModal(row)}>
                                        Изменить
                                      </Button>
                                      <Popconfirm
                                        title="Удалить материал из карточки?"
                                        okText="Удалить"
                                        cancelText="Отмена"
                                        onConfirm={() => handleDeleteBomMaterial(row)}
                                      >
                                        <Button size="small" danger>
                                          Удалить
                                        </Button>
                                      </Popconfirm>
                                    </Space>
                                  ),
                                },
                              ]}
                            />
                          ) : (
                            <Empty description="Материалы для этой позиции пока не выбраны." />
                          )}
                        </Card>

                        {bomCardSupplierMaterials.length ? (
                          <Card size="small" title="Материалы, указанные у деталей поставщиков" loading={bomPositionDetailsLoading}>
                            <Table
                              size="small"
                              rowKey={(row) => `${row.supplier_part_id}-${row.id}`}
                              pagination={false}
                              dataSource={bomCardSupplierMaterials}
                              columns={[
                                {
                                  title: "Материал",
                                  render: (_, row) =>
                                    [row.name, row.code, row.standard].filter(Boolean).join(" / ") || "—",
                                },
                                {
                                  title: "Источник",
                                  render: (_, row) =>
                                    `${row.supplier_name || "Поставщик"}${row.supplier_part_number ? ` · ${row.supplier_part_number}` : ""}`,
                                },
                                { title: "Примечание", render: (_, row) => row.note || (row.is_default ? "Основной" : "—") },
                              ]}
                            />
                          </Card>
                        ) : null}
                      </Space>
                    </Form>
                  </Space>
                ),
              },
              {
                key: "composition",
                label: "Состав",
                children: (
                  <Card size="small" loading={bomPositionDetailsLoading}>
                    {selectedBomChildren.length ? (
                      <Table
                        size="small"
                        rowKey="id"
                        pagination={false}
                        dataSource={selectedBomChildren}
                        onRow={(row) => ({
                          onClick: () => setSelectedBomItem(row),
                          style: { cursor: "pointer" },
                        })}
                        columns={[
                          {
                            title: "Номер производителя",
                            width: 170,
                            render: (_, row) => (
                              <Typography.Link strong>{getBomManufacturerNumber(row)}</Typography.Link>
                            ),
                          },
                          {
                            title: "Название",
                            render: (_, row) => getBomItemName(row) || "—",
                          },
                          {
                            title: "Кол-во",
                            width: 100,
                            render: (_, row) => formatBomQuantity(row),
                          },
                        ]}
                      />
                    ) : (
                      <Typography.Text type="secondary">Внутри этой позиции пока нет дочерних строк.</Typography.Text>
                    )}
                  </Card>
                ),
              },
              {
                key: "usage",
                label: "Применяемость",
                children: (
                  <Card size="small" loading={bomPositionDetailsLoading}>
                    {bomCardUsage.length ? (
                      <Table
                        size="small"
                        rowKey="bom_item_id"
                        pagination={false}
                        dataSource={bomCardUsage}
                        columns={[
                          {
                            title: "Модель",
                            render: (_, row) => [row.manufacturer_name, row.model_name].filter(Boolean).join(" ") || "—",
                          },
                          {
                            title: "Где в BOM",
                            render: (_, row) =>
                              row.parent_item_id
                                ? [row.parent_manufacturer_part_number, row.parent_manufacturer_part_name || row.parent_title]
                                    .filter(Boolean)
                                    .join(" · ") || "В узле"
                                : "В корне модели",
                          },
                          { title: "Количество", render: (_, row) => formatBomQuantity(row) },
                        ]}
                      />
                    ) : (
                      <Descriptions size="small" bordered column={1}>
                        <Descriptions.Item label="Текущая модель">
                          {[currentModel?.manufacturer_name, currentModel?.model_name].filter(Boolean).join(" ") || "—"}
                        </Descriptions.Item>
                        <Descriptions.Item label="Текущее место в BOM">
                          {selectedBomParent
                            ? `${getBomItemLabel(selectedBomParent)} — ${getBomItemName(selectedBomParent) || "узел"}`
                            : "Корень модели"}
                        </Descriptions.Item>
                      </Descriptions>
                    )}
                  </Card>
                ),
              },
              {
                key: "warehouse",
                label: "Склад",
                children: (
                  <Space direction="vertical" size={12} style={{ width: "100%" }}>
                    <Card
                      size="small"
                      title="Складская сводка"
                      loading={bomWarehouseDetailsLoading}
                      extra={
                        <Space>
                          <Button size="small" icon={<ReloadOutlined />} onClick={reloadBomWarehouseDetails}>
                            Обновить
                          </Button>
                          <Button size="small" icon={<InboxOutlined />} onClick={() => openBomWarehousePage("receipt")}>
                            Оприходовать
                          </Button>
                          <Button size="small" onClick={() => openBomWarehousePage()}>
                            Открыть склад
                          </Button>
                        </Space>
                      }
                    >
                      <Row gutter={[12, 12]}>
                        <Col span={8}>
                          <Statistic
                            title="Факт"
                            value={formatWarehouseQuantity(
                              bomWarehouseDetails?.stats?.actual_qty,
                              selectedBomItem.uom || selectedBomItem.catalog_position_uom || "шт",
                            )}
                          />
                        </Col>
                        <Col span={8}>
                          <Statistic
                            title="Свободно"
                            value={formatWarehouseQuantity(
                              bomWarehouseDetails?.stats?.free_qty,
                              selectedBomItem.uom || selectedBomItem.catalog_position_uom || "шт",
                            )}
                          />
                        </Col>
                        <Col span={8}>
                          <Statistic
                            title="В резерве"
                            value={formatWarehouseQuantity(
                              bomWarehouseDetails?.stats?.reserved_qty,
                              selectedBomItem.uom || selectedBomItem.catalog_position_uom || "шт",
                            )}
                          />
                        </Col>
                      </Row>
                    </Card>

                    <Card size="small" title="Остатки поставочных деталей" loading={bomWarehouseDetailsLoading}>
                      {bomWarehouseStock.length ? (
                        <Table
                          size="small"
                          rowKey={(row) => `${row.warehouse_id}-${row.storage_place_id || 0}-${row.supplier_part_id}`}
                          pagination={false}
                          dataSource={bomWarehouseStock}
                          scroll={{ x: 980 }}
                          columns={[
                            {
                              title: "Деталь поставщика",
                              render: (_, row) => (
                                <Space direction="vertical" size={0}>
                                  <Typography.Text strong>
                                    {row.supplier_part_number || row.canonical_part_number || `#${row.supplier_part_id}`}
                                  </Typography.Text>
                                  <Typography.Text type="secondary">
                                    {[row.supplier_name, row.supplier_part_description].filter(Boolean).join(" · ") || "—"}
                                  </Typography.Text>
                                </Space>
                              ),
                            },
                            {
                              title: "Склад / адрес",
                              render: (_, row) => (
                                <Space direction="vertical" size={0}>
                                  <Typography.Text strong>{row.warehouse_name || "—"}</Typography.Text>
                                  <Typography.Text type="secondary">{row.storage_place_code || "без адреса"}</Typography.Text>
                                </Space>
                              ),
                            },
                            {
                              title: "Факт",
                              width: 110,
                              align: "right",
                              render: (_, row) => formatWarehouseQuantity(row.actual_qty, row.uom),
                            },
                            {
                              title: "Свободно",
                              width: 110,
                              align: "right",
                              render: (_, row) => (
                                <Typography.Text strong>{formatWarehouseQuantity(row.free_qty, row.uom)}</Typography.Text>
                              ),
                            },
                            {
                              title: "Резерв",
                              width: 110,
                              align: "right",
                              render: (_, row) => formatWarehouseQuantity(row.reserved_qty, row.uom),
                            },
                            {
                              title: "Действие",
                              width: 110,
                              render: (_, row) => (
                                <Button
                                  size="small"
                                  icon={<LockOutlined />}
                                  disabled={!row.supplier_part_id || Number(row.free_qty || 0) <= 0}
                                  onClick={() => openBomWarehouseAction("reserve", row)}
                                >
                                  Резерв
                                </Button>
                              ),
                            },
                          ]}
                        />
                      ) : (
                        <Empty description="Остатков по этой позиции пока нет">
                          <Button size="small" icon={<InboxOutlined />} onClick={() => openBomWarehousePage("receipt")}>
                            Оприходовать поставку
                          </Button>
                        </Empty>
                      )}
                    </Card>

                    <Card size="small" title="Активные резервы" loading={bomWarehouseDetailsLoading}>
                      {bomWarehouseReservations.length ? (
                        <Table
                          size="small"
                          rowKey="reservation_key"
                          pagination={false}
                          dataSource={bomWarehouseReservations}
                          scroll={{ x: 940 }}
                          columns={[
                            {
                              title: "Деталь поставщика",
                              render: (_, row) => (
                                <Space direction="vertical" size={0}>
                                  <Typography.Text strong>
                                    {row.supplier_part_number || row.canonical_part_number || `#${row.supplier_part_id}`}
                                  </Typography.Text>
                                  <Typography.Text type="secondary">
                                    {[row.supplier_name, row.supplier_part_description].filter(Boolean).join(" · ") || "—"}
                                  </Typography.Text>
                                </Space>
                              ),
                            },
                            {
                              title: "Источник",
                              render: (_, row) => (
                                <Space direction="vertical" size={0}>
                                  <Typography.Text strong>{getWarehouseSourceTitle(row)}</Typography.Text>
                                  <Typography.Text type="secondary">
                                    {[row.source_type, row.source_id].filter(Boolean).join(" #") || "manual"}
                                  </Typography.Text>
                                </Space>
                              ),
                            },
                            {
                              title: "Склад / адрес",
                              render: (_, row) => (
                                <Space direction="vertical" size={0}>
                                  <Typography.Text>{row.warehouse_name || "—"}</Typography.Text>
                                  <Typography.Text type="secondary">{row.storage_place_code || "без адреса"}</Typography.Text>
                                </Space>
                              ),
                            },
                            {
                              title: "Резерв",
                              width: 110,
                              align: "right",
                              render: (_, row) => formatWarehouseQuantity(row.reserved_qty, row.uom),
                            },
                            {
                              title: "",
                              width: 100,
                              render: (_, row) => (
                                <Button
                                  size="small"
                                  icon={<UnlockOutlined />}
                                  disabled={!row.supplier_part_id}
                                  onClick={() => openBomWarehouseAction("unreserve", row)}
                                >
                                  Снять
                                </Button>
                              ),
                            },
                          ]}
                        />
                      ) : (
                        <Empty description="Активных резервов по этой позиции нет" />
                      )}
                    </Card>

                    <Card size="small" title="Последние движения" loading={bomWarehouseDetailsLoading}>
                      {bomWarehouseMovements.length ? (
                        <Table
                          size="small"
                          rowKey="id"
                          pagination={{ pageSize: 8, showSizeChanger: false }}
                          dataSource={bomWarehouseMovements}
                          scroll={{ x: 1040 }}
                          columns={[
                            {
                              title: "Дата",
                              width: 145,
                              render: (_, row) => formatWarehouseDate(row.occurred_at),
                            },
                            {
                              title: "Деталь поставщика",
                              render: (_, row) => (
                                <Space direction="vertical" size={0}>
                                  <Typography.Text strong>
                                    {row.supplier_part_number || row.canonical_part_number || `#${row.supplier_part_id}`}
                                  </Typography.Text>
                                  <Typography.Text type="secondary">{row.supplier_name || "—"}</Typography.Text>
                                </Space>
                              ),
                            },
                            {
                              title: "Документ",
                              render: (_, row) => (
                                <Space direction="vertical" size={0}>
                                  <Typography.Text strong>{row.document_no || `#${row.document_id}`}</Typography.Text>
                                  <Tag color={WAREHOUSE_DOC_COLORS[row.doc_type] || "default"}>
                                    {WAREHOUSE_DOC_TYPE_LABELS[row.doc_type] || row.doc_type}
                                  </Tag>
                                </Space>
                              ),
                            },
                            {
                              title: "Движение",
                              render: (_, row) => WAREHOUSE_MOVEMENT_LABELS[row.movement_type] || row.movement_type,
                            },
                            {
                              title: "Склад / адрес",
                              render: (_, row) => [row.warehouse_name, row.storage_place_code].filter(Boolean).join(" / ") || "—",
                            },
                            {
                              title: "Факт",
                              width: 90,
                              align: "right",
                              render: (_, row) => formatNullableNumber(row.quantity_delta),
                            },
                            {
                              title: "Резерв",
                              width: 90,
                              align: "right",
                              render: (_, row) => formatNullableNumber(row.reserved_delta),
                            },
                          ]}
                        />
                      ) : (
                        <Empty description="Движений по этой позиции пока нет" />
                      )}
                    </Card>
                  </Space>
                ),
              },
              {
                key: "suppliers",
                label: "Поставщики",
                children: (
                  <Card size="small" loading={bomPositionDetailsLoading}>
                    {bomCardSupplierParts.length ? (
                      <Table
                        size="small"
                        rowKey="id"
                        pagination={false}
                        dataSource={bomCardSupplierParts}
                        columns={[
                          {
                            title: "Поставщик",
                            render: (_, row) => (
                              <Space direction="vertical" size={0}>
                                <Typography.Text strong>{row.supplier_name || "—"}</Typography.Text>
                                <Typography.Text type="secondary">{getRelationshipLabel(row.relationship_type)}</Typography.Text>
                              </Space>
                            ),
                          },
                          {
                            title: "Деталь поставщика",
                            render: (_, row) => (
                              <Space direction="vertical" size={0}>
                                <Typography.Text>{row.supplier_part_number || "—"}</Typography.Text>
                                <Typography.Text type="secondary">{row.description || "—"}</Typography.Text>
                              </Space>
                            ),
                          },
                          { title: "Цена", render: (_, row) => formatMoney(row.price, row.currency) },
                          {
                            title: "Срок",
                            render: (_, row) =>
                              row.effective_lead_time_days ? `${row.effective_lead_time_days} дн.` : "—",
                          },
                          { title: "Материал", render: (_, row) => row.default_material_name || "—" },
                        ]}
                      />
                    ) : (
                      <Empty description="К этой позиции пока не привязаны детали поставщиков." />
                    )}
                  </Card>
                ),
              },
            ]}
          />
        ) : (
          <Empty description="Строка BOM не выбрана" />
        )}
      </Drawer>

      <Modal
        open={Boolean(bomWarehouseAction)}
        title={bomWarehouseAction?.type === "unreserve" ? "Снять резерв" : "Зарезервировать поставку"}
        okText={bomWarehouseAction?.type === "unreserve" ? "Снять" : "Зарезервировать"}
        cancelText="Отмена"
        confirmLoading={bomWarehouseActionSaving}
        onCancel={() => {
          setBomWarehouseAction(null)
          bomWarehouseActionForm.resetFields()
        }}
        onOk={handleSubmitBomWarehouseAction}
        destroyOnHidden
      >
        <Form form={bomWarehouseActionForm} layout="vertical">
          <Descriptions size="small" bordered column={1} style={{ marginBottom: 12 }}>
            <Descriptions.Item label="Позиция">
              {selectedBomItem ? getBomManufacturerNumber(selectedBomItem) : "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Деталь поставщика">
              {[
                bomWarehouseAction?.row?.supplier_name,
                bomWarehouseAction?.row?.supplier_part_number || bomWarehouseAction?.row?.canonical_part_number,
              ]
                .filter(Boolean)
                .join(" / ") || "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Склад">
              {[bomWarehouseAction?.row?.warehouse_name, bomWarehouseAction?.row?.storage_place_code]
                .filter(Boolean)
                .join(" / ") || "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Доступно для операции">
              {formatWarehouseQuantity(
                bomWarehouseAction?.maxQty,
                selectedBomItem?.uom || selectedBomItem?.catalog_position_uom || "шт",
              )}
            </Descriptions.Item>
          </Descriptions>
          <Form.Item
            name="quantity"
            label="Количество"
            rules={[
              { required: true, message: "Укажите количество" },
              {
                validator: (_, value) => {
                  const number = Number(value)
                  if (!Number.isFinite(number) || number <= 0) return Promise.reject(new Error("Количество должно быть больше 0"))
                  if (number > Number(bomWarehouseAction?.maxQty || 0)) {
                    return Promise.reject(new Error("Количество больше доступного"))
                  }
                  return Promise.resolve()
                },
              },
            ]}
          >
            <InputNumber min={0.001} precision={3} style={{ width: "100%" }} />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="source_type" label="Источник">
                <Select
                  options={[
                    { value: "manual", label: "Ручной резерв" },
                    { value: "client_request", label: "Заявка клиента" },
                    { value: "sales_quote", label: "Коммерческое предложение" },
                    { value: "contract", label: "Контракт" },
                    { value: "rfq", label: "RFQ" },
                    { value: "purchase_order", label: "Заказ поставщику" },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="source_id" label="ID источника">
                <Input placeholder="опционально" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="source_line_id" label="ID строки источника">
            <Input placeholder="опционально" />
          </Form.Item>
          <Form.Item name="source_label" label="Название резерва">
            <Input placeholder="Для кого или для чего держим позицию" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={bomMaterialModalOpen}
        title={editingBomMaterial ? "Материал исполнения" : "Новый материал исполнения"}
        okText="Сохранить"
        cancelText="Отмена"
        confirmLoading={bomCardSaving}
        onCancel={() => {
          setBomMaterialModalOpen(false)
          setEditingBomMaterial(null)
          bomMaterialForm.resetFields()
        }}
        onOk={handleSaveBomMaterial}
        destroyOnHidden
      >
        <Form form={bomMaterialForm} layout="vertical">
          <Form.Item
            label="Материал из справочника"
            name="material_id"
            rules={[{ required: true, message: "Выберите материал" }]}
          >
            <Select
              showSearch
              filterOption={false}
              placeholder="Начните вводить название, марку или стандарт"
              options={bomMaterialOptions}
              loading={bomMaterialOptionsLoading}
              onSearch={fetchBomMaterialOptions}
              onFocus={() => fetchBomMaterialOptions()}
            />
          </Form.Item>
          <Form.Item label="Название исполнения" name="variant_name">
            <Input placeholder="Например: стандартное, усиленное, из Hardox" />
          </Form.Item>
          <Form.Item name="is_default" valuePropName="checked">
            <Checkbox>Основной материал для этой позиции</Checkbox>
          </Form.Item>
          <Form.Item label="Примечание" name="note">
            <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={bomImportOpen}
        title={`Импорт BOM из Excel${currentModel ? `: ${currentModel.manufacturer_name || ""} ${currentModel.model_name || ""}` : ""}`}
        onCancel={() => {
          setBomImportOpen(false)
          setBomImportRows([])
          setBomImportErrors([])
          setBomImportWarnings([])
          setBomImportSourceRows([])
        }}
        width={1120}
        footer={[
          <Button key="template" onClick={downloadBomTemplate}>
            Скачать шаблон
          </Button>,
          <Button
            key="close"
            onClick={() => {
              setBomImportOpen(false)
              setBomImportRows([])
              setBomImportErrors([])
              setBomImportWarnings([])
              setBomImportSourceRows([])
            }}
          >
            Закрыть
          </Button>,
          <Button
            key="commit"
            type="primary"
            loading={bomImportCommitting}
            disabled={!bomImportRows.length || bomImportErrors.length > 0}
            onClick={handleCommitBomImport}
          >
            Импортировать
          </Button>,
        ]}
        destroyOnHidden
      >
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Space wrap>
            <Upload accept=".xlsx" showUploadList={false} customRequest={handleBomImportUpload}>
              <Button loading={bomImportLoading}>Загрузить Excel</Button>
            </Upload>
            <Checkbox
              checked={bomImportReplace}
              onChange={(event) => {
                const nextReplace = event.target.checked
                setBomImportReplace(nextReplace)
                if (bomImportSourceRows.length) previewBomImportRows(bomImportSourceRows, nextReplace)
              }}
            >
              Заменить текущий BOM модели
            </Checkbox>
          </Space>

          {bomImportErrors.length ? (
            <Alert
              type="error"
              showIcon
              message="Файл нужно поправить перед импортом"
              description={
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {bomImportErrors.slice(0, 12).map((error, index) => (
                    <li key={index}>
                      {error.row_number ? `Строка ${error.row_number}: ` : ""}
                      {error.message || String(error)}
                    </li>
                  ))}
                </ul>
              }
            />
          ) : null}

          {bomImportWarnings.length ? (
            <Alert
              type="warning"
              showIcon
              message="Предупреждения"
              description={
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {bomImportWarnings.slice(0, 8).map((warning, index) => (
                    <li key={index}>
                      {warning.row_number ? `Строка ${warning.row_number}: ` : ""}
                      {warning.message || String(warning)}
                    </li>
                  ))}
                </ul>
              }
            />
          ) : null}

          <Table
            size="small"
            rowKey={(row) => row.item_key || row.row_number}
            columns={bomImportColumns}
            dataSource={bomImportRows}
            loading={bomImportLoading}
            pagination={{ pageSize: 8, showSizeChanger: false }}
            scroll={{ x: 1330 }}
            locale={{ emptyText: "Загрузите Excel, чтобы увидеть предварительный разбор BOM" }}
          />
        </Space>
      </Modal>

      <Modal
        open={Boolean(crossModelBomSource)}
        title="Добавить применение позиции"
        width={720}
        okText="Добавить"
        cancelText="Отмена"
        confirmLoading={crossModelBomSaving}
        onOk={handleAddBomItemToAnotherModel}
        onCancel={() => {
          setCrossModelBomSource(null)
          setCrossModelBomRows([])
          bomCrossModelForm.resetFields()
        }}
        destroyOnHidden
      >
        <Form form={bomCrossModelForm} layout="vertical" initialValues={{ quantity: 1 }}>
          {crossModelBomSource ? (
            <Card size="small" style={{ marginBottom: 12 }}>
              <Space direction="vertical" size={2}>
                <Typography.Text type="secondary">Добавляем эту же позицию в BOM</Typography.Text>
                <Space size={8} wrap>
                  <Typography.Text strong>
                    {crossModelBomSource.manufacturer_part_number ||
                      crossModelBomSource.part_number ||
                      getBomItemLabel(crossModelBomSource)}
                  </Typography.Text>
                  <Typography.Text>
                    {getBomItemName(crossModelBomSource) || crossModelBomSource.catalog_position_name || "—"}
                  </Typography.Text>
                  <Tag>{getBomItemTypeLabel(crossModelBomSource)}</Tag>
                </Space>
              </Space>
            </Card>
          ) : null}

          <Form.Item
            label="В какую модель добавить"
            name="target_model_id"
            extra={
              currentModel?.manufacturer_name
                ? `Показываем только модели производителя ${currentModel.manufacturer_name}.`
                : "Показываем модели того же производителя, что и у текущей модели."
            }
            rules={[{ required: true, message: "Выберите модель" }]}
          >
            <Select
              showSearch
              placeholder="Выберите модель"
              optionFilterProp="label"
              options={crossModelOptions}
              notFoundContent="У этого производителя нет других моделей"
              onChange={() => {
                bomCrossModelForm.setFieldsValue({ parent_item_id: null })
              }}
            />
          </Form.Item>

          <Row gutter={12}>
            <Col span={16}>
              <Form.Item
                label="Куда добавить в BOM выбранной модели"
                name="parent_item_id"
                extra="Оставьте пустым, если позиция должна быть на верхнем уровне модели."
              >
                <Select
                  allowClear
                  loading={crossModelBomLoading}
                  disabled={!bomCrossModelTargetId}
                  placeholder={bomCrossModelTargetId ? "В корень модели" : "Сначала выберите модель"}
                  options={crossModelBomParentOptions}
                  notFoundContent={crossModelBomLoading ? "Загружаем BOM..." : "В этой модели пока нет узлов"}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Количество" name="quantity" rules={[{ required: true }]}>
                <InputNumber min={0.001} style={{ width: "100%" }} decimalSeparator="," />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Заметки" name="notes">
            <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={bomItemModalOpen}
        title={reuseBomSource ? "Добавить применение позиции" : editingBomItem ? "Строка BOM" : "Новая строка BOM"}
        width={820}
        okText="Сохранить"
        cancelText="Отмена"
        confirmLoading={bomItemSaving}
        onOk={() => handleSaveBomItem()}
        onCancel={() => {
          setBomItemModalOpen(false)
          setEditingBomItem(null)
          setReuseBomSource(null)
        }}
        destroyOnHidden
      >
        <Form
          form={bomItemForm}
          layout="vertical"
          initialValues={{ link_classifier: false, row_kind: "part", quantity: 1 }}
        >
          {reuseBomSource ? (
            <>
              <Form.Item name="link_classifier" hidden>
                <Input />
              </Form.Item>
              <Form.Item name="catalog_position_id" hidden>
                <Input />
              </Form.Item>
              <Form.Item name="row_kind" hidden>
                <Input />
              </Form.Item>
              <Form.Item name="item_no" hidden>
                <Input />
              </Form.Item>
              <Form.Item name="manufacturer_part_number" hidden>
                <Input />
              </Form.Item>
              <Form.Item name="manufacturer_part_name_en" hidden>
                <Input />
              </Form.Item>
              <Form.Item name="manufacturer_part_name_ru" hidden>
                <Input />
              </Form.Item>
              <Form.Item name="manufacturer_part_name" hidden>
                <Input />
              </Form.Item>
              <Form.Item name="drawing_number" hidden>
                <Input />
              </Form.Item>
              <Card size="small" style={{ marginBottom: 12 }}>
                <Space direction="vertical" size={2}>
                  <Typography.Text type="secondary">Позиция</Typography.Text>
                  <Space size={8} wrap>
                    <Typography.Text strong>
                      {reuseBomSource.manufacturer_part_number || reuseBomSource.part_number || getBomItemLabel(reuseBomSource)}
                    </Typography.Text>
                    <Typography.Text>{getBomItemName(reuseBomSource) || getBomItemLabel(reuseBomSource)}</Typography.Text>
                    <Tag>{BOM_ROW_KIND_LABELS[reuseBomSource.row_kind] || "Строка BOM"}</Tag>
                  </Space>
                </Space>
              </Card>

              <Row gutter={12}>
                <Col span={16}>
                  <Form.Item
                    label="Куда добавить"
                    name="parent_item_id"
                    rules={[{ required: true, message: "Выберите сборку, куда добавить позицию" }]}
                  >
                    <Select
                      placeholder="Выберите сборку"
                      options={currentModelBomRows
                        .filter((row) => {
                          if (Number(row.id) === Number(reuseBomSource.id)) return false
                          if (
                            reuseBomSource.catalog_position_id &&
                            Number(row.catalog_position_id) === Number(reuseBomSource.catalog_position_id)
                          ) {
                            return false
                          }
                          return row.bom_has_children || getBomEffectiveRowKind(row) === "assembly"
                        })
                        .map((row) => ({
                          value: row.id,
                          label: `${"— ".repeat(row.bom_level || 0)}${row.item_no ? `${row.item_no}. ` : ""}${getBomItemLabel(row)}${getBomItemName(row) ? ` — ${getBomItemName(row)}` : ""}`,
                        }))}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="Количество" name="quantity" rules={[{ required: true }]}>
                    <InputNumber min={0.001} style={{ width: "100%" }} decimalSeparator="," />
                  </Form.Item>
                </Col>
              </Row>
            </>
          ) : (
            <>
              <Form.Item name="row_kind" hidden>
                <Input />
              </Form.Item>

              <Typography.Text strong>Данные строки BOM</Typography.Text>
              <Row gutter={12} style={{ marginTop: 12 }}>
                <Col span={16}>
                  <Form.Item
                    label="Каталожный номер производителя"
                    name="manufacturer_part_number"
                    extra="Номер именно в этом каталоге модели. Например: 1093080129 или MM0200329."
                  >
                    <Input placeholder="Например: 1093080129" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    label="Количество"
                    name="quantity"
                    rules={[{ required: true }]}
                    extra="Сколько таких позиций входит в выбранный узел."
                  >
                    <InputNumber min={0.001} style={{ width: "100%" }} decimalSeparator="," />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item
                    label="Название EN"
                    name="manufacturer_part_name_en"
                    rules={[
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          const hasNumber = getFieldValue("manufacturer_part_number")
                          const hasRuName = getFieldValue("manufacturer_part_name_ru")
                          if (value || hasNumber || hasRuName) return Promise.resolve()
                          return Promise.reject(new Error("Укажите название или каталожный номер"))
                        },
                      }),
                    ]}
                  >
                    <Input.TextArea autoSize={{ minRows: 1, maxRows: 4 }} placeholder="Например: Adjustment Ring" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Название RU" name="manufacturer_part_name_ru">
                    <Input.TextArea autoSize={{ minRows: 1, maxRows: 4 }} placeholder="Например: Регулировочное кольцо" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                label="Родитель в BOM"
                name="parent_item_id"
                extra="Оставьте пустым, если строка должна быть на верхнем уровне модели."
              >
                <Select
                  allowClear
                  placeholder="В корень модели"
                  options={currentModelBomRows
                    .filter((row) => Number(row.id) !== Number(editingBomItem?.id))
                    .map((row) => ({
                      value: row.id,
                      label: `${"— ".repeat(row.bom_level || 0)}${row.item_no ? `${row.item_no}. ` : ""}${getBomItemLabel(row)}${getBomItemName(row) ? ` — ${getBomItemName(row)}` : ""}`,
                    }))}
                />
              </Form.Item>

              {!bomLinkClassifier ? (
                <>
                  <Divider style={{ margin: "8px 0 14px" }} />
                  <Typography.Text strong>Характеристики карточки</Typography.Text>
                  <Row gutter={12}>
                    <Col span={8}>
                      <Form.Item label="Масса, кг" name="card_weight_kg">
                        <InputNumber min={0} precision={3} style={{ width: "100%" }} placeholder="например 1250" />
                      </Form.Item>
                    </Col>
                    <Col span={16}>
                      <Form.Item label={`Габариты, ${dimensionUnitSymbol}`}>
                        <Space.Compact style={{ width: "100%" }}>
                          <Form.Item name="card_length_mm" noStyle>
                            <InputNumber min={0} precision={1} style={{ width: "33.33%" }} placeholder="Длина" />
                          </Form.Item>
                          <Form.Item name="card_width_mm" noStyle>
                            <InputNumber min={0} precision={1} style={{ width: "33.33%" }} placeholder="Ширина" />
                          </Form.Item>
                          <Form.Item name="card_height_mm" noStyle>
                            <InputNumber min={0} precision={1} style={{ width: "33.33%" }} placeholder="Высота" />
                          </Form.Item>
                        </Space.Compact>
                      </Form.Item>
                    </Col>
                  </Row>
                  <Row gutter={12}>
                    <Col span={10}>
                      <Form.Item label="Единица измерения">
                        <Input value="шт" disabled />
                      </Form.Item>
                    </Col>
                    <Col span={14}>
                      <Form.Item label="Код ТН ВЭД" name="card_tnved">
                        <TnvedPicker placeholder="Искать по названию детали, материалу или описанию" />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Form.Item label="Описание" name="card_description">
                    <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} placeholder="Краткое описание позиции для карточки и поиска" />
                  </Form.Item>
                </>
              ) : null}

              <Divider style={{ margin: "8px 0 14px" }} />

              <Form.Item
                label="Связать с существующей карточкой"
                name="link_classifier"
                valuePropName="checked"
              >
                <Switch
                  checkedChildren="Да"
                  unCheckedChildren="Нет"
                  onChange={(checked) => {
                    if (!checked) {
                      bomItemForm.setFieldsValue({ catalog_position_id: null })
                      return
                    }
                    const seed =
                      bomItemForm.getFieldValue("manufacturer_part_number") ||
                      bomItemForm.getFieldValue("manufacturer_part_name_en") ||
                      bomItemForm.getFieldValue("manufacturer_part_name_ru") ||
                      ""
                    loadCatalogPositions(seed)
                  }}
                />
              </Form.Item>

              {bomLinkClassifier ? (
                <Form.Item
                  label="Найти существующую карточку"
                  name="catalog_position_id"
                  rules={[{ required: true, message: "Выберите существующую карточку" }]}
                  extra="Характеристики будут взяты из выбранной карточки."
                >
                  <Select
                    showSearch
                    filterOption={false}
                    loading={catalogPositionsLoading}
                    placeholder="Введите номер, размер, стандарт или название"
                    notFoundContent={catalogPositionsLoading ? "Идет поиск..." : "Ничего не найдено"}
                    onFocus={() => {
                      if (selectableCatalogPositionOptions.length) return
                      const seed =
                        bomItemForm.getFieldValue("manufacturer_part_number") ||
                        bomItemForm.getFieldValue("manufacturer_part_name_en") ||
                        bomItemForm.getFieldValue("manufacturer_part_name_ru") ||
                        ""
                      loadCatalogPositions(seed)
                    }}
                    onSearch={(value) => loadCatalogPositions(value)}
                    options={selectableCatalogPositionOptions.map((row) => ({
                      value: row.id,
                      label:
                        [row.manufacturer_part_number || row.position_code, row.display_name]
                          .filter(Boolean)
                          .join(" — ") || `Позиция #${row.id}`,
                      positionCode: row.position_code,
                      classifierNodeName: row.classifier_node_name,
                      manufacturerName: row.manufacturer_name,
                      modelName: row.model_name,
                      sourceKind: row.source_kind,
                    }))}
                    optionRender={(option) => (
                      <Space direction="vertical" size={0}>
                        <Typography.Text strong>{option.data.label}</Typography.Text>
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          {[option.data.manufacturerName, option.data.modelName, option.data.positionCode, option.data.classifierNodeName]
                            .filter(Boolean)
                            .join(" / ") ||
                            "Позиция классификатора"}
                        </Typography.Text>
                      </Space>
                    )}
                  />
                </Form.Item>
              ) : null}

              {bomLinkClassifier && selectedBomLinkCatalogPositionPreview ? (
                <div
                  style={{
                    marginTop: -8,
                    marginBottom: 14,
                    padding: "10px 12px",
                    border: "1px solid #f0f0f0",
                    borderRadius: 6,
                    background: "#fafafa",
                  }}
                >
                  <Space direction="vertical" size={8} style={{ width: "100%" }}>
                    <Space direction="vertical" size={2}>
                      <Typography.Text type="secondary">Будет связана карточка</Typography.Text>
                      <Typography.Text strong>{selectedBomLinkCatalogPositionPreview.title}</Typography.Text>
                      <Typography.Text type="secondary">
                        {selectedBomLinkCatalogPositionPreview.context}
                      </Typography.Text>
                    </Space>
                    <Descriptions size="small" column={2}>
                      <Descriptions.Item label="Масса">
                        {selectedBomLinkCatalogPositionPreview.weight}
                      </Descriptions.Item>
                      <Descriptions.Item label={`Габариты, ${dimensionUnitSymbol}`}>
                        {selectedBomLinkCatalogPositionPreview.dimensions}
                      </Descriptions.Item>
                      <Descriptions.Item label="Ед. изм.">
                        {selectedBomLinkCatalogPositionPreview.uom}
                      </Descriptions.Item>
                      <Descriptions.Item label="ТН ВЭД">
                        {selectedBomLinkCatalogPositionPreview.tnved}
                      </Descriptions.Item>
                      <Descriptions.Item label="Описание" span={2}>
                        {selectedBomLinkCatalogPositionPreview.description}
                      </Descriptions.Item>
                    </Descriptions>
                  </Space>
                </div>
              ) : null}

            </>
          )}

          <Form.Item label="Комментарий к строке BOM" name="notes">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={unitModalOpen}
        title={
          editingUnit
            ? "Паспорт машины клиента"
            : `Новая машина клиента${currentModel ? `: ${currentModel.manufacturer_name || ""} ${currentModel.model_name || ""}` : ""}`
        }
        width={820}
        okText="Сохранить"
        cancelText="Отмена"
        confirmLoading={unitSaving}
        onOk={handleSaveUnit}
        onCancel={() => {
          setUnitModalOpen(false)
          setEditingUnit(null)
          setUnitAttributeRows([])
        }}
        destroyOnHidden
      >
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Card size="small" title="Основные данные">
            <Form form={unitForm} layout="vertical">
              <Row gutter={12}>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="Клиент"
                    name="client_id"
                    rules={[{ required: true, message: "Выберите клиента" }]}
                  >
                    <Select
                      showSearch
                      optionFilterProp="label"
                      placeholder="Выберите клиента"
                      options={clientOptions}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item label="Модель">
                    <Input
                      disabled
                      value={
                        editingUnit
                          ? [editingUnit.manufacturer_name, editingUnit.model_name].filter(Boolean).join(" ")
                          : [currentModel?.manufacturer_name, currentModel?.model_name].filter(Boolean).join(" ")
                      }
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item label="Название машины у клиента" name="internal_name">
                    <Input placeholder="Например: HP800 линия 2" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item label="Серийный номер" name="serial_number">
                    <Input placeholder="Серийный номер с таблички" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item label="Год выпуска" name="manufacture_year">
                    <InputNumber min={1900} max={2200} style={{ width: "100%" }} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={16}>
                  <Form.Item label="Площадка / участок" name="site_name">
                    <Input placeholder="Фабрика, линия, цех" />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item label="Заметки" name="notes">
                <Input.TextArea rows={3} />
              </Form.Item>
            </Form>
          </Card>

          <Card size="small" title="Паспортные характеристики этой машины" loading={unitAttributesLoading}>
            {unitAttributeRows.length ? (
              <Form form={unitAttributesForm} layout="vertical">
                <Row gutter={12}>
                  {unitAttributeRows.map((attribute) => (
                    <Col key={attribute.id} xs={24} md={attribute.value_type === "textarea" ? 24 : 12}>
                      {renderAttributeValueInput(attribute)}
                    </Col>
                  ))}
                </Row>
              </Form>
            ) : (
              <Empty description="Для раздела модели не настроены паспортные характеристики" />
            )}
          </Card>
        </Space>
      </Modal>

      <Modal
        open={unitBomOverrideOpen}
        title={
          editingUnitBomItem
            ? `Отличие по BOM: ${getBomItemLabel(editingUnitBomItem)}`
            : "Отличие по BOM"
        }
        width={720}
        okText="Сохранить"
        cancelText="Отмена"
        confirmLoading={unitBomOverrideSaving}
        onOk={handleSaveUnitBomOverride}
        onCancel={() => {
          setUnitBomOverrideOpen(false)
          setEditingUnitBomItem(null)
        }}
        footer={[
          <Button
            key="reset"
            disabled={!editingUnitBomItem?.override_id}
            loading={unitBomOverrideSaving}
            onClick={handleResetUnitBomOverride}
          >
            Сбросить отличие
          </Button>,
          <Button
            key="cancel"
            onClick={() => {
              setUnitBomOverrideOpen(false)
              setEditingUnitBomItem(null)
            }}
          >
            Отмена
          </Button>,
          <Button key="save" type="primary" loading={unitBomOverrideSaving} onClick={handleSaveUnitBomOverride}>
            Сохранить
          </Button>,
        ]}
        destroyOnHidden
      >
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          {editingUnitBomItem ? (
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="Базовая строка">
                {[editingUnitBomItem.item_no, getBomItemLabel(editingUnitBomItem), getBomItemName(editingUnitBomItem)]
                  .filter(Boolean)
                  .join(" / ") || "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Количество в модели">
                {Number(editingUnitBomItem.quantity || 0).toLocaleString("ru-RU")}{" "}
                {editingUnitBomItem.uom || editingUnitBomItem.catalog_position_uom || "шт"}
              </Descriptions.Item>
            </Descriptions>
          ) : null}

          <Form form={unitBomOverrideForm} layout="vertical">
            <Form.Item label="Статус для этой машины" name="status" rules={[{ required: true }]}>
              <Select options={UNIT_BOM_STATUS_OPTIONS.map(({ value, label }) => ({ value, label }))} />
            </Form.Item>
            <Form.Item label="Описание отличия" name="difference_summary">
              <Input.TextArea rows={3} placeholder="Что отличается от базовой модели" />
            </Form.Item>
            <Form.Item
              label="Деталь клиента в справочнике"
              name="client_part_id"
              extra="Можно выбрать существующую деталь клиента или создать новую из полей ниже."
            >
              <Select
                allowClear
                showSearch
                loading={unitClientPartLoading}
                placeholder="Выберите деталь клиента"
                filterOption={false}
                onSearch={(value) => loadUnitClientParts(selectedUnitFromTree, value)}
                onChange={handleSelectUnitClientPart}
                options={unitClientPartOptions.map((row) => ({
                  value: row.id,
                  label:
                    [
                      row.display_name,
                      [row.client_part_number, row.drawing_number, row.revision_code].filter(Boolean).join(" / "),
                    ]
                      .filter(Boolean)
                      .join(" — ") || `Деталь #${row.id}`,
                }))}
              />
            </Form.Item>
            <Row gutter={12}>
              <Col xs={24} md={8}>
                <Form.Item label="Номер клиента" name="client_part_number">
                  <Input />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="Чертеж клиента" name="client_drawing_number">
                  <Input />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="Ревизия" name="client_revision">
                  <Input />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item>
              <Button
                loading={unitBomClientPartSaving}
                disabled={!selectedUnitFromTree?.client_id}
                onClick={handleCreateUnitClientPartFromBom}
              >
                Создать деталь клиента из этой строки
              </Button>
            </Form.Item>
            <Form.Item label="Заметки" name="notes">
              <Input.TextArea rows={2} />
            </Form.Item>
          </Form>
        </Space>
      </Modal>

      <Modal
        open={modalOpen}
        title={
          editingNode
            ? "Редактирование раздела"
            : parentForCreate
              ? `Новый подраздел для "${parentForCreate.name}"`
              : "Новый раздел"
        }
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        confirmLoading={saving}
        okText={editingNode ? "Сохранить" : "Создать"}
        cancelText="Отмена"
        destroyOnHidden
      >
        <Form form={form} layout="vertical" initialValues={EMPTY_FORM}>
          <Form.Item
            label="Название"
            name="name"
            rules={[{ required: true, message: "Укажите название раздела" }]}
          >
            <Input placeholder="Например: Дробилки конусные" />
          </Form.Item>
          <Form.Item
            label="Тип ветки"
            name="card_kind"
          >
            <Select
              options={CARD_KIND_OPTIONS.map((option) => ({
                value: option.value,
                label: option.label,
              }))}
            />
          </Form.Item>
          <Card size="small" style={{ marginTop: -12, marginBottom: 16, background: "#fafafa" }}>
            <Space direction="vertical" size={8} style={{ width: "100%" }}>
              <Space wrap>
                <Tag color={CARD_KIND_COLORS[nodeCardKindOption.value] || "default"}>
                  {nodeCardKindOption.label}
                </Tag>
                <Typography.Text strong>Что это значит</Typography.Text>
              </Space>
              <Typography.Text>{nodeCardKindOption.description}</Typography.Text>
              <Typography.Text type="secondary">
                <b>Когда использовать:</b> {nodeCardKindOption.when}
              </Typography.Text>
              <Typography.Text type="secondary">
                <b>Основная карточка:</b> {nodeCardKindOption.primaryCard}
              </Typography.Text>
              <Typography.Text type="secondary">
                <b>Что откроется:</b> {nodeCardKindOption.opens}
              </Typography.Text>
              <Space size={4} wrap>
                {nodeCardKindOption.tabs.map((tab) => (
                  <Tag key={tab}>{tab}</Tag>
                ))}
              </Space>
            </Space>
          </Card>
          <Form.Item label="Описание для карточки" name="notes">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item label="Фото карточки">
            <Space direction="vertical" size={8} style={{ width: "100%" }}>
              {nodeCardImageUrl ? (
                <img
                  src={resolveAssetUrl(nodeCardImageUrl)}
                  alt="Фото карточки"
                  style={{ width: 180, height: 120, objectFit: "cover", borderRadius: 6, border: "1px solid #f0f0f0" }}
                />
              ) : null}
              <Space wrap>
                <Upload
                  accept="image/*"
                  showUploadList={false}
                  customRequest={handleUploadNodeCardImage}
                  disabled={!editingNode?.id}
                >
                  <Button size="small" loading={nodeCardImageUploading} disabled={!editingNode?.id}>
                    Загрузить фото
                  </Button>
                </Upload>
                {nodeCardImageUrl ? (
                  <Button size="small" danger onClick={() => setNodeCardImageUrl("")}>
                    Убрать фото
                  </Button>
                ) : null}
              </Space>
              {!editingNode?.id ? (
                <Typography.Text type="secondary">Фото можно добавить после создания раздела</Typography.Text>
              ) : null}
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={moveModelOpen}
        title={
          movingModel
            ? `Перенос модели: ${movingModel.manufacturer_name || ""} ${movingModel.model_name || ""}`
            : "Перенос модели"
        }
        onCancel={() => setMoveModelOpen(false)}
        onOk={handleMoveModel}
        confirmLoading={moveModelSaving}
        okText="Перенести"
        cancelText="Отмена"
        okButtonProps={{
          disabled:
            !moveTargetNodeId ||
            Number(moveTargetNodeId) === Number(movingModel?.classifier_node_id || 0),
        }}
        destroyOnHidden
      >
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Typography.Text type="secondary">
            Выберите новый раздел классификатора. Все применения деталей производителя, BOM и машины клиентов останутся привязаны к этой модели.
          </Typography.Text>
          {plainTreeData.length ? (
            <Tree
              treeData={plainTreeData}
              defaultExpandAll
              selectedKeys={moveTargetNodeId ? [treeKey.node(moveTargetNodeId)] : []}
              onSelect={(keys) => {
                const parsed = parseTreeKey(keys?.[0])
                setMoveTargetNodeId(parsed.type === "node" ? parsed.id : null)
              }}
              height={420}
            />
          ) : (
            <Empty description="Нет доступных разделов классификатора" />
          )}
        </Space>
      </Modal>

      <Modal
        open={attributeManagerOpen}
        title={selectedNode ? `Настройка паспорта: ${selectedNode.name}` : "Настройка паспорта"}
        onCancel={() => {
          setAttributeManagerOpen(false)
          setEditingAttribute(null)
          setAttributeEditorMode(null)
        }}
        footer={[
          <Button
            key="close"
            onClick={() => {
              setAttributeManagerOpen(false)
              setEditingAttribute(null)
              setAttributeEditorMode(null)
            }}
          >
            Закрыть
          </Button>,
        ]}
        width={1120}
        destroyOnHidden
      >
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
            Эти поля формируют паспорт карточек в выбранном разделе. Единицы измерения, тип значения и варианты
            списка настраиваются внутри поля.
          </Typography.Paragraph>
          <Row gutter={[16, 16]} align="top">
            <Col xs={24} lg={13}>
              <Card
                size="small"
                title="Поля паспорта"
                extra={
                  <Button size="small" type="primary" onClick={openCreateAttribute}>
                    Добавить поле
                  </Button>
                }
              >
                <Table
                  size="small"
                  rowKey="id"
                  columns={attributeColumns}
                  dataSource={attributes}
                  loading={attributesLoading}
                  pagination={false}
                  locale={{ emptyText: "Поля паспорта для этого раздела пока не настроены" }}
                  onRow={(row) => ({
                    onClick: () => openEditAttribute(row),
                    style: {
                      cursor: "pointer",
                      background:
                        attributeEditorMode === "edit" && Number(editingAttribute?.id) === Number(row.id)
                          ? "#f5f5f5"
                          : undefined,
                    },
                  })}
                />
              </Card>
            </Col>
            <Col xs={24} lg={11}>
              <Card
                size="small"
                title={
                  attributeEditorMode === "create"
                    ? "Новое поле"
                    : attributeEditorMode === "edit"
                      ? "Настройка поля"
                      : "Поле паспорта"
                }
              >
                {attributeEditorMode ? (
                  <Form form={attributeForm} layout="vertical">
                    <Form.Item
                      label="Название поля"
                      name="label"
                      rules={[{ required: true, message: "Укажите название поля" }]}
                    >
                      <Input placeholder="Например: Диаметр конуса" />
                    </Form.Item>
                    <Row gutter={12}>
                      <Col xs={24} md={12}>
                        <Form.Item label="Тип значения" name="value_type">
                          <Select options={ATTRIBUTE_TYPE_OPTIONS} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item label="Единица измерения" name="unit">
                          <Select
                            allowClear
                            showSearch
                            loading={measurementUnitsLoading}
                            options={attributeUnitOptions}
                            optionFilterProp="label"
                            placeholder="Выберите единицу"
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={12}>
                      <Col xs={24} md={12}>
                        <Form.Item label="Порядок в паспорте" name="sort_order">
                          <InputNumber style={{ width: "100%" }} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={6}>
                        <Form.Item label="Показывать в фильтрах" name="is_filterable" valuePropName="checked">
                          <Switch />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={6}>
                        <Form.Item label="Обязательное поле" name="is_required" valuePropName="checked">
                          <Switch />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Form.Item shouldUpdate noStyle>
                      {({ getFieldValue }) =>
                        ["select", "multiselect"].includes(getFieldValue("value_type")) ? (
                          <Form.Item label="Варианты для выбора" name="options_text">
                            <Input.TextArea rows={4} placeholder={"Мелкая\nСредняя\nКрупная"} />
                          </Form.Item>
                        ) : null
                      }
                    </Form.Item>
                    <Form.Item label="Подсказка для заполнения" name="help_text">
                      <Input.TextArea rows={3} />
                    </Form.Item>
                    <Space style={{ width: "100%", justifyContent: "flex-end" }}>
                      <Button
                        onClick={() => {
                          setEditingAttribute(null)
                          setAttributeEditorMode(null)
                        }}
                      >
                        Отмена
                      </Button>
                      <Button type="primary" loading={attributeSaving} onClick={handleSaveAttribute}>
                        Сохранить
                      </Button>
                    </Space>
                  </Form>
                ) : (
                  <Empty description="Выберите поле слева или добавьте новое" />
                )}
              </Card>
            </Col>
          </Row>
        </Space>
      </Modal>

      <Modal
        open={modelAttributesOpen}
        title={
          attributeModel
            ? `Характеристики модели: ${attributeModel.manufacturer_name || ""} ${attributeModel.model_name || ""}`
            : "Характеристики модели"
        }
        onCancel={() => setModelAttributesOpen(false)}
        onOk={handleSaveModelAttributes}
        confirmLoading={modelAttributesSaving}
        okText="Сохранить"
        cancelText="Отмена"
        destroyOnHidden
      >
        {modelAttributesLoading ? (
          <Typography.Text type="secondary">Загружаем характеристики...</Typography.Text>
        ) : modelAttributeRows.length ? (
          <Form form={modelAttributesForm} layout="vertical">
            {modelAttributeRows.map((attribute) => renderAttributeValueInput(attribute))}
          </Form>
        ) : (
          <Empty description="Для этого раздела пока нет характеристик" />
        )}
      </Modal>

      <Modal
        open={modelModalOpen}
        title={selectedNode ? `Новая модель для раздела "${selectedNode.name}"` : "Новая модель"}
        onCancel={() => setModelModalOpen(false)}
        onOk={handleCreateModel}
        confirmLoading={modelSaving}
        okText="Создать"
        cancelText="Отмена"
        destroyOnHidden
      >
        <Form form={modelForm} layout="vertical">
          <Form.Item
            label="Производитель"
            name="manufacturer_id"
            rules={[{ required: true, message: "Выберите производителя" }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              options={manufacturers.map((item) => ({
                value: item.id,
                label: item.name,
              }))}
            />
          </Form.Item>
          <Button type="link" style={{ paddingLeft: 0, marginTop: -8 }} onClick={openCreateManufacturer}>
            + Новый производитель
          </Button>
          <Form.Item
            label="Модель"
            name="model_name"
            rules={[{ required: true, message: "Укажите модель" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item label="Заметки" name="notes">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={manufacturerModalOpen}
        title="Новый производитель оборудования"
        onCancel={() => setManufacturerModalOpen(false)}
        onOk={handleCreateManufacturer}
        confirmLoading={manufacturerSaving}
        okText="Создать"
        cancelText="Отмена"
        destroyOnHidden
      >
        <Form form={manufacturerForm} layout="vertical">
          <Form.Item
            label="Название"
            name="name"
            rules={[{ required: true, message: "Укажите производителя" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item label="Страна" name="country">
            <Input />
          </Form.Item>
          <Form.Item label="Сайт" name="website">
            <Input />
          </Form.Item>
          <Form.Item label="Заметки" name="notes">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  )
}

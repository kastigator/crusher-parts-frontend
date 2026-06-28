import React, { useCallback, useEffect, useMemo, useState } from "react"
import { Alert, Button, Card, Descriptions, Drawer, Input, Modal, Select, Space, Table, Tag, Tooltip, Typography } from "antd"
import { ReloadOutlined, InboxOutlined } from "@ant-design/icons"
import dayjs from "dayjs"
import { useNavigate } from "react-router-dom"
import axios from "@/api/axiosInstance"
import { appMessage } from "@/utils/uiFeedback"
import { getTrashModeMeta } from "@/utils/trashUi"
import { getTrashEntityLabel } from "@/utils/trashLabels"

const { Text } = Typography

const SUMMARY_PRIMARY_STYLE = {
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
  lineHeight: 1.35,
}

const SUMMARY_SECONDARY_STYLE = {
  display: "-webkit-box",
  WebkitLineClamp: 1,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
  lineHeight: 1.35,
}

const STATUS_OPTIONS = [
  { value: "pending", label: "Ожидают восстановления" },
  { value: "restored", label: "Восстановленные" },
]

const STATUS_LABELS = {
  pending: "Ожидает восстановления",
  restored: "Восстановлено",
}

const MODE_OPTIONS = [
  { value: "trash", label: "Корзина" },
  { value: "relation_delete", label: "Удаление связи" },
  { value: "archive_only", label: "Только архив" },
  { value: "forbidden", label: "Недоступно" },
]

const QUICK_FILTERS = [
  { key: "all", label: "Все", types: null },
  {
    key: "clients",
    label: "Клиенты",
    types: [
      "clients",
      "client_contacts",
      "client_billing_addresses",
      "client_shipping_addresses",
      "client_bank_details",
      "client_equipment_units",
      "client_parts",
      "client_part_applications",
      "client_part_documents",
    ],
  },
  {
    key: "suppliers",
    label: "Поставщики",
    types: [
      "part_suppliers",
      "supplier_contacts",
      "supplier_addresses",
      "supplier_bank_details",
      "supplier_parts",
      "supplier_part_materials",
      "supplier_part_oem_parts",
      "supplier_part_prices",
      "supplier_price_lists",
      "supplier_price_list_lines",
      "supplier_bundles",
      "supplier_bundle_items",
      "supplier_bundle_item_links",
    ],
  },
  {
    key: "oem",
    label: "OEM-детали",
    types: [
      "oem_parts",
      "original_part_groups",
      "oem_part_model_fitments",
      "oem_part_model_bom",
      "oem_part_materials",
      "oem_part_material_specs",
      "oem_part_alt_groups",
      "oem_part_alt_items",
      "oem_part_documents",
      "oem_part_presentation_profiles",
      "oem_part_unit_overrides",
      "oem_part_unit_material_overrides",
      "oem_part_unit_material_specs",
    ],
  },
  {
    key: "catalogs",
    label: "Справочники",
    types: [
      "materials",
      "material_properties",
      "material_property_curves",
      "material_aliases",
      "tnved_codes",
      "logistics_route_templates",
      "equipment_manufacturers",
      "equipment_models",
      "equipment_classifier_nodes",
    ],
  },
]

const SNAPSHOT_FIELD_LABELS = {
  code: "Код",
  article: "Артикул",
  name: "Название",
  title: "Название",
  description: "Описание",
  note: "Примечание",
  comment: "Комментарий",
  full_name: "ФИО",
  email: "Эл. почта",
  phone: "Телефон",
  address: "Адрес",
  city: "Город",
  country: "Страна",
  inn: "ИНН",
  kpp: "КПП",
  bic: "БИК",
  iban: "IBAN",
  account_number: "Номер счёта",
  bank_name: "Банк",
  currency: "Валюта",
  target_currency: "Целевая валюта",
  target_rfqs: "Целевое число RFQ",
  target_invites: "Целевое число приглашений",
  target_selections: "Целевое число выборов",
  target_landed_amount: "Целевая сумма с доставкой",
  target_purchase_orders: "Целевое число заказов",
  amount: "Сумма",
  price: "Цена",
  unit_price: "Цена за единицу",
  value: "Значение",
  duty_rate: "Пошлина",
  quantity: "Количество",
  period_start: "Период с",
  period_end: "Период по",
  valid_from: "Действует с",
  valid_to: "Действует по",
  source_type: "Источник",
  source_subtype: "Подтип источника",
  status: "Статус",
  role: "Роль",
}

const SNAPSHOT_HIDDEN_FIELDS = new Set([
  "id",
  "created_at",
  "updated_at",
  "deleted_at",
  "restored_at",
  "trash_entry_id",
  "deleted_by_user_id",
  "restored_by_user_id",
  "snapshot_json",
  "context_json",
  "sort_order",
])

function buildMeaningLines(entityType, snapshot, record) {
  if (!snapshot || typeof snapshot !== "object") return []

  const periodStart = formatSnapshotValue(snapshot.period_start)
  const periodEnd = formatSnapshotValue(snapshot.period_end)
  const title = formatTrashText(record?.title)
  const subtitle = formatTrashText(record?.subtitle)

  switch (entityType) {
    case "procurement_kpi_targets":
    case "sales_kpi_targets":
      return [
        periodStart !== "—" || periodEnd !== "—" ? `Период: ${periodStart} - ${periodEnd}` : null,
        formatSnapshotValue(snapshot.target_currency) !== "—" ? `Целевая валюта: ${formatSnapshotValue(snapshot.target_currency)}` : null,
        formatSnapshotValue(snapshot.target_rfqs) !== "—" ? `Целевое число RFQ: ${formatSnapshotValue(snapshot.target_rfqs)}` : null,
      ].filter(Boolean)
    case "supplier_part_prices":
      return [
        title !== "—" ? `Деталь: ${title}` : null,
        formatSnapshotValue(snapshot.price ?? snapshot.unit_price) !== "—"
          ? `Цена: ${formatSnapshotValue(snapshot.price ?? snapshot.unit_price)}`
          : null,
        formatSnapshotValue(snapshot.currency) !== "—" ? `Валюта: ${formatSnapshotValue(snapshot.currency)}` : null,
      ].filter(Boolean)
    case "supplier_price_lists":
      return [
        title !== "—" ? `Прайс-лист: ${title}` : null,
        formatSnapshotValue(snapshot.currency) !== "—" ? `Валюта: ${formatSnapshotValue(snapshot.currency)}` : null,
        formatSnapshotValue(snapshot.valid_from) !== "—" || formatSnapshotValue(snapshot.valid_to) !== "—"
          ? `Период действия: ${formatSnapshotValue(snapshot.valid_from)} - ${formatSnapshotValue(snapshot.valid_to)}`
          : null,
      ].filter(Boolean)
    case "oem_part_model_fitments":
      return [
        title !== "—" ? `Связь: ${title}` : null,
        subtitle !== "—" ? `Контекст: ${subtitle}` : null,
      ].filter(Boolean)
    case "oem_part_materials":
      return [
        title !== "—" ? `Материал: ${title}` : null,
        formatSnapshotValue(snapshot.note) !== "—" ? `Примечание: ${formatSnapshotValue(snapshot.note)}` : null,
      ].filter(Boolean)
    case "oem_parts":
      return [
        title !== "—" ? `OEM-деталь: ${title}` : null,
        subtitle !== "—" ? `Контекст: ${subtitle}` : null,
        formatSnapshotValue(snapshot.code) !== "—" ? `Код: ${formatSnapshotValue(snapshot.code)}` : null,
      ].filter(Boolean)
    case "client_contacts":
    case "supplier_contacts":
      return [
        formatSnapshotValue(snapshot.full_name) !== "—" ? `Контакт: ${formatSnapshotValue(snapshot.full_name)}` : null,
        formatSnapshotValue(snapshot.phone) !== "—" ? `Телефон: ${formatSnapshotValue(snapshot.phone)}` : null,
        formatSnapshotValue(snapshot.email) !== "—" ? `Эл. почта: ${formatSnapshotValue(snapshot.email)}` : null,
      ].filter(Boolean)
    case "client_bank_details":
    case "supplier_bank_details":
      return [
        formatSnapshotValue(snapshot.bank_name) !== "—" ? `Банк: ${formatSnapshotValue(snapshot.bank_name)}` : null,
        formatSnapshotValue(snapshot.account_number) !== "—"
          ? `Счёт: ${formatSnapshotValue(snapshot.account_number)}`
          : null,
        formatSnapshotValue(snapshot.currency) !== "—" ? `Валюта: ${formatSnapshotValue(snapshot.currency)}` : null,
      ].filter(Boolean)
    case "tnved_codes":
      return [
        formatSnapshotValue(snapshot.code) !== "—" ? `Код: ${formatSnapshotValue(snapshot.code)}` : null,
        formatSnapshotValue(snapshot.description) !== "—"
          ? `Описание: ${formatSnapshotValue(snapshot.description)}`
          : null,
        formatSnapshotValue(snapshot.duty_rate) !== "—" ? `Пошлина: ${formatSnapshotValue(snapshot.duty_rate)}` : null,
      ].filter(Boolean)
    case "logistics_route_templates":
      return [
        title !== "—" ? `Шаблон: ${title}` : null,
        formatSnapshotValue(snapshot.description) !== "—"
          ? `Описание: ${formatSnapshotValue(snapshot.description)}`
          : null,
      ].filter(Boolean)
    default:
      return [
        title !== "—" ? `Название: ${title}` : null,
        subtitle !== "—" ? `Подзаголовок: ${subtitle}` : null,
      ].filter(Boolean)
  }
}

function buildItemMeaningLines(item) {
  return buildMeaningLines(item?.item_type, item?.parsed_snapshot, item)
}

function buildListSummary(record) {
  const title = formatTrashText(record?.title)
  const subtitle = formatTrashText(record?.subtitle)
  const lines = []

  if (title !== "—") lines.push(title)
  if (subtitle !== "—" && subtitle !== title) lines.push(subtitle)
  if (record?.root_entity_type && record.root_entity_type !== record.entity_type) {
    lines.push(`Связано с: ${getTrashEntityLabel(record.root_entity_type)}`)
  }

  return lines.slice(0, 3)
}

function renderConflictText(conflict) {
  const base = conflict?.message || conflict?.code || "Конфликт"
  const existing = conflict?.existing_row
  if (!existing?.id) return base
  const summary = existing?.summary ? ` (${existing.summary})` : ""
  return `${base}. Конфликтующая запись: #${existing.id}${summary}`
}

function formatDateTime(value) {
  if (!value) return "—"
  const dt = dayjs(value)
  return dt.isValid() ? dt.format("DD.MM.YYYY HH:mm") : String(value)
}

function formatTrashText(value) {
  if (value == null || value === "") return "—"
  const raw = String(value).trim()
  if (!raw) return "—"

  if (raw.includes("..")) {
    const parts = raw.split("..").map((part) => part.trim()).filter(Boolean)
    const formatted = parts.map((part) => {
      const dt = dayjs(part)
      if (dt.isValid()) return dt.format("DD.MM.YYYY")
      return part
    })
    if (formatted.length) return formatted.join(" - ")
  }

  if (raw.includes("GMT") || raw.includes("Eastern European")) {
    const dt = dayjs(raw)
    if (dt.isValid()) return dt.format("DD.MM.YYYY")
  }

  const directDate = dayjs(raw)
  if (directDate.isValid() && /^\d{4}-\d{2}-\d{2}/.test(raw)) {
    return directDate.format("DD.MM.YYYY")
  }

  return raw
}

function formatSnapshotValue(value) {
  if (value == null || value === "") return "—"
  if (typeof value === "boolean") return value ? "Да" : "Нет"
  if (typeof value === "number") return String(value)
  if (typeof value === "string") return formatTrashText(value)
  if (Array.isArray(value)) return value.length ? value.join(", ") : "—"
  return null
}

function buildSnapshotSummary(snapshot) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) return []

  return Object.entries(snapshot)
    .filter(([key]) => !SNAPSHOT_HIDDEN_FIELDS.has(key))
    .filter(([key]) => !key.endsWith("_id"))
    .map(([key, value]) => ({
      key,
      label: SNAPSHOT_FIELD_LABELS[key] || key,
      value: formatSnapshotValue(value),
    }))
    .filter((item) => item.value != null)
    .slice(0, 12)
}

function isMeaningfulObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length > 0
}

function formatRestoreStatus(value) {
  return STATUS_LABELS[value] || value || "—"
}

function buildGroupedDetailItems(items) {
  const groups = new Map()

  items.forEach((item) => {
    const key = item?.item_type || "unknown"
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        label: getTrashEntityLabel(key),
        count: 0,
        items: [],
      })
    }
    const group = groups.get(key)
    group.count += 1
    group.items.push(item)
  })

  return Array.from(groups.values()).sort((a, b) => String(a.label).localeCompare(String(b.label), "ru"))
}

function RestorePreviewContent({ preview }) {
  const conflicts = Array.isArray(preview?.conflicts) ? preview.conflicts : []

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <Descriptions size="small" bordered column={1}>
        <Descriptions.Item label="Статус">{preview?.restore_status || "—"}</Descriptions.Item>
        <Descriptions.Item label="Основная запись">{preview?.affected?.root || 0}</Descriptions.Item>
        <Descriptions.Item label="Связанные записи">{preview?.affected?.items || 0}</Descriptions.Item>
        <Descriptions.Item label="Автовосстановление">
          {preview?.can_restore ? <Tag color="green">Доступно</Tag> : <Tag color="red">Есть конфликты</Tag>}
        </Descriptions.Item>
      </Descriptions>

      <Alert
        type={preview?.can_restore ? "success" : "warning"}
        showIcon
        message={preview?.summary?.title || "Проверка восстановления"}
        description={preview?.summary?.message || "—"}
      />

      {conflicts.length ? (
        <Alert
          type="error"
          showIcon
          message="Конфликты восстановления"
          description={
            <Space direction="vertical" size={4}>
              {conflicts.map((conflict, idx) => (
                <Text key={`${conflict.code || "conflict"}-${idx}`}>
                  {renderConflictText(conflict)}
                </Text>
              ))}
            </Space>
          }
        />
      ) : null}
    </Space>
  )
}

function resolveTrashNavigationTarget(record) {
  const rootType = record?.root_entity_type || record?.entity_type
  const rootId = Number(record?.root_entity_id || record?.entity_id)

  switch (rootType) {
    case "clients":
      return rootId > 0 ? `/clients/${rootId}` : "/clients"
    case "client_parts":
      return "/clients"
    case "part_suppliers":
      return rootId > 0 ? `/suppliers/${rootId}` : "/suppliers"
    case "oem_parts":
      return rootId > 0 ? `/original-parts/${rootId}` : "/original-parts"
    case "supplier_parts":
      return rootId > 0 ? `/supplier-parts/${rootId}` : "/supplier-parts"
    case "materials":
      return "/materials"
    case "tnved_codes":
      return "/tnved-codes"
    case "logistics_route_templates":
      return "/logistics-route-templates"
    case "equipment_manufacturers":
    case "equipment_models":
    case "equipment_classifier_nodes":
      return "/equipment-classifier"
    case "users":
    case "roles":
    case "tabs":
      return "/users"
    case "original_part_groups":
    case "oem_part_materials":
    case "oem_part_model_bom":
    case "oem_part_alt_groups":
    case "oem_part_alt_items":
    case "oem_part_documents":
    case "oem_part_presentation_profiles":
    case "oem_part_unit_overrides":
    case "oem_part_unit_material_overrides":
    case "oem_part_unit_material_specs":
      return rootId > 0 ? `/original-parts/${rootId}` : "/original-parts"
    case "supplier_price_lists":
    case "supplier_part_prices":
    case "supplier_part_oem_parts":
    case "supplier_part_materials":
    case "supplier_bundles":
    case "supplier_bundle_items":
    case "supplier_bundle_item_links":
      return "/supplier-parts"
    case "procurement_kpi_targets":
    case "sales_kpi_targets":
      return "/kpi"
    default:
      return null
  }
}

export default function TrashPage() {
  const navigate = useNavigate()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState("pending")
  const [entityType, setEntityType] = useState(undefined)
  const [quickFilter, setQuickFilter] = useState("all")
  const [deleteMode, setDeleteMode] = useState(undefined)
  const [search, setSearch] = useState("")
  const [restoringId, setRestoringId] = useState(null)
  const [selectedEntry, setSelectedEntry] = useState(null)
  const [entryLoading, setEntryLoading] = useState(false)

  const loadTrash = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await axios.get("/trash", {
        params: { status, entity_type: entityType, delete_mode: deleteMode, limit: 200 },
      })
      setRows(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error(error)
      appMessage.error(error?.response?.data?.message || "Не удалось загрузить корзину")
    } finally {
      setLoading(false)
    }
  }, [deleteMode, entityType, status])

  useEffect(() => {
    loadTrash()
  }, [loadTrash])

  const filteredRows = useMemo(() => {
    const q = String(search || "").trim().toLowerCase()
    const quickTypes = QUICK_FILTERS.find((item) => item.key === quickFilter)?.types

    return rows.filter((row) => {
      if (quickTypes && !quickTypes.includes(row?.entity_type)) {
        return false
      }
      if (!q) return true
      const haystack = [
        row?.title,
        row?.subtitle,
        row?.entity_type,
        getTrashEntityLabel(row?.entity_type),
        row?.deleted_by_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [quickFilter, rows, search])

  const entityOptions = useMemo(() => {
    const seen = new Set()
    const options = []
    rows.forEach((row) => {
      const value = row?.entity_type
      if (!value || seen.has(value)) return
      seen.add(value)
      options.push({
        value,
        label: getTrashEntityLabel(value),
      })
    })
    return options.sort((a, b) => String(a.label).localeCompare(String(b.label), "ru"))
  }, [rows])

  const openRestoredTarget = useCallback(
    (record) => {
      const target = resolveTrashNavigationTarget(record)
      if (!target) {
        appMessage.info("Для этой сущности переход из корзины пока не настроен")
        return
      }
      navigate(target)
    },
    [navigate]
  )

  const selectedModeMeta = useMemo(() => {
    if (!selectedEntry?.delete_mode) return null
    return getTrashModeMeta(selectedEntry.delete_mode)
  }, [selectedEntry])

  const handleRestore = async (record) => {
    if (!record?.id) return
    try {
      const { data: preview } = await axios.get(`/trash/${record.id}/restore-preview`)
      if (!preview?.can_restore) {
        Modal.info({
          title: preview?.summary?.title || "Восстановление требует внимания",
          width: 720,
          okText: "Понятно",
          content: <RestorePreviewContent preview={preview} />,
        })
        return
      }

      Modal.confirm({
        title: "Восстановить запись из корзины?",
        width: 720,
        okText: "Восстановить",
        cancelText: "Отмена",
        content: <RestorePreviewContent preview={preview} />,
        onOk: async () => {
          setRestoringId(record.id)
          try {
            const { data } = await axios.post(`/trash/${record.id}/restore`)
            appMessage.success(data?.message || "Запись восстановлена")
            await loadTrash()
            Modal.success({
              title: "Запись восстановлена",
              okText: "Закрыть",
              cancelText: "Открыть",
              okCancel: !!resolveTrashNavigationTarget(record),
              onCancel: () => openRestoredTarget(record),
              content: "Запись возвращена в систему. При необходимости можно сразу открыть связанный раздел.",
            })
          } finally {
            setRestoringId(null)
          }
        },
      })
    } catch (error) {
      console.error(error)
      appMessage.error(error?.response?.data?.message || "Не удалось восстановить запись")
    }
  }

  const handleOpenEntry = async (record) => {
    if (!record?.id) return
    setEntryLoading(true)
    try {
      const { data } = await axios.get(`/trash/${record.id}`)
      setSelectedEntry(data || null)
    } catch (error) {
      console.error(error)
      appMessage.error(error?.response?.data?.message || "Не удалось загрузить запись корзины")
    } finally {
      setEntryLoading(false)
    }
  }

  const parsedSnapshot = useMemo(() => {
    const raw = selectedEntry?.snapshot_json
    if (!raw) return null
    if (typeof raw === "object") return raw
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  }, [selectedEntry])

  const parsedContext = useMemo(() => {
    const raw = selectedEntry?.context_json
    if (!raw) return null
    if (typeof raw === "object") return raw
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  }, [selectedEntry])

  const detailItems = useMemo(() => {
    const list = Array.isArray(selectedEntry?.items) ? selectedEntry.items : []
    return list.map((item) => {
      let snapshot = null
      try {
        snapshot =
          item?.snapshot_json && typeof item.snapshot_json === "string"
            ? JSON.parse(item.snapshot_json)
            : item?.snapshot_json || null
      } catch {
        snapshot = null
      }
      return { ...item, parsed_snapshot: snapshot }
    })
  }, [selectedEntry])

  const rootSnapshotSummary = useMemo(() => buildSnapshotSummary(parsedSnapshot), [parsedSnapshot])
  const contextSummary = useMemo(() => buildSnapshotSummary(parsedContext), [parsedContext])
  const groupedDetailItems = useMemo(() => buildGroupedDetailItems(detailItems), [detailItems])
  const meaningLines = useMemo(
    () => buildMeaningLines(selectedEntry?.entity_type, parsedSnapshot, selectedEntry),
    [parsedSnapshot, selectedEntry]
  )
  const listStats = useMemo(() => {
    const distinctTypes = new Set(filteredRows.map((row) => row?.entity_type).filter(Boolean)).size
    const relatedItems = filteredRows.reduce((sum, row) => sum + Number(row?.item_count || 0), 0)
    const relationDeletes = filteredRows.filter((row) => row?.delete_mode === "relation_delete").length
    return {
      total: filteredRows.length,
      distinctTypes,
      relatedItems,
      relationDeletes,
    }
  }, [filteredRows])

  const columns = [
    {
      title: "Тип",
      dataIndex: "entity_type",
      key: "entity_type",
      width: 190,
      render: (value) => (
        <Tooltip title={getTrashEntityLabel(value)}>
          <Text ellipsis style={{ maxWidth: 170 }}>
            {getTrashEntityLabel(value)}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: "Запись",
      key: "summary",
      width: 380,
      render: (_, record) => {
        const lines = buildListSummary(record)
        return (
          <Space direction="vertical" size={2} style={{ width: "100%" }}>
            {lines.length ? (
              lines.map((line, idx) => (
                <Tooltip key={`${record.id}-${idx}`} title={line}>
                  <Text
                    type={idx === 0 ? undefined : "secondary"}
                    style={idx === 0 ? SUMMARY_PRIMARY_STYLE : SUMMARY_SECONDARY_STYLE}
                  >
                    {line}
                  </Text>
                </Tooltip>
              ))
            ) : (
              <Text>{`#${record?.id}`}</Text>
            )}
          </Space>
        )
      },
    },
    {
      title: "Режим",
      dataIndex: "delete_mode",
      key: "delete_mode",
      width: 140,
      render: (value) => {
        const meta = getTrashModeMeta(value)
        return <Tag color={meta.color}>{meta.label}</Tag>
      },
    },
    {
      title: "Связанные записи",
      dataIndex: "item_count",
      key: "item_count",
      width: 120,
    },
    {
      title: "Удалил",
      dataIndex: "deleted_by_name",
      key: "deleted_by_name",
      width: 180,
      render: (value) => (
        <Tooltip title={value || "—"}>
          <Text ellipsis style={{ maxWidth: 160 }}>
            {value || "—"}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: "Удалено",
      dataIndex: "deleted_at",
      key: "deleted_at",
      width: 170,
      render: formatDateTime,
    },
    {
      title: "Хранить до",
      dataIndex: "purge_after_at",
      key: "purge_after_at",
      width: 170,
      render: formatDateTime,
    },
    {
      title: "Действие",
      key: "actions",
      width: 220,
      fixed: "right",
      render: (_, record) => (
        <Space size="small" wrap>
          <Button size="small" onClick={() => handleOpenEntry(record)}>
            Просмотр
          </Button>
          {status === "pending" ? (
            <Button type="primary" size="small" loading={restoringId === record.id} onClick={() => handleRestore(record)}>
              Восстановить
            </Button>
          ) : (
            <Space size="small">
              <Tag color="green">Восстановлено</Tag>
              {resolveTrashNavigationTarget(record) ? (
                <Button size="small" onClick={() => openRestoredTarget(record)}>
                  Открыть
                </Button>
              ) : null}
            </Space>
          )}
        </Space>
      ),
    },
  ]

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Card bodyStyle={{ paddingTop: 8 }}>
        <div className="table-section" style={{ display: "flex", justifyContent: "space-between" }}>
          <Space wrap>
            <Input
              allowClear
              placeholder="Поиск по корзине"
              style={{ width: 320 }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select
              allowClear
              placeholder="Тип сущности"
              style={{ width: 240 }}
              value={entityType}
              options={entityOptions}
              onChange={(value) => {
                setEntityType(value || undefined)
                if (value) setQuickFilter("all")
              }}
            />
            <Select
              allowClear
              placeholder="Режим удаления"
              style={{ width: 220 }}
              value={deleteMode}
              options={MODE_OPTIONS}
              onChange={(value) => setDeleteMode(value || undefined)}
            />
            <Select
              value={status}
              style={{ width: 240 }}
              options={STATUS_OPTIONS}
              onChange={setStatus}
            />
          </Space>
          <Space wrap>
            <Button icon={<ReloadOutlined />} onClick={loadTrash}>
              Обновить
            </Button>
          </Space>
        </div>

        <Space wrap className="table-section">
          {QUICK_FILTERS.map((item) => (
            <Button
              key={item.key}
              type={quickFilter === item.key ? "primary" : "default"}
              size="small"
              onClick={() => {
                setQuickFilter(item.key)
                setEntityType(undefined)
              }}
            >
              {item.label}
            </Button>
          ))}
        </Space>

        <div className="table-section" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <InboxOutlined />
          <span>Корзина показывает реальные записи, которые можно восстановить, а не историю удаления.</span>
        </div>

        <Descriptions
          size="small"
          bordered
          column={{ xs: 1, sm: 2, md: 4 }}
          className="table-section"
        >
          <Descriptions.Item label="Записей">{listStats.total}</Descriptions.Item>
          <Descriptions.Item label="Типов записей">{listStats.distinctTypes}</Descriptions.Item>
          <Descriptions.Item label="Связанных записей">{listStats.relatedItems}</Descriptions.Item>
          <Descriptions.Item label="Удалённых связей">{listStats.relationDeletes}</Descriptions.Item>
        </Descriptions>

        <div className="parts-table-wrap table-section">
          <Table
            rowKey="id"
            dataSource={filteredRows}
            columns={columns}
            loading={loading}
            size="middle"
            pagination={{ pageSize: 50, showSizeChanger: false }}
            scroll={{ x: 1320 }}
            tableLayout="fixed"
            locale={{
              emptyText: search || entityType || deleteMode
                ? "По текущим фильтрам записей не найдено"
                : "Корзина пока пуста",
            }}
          />
        </div>
      </Card>

      <Drawer
        open={!!selectedEntry}
        width={860}
        title="Запись корзины"
        onClose={() => setSelectedEntry(null)}
        extra={
          selectedEntry ? (
            <Space>
              {selectedEntry?.restore_status === "restored" && resolveTrashNavigationTarget(selectedEntry) ? (
                <Button onClick={() => openRestoredTarget(selectedEntry)}>Открыть</Button>
              ) : null}
              {selectedEntry?.restore_status === "pending" ? (
                <Button
                  type="primary"
                  loading={restoringId === selectedEntry.id}
                  onClick={() => handleRestore(selectedEntry)}
                >
                  Восстановить
                </Button>
              ) : null}
            </Space>
          ) : null
        }
      >
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Descriptions size="small" bordered column={1}>
            <Descriptions.Item label="Тип">
              {getTrashEntityLabel(selectedEntry?.entity_type)}
            </Descriptions.Item>
            <Descriptions.Item label="Название">{formatTrashText(selectedEntry?.title)}</Descriptions.Item>
            <Descriptions.Item label="Подзаголовок">{formatTrashText(selectedEntry?.subtitle)}</Descriptions.Item>
            <Descriptions.Item label="Режим">
              {selectedModeMeta ? <Tag color={selectedModeMeta.color}>{selectedModeMeta.label}</Tag> : "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Удалил">{selectedEntry?.deleted_by_name || "—"}</Descriptions.Item>
            <Descriptions.Item label="Удалено">{formatDateTime(selectedEntry?.deleted_at)}</Descriptions.Item>
            <Descriptions.Item label="Хранить до">{formatDateTime(selectedEntry?.purge_after_at)}</Descriptions.Item>
            <Descriptions.Item label="Статус">{formatRestoreStatus(selectedEntry?.restore_status)}</Descriptions.Item>
            {selectedEntry?.root_entity_type ? (
              <Descriptions.Item label="Основная запись">
                {getTrashEntityLabel(selectedEntry.root_entity_type)}
                {selectedEntry?.root_entity_id ? ` #${selectedEntry.root_entity_id}` : ""}
              </Descriptions.Item>
            ) : null}
          </Descriptions>

          {meaningLines.length ? (
            <Alert
              type="info"
              showIcon
              message="Что будет восстановлено"
              description={
                <Space direction="vertical" size={4}>
                  {meaningLines.map((line, idx) => (
                    <Text key={`${line}-${idx}`}>{line}</Text>
                  ))}
                </Space>
              }
            />
          ) : null}

          {isMeaningfulObject(parsedContext) && contextSummary.length ? (
            <Card size="small" title="Контекст удаления" loading={entryLoading}>
              <Descriptions size="small" bordered column={1}>
                {contextSummary.map((item) => (
                  <Descriptions.Item key={item.key} label={item.label}>
                    {item.value}
                  </Descriptions.Item>
                ))}
              </Descriptions>
            </Card>
          ) : null}

          {parsedSnapshot ? (
            <Card size="small" title="Данные записи" loading={entryLoading}>
              <Space direction="vertical" size={12} style={{ width: "100%" }}>
                {rootSnapshotSummary.length ? (
                  <Descriptions size="small" bordered column={1}>
                    {rootSnapshotSummary.map((item) => (
                      <Descriptions.Item key={item.key} label={item.label}>
                        {item.value}
                      </Descriptions.Item>
                    ))}
                  </Descriptions>
                ) : (
                  <Text type="secondary">Понятные поля для отображения не найдены</Text>
                )}
              </Space>
            </Card>
          ) : null}

          <Card size="small" title={`Связанные записи: ${detailItems.length}`} loading={entryLoading}>
            <Space direction="vertical" size={12} style={{ width: "100%" }}>
              {detailItems.length ? (
                <>
                  <Descriptions size="small" bordered column={1}>
                    {groupedDetailItems.map((group) => (
                      <Descriptions.Item key={group.key} label={group.label}>
                        {group.count}
                      </Descriptions.Item>
                    ))}
                  </Descriptions>

                  {groupedDetailItems.map((group) => (
                    <Card
                      key={group.key}
                      size="small"
                      type="inner"
                      title={`${group.label}: ${group.count}`}
                    >
                      <Space direction="vertical" size={12} style={{ width: "100%" }}>
                        {group.items.map((item) => (
                          <Card
                            key={item.id}
                            size="small"
                            type="inner"
                            title={
                              formatTrashText(item.title) !== "—"
                                ? formatTrashText(item.title)
                                : `${getTrashEntityLabel(item.item_type)}${item.item_id ? ` #${item.item_id}` : ""}`
                            }
                          >
                            <Space direction="vertical" size={8} style={{ width: "100%" }}>
                              <Text type="secondary">
                                {getTrashEntityLabel(item.item_type)}
                                {item.item_role ? ` / ${formatTrashText(item.item_role)}` : ""}
                              </Text>
                              {buildItemMeaningLines(item).length ? (
                                <Alert
                                  type="info"
                                  showIcon
                                  message="Что вернётся"
                                  description={
                                    <Space direction="vertical" size={4}>
                                      {buildItemMeaningLines(item).map((line, idx) => (
                                        <Text key={`${item.id}-${idx}`}>{line}</Text>
                                      ))}
                                    </Space>
                                  }
                                />
                              ) : null}
                              {buildSnapshotSummary(item.parsed_snapshot).length ? (
                                <Descriptions size="small" bordered column={1}>
                                  {buildSnapshotSummary(item.parsed_snapshot).map((field) => (
                                    <Descriptions.Item key={field.key} label={field.label}>
                                      {field.value}
                                    </Descriptions.Item>
                                  ))}
                                </Descriptions>
                              ) : (
                                <Text type="secondary">Дополнительных отображаемых полей нет</Text>
                              )}
                            </Space>
                          </Card>
                        ))}
                      </Space>
                    </Card>
                  ))}
                </>
              ) : (
                  <Text type="secondary">Связанных записей нет</Text>
              )}
            </Space>
          </Card>
        </Space>
      </Drawer>
    </Space>
  )
}

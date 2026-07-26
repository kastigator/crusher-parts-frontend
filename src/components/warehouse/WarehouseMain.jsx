import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "react-router-dom"
import dayjs from "dayjs"
import {
  App as AntdApp,
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Typography,
} from "antd"
import {
  AppstoreAddOutlined,
  DeleteOutlined,
  EnvironmentOutlined,
  InboxOutlined,
  LockOutlined,
  PlusOutlined,
  ReloadOutlined,
  SwapOutlined,
  UnlockOutlined,
} from "@ant-design/icons"
import axios from "@/api/axiosInstance"

const { Text } = Typography
const { TextArea } = Input

const DOC_TYPE_META = {
  receipt: { label: "Приход", color: "green", icon: <InboxOutlined /> },
  transfer: { label: "Перемещение", color: "blue", icon: <SwapOutlined /> },
  writeoff: { label: "Списание", color: "red", icon: <DeleteOutlined /> },
  reserve: { label: "Резерв", color: "gold", icon: <LockOutlined /> },
  unreserve: { label: "Снятие резерва", color: "purple", icon: <UnlockOutlined /> },
}

const STATUS_META = {
  draft: { label: "Черновик", color: "default" },
  posted: { label: "Проведён", color: "green" },
  cancelled: { label: "Отменён", color: "red" },
}

const WAREHOUSE_TYPE_OPTIONS = [
  { value: "physical", label: "Физический склад" },
  { value: "office", label: "Офис" },
  { value: "transit", label: "Транзит" },
]

const SOURCE_TYPE_OPTIONS = [
  { value: "manual", label: "Ручной резерв" },
  { value: "client_request", label: "Заявка клиента" },
  { value: "sales_quote", label: "Коммерческое предложение" },
  { value: "contract", label: "Контракт" },
  { value: "rfq", label: "RFQ" },
  { value: "purchase_order", label: "Заказ поставщику" },
]

const SOURCE_LABEL_BY_VALUE = SOURCE_TYPE_OPTIONS.reduce((acc, item) => {
  acc[item.value] = item.label
  return acc
}, {})

const WAREHOUSE_MODE_OPTIONS = [
  { key: "stock", label: "Остатки" },
  { key: "reservations", label: "Резервы" },
  { key: "documents", label: "Документы" },
  { key: "places", label: "Адреса хранения" },
]

const WAREHOUSE_MODE_KEYS = new Set(WAREHOUSE_MODE_OPTIONS.map((item) => item.key))
const POSITION_FILTER_QUERY_KEYS = [
  "catalog_position_id",
  "position_id",
  "position_label",
  "position_title",
  "position_subtitle",
  "uom",
  "action",
]

const formatQuantity = (value) => {
  const n = Number(value || 0)
  if (!Number.isFinite(n)) return "0"
  return n.toLocaleString("ru-RU", { maximumFractionDigits: 3 })
}

const formatDate = (value) => (value ? dayjs(value).format("DD.MM.YYYY HH:mm") : "—")

const positionTitle = (row) =>
  row?.manufacturer_part_number ||
  row?.position_code ||
  row?.display_name ||
  row?.display_name_en ||
  row?.display_name_ru ||
  `#${row?.catalog_position_id || row?.id || ""}`

const positionSubtitle = (row) => {
  const title = row?.display_name || row?.display_name_en || row?.display_name_ru
  const model = [row?.manufacturer_name, row?.model_name].filter(Boolean).join(" · ")
  return [title, model].filter(Boolean).join(" · ")
}

const sourceTitle = (row) => {
  if (row?.source_label) return row.source_label
  const typeLabel = SOURCE_LABEL_BY_VALUE[row?.source_type] || row?.source_type || "Ручной резерв"
  const id = row?.source_id ? ` #${row.source_id}` : ""
  return `${typeLabel}${id}`
}

const normalizeSelectValue = (value) => {
  if (value === "all" || value === undefined || value === null || value === "") return value
  const n = Number(value)
  return Number.isFinite(n) ? n : value
}

export default function WarehouseMain() {
  const { message } = AntdApp.useApp()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialMode = WAREHOUSE_MODE_KEYS.has(searchParams.get("mode")) ? searchParams.get("mode") : "stock"
  const [locations, setLocations] = useState([])
  const [places, setPlaces] = useState([])
  const [overview, setOverview] = useState({
    stats: { positions_count: 0, actual_qty: 0, reserved_qty: 0, free_qty: 0 },
    stock: [],
    documents: [],
    reservations: [],
  })
  const [selectedWarehouse, setSelectedWarehouse] = useState(
    normalizeSelectValue(searchParams.get("warehouse_id")) || "all"
  )
  const [search, setSearch] = useState(searchParams.get("q") || "")
  const [activeMode, setActiveMode] = useState(initialMode)
  const [loading, setLoading] = useState(false)
  const [docModalOpen, setDocModalOpen] = useState(false)
  const [placeModalOpen, setPlaceModalOpen] = useState(false)
  const [warehouseModalOpen, setWarehouseModalOpen] = useState(false)
  const [documentPreviewOpen, setDocumentPreviewOpen] = useState(false)
  const [documentPreview, setDocumentPreview] = useState(null)
  const [documentPreviewLoading, setDocumentPreviewLoading] = useState(false)
  const [positionOptions, setPositionOptions] = useState([])
  const [positionLoading, setPositionLoading] = useState(false)

  const [docForm] = Form.useForm()
  const [placeForm] = Form.useForm()
  const [warehouseForm] = Form.useForm()
  const searchTimerRef = useRef(null)
  const urlActionHandledRef = useRef("")

  const docType = Form.useWatch("doc_type", docForm) || "receipt"
  const isReserveDoc = docType === "reserve" || docType === "unreserve"
  const warehouseId = Form.useWatch("warehouse_id", docForm)
  const sourceWarehouseId = Form.useWatch("source_warehouse_id", docForm)
  const targetWarehouseId = Form.useWatch("target_warehouse_id", docForm)

  const locationOptions = useMemo(
    () =>
      locations.map((item) => ({
        value: item.id,
        label: item.name,
        title: item.code,
      })),
    [locations]
  )

  const selectedWarehouseId = selectedWarehouse === "all" ? null : Number(selectedWarehouse)
  const selectedPositionFilter = useMemo(() => {
    const id = Number(searchParams.get("catalog_position_id") || searchParams.get("position_id") || 0)
    if (!Number.isFinite(id) || id <= 0) return null
    const title = searchParams.get("position_title") || searchParams.get("position_label") || `#${id}`
    return {
      id,
      title,
      subtitle: searchParams.get("position_subtitle") || "",
      uom: searchParams.get("uom") || "шт",
    }
  }, [searchParams])
  const positionOptionFromFilter = useMemo(
    () =>
      selectedPositionFilter
        ? {
            id: selectedPositionFilter.id,
            catalog_position_id: selectedPositionFilter.id,
            manufacturer_part_number: selectedPositionFilter.title,
            display_name: selectedPositionFilter.subtitle,
            uom: selectedPositionFilter.uom,
          }
        : null,
    [selectedPositionFilter]
  )

  const clearPositionFilter = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      POSITION_FILTER_QUERY_KEYS.forEach((key) => next.delete(key))
      return next
    })
  }

  const changeActiveMode = (mode) => {
    setActiveMode(mode)
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set("mode", mode)
      return next
    })
  }

  const loadLocations = useCallback(async () => {
    try {
      const { data } = await axios.get("/warehouse/locations")
      setLocations(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("Не удалось загрузить склады", err)
      message.error("Не удалось загрузить склады")
    }
  }, [message])

  const loadPlaces = useCallback(async () => {
    try {
      const { data } = await axios.get("/warehouse/storage-places")
      setPlaces(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("Не удалось загрузить места хранения", err)
      message.error("Не удалось загрузить места хранения")
    }
  }, [message])

  const loadOverview = useCallback(async () => {
    setLoading(true)
    try {
      const params = { limit: 500 }
      if (selectedWarehouseId) params.warehouse_id = selectedWarehouseId
      if (selectedPositionFilter?.id) params.catalog_position_id = selectedPositionFilter.id
      if (search.trim()) params.q = search.trim()
      const { data } = await axios.get("/warehouse/overview", { params })
      setOverview({
        stats: data?.stats || { positions_count: 0, actual_qty: 0, reserved_qty: 0, free_qty: 0 },
        stock: Array.isArray(data?.stock) ? data.stock : [],
        documents: Array.isArray(data?.documents) ? data.documents : [],
        reservations: Array.isArray(data?.reservations) ? data.reservations : [],
      })
    } catch (err) {
      console.error("Не удалось загрузить склад", err)
      message.error("Не удалось загрузить склад")
    } finally {
      setLoading(false)
    }
  }, [message, search, selectedPositionFilter?.id, selectedWarehouseId])

  useEffect(() => {
    loadLocations()
    loadPlaces()
  }, [loadLocations, loadPlaces])

  useEffect(() => {
    loadOverview()
  }, [loadOverview])

  useEffect(
    () => () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    },
    []
  )

  useEffect(() => {
    const nextMode = searchParams.get("mode")
    if (WAREHOUSE_MODE_KEYS.has(nextMode)) setActiveMode(nextMode)
    const nextWarehouse = normalizeSelectValue(searchParams.get("warehouse_id"))
    if (nextWarehouse) setSelectedWarehouse(nextWarehouse)
    const nextSearch = searchParams.get("q")
    if (nextSearch !== null) setSearch(nextSearch)
  }, [searchParams])

  const refreshAll = () => {
    loadLocations()
    loadPlaces()
    loadOverview()
  }

  const placeOptionsForWarehouse = useCallback(
    (id) =>
      places
        .filter((place) => String(place.warehouse_id) === String(id))
        .map((place) => ({
          value: place.id,
          label: `${place.code}${place.notes ? ` · ${place.notes}` : ""}`,
        })),
    [places]
  )

  const fetchPositions = useCallback(
    (value) => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
      const q = String(value || "").trim()
      if (q.length < 2) {
        setPositionOptions([])
        return
      }

      searchTimerRef.current = setTimeout(async () => {
        setPositionLoading(true)
        try {
          const { data } = await axios.get("/warehouse/catalog-positions", { params: { q } })
          setPositionOptions(Array.isArray(data) ? data : [])
        } catch (err) {
          console.error("Не удалось найти карточки позиций", err)
          message.error("Не удалось найти карточки позиций")
        } finally {
          setPositionLoading(false)
        }
      }, 250)
    },
    [message]
  )

  const openDocumentModal = useCallback(
    (type = "receipt", defaults = {}) => {
      const defaultWarehouse = selectedWarehouseId || locations[0]?.id || null
      const secondWarehouse = locations.find((item) => item.id !== defaultWarehouse)?.id || null
      const positionOption = defaults.positionOption || positionOptionFromFilter
      const defaultLine = {
        quantity: defaults.quantity || 1,
        catalog_position_id: positionOption?.id || undefined,
        storage_place_id: defaults.storage_place_id,
        target_storage_place_id: defaults.target_storage_place_id,
      }
      if (positionOption) {
        setPositionOptions((prev) => [
          positionOption,
          ...prev.filter((item) => String(item.id) !== String(positionOption.id)),
        ])
      } else {
        setPositionOptions([])
      }
      docForm.resetFields()
      docForm.setFieldsValue({
        doc_type: type,
        document_date: dayjs(),
        warehouse_id: defaultWarehouse,
        source_warehouse_id: defaultWarehouse,
        target_warehouse_id: secondWarehouse,
        basis_document:
          defaults.basis_document ||
          (positionOption ? `Карточка позиции ${positionTitle(positionOption)}` : undefined),
        source_type: defaults.source_type || "manual",
        source_id: defaults.source_id,
        source_line_id: defaults.source_line_id,
        source_label: defaults.source_label,
        lines: [defaultLine],
      })
      setDocModalOpen(true)
    },
    [docForm, locations, positionOptionFromFilter, selectedWarehouseId]
  )

  useEffect(() => {
    const action = searchParams.get("action")
    if (!action || !["receipt", "reserve", "writeoff"].includes(action)) return
    if (!positionOptionFromFilter || !locations.length) return
    const key = `${action}:${positionOptionFromFilter.id}:${locations.length}`
    if (urlActionHandledRef.current === key) return
    urlActionHandledRef.current = key
    setActiveMode(action === "reserve" ? "reservations" : "stock")
    openDocumentModal(action, {
      positionOption: positionOptionFromFilter,
      basis_document: `Карточка позиции ${positionTitle(positionOptionFromFilter)}`,
      source_type: "manual",
      source_label: `Из карточки позиции ${positionTitle(positionOptionFromFilter)}`,
    })
  }, [locations.length, openDocumentModal, positionOptionFromFilter, searchParams])

  const openReserveFromStock = useCallback(
    (row, type = "reserve") => {
      const positionOption = {
        ...row,
        id: row.catalog_position_id,
      }
      setPositionOptions((prev) => [
        positionOption,
        ...prev.filter((item) => String(item.id) !== String(positionOption.id)),
      ])
      docForm.resetFields()
      docForm.setFieldsValue({
        doc_type: type,
        document_date: dayjs(),
        warehouse_id: row.warehouse_id,
        source_type: "manual",
        lines: [
          {
            catalog_position_id: row.catalog_position_id,
            storage_place_id: row.storage_place_id,
            quantity: Math.max(Math.min(Number(row.free_qty || 1), 1), 0.001),
          },
        ],
      })
      setDocModalOpen(true)
    },
    [docForm]
  )

  const openUnreserveFromReservation = useCallback(
    (row) => {
      const positionOption = {
        ...row,
        id: row.catalog_position_id,
      }
      setPositionOptions((prev) => [
        positionOption,
        ...prev.filter((item) => String(item.id) !== String(positionOption.id)),
      ])
      docForm.resetFields()
      docForm.setFieldsValue({
        doc_type: "unreserve",
        document_date: dayjs(),
        warehouse_id: row.warehouse_id,
        source_type: row.source_type || "manual",
        source_id: row.source_id || undefined,
        source_line_id: row.source_line_id || undefined,
        source_label: row.source_label || undefined,
        lines: [
          {
            catalog_position_id: row.catalog_position_id,
            storage_place_id: row.storage_place_id,
            quantity: Number(row.reserved_qty || 1),
          },
        ],
      })
      setDocModalOpen(true)
    },
    [docForm]
  )

  const submitDocument = async () => {
    try {
      const values = await docForm.validateFields()
      const payload = {
        ...values,
        document_date: values.document_date?.toISOString?.() || new Date().toISOString(),
        post: true,
        warehouse_id: values.doc_type === "transfer" ? null : values.warehouse_id,
        lines: (values.lines || []).map((line) => ({
          catalog_position_id: line.catalog_position_id,
          quantity: line.quantity,
          storage_place_id: line.storage_place_id,
          target_storage_place_id: line.target_storage_place_id,
          notes: line.notes,
        })),
      }
      await axios.post("/warehouse/documents", payload)
      message.success("Складской документ проведён")
      setDocModalOpen(false)
      docForm.resetFields()
      refreshAll()
    } catch (err) {
      if (err?.errorFields) return
      console.error("Не удалось провести складской документ", err)
      message.error(err?.response?.data?.message || "Не удалось провести складской документ")
    }
  }

  const openPlaceModal = () => {
    placeForm.resetFields()
    placeForm.setFieldsValue({
      warehouse_id: selectedWarehouseId || locations[0]?.id || null,
    })
    setPlaceModalOpen(true)
  }

  const submitPlace = async () => {
    try {
      const values = await placeForm.validateFields()
      await axios.post("/warehouse/storage-places", values)
      message.success("Место хранения создано")
      setPlaceModalOpen(false)
      placeForm.resetFields()
      loadPlaces()
    } catch (err) {
      if (err?.errorFields) return
      console.error("Не удалось создать место хранения", err)
      message.error(err?.response?.data?.message || "Не удалось создать место хранения")
    }
  }

  const openWarehouseModal = () => {
    warehouseForm.resetFields()
    warehouseForm.setFieldsValue({ location_type: "physical" })
    setWarehouseModalOpen(true)
  }

  const submitWarehouse = async () => {
    try {
      const values = await warehouseForm.validateFields()
      const { data } = await axios.post("/warehouse/locations", values)
      message.success("Склад создан")
      setWarehouseModalOpen(false)
      warehouseForm.resetFields()
      await loadLocations()
      if (data?.id) setSelectedWarehouse(data.id)
    } catch (err) {
      if (err?.errorFields) return
      console.error("Не удалось создать склад", err)
      message.error(err?.response?.data?.message || "Не удалось создать склад")
    }
  }

  const openDocumentPreview = async (record) => {
    setDocumentPreviewOpen(true)
    setDocumentPreviewLoading(true)
    try {
      const { data } = await axios.get(`/warehouse/documents/${record.id}`)
      setDocumentPreview(data)
    } catch (err) {
      console.error("Не удалось загрузить документ склада", err)
      message.error("Не удалось загрузить документ склада")
    } finally {
      setDocumentPreviewLoading(false)
    }
  }

  const positionSelectOptions = useMemo(
    () =>
      positionOptions.map((item) => ({
        value: item.id,
        label: (
          <Space direction="vertical" size={0}>
            <Text strong>{positionTitle(item)}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {positionSubtitle(item) || "Карточка позиции"}
            </Text>
          </Space>
        ),
      })),
    [positionOptions]
  )

  const stockColumns = useMemo(
    () => [
      {
        title: "Позиция",
        dataIndex: "manufacturer_part_number",
        width: 360,
        render: (_value, row) => (
          <Space direction="vertical" size={0}>
            <Text strong>{positionTitle(row)}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {positionSubtitle(row) || "—"}
            </Text>
          </Space>
        ),
      },
      {
        title: "Склад",
        dataIndex: "warehouse_name",
        width: 220,
        render: (_value, row) => (
          <Space direction="vertical" size={2}>
            <Text>{row.warehouse_name || "—"}</Text>
            <Tag>{row.storage_place_code || "без адреса"}</Tag>
          </Space>
        ),
      },
      {
        title: "Факт",
        dataIndex: "actual_qty",
        width: 110,
        align: "right",
        render: (value, row) => (
          <Text>
            {formatQuantity(value)} {row.uom || "шт"}
          </Text>
        ),
      },
      {
        title: "Свободно",
        dataIndex: "free_qty",
        width: 110,
        align: "right",
        render: (value, row) => (
          <Text strong>
            {formatQuantity(value)} {row.uom || "шт"}
          </Text>
        ),
      },
      {
        title: "Резерв",
        dataIndex: "reserved_qty",
        width: 110,
        align: "right",
        render: (value, row) => (
          <Text type={Number(value || 0) > 0 ? undefined : "secondary"}>
            {formatQuantity(value)} {row.uom || "шт"}
          </Text>
        ),
      },
      {
        title: "Последнее движение",
        key: "last",
        width: 220,
        render: (_value, row) => (
          <Space direction="vertical" size={0}>
            <Text type="secondary">Приход: {formatDate(row.last_receipt_at)}</Text>
            <Text type="secondary">Расход: {formatDate(row.last_out_at)}</Text>
          </Space>
        ),
      },
      {
        title: "Действие",
        key: "action",
        width: 110,
        render: (_value, row) => (
          <Button
            size="small"
            icon={<LockOutlined />}
            disabled={Number(row.free_qty || 0) <= 0}
            onClick={() => openReserveFromStock(row)}
          >
            Резерв
          </Button>
        ),
      },
    ],
    [openReserveFromStock]
  )

  const documentColumns = useMemo(
    () => [
      {
        title: "Документ",
        dataIndex: "document_no",
        width: 190,
        render: (value, row) => (
          <Space direction="vertical" size={0}>
            <Text strong>{value || `#${row.id}`}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {formatDate(row.document_date)}
            </Text>
          </Space>
        ),
      },
      {
        title: "Тип",
        dataIndex: "doc_type",
        width: 150,
        render: (value) => {
          const meta = DOC_TYPE_META[value] || { label: value, color: "default" }
          return (
            <Tag color={meta.color} icon={meta.icon}>
              {meta.label}
            </Tag>
          )
        },
      },
      {
        title: "Статус",
        dataIndex: "status",
        width: 120,
        render: (value) => {
          const meta = STATUS_META[value] || { label: value, color: "default" }
          return <Tag color={meta.color}>{meta.label}</Tag>
        },
      },
      {
        title: "Склад",
        key: "warehouse",
        render: (_value, row) => {
          if (row.doc_type === "transfer") {
            return `${row.source_warehouse_name || "—"} → ${row.target_warehouse_name || "—"}`
          }
          return row.warehouse_name || "—"
        },
      },
      {
        title: "Строки",
        dataIndex: "line_count",
        width: 90,
        align: "right",
        render: (value) => formatQuantity(value),
      },
      {
        title: "Кол-во",
        dataIndex: "total_line_qty",
        width: 110,
        align: "right",
        render: (value) => formatQuantity(value),
      },
      {
        title: "Основание",
        dataIndex: "basis_document",
        width: 180,
        ellipsis: true,
        render: (value) => value || "—",
      },
    ],
    []
  )

  const reservationColumns = useMemo(
    () => [
      {
        title: "Позиция",
        dataIndex: "manufacturer_part_number",
        width: 260,
        render: (_value, row) => (
          <Space direction="vertical" size={0}>
            <Text strong>{positionTitle(row)}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {positionSubtitle(row) || "—"}
            </Text>
          </Space>
        ),
      },
      {
        title: "Источник",
        dataIndex: "source_label",
        width: 220,
        render: (_value, row) => (
          <Space direction="vertical" size={0}>
            <Text>{sourceTitle(row)}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {SOURCE_LABEL_BY_VALUE[row.source_type] || row.source_type || "manual"}
            </Text>
          </Space>
        ),
      },
      {
        title: "Склад",
        dataIndex: "warehouse_name",
        width: 190,
        render: (_value, row) => (
          <Space direction="vertical" size={2}>
            <Text>{row.warehouse_name || "—"}</Text>
            <Tag>{row.storage_place_code || "без адреса"}</Tag>
          </Space>
        ),
      },
      {
        title: "Резерв",
        dataIndex: "reserved_qty",
        width: 110,
        align: "right",
        render: (value, row) => `${formatQuantity(value)} ${row.uom || "шт"}`,
      },
      {
        title: "",
        key: "action",
        width: 110,
        align: "right",
        render: (_value, row) => (
          <Button
            size="small"
            icon={<UnlockOutlined />}
            onClick={(event) => {
              event.stopPropagation()
              openUnreserveFromReservation(row)
            }}
          >
            Снять
          </Button>
        ),
      },
    ],
    [openUnreserveFromReservation]
  )

  const filteredPlaces = useMemo(() => {
    const q = search.trim().toLowerCase()
    return places.filter((place) => {
      if (selectedWarehouseId && Number(place.warehouse_id) !== Number(selectedWarehouseId)) return false
      if (!q) return true
      return [place.code, place.zone, place.rack, place.section, place.tier, place.bin, place.notes, place.warehouse_name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    })
  }, [places, search, selectedWarehouseId])

  const placeColumns = useMemo(
    () => [
      {
        title: "Адрес",
        dataIndex: "code",
        width: 220,
        render: (value, row) => (
          <Space direction="vertical" size={0}>
            <Text strong>{value}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {row.warehouse_name || "—"}
            </Text>
          </Space>
        ),
      },
      {
        title: "Зона",
        dataIndex: "zone",
        width: 110,
        render: (value) => value || "—",
      },
      {
        title: "Стеллаж",
        dataIndex: "rack",
        width: 110,
        render: (value) => value || "—",
      },
      {
        title: "Секция",
        dataIndex: "section",
        width: 110,
        render: (value) => value || "—",
      },
      {
        title: "Ярус",
        dataIndex: "tier",
        width: 100,
        render: (value) => value || "—",
      },
      {
        title: "Ячейка",
        dataIndex: "bin",
        width: 100,
        render: (value) => value || "—",
      },
      {
        title: "Примечание",
        dataIndex: "notes",
        ellipsis: true,
        render: (value) => value || "—",
      },
    ],
    []
  )

  const previewDocType = documentPreview?.document?.doc_type
  const previewLineColumns = useMemo(
    () => [
      {
        title: "Позиция",
        dataIndex: "manufacturer_part_number",
        render: (_value, row) => (
          <Space direction="vertical" size={0}>
            <Text strong>{positionTitle(row)}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {row.display_name || "—"}
            </Text>
          </Space>
        ),
      },
      {
        title: "Адрес",
        dataIndex: "storage_place_code",
        width: 170,
        render: (_value, row) =>
          previewDocType === "transfer"
            ? `${row.storage_place_code || "—"} → ${row.target_storage_place_code || "—"}`
            : row.storage_place_code || "—",
      },
      {
        title: "Кол-во",
        dataIndex: "quantity",
        width: 120,
        align: "right",
        render: (value, row) => `${formatQuantity(value)} ${row.unit_code || "шт"}`,
      },
    ],
    [previewDocType]
  )

  const lineSourceWarehouse = docType === "transfer" ? sourceWarehouseId : warehouseId

  const modeActions = (
    <Space wrap>
      {activeMode === "stock" && (
        <>
          <Button size="small" icon={<InboxOutlined />} onClick={() => openDocumentModal("receipt")}>
            Приход
          </Button>
          <Button size="small" icon={<SwapOutlined />} onClick={() => openDocumentModal("transfer")}>
            Перемещение
          </Button>
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => openDocumentModal("writeoff")}>
            Списание
          </Button>
          <Button size="small" icon={<LockOutlined />} onClick={() => openDocumentModal("reserve")}>
            Резерв
          </Button>
        </>
      )}
      {activeMode === "reservations" && (
        <Button size="small" icon={<LockOutlined />} onClick={() => openDocumentModal("reserve")}>
          Новый резерв
        </Button>
      )}
      {activeMode === "documents" && (
        <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => openDocumentModal("receipt")}>
          Документ
        </Button>
      )}
      {activeMode === "places" && (
        <>
          <Button size="small" icon={<EnvironmentOutlined />} onClick={openPlaceModal}>
            Место
          </Button>
          <Button size="small" icon={<AppstoreAddOutlined />} onClick={openWarehouseModal}>
            Склад
          </Button>
        </>
      )}
    </Space>
  )

  const warehouseModeItems = [
    {
      key: "stock",
      label: `Остатки (${overview.stock.length})`,
      children: (
        <Table
          rowKey={(row) => `${row.warehouse_id}-${row.storage_place_id || 0}-${row.catalog_position_id}`}
          columns={stockColumns}
          dataSource={overview.stock}
          loading={loading}
          size="small"
          scroll={{ x: 1160 }}
          pagination={{ pageSize: 12, showSizeChanger: false }}
          locale={{
            emptyText: (
              <Empty description={selectedPositionFilter ? "Остатков по этой позиции пока нет" : "Остатков пока нет"}>
                {selectedPositionFilter && (
                  <Button size="small" icon={<InboxOutlined />} onClick={() => openDocumentModal("receipt")}>
                    Оприходовать позицию
                  </Button>
                )}
              </Empty>
            ),
          }}
        />
      ),
    },
    {
      key: "reservations",
      label: `Резервы (${overview.reservations.length})`,
      children: (
        <Table
          rowKey="reservation_key"
          columns={reservationColumns}
          dataSource={overview.reservations}
          loading={loading}
          size="small"
          scroll={{ x: 890 }}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          locale={{ emptyText: <Empty description="Активных резервов пока нет" /> }}
        />
      ),
    },
    {
      key: "documents",
      label: `Документы (${overview.documents.length})`,
      children: (
        <Table
          rowKey="id"
          columns={documentColumns}
          dataSource={overview.documents}
          loading={loading}
          size="small"
          scroll={{ x: 980 }}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          onRow={(record) => ({
            onClick: () => openDocumentPreview(record),
            style: { cursor: "pointer" },
          })}
          locale={{ emptyText: <Empty description="Документов пока нет" /> }}
        />
      ),
    },
    {
      key: "places",
      label: `Адреса (${filteredPlaces.length})`,
      children: (
        <Table
          rowKey="id"
          columns={placeColumns}
          dataSource={filteredPlaces}
          size="small"
          scroll={{ x: 860 }}
          pagination={{ pageSize: 12, showSizeChanger: false }}
          locale={{ emptyText: <Empty description="Адресов хранения пока нет" /> }}
        />
      ),
    },
  ]

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Card styles={{ body: { padding: 16 } }}>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} md={8} lg={7}>
            <Select
              value={selectedWarehouse}
              onChange={(value) => setSelectedWarehouse(normalizeSelectValue(value))}
              style={{ width: "100%" }}
              options={[
                { value: "all", label: "Все склады" },
                ...locations.map((item) => ({
                  value: item.id,
                  label: item.name,
                })),
              ]}
            />
          </Col>
          <Col xs={24} md={10} lg={8}>
            <Input.Search
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onSearch={loadOverview}
              allowClear
              enterButton="Найти"
              placeholder="Позиция, номер, адрес хранения"
            />
          </Col>
          <Col xs={24} md={24} lg={9}>
            <Space wrap style={{ width: "100%", justifyContent: "flex-end" }}>
              <Button icon={<ReloadOutlined />} onClick={refreshAll}>
                Обновить
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {selectedPositionFilter && (
        <Card size="small" styles={{ body: { padding: "10px 16px" } }}>
          <Space wrap style={{ width: "100%", justifyContent: "space-between" }}>
            <Space direction="vertical" size={0}>
              <Text type="secondary">Склад открыт по карточке позиции</Text>
              <Text strong>{selectedPositionFilter.title}</Text>
              {selectedPositionFilter.subtitle && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {selectedPositionFilter.subtitle}
                </Text>
              )}
            </Space>
            <Space wrap>
              <Button size="small" icon={<InboxOutlined />} onClick={() => openDocumentModal("receipt")}>
                Оприходовать
              </Button>
              <Button size="small" onClick={clearPositionFilter}>
                Сбросить фильтр
              </Button>
            </Space>
          </Space>
        </Card>
      )}

      <Row gutter={[12, 12]}>
        <Col xs={12} lg={6}>
          <div className="warehouse-stat">
            <Statistic title="Карточек с остатком" value={overview.stats.positions_count || 0} />
          </div>
        </Col>
        <Col xs={12} lg={6}>
          <div className="warehouse-stat">
            <Statistic title="Фактический остаток" value={formatQuantity(overview.stats.actual_qty)} />
          </div>
        </Col>
        <Col xs={12} lg={6}>
          <div className="warehouse-stat">
            <Statistic title="Свободно" value={formatQuantity(overview.stats.free_qty)} />
          </div>
        </Col>
        <Col xs={12} lg={6}>
          <div className="warehouse-stat">
            <Statistic title="В резерве" value={formatQuantity(overview.stats.reserved_qty)} />
          </div>
        </Col>
      </Row>

      <Card styles={{ body: { padding: 0 } }}>
        <Tabs
          activeKey={activeMode}
          onChange={changeActiveMode}
          tabBarExtraContent={modeActions}
          tabBarStyle={{ padding: "0 16px", marginBottom: 0 }}
          items={warehouseModeItems}
        />
      </Card>

      <Modal
        title="Складской документ"
        open={docModalOpen}
        onCancel={() => setDocModalOpen(false)}
        onOk={submitDocument}
        okText="Провести"
        width={920}
        destroyOnHidden
      >
        <Form form={docForm} layout="vertical">
          <Row gutter={12}>
            <Col xs={24} md={8}>
              <Form.Item name="doc_type" label="Тип документа" rules={[{ required: true }]}>
                <Select
                  options={Object.entries(DOC_TYPE_META).map(([value, meta]) => ({
                    value,
                    label: meta.label,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="document_date" label="Дата" rules={[{ required: true }]}>
                <DatePicker showTime format="DD.MM.YYYY HH:mm" style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="basis_document" label="Основание">
                <Input placeholder="Счёт, PO, накладная" />
              </Form.Item>
            </Col>
          </Row>

          {docType === "transfer" ? (
            <Row gutter={12}>
              <Col xs={24} md={12}>
                <Form.Item name="source_warehouse_id" label="Склад отправления" rules={[{ required: true }]}>
                  <Select options={locationOptions} placeholder="Выберите склад" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="target_warehouse_id" label="Склад получения" rules={[{ required: true }]}>
                  <Select options={locationOptions} placeholder="Выберите склад" />
                </Form.Item>
              </Col>
            </Row>
          ) : (
            <Form.Item name="warehouse_id" label="Склад" rules={[{ required: true }]}>
              <Select options={locationOptions} placeholder="Выберите склад" />
            </Form.Item>
          )}

          {isReserveDoc && (
            <Row gutter={12}>
              <Col xs={24} md={8}>
                <Form.Item name="source_type" label="Источник резерва">
                  <Select options={SOURCE_TYPE_OPTIONS} placeholder="Тип источника" />
                </Form.Item>
              </Col>
              <Col xs={12} md={5}>
                <Form.Item name="source_id" label="ID источника">
                  <Input placeholder="например 125" />
                </Form.Item>
              </Col>
              <Col xs={12} md={5}>
                <Form.Item name="source_line_id" label="ID строки">
                  <Input placeholder="строка" />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item name="source_label" label="Название">
                  <Input placeholder="Для кого/чего резерв" />
                </Form.Item>
              </Col>
            </Row>
          )}

          <Form.List name="lines">
            {(fields, { add, remove }) => (
              <Space direction="vertical" size={8} style={{ width: "100%" }}>
                {fields.map(({ key, ...field }) => (
                  <Row key={key} gutter={8} align="middle">
                    <Col xs={24} md={docType === "transfer" ? 9 : 11}>
                      <Form.Item
                        {...field}
                        name={[field.name, "catalog_position_id"]}
                        label="Карточка позиции"
                        rules={[{ required: true, message: "Выберите карточку" }]}
                      >
                        <Select
                          showSearch
                          filterOption={false}
                          onSearch={fetchPositions}
                          options={positionSelectOptions}
                          loading={positionLoading}
                          placeholder="Найти по номеру или названию"
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={12} md={4}>
                      <Form.Item
                        {...field}
                        name={[field.name, "quantity"]}
                        label="Кол-во"
                        rules={[{ required: true, message: "Укажите количество" }]}
                      >
                        <InputNumber min={0.001} precision={3} style={{ width: "100%" }} />
                      </Form.Item>
                    </Col>
                    <Col xs={12} md={docType === "transfer" ? 5 : 7}>
                      <Form.Item {...field} name={[field.name, "storage_place_id"]} label="Адрес">
                        <Select
                          allowClear
                          disabled={!lineSourceWarehouse}
                          options={placeOptionsForWarehouse(lineSourceWarehouse)}
                          placeholder="Место хранения"
                        />
                      </Form.Item>
                    </Col>
                    {docType === "transfer" && (
                      <Col xs={12} md={5}>
                        <Form.Item {...field} name={[field.name, "target_storage_place_id"]} label="Адрес получения">
                          <Select
                            allowClear
                            disabled={!targetWarehouseId}
                            options={placeOptionsForWarehouse(targetWarehouseId)}
                            placeholder="Место"
                          />
                        </Form.Item>
                      </Col>
                    )}
                    <Col xs={12} md={1} style={{ paddingTop: 22 }}>
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => remove(field.name)}
                        disabled={fields.length === 1}
                      />
                    </Col>
                  </Row>
                ))}
                <Button icon={<PlusOutlined />} onClick={() => add({ quantity: 1 })}>
                  Добавить строку
                </Button>
              </Space>
            )}
          </Form.List>

          <Form.Item name="notes" label="Комментарий" style={{ marginTop: 12 }}>
            <TextArea autoSize={{ minRows: 2, maxRows: 5 }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Место хранения"
        open={placeModalOpen}
        onCancel={() => setPlaceModalOpen(false)}
        onOk={submitPlace}
        okText="Создать"
        destroyOnHidden
      >
        <Form form={placeForm} layout="vertical">
          <Form.Item name="warehouse_id" label="Склад" rules={[{ required: true }]}>
            <Select options={locationOptions} placeholder="Выберите склад" />
          </Form.Item>
          <Row gutter={12}>
            <Col span={14}>
              <Form.Item name="code" label="Адрес" rules={[{ required: true, whitespace: true }]}>
                <Input placeholder="A1/1-1-1" />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item name="zone" label="Зона">
                <Input placeholder="A" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={6}>
              <Form.Item name="rack" label="Стеллаж">
                <Input />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="section" label="Секция">
                <Input />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="tier" label="Ярус">
                <Input />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="bin" label="Ячейка">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="notes" label="Примечание">
            <TextArea autoSize={{ minRows: 2, maxRows: 4 }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Склад"
        open={warehouseModalOpen}
        onCancel={() => setWarehouseModalOpen(false)}
        onOk={submitWarehouse}
        okText="Создать"
        destroyOnHidden
      >
        <Form form={warehouseForm} layout="vertical">
          <Row gutter={12}>
            <Col span={10}>
              <Form.Item name="code" label="Код" rules={[{ required: true, whitespace: true }]}>
                <Input placeholder="spb-2" />
              </Form.Item>
            </Col>
            <Col span={14}>
              <Form.Item name="name" label="Название" rules={[{ required: true, whitespace: true }]}>
                <Input placeholder="Склад СПб 2" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="location_type" label="Тип" rules={[{ required: true }]}>
            <Select options={WAREHOUSE_TYPE_OPTIONS} />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="country" label="Страна">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="city" label="Город">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="address" label="Адрес">
            <Input />
          </Form.Item>
          <Form.Item name="notes" label="Примечание">
            <TextArea autoSize={{ minRows: 2, maxRows: 4 }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={documentPreview?.document?.document_no || "Документ склада"}
        open={documentPreviewOpen}
        onCancel={() => setDocumentPreviewOpen(false)}
        footer={null}
        width={820}
        destroyOnHidden
      >
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Row gutter={12}>
            <Col span={8}>
              <Text type="secondary">Тип</Text>
              <div>
                <Tag color={DOC_TYPE_META[documentPreview?.document?.doc_type]?.color}>
                  {DOC_TYPE_META[documentPreview?.document?.doc_type]?.label || "—"}
                </Tag>
              </div>
            </Col>
            <Col span={8}>
              <Text type="secondary">Статус</Text>
              <div>
                <Tag color={STATUS_META[documentPreview?.document?.status]?.color}>
                  {STATUS_META[documentPreview?.document?.status]?.label || "—"}
                </Tag>
              </div>
            </Col>
            <Col span={8}>
              <Text type="secondary">Дата</Text>
              <div>{formatDate(documentPreview?.document?.document_date)}</div>
            </Col>
          </Row>
          <Table
            rowKey="id"
            columns={previewLineColumns}
            dataSource={documentPreview?.lines || []}
            loading={documentPreviewLoading}
            size="small"
            pagination={false}
          />
        </Space>
      </Modal>

      <style>{`
        .warehouse-stat {
          background: #fff;
          border: 1px solid #eef0f3;
          border-radius: 8px;
          padding: 14px 16px;
          min-height: 86px;
        }

        .warehouse-stat .ant-statistic-title {
          color: #6b7280;
          margin-bottom: 6px;
        }
      `}</style>
    </Space>
  )
}

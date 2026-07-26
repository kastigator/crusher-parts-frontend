import React, { useEffect, useMemo, useRef, useState } from "react"
import {
  Card,
  Space,
  Table,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Button,
  message,
  Checkbox,
  Tag,
  Typography,
  Modal,
  Alert,
  Tooltip,
  Timeline,
  Collapse,
  Tabs,
  Steps,
  Drawer,
} from "antd"
import {
  DeleteOutlined,
  EditOutlined,
  SaveOutlined,
  CloseOutlined,
  PlusOutlined,
} from "@ant-design/icons"
import AddPositionsModal from "@/components/clientRequests/AddPositionsModal"
import CreateClientModal from "@/components/clientRequests/CreateClientModal"
import ClientRequestWorkspaceCard from "@/components/clientRequests/ClientRequestWorkspaceCard"
import EditItemModal from "@/components/clientRequests/EditItemModal"
import ImportExcelModal from "@/components/clientRequests/ImportExcelModal"
import NewRequestCard from "@/components/clientRequests/NewRequestCard"
import PageWrapper from "@/components/common/PageWrapper"
import WorkspaceShell from "@/components/common/WorkspaceShell"
import RevisionNoteModal from "@/components/clientRequests/RevisionNoteModal"
import RequestsListCard from "@/components/clientRequests/RequestsListCard"
import axios from "@/api/axiosInstance"
import dayjs from "dayjs"
import confirmAction from "@/utils/confirmAction"
import { formatQtyWithUomLabel, formatUomLabel } from "@/utils/uom"
import { useAuth } from "@/auth/AuthContext"
import { useSearchParams } from "react-router-dom"
import useCapabilities from "@/hooks/useCapabilities"
import useMeasurementUnits from "@/hooks/useMeasurementUnits"

const CLIENT_WORKSPACE_TABS = new Set(["summary", "items", "details", "commercial", "margin", "quote", "contract", "execution"])
const normalizeWorkspaceTab = (value) => {
  const key = String(value || "").trim().toLowerCase()
  return CLIENT_WORKSPACE_TABS.has(key) ? key : null
}

const STATUS_OPTIONS = [
  { value: "draft", label: "Черновик" },
  { value: "in_progress", label: "В работе" },
  { value: "released_to_procurement", label: "Отправлена в закупку" },
  { value: "rfq_created", label: "RFQ создан" },
  { value: "rfq_sent", label: "RFQ отправлен" },
  { value: "responses_received", label: "Ответы получены" },
  { value: "selection_done", label: "Выбор сделан" },
  { value: "quote_prepared", label: "КП подготовлено" },
  { value: "contracted", label: "Контракт" },
  { value: "archived", label: "В архиве" },
  { value: "cancelled", label: "Отменено" },
]

const SOURCE_OPTIONS = [
  { value: "email", label: "E-mail" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "phone", label: "Телефон" },
  { value: "portal", label: "Портал" },
]

const CLIENT_REQUEST_TEMPLATE_REQUEST_URL = "/client-requests/import-template/items"

const getCatalogPositionId = (part) =>
  part?.catalog_position_id || part?.original_part_id || part?.oem_part_id || part?.id || null

const getCatalogPartNumber = (part) =>
  part?.cat_number ||
  part?.manufacturer_part_number ||
  part?.catalog_position_manufacturer_part_number ||
  part?.position_code ||
  part?.catalog_position_code ||
  part?.part_number ||
  null

const normalizeCatalogPart = (part) => {
  if (!part) return null
  const catalogPositionId = getCatalogPositionId(part)
  return {
    ...part,
    catalog_position_id: catalogPositionId,
    cat_number: getCatalogPartNumber(part),
    original_part_id: catalogPositionId,
    description_ru: part.description_ru || part.catalog_position_name_ru || part.catalog_position_name || null,
    description_en: part.description_en || part.catalog_position_name_en || part.catalog_position_name || null,
    uom: part.uom || "шт",
  }
}

const formatEquipmentUnitLabel = (unit) => {
  if (!unit) return ""
  const left = [
    unit.internal_name || null,
    unit.manufacturer_name || null,
    unit.model_name || null,
  ]
    .filter(Boolean)
    .join(" • ")
  const suffix = [
    unit.serial_number ? `SN ${unit.serial_number}` : null,
    unit.site_name || null,
  ]
    .filter(Boolean)
    .join(" • ")
  return [left || "Единица техники", suffix].filter(Boolean).join(" • ")
}

const IMPORT_HEADER_MAP = {
  Производитель: "manufacturer",
  Модель: "model",
  "Кат. номер*": "cat_number",
  "Кат. номер": "cat_number",
  "№ клиента": "client_part_number",
  "Описание клиента": "client_description",
  "Кол-во*": "requested_qty",
  "Кол-во": "requested_qty",
  "Ед.": "uom",
  "Срок (YYYY-MM-DD)": "required_date",
  Срок: "required_date",
  Приоритет: "priority",
  "OEM только": "oem_only",
  "Комментарий клиента": "client_comment",
  "Комментарий внутр.": "internal_comment",
}

const IMPORT_REQUIRED_FIELDS = ["cat_number", "requested_qty"]

const STATUS_COLORS = {
  draft: "default",
  in_progress: "blue",
  released_to_procurement: "orange",
  rfq_created: "geekblue",
  rfq_sent: "gold",
  responses_received: "green",
  selection_done: "cyan",
  quote_prepared: "purple",
  contracted: "green",
  archived: "default",
  cancelled: "red",
}

const STATUS_STEPS = [
  { key: "draft", title: "Черновик" },
  { key: "in_progress", title: "В работе" },
  { key: "released_to_procurement", title: "Отправлена в закупку" },
  { key: "rfq_created", title: "RFQ создан" },
  { key: "rfq_sent", title: "RFQ отправлен" },
  { key: "responses_received", title: "Ответы" },
  { key: "selection_done", title: "Выбор" },
  { key: "quote_prepared", title: "КП" },
  { key: "contracted", title: "Контракт" },
]

const getStatusStepIndex = (status) => {
  const idx = STATUS_STEPS.findIndex((s) => s.key === status)
  return idx >= 0 ? idx : 0
}

const getClientRequestPartNumber = (row, fallback = "—") =>
  String(
    row?.client_display_part_number ||
      row?.client_part_number ||
      row?.catalog_position_manufacturer_part_number ||
      row?.manufacturer_part_number ||
      row?.catalog_position_code ||
      row?.position_code ||
      row?.original_cat_number ||
      fallback,
  )

const getInitialClientPartNumber = (part, overrides = {}) =>
  overrides.client_part_number ||
  getCatalogPartNumber(part) ||
  null

export default function ClientRequestsPage() {
  const { user } = useAuth()
  const { can } = useCapabilities()
  const { options: uomOptions } = useMeasurementUnits()
  const canWriteClientMasterData = can("workflow.client.master_data.write", "catalogs.edit")
  const [searchParams, setSearchParams] = useSearchParams()
  const [requests, setRequests] = useState([])
  const [clients, setClients] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [listSearch, setListSearch] = useState("")
  const [showArchivedRequests, setShowArchivedRequests] = useState(false)
  const [activeRequest, setActiveRequest] = useState(null)
  const [requestEditing, setRequestEditing] = useState(false)
  const [revisions, setRevisions] = useState([])
  const [revisionsLoading, setRevisionsLoading] = useState(false)
  const [items, setItems] = useState([])
  const [itemsLoading, setItemsLoading] = useState(false)
  const [activeRevisionId, setActiveRevisionId] = useState(null)
  const [workspaceTabKey, setWorkspaceTabKey] = useState("summary")
  const [revisionNoteOpen, setRevisionNoteOpen] = useState(false)
  const [revisionNote, setRevisionNote] = useState("")
  const revisionNoteResolver = useRef(null)
  const [itemEditOpen, setItemEditOpen] = useState(false)
  const [itemEditRecord, setItemEditRecord] = useState(null)
  const [originalResults, setOriginalResults] = useState([])
  const [originalSearch, setOriginalSearch] = useState("")
  const [originalLoading, setOriginalLoading] = useState(false)
  const [catalogSearch, setCatalogSearch] = useState("")
  const [catalogResults, setCatalogResults] = useState([])
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [catalogSelection, setCatalogSelection] = useState([])
  const [catalogRowInputs, setCatalogRowInputs] = useState({})
  const [catalogAddLoading, setCatalogAddLoading] = useState(false)
  const [modalSearch, setModalSearch] = useState("")
  const [modalResults, setModalResults] = useState([])
  const [modalLoading, setModalLoading] = useState(false)
  const [modalSelectedPart, setModalSelectedPart] = useState(null)
  const [modalQty, setModalQty] = useState(1)
  const [modalOemOnly, setModalOemOnly] = useState(false)
  const [quickSearch, setQuickSearch] = useState("")
  const [quickResults, setQuickResults] = useState([])
  const [quickLoading, setQuickLoading] = useState(false)
  const [quickSelectedPart, setQuickSelectedPart] = useState(null)
  const [quickQty, setQuickQty] = useState(1)
  const [quickOemOnly, setQuickOemOnly] = useState(false)
  const [bulkMode, setBulkMode] = useState(false)
  const [bulkSelectedKeys, setBulkSelectedKeys] = useState([])
  const [bulkSelectedRows, setBulkSelectedRows] = useState([])
  const [bulkEdits, setBulkEdits] = useState({})
  const [changeDraftActive, setChangeDraftActive] = useState(false)
  const [pendingChanges, setPendingChanges] = useState({
    adds: [],
    updates: {},
    deletes: [],
  })
  const originalItemsRef = useRef([])
  const [manufacturers, setManufacturers] = useState([])
  const [manufacturerId, setManufacturerId] = useState(null)
  const [models, setModels] = useState([])
  const [modelId, setModelId] = useState(null)
  const [createEquipmentUnits, setCreateEquipmentUnits] = useState([])
  const [createEquipmentUnitId, setCreateEquipmentUnitId] = useState(null)
  const [activeEquipmentUnits, setActiveEquipmentUnits] = useState([])
  const [activeEquipmentUnitId, setActiveEquipmentUnitId] = useState(null)
  const [frequentParts, setFrequentParts] = useState([])
  const [frequentLoading, setFrequentLoading] = useState(false)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [stagedRows, setStagedRows] = useState([])
  const [importLoading, setImportLoading] = useState(false)
  const [importPreview, setImportPreview] = useState([])
  const [importSummary, setImportSummary] = useState(null)
  const [importErrors, setImportErrors] = useState([])
  const [createMissing, setCreateMissing] = useState(false)
  const [clientContacts, setClientContacts] = useState([])
  const [contactsLoading, setContactsLoading] = useState(false)
  const [contactDropdownOpen, setContactDropdownOpen] = useState(false)
  const [createClientOpen, setCreateClientOpen] = useState(false)
  const [createClientLoading, setCreateClientLoading] = useState(false)
  const [createRequestOpen, setCreateRequestOpen] = useState(false)

  const { Text } = Typography

  const [createForm] = Form.useForm()
  const [createClientForm] = Form.useForm()
  const [requestForm] = Form.useForm()
  const [revisionForm] = Form.useForm()
  const [itemForm] = Form.useForm()

  const selectedCreateEquipmentUnit = useMemo(
    () => createEquipmentUnits.find((row) => Number(row.id) === Number(createEquipmentUnitId)) || null,
    [createEquipmentUnits, createEquipmentUnitId],
  )

  const selectedActiveEquipmentUnit = useMemo(
    () => activeEquipmentUnits.find((row) => Number(row.id) === Number(activeEquipmentUnitId)) || null,
    [activeEquipmentUnits, activeEquipmentUnitId],
  )

  const createEquipmentUnitOptions = useMemo(
    () =>
      createEquipmentUnits.map((row) => ({
        value: row.id,
        label: formatEquipmentUnitLabel(row),
      })),
    [createEquipmentUnits],
  )

  const activeEquipmentUnitOptions = useMemo(
    () =>
      activeEquipmentUnits.map((row) => ({
        value: row.id,
        label: formatEquipmentUnitLabel(row),
      })),
    [activeEquipmentUnits],
  )

  const loadRequests = async () => {
    setLoading(true)
    try {
      const { data } = await axios.get("/client-requests", {
        params: { include_archived: showArchivedRequests ? 1 : undefined },
      })
      setRequests(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
      message.error("Не удалось загрузить заявки")
    } finally {
      setLoading(false)
    }
  }

  const loadClients = async () => {
    try {
      const { data } = await axios.get("/clients", {
        params: { limit: 500, offset: 0 },
      })
      setClients(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
    }
  }

  const loadUsers = async () => {
    try {
      const { data } = await axios.get("/users")
      setUsers(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
    }
  }

  const loadManufacturers = async () => {
    try {
      const { data } = await axios.get("/equipment-manufacturers")
      setManufacturers(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
    }
  }

  const loadModels = async (selectedManufacturerId) => {
    if (!selectedManufacturerId) {
      setModels([])
      return
    }
    try {
      const { data } = await axios.get("/equipment-models", {
        params: { manufacturer_id: selectedManufacturerId },
      })
      setModels(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadRequests()
    loadClients()
    loadUsers()
    loadManufacturers()
  }, [showArchivedRequests])

  useEffect(() => {
    const clientId = Number(searchParams.get("client_id") || 0) || null
    const equipmentUnitId = Number(searchParams.get("equipment_unit_id") || 0) || null
    if (!clientId) return

    let cancelled = false
    ;(async () => {
      setCreateRequestOpen(true)
      createForm.setFieldsValue({ client_id: clientId })
      await loadContacts(clientId)
      const units = await loadEquipmentUnits(clientId)
      if (cancelled) return
      setCreateEquipmentUnits(units)
      if (equipmentUnitId && units.some((row) => Number(row.id) === equipmentUnitId)) {
        setCreateEquipmentUnitId(equipmentUnitId)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [searchParams, createForm, clients.length])

  useEffect(() => {
    const requestId = Number(searchParams.get("request_id") || searchParams.get("requestId") || 0) || null
    const equipmentUnitId = Number(searchParams.get("equipment_unit_id") || 0) || null
    const desiredTab = normalizeWorkspaceTab(searchParams.get("tab"))
    if (!requestId || !requests.length) return

    const targetRequest = requests.find((row) => Number(row.id) === Number(requestId)) || null
    if (!targetRequest) return

    if (Number(activeRequest?.id) !== Number(requestId)) {
      openWorkspace(targetRequest, { equipmentUnitId, tabKey: desiredTab || undefined })
      return
    }

    if (desiredTab && workspaceTabKey !== desiredTab) {
      setWorkspaceTabKey(desiredTab)
    }
  }, [searchParams, requests, activeRequest?.id, workspaceTabKey])

  const loadContacts = async (clientId, applyToForm = true) => {
    if (!clientId) {
      setClientContacts([])
      return
    }
    setContactsLoading(true)
    try {
      const { data } = await axios.get("/client-contacts", {
        params: { client_id: clientId },
      })
      const list = Array.isArray(data) ? data : []
      setClientContacts(list)
      if (applyToForm) {
        const primary = list.find((c) => c.is_primary)
        if (primary) {
          createForm.setFieldsValue({
            contact_name: primary.name || "",
            contact_email: primary.email || "",
            contact_phone: primary.phone || "",
          })
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setContactsLoading(false)
    }
  }

  const loadEquipmentUnits = async (clientId) => {
    if (!clientId) return []
    try {
      const { data } = await axios.get("/client-equipment-units", {
        params: { client_id: clientId, limit: 500 },
      })
      return Array.isArray(data) ? data : []
    } catch (e) {
      console.error(e)
      return []
    }
  }

  const applyEquipmentContext = (unit) => {
    const nextManufacturerId = Number(unit?.manufacturer_id || 0) || null
    const nextModelId = Number(unit?.equipment_model_id || 0) || null
    setManufacturerId(nextManufacturerId)
    setModelId(nextModelId)
  }

  const loadFrequentParts = async (_clientId) => {
    setFrequentParts([])
    setFrequentLoading(false)
  }

  const handleCreateClientChange = async (value) => {
    if (value === "__create__") {
      if (!canWriteClientMasterData) {
        message.warning("Недостаточно прав для создания клиента из заявки")
        return
      }
      createForm.setFieldsValue({ client_id: null })
      setCreateClientOpen(true)
      return
    }

    const client = clients.find((c) => c.id === value)
    if (client) {
      const current = createForm.getFieldsValue(["contact_name", "contact_email", "contact_phone"])
      createForm.setFieldsValue({
        contact_name: current.contact_name || client.contact_person || "",
        contact_email: current.contact_email || client.email || "",
        contact_phone: current.contact_phone || client.phone || "",
      })
    }

    await loadContacts(value)
    const units = await loadEquipmentUnits(value)
    setCreateEquipmentUnits(units)
    setCreateEquipmentUnitId(null)
  }

  const handleActiveEquipmentUnitChange = (value) => {
    const nextId = value || null
    setActiveEquipmentUnitId(nextId)
    const unit =
      activeEquipmentUnits.find((row) => Number(row.id) === Number(nextId)) || null
    applyEquipmentContext(unit)
  }

  useEffect(() => {
    loadModels(manufacturerId)
    if (!manufacturerId) {
      setModelId(null)
    }
    setCatalogSearch("")
    setCatalogResults([])
    setCatalogSelection([])
    setQuickSearch("")
    setQuickResults([])
    setQuickSelectedPart(null)
    setQuickQty(1)
    setQuickOemOnly(false)
  }, [manufacturerId])

  useEffect(() => {
    setCatalogSearch("")
    setCatalogResults([])
    setCatalogSelection([])
  }, [modelId])

  useEffect(() => {
    setCatalogSelection([])
  }, [catalogSearch])

  useEffect(() => {
    if (activeRequest?.client_id) {
      loadFrequentParts(activeRequest.client_id)
    }
  }, [activeRequest?.client_id])

  useEffect(() => {
    if (!selectedActiveEquipmentUnit) return
    applyEquipmentContext(selectedActiveEquipmentUnit)
  }, [selectedActiveEquipmentUnit])


  useEffect(() => {
    if (!itemEditOpen) {
      setOriginalResults([])
      return
    }
    if (!originalSearch || originalSearch.length < 2) {
      setOriginalResults([])
      return
    }
    const timer = setTimeout(async () => {
      setOriginalLoading(true)
      try {
        setOriginalResults([])
      } catch (e) {
        console.error(e)
      } finally {
        setOriginalLoading(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [originalSearch, itemEditOpen, selectedActiveEquipmentUnit])

  useEffect(() => {
    if (!quickSearch || quickSearch.length < 2) {
      setQuickResults([])
      setQuickSelectedPart(null)
      return
    }
    const timer = setTimeout(async () => {
      setQuickLoading(true)
      try {
        setQuickResults([])
      } catch (e) {
        console.error(e)
      } finally {
        setQuickLoading(false)
      }
    }, 250)
    return () => clearTimeout(timer)
  }, [quickSearch, selectedActiveEquipmentUnit])

  useEffect(() => {
    if (!quickSearch || !quickResults.length) {
      if (!quickSearch) setQuickSelectedPart(null)
      return
    }
    const normalized = quickSearch.trim().toLowerCase()
    const exact = quickResults.find(
      (part) => String(part.cat_number || "").trim().toLowerCase() === normalized,
    )
    if (exact) {
      setQuickSelectedPart(exact)
      return
    }
    if (quickResults.length === 1) {
      setQuickSelectedPart(quickResults[0])
    }
  }, [quickResults, quickSearch])

  useEffect(() => {
    if (!addModalOpen) {
      setCatalogResults([])
      return
    }
    if (!modelId && (!catalogSearch || catalogSearch.length < 2)) {
      setCatalogResults([])
      return
    }
    if (catalogSearch && catalogSearch.length < 2) {
      return
    }
    const timer = setTimeout(async () => {
      setCatalogLoading(true)
      try {
        setCatalogResults([])
      } catch (e) {
        console.error(e)
      } finally {
        setCatalogLoading(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [addModalOpen, manufacturerId, modelId, catalogSearch])

  useEffect(() => {
    if (!catalogResults.length) return
    setCatalogRowInputs((prev) => {
      const next = { ...prev }
      catalogResults.forEach((row) => {
        if (!row?.id) return
        if (!next[row.id]) {
          next[row.id] = { qty: 1, oem_only: false }
        }
      })
      return next
    })
  }, [catalogResults])

  useEffect(() => {
    if (!addModalOpen) {
      setModalResults([])
      setModalSelectedPart(null)
      return
    }
    if (!modalSearch || modalSearch.length < 2) {
      setModalResults([])
      setModalSelectedPart(null)
      return
    }
    const timer = setTimeout(async () => {
      setModalLoading(true)
      try {
        setModalResults([])
      } catch (e) {
        console.error(e)
      } finally {
        setModalLoading(false)
      }
    }, 250)
    return () => clearTimeout(timer)
  }, [addModalOpen, modalSearch, modelId, manufacturerId])

  useEffect(() => {
    if (!bulkMode) return
    setBulkSelectedKeys([])
    setBulkSelectedRows([])
    setBulkEdits({})
  }, [items, bulkMode])

  const formatDateTimeValue = (value) => {
    if (!value) return null
    const parsed = dayjs(value)
    return parsed.isValid() ? parsed.format("YYYY-MM-DD HH:mm:ss") : null
  }

  const normalizeTextValue = (value) => {
    const text = String(value ?? "").trim()
    return text ? text : null
  }

  const formatDateValue = (value) => {
    if (!value) return null
    const parsed = dayjs(value)
    return parsed.isValid() ? parsed.format("YYYY-MM-DD") : null
  }

  const role = String(user?.role || "").toLowerCase()
  const canRelease = ["admin", "prodavec", "nachalnik-otdela-zakupok"].includes(role)

  const handleCreate = async (values) => {
    try {
      const payload = {
        client_id: values.client_id,
        source_type: values.source_type || null,
        received_at: formatDateTimeValue(values.received_at),
        processing_deadline: formatDateValue(values.processing_deadline),
        assigned_to_user_id: values.assigned_to_user_id || null,
        internal_number: normalizeTextValue(values.internal_number),
        client_reference: values.client_reference || null,
        contact_name: values.contact_name || null,
        contact_email: values.contact_email || null,
        contact_phone: values.contact_phone || null,
        comment_internal: values.comment_internal || null,
        comment_client: values.comment_client || null,
      }
      const { data } = await axios.post("/client-requests", payload)
      const clientId = values.client_id
      const name = String(values.contact_name || "").trim()
      const email = String(values.contact_email || "").trim().toLowerCase()
      const phone = String(values.contact_phone || "").trim()
      if (clientId && name) {
        const existing = clientContacts.find((c) => {
          const cEmail = String(c.email || "").trim().toLowerCase()
          const cPhone = String(c.phone || "").trim()
          const cName = String(c.name || "").trim().toLowerCase()
          return (
            (email && cEmail && cEmail === email) ||
            (phone && cPhone && cPhone === phone) ||
            (cName && cName === name.toLowerCase())
          )
        })
        if (!existing) {
          await axios.post("/client-contacts", {
            client_id: clientId,
            name,
            email: email || null,
            phone: phone || null,
            is_primary: 0,
          })
          await loadContacts(clientId)
        }
      }
      message.success("Заявка создана")
      createForm.resetFields()
      setCreateEquipmentUnitId(null)
      setCreateEquipmentUnits([])
      setCreateRequestOpen(false)
      await loadRequests()
      if (data?.id) {
        await openWorkspace(data, { equipmentUnitId: selectedCreateEquipmentUnit?.id || null })
        setSearchParams({}, { replace: true })
      }
    } catch (e) {
      console.error(e)
      message.error(e?.response?.data?.message || "Не удалось создать заявку")
    }
  }

  const handleCreateClient = async (values) => {
    if (!canWriteClientMasterData) {
      message.warning("Недостаточно прав для создания клиента")
      return
    }
    try {
      setCreateClientLoading(true)
      const { data } = await axios.post("/clients", {
        company_name: values.company_name,
        contact_person: values.contact_person || null,
        phone: values.phone || null,
        email: values.email || null,
        notes: values.notes || null,
      })
      if (data) {
        setClients((prev) => [data, ...prev])
        createForm.setFieldsValue({ client_id: data.id })
        setCreateEquipmentUnits([])
        setCreateEquipmentUnitId(null)
        loadContacts(data.id)
      }
      setCreateClientOpen(false)
      createClientForm.resetFields()
      message.success("Клиент создан")
    } catch (e) {
      console.error(e)
      message.error("Не удалось создать клиента")
    } finally {
      setCreateClientLoading(false)
    }
  }

  const openWorkspace = async (record, options = {}) => {
    setActiveRequest(record)
    setRequestEditing(false)
    setAddModalOpen(false)
    setStagedRows([])
    setImportPreview([])
    setImportSummary(null)
    setImportErrors([])
    setCreateMissing(false)
    setManufacturerId(null)
    setModelId(null)
    setCatalogSearch("")
    setCatalogResults([])
    setCatalogSelection([])
    setOriginalSearch("")
    setOriginalResults([])
    setItemEditOpen(false)
    setItemEditRecord(null)
    setWorkspaceTabKey(normalizeWorkspaceTab(options.tabKey) || "summary")
    setQuickSearch("")
    setQuickResults([])
    setQuickSelectedPart(null)
    setQuickQty(1)
    setQuickOemOnly(false)
    setBulkMode(false)
    setBulkSelectedKeys([])
    setBulkSelectedRows([])
    setBulkEdits({})
    setChangeDraftActive(false)
    setPendingChanges({ adds: [], updates: {}, deletes: [] })
    originalItemsRef.current = []
    const units = record?.client_id ? await loadEquipmentUnits(record.client_id) : []
    setActiveEquipmentUnits(units)
    const nextEquipmentUnitId =
      units.find((row) => Number(row.id) === Number(options.equipmentUnitId || activeEquipmentUnitId))
        ?.id || null
    setActiveEquipmentUnitId(nextEquipmentUnitId)
    applyEquipmentContext(units.find((row) => Number(row.id) === Number(nextEquipmentUnitId)) || null)
    requestForm.setFieldsValue({
      client_id: record.client_id,
      source_type: record.source_type || null,
      assigned_to_user_id: record.assigned_to_user_id || null,
      internal_number: record.internal_number || null,
      client_reference: record.client_reference || null,
      contact_name: record.contact_name || null,
      contact_email: record.contact_email || null,
      contact_phone: record.contact_phone || null,
      comment_internal: record.comment_internal || null,
      comment_client: record.comment_client || null,
      received_at: record.received_at ? dayjs(record.received_at) : null,
      processing_deadline: record.processing_deadline ? dayjs(record.processing_deadline) : null,
    })
    await loadContacts(record.client_id, false)
    await loadRevisions(record.id)
  }

  const refreshActiveRequest = async (requestId) => {
    if (!requestId) return null
    const { data } = await axios.get(`/client-requests/${requestId}`)
    setActiveRequest(data || null)
    return data || null
  }

  const loadRevisions = async (requestId) => {
    setRevisionsLoading(true)
    try {
      const { data } = await axios.get(`/client-requests/${requestId}/revisions`)
      const list = Array.isArray(data) ? data : []
      const sorted = [...list].sort((a, b) => (b.rev_number || 0) - (a.rev_number || 0))
      setRevisions(sorted)
      const latest = sorted[0]?.id || null
      setActiveRevisionId(latest)
      if (latest) {
        await loadItems(latest)
      } else {
        setItems([])
      }
      return sorted
    } catch (e) {
      console.error(e)
      message.error("Не удалось загрузить ревизии")
      return []
    } finally {
      setRevisionsLoading(false)
    }
  }

  const loadItems = async (revisionId) => {
    if (!revisionId) return
    setItemsLoading(true)
    try {
      const { data } = await axios.get(
        `/client-requests/revisions/${revisionId}/items`,
      )
      setItems(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
      message.error("Не удалось загрузить позиции")
    } finally {
      setItemsLoading(false)
    }
  }

  const createRevisionAndEnterEdit = async (noteOverride = null) => {
    if (!activeRequest?.id) return null
    if (!isLatestRevision) {
      message.warning("Перейдите на последнюю ревизию, чтобы создать новую")
      return null
    }
    const note = noteOverride ?? (await requestRevisionNote())
    if (!note) return null
    try {
      const { data } = await axios.post(
        `/client-requests/${activeRequest.id}/revisions`,
        { note },
      )
      const revisionId = data?.id || null
      const revisionsList = await loadRevisions(activeRequest.id)
      if (revisionId) {
        const revisionItems = await fetchRevisionItems(revisionId)
        setActiveRevisionId(revisionId)
        setItems(revisionItems)
        setWorkspaceTabKey("items")
        startChangeDraft({ force: true, itemsSnapshot: revisionItems })
      }
      const refreshedRequest = await refreshActiveRequest(activeRequest.id)
      message.success("Ревизия создана. Режим редактирования включен")
      const syncStatus = String(refreshedRequest?.rfq_sync_status || "").toLowerCase()
      if (refreshedRequest?.rfq_id && syncStatus === "needs_sync") {
        const currentRev = revisionsList.find((r) => Number(r.id) === Number(revisionId))
        const previousRev = currentRev
          ? revisionsList.find((r) => Number(r.rev_number) === Number(currentRev.rev_number) - 1)
          : null
        const previousItems = previousRev?.id ? await fetchRevisionItems(previousRev.id) : []
        const currentItems = revisionId ? await fetchRevisionItems(revisionId) : []
        const delta = calcRevisionDelta(previousItems, currentItems)
        const { confirmed } = await confirmAction(
          {
            title: "Найдены несинхронизированные изменения RFQ",
            text: `Добавлено: +${delta.added} · Удалено: -${delta.removed} · Изменено: ~${delta.changed}. Синхронизировать сейчас?`,
          }
        )
        if (confirmed) {
          await handleSyncRfq({
            requestId: refreshedRequest.id,
            skipConfirm: true,
            successMessagePrefix: "RFQ синхронизирован после создания ревизии",
          })
        }
      }
      return revisionId
    } catch (e) {
      console.error(e)
      message.error("Не удалось создать ревизию")
      return null
    }
  }

  const _handleAddRevision = async (values) => {
    const note = String(values.note || "").trim()
    if (!note) {
      message.warning("Укажите комментарий для ревизии")
      return
    }
    revisionForm.resetFields()
    await createRevisionAndEnterEdit(note)
  }

  const handleSelectRevision = async (revisionId) => {
    if (!revisionId) return
    setActiveRevisionId(revisionId)
    await loadItems(revisionId)
    if (revisionId !== latestRevisionId) {
      setChangeDraftActive(false)
      setPendingChanges({ adds: [], updates: {}, deletes: [] })
      setBulkMode(false)
      setBulkSelectedKeys([])
      setBulkSelectedRows([])
      setBulkEdits({})
      originalItemsRef.current = []
    }
  }

  const ensureOriginalOption = (item) => {
    const catalogPositionId = getCatalogPositionId(item)
    if (!catalogPositionId) return
    setOriginalResults((prev) => {
      if (prev.some((opt) => Number(opt.id) === Number(catalogPositionId))) return prev
      return [
        {
          id: catalogPositionId,
          catalog_position_id: catalogPositionId,
          cat_number: getCatalogPartNumber(item) || item.original_cat_number,
          description_ru: item.catalog_position_name_ru || item.original_description_ru,
          description_en: item.catalog_position_name_en || item.original_description_en,
        },
        ...prev,
      ]
    })
  }

  const createStagedRow = (data = {}) => ({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    catalog_position_id: data.catalog_position_id || data.original_part_id || null,
    original_part_id: data.catalog_position_id || data.original_part_id || null,
    manufacturer: data.manufacturer || null,
    model: data.model || null,
    cat_number: data.cat_number || "",
    client_part_number: data.client_part_number || data.cat_number || "",
    client_description: data.client_description || "",
    requested_qty: data.requested_qty ?? null,
    uom: data.uom || "шт",
    required_date: data.required_date || null,
    priority: data.priority || null,
    oem_only: data.oem_only || false,
    client_comment: data.client_comment || "",
    internal_comment: data.internal_comment || "",
    equipment_model_id: data.equipment_model_id || null,
  })

  const updateStagedRow = (id, patch) => {
    setStagedRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    )
    setImportPreview([])
    setImportSummary(null)
    setImportErrors([])
  }

  const removeStagedRow = (id) => {
    setStagedRows((prev) => prev.filter((row) => row.id !== id))
    setImportPreview([])
    setImportSummary(null)
    setImportErrors([])
  }

  const resetImportState = () => {
    setImportPreview([])
    setImportSummary(null)
    setImportErrors([])
    setCreateMissing(false)
  }

  const buildImportRows = (rows) => {
    const selectedManufacturer = manufacturers.find((m) => m.id === manufacturerId)
    const selectedModel = models.find((m) => m.id === modelId)

    return rows.map((row) => ({
      manufacturer: row.manufacturer || selectedManufacturer?.name || null,
      model: row.model || selectedModel?.model_name || null,
      cat_number: row.cat_number?.trim() || null,
      client_part_number: row.client_part_number || row.cat_number?.trim() || null,
      client_description: row.client_description || null,
      requested_qty: row.requested_qty ?? null,
      uom: row.uom || "шт",
      required_date: formatDateValue(row.required_date),
      priority: row.priority || null,
      oem_only: row.oem_only ? 1 : 0,
      client_comment: row.client_comment || null,
      internal_comment: row.internal_comment || null,
    }))
  }

  const handlePreviewRows = async (rows = stagedRows) => {
    if (!activeRequest?.id) return null
    if (!rows.length) {
      message.warning("Список позиций пуст")
      return null
    }
    try {
      setImportLoading(true)
      setImportErrors([])
      const prepared = buildImportRows(rows)
      const { data } = await axios.post(
        `/client-requests/${activeRequest.id}/items/import/preview`,
        {
          rows: prepared,
          context: {
            manufacturer_id: manufacturerId || null,
            equipment_model_id: modelId || null,
          },
        },
      )
      setImportPreview(data.rows || [])
      setImportSummary(data.summary || null)
      return data
    } catch (e) {
      console.error(e)
      setImportErrors([e?.message || "Не удалось выполнить проверку"])
      return null
    } finally {
      setImportLoading(false)
    }
  }

  const handleCommitRows = async (rows = stagedRows) => {
    if (!activeRequest?.id) return
    if (!isLatestRevision) {
      message.warning("Добавление возможно только в последнюю ревизию")
      return
    }
    if (!rows.length) {
      message.warning("Список позиций пуст")
      return
    }
    if (changeDraftActive) {
      const prepared = buildImportRows(rows)
      prepared.forEach((row) => {
        stageAdd({
          original_part_id: null,
          original_cat_number: row.cat_number,
          client_part_number: row.client_part_number || row.cat_number,
          client_description: row.client_description || null,
          requested_qty: row.requested_qty ?? null,
          uom: row.uom || "шт",
          oem_only: row.oem_only ? 1 : 0,
        })
      })
      message.success("Позиции добавлены в черновик")
      setAddModalOpen(false)
      setImportModalOpen(false)
      setStagedRows([])
      resetImportState()
      return
    }
    const revisionId = await ensureActiveRevisionId()
    if (!revisionId) return
    let preview = null
    if (!importPreview.length) {
      preview = await handlePreviewRows(rows)
    }
    const previewRows = preview?.rows || importPreview
    const previewSummary = preview?.summary || importSummary
    if (importErrors.length) {
      message.error("Исправьте ошибки импорта перед добавлением")
      return
    }
    if (previewSummary?.error) {
      message.error("Есть ошибки в списке, исправьте их")
      return
    }
    if (!createMissing && previewRows?.some((row) => row.status === "warning")) {
      message.warning("Есть предупреждения — включите создание недостающих")
      return
    }
    const prepared = buildImportRows(rows)
    try {
      setImportLoading(true)
      const { data } = await axios.post(
        `/client-requests/${activeRequest.id}/items/import/commit`,
        {
          rows: prepared,
          revision_id: revisionId,
          create_missing: createMissing,
          context: {
            manufacturer_id: manufacturerId || null,
            equipment_model_id: modelId || null,
          },
        },
      )
      message.success(
        `Добавлено позиций: ${data.inserted || 0}. Создано: производителей ${
          data.created?.manufacturers || 0
        }, моделей ${data.created?.models || 0}, деталей ${
          data.created?.parts || 0
        }.`,
      )
      setAddModalOpen(false)
      setImportModalOpen(false)
      setStagedRows([])
      resetImportState()
      await loadItems(revisionId)
    } catch (e) {
      const serverMessage = e?.response?.data?.message
      message.error(serverMessage || "Не удалось добавить позиции")
      if (e?.response?.data?.rows) {
        setImportPreview(e.response.data.rows)
        setImportSummary(e.response.data.summary || null)
      }
    } finally {
      setImportLoading(false)
    }
  }

  const parseImportFile = async (file) => {
    const { default: readXlsxFile } = await import("read-excel-file")
    const rows = await readXlsxFile(file)
    if (!rows?.length) {
      throw new Error("Файл пустой или не распознан")
    }
    const headerRow = rows[0].map((h) => String(h ?? "").trim())
    const dataRows = rows.slice(1)

    const mapped = []
    const errors = []

    const present = new Set(headerRow)
    const missingHeaders = IMPORT_REQUIRED_FIELDS.filter((field) => {
      const human = Object.entries(IMPORT_HEADER_MAP).find(
        ([, key]) => key === field,
      )?.[0]
      return human ? !present.has(human) : false
    })
    if (missingHeaders.length) {
      errors.push(`Отсутствуют обязательные колонки: ${missingHeaders.join(", ")}`)
    }

    dataRows.forEach((row, idx) => {
      const obj = {}
      headerRow.forEach((label, colIdx) => {
        const key = IMPORT_HEADER_MAP[label]
        if (key) obj[key] = row[colIdx]
      })
      const hasValues = Object.values(obj).some(
        (v) => v !== undefined && v !== null && String(v).trim() !== "",
      )
      if (!hasValues) return

      IMPORT_REQUIRED_FIELDS.forEach((field) => {
        const val = obj[field]
        if (val === undefined || val === null || String(val).trim() === "") {
          errors.push(`Строка ${idx + 2}: поле "${field}" обязательно`)
        }
      })

      mapped.push(
        createStagedRow({
          manufacturer: obj.manufacturer || null,
          model: obj.model || null,
          cat_number: obj.cat_number || "",
          client_part_number: obj.client_part_number || obj.cat_number || "",
          client_description: obj.client_description || "",
          requested_qty:
            obj.requested_qty !== undefined && obj.requested_qty !== null
              ? Number(String(obj.requested_qty).replace(",", "."))
              : null,
          uom: obj.uom || "шт",
          required_date: obj.required_date ? dayjs(obj.required_date) : null,
          priority: obj.priority || null,
          oem_only: ["1", "да", "yes", "true"].includes(
            String(obj.oem_only || "").toLowerCase(),
          ),
          client_comment: obj.client_comment || "",
          internal_comment: obj.internal_comment || "",
        }),
      )
    })

    return { rows: mapped, errors }
  }

  const handleExcelUpload = async (file) => {
    try {
      setImportLoading(true)
      resetImportState()
      const { rows, errors } = await parseImportFile(file)
      if (errors.length) {
        setImportErrors(errors)
        return
      }
      if (!rows.length) {
        setImportErrors(["Нет данных для импорта"])
        return
      }
      setStagedRows(rows)
      await handlePreviewRows(rows)
    } catch (e) {
      console.error(e)
      setImportErrors([e?.message || "Не удалось разобрать файл"])
    } finally {
      setImportLoading(false)
    }
  }

  const buildItemFromPart = (part, overrides = {}) => {
    const qty = Number(overrides.qty ?? overrides.requested_qty ?? 1)
    const normalizedPart = normalizeCatalogPart(part)
    const catalogPositionId = getCatalogPositionId(normalizedPart)
    return {
      catalog_position_id: catalogPositionId,
      original_part_id: catalogPositionId,
      original_cat_number: getCatalogPartNumber(normalizedPart),
      original_description_ru: normalizedPart?.description_ru || null,
      original_description_en: normalizedPart?.description_en || null,
      client_part_number: getInitialClientPartNumber(normalizedPart, overrides),
      client_description:
        overrides.client_description ||
        normalizedPart?.description_ru ||
        normalizedPart?.description_en ||
        null,
      requested_qty: Number.isFinite(qty) && qty > 0 ? qty : 1,
      uom: overrides.uom || normalizedPart?.uom || "шт",
      oem_only: overrides.oem_only ? 1 : 0,
      equipment_model_id:
        overrides.equipment_model_id ||
        selectedActiveEquipmentUnit?.equipment_model_id ||
        modelId ||
        null,
      model_name:
        overrides.model_name || selectedActiveEquipmentUnit?.model_name || part?.model_name || null,
      manufacturer_name:
        overrides.manufacturer_name ||
        selectedActiveEquipmentUnit?.manufacturer_name ||
        part?.manufacturer_name ||
        null,
    }
  }

  const addItemsToRequest = async (itemsToAdd = []) => {
    if (!activeRequest?.id) return
    if (!isLatestRevision) {
      message.warning("Добавление возможно только в последней ревизии")
      return
    }
    if (!itemsToAdd.length) return
    if (changeDraftActive) {
      itemsToAdd.forEach((item) => stageAdd(item))
      message.success("Позиции добавлены в черновик")
      return
    }
    const revisionId = await ensureActiveRevisionId()
    if (!revisionId) return
    try {
      setCatalogAddLoading(true)
      await Promise.all(
        itemsToAdd.map((item) =>
          axios.post(`/client-requests/revisions/${revisionId}/items`, {
            catalog_position_id: item.catalog_position_id || item.original_part_id || null,
            original_part_id: item.original_part_id || item.catalog_position_id || null,
            equipment_model_id:
              item.equipment_model_id ||
              selectedActiveEquipmentUnit?.equipment_model_id ||
              modelId ||
              null,
            client_part_number:
              item.client_part_number || null,
            client_description:
              item.client_description ||
              item.original_description_ru ||
              item.original_description_en ||
              null,
            requested_qty: item.requested_qty ?? null,
            uom: item.uom || "шт",
            oem_only: item.oem_only ? 1 : 0,
          }),
        ),
      )
      await loadItems(revisionId)
      message.success(`Позиции добавлены: ${itemsToAdd.length}`)
    } catch (e) {
      console.error(e)
      message.error("Не удалось добавить позиции")
    } finally {
      setCatalogAddLoading(false)
    }
  }

  const handleAddFromCatalog = async (part) => {
    if (!part) return
    const meta = catalogRowInputs[part.id] || {}
    await addItemsToRequest([
      buildItemFromPart(part, {
        qty: meta.qty ?? 1,
        oem_only: meta.oem_only ? 1 : 0,
      }),
    ])
  }

  const handleAddSelectedFromCatalog = async () => {
    if (!catalogSelection.length) return
    const selected = catalogResults.filter((part) =>
      catalogSelection.includes(part.id),
    )
    const itemsToAdd = selected.map((part) => {
      const meta = catalogRowInputs[part.id] || {}
      return buildItemFromPart(part, {
        qty: meta.qty ?? 1,
        oem_only: meta.oem_only ? 1 : 0,
      })
    })
    await addItemsToRequest(itemsToAdd)
    setCatalogSelection([])
  }

  const requestRevisionNote = () =>
    new Promise((resolve) => {
      setRevisionNote("")
      setRevisionNoteOpen(true)
      revisionNoteResolver.current = resolve
    })

  const closeRevisionNote = (value) => {
    if (revisionNoteResolver.current) {
      revisionNoteResolver.current(value)
      revisionNoteResolver.current = null
    }
    setRevisionNoteOpen(false)
  }

  const _createRevisionForChange = async () => {
    if (!activeRequest?.id) return null
    if (!isLatestRevision) {
      message.warning("Изменения доступны только в последней ревизии")
      return null
    }
    const note = await requestRevisionNote()
    if (!note) return null
    try {
      const { data } = await axios.post(
        `/client-requests/${activeRequest.id}/revisions`,
        { note },
      )
      const revisionId = data?.id
      setActiveRevisionId(revisionId)
      await loadRevisions(activeRequest.id)
      return revisionId
    } catch (e) {
      console.error(e)
      message.error("Не удалось создать ревизию")
      return null
    }
  }

  const ensureActiveRevisionId = async () => {
    if (!activeRequest?.id) return null
    if (activeRevisionId) return activeRevisionId
    try {
      const { data } = await axios.post(
        `/client-requests/${activeRequest.id}/revisions`,
        { note: "Автоматическая ревизия" },
      )
      const revisionId = data?.id
      setActiveRevisionId(revisionId)
      await loadRevisions(activeRequest.id)
      return revisionId
    } catch (e) {
      console.error(e)
      message.error("Не удалось создать ревизию")
      return null
    }
  }

  const fetchRevisionItems = async (revisionId) => {
    if (!revisionId) return []
    const { data } = await axios.get(
      `/client-requests/revisions/${revisionId}/items`,
    )
    return Array.isArray(data) ? data : []
  }

  const calcRevisionDelta = (previousItems = [], currentItems = []) => {
    const prevMap = new Map()
    const currMap = new Map()
    previousItems.forEach((row) => {
      const key = Number(row?.line_number || 0)
      if (key > 0) prevMap.set(key, row)
    })
    currentItems.forEach((row) => {
      const key = Number(row?.line_number || 0)
      if (key > 0) currMap.set(key, row)
    })

    let added = 0
    let removed = 0
    let changed = 0

    currMap.forEach((currRow, key) => {
      const prevRow = prevMap.get(key)
      if (!prevRow) {
        added += 1
        return
      }
      const isDifferent =
        Number(currRow?.catalog_position_id || 0) !== Number(prevRow?.catalog_position_id || 0) ||
        Number(currRow?.original_part_id || 0) !== Number(prevRow?.original_part_id || 0) ||
        Number(currRow?.requested_qty || 0) !== Number(prevRow?.requested_qty || 0) ||
        String(currRow?.uom || "") !== String(prevRow?.uom || "") ||
        Number(currRow?.oem_only || 0) !== Number(prevRow?.oem_only || 0) ||
        String(currRow?.client_part_number || "") !== String(prevRow?.client_part_number || "") ||
        String(currRow?.client_description || "") !== String(prevRow?.client_description || "")
      if (isDifferent) changed += 1
    })

    prevMap.forEach((_prevRow, key) => {
      if (!currMap.has(key)) removed += 1
    })

    return { added, removed, changed }
  }

  const startChangeDraft = (options = {}) => {
    const { force = false, itemsSnapshot = null } = options
    if (!force && !isLatestRevision) {
      message.warning("Изменения доступны только в последней ревизии")
      return
    }
    const baseItems = Array.isArray(itemsSnapshot) ? itemsSnapshot : items
    originalItemsRef.current = baseItems.map((row) => ({ ...row }))
    if (itemsSnapshot) {
      setItems(baseItems)
    }
    setPendingChanges({ adds: [], updates: {}, deletes: [] })
    setBulkMode(true)
    setChangeDraftActive(true)
  }

  const cancelChangeDraft = () => {
    setItems(originalItemsRef.current || [])
    setPendingChanges({ adds: [], updates: {}, deletes: [] })
    setBulkMode(false)
    setBulkSelectedKeys([])
    setBulkSelectedRows([])
    setBulkEdits({})
    setChangeDraftActive(false)
  }

  const stageUpdate = (lineNumber, patch) => {
    if (!lineNumber) return
    setItems((prev) =>
      prev.map((row) =>
        row.line_number === lineNumber ? { ...row, ...patch } : row,
      ),
    )
    setPendingChanges((prev) => ({
      ...prev,
      updates: {
        ...prev.updates,
        [lineNumber]: {
          ...(prev.updates?.[lineNumber] || {}),
          ...patch,
        },
      },
    }))
  }

  const stageDelete = (record) => {
    if (!record) return
    if (record.id && record.id < 0) {
      setPendingChanges((prev) => ({
        ...prev,
        adds: prev.adds.filter((row) => row.temp_id !== record.id),
      }))
      setItems((prev) => prev.filter((row) => row.id !== record.id))
      return
    }
    if (!record.line_number) return
    setPendingChanges((prev) => ({
      ...prev,
      deletes: Array.from(new Set([...(prev.deletes || []), record.line_number])),
      updates: Object.fromEntries(
        Object.entries(prev.updates || {}).filter(
          ([key]) => Number(key) !== Number(record.line_number),
        ),
      ),
    }))
    setItems((prev) =>
      prev.filter((row) => row.line_number !== record.line_number),
    )
  }

  const stageAdd = (payload) => {
    const tempId = -Date.now() - Math.floor(Math.random() * 1000)
    const newItem = {
      id: tempId,
      temp_id: tempId,
      line_number: null,
      catalog_position_id: payload.catalog_position_id || payload.original_part_id || null,
      original_part_id: payload.original_part_id || payload.catalog_position_id || null,
      original_cat_number: payload.original_cat_number || null,
      original_description_ru: payload.original_description_ru || null,
      original_description_en: payload.original_description_en || null,
      client_part_number: payload.client_part_number || null,
      client_description: payload.client_description || null,
      requested_qty: payload.requested_qty || null,
      uom: payload.uom || "шт",
      oem_only: payload.oem_only ? 1 : 0,
      equipment_model_id:
        payload.equipment_model_id ||
        selectedActiveEquipmentUnit?.equipment_model_id ||
        modelId ||
        null,
      model_name: payload.model_name || selectedActiveEquipmentUnit?.model_name || null,
      manufacturer_name:
        payload.manufacturer_name || selectedActiveEquipmentUnit?.manufacturer_name || null,
    }
    setItems((prev) => [newItem, ...prev])
    setPendingChanges((prev) => ({
      ...prev,
      adds: [...prev.adds, { ...payload, temp_id: tempId }],
    }))
  }

  const commitChangeDraft = async () => {
    const hasChanges =
      pendingChanges.adds.length ||
      pendingChanges.deletes.length ||
      Object.keys(pendingChanges.updates || {}).length
    if (!hasChanges) {
      message.warning("Нет изменений для сохранения")
      return
    }
    if (!isLatestRevision) {
      message.warning("Редактирование доступно только в последней ревизии")
      return
    }
    if (!activeRevisionId) {
      message.info("Сначала создайте ревизию для редактирования.")
      return
    }
    try {
      const revisionId = activeRevisionId
      const revisionItems = await fetchRevisionItems(revisionId)
      const itemsByLine = new Map(
        revisionItems.map((row) => [row.line_number, row]),
      )

      for (const lineNumber of pendingChanges.deletes || []) {
        const target = itemsByLine.get(lineNumber)
        if (!target) continue
        await axios.delete(
          `/client-requests/revisions/${revisionId}/items/${target.id}`,
        )
      }

      const updateEntries = Object.entries(pendingChanges.updates || {})
      for (const [lineNumber, patch] of updateEntries) {
        const target = itemsByLine.get(Number(lineNumber))
        if (!target) continue
        const payload = {
          catalog_position_id: target.catalog_position_id || target.original_part_id || null,
          original_part_id: target.original_part_id || target.catalog_position_id || null,
          equipment_model_id:
            target.equipment_model_id ||
            selectedActiveEquipmentUnit?.equipment_model_id ||
            modelId ||
            null,
          client_part_number: target.client_part_number || null,
          client_description: target.client_description || null,
          client_line_text: target.client_line_text || null,
          requested_qty:
            patch.requested_qty !== undefined
              ? patch.requested_qty
              : target.requested_qty,
          uom: target.uom || "шт",
          required_date: target.required_date || null,
          priority: target.priority || null,
          oem_only:
            patch.oem_only !== undefined
              ? patch.oem_only ? 1 : 0
              : target.oem_only ? 1 : 0,
          client_comment: target.client_comment || null,
          internal_comment: target.internal_comment || null,
        }
        await axios.put(
          `/client-requests/revisions/${revisionId}/items/${target.id}`,
          payload,
        )
      }

      for (const row of pendingChanges.adds || []) {
        const payload = {
          catalog_position_id: row.catalog_position_id || row.original_part_id || null,
          original_part_id: row.original_part_id || row.catalog_position_id || null,
          equipment_model_id:
            row.equipment_model_id ||
            selectedActiveEquipmentUnit?.equipment_model_id ||
            modelId ||
            null,
          client_part_number: row.client_part_number || null,
          client_description: row.client_description || null,
          requested_qty: row.requested_qty ?? null,
          uom: row.uom || "шт",
          oem_only: row.oem_only ? 1 : 0,
        }
        await axios.post(
          `/client-requests/revisions/${revisionId}/items`,
          payload,
        )
      }

      if (activeRequest?.id) {
        try {
          await axios.post(`/client-requests/${activeRequest.id}/sync-rfq`)
          message.success("RFQ синхронизирован")
        } catch (e) {
          const errMsg =
            e?.response?.data?.message ||
            (e?.response?.status === 409
              ? "Синхронизация недоступна (не отправлено в закупку?)"
              : "Не удалось синхронизировать RFQ автоматически")
          message.warning(errMsg)
          // fallback: помечаем needs_sync, чтобы пользователь мог синхронизировать вручную
          try {
            await axios.post(`/client-requests/${activeRequest.id}/mark-rfq-needs-sync`)
          } catch {
            /* ignore */
          }
        } finally {
          await refreshActiveRequest(activeRequest.id)
        }
      }

      const refreshed = await fetchRevisionItems(revisionId)
      setActiveRevisionId(revisionId)
      setItems(refreshed)
      setPendingChanges({ adds: [], updates: {}, deletes: [] })
      setBulkSelectedKeys([])
      setBulkSelectedRows([])
      setBulkEdits({})
      originalItemsRef.current = refreshed.map((row) => ({ ...row }))
      setChangeDraftActive(true)
      setBulkMode(true)
      message.success("Изменения сохранены")
    } catch (e) {
      console.error(e)
      message.error("Не удалось сохранить изменения")
    }
  }

  const handleUpdateItem = async (values) => {
    if (!itemEditRecord) return
    try {
      if (changeDraftActive) {
        stageUpdate(itemEditRecord.line_number, {
          catalog_position_id: values.catalog_position_id || values.original_part_id || null,
          original_part_id: values.original_part_id || values.catalog_position_id || null,
          equipment_model_id:
            itemEditRecord?.equipment_model_id ||
            selectedActiveEquipmentUnit?.equipment_model_id ||
            modelId ||
            null,
          client_part_number: values.client_part_number || null,
          client_description: values.client_description || null,
          client_line_text: values.client_line_text || null,
          requested_qty: values.requested_qty ?? null,
          uom: values.uom || "шт",
          required_date: formatDateValue(values.required_date),
          priority: values.priority || null,
          oem_only: values.oem_only ? 1 : 0,
          client_comment: values.client_comment || null,
          internal_comment: values.internal_comment || null,
        })
        setItemEditOpen(false)
        setItemEditRecord(null)
        itemForm.resetFields()
        message.success("Изменение добавлено в черновик")
        return
      }

      message.info("Сначала создайте ревизию для редактирования.")
      return

    } catch (e) {
      console.error(e)
      message.error("Не удалось обновить позицию")
    }
  }

  const handleQuickAdd = async () => {
    if (!activeRequest?.id) return
    if (!isLatestRevision) {
      message.warning("Добавление возможно только в последней ревизии")
      return
    }
    if (!quickSearch.trim()) {
      message.warning("Введите каталожный номер или выберите деталь")
      return
    }
    if (changeDraftActive) {
      const normalizedPart = normalizeCatalogPart(quickSelectedPart)
      stageAdd({
        catalog_position_id: normalizedPart?.catalog_position_id || null,
        original_part_id: normalizedPart?.original_part_id || null,
        original_cat_number: normalizedPart?.cat_number || null,
        original_description_ru: normalizedPart?.description_ru || null,
        original_description_en: normalizedPart?.description_en || null,
        client_part_number: normalizedPart?.cat_number || quickSearch.trim(),
        client_description:
          normalizedPart?.description_ru ||
          normalizedPart?.description_en ||
          null,
        requested_qty: quickQty || 1,
        uom: normalizedPart?.uom || "шт",
        oem_only: quickOemOnly ? 1 : 0,
        equipment_model_id: selectedActiveEquipmentUnit?.equipment_model_id || modelId || null,
        model_name: selectedActiveEquipmentUnit?.model_name || null,
        manufacturer_name: selectedActiveEquipmentUnit?.manufacturer_name || null,
      })
      setQuickSearch("")
      setQuickSelectedPart(null)
      setQuickQty(1)
      setQuickOemOnly(false)
      message.success("Позиция добавлена в черновик")
      return
    }
    const revisionId = await ensureActiveRevisionId()
    if (!revisionId) return
    const normalizedPart = normalizeCatalogPart(quickSelectedPart)
    const payload = {
      catalog_position_id: normalizedPart?.catalog_position_id || null,
      original_part_id: normalizedPart?.original_part_id || null,
      equipment_model_id: selectedActiveEquipmentUnit?.equipment_model_id || modelId || null,
      client_part_number: normalizedPart?.cat_number || quickSearch.trim(),
      client_description:
        normalizedPart?.description_ru ||
        normalizedPart?.description_en ||
        null,
      requested_qty: quickQty || 1,
      uom: normalizedPart?.uom || "шт",
      oem_only: quickOemOnly ? 1 : 0,
    }
    try {
      await axios.post(
        `/client-requests/revisions/${revisionId}/items`,
        payload,
      )
      message.success("Позиция добавлена")
      setQuickSearch("")
      setQuickSelectedPart(null)
      setQuickQty(1)
      setQuickOemOnly(false)
      await loadItems(revisionId)
    } catch (e) {
      console.error(e)
      message.error("Не удалось добавить позицию")
    }
  }

  const handleModalGlobalAdd = async () => {
    if (!modalSearch.trim()) {
      message.warning("Введите каталожный номер")
      return
    }
    const part = modalSelectedPart
    const item = part
      ? buildItemFromPart(part, { qty: modalQty, oem_only: modalOemOnly })
      : {
          original_part_id: null,
          original_cat_number: modalSearch.trim(),
          client_part_number: modalSearch.trim(),
          client_description: "",
          requested_qty: modalQty || 1,
          uom: "шт",
          oem_only: modalOemOnly ? 1 : 0,
        }
    await addItemsToRequest([item])
    setModalSearch("")
    setModalResults([])
    setModalSelectedPart(null)
    setModalQty(1)
    setModalOemOnly(false)
  }

  const formatPartLabel = (part) => {
    const number = getCatalogPartNumber(part) || "—"
    const desc =
      part?.description_ru ||
      part?.catalog_position_name_ru ||
      part?.description_en ||
      part?.catalog_position_name_en ||
      part?.catalog_position_name ||
      "Без описания"
    const model = part?.model_name || ""
    const manufacturer = part?.manufacturer_name || ""
    const suffix = [manufacturer, model].filter(Boolean).join(" • ")
    return `${number} • ${desc}${suffix ? ` • ${suffix}` : ""}`
  }

  const applyBulkUpdate = async () => {
    if (!bulkSelectedRows.length) {
      message.warning("Выберите позиции для массового изменения")
      return
    }
    if (!bulkSelectedRows.some((row) => bulkEdits[row.line_number])) {
      message.warning("Укажите изменения для выбранных позиций")
      return
    }
    if (changeDraftActive) {
      bulkSelectedRows.forEach((row) => {
        const edit = bulkEdits[row.line_number]
        if (!edit) return
        stageUpdate(row.line_number, edit)
      })
      message.success("Изменения добавлены в черновик")
      return
    }
    message.info("Сначала создайте ревизию для редактирования.")
  }

  const applyBulkDelete = async () => {
    if (!bulkSelectedRows.length) {
      message.warning("Выберите позиции для удаления")
      return
    }
    if (!changeDraftActive) {
    message.info("Сначала создайте ревизию для редактирования.")
      return
    }
    const { confirmed } = await confirmAction("Удалить выбранные позиции?")
    if (!confirmed) return
    if (changeDraftActive) {
      bulkSelectedRows.forEach((row) => stageDelete(row))
      setBulkSelectedKeys([])
      setBulkSelectedRows([])
      setBulkEdits({})
      message.success("Удаления добавлены в черновик")
      return
    }
    message.info("Сначала создайте ревизию для редактирования.")
  }

  const handleUpdateRequest = async (values) => {
    if (!activeRequest?.id) return
    try {
      const payload = {
        source_type: values.source_type || null,
        received_at: formatDateTimeValue(values.received_at),
        processing_deadline: formatDateValue(values.processing_deadline),
        assigned_to_user_id: values.assigned_to_user_id || null,
        internal_number: normalizeTextValue(values.internal_number),
        client_reference: values.client_reference || null,
        contact_name: values.contact_name || null,
        contact_email: values.contact_email || null,
        contact_phone: values.contact_phone || null,
        comment_internal: values.comment_internal || null,
        comment_client: values.comment_client || null,
      }
      const { data } = await axios.put(
        `/client-requests/${activeRequest.id}`,
        payload,
      )
      setActiveRequest(data)
      setRequestEditing(false)
      message.success("Заявка обновлена")
      await loadRequests()
    } catch (e) {
      console.error(e)
      message.error(e?.response?.data?.message || "Не удалось обновить заявку")
    }
  }

  const handleReleaseRequest = async () => {
    if (!activeRequest?.id) return
    const { confirmed } = await confirmAction("Отправить заявку в закупку?")
    if (!confirmed) return
    try {
      const { data } = await axios.post(`/client-requests/${activeRequest.id}/release`)
      setActiveRequest(data?.request || activeRequest)
      message.success("Заявка отправлена в закупку")
      await loadRequests()
      await openWorkspace(data?.request || activeRequest)
    } catch (e) {
      console.error(e)
      message.error(e?.response?.data?.message || "Не удалось отправить заявку в закупку")
    }
  }

  const handleSyncRfq = async (options = {}) => {
    const requestId = Number(options.requestId || activeRequest?.id || 0)
    if (!requestId) return
    if (!options.skipConfirm) {
      const { confirmed } = await confirmAction(
        "Синхронизировать текущую ревизию заявки с уже созданным RFQ?"
      )
      if (!confirmed) return
    }
    try {
      const { data } = await axios.post(`/client-requests/${requestId}/sync-rfq`)
      if (data?.request) {
        setActiveRequest(data.request)
      } else {
        await refreshActiveRequest(requestId)
      }
      await loadRequests()
      message.success(
        `${options.successMessagePrefix || "RFQ синхронизирован"}${
          Number(data?.added_items || 0) > 0 ? `: добавлено строк ${data.added_items}` : ""
        }`
      )
    } catch (e) {
      console.error(e)
      message.error(e?.response?.data?.message || "Не удалось синхронизировать RFQ")
    }
  }

  const handleDeleteItem = async (record) => {
    if (!isLatestRevision) {
      message.warning("Удаление доступно только в последней ревизии")
      return
    }
    if (!changeDraftActive) {
      message.info("Сначала создайте ревизию для редактирования.")
      return
    }
    const { confirmed } = await confirmAction("Удалить позицию?")
    if (!confirmed) return
    try {
      if (changeDraftActive) {
        stageDelete(record)
        message.success("Позиция удалена в черновике")
        return
      }

    } catch (e) {
      console.error(e)
      message.error("Не удалось удалить позицию")
    }
  }

  const handleDeleteRequest = async (id) => {
    const { confirmed } = await confirmAction({
      title: "Архивировать заявку?",
      text: "Заявка останется в системе и истории, но будет скрыта из обычного списка.",
      icon: "warning",
      confirmLabel: "Архивировать",
    })
    if (!confirmed) return
    try {
      await axios.post(`/client-requests/${id}/archive`)
      message.success("Заявка перенесена в архив")
      await loadRequests()
      if (activeRequest?.id === id) {
        setActiveRequest(null)
      }
    } catch (e) {
      console.error(e)
      message.error(e?.response?.data?.message || "Не удалось архивировать заявку")
    }
  }

  const clientOptions = useMemo(
    () =>
      clients.map((c) => ({
        value: c.id,
        label: c.company_name || `Клиент #${c.id}`,
      })),
    [clients],
  )

  const userOptions = useMemo(
    () =>
      users.map((u) => ({
        value: u.id,
        label: u.full_name || u.email || `Пользователь #${u.id}`,
      })),
    [users],
  )

  const clientSelectOptions = useMemo(
    () => {
      const options = [...clientOptions]
      if (canWriteClientMasterData) {
        options.push({ value: "__create__", label: "+ Создать клиента" })
      }
      return options
    },
    [clientOptions, canWriteClientMasterData],
  )

  const contactOptions = useMemo(
    () =>
      clientContacts.map((c) => ({
        value: c.name || "",
        label: `${c.name || "Контакт"}${c.email ? ` • ${c.email}` : ""}${
          c.phone ? ` • ${c.phone}` : ""
        }`,
        email: c.email || "",
        phone: c.phone || "",
      })),
    [clientContacts],
  )


  const manufacturerOptions = useMemo(
    () =>
      manufacturers.map((m) => ({
        value: m.id,
        label: m.name || `Производитель #${m.id}`,
      })),
    [manufacturers],
  )

  const modelOptions = useMemo(
    () =>
      models.map((m) => ({
        value: m.id,
        label: m.model_name || `Модель #${m.id}`,
      })),
    [models],
  )

  const originalOptions = useMemo(
    () =>
      originalResults.map((item) => ({
        value: item.id,
        label: item.cat_number
          ? `${item.cat_number} — ${item.description_ru || item.description_en || ""}`.trim()
          : `Без номера — ${item.description_ru || item.description_en || ""}`.trim(),
        description: item.description_ru || item.description_en || "",
      })),
    [originalResults],
  )

  const formatDateTime = (value) => {
    if (!value) return "—"
    const parsed = dayjs(value)
    return parsed.isValid() ? parsed.format("DD.MM.YYYY") : value
  }

  const latestRevisionId = useMemo(() => {
    if (!revisions.length) return null
    return revisions.reduce((latest, rev) => {
      if (!latest) return rev
      return (rev.rev_number || 0) > (latest.rev_number || 0) ? rev : latest
    }, null)?.id
  }, [revisions])
  const activeRevision = revisions.find((rev) => rev.id === activeRevisionId) || null
  const isLatestRevision = !latestRevisionId || activeRevisionId === latestRevisionId
  const isReleasedLocked = !!activeRequest?.is_locked_after_release
  const isSentToProcurement = !!activeRequest?.released_to_procurement_at
  const rfqSyncStatus = String(activeRequest?.rfq_sync_status || "").toLowerCase()
  const activeRevisionLabel = activeRevision?.rev_number
    ? `Ревизия ${activeRevision.rev_number}`
    : "Ревизий нет"
  const activeRevisionDate = activeRevision?.created_at
    ? formatDateTime(activeRevision.created_at)
    : "—"
  const hasDraftChanges =
    (pendingChanges?.adds?.length || 0) > 0 ||
    (pendingChanges?.deletes?.length || 0) > 0 ||
    Object.keys(pendingChanges?.updates || {}).length > 0
  const hasBulkSelection = bulkSelectedRows.length > 0
  const hasBulkEditsForSelected = bulkSelectedRows.some(
    (row) => !!bulkEdits?.[row.line_number],
  )

  const revisionOptions = useMemo(
    () =>
      revisions.map((rev) => ({
        value: rev.id,
        label: `Ревизия ${rev.rev_number}${
          rev.note ? ` — ${rev.note}` : ""
        } (${formatDateTime(rev.created_at)})`,
      })),
    [revisions],
  )

  const revisionTimelineItems = useMemo(() => {
    const sorted = [...revisions].sort((a, b) => a.rev_number - b.rev_number)
    return sorted.map((rev) => ({
      color: rev.id === activeRevisionId ? "blue" : "gray",
      label: formatDateTime(rev.created_at),
      children: `Ревизия ${rev.rev_number}${rev.note ? ` — ${rev.note}` : ""}`,
    }))
  }, [revisions, activeRevisionId])

  useEffect(() => {
    if (!isLatestRevision && changeDraftActive) {
      setChangeDraftActive(false)
      setPendingChanges({ adds: [], updates: {}, deletes: [] })
      setBulkMode(false)
      setBulkSelectedKeys([])
      setBulkSelectedRows([])
      setBulkEdits({})
      originalItemsRef.current = []
    }
  }, [isLatestRevision, changeDraftActive])

  const requestColumns = [
    {
      title: "Заявка",
      width: 460,
      render: (_, row) => (
        <Space direction="vertical" size={2}>
          <span>{row?.internal_number || "—"}</span>
          <span style={{ color: "#8c8c8c" }}>
            {row?.client_name || "—"}
            {row?.client_reference ? ` · ${row.client_reference}` : ""}
          </span>
        </Space>
      ),
    },
    {
      title: "Статус",
      dataIndex: "status",
      render: (v) =>
        v ? (
          <Tag color={STATUS_COLORS[v] || "default"}>
            {STATUS_OPTIONS.find((opt) => opt.value === v)?.label || v}
          </Tag>
        ) : (
          "—"
        ),
    },
    {
      title: "Создано",
      dataIndex: "created_at",
      width: 140,
      render: formatDateValue,
    },
    {
      title: "Дедлайн",
      dataIndex: "processing_deadline",
      width: 140,
      render: formatDateValue,
    },
  ]

  const filteredRequests = useMemo(() => {
    const needle = String(listSearch || "").trim().toLowerCase()
    if (!needle) return requests

    return requests.filter((row) => {
      const haystack = [
        row?.client_name,
        row?.internal_number,
        row?.client_reference,
        row?.contact_name,
        row?.assigned_user_name,
        row?.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()

      return haystack.includes(needle)
    })
  }, [requests, listSearch])

  const revisionColumns = [
    { title: "Rev", dataIndex: "rev_number", width: 70 },
    { title: "Комментарий", dataIndex: "note" },
    {
      title: "Создано",
      dataIndex: "created_at",
      width: 160,
      render: formatDateTime,
    },
  ]

  const itemsColumns = [
    { title: "№", dataIndex: "line_number", width: 70 },
    {
      title: "Кат. номер",
      dataIndex: "original_cat_number",
      width: 160,
      render: (v, record) => {
        const label = getClientRequestPartNumber(record)
        const tip = record.original_description_ru || record.original_description_en || ""
        return <span title={tip || undefined}>{label}</span>
      },
    },
    {
      title: "Контекст техники",
      width: 220,
      render: (_, record) => {
        const top = [record.manufacturer_name, record.model_name].filter(Boolean).join(" • ")
        const sub = record.model_code || null
        if (!top && !sub) return "—"
        return (
          <Space direction="vertical" size={0}>
            <span>{top || "—"}</span>
            {sub ? <Text type="secondary">{sub}</Text> : null}
          </Space>
        )
      },
    },
    { title: "Описание клиента", dataIndex: "client_description" },
    {
      title: "Кол-во",
      dataIndex: "requested_qty",
      width: 120,
      render: (v, record) => {
        if (!bulkMode || !bulkSelectedKeys.includes(record.id)) return formatQtyWithUomLabel(v, null)
        const edit = bulkEdits[record.line_number] || {}
        return (
          <InputNumber
            min={1}
            value={
              edit.requested_qty !== undefined && edit.requested_qty !== null
                ? edit.requested_qty
                : v
            }
            onChange={(value) =>
              setBulkEdits((prev) => ({
                ...prev,
                [record.line_number]: {
                  ...prev[record.line_number],
                  requested_qty: value,
                },
              }))
            }
            style={{ width: 90 }}
          />
        )
      },
    },
    {
      title: "Ед.",
      dataIndex: "uom",
      width: 70,
      render: (value) => formatUomLabel(value) || "—",
    },
    {
      title: "OEM",
      dataIndex: "oem_only",
      width: 80,
      render: (v, record) => {
        if (!bulkMode || !bulkSelectedKeys.includes(record.id)) {
          return v ? "Да" : "—"
        }
        const edit = bulkEdits[record.line_number] || {}
        const checked =
          edit.oem_only !== undefined && edit.oem_only !== null ? !!edit.oem_only : !!v
        return (
          <Checkbox
            checked={checked}
            onChange={(event) =>
              setBulkEdits((prev) => ({
                ...prev,
                [record.line_number]: {
                  ...prev[record.line_number],
                  oem_only: event.target.checked,
                },
              }))
            }
          />
        )
      },
    },
    {
      title: "Действия",
      dataIndex: "actions",
      width: 90,
      render: (_, record) => (
        <Space>
          <Tooltip
            title={
              isLatestRevision
                ? "Редактировать позицию"
                : "Редактирование доступно только в последней ревизии"
            }
          >
            <Button
              type="text"
              icon={<EditOutlined />}
              disabled={!isLatestRevision}
              onClick={() => {
                if (!changeDraftActive) {
                  message.info("Сначала создайте ревизию для редактирования.")
                  return
                }
                setItemEditRecord(record)
                setItemEditOpen(true)
                ensureOriginalOption(record)
                itemForm.setFieldsValue({
                  catalog_position_id: record.catalog_position_id || record.original_part_id || null,
                  original_part_id: record.original_part_id || null,
                  client_part_number: record.client_part_number || null,
                  client_description: record.client_description || null,
                  client_line_text: record.client_line_text || null,
                  requested_qty: record.requested_qty ?? null,
                  uom: record.uom || "шт",
                  required_date: record.required_date ? dayjs(record.required_date) : null,
                  priority: record.priority || null,
                  oem_only: !!record.oem_only,
                  client_comment: record.client_comment || null,
                  internal_comment: record.internal_comment || null,
                })
              }}
            />
          </Tooltip>
          <Tooltip
            title={
              isLatestRevision
                ? "Удалить позицию"
                : "Удаление доступно только в последней ревизии"
            }
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              disabled={!isLatestRevision}
              onClick={() => handleDeleteItem(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ]

  const stagedColumns = [
    {
      title: "Кат. номер",
      dataIndex: "cat_number",
      width: 160,
      render: (_, row) => (
        <Input
          value={row.cat_number}
          onChange={(e) =>
            updateStagedRow(row.id, {
              cat_number: e.target.value,
              client_part_number:
                row.client_part_number === row.cat_number || !row.client_part_number
                  ? e.target.value
                  : row.client_part_number,
            })
          }
        />
      ),
    },
    {
      title: "№ клиента",
      dataIndex: "client_part_number",
      width: 160,
      render: (_, row) => (
        <Input
          value={row.client_part_number}
          onChange={(e) =>
            updateStagedRow(row.id, { client_part_number: e.target.value })
          }
        />
      ),
    },
    {
      title: "Описание клиента",
      dataIndex: "client_description",
      render: (_, row) => (
        <Input
          value={row.client_description}
          onChange={(e) =>
            updateStagedRow(row.id, { client_description: e.target.value })
          }
        />
      ),
    },
    {
      title: "Кол-во",
      dataIndex: "requested_qty",
      width: 110,
      render: (_, row) => (
        <InputNumber
          min={0}
          value={row.requested_qty}
          onChange={(value) => updateStagedRow(row.id, { requested_qty: value })}
        />
      ),
    },
    {
      title: "Ед.",
      dataIndex: "uom",
      width: 90,
      render: (_, row) => (
        <Select
          value={row.uom}
          options={uomOptions}
          style={{ width: 80 }}
          onChange={(value) => updateStagedRow(row.id, { uom: value })}
        />
      ),
    },
    {
      title: "Срок",
      dataIndex: "required_date",
      width: 150,
      render: (_, row) => (
        <DatePicker
          value={row.required_date ? dayjs(row.required_date) : null}
          format="DD.MM.YYYY"
          onChange={(value) =>
            updateStagedRow(row.id, { required_date: value })
          }
        />
      ),
    },
    {
      title: "OEM",
      dataIndex: "oem_only",
      width: 70,
      render: (_, row) => (
        <Checkbox
          checked={row.oem_only}
          onChange={(e) =>
            updateStagedRow(row.id, { oem_only: e.target.checked })
          }
        />
      ),
    },
    {
      title: "",
      dataIndex: "actions",
      width: 70,
      render: (_, row) => (
        <Button type="text" danger onClick={() => removeStagedRow(row.id)}>
          Удалить
        </Button>
      ),
    },
  ]

  const previewColumns = [
    { title: "Строка", dataIndex: "row_number", width: 80 },
    {
      title: "Статус",
      dataIndex: "status",
      width: 140,
      render: (value) => {
        if (value === "ok") return <Tag color="green">OK</Tag>
        if (value === "error") return <Tag color="red">Ошибка</Tag>
        return <Tag color="orange">Предупр.</Tag>
      },
    },
    { title: "Производитель", dataIndex: "manufacturer_name", width: 140 },
    { title: "Модель", dataIndex: "model_name", width: 140 },
    { title: "Кат. номер", dataIndex: "cat_number", width: 140 },
    { title: "Кол-во", dataIndex: "requested_qty", width: 90 },
    { title: "Описание", dataIndex: "client_description" },
    {
      title: "Причина",
      dataIndex: "issues",
      width: 220,
      render: (issues) =>
        Array.isArray(issues) && issues.length ? issues.join(", ") : "—",
    },
  ]

  return (
    <PageWrapper
      title="Заявки клиентов"
      subtitle="Операционный контур по клиентским заявкам: от первичной регистрации до передачи в закупку и перехода в RFQ."
      helpSummary="Статусы: Черновик → В работе → Релиз в закупку → RFQ создан → RFQ отправлен → Ответы → Выбор → КП → Контракт."
      primaryActions={(
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateRequestOpen(true)}>
          Новая заявка
        </Button>
      )}
    >
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <WorkspaceShell
          mode="stacked"
          listWidth={380}
          listPane={(
            <Card size="small" title={`Список заявок (${filteredRequests.length})`}>
              <RequestsListCard
                cardless
                requestColumns={requestColumns}
                requests={filteredRequests}
                listSearch={listSearch}
                setListSearch={setListSearch}
                pageSize={6}
                maxTableHeight={280}
                toolbarExtra={
                  <Checkbox
                    checked={showArchivedRequests}
                    onChange={(event) => setShowArchivedRequests(event.target.checked)}
                  >
                    Показывать архивные
                  </Checkbox>
                }
                loading={loading}
                openWorkspace={openWorkspace}
                activeRequestId={activeRequest?.id}
              />
            </Card>
          )}
          detailPane={(
            <Card size="small">
              <ClientRequestWorkspaceCard
                cardless
                activeRequest={activeRequest}
                statusColors={STATUS_COLORS}
                statusOptions={STATUS_OPTIONS}
                canRelease={canRelease}
                isReleasedLocked={isReleasedLocked}
                isSentToProcurement={isSentToProcurement}
                rfqSyncStatus={rfqSyncStatus}
                handleReleaseRequest={handleReleaseRequest}
                handleSyncRfq={handleSyncRfq}
                getStatusStepIndex={getStatusStepIndex}
                statusSteps={STATUS_STEPS}
                workspaceTabKey={workspaceTabKey}
                setWorkspaceTabKey={setWorkspaceTabKey}
                isLatestRevision={isLatestRevision}
                activeRevisionLabel={activeRevisionLabel}
                activeRevisionDate={activeRevisionDate}
                changeDraftActive={changeDraftActive}
                revisionOptions={revisionOptions}
                activeRevisionId={activeRevisionId}
                revisions={revisions}
                handleSelectRevision={handleSelectRevision}
                commitChangeDraft={commitChangeDraft}
                hasDraftChanges={hasDraftChanges}
                cancelChangeDraft={cancelChangeDraft}
                createRevisionAndEnterEdit={createRevisionAndEnterEdit}
                openImportModal={() => {
                  setImportModalOpen(true)
                  setStagedRows([])
                  resetImportState()
                }}
                bulkMode={bulkMode}
                setBulkMode={setBulkMode}
                setBulkSelectedKeys={setBulkSelectedKeys}
                setBulkSelectedRows={setBulkSelectedRows}
                setBulkEdits={setBulkEdits}
                quickResults={quickResults}
                formatPartLabel={formatPartLabel}
                quickSearch={quickSearch}
                setQuickSearch={setQuickSearch}
                quickSelectedPart={quickSelectedPart}
                setQuickSelectedPart={setQuickSelectedPart}
                quickLoading={quickLoading}
                handleQuickAdd={handleQuickAdd}
                quickQty={quickQty}
                setQuickQty={setQuickQty}
                quickOemOnly={quickOemOnly}
                setQuickOemOnly={setQuickOemOnly}
                setAddModalOpen={setAddModalOpen}
                hasBulkSelection={hasBulkSelection}
                hasBulkEditsForSelected={hasBulkEditsForSelected}
                applyBulkUpdate={applyBulkUpdate}
                applyBulkDelete={applyBulkDelete}
                itemsColumns={itemsColumns}
                items={items}
                itemsLoading={itemsLoading}
                bulkSelectedKeys={bulkSelectedKeys}
                revisionTimelineItems={revisionTimelineItems}
                revisionColumns={revisionColumns}
                revisionsLoading={revisionsLoading}
                requestEditing={requestEditing}
                setRequestEditing={setRequestEditing}
                requestForm={requestForm}
                handleUpdateRequest={handleUpdateRequest}
                clientOptions={clientOptions}
                sourceOptions={SOURCE_OPTIONS}
                userOptions={userOptions}
                contactOptions={contactOptions}
                contactDropdownOpen={contactDropdownOpen}
                setContactDropdownOpen={setContactDropdownOpen}
                loadContacts={loadContacts}
                equipmentUnitOptions={activeEquipmentUnitOptions}
                selectedEquipmentUnitId={activeEquipmentUnitId}
                setSelectedEquipmentUnitId={handleActiveEquipmentUnitChange}
                selectedEquipmentUnitLabel={formatEquipmentUnitLabel(selectedActiveEquipmentUnit)}
                handleDeleteRequest={handleDeleteRequest}
              />
            </Card>
          )}
        />
      </Space>

      <Drawer
        title="Новая заявка"
        placement="right"
        width={760}
        open={createRequestOpen}
        onClose={() => setCreateRequestOpen(false)}
        destroyOnHidden={false}
      >
        <NewRequestCard
          cardless
          createForm={createForm}
          handleCreate={handleCreate}
          clientSelectOptions={clientSelectOptions}
          clients={clients}
          setCreateClientOpen={setCreateClientOpen}
          loadContacts={loadContacts}
          handleClientChange={handleCreateClientChange}
          userOptions={userOptions}
          sourceOptions={SOURCE_OPTIONS}
          contactsLoading={contactsLoading}
          contactOptions={contactOptions}
          contactDropdownOpen={contactDropdownOpen}
          setContactDropdownOpen={setContactDropdownOpen}
          equipmentUnitOptions={createEquipmentUnitOptions}
          selectedEquipmentUnitId={createEquipmentUnitId}
          setSelectedEquipmentUnitId={setCreateEquipmentUnitId}
        />
      </Drawer>

      <RevisionNoteModal
        open={revisionNoteOpen}
        revisionNote={revisionNote}
        setRevisionNote={setRevisionNote}
        onCancel={() => closeRevisionNote(null)}
        onConfirm={() => {
          const note = String(revisionNote || "").trim()
          if (!note) {
            message.warning("Укажите комментарий для новой ревизии")
            return
          }
          closeRevisionNote(note)
        }}
      />

      <CreateClientModal
        open={createClientOpen}
        onCancel={() => setCreateClientOpen(false)}
        form={createClientForm}
        onFinish={handleCreateClient}
        loading={createClientLoading}
      />

      <EditItemModal
        open={itemEditOpen}
        onCancel={() => {
          setItemEditOpen(false)
          setItemEditRecord(null)
          itemForm.resetFields()
        }}
        form={itemForm}
        onFinish={handleUpdateItem}
        setOriginalSearch={setOriginalSearch}
        originalLoading={originalLoading}
        originalOptions={originalOptions}
        uomOptions={uomOptions}
        equipmentContextLabel={formatEquipmentUnitLabel(selectedActiveEquipmentUnit)}
      />

      <AddPositionsModal
        open={addModalOpen}
        onCancel={() => {
          setAddModalOpen(false)
          setStagedRows([])
          setCatalogSearch("")
          setCatalogResults([])
          setCatalogSelection([])
          setCatalogRowInputs({})
          setModalSearch("")
          setModalResults([])
          setModalSelectedPart(null)
          setModalQty(1)
          setModalOemOnly(false)
          resetImportState()
        }}
        modalResults={modalResults}
        formatPartLabel={formatPartLabel}
        modalSearch={modalSearch}
        setModalSearch={setModalSearch}
        modalSelectedPart={modalSelectedPart}
        setModalSelectedPart={setModalSelectedPart}
        modalLoading={modalLoading}
        handleModalGlobalAdd={handleModalGlobalAdd}
        modalQty={modalQty}
        setModalQty={setModalQty}
        modalOemOnly={modalOemOnly}
        setModalOemOnly={setModalOemOnly}
        manufacturerOptions={manufacturerOptions}
        manufacturerId={manufacturerId}
        setManufacturerId={setManufacturerId}
        modelOptions={modelOptions}
        modelId={modelId}
        setModelId={setModelId}
        catalogSearch={catalogSearch}
        setCatalogSearch={setCatalogSearch}
        frequentParts={frequentParts}
        frequentLoading={frequentLoading}
        handleAddFromCatalog={handleAddFromCatalog}
        handleAddSelectedFromCatalog={handleAddSelectedFromCatalog}
        catalogSelection={catalogSelection}
        catalogAddLoading={catalogAddLoading}
        setCatalogSelection={setCatalogSelection}
        catalogResults={catalogResults}
        catalogLoading={catalogLoading}
        catalogRowInputs={catalogRowInputs}
        setCatalogRowInputs={setCatalogRowInputs}
        equipmentContextLabel={formatEquipmentUnitLabel(selectedActiveEquipmentUnit)}
      />

      <ImportExcelModal
        open={importModalOpen}
        onCancel={() => {
          setImportModalOpen(false)
          setStagedRows([])
          resetImportState()
        }}
        templateRequestUrl={CLIENT_REQUEST_TEMPLATE_REQUEST_URL}
        handleExcelUpload={handleExcelUpload}
        stagedRows={stagedRows}
        setStagedRows={setStagedRows}
        resetImportState={resetImportState}
        stagedColumns={stagedColumns}
        handlePreviewRows={handlePreviewRows}
        createMissing={createMissing}
        setCreateMissing={setCreateMissing}
        handleCommitRows={handleCommitRows}
        importErrors={importErrors}
        importSummary={importSummary}
        importPreview={importPreview}
        importLoading={importLoading}
        previewColumns={previewColumns}
      />
    </PageWrapper>
  )
}

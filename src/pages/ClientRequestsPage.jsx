import React, { useEffect, useMemo, useRef, useState } from "react"
import {
  Card,
  Space,
  Table,
  Form,
  Input,
  InputNumber,
  Select,
  AutoComplete,
  DatePicker,
  Button,
  message,
  Checkbox,
  Tag,
  Typography,
  Modal,
  Upload,
  Alert,
  Switch,
  Tooltip,
  Timeline,
  Collapse,
  Tabs,
  Steps,
} from "antd"
import {
  DeleteOutlined,
  EditOutlined,
  SaveOutlined,
  CloseOutlined,
  UploadOutlined,
  FileExcelOutlined,
} from "@ant-design/icons"
import PageWrapper from "@/components/common/PageWrapper"
import axios from "@/api/axiosInstance"
import dayjs from "dayjs"
import confirmAction from "@/utils/confirmAction"
import { useAuth } from "@/auth/AuthContext"

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
  { value: "cancelled", label: "Отменено" },
]

const SOURCE_OPTIONS = [
  { value: "email", label: "E-mail" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "phone", label: "Телефон" },
  { value: "portal", label: "Портал" },
]

const UOM_OPTIONS = [
  { value: "pcs", label: "шт" },
  { value: "kg", label: "кг" },
  { value: "set", label: "компл." },
]

const CLIENT_REQUEST_TEMPLATE_URL =
  "https://storage.googleapis.com/shared-parts-bucket/templates/client_request_items_template.xlsx"

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

export default function ClientRequestsPage() {
  const { user } = useAuth()
  const [requests, setRequests] = useState([])
  const [clients, setClients] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [activeRequest, setActiveRequest] = useState(null)
  const [requestEditing, setRequestEditing] = useState(false)
  const [revisions, setRevisions] = useState([])
  const [revisionsLoading, setRevisionsLoading] = useState(false)
  const [items, setItems] = useState([])
  const [itemsLoading, setItemsLoading] = useState(false)
  const [activeRevisionId, setActiveRevisionId] = useState(null)
  const [workspaceTabKey, setWorkspaceTabKey] = useState("items")
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

  const { Text } = Typography

  const [createForm] = Form.useForm()
  const [createClientForm] = Form.useForm()
  const [requestForm] = Form.useForm()
  const [revisionForm] = Form.useForm()
  const [itemForm] = Form.useForm()

  const loadRequests = async () => {
    setLoading(true)
    try {
      const { data } = await axios.get("/client-requests")
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
  }, [])

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

  const loadFrequentParts = async (clientId) => {
    if (!clientId) {
      setFrequentParts([])
      return
    }
    setFrequentLoading(true)
    try {
      const { data } = await axios.get("/original-parts/frequent", {
        params: { client_id: clientId, limit: 12 },
      })
      setFrequentParts(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
    } finally {
      setFrequentLoading(false)
    }
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
        const { data } = await axios.get("/original-parts", {
          params: { q: originalSearch },
        })
        setOriginalResults(Array.isArray(data) ? data.slice(0, 50) : [])
      } catch (e) {
        console.error(e)
      } finally {
        setOriginalLoading(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [originalSearch, itemEditOpen])

  useEffect(() => {
    if (!quickSearch || quickSearch.length < 2) {
      setQuickResults([])
      setQuickSelectedPart(null)
      return
    }
    const timer = setTimeout(async () => {
      setQuickLoading(true)
      try {
        const { data } = await axios.get("/original-parts", {
          params: { q: quickSearch },
        })
        setQuickResults(Array.isArray(data) ? data.slice(0, 20) : [])
      } catch (e) {
        console.error(e)
      } finally {
        setQuickLoading(false)
      }
    }, 250)
    return () => clearTimeout(timer)
  }, [quickSearch])

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
        const params = {}
        if (modelId) {
          params.equipment_model_id = modelId
        }
        if (manufacturerId) {
          params.manufacturer_id = manufacturerId
        }
        if (catalogSearch && catalogSearch.length >= 2) {
          params.q = catalogSearch
        }
        const { data } = await axios.get("/original-parts", { params })
        setCatalogResults(Array.isArray(data) ? data : [])
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
        const { data } = await axios.get("/original-parts", {
          params: { q: modalSearch },
        })
        setModalResults(Array.isArray(data) ? data.slice(0, 20) : [])
      } catch (e) {
        console.error(e)
      } finally {
        setModalLoading(false)
      }
    }, 250)
    return () => clearTimeout(timer)
  }, [addModalOpen, modalSearch])

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
      await axios.post("/client-requests", payload)
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
      loadRequests()
    } catch (e) {
      console.error(e)
      message.error(e?.response?.data?.message || "Не удалось создать заявку")
    }
  }

  const handleCreateClient = async (values) => {
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

  const openWorkspace = async (record) => {
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
    setWorkspaceTabKey("items")
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

  const handleAddRevision = async (values) => {
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
    if (!item?.original_part_id) return
    setOriginalResults((prev) => {
      if (prev.some((opt) => opt.id === item.original_part_id)) return prev
      return [
        {
          id: item.original_part_id,
          cat_number: item.original_cat_number,
          description_ru: item.original_description_ru,
          description_en: item.original_description_en,
        },
        ...prev,
      ]
    })
  }

  const createStagedRow = (data = {}) => ({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    manufacturer: data.manufacturer || null,
    model: data.model || null,
    cat_number: data.cat_number || "",
    client_part_number: data.client_part_number || data.cat_number || "",
    client_description: data.client_description || "",
    requested_qty: data.requested_qty ?? null,
    uom: data.uom || "pcs",
    required_date: data.required_date || null,
    priority: data.priority || null,
    oem_only: data.oem_only || false,
    client_comment: data.client_comment || "",
    internal_comment: data.internal_comment || "",
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
      uom: row.uom || "pcs",
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
          uom: row.uom || "pcs",
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
          uom: obj.uom || "pcs",
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
    return {
      original_part_id: part?.id || null,
      original_cat_number: part?.cat_number || null,
      original_description_ru: part?.description_ru || null,
      original_description_en: part?.description_en || null,
      client_part_number:
        overrides.cat_number || part?.cat_number || overrides.client_part_number || null,
      client_description:
        overrides.client_description ||
        part?.description_ru ||
        part?.description_en ||
        null,
      requested_qty: Number.isFinite(qty) && qty > 0 ? qty : 1,
      uom: overrides.uom || part?.uom || "pcs",
      oem_only: overrides.oem_only ? 1 : 0,
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
            original_part_id: item.original_part_id || null,
            client_part_number:
              item.client_part_number || item.original_cat_number || null,
            client_description:
              item.client_description ||
              item.original_description_ru ||
              item.original_description_en ||
              null,
            requested_qty: item.requested_qty ?? null,
            uom: item.uom || "pcs",
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

  const createRevisionForChange = async () => {
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
      original_part_id: payload.original_part_id || null,
      original_cat_number: payload.original_cat_number || null,
      original_description_ru: payload.original_description_ru || null,
      original_description_en: payload.original_description_en || null,
      client_part_number: payload.client_part_number || null,
      client_description: payload.client_description || null,
      requested_qty: payload.requested_qty || null,
      uom: payload.uom || "pcs",
      oem_only: payload.oem_only ? 1 : 0,
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
          original_part_id: target.original_part_id || null,
          client_part_number: target.client_part_number || null,
          client_description: target.client_description || null,
          client_line_text: target.client_line_text || null,
          requested_qty:
            patch.requested_qty !== undefined
              ? patch.requested_qty
              : target.requested_qty,
          uom: target.uom || "pcs",
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
          original_part_id: row.original_part_id || null,
          client_part_number: row.client_part_number || null,
          client_description: row.client_description || null,
          requested_qty: row.requested_qty ?? null,
          uom: row.uom || "pcs",
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
          original_part_id: values.original_part_id || null,
          client_part_number: values.client_part_number || null,
          client_description: values.client_description || null,
          client_line_text: values.client_line_text || null,
          requested_qty: values.requested_qty ?? null,
          uom: values.uom || "pcs",
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
      stageAdd({
        original_part_id: quickSelectedPart?.id || null,
        original_cat_number: quickSelectedPart?.cat_number || null,
        original_description_ru: quickSelectedPart?.description_ru || null,
        original_description_en: quickSelectedPart?.description_en || null,
        client_part_number: quickSelectedPart?.cat_number || quickSearch.trim(),
        client_description:
          quickSelectedPart?.description_ru ||
          quickSelectedPart?.description_en ||
          null,
        requested_qty: quickQty || 1,
        uom: quickSelectedPart?.uom || "pcs",
        oem_only: quickOemOnly ? 1 : 0,
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
    const payload = {
      original_part_id: quickSelectedPart?.id || null,
      client_part_number: quickSelectedPart?.cat_number || quickSearch.trim(),
      client_description:
        quickSelectedPart?.description_ru ||
        quickSelectedPart?.description_en ||
        null,
      requested_qty: quickQty || 1,
      uom: quickSelectedPart?.uom || "pcs",
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
          uom: "pcs",
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
    const number = part?.cat_number || "—"
    const desc = part?.description_ru || part?.description_en || "Без описания"
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
    const { confirmed } = await confirmAction("Удалить заявку?")
    if (!confirmed) return
    try {
      await axios.delete(`/client-requests/${id}`)
      message.success("Заявка удалена")
      await loadRequests()
      if (activeRequest?.id === id) {
        setActiveRequest(null)
      }
    } catch (e) {
      console.error(e)
      message.error("Не удалось удалить заявку")
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
    () => [
      ...clientOptions,
      { value: "__create__", label: "+ Создать клиента" },
    ],
    [clientOptions],
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
  }, [isLatestRevision])

  const requestColumns = [
    {
      title: "Клиент",
      dataIndex: "client_name",
      render: (v) => v || "—",
    },
    {
      title: "Внутр. номер",
      dataIndex: "internal_number",
      render: (v) => v || "—",
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
      title: "Дедлайн",
      dataIndex: "processing_deadline",
      render: formatDateTime,
    },
    { title: "Референс клиента", dataIndex: "client_reference" },
    { title: "Контакт", dataIndex: "contact_name" },
    {
      title: "Создано",
      dataIndex: "created_at",
      width: 170,
      render: formatDateTime,
    },
    {
      title: "Действия",
      dataIndex: "actions",
      width: 90,
      render: (_, record) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={(e) => {
            e.stopPropagation()
            handleDeleteRequest(record.id)
          }}
        />
      ),
    },
  ]

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
        const label = v || record.client_part_number || "—"
        const tip = record.original_description_ru || record.original_description_en || ""
        return <span title={tip || undefined}>{label}</span>
      },
    },
    { title: "Описание клиента", dataIndex: "client_description" },
    {
      title: "Кол-во",
      dataIndex: "requested_qty",
      width: 120,
      render: (v, record) => {
        if (!bulkMode || !bulkSelectedKeys.includes(record.id)) return v
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
    { title: "Ед.", dataIndex: "uom", width: 70 },
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
                  original_part_id: record.original_part_id || null,
                  client_part_number: record.client_part_number || null,
                  client_description: record.client_description || null,
                  client_line_text: record.client_line_text || null,
                  requested_qty: record.requested_qty ?? null,
                  uom: record.uom || "pcs",
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
              client_part_number: row.client_part_number || e.target.value,
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
          options={UOM_OPTIONS}
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
      helpText="Статусы: Черновик → В работе → Релиз в закупку → RFQ создан → RFQ отправлен → Ответы → Выбор → КП → Контракт."
    >
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Card title="Новая заявка" size="small">
          <Form
            form={createForm}
            layout="vertical"
            onFinish={handleCreate}
          >
            <Space wrap align="start">
              <Form.Item
                label="Клиент"
                name="client_id"
                rules={[{ required: true, message: "Выберите клиента" }]}
              >
                <Select
                  style={{ width: 260 }}
                  options={clientSelectOptions}
                  showSearch
                  optionFilterProp="label"
                  placeholder="Выберите клиента"
                  onChange={(val) => {
                    if (val === "__create__") {
                      createForm.setFieldsValue({ client_id: null })
                      setCreateClientOpen(true)
                      return
                    }
                    const client = clients.find((c) => c.id === val)
                    if (!client) return
                    const current = createForm.getFieldsValue([
                      "contact_name",
                      "contact_email",
                      "contact_phone",
                    ])
                    createForm.setFieldsValue({
                      contact_name: current.contact_name || client.contact_person || "",
                      contact_email: current.contact_email || client.email || "",
                      contact_phone: current.contact_phone || client.phone || "",
                    })
                    loadContacts(val)
                  }}
                />
              </Form.Item>
              <Form.Item label="Ответственный" name="assigned_to_user_id">
                <Select
                  style={{ width: 220 }}
                  options={userOptions}
                  showSearch
                  optionFilterProp="label"
                  placeholder="Назначить"
                  allowClear
                />
              </Form.Item>
              <Form.Item
                label="Внутренний номер"
                name="internal_number"
                rules={[{ required: true, message: "Введите внутренний номер" }]}
              >
                <Input style={{ width: 200 }} />
              </Form.Item>
              <Form.Item label="Референс клиента" name="client_reference">
                <Input style={{ width: 220 }} />
              </Form.Item>
              <Form.Item label="Комментарий (внутр.)" name="comment_internal">
                <Input.TextArea style={{ width: 320 }} rows={2} />
              </Form.Item>
            </Space>
            <Collapse
              items={[
                {
                  key: "extra",
                  label: "Дополнительно",
                  children: (
                    <Space wrap align="start">
                      <Form.Item label="Источник" name="source_type">
                        <Select style={{ width: 200 }} options={SOURCE_OPTIONS} />
                      </Form.Item>
                      <Form.Item label="Дата получения" name="received_at">
                        <DatePicker
                          style={{ width: 200 }}
                          format="DD.MM.YYYY"
                          placeholder="ДД.ММ.ГГГГ"
                        />
                      </Form.Item>
                      <Form.Item label="Дедлайн обработки" name="processing_deadline">
                        <DatePicker style={{ width: 200 }} format="DD.MM.YYYY" />
                      </Form.Item>
                      <Form.Item
                        label="Контакт"
                        name="contact_name"
                        tooltip={contactsLoading ? "Загрузка контактов клиента..." : undefined}
                        extra="Новый контакт будет добавлен в карточку клиента."
                      >
                        <AutoComplete
                          style={{ width: 220 }}
                          options={contactOptions}
                          placeholder="Выберите или введите"
                          filterOption={false}
                          open={contactDropdownOpen}
                          onFocus={() => {
                            setContactDropdownOpen(true)
                            const clientId = createForm.getFieldValue("client_id")
                            if (clientId) {
                              loadContacts(clientId, false)
                            }
                          }}
                          onBlur={() => setContactDropdownOpen(false)}
                          onSelect={(_, option) => {
                            setContactDropdownOpen(false)
                            if (option?.email || option?.phone) {
                              createForm.setFieldsValue({
                                contact_name: option.value || "",
                                contact_email: option.email || "",
                                contact_phone: option.phone || "",
                              })
                            }
                          }}
                          onChange={(value) => {
                            const match = contactOptions.find((opt) => opt.value === value)
                            if (!match) {
                              createForm.setFieldsValue({
                                contact_email: "",
                                contact_phone: "",
                              })
                            }
                          }}
                        >
                          <Input />
                        </AutoComplete>
                      </Form.Item>
                      <Form.Item
                        label="E-mail"
                        name="contact_email"
                        tooltip="E-mail для связи по этой заявке"
                      >
                        <Input style={{ width: 200 }} />
                      </Form.Item>
                      <Form.Item label="Телефон" name="contact_phone">
                        <Input style={{ width: 180 }} />
                      </Form.Item>
                      <Form.Item label="Комментарий клиента" name="comment_client">
                        <Input.TextArea style={{ width: 320 }} rows={2} />
                      </Form.Item>
                    </Space>
                  ),
                },
              ]}
            />
            <div style={{ marginTop: 12 }}>
              <Button type="primary" htmlType="submit">
                Создать заявку
              </Button>
            </div>
          </Form>
        </Card>

        <Card title="Список заявок" size="small">
          <Table
            rowKey="id"
            columns={requestColumns}
            dataSource={requests}
            loading={loading}
            pagination={{ pageSize: 20 }}
            onRow={(record) => ({
              onClick: () => openWorkspace(record),
            })}
            rowClassName={(record) =>
              Number(record.id) === Number(activeRequest?.id)
                ? "ant-table-row-selected"
                : ""
            }
          />
        </Card>

        <Card title="Рабочая зона" size="small">
          {activeRequest ? (
            <Space direction="vertical" size={16} style={{ width: "100%" }}>
              <Space wrap align="center" style={{ justifyContent: "space-between" }}>
                <Space wrap align="center">
                  <Text strong>
                    {activeRequest?.internal_number || "Заявка клиента"}
                  </Text>
                  {activeRequest?.status ? (
                    <Tag color={STATUS_COLORS[activeRequest.status] || "default"}>
                      {STATUS_OPTIONS.find((opt) => opt.value === activeRequest.status)?.label ||
                        activeRequest.status}
                    </Tag>
                  ) : null}
                  <Text type="secondary">
                    Клиент: {activeRequest?.client_name || "—"}
                  </Text>
                  <Text type="secondary">
                    {activeRevisionLabel} ({activeRevisionDate})
                  </Text>
                  {isSentToProcurement ? (
                    <Tag color="green">Заявка отправлена в закупку</Tag>
                  ) : null}
                  {rfqSyncStatus === "needs_sync" ? (
                    <Tag color="orange">RFQ требует синхронизации</Tag>
                  ) : null}
                  {isReleasedLocked ? <Tag color="orange">Редактирование временно ограничено</Tag> : null}
                </Space>
                <Space>
                  {canRelease && !isReleasedLocked && !isSentToProcurement ? (
                    <Button type="primary" onClick={handleReleaseRequest}>
                      Отправить заявку
                    </Button>
                  ) : null}
                  {rfqSyncStatus === "needs_sync" ? (
                    <Button onClick={handleSyncRfq}>Синхронизировать RFQ</Button>
                  ) : null}
                </Space>
              </Space>

              <Steps
                size="small"
                current={getStatusStepIndex(activeRequest?.status)}
                items={STATUS_STEPS.map((step) => ({ title: step.title }))}
              />

              <Tabs
                activeKey={workspaceTabKey}
                onChange={setWorkspaceTabKey}
                items={[
                  {
                    key: "items",
                    label: "Позиции",
                    children: (
                      <Space direction="vertical" style={{ width: "100%" }} size="middle">
                        <Space
                          align="center"
                          style={{ width: "100%", justifyContent: "space-between" }}
                        >
                          <Space direction="vertical" size={4}>
                            <Text type="secondary">
                              Быстрое добавление — строка ниже. Импорт из Excel доступен справа.
                            </Text>
                            <Space size="small">
                              <Tag color={isLatestRevision ? "green" : "orange"}>
                                {activeRevisionLabel}
                              </Tag>
                              {changeDraftActive && (
                                <Tag color="blue">Черновик изменений</Tag>
                              )}
                              {!isLatestRevision && (
                                <Text type="warning">
                                  Просмотр архивной ревизии — редактирование отключено.
                                </Text>
                              )}
                            </Space>
                          </Space>
                          <Space>
                            <Select
                              style={{ width: 240 }}
                              placeholder="Ревизия"
                              options={revisionOptions}
                              value={activeRevisionId || undefined}
                              onChange={handleSelectRevision}
                              disabled={!revisions.length || changeDraftActive}
                            />
                            {changeDraftActive ? (
                              <>
                                <Button
                                  type="primary"
                                  onClick={commitChangeDraft}
                                  disabled={!hasDraftChanges}
                                >
                                  Завершить ревизию
                                </Button>
                                <Button onClick={cancelChangeDraft}>
                                  Отменить ревизию
                                </Button>
                              </>
                            ) : (
                              <Button
                                type="primary"
                                onClick={() => createRevisionAndEnterEdit()}
                                disabled={!isLatestRevision}
                              >
                                Создать ревизию
                              </Button>
                            )}
                            <Button
                              onClick={() => {
                                setImportModalOpen(true)
                                setStagedRows([])
                                resetImportState()
                              }}
                              disabled={!isLatestRevision}
                            >
                              Импорт из Excel
                            </Button>
                          </Space>
                        </Space>

                        <Space wrap align="center" style={{ width: "100%" }}>
                          <Switch
                            checked={bulkMode}
                            onChange={(checked) => {
                              setBulkMode(checked)
                              if (!checked) {
                                setBulkSelectedKeys([])
                                setBulkSelectedRows([])
                                setBulkEdits({})
                              }
                            }}
                            disabled={!changeDraftActive}
                          />
                          <Text type="secondary">Массовое редактирование</Text>
                          <AutoComplete
                            style={{ minWidth: 420, maxWidth: "100%" }}
                            options={quickResults.map((part) => ({
                              value:
                                part.cat_number ||
                                part.description_ru ||
                                part.description_en ||
                                "",
                              label: formatPartLabel(part),
                              part,
                            }))}
                            value={quickSearch}
                            onChange={(value) => {
                              setQuickSearch(value)
                              if (quickSelectedPart?.cat_number !== value) {
                                setQuickSelectedPart(null)
                              }
                            }}
                            onSelect={(value, option) => {
                              setQuickSearch(value)
                              setQuickSelectedPart(option.part || null)
                            }}
                            placeholder="Быстрое добавление: введите кат. номер"
                            notFoundContent={quickLoading ? "Поиск..." : "Нет совпадений"}
                          >
                            <Input
                              style={{ width: "100%" }}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.preventDefault()
                                  handleQuickAdd()
                                }
                              }}
                            />
                          </AutoComplete>
                          <InputNumber
                            min={1}
                            value={quickQty}
                            onChange={(value) => setQuickQty(value || 1)}
                            style={{ width: 100 }}
                            placeholder="Кол-во"
                          />
                          <Checkbox
                            checked={quickOemOnly}
                            onChange={(event) => setQuickOemOnly(event.target.checked)}
                          >
                            OEM
                          </Checkbox>
                          <Button
                            type="primary"
                            onClick={handleQuickAdd}
                            disabled={!quickSearch.trim()}
                          >
                            Добавить
                          </Button>
                          <Button type="link" onClick={() => setAddModalOpen(true)}>
                            Расширенный поиск
                          </Button>
                        </Space>

                        {bulkMode && (
                          <Space wrap align="center" style={{ width: "100%" }}>
                            <Text type="secondary">
                              Массовые действия применяются только к выбранным строкам.
                            </Text>
                            {hasBulkSelection && hasBulkEditsForSelected ? (
                              <Button onClick={applyBulkUpdate}>
                                Применить к выбранным
                              </Button>
                            ) : null}
                            {hasBulkSelection ? (
                              <Button danger onClick={applyBulkDelete}>
                                Удалить выбранные
                              </Button>
                            ) : null}
                          </Space>
                        )}

                        <Table
                          rowKey="id"
                          columns={itemsColumns}
                          dataSource={items}
                          loading={itemsLoading}
                          pagination={false}
                          rowSelection={
                            bulkMode
                              ? {
                                  selectedRowKeys: bulkSelectedKeys,
                                  onChange: (keys, rows) => {
                                    setBulkSelectedKeys(keys)
                                    setBulkSelectedRows(rows)
                                    setBulkEdits((prev) => {
                                      const next = { ...prev }
                                      const allowed = new Set(
                                        rows
                                          .map((r) => r.line_number)
                                          .filter((v) => v !== null && v !== undefined),
                                      )
                                      rows.forEach((row) => {
                                        if (
                                          row.line_number === null ||
                                          row.line_number === undefined
                                        ) {
                                          return
                                        }
                                        if (!next[row.line_number]) {
                                          next[row.line_number] = {
                                            requested_qty: row.requested_qty,
                                            oem_only: !!row.oem_only,
                                          }
                                        }
                                      })
                                      Object.keys(next).forEach((key) => {
                                        if (!allowed.has(Number(key))) delete next[key]
                                      })
                                      return next
                                    })
                                  },
                                }
                              : undefined
                          }
                        />

                        <Collapse
                          items={[
                            {
                              key: "revision-history",
                              label: `История ревизий (${revisions.length})`,
                              children: (
                                <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                                  {revisionTimelineItems.length ? (
                                    <Timeline items={revisionTimelineItems} />
                                  ) : (
                                    <Text type="secondary">Ревизий пока нет.</Text>
                                  )}
                                  <Table
                                    rowKey="id"
                                    columns={revisionColumns}
                                    dataSource={revisions}
                                    loading={revisionsLoading}
                                    pagination={false}
                                    onRow={(record) => ({
                                      onClick: async () => {
                                        await handleSelectRevision(record.id)
                                      },
                                    })}
                                    rowClassName={(record) =>
                                      record.id === activeRevisionId
                                        ? "ant-table-row-selected"
                                        : ""
                                    }
                                  />
                                </Space>
                              ),
                            },
                          ]}
                        />
                      </Space>
                    ),
                  },
                  {
                    key: "details",
                    label: "Данные заявки",
                    children: (
                      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                        <Space style={{ width: "100%", justifyContent: "flex-end" }}>
                          {requestEditing ? (
                            <>
                              <Button
                                type="primary"
                                icon={<SaveOutlined />}
                                onClick={() => requestForm.submit()}
                              >
                                Сохранить
                              </Button>
                              <Button
                                icon={<CloseOutlined />}
                                onClick={() => {
                                  setRequestEditing(false)
                                  requestForm.setFieldsValue({
                                    client_id: activeRequest?.client_id,
                                    source_type: activeRequest?.source_type || null,
                                    assigned_to_user_id: activeRequest?.assigned_to_user_id || null,
                                    internal_number: activeRequest?.internal_number || null,
                                    client_reference: activeRequest?.client_reference || null,
                                    contact_name: activeRequest?.contact_name || null,
                                    contact_email: activeRequest?.contact_email || null,
                                    contact_phone: activeRequest?.contact_phone || null,
                                    comment_internal: activeRequest?.comment_internal || null,
                                    comment_client: activeRequest?.comment_client || null,
                                    received_at: activeRequest?.received_at
                                      ? dayjs(activeRequest.received_at)
                                      : null,
                                    processing_deadline: activeRequest?.processing_deadline
                                      ? dayjs(activeRequest.processing_deadline)
                                      : null,
                                  })
                                }}
                              >
                                Отмена
                              </Button>
                            </>
                          ) : (
                            <Button
                              icon={<EditOutlined />}
                              disabled={isReleasedLocked}
                              onClick={() => setRequestEditing(true)}
                            >
                              Редактировать
                            </Button>
                          )}
                        </Space>
                        <Form
                          form={requestForm}
                          layout="vertical"
                          onFinish={handleUpdateRequest}
                        >
                          <Space wrap align="start">
                            <Form.Item label="Клиент" name="client_id">
                              <Select
                                style={{ width: 260 }}
                                options={clientOptions}
                                showSearch
                                optionFilterProp="label"
                                disabled
                              />
                            </Form.Item>
                            <Form.Item label="Внутренний номер" name="internal_number">
                              <Input style={{ width: 180 }} disabled={!requestEditing} />
                            </Form.Item>
                            <Form.Item label="Источник" name="source_type">
                              <Select
                                style={{ width: 160 }}
                                options={SOURCE_OPTIONS}
                                disabled={!requestEditing}
                              />
                            </Form.Item>
                            <Form.Item label="Ответственный" name="assigned_to_user_id">
                              <Select
                                style={{ width: 200 }}
                                options={userOptions}
                                showSearch
                                optionFilterProp="label"
                                allowClear
                                disabled={!requestEditing}
                              />
                            </Form.Item>
                            <Form.Item label="Референс клиента" name="client_reference">
                              <Input style={{ width: 220 }} disabled={!requestEditing} />
                            </Form.Item>
                            <Form.Item label="Дата получения" name="received_at">
                              <DatePicker
                                style={{ width: 200 }}
                                format="DD.MM.YYYY"
                                disabled={!requestEditing}
                              />
                            </Form.Item>
                            <Form.Item label="Дедлайн обработки" name="processing_deadline">
                              <DatePicker
                                style={{ width: 200 }}
                                format="DD.MM.YYYY"
                                disabled={!requestEditing}
                              />
                            </Form.Item>
                            <Form.Item label="Контакт" name="contact_name">
                              {requestEditing ? (
                                <AutoComplete
                                  style={{ width: 200 }}
                                  options={contactOptions}
                                  placeholder="Выберите или введите"
                                  filterOption={false}
                                  open={contactDropdownOpen}
                                  onFocus={() => {
                                    setContactDropdownOpen(true)
                                    if (activeRequest?.client_id) {
                                      loadContacts(activeRequest.client_id, false)
                                    }
                                  }}
                                  onBlur={() => setContactDropdownOpen(false)}
                                  onSelect={(_, option) => {
                                    setContactDropdownOpen(false)
                                    if (option?.email || option?.phone) {
                                      requestForm.setFieldsValue({
                                        contact_name: option.value || "",
                                        contact_email: option.email || "",
                                        contact_phone: option.phone || "",
                                      })
                                    }
                                  }}
                                  onChange={(value) => {
                                    const match = contactOptions.find((opt) => opt.value === value)
                                    if (!match) {
                                      requestForm.setFieldsValue({
                                        contact_email: "",
                                        contact_phone: "",
                                      })
                                    }
                                  }}
                                >
                                  <Input />
                                </AutoComplete>
                              ) : (
                                <Input style={{ width: 200 }} disabled />
                              )}
                            </Form.Item>
                            <Form.Item label="E-mail" name="contact_email">
                              <Input style={{ width: 200 }} disabled={!requestEditing} />
                            </Form.Item>
                            <Form.Item label="Телефон" name="contact_phone">
                              <Input style={{ width: 180 }} disabled={!requestEditing} />
                            </Form.Item>
                          </Space>
                          <Space wrap align="start">
                            <Form.Item label="Комментарий (внутр.)" name="comment_internal">
                              <Input.TextArea
                                style={{ width: 320 }}
                                rows={2}
                                disabled={!requestEditing}
                              />
                            </Form.Item>
                            <Form.Item label="Комментарий клиента" name="comment_client">
                              <Input.TextArea
                                style={{ width: 320 }}
                                rows={2}
                                disabled={!requestEditing}
                              />
                            </Form.Item>
                          </Space>
                        </Form>
                      </Space>
                    ),
                  },
                  {
                    key: "margin",
                    label: "Маржа/Экономика",
                    children: (
                      <Alert
                        type="info"
                        message="Раздел в разработке"
                        description="Тут будет блок расчета маржи и экономики после работы закупщика."
                        showIcon
                      />
                    ),
                  },
                  {
                    key: "quote",
                    label: "КП",
                    children: (
                      <Alert
                        type="info"
                        message="Раздел в разработке"
                        description="Тут появится подготовка коммерческого предложения."
                        showIcon
                      />
                    ),
                  },
                  {
                    key: "contract",
                    label: "Контракт",
                    children: (
                      <Alert
                        type="info"
                        message="Раздел в разработке"
                        description="Тут будет хранение и согласование контракта."
                        showIcon
                      />
                    ),
                  },
                ]}
              />
            </Space>
          ) : (
            <Text type="secondary">Выберите заявку в списке, чтобы открыть workspace.</Text>
          )}
        </Card>
      </Space>

      <Modal
        title="Комментарий к ревизии"
        open={revisionNoteOpen}
        onCancel={() => closeRevisionNote(null)}
        onOk={() => {
          const note = String(revisionNote || "").trim()
          if (!note) {
            message.warning("Укажите комментарий для новой ревизии")
            return
          }
          closeRevisionNote(note)
        }}
        okText="Создать ревизию"
        cancelText="Отмена"
        destroyOnClose
      >
        <Input.TextArea
          value={revisionNote}
          onChange={(event) => setRevisionNote(event.target.value)}
          rows={4}
          placeholder="Причина изменений (обязательно)"
        />
      </Modal>

      <Modal
        title="Создать клиента"
        open={createClientOpen}
        onCancel={() => setCreateClientOpen(false)}
        onOk={() => createClientForm.submit()}
        confirmLoading={createClientLoading}
        okText="Создать"
        cancelText="Отмена"
        destroyOnClose
      >
        <Form form={createClientForm} layout="vertical" onFinish={handleCreateClient}>
          <Form.Item
            label="Название компании"
            name="company_name"
            rules={[{ required: true, message: "Введите название компании" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item label="Контактное лицо" name="contact_person">
            <Input />
          </Form.Item>
          <Form.Item label="Телефон" name="phone">
            <Input />
          </Form.Item>
          <Form.Item label="E-mail" name="email">
            <Input />
          </Form.Item>
          <Form.Item label="Комментарий" name="notes">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Редактировать позицию"
        open={itemEditOpen}
        onCancel={() => {
          setItemEditOpen(false)
          setItemEditRecord(null)
          itemForm.resetFields()
        }}
        onOk={() => itemForm.submit()}
        okText="Сохранить"
        cancelText="Отмена"
        width={760}
      >
        <Form form={itemForm} onFinish={handleUpdateItem} layout="vertical">
          <Space wrap align="start">
            <Form.Item
              label="Оригинал"
              name="original_part_id"
              tooltip="Поиск по каталожному номеру или названию"
            >
              <Select
                style={{ width: 220 }}
                showSearch
                allowClear
                filterOption={false}
                onSearch={setOriginalSearch}
                notFoundContent={originalLoading ? "Поиск..." : "Нет совпадений"}
                options={originalOptions.map((opt) => ({
                  value: opt.value,
                  label: opt.label,
                  title: opt.description || undefined,
                }))}
                optionLabelProp="label"
              />
            </Form.Item>
            <Form.Item label="№ клиента" name="client_part_number">
              <Input style={{ width: 200 }} />
            </Form.Item>
            <Form.Item label="Описание клиента" name="client_description">
              <Input style={{ width: 220 }} />
            </Form.Item>
            <Form.Item label="Кол-во" name="requested_qty">
              <InputNumber style={{ width: 120 }} min={0} />
            </Form.Item>
            <Form.Item label="Ед." name="uom">
              <Select style={{ width: 100 }} options={UOM_OPTIONS} />
            </Form.Item>
            <Form.Item label="Приоритет" name="priority">
              <Input style={{ width: 140 }} />
            </Form.Item>
            <Form.Item label="Срок" name="required_date">
              <DatePicker style={{ width: 160 }} format="DD.MM.YYYY" />
            </Form.Item>
            <Form.Item name="oem_only" valuePropName="checked">
              <Checkbox>OEM только</Checkbox>
            </Form.Item>
          </Space>
          <Space wrap align="start">
            <Form.Item label="Комментарий клиента" name="client_comment">
              <Input.TextArea style={{ width: 320 }} rows={2} />
            </Form.Item>
            <Form.Item label="Комментарий внутр." name="internal_comment">
              <Input.TextArea style={{ width: 320 }} rows={2} />
            </Form.Item>
          </Space>
        </Form>
      </Modal>

      <Modal
        title="Добавить позиции"
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
        footer={null}
        width={1060}
      >
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            <Text type="secondary">
              Можно искать по каталожному номеру сразу или уточнять через производителя и модель.
            </Text>
            <Space wrap align="center">
              <AutoComplete
                style={{ width: 360 }}
                options={modalResults.map((part) => ({
                  value:
                    part.cat_number ||
                    part.description_ru ||
                    part.description_en ||
                    "",
                  label: formatPartLabel(part),
                  part,
                }))}
                value={modalSearch}
                onChange={(value) => {
                  setModalSearch(value)
                  if (modalSelectedPart?.cat_number !== value) {
                    setModalSelectedPart(null)
                  }
                }}
                onSelect={(value, option) => {
                  setModalSearch(value)
                  setModalSelectedPart(option.part || null)
                }}
                placeholder="Глобальный поиск по оригинальным деталям"
                notFoundContent={modalLoading ? "Поиск..." : "Нет совпадений"}
              >
                <Input
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault()
                      handleModalGlobalAdd()
                    }
                  }}
                />
              </AutoComplete>
              <InputNumber
                min={1}
                value={modalQty}
                onChange={(value) => setModalQty(value || 1)}
                style={{ width: 110 }}
                placeholder="Кол-во"
              />
              <Checkbox
                checked={modalOemOnly}
                onChange={(event) => setModalOemOnly(event.target.checked)}
              >
                OEM
              </Checkbox>
              <Button type="primary" onClick={handleModalGlobalAdd}>
                Добавить
              </Button>
            </Space>
            <Space wrap>
              <Select
                style={{ width: 220 }}
                options={manufacturerOptions}
                placeholder="Производитель"
                allowClear
                showSearch
                optionFilterProp="label"
                value={manufacturerId || undefined}
                onChange={(value) => setManufacturerId(value || null)}
              />
              <Select
                style={{ width: 240 }}
                options={modelOptions}
                placeholder="Модель"
                allowClear
                showSearch
                optionFilterProp="label"
                disabled={!manufacturerId}
                value={modelId || undefined}
                onChange={(value) => setModelId(value || null)}
              />
              <Input.Search
                style={{ minWidth: 260 }}
                placeholder="Каталожный номер или описание"
                allowClear
                value={catalogSearch}
                onSearch={(value) => setCatalogSearch(value)}
                onChange={(e) => setCatalogSearch(e.target.value)}
              />
            </Space>
            {catalogSearch && catalogSearch.length < 2 ? (
              <Text type="secondary">
                Введите минимум 2 символа для фильтра, сейчас показан полный список.
              </Text>
            ) : null}
            <Card size="small" title="Часто используемые">
              {frequentParts.length ? (
                <Space wrap>
                  {frequentParts.map((part) => (
                    <Button
                      key={part.id}
                      size="small"
                      onClick={() => handleAddFromCatalog(part)}
                    >
                      {part.cat_number || "Без номера"}{" "}
                      {part.model_name ? `• ${part.model_name}` : ""}
                    </Button>
                  ))}
                </Space>
              ) : (
                <Text type="secondary">
                  {frequentLoading
                    ? "Загрузка..."
                    : "Пока нет часто используемых деталей."}
                </Text>
              )}
            </Card>
            <Space
              align="center"
              style={{ width: "100%", justifyContent: "space-between" }}
            >
              <Text type="secondary">
                {catalogSearch && catalogSearch.length >= 2
                  ? "Результаты поиска"
                  : "Все детали выбранной модели"}
              </Text>
              <Space>
                <Button
                  onClick={handleAddSelectedFromCatalog}
                  disabled={!catalogSelection.length || catalogAddLoading}
                  loading={catalogAddLoading}
                >
                  Добавить выбранные ({catalogSelection.length})
                </Button>
                <Button
                  onClick={() => setCatalogSelection([])}
                  disabled={!catalogSelection.length}
                >
                  Снять выбор
                </Button>
              </Space>
            </Space>
            <Table
              rowKey="id"
              size="small"
              dataSource={catalogResults}
              loading={catalogLoading}
              rowSelection={{
                selectedRowKeys: catalogSelection,
                onChange: setCatalogSelection,
              }}
              pagination={{ pageSize: 8, showSizeChanger: true }}
              locale={{
                emptyText: !modelId
                  ? "Сначала выберите производителя и модель"
                  : "Нет данных по этой модели",
              }}
              columns={[
                {
                  title: "Кат. номер",
                  dataIndex: "cat_number",
                  width: 160,
                },
                {
                  title: "Описание",
                  render: (_, row) =>
                    row.description_ru || row.description_en || "—",
                },
                {
                  title: "Кол-во",
                  width: 110,
                  render: (_, row) => (
                    <InputNumber
                      min={1}
                      value={catalogRowInputs[row.id]?.qty || 1}
                      onChange={(value) =>
                        setCatalogRowInputs((prev) => ({
                          ...prev,
                          [row.id]: {
                            ...(prev[row.id] || {}),
                            qty: value || 1,
                          },
                        }))
                      }
                      style={{ width: 90 }}
                    />
                  ),
                },
                {
                  title: "OEM",
                  width: 90,
                  render: (_, row) => (
                    <Checkbox
                      checked={!!catalogRowInputs[row.id]?.oem_only}
                      onChange={(event) =>
                        setCatalogRowInputs((prev) => ({
                          ...prev,
                          [row.id]: {
                            ...(prev[row.id] || {}),
                            oem_only: event.target.checked,
                          },
                        }))
                      }
                    >
                      OEM
                    </Checkbox>
                  ),
                },
                {
                  title: "",
                  width: 110,
                  render: (_, row) => (
                    <Button
                      size="small"
                      onClick={() => handleAddFromCatalog(row)}
                      loading={catalogAddLoading}
                    >
                      Добавить
                    </Button>
                  ),
                },
              ]}
            />
          </Space>

        </Space>
      </Modal>

      <Modal
        title="Импорт из Excel"
        open={importModalOpen}
        onCancel={() => {
          setImportModalOpen(false)
          setStagedRows([])
          resetImportState()
        }}
        footer={null}
        width={960}
      >
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <Space wrap align="center">
            <Button
              icon={<FileExcelOutlined />}
              href={CLIENT_REQUEST_TEMPLATE_URL}
              target="_blank"
              rel="noopener noreferrer"
              download
            >
              Скачать шаблон
            </Button>
            <Upload
              accept=".xlsx"
              showUploadList={false}
              beforeUpload={(file) => {
                handleExcelUpload(file)
                return false
              }}
            >
              <Button icon={<UploadOutlined />}>Загрузить Excel</Button>
            </Upload>
            <Text type="secondary">
              Файл будет проверен перед добавлением в заявку.
            </Text>
          </Space>

          <Card
            size="small"
            title={`Позиции к импорту (${stagedRows.length})`}
            extra={
              <Space>
                <Button
                  danger
                  onClick={() => {
                    setStagedRows([])
                    resetImportState()
                  }}
                >
                  Очистить
                </Button>
              </Space>
            }
          >
            <Table
              rowKey="id"
              size="small"
              dataSource={stagedRows}
              pagination={false}
              columns={stagedColumns}
              locale={{ emptyText: "Загрузите Excel-файл" }}
            />
            <Space wrap align="center" style={{ marginTop: 12 }}>
              <Button
                onClick={() => handlePreviewRows(stagedRows)}
                disabled={!stagedRows.length}
              >
                Проверить
              </Button>
              <Switch
                checked={createMissing}
                onChange={setCreateMissing}
                checkedChildren="Создавать недостающие"
                unCheckedChildren="Без создания"
              />
              <Text type="secondary">
                Недостающие производители/модели/детали можно добавить автоматически.
              </Text>
            </Space>
            <Space style={{ marginTop: 12 }}>
              <Button
                type="primary"
                onClick={() => handleCommitRows(stagedRows)}
                disabled={
                  !stagedRows.length ||
                  importErrors.length > 0 ||
                  (importPreview.length &&
                    importPreview.some((row) => row.status === "error")) ||
                  (!createMissing &&
                    importPreview.some((row) => row.status === "warning"))
                }
                loading={importLoading}
              >
                Добавить в заявку
              </Button>
            </Space>
          </Card>

          {importErrors.length > 0 && (
            <Alert
              type="error"
              message={
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {importErrors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              }
            />
          )}

          {importSummary && (
            <Alert
              type="info"
              message={`Всего строк: ${importSummary.total}. Ок: ${importSummary.ok}. Предупреждения: ${importSummary.warning}. Ошибки: ${importSummary.error}.`}
            />
          )}

          {importPreview.length > 0 && (
            <Table
              rowKey="row_number"
              size="small"
              dataSource={importPreview}
              pagination={false}
              locale={{ emptyText: "Нет данных для проверки" }}
              columns={previewColumns}
            />
          )}
        </Space>
      </Modal>
    </PageWrapper>
  )
}

import React, { useEffect, useMemo, useState } from "react"
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
  Drawer,
  Tabs,
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
import readXlsxFile from "read-excel-file"

const STATUS_OPTIONS = [
  { value: "draft", label: "Черновик" },
  { value: "in_progress", label: "В работе" },
  { value: "rfq_sent", label: "RFQ отправлен" },
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
  rfq_sent: "gold",
  contracted: "green",
  cancelled: "red",
}

export default function ClientRequestsPage() {
  const [requests, setRequests] = useState([])
  const [clients, setClients] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [activeRequest, setActiveRequest] = useState(null)
  const [requestEditing, setRequestEditing] = useState(false)
  const [revisions, setRevisions] = useState([])
  const [revisionsLoading, setRevisionsLoading] = useState(false)
  const [items, setItems] = useState([])
  const [itemsLoading, setItemsLoading] = useState(false)
  const [activeRevisionId, setActiveRevisionId] = useState(null)
  const [activeTab, setActiveTab] = useState("items")
  const [itemEditOpen, setItemEditOpen] = useState(false)
  const [itemEditRecord, setItemEditRecord] = useState(null)
  const [originalResults, setOriginalResults] = useState([])
  const [originalSearch, setOriginalSearch] = useState("")
  const [originalLoading, setOriginalLoading] = useState(false)
  const [catalogSearch, setCatalogSearch] = useState("")
  const [catalogResults, setCatalogResults] = useState([])
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [catalogSelection, setCatalogSelection] = useState([])
  const [manufacturers, setManufacturers] = useState([])
  const [manufacturerId, setManufacturerId] = useState(null)
  const [models, setModels] = useState([])
  const [modelId, setModelId] = useState(null)
  const [frequentParts, setFrequentParts] = useState([])
  const [frequentLoading, setFrequentLoading] = useState(false)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [stagedRows, setStagedRows] = useState([])
  const [importLoading, setImportLoading] = useState(false)
  const [importPreview, setImportPreview] = useState([])
  const [importSummary, setImportSummary] = useState(null)
  const [importErrors, setImportErrors] = useState([])
  const [createMissing, setCreateMissing] = useState(false)
  const [clientContacts, setClientContacts] = useState([])
  const [contactsLoading, setContactsLoading] = useState(false)
  const [contactDropdownOpen, setContactDropdownOpen] = useState(false)

  const { Text } = Typography

  const [createForm] = Form.useForm()
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
    if (!addModalOpen || !modelId) {
      setCatalogResults([])
      return
    }
    if (catalogSearch && catalogSearch.length < 2) {
      return
    }
    const timer = setTimeout(async () => {
      setCatalogLoading(true)
      try {
        const params = {
          equipment_model_id: modelId,
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

  const formatDateTimeValue = (value) => {
    if (!value) return null
    const parsed = dayjs(value)
    return parsed.isValid() ? parsed.format("YYYY-MM-DD HH:mm:ss") : null
  }

  const formatDateValue = (value) => {
    if (!value) return null
    const parsed = dayjs(value)
    return parsed.isValid() ? parsed.format("YYYY-MM-DD") : null
  }

  const handleCreate = async (values) => {
    try {
      const payload = {
        client_id: values.client_id,
        status: values.status || "draft",
        source_type: values.source_type || null,
        assigned_to_user_id: values.assigned_to_user_id || null,
        client_reference: values.client_reference || null,
        contact_name: values.contact_name || null,
        contact_email: values.contact_email || null,
        contact_phone: values.contact_phone || null,
        comment_internal: values.comment_internal || null,
        comment_client: values.comment_client || null,
        created_at: formatDateTimeValue(values.created_at),
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
      message.error("Не удалось создать заявку")
    }
  }

  const openDrawer = async (record) => {
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
    setActiveTab("items")
    requestForm.setFieldsValue({
      client_id: record.client_id,
      status: record.status || "draft",
      source_type: record.source_type || null,
      assigned_to_user_id: record.assigned_to_user_id || null,
      client_reference: record.client_reference || null,
      contact_name: record.contact_name || null,
      contact_email: record.contact_email || null,
      contact_phone: record.contact_phone || null,
      comment_internal: record.comment_internal || null,
      comment_client: record.comment_client || null,
      created_at: record.created_at ? dayjs(record.created_at) : null,
    })
    await loadContacts(record.client_id, false)
    setDrawerOpen(true)
    await loadRevisions(record.id)
  }

  const loadRevisions = async (requestId) => {
    setRevisionsLoading(true)
    try {
      const { data } = await axios.get(`/client-requests/${requestId}/revisions`)
      const list = Array.isArray(data) ? data : []
      setRevisions(list)
      const latest = list[0]?.id || null
      setActiveRevisionId(latest)
      if (latest) {
        await loadItems(latest)
      } else {
        setItems([])
      }
    } catch (e) {
      console.error(e)
      message.error("Не удалось загрузить ревизии")
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

  const handleAddRevision = async (values) => {
    if (!activeRequest?.id) return
    try {
      await axios.post(`/client-requests/${activeRequest.id}/revisions`, {
        note: values.note || null,
      })
      revisionForm.resetFields()
      await loadRevisions(activeRequest.id)
      message.success("Ревизия создана")
    } catch (e) {
      console.error(e)
      message.error("Не удалось создать ревизию")
    }
  }

  const handleSelectRevision = async (revisionId) => {
    if (!revisionId) return
    setActiveRevisionId(revisionId)
    await loadItems(revisionId)
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
    const revisionId = await ensureRevisionId()
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

  const handleAddFromCatalog = (part) => {
    const manufacturerName =
      part?.manufacturer_name ||
      manufacturers.find((m) => m.id === manufacturerId)?.name ||
      null
    const modelName =
      part?.model_name ||
      models.find((m) => m.id === modelId)?.model_name ||
      null

    setStagedRows((prev) => {
      const idx = prev.findIndex(
        (row) => row.cat_number === part.cat_number && row.model === modelName,
      )
      if (idx >= 0) {
        const updated = [...prev]
        updated[idx] = {
          ...updated[idx],
          requested_qty: (updated[idx].requested_qty || 0) + 1,
        }
        return updated
      }
      return [
        ...prev,
        createStagedRow({
          manufacturer: manufacturerName,
          model: modelName,
          cat_number: part.cat_number || "",
          client_description: part.description_ru || part.description_en || "",
          requested_qty: 1,
          uom: part.uom || "pcs",
        }),
      ]
    })
    setImportPreview([])
    setImportSummary(null)
    setImportErrors([])
  }

  const handleAddSelectedFromCatalog = () => {
    if (!catalogSelection.length) return
    const selected = catalogResults.filter((part) =>
      catalogSelection.includes(part.id),
    )
    setStagedRows((prev) => {
      const updated = [...prev]
      const indexMap = new Map(
        updated.map((row, idx) => [`${row.cat_number}|${row.model || ""}`, idx]),
      )
      selected.forEach((part) => {
        const manufacturerName =
          part?.manufacturer_name ||
          manufacturers.find((m) => m.id === manufacturerId)?.name ||
          null
        const modelName =
          part?.model_name ||
          models.find((m) => m.id === modelId)?.model_name ||
          null
        const key = `${part.cat_number}|${modelName || ""}`
        if (indexMap.has(key)) {
          const idx = indexMap.get(key)
          updated[idx] = {
            ...updated[idx],
            requested_qty: (updated[idx].requested_qty || 0) + 1,
          }
        } else {
          updated.push(
            createStagedRow({
              manufacturer: manufacturerName,
              model: modelName,
              cat_number: part.cat_number || "",
              client_part_number: part.cat_number || "",
              client_description: part.description_ru || part.description_en || "",
              requested_qty: 1,
              uom: part.uom || "pcs",
            }),
          )
          indexMap.set(key, updated.length - 1)
        }
      })
      return updated
    })
    setCatalogSelection([])
    setImportPreview([])
    setImportSummary(null)
    setImportErrors([])
  }

  const ensureRevisionId = async () => {
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

  const handleUpdateItem = async (values) => {
    if (!itemEditRecord) return
    try {
      const payload = {
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
      }
      await axios.put(
        `/client-requests/revisions/${itemEditRecord.client_request_revision_id}/items/${itemEditRecord.id}`,
        payload,
      )
      setItemEditOpen(false)
      setItemEditRecord(null)
      itemForm.resetFields()
      await loadItems(itemEditRecord.client_request_revision_id)
      message.success("Позиция обновлена")
    } catch (e) {
      console.error(e)
      message.error("Не удалось обновить позицию")
    }
  }

  const handleUpdateRequest = async (values) => {
    if (!activeRequest?.id) return
    try {
      const payload = {
        status: values.status || null,
        source_type: values.source_type || null,
        assigned_to_user_id: values.assigned_to_user_id || null,
        client_reference: values.client_reference || null,
        contact_name: values.contact_name || null,
        contact_email: values.contact_email || null,
        contact_phone: values.contact_phone || null,
        comment_internal: values.comment_internal || null,
        comment_client: values.comment_client || null,
        created_at: formatDateTimeValue(values.created_at),
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
      message.error("Не удалось обновить заявку")
    }
  }

  const handleDeleteItem = async (record) => {
    if (!isLatestRevision) {
      message.warning("Удаление доступно только в последней ревизии")
      return
    }
    const { confirmed } = await confirmAction("Удалить позицию?")
    if (!confirmed) return
    try {
      await axios.delete(
        `/client-requests/revisions/${record.client_request_revision_id}/items/${record.id}`,
      )
      message.success("Позиция удалена")
      await loadItems(record.client_request_revision_id)
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
        setDrawerOpen(false)
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
    return parsed.isValid() ? parsed.format("DD/MM/YYYY") : value
  }

  const latestRevisionId = revisions[0]?.id || null
  const activeRevision = revisions.find((rev) => rev.id === activeRevisionId) || null
  const isLatestRevision = !latestRevisionId || activeRevisionId === latestRevisionId
  const activeRevisionLabel = activeRevision?.rev_number
    ? `Ревизия ${activeRevision.rev_number}`
    : "Ревизий нет"
  const activeRevisionDate = activeRevision?.created_at
    ? formatDateTime(activeRevision.created_at)
    : "—"

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

  const requestColumns = [
    {
      title: "Клиент",
      dataIndex: "client_name",
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
    { title: "Источник", dataIndex: "source_type", width: 140 },
    { title: "Референс", dataIndex: "client_reference" },
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
    { title: "Кол-во", dataIndex: "requested_qty", width: 100 },
    { title: "Ед.", dataIndex: "uom", width: 70 },
    {
      title: "OEM",
      dataIndex: "oem_only",
      width: 80,
      render: (v) => (v ? "Да" : "—"),
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
          format="DD/MM/YYYY"
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
      helpText="Статусы: Черновик → В работе → RFQ отправлен → Контракт. Первая ревизия создается автоматически при добавлении позиции."
    >
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Card title="Новая заявка" size="small">
          <Form
            form={createForm}
            layout="vertical"
            onFinish={handleCreate}
            initialValues={{ status: "draft" }}
          >
            <Space wrap align="start">
              <Form.Item
                label="Клиент"
                name="client_id"
                rules={[{ required: true, message: "Выберите клиента" }]}
              >
                <Select
                  style={{ width: 260 }}
                  options={clientOptions}
                  showSearch
                  optionFilterProp="label"
                  placeholder="Выберите клиента"
                  onChange={(val) => {
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
              <Form.Item label="Статус" name="status">
                <Select style={{ width: 160 }} options={STATUS_OPTIONS} />
              </Form.Item>
              <Form.Item label="Источник" name="source_type">
                <Select style={{ width: 160 }} options={SOURCE_OPTIONS} />
              </Form.Item>
              <Form.Item label="Ответственный" name="assigned_to_user_id">
                <Select
                  style={{ width: 200 }}
                  options={userOptions}
                  showSearch
                  optionFilterProp="label"
                  placeholder="Назначить"
                  allowClear
                />
              </Form.Item>
              <Form.Item label="Референс клиента" name="client_reference">
                <Input style={{ width: 220 }} />
              </Form.Item>
              <Form.Item label="Дата заявки" name="created_at">
                <DatePicker
                  style={{ width: 200 }}
                  format="DD/MM/YYYY"
                  placeholder="ДД/ММ/ГГГГ"
                />
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
            </Space>
            <Space wrap align="start">
              <Form.Item label="Комментарий (внутр.)" name="comment_internal">
                <Input.TextArea style={{ width: 320 }} rows={2} />
              </Form.Item>
              <Form.Item label="Комментарий клиента" name="comment_client">
                <Input.TextArea style={{ width: 320 }} rows={2} />
              </Form.Item>
              <Form.Item style={{ marginTop: 30 }}>
                <Button type="primary" htmlType="submit">
                  Создать заявку
                </Button>
              </Form.Item>
            </Space>
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
              onClick: () => openDrawer(record),
            })}
          />
        </Card>
      </Space>

      <Drawer
        title={
          <Space direction="vertical" size={2}>
            <Space>
              <span>Заявка клиента</span>
              {activeRequest?.status ? (
                <Tag color={STATUS_COLORS[activeRequest.status] || "default"}>
                  {STATUS_OPTIONS.find((opt) => opt.value === activeRequest.status)?.label ||
                    activeRequest.status}
                </Tag>
              ) : null}
            </Space>
            <Text type="secondary">
              Создано: {formatDateTime(activeRequest?.created_at)}
            </Text>
            <Text type="secondary">
              Текущая ревизия: {activeRevisionLabel} ({activeRevisionDate})
            </Text>
          </Space>
        }
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={860}
      >
        <Card
          size="small"
          title="Данные заявки"
          extra={
            <Space>
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
                        status: activeRequest?.status || "draft",
                        source_type: activeRequest?.source_type || null,
                        assigned_to_user_id: activeRequest?.assigned_to_user_id || null,
                        client_reference: activeRequest?.client_reference || null,
                        contact_name: activeRequest?.contact_name || null,
                        contact_email: activeRequest?.contact_email || null,
                        contact_phone: activeRequest?.contact_phone || null,
                        comment_internal: activeRequest?.comment_internal || null,
                        comment_client: activeRequest?.comment_client || null,
                        created_at: activeRequest?.created_at
                          ? dayjs(activeRequest.created_at)
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
                  onClick={() => setRequestEditing(true)}
                >
                  Редактировать
                </Button>
              )}
            </Space>
          }
          style={{ marginBottom: 16 }}
        >
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
              <Form.Item label="Статус" name="status">
                <Select
                  style={{ width: 160 }}
                  options={STATUS_OPTIONS}
                  disabled={!requestEditing}
                />
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
              <Form.Item label="Дата заявки" name="created_at">
                <DatePicker
                  style={{ width: 200 }}
                  format="DD/MM/YYYY"
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
        </Card>

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: "items",
              label: "Позиции заявки",
              children: (
                <Space direction="vertical" style={{ width: "100%" }} size="middle">
                  <Space
                    align="center"
                    style={{ width: "100%", justifyContent: "space-between" }}
                  >
                    <Space direction="vertical" size={4}>
                      <Text type="secondary">
                        Добавляйте позиции через каталог или Excel-импорт.
                      </Text>
                      <Space size="small">
                        <Tag color={isLatestRevision ? "green" : "orange"}>
                          {activeRevisionLabel}
                        </Tag>
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
                        disabled={!revisions.length}
                      />
                      <Button onClick={() => setActiveTab("revisions")}>
                        Новая ревизия
                      </Button>
                      <Tooltip
                        title={
                          isLatestRevision
                            ? "Добавить позиции"
                            : "Добавление доступно только в последнюю ревизию"
                        }
                      >
                        <Button
                          type="primary"
                          disabled={!isLatestRevision}
                          onClick={() => {
                            setAddModalOpen(true)
                          }}
                        >
                          Добавить позиции
                        </Button>
                      </Tooltip>
                    </Space>
                  </Space>
                  <Table
                    rowKey="id"
                    columns={itemsColumns}
                    dataSource={items}
                    loading={itemsLoading}
                    pagination={false}
                  />
                </Space>
              ),
            },
            {
              key: "revisions",
              label: "Ревизии",
              children: (
                <Space direction="vertical" style={{ width: "100%" }}>
                  <Card size="small" title="Новая ревизия">
                    <Form form={revisionForm} onFinish={handleAddRevision}>
                      <Space wrap align="start">
                        <Form.Item name="note" label="Комментарий">
                          <Input style={{ width: 320 }} />
                        </Form.Item>
                        <Form.Item style={{ marginTop: 30 }}>
                          <Button type="primary" htmlType="submit">
                            Создать ревизию
                          </Button>
                        </Form.Item>
                      </Space>
                    </Form>
                  </Card>

                  <Card size="small" title="Таймлайн ревизий">
                    {revisionTimelineItems.length ? (
                      <Timeline items={revisionTimelineItems} />
                    ) : (
                      <Text type="secondary">Ревизий пока нет.</Text>
                    )}
                  </Card>

                  <Table
                    rowKey="id"
                    columns={revisionColumns}
                    dataSource={revisions}
                    loading={revisionsLoading}
                    pagination={false}
                    onRow={(record) => ({
                      onClick: async () => {
                        await handleSelectRevision(record.id)
                        setActiveTab("items")
                      },
                    })}
                    rowClassName={(record) =>
                      record.id === activeRevisionId ? "ant-table-row-selected" : ""
                    }
                  />
                </Space>
              ),
            },
          ]}
        />
      </Drawer>

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
              <DatePicker style={{ width: 160 }} format="DD/MM/YYYY" />
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
          resetImportState()
        }}
        footer={null}
        width={1060}
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
              <Button icon={<UploadOutlined />}>Импорт позиций</Button>
            </Upload>
            <Text type="secondary">
              Импорт из Excel добавит позиции в список ниже.
            </Text>
          </Space>

          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            <Text type="secondary">
              Сначала выберите производителя и модель, затем найдите оригинальную деталь.
            </Text>
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
                disabled={!modelId}
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
                  disabled={!catalogSelection.length}
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
                  title: "",
                  width: 110,
                  render: (_, row) => (
                    <Button size="small" onClick={() => handleAddFromCatalog(row)}>
                      Добавить
                    </Button>
                  ),
                },
              ]}
            />
          </Space>

          <Card
            size="small"
            title={`Позиции к добавлению (${stagedRows.length})`}
            extra={
              <Space>
                <Button onClick={() => setStagedRows((prev) => [...prev, createStagedRow()])}>
                  Добавить строку
                </Button>
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
              locale={{ emptyText: "Добавьте позиции" }}
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

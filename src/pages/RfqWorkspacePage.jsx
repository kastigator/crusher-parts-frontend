import React, { useEffect, useMemo, useRef, useState } from "react"
import { Button, Card, Checkbox, Form, Input, Modal, Select, Space, Steps, Switch, Table, Tabs, Tag, Typography, message } from "antd"
import { DeleteOutlined } from "@ant-design/icons"
import PageWrapper from "@/components/common/PageWrapper"
import axios from "@/api/axiosInstance"
import confirmAction from "@/utils/confirmAction"

const { Text } = Typography

const debugLog = (...args) => {
  if (typeof window !== "undefined" && window.__RFQ_DEBUG__) {
    console.log("[RFQ]", ...args)
  }
}

const formatDate = (value) => {
  if (!value) return "-"
  try {
    return new Date(value).toLocaleDateString("ru-RU")
  } catch {
    return "-"
  }
}

const STEP_LABELS = [
  "RFQ",
  "Поставщики",
  "Ответы",
  "Выбор",
  "Экономика",
  "КП",
  "Контракт",
  "PO",
]

const STEP_TO_TAB = [
  "rfq",
  "suppliers",
  "responses",
  "selection",
  "economics",
  "sales",
  "contracts",
  "po",
]

const TAB_TO_STEP = STEP_TO_TAB.reduce((acc, key, index) => {
  acc[key] = index
  return acc
}, {
  coverage: 2,
})

const statusToColor = (value) => {
  if (!value) return "default"
  if (value === "sent") return "blue"
  if (value === "responded") return "green"
  if (value === "structured") return "cyan"
  if (value === "draft") return "default"
  return "gold"
}

const matchTypeLabel = {
  WHOLE: "Целиком",
  BOM: "BOM",
  KIT: "Комплект",
}

const renderMatchTypes = (value) => {
  if (!value) return "—"
  return value
    .split(",")
    .map((v) => matchTypeLabel[v] || v)
    .join(", ")
}

export default function RfqWorkspacePage() {
  const [rfqs, setRfqs] = useState([])
  const [requests, setRequests] = useState([])
  const [revisions, setRevisions] = useState([])
  const [loading, setLoading] = useState(false)
  const [activeRfqId, setActiveRfqId] = useState(null)
  const [activeRfq, setActiveRfq] = useState(null)
  const [filterClientId, setFilterClientId] = useState(null)
  const [filterRequestNumber, setFilterRequestNumber] = useState("")

  const [items, setItems] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [suggestedSuppliers, setSuggestedSuppliers] = useState([])
  const [suggestedSelection, setSuggestedSelection] = useState([])
  const [allSuppliers, setAllSuppliers] = useState([])
  const [rfqDocuments, setRfqDocuments] = useState([])
  const [docsLoading, setDocsLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [selectedSupplierIds, setSelectedSupplierIds] = useState([])
  const [supplierCreateOpen, setSupplierCreateOpen] = useState(false)
  const [autoAddCreatedSupplier, setAutoAddCreatedSupplier] = useState(true)
  const [responses, setResponses] = useState([])
  const [structure, setStructure] = useState(null)
  const [coverage, setCoverage] = useState(null)
  const [selections, setSelections] = useState([])
  const [selectionLines, setSelectionLines] = useState([])
  const [shipmentGroups, setShipmentGroups] = useState([])
  const [landedCosts, setLandedCosts] = useState([])
  const [salesQuotes, setSalesQuotes] = useState([])
  const [contracts, setContracts] = useState([])
  const [purchaseOrders, setPurchaseOrders] = useState([])
  const [activeTabKey, setActiveTabKey] = useState("rfq")
  const [bundleModal, setBundleModal] = useState({
    open: false,
    item: null,
    bundles: [],
    loading: false,
    activeBundleId: null,
    bundleSummary: null,
    saving: false,
  })

  const [createForm] = Form.useForm()
  const [supplierForm] = Form.useForm()
  const [supplierCreateForm] = Form.useForm()
  const autoFillRef = useRef(new Set())
  const supplierSelectionInitRef = useRef(false)

  useEffect(() => {
    setActiveTabKey("rfq")
  }, [activeRfqId])

  const loadRfqs = async () => {
    setLoading(true)
    try {
      const { data } = await axios.get("/rfqs")
      setRfqs(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRfqs()
    const loadRequests = async () => {
      try {
        const { data } = await axios.get("/client-requests")
        setRequests(Array.isArray(data) ? data : [])
      } catch (e) {
        console.error(e)
      }
    }
    const loadSuppliers = async () => {
      try {
        const { data } = await axios.get("/suppliers")
        setAllSuppliers(Array.isArray(data) ? data : [])
      } catch (e) {
        console.error(e)
      }
    }
    loadRequests()
    loadSuppliers()
  }, [])

  const loadRevisions = async (requestId) => {
    if (!requestId) {
      setRevisions([])
      return
    }
    try {
      const { data } = await axios.get(`/client-requests/${requestId}/revisions`)
      setRevisions(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
      message.error("Не удалось загрузить ревизии")
    }
  }

  const loadSuggestedSuppliers = async (rfqId) => {
    if (!rfqId) {
      setSuggestedSuppliers([])
      setSuggestedSelection([])
      return
    }
    try {
      const { data } = await axios.get(`/rfqs/${rfqId}/suggested-suppliers`)
      setSuggestedSuppliers(Array.isArray(data) ? data : [])
      setSuggestedSelection([])
    } catch (e) {
      console.error(e)
    }
  }

  const loadDocuments = async (rfqId) => {
    if (!rfqId) {
      setRfqDocuments([])
      return
    }
    setDocsLoading(true)
    try {
      const { data } = await axios.get(`/rfqs/${rfqId}/documents`)
      setRfqDocuments(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
      message.error("Не удалось загрузить документы RFQ")
    } finally {
      setDocsLoading(false)
    }
  }

  const handleCreateRfq = async (values) => {
    if (!values.client_request_revision_id) {
      message.warning("Выберите ревизию заявки")
      return
    }
    try {
      const { data } = await axios.post("/rfqs", {
        client_request_revision_id: values.client_request_revision_id,
        note: values.note || null,
        rfq_number: values.rfq_number || null,
      })
      if (data?.id) {
        await axios.post(`/rfqs/${data.id}/items/bulk`)
      }
      message.success("RFQ создан")
      createForm.resetFields()
      await loadRfqs()
      if (data?.id) {
        setActiveRfqId(data.id)
      }
    } catch (e) {
      console.error(e)
      message.error("Не удалось создать RFQ")
    }
  }

  const handleDeleteRfq = async (rfqId) => {
    const { confirmed } = await confirmAction({
      title: "Удалить RFQ?",
      text: "Будут удалены ответы поставщиков и связанные расчеты.",
      icon: "warning",
      confirmLabel: "Удалить",
    })
    if (!confirmed) return
    try {
      await axios.delete(`/rfqs/${rfqId}`)
      if (Number(activeRfqId) === Number(rfqId)) {
        setActiveRfqId(null)
      }
      await loadRfqs()
      message.success("RFQ удален")
    } catch (e) {
      console.error(e)
      message.error("Не удалось удалить RFQ")
    }
  }

  useEffect(() => {
    if (!activeRfqId) {
      setActiveRfq(null)
      setItems([])
      setSuppliers([])
      setSuggestedSuppliers([])
      setSuggestedSelection([])
      setSelectedSupplierIds([])
      setRfqDocuments([])
      setResponses([])
      setStructure(null)
      setSelections([])
      setSelectionLines([])
      setShipmentGroups([])
      setLandedCosts([])
      setSalesQuotes([])
      setContracts([])
      setPurchaseOrders([])
      return
    }

    let cancelled = false
    const loadDetails = async () => {
      try {
        const rfq = rfqs.find((row) => Number(row.id) === Number(activeRfqId)) || null
        setActiveRfq(rfq || null)

        const [
          itemsResp,
          suppliersResp,
          suggestedResp,
          docsResp,
          responsesResp,
          structureResp,
          coverageResp,
          selectionsResp,
          groupsResp,
          landedResp,
          quotesResp,
          contractsResp,
          poResp,
        ] = await Promise.all([
          axios.get(`/rfqs/${activeRfqId}/items`),
          axios.get(`/rfqs/${activeRfqId}/suppliers`),
          axios.get(`/rfqs/${activeRfqId}/suggested-suppliers`),
          axios.get(`/rfqs/${activeRfqId}/documents`),
          axios.get("/supplier-responses"),
          axios.get(`/rfqs/${activeRfqId}/structure`, { params: { view: "master" } }),
          axios.get("/coverage", { params: { rfq_id: activeRfqId } }),
          axios.get("/selection"),
          axios.get("/economics/shipment-groups"),
          axios.get("/economics/landed-costs"),
          axios.get("/sales-quotes"),
          rfq?.client_id ? axios.get("/contracts", { params: { client_id: rfq.client_id } }) : Promise.resolve({ data: [] }),
          axios.get("/purchase-orders"),
        ])

        if (cancelled) return

        let itemList = Array.isArray(itemsResp.data) ? itemsResp.data : []
        const supplierList = Array.isArray(suppliersResp.data) ? suppliersResp.data : []
        const suggestedList = Array.isArray(suggestedResp.data) ? suggestedResp.data : []
        const docsList = Array.isArray(docsResp.data) ? docsResp.data : []
        const responseList = Array.isArray(responsesResp.data) ? responsesResp.data : []
        const structurePayload = structureResp?.data || null
        const coveragePayload = coverageResp?.data || null
        const selectionList = Array.isArray(selectionsResp.data) ? selectionsResp.data : []
        const groupList = Array.isArray(groupsResp.data) ? groupsResp.data : []
        const landedList = Array.isArray(landedResp.data) ? landedResp.data : []
        const quoteList = Array.isArray(quotesResp.data) ? quotesResp.data : []
        const contractList = Array.isArray(contractsResp.data) ? contractsResp.data : []
        const poList = Array.isArray(poResp.data) ? poResp.data : []

        const rfqResponses = responseList.filter((row) => Number(row.rfq_id) === Number(activeRfqId))
        const rfqSelections = selectionList.filter((row) => Number(row.rfq_id) === Number(activeRfqId))
        const rfqGroups = groupList.filter((row) => Number(row.rfq_id) === Number(activeRfqId))
        const rfqLanded = landedList.filter((row) => Number(row.rfq_id) === Number(activeRfqId))
        const rfqQuotes = rfq?.client_request_revision_id
          ? quoteList.filter((row) => Number(row.client_request_revision_id) === Number(rfq.client_request_revision_id))
          : []
        const rfqContracts = rfqQuotes.length
          ? contractList.filter((row) => rfqQuotes.some((q) => Number(q.id) === Number(row.sales_quote_id)))
          : []
        const selectionIds = rfqSelections.map((row) => row.id)
        const rfqPos = selectionIds.length
          ? poList.filter((row) => selectionIds.includes(Number(row.selection_id)))
          : []

        if (!itemList.length && !autoFillRef.current.has(activeRfqId)) {
          autoFillRef.current.add(activeRfqId)
          try {
            await axios.post(`/rfqs/${activeRfqId}/items/bulk`)
            const refreshed = await axios.get(`/rfqs/${activeRfqId}/items`)
            itemList = Array.isArray(refreshed.data) ? refreshed.data : []
            const refreshedStructure = await axios.get(`/rfqs/${activeRfqId}/structure`, {
              params: { view: "master" },
            })
            const refreshedSuggested = await axios.get(`/rfqs/${activeRfqId}/suggested-suppliers`)
            if (!cancelled) {
              setStructure(refreshedStructure?.data || null)
              setSuggestedSuppliers(Array.isArray(refreshedSuggested.data) ? refreshedSuggested.data : [])
              setSuggestedSelection([])
            }
          } catch (e) {
            console.error(e)
          }
        }

        setItems(itemList)
        setSuppliers(supplierList)
        setSuggestedSuppliers(suggestedList)
        setSuggestedSelection([])
        setRfqDocuments(docsList)
        setResponses(rfqResponses)
        setStructure(structurePayload)
        setCoverage(coveragePayload)
        setSelections(rfqSelections)
        setShipmentGroups(rfqGroups)
        setLandedCosts(rfqLanded)
        setSalesQuotes(rfqQuotes)
        setContracts(rfqContracts)
        setPurchaseOrders(rfqPos)

        if (rfqSelections.length) {
          const latestSelection = rfqSelections[0]
          const linesResp = await axios.get(`/selection/${latestSelection.id}/lines`)
          if (!cancelled) {
            setSelectionLines(Array.isArray(linesResp.data) ? linesResp.data : [])
          }
        } else {
          setSelectionLines([])
        }
      } catch (e) {
        if (!cancelled) {
          console.error(e)
        }
      }
    }

    loadDetails()
    return () => {
      cancelled = true
    }
  }, [activeRfqId, rfqs])

  useEffect(() => {
    if (!suppliers.length) {
      setSelectedSupplierIds([])
      supplierSelectionInitRef.current = false
      return
    }
    if (!supplierSelectionInitRef.current) {
      setSelectedSupplierIds(suppliers.map((s) => s.supplier_id))
      supplierSelectionInitRef.current = true
    }
  }, [suppliers])

  const refreshStructure = async (opts = {}) => {
    if (!activeRfqId) return
    try {
      const { data } = await axios.get(`/rfqs/${activeRfqId}/structure`, {
        params: { view: "master" },
      })
      setStructure(data || null)
      if (opts.debugItemId && data?.items?.length) {
        const item = data.items.find(
          (row) => Number(row.rfq_item_id) === Number(opts.debugItemId)
        )
        debugLog("refreshStructure:item", item)
      }
      return data || null
    } catch (e) {
      console.error(e)
      message.error("Не удалось обновить структуру")
      return null
    }
  }

  const handleAddSupplier = async (values) => {
    if (!activeRfqId) return
    const supplierId = Number(values?.supplier_id)
    if (!supplierId) {
      message.warning("Выберите поставщика")
      return
    }
    try {
      await axios.post(`/rfqs/${activeRfqId}/suppliers`, {
        supplier_id: supplierId,
        status: values?.status || "invited",
        note: values?.note || null,
      })
      supplierForm.resetFields()
      await loadRfqs()
      await loadSuggestedSuppliers(activeRfqId)
      const refreshed = await axios.get(`/rfqs/${activeRfqId}/suppliers`)
      setSuppliers(Array.isArray(refreshed.data) ? refreshed.data : [])
      message.success("Поставщик добавлен в RFQ")
    } catch (e) {
      console.error(e)
      message.error("Не удалось добавить поставщика")
    }
  }

  const handleAddSuggestedSuppliers = async () => {
    if (!activeRfqId) return
    if (!suggestedSelection.length) {
      message.warning("Выберите поставщиков из подсказок")
      return
    }
    try {
      await axios.post(`/rfqs/${activeRfqId}/suppliers/bulk`, {
        supplier_ids: suggestedSelection,
      })
      await loadRfqs()
      await loadSuggestedSuppliers(activeRfqId)
      const refreshed = await axios.get(`/rfqs/${activeRfqId}/suppliers`)
      setSuppliers(Array.isArray(refreshed.data) ? refreshed.data : [])
      message.success("Поставщики добавлены")
    } catch (e) {
      console.error(e)
      message.error("Не удалось добавить поставщиков")
    }
  }

  const handleSendRfq = async () => {
    if (!activeRfqId) return
    const { confirmed } = await confirmAction({
      title: "Сформировать Excel для поставщиков?",
      text: "Файлы будут сохранены и статус RFQ станет «RFQ отправлен».",
      icon: "warning",
      confirmLabel: "Сформировать",
    })
    if (!confirmed) return
    setSending(true)
    try {
      const supplierIds = selectedSupplierIds.length
        ? selectedSupplierIds
        : suppliers.map((s) => s.supplier_id)
      await axios.post(`/rfqs/${activeRfqId}/send`, {
        supplier_ids: supplierIds,
      })
      await loadRfqs()
      await loadDocuments(activeRfqId)
      const refreshed = await axios.get(`/rfqs/${activeRfqId}/suppliers`)
      setSuppliers(Array.isArray(refreshed.data) ? refreshed.data : [])
      message.success("RFQ отправлен и файлы сформированы")
    } catch (e) {
      console.error(e)
      message.error("Не удалось сформировать RFQ")
    } finally {
      setSending(false)
    }
  }

  const handleCreateSupplier = async (values) => {
    const name = values?.name?.trim()
    const publicCode = values?.public_code?.trim()
    if (!name) {
      message.warning("Введите название поставщика")
      return
    }
    if (!publicCode) {
      message.warning("Введите код поставщика")
      return
    }
    try {
      const { data: created } = await axios.post("/suppliers", {
        name,
        public_code: publicCode,
      })
      setAllSuppliers((prev) => [created, ...prev])
      supplierCreateForm.resetFields()
      setSupplierCreateOpen(false)
      if (autoAddCreatedSupplier && activeRfqId) {
        await axios.post(`/rfqs/${activeRfqId}/suppliers`, {
          supplier_id: created.id,
          status: "invited",
        })
        const refreshed = await axios.get(`/rfqs/${activeRfqId}/suppliers`)
        setSuppliers(Array.isArray(refreshed.data) ? refreshed.data : [])
      }
      await loadSuggestedSuppliers(activeRfqId)
      message.success("Поставщик создан")
    } catch (e) {
      console.error(e)
      const msg = e?.response?.data?.message || "Не удалось создать поставщика"
      message.error(msg)
    }
  }

  const openBundleModal = async (item) => {
    if (!item?.original_part_id) {
      message.warning("Нет привязки к оригинальной детали")
      return
    }
    setBundleModal({
      open: true,
      item,
      bundles: [],
      loading: true,
      activeBundleId: item.selected_bundle_id || null,
      bundleSummary: null,
      saving: false,
    })
    try {
      const { data } = await axios.get("/supplier-bundles", {
        params: { original_part_id: item.original_part_id },
      })
      const list = Array.isArray(data) ? data : []
      const currentId = item.selected_bundle_id || null
      const singleId = list.length === 1 ? list[0].id : null
      const nextActive = currentId || singleId
      setBundleModal((prev) => ({
        ...prev,
        bundles: list,
        loading: false,
        activeBundleId: nextActive,
      }))
      if (nextActive) {
        await loadBundleSummary(nextActive)
      }
    } catch (e) {
      console.error(e)
      setBundleModal((prev) => ({ ...prev, loading: false }))
      message.error("Не удалось загрузить комплекты")
    }
  }

  const loadBundleSummary = async (bundleId) => {
    if (!bundleId) return
    setBundleModal((prev) => ({ ...prev, activeBundleId: bundleId, bundleSummary: null }))
    try {
      const { data } = await axios.get(`/supplier-bundles/${bundleId}/items`)
      setBundleModal((prev) => ({ ...prev, bundleSummary: { items: data || [] } }))
    } catch (e) {
      console.error(e)
      message.error("Не удалось загрузить состав комплекта")
    }
  }

  const confirmBundleSelection = async () => {
    if (!bundleModal.item?.rfq_item_id) return
    if (!bundleModal.activeBundleId) {
      message.warning("Выберите комплект")
      return
    }
    setBundleModal((prev) => ({ ...prev, saving: true }))
    try {
      await axios.put(`/rfqs/${activeRfqId}/items/${bundleModal.item.rfq_item_id}/strategy`, {
        allow_kit: 1,
        selected_bundle_id: bundleModal.activeBundleId,
      })
      await refreshStructure()
      await loadRfqs()
      message.success("Комплект выбран")
      setBundleModal({
        open: false,
        item: null,
        bundles: [],
        loading: false,
        activeBundleId: null,
        bundleSummary: null,
        saving: false,
      })
    } catch (e) {
      console.error(e)
      message.error("Не удалось сохранить выбор комплекта")
      setBundleModal((prev) => ({ ...prev, saving: false }))
    }
  }

  const updateStrategy = async (item, patch, rebuild = false) => {
    if (!activeRfqId || !item?.rfq_item_id) return
    debugLog("updateStrategy:start", {
      rfqItemId: item.rfq_item_id,
      patch,
      current: item.strategy,
      selected_bundle_id: item.selected_bundle_id,
    })
    setStructure((prev) => {
      if (!prev?.items?.length) return prev
      const nextItems = prev.items.map((row) => {
        if (Number(row.rfq_item_id) !== Number(item.rfq_item_id)) return row

        const nextStrategy = { ...(row.strategy || {}), ...patch }
        const hasBom = !!row.has_bom
        const rawMode = nextStrategy.mode || row.strategy?.mode || (hasBom ? "BOM" : "SINGLE")
        const mode = String(rawMode || "").toUpperCase() || (hasBom ? "BOM" : "SINGLE")
        const allowKitRaw =
          nextStrategy.allow_kit !== undefined ? nextStrategy.allow_kit : row.strategy?.allow_kit ?? 1
        const allowKit = Number(allowKitRaw) === 1 ? 1 : 0
        const selectedBundleId = Object.prototype.hasOwnProperty.call(patch, "selected_bundle_id")
          ? patch.selected_bundle_id
          : row.selected_bundle_id
        const kitSelectionRequired = row.bundle_count > 1 && !selectedBundleId
        const wholeEnabled = mode === "SINGLE" || mode === "MIXED" || !hasBom
        const bomEnabled = hasBom && (mode === "BOM" || mode === "MIXED")
        const kitEnabled = allowKit === 1 && row.bundle_count > 0 && !kitSelectionRequired

        const nextOptions = (row.options || []).map((opt) => {
          if (opt.type === "WHOLE") return { ...opt, enabled: wholeEnabled }
          if (opt.type === "BOM") return { ...opt, enabled: bomEnabled }
          if (opt.type === "KIT")
            return {
              ...opt,
              enabled: kitEnabled,
              selection_required: kitSelectionRequired,
            }
          return opt
        })

        debugLog("updateStrategy:local", {
          rfqItemId: row.rfq_item_id,
          mode,
          allowKit,
          selectedBundleId: selectedBundleId ?? null,
          kitSelectionRequired,
          wholeEnabled,
          bomEnabled,
          kitEnabled,
        })

        return {
          ...row,
          strategy: nextStrategy,
          selected_bundle_id: selectedBundleId ?? null,
          options: nextOptions,
        }
      })
      return { ...prev, items: nextItems }
    })
    try {
      const response = await axios.put(`/rfqs/${activeRfqId}/items/${item.rfq_item_id}/strategy`, {
        ...patch,
        rebuild_components: rebuild ? 1 : 0,
      })
      debugLog("updateStrategy:server", response?.data)
      const refreshed = await refreshStructure({ debugItemId: item.rfq_item_id })
      debugLog("updateStrategy:refreshed", refreshed)
      if (activeRfq?.status === "structured") {
        await loadRfqs()
      }
    } catch (e) {
      console.error(e)
      message.error("Не удалось обновить стратегию")
    }
  }

  const confirmStructure = async () => {
    if (!activeRfqId) return
    try {
      await axios.post(`/rfqs/${activeRfqId}/structure/confirm`)
      await loadRfqs()
      message.success("Структура RFQ подтверждена")
    } catch (e) {
      console.error(e)
      message.error(e?.response?.data?.message || "Не удалось подтвердить структуру")
    }
  }

  const handleOptionToggle = async (record, nextEnabled) => {
    const item = itemMap.get(Number(record.rfq_item_id))
    if (!item) return
    debugLog("toggle", {
      rfqItemId: record.rfq_item_id,
      optionType: record.option_type,
      nextEnabled,
      mode: item.strategy?.mode,
      allowKit: item.strategy?.allow_kit,
      bundleCount: item.bundle_count,
      selectedBundleId: item.selected_bundle_id,
    })

    if (record.option_type === "KIT") {
      if (!nextEnabled) {
        await updateStrategy(item, { allow_kit: 0, selected_bundle_id: null })
        return
      }
      if (!item.bundle_count) {
        message.warning("Для позиции нет комплектов")
        return
      }
      if (item.selected_bundle_id) {
        await updateStrategy(item, { allow_kit: 1 })
        return
      }
      if (item.bundle_count === 1 && item.original_part_id) {
        try {
          const { data } = await axios.get("/supplier-bundles", {
            params: { original_part_id: item.original_part_id },
          })
          const bundleId = Array.isArray(data) && data.length ? data[0].id : null
          if (bundleId) {
            await updateStrategy(item, { allow_kit: 1, selected_bundle_id: bundleId })
            return
          }
        } catch (e) {
          console.error(e)
        }
      }
      openBundleModal(item)
      return
    }

    const hasBom = !!item.has_bom
    const currentMode = String(item.strategy?.mode || (hasBom ? "BOM" : "SINGLE")).toUpperCase()
    const currentWhole = currentMode === "SINGLE" || currentMode === "MIXED" || !hasBom
    const currentBom = hasBom && (currentMode === "BOM" || currentMode === "MIXED")

    if (record.option_type === "WHOLE") {
      if (nextEnabled) {
        const nextMode = currentBom ? "MIXED" : "SINGLE"
        return await updateStrategy(item, { mode: nextMode })
      }
      if (hasBom) {
        return await updateStrategy(item, { mode: "BOM" })
      }
      message.info("Для позиции без состава поставка целиком всегда включена.")
      return
    }

    if (record.option_type === "BOM") {
      if (!hasBom) return
      if (nextEnabled) {
        const nextMode = currentWhole ? "MIXED" : "BOM"
        return await updateStrategy(item, { mode: nextMode })
      }
      const nextMode = currentWhole ? "SINGLE" : "SINGLE"
      return await updateStrategy(item, { mode: nextMode })
    }
  }

  const coverageRows = useMemo(() => {
    if (!coverage?.items?.length) return []
    const rows = []
    coverage.items.forEach((item) => {
      const base = {
        rfq_item_id: item.rfq_item_id,
        line_number: item.line_number,
        item_description: item.description || item.client_description || "-",
        requested_qty: item.requested_qty,
        uom: item.uom || "-",
        strategy_mode: item.strategy?.mode || "-",
      }
      item.components.forEach((comp) => {
        const responses = Array.isArray(comp.responses) ? comp.responses : []
        const priced = responses.filter((r) => Number.isFinite(Number(r.price)))
        let best = null
        priced.forEach((r) => {
          if (!best || Number(r.price) < Number(best.price)) {
            best = r
          }
        })
        rows.push({
          key: `${item.rfq_item_id}-${comp.rfq_item_component_id || comp.original_part_id}`,
          ...base,
          component_cat_number: comp.cat_number || "-",
          component_description: comp.description || "-",
          required_qty: comp.required_qty ?? "-",
          suppliers_count: comp.suppliers_count ?? 0,
          responses_count: responses.length,
          best_supplier: best?.supplier_name || "-",
          best_price: best?.price ?? "-",
          best_currency: best?.currency || "",
          response_preview: responses.slice(0, 3).map((r) => r.supplier_name).join(", "),
        })
      })
    })
    return rows
  }, [coverage])

  const clientFilterOptions = useMemo(() => {
    const map = new Map()
    rfqs.forEach((r) => {
      if (!r.client_id) return
      if (!map.has(r.client_id)) {
        map.set(r.client_id, r.client_name || `Клиент #${r.client_id}`)
      }
    })
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }))
  }, [rfqs])

  const requestOptions = useMemo(
    () =>
      requests.map((r) => ({
        value: r.id,
        label: `${r.client_name || "Клиент"} · ${r.internal_number || r.client_reference || `#${r.id}`}`,
      })),
    [requests]
  )

  const revisionOptions = useMemo(
    () =>
      revisions.map((rev) => ({
        value: rev.id,
        label: `Rev ${rev.rev_number}${rev.created_at ? ` · ${rev.created_at}` : ""}`,
      })),
    [revisions]
  )

  const supplierOptions = useMemo(
    () =>
      allSuppliers.map((s) => ({
        value: s.id,
        label: `${s.name || `Поставщик #${s.id}`}${s.public_code ? ` · ${s.public_code}` : ""}`,
      })),
    [allSuppliers]
  )

  const filteredRfqs = useMemo(() => {
    const needle = String(filterRequestNumber || "").trim().toLowerCase()
    return rfqs.filter((rfq) => {
      if (filterClientId && Number(rfq.client_id) !== Number(filterClientId)) {
        return false
      }
      if (!needle) return true
      const haystack = [
        rfq.client_request_number,
        rfq.client_reference,
        rfq.client_request_id,
        rfq.rfq_number,
      ]
        .filter((v) => v !== null && v !== undefined)
        .map((v) => String(v).toLowerCase())
        .join(" ")
      return haystack.includes(needle)
    })
  }, [rfqs, filterClientId, filterRequestNumber])

  const flowStatus = useMemo(() => {
    const steps = [
      items.length > 0,
      suppliers.length > 0,
      responses.length > 0,
      selections.length > 0,
      landedCosts.length > 0 || shipmentGroups.length > 0,
      salesQuotes.length > 0,
      contracts.length > 0,
      purchaseOrders.length > 0,
    ]
    const current = Math.max(steps.findIndex((value) => !value), 0)
    const finished = steps.every(Boolean)
    return { steps, current: finished ? steps.length - 1 : current }
  }, [
    items.length,
    suppliers.length,
    responses.length,
    selections.length,
    landedCosts.length,
    shipmentGroups.length,
    salesQuotes.length,
    contracts.length,
    purchaseOrders.length,
  ])

  const structureItems = structure?.items || []
  const itemMap = useMemo(() => {
    const map = new Map()
    structureItems.forEach((item) => {
      map.set(Number(item.rfq_item_id), item)
    })
    return map
  }, [structureItems])

  const rfqTreeData = useMemo(() => {
    return structureItems.map((item) => {
      const children = (item.options || [])
        .filter((opt) => opt.available)
        .map((opt) => {
          const optionType = opt.option_type || opt.type
          return {
            ...opt,
            key: opt.key || `opt-${item.rfq_item_id}-${optionType}`,
            type: "OPTION",
            option_type: optionType,
            rfq_item_id: item.rfq_item_id,
            bundle_count: item.bundle_count,
            selected_bundle_id: item.selected_bundle_id,
            selected_bundle_title: item.selected_bundle_title,
            children: Array.isArray(opt.children) ? opt.children : [],
          }
        })
      return {
        key: `demand-${item.rfq_item_id}`,
        type: "DEMAND",
        rfq_item_id: item.rfq_item_id,
        line_number: item.line_number,
        original_cat_number: item.original_cat_number,
        client_part_number: item.client_part_number,
        description: item.description,
        requested_qty: item.requested_qty,
        uom: item.uom,
        has_bom: item.has_bom,
        bundle_count: item.bundle_count,
        selected_bundle_id: item.selected_bundle_id,
        selected_bundle_title: item.selected_bundle_title,
        children,
      }
    })
  }, [structureItems])
  const activeStep = TAB_TO_STEP[activeTabKey] ?? 0
  const isStructureConfirmed = useMemo(
    () => ["structured", "sent", "responded"].includes(activeRfq?.status),
    [activeRfq?.status]
  )

  const rfqColumns = [
    { title: "Клиент", dataIndex: "client_name", width: 220 },
    {
      title: "Заявка",
      dataIndex: "client_request_number",
      width: 160,
      render: (value, record) =>
        value || record.client_reference || `#${record.client_request_id}`,
    },
    {
      title: "RFQ",
      dataIndex: "rfq_number",
      width: 140,
      render: (value, record) => value || `RFQ-${record.id}`,
    },
    { title: "Rev", dataIndex: "rev_number", width: 70 },
    {
      title: "Статус",
      dataIndex: "status",
      width: 120,
      render: (value) => <Tag color={statusToColor(value)}>{value || "draft"}</Tag>,
    },
    {
      title: "Создано",
      dataIndex: "created_at",
      width: 120,
      render: formatDate,
    },
    {
      title: "Действия",
      dataIndex: "actions",
      width: 90,
      render: (_, record) => (
        <Button
          danger
          type="text"
          icon={<DeleteOutlined />}
          onClick={(event) => {
            event.stopPropagation()
            handleDeleteRfq(record.id)
          }}
        />
      ),
    },
  ]

  const rfqStructureColumns = [
    {
      title: "Позиция",
      dataIndex: "item",
      render: (_, record) => {
        if (record.type === "DEMAND") {
          const cat = record.original_cat_number || record.client_part_number || "-"
          return (
            <Space>
              <Tag>{record.line_number}</Tag>
              <Text strong>{cat}</Text>
            </Space>
          )
        }
        if (record.type === "OPTION") {
          return <Text>{record.label}</Text>
        }
        if (record.type === "BOM_COMPONENT") {
          return record.cat_number || "-"
        }
        if (record.type === "KIT_ROLE") {
          return `Роль: ${record.role_label || "-"}`
        }
        return "-"
      },
    },
    {
      title: "Описание",
      dataIndex: "description",
      render: (value, record) => {
        if (record.type === "OPTION" && record.option_type === "KIT") {
          if (record.enabled) {
            if (record.selected_bundle_title) {
              return `Комплект: ${record.selected_bundle_title}`
            }
            if (record.selection_required) {
              return "Нужно выбрать комплект"
            }
          }
        }
        if (record.type === "KIT_ROLE") {
          return record.role_label || "-"
        }
        return value || "-"
      },
    },
    {
      title: "Кол-во",
      dataIndex: "qty",
      width: 100,
      render: (_, record) => {
        if (record.type === "DEMAND") return record.requested_qty ?? "-"
        if (record.type === "BOM_COMPONENT") return record.required_qty ?? "-"
        if (record.type === "KIT_ROLE") return record.required_qty ?? "-"
        return "-"
      },
    },
    {
      title: "Ед.",
      dataIndex: "uom",
      width: 80,
      render: (_, record) => {
        if (record.type === "DEMAND") return record.uom || "-"
        if (record.type === "BOM_COMPONENT" || record.type === "KIT_ROLE") return record.uom || "-"
        return "-"
      },
    },
    {
      title: "Тип",
      dataIndex: "type",
      width: 120,
      render: (value, record) => {
        if (record.type === "DEMAND") return <Tag>Заявка</Tag>
        if (record.type === "OPTION") {
          const label =
            record.option_type === "WHOLE"
              ? "Целиком"
              : record.option_type === "BOM"
                ? "BOM"
                : "Комплект"
          return <Tag color="blue">{label}</Tag>
        }
        if (record.type === "BOM_COMPONENT") return <Tag>Компонент</Tag>
        if (record.type === "KIT_ROLE") return <Tag>Роль</Tag>
        return "-"
      },
    },
    {
      title: "Вариант",
      dataIndex: "option",
      width: 240,
      render: (_, record) => {
        if (record.type !== "OPTION") return null
        const item = itemMap.get(Number(record.rfq_item_id))
        const hasBom = !!item?.has_bom
        const mode = String(item?.strategy?.mode || (hasBom ? "BOM" : "SINGLE")).toUpperCase()
        const allowKit = Number(item?.strategy?.allow_kit ?? 1) === 1
        const selectedBundleId = item?.selected_bundle_id
        const kitSelectionRequired = item?.bundle_count > 1 && !selectedBundleId
        const kitEnabled = allowKit && (item?.bundle_count || 0) > 0 && !kitSelectionRequired
        const checked =
          record.option_type === "WHOLE"
            ? mode === "SINGLE" || mode === "MIXED" || !hasBom
            : record.option_type === "BOM"
              ? hasBom && (mode === "BOM" || mode === "MIXED")
              : record.option_type === "KIT"
                ? kitEnabled
                : false
        const canSelectBundle = record.option_type === "KIT" && record.available && checked
        return (
          <Space>
            <Switch
              checked={checked}
              disabled={!record.available}
              onChange={(checked) => handleOptionToggle(record, checked)}
            />
            {canSelectBundle ? (
              <Button size="small" onClick={() => openBundleModal(item)}>
                {record.selected_bundle_id ? "Сменить комплект" : "Выбрать комплект"}
              </Button>
            ) : null}
          </Space>
        )
      },
    },
  ]

  return (
    <PageWrapper
      title="RFQ Workspace"
      helpText="Сквозной поток по RFQ: от заявки до заказа поставщику."
    >
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Card size="small" title="Создать RFQ">
          <Form form={createForm} layout="vertical" onFinish={handleCreateRfq}>
            <Space wrap align="start">
              <Form.Item label="Заявка" name="client_request_id">
                <Select
                  style={{ width: 260 }}
                  options={requestOptions}
                  showSearch
                  optionFilterProp="label"
                  onChange={(val) => {
                    createForm.setFieldsValue({ client_request_revision_id: null })
                    loadRevisions(val)
                  }}
                />
              </Form.Item>
              <Form.Item
                label="Ревизия"
                name="client_request_revision_id"
                rules={[{ required: true, message: "Выберите ревизию" }]}
              >
                <Select style={{ width: 180 }} options={revisionOptions} />
              </Form.Item>
              <Form.Item label="Номер RFQ" name="rfq_number">
                <Input style={{ width: 180 }} placeholder="Например RFQ-21" />
              </Form.Item>
              <Form.Item label="Комментарий" name="note">
                <Input style={{ width: 240 }} />
              </Form.Item>
              <Form.Item style={{ marginTop: 30 }}>
                <Button type="primary" htmlType="submit">
                  Создать RFQ
                </Button>
              </Form.Item>
            </Space>
          </Form>
        </Card>

        <Card size="small" title="RFQ список">
          <Space wrap align="center" style={{ marginBottom: 12 }}>
            <Select
              style={{ width: 220 }}
              options={clientFilterOptions}
              placeholder="Фильтр по клиенту"
              allowClear
              showSearch
              optionFilterProp="label"
              value={filterClientId || undefined}
              onChange={(value) => setFilterClientId(value || null)}
            />
            <Input
              style={{ width: 220 }}
              placeholder="Номер заявки / RFQ"
              allowClear
              value={filterRequestNumber}
              onChange={(event) => setFilterRequestNumber(event.target.value)}
            />
          </Space>
          <Table
            rowKey="id"
            columns={rfqColumns}
            dataSource={filteredRfqs}
            loading={loading}
            pagination={{ pageSize: 12 }}
            onRow={(record) => ({
              onClick: () => setActiveRfqId(record.id),
            })}
            rowClassName={(record) =>
              Number(record.id) === Number(activeRfqId) ? "ant-table-row-selected" : ""
            }
          />
        </Card>

        {activeRfq ? (
          <Card size="small" title="Рабочая зона">
            <Space direction="vertical" size={16} style={{ width: "100%" }}>
              <Space wrap align="center" style={{ justifyContent: "space-between" }}>
                <Space wrap align="center">
                  <Text strong>
                    {activeRfq.rfq_number || `RFQ-${activeRfq.id}`}
                  </Text>
                  <Tag color={statusToColor(activeRfq.status)}>
                    {activeRfq.status || "draft"}
                  </Tag>
                  <Text type="secondary">
                    {activeRfq.client_name || "Клиент"}
                  </Text>
                  <Text type="secondary">
                    Rev {activeRfq.rev_number || "-"}
                  </Text>
                </Space>
              </Space>

              <Steps
                size="small"
                current={activeStep}
                onChange={(index) => {
                  const nextKey = STEP_TO_TAB[index]
                  if (!nextKey) return
                  if (index > 0 && !isStructureConfirmed) {
                    message.warning("Сначала подтвердите структуру RFQ")
                    return
                  }
                  setActiveTabKey(nextKey)
                }}
                items={STEP_LABELS.map((label, index) => ({
                  title: label,
                  status: flowStatus.steps[index] ? "finish" : index === flowStatus.current ? "process" : "wait",
                }))}
              />

              <Tabs
                activeKey={activeTabKey}
                onChange={setActiveTabKey}
                items={[
                  {
                    key: "rfq",
                    label: "RFQ",
                    children: (
                      <Space direction="vertical" size={12} style={{ width: "100%" }}>
                        <Space wrap align="center">
                          <Button
                            type="primary"
                            onClick={confirmStructure}
                            disabled={!structureItems.length || isStructureConfirmed}
                          >
                            Подтвердить структуру
                          </Button>
                          {isStructureConfirmed ? (
                            <Tag color="green">Структура подтверждена</Tag>
                          ) : (
                            <Text type="secondary">
                              Подтвердите структуру перед переходом к поставщикам.
                            </Text>
                          )}
                        </Space>
                        <Table
                          rowKey="key"
                          loading={!structure && !!activeRfqId}
                          dataSource={rfqTreeData}
                          pagination={false}
                          columns={rfqStructureColumns}
                        />
                      </Space>
                    ),
                  },
                  {
                    key: "suppliers",
                    label: "Поставщики",
                    disabled: !isStructureConfirmed,
                    children: (
                      <Space direction="vertical" size={16} style={{ width: "100%" }}>
                        <Card size="small" title="Подсказки по поставщикам">
                          <Space direction="vertical" style={{ width: "100%" }}>
                            <Table
                              rowKey="supplier_id"
                              dataSource={suggestedSuppliers}
                              pagination={false}
                              rowSelection={{
                                selectedRowKeys: suggestedSelection,
                                onChange: setSuggestedSelection,
                              }}
                              columns={[
                                { title: "Поставщик", dataIndex: "supplier_name" },
                                { title: "Совпадений", dataIndex: "parts_count", width: 130 },
                                {
                                  title: "Типы",
                                  dataIndex: "match_types",
                                  width: 160,
                                  render: renderMatchTypes,
                                },
                              ]}
                            />
                            <Button
                              type="primary"
                              onClick={handleAddSuggestedSuppliers}
                              disabled={!suggestedSuppliers.length}
                            >
                              Добавить выбранных
                            </Button>
                          </Space>
                        </Card>

                        <Card size="small" title="Добавить поставщика">
                          <Form
                            form={supplierForm}
                            onFinish={handleAddSupplier}
                            layout="vertical"
                          >
                            <Space wrap align="start">
                              <Form.Item
                                label="Поставщик"
                                name="supplier_id"
                                rules={[{ required: true, message: "Выберите поставщика" }]}
                              >
                                <Select
                                  showSearch
                                  optionFilterProp="label"
                                  style={{ width: 260 }}
                                  options={supplierOptions}
                                  placeholder="Поиск по названию"
                                />
                              </Form.Item>
                              <Form.Item label="Статус" name="status" initialValue="invited">
                                <Select
                                  style={{ width: 160 }}
                                  options={[
                                    { value: "invited", label: "Приглашен" },
                                    { value: "sent", label: "Отправлен" },
                                    { value: "responded", label: "Ответил" },
                                  ]}
                                />
                              </Form.Item>
                              <Form.Item label="Комментарий" name="note">
                                <Input style={{ width: 220 }} />
                              </Form.Item>
                              <Form.Item style={{ marginTop: 30 }}>
                                <Button type="primary" htmlType="submit">
                                  Добавить
                                </Button>
                              </Form.Item>
                              <Form.Item style={{ marginTop: 30 }}>
                                <Button onClick={() => setSupplierCreateOpen(true)}>
                                  Создать поставщика
                                </Button>
                              </Form.Item>
                            </Space>
                          </Form>
                        </Card>

                        <Card size="small" title="Поставщики в RFQ">
                          <Table
                            rowKey="supplier_id"
                            dataSource={suppliers}
                            pagination={false}
                            rowSelection={{
                              selectedRowKeys: selectedSupplierIds,
                              onChange: setSelectedSupplierIds,
                            }}
                            columns={[
                              { title: "Поставщик", dataIndex: "supplier_name" },
                              {
                                title: "Контакт",
                                dataIndex: "contact_person",
                                render: (_, record) => {
                                  const parts = [
                                    record.contact_person,
                                    record.contact_email,
                                    record.contact_phone,
                                  ].filter(Boolean)
                                  return parts.length ? parts.join(" / ") : "—"
                                },
                              },
                              {
                                title: "Статус",
                                dataIndex: "status",
                                width: 120,
                                render: (value) => (
                                  <Tag color={statusToColor(value)}>
                                    {value || "invited"}
                                  </Tag>
                                ),
                              },
                              {
                                title: "Дата",
                                dataIndex: "invited_at",
                                width: 120,
                                render: formatDate,
                              },
                              { title: "Комментарий", dataIndex: "note" },
                            ]}
                          />
                        </Card>

                        <Card size="small" title="Файлы RFQ">
                          <Space direction="vertical" style={{ width: "100%" }}>
                            <Space wrap align="center">
                              <Button
                                type="primary"
                                onClick={handleSendRfq}
                                disabled={!suppliers.length}
                                loading={sending}
                              >
                                Сформировать Excel
                              </Button>
                              <Text type="secondary">
                                После формирования статус станет «RFQ отправлен».
                              </Text>
                            </Space>
                            <Table
                              rowKey="id"
                              dataSource={rfqDocuments}
                              loading={docsLoading}
                              pagination={false}
                              columns={[
                                {
                                  title: "Файл",
                                  dataIndex: "file_name",
                                  render: (value, record) =>
                                    record.file_url ? (
                                      <a href={record.file_url} target="_blank" rel="noreferrer">
                                        {value || "Документ"}
                                      </a>
                                    ) : (
                                      value || "Документ"
                                    ),
                                },
                                { title: "Поставщик", dataIndex: "supplier_name", width: 220 },
                                { title: "Создано", dataIndex: "created_at", width: 140, render: formatDate },
                              ]}
                            />
                          </Space>
                        </Card>
                      </Space>
                    ),
                  },
                  {
                    key: "responses",
                    label: "Ответы",
                    disabled: !isStructureConfirmed,
                    children: (
                      <Table
                        rowKey="id"
                        dataSource={responses}
                        pagination={false}
                        columns={[
                          { title: "Поставщик", dataIndex: "supplier_name" },
                          { title: "Статус", dataIndex: "status", width: 120 },
                          { title: "Создано", dataIndex: "created_at", width: 120, render: formatDate },
                        ]}
                      />
                    ),
                  },
                  {
                    key: "coverage",
                    label: "Coverage",
                    disabled: !isStructureConfirmed,
                    children: (
                      <Table
                        rowKey="key"
                        dataSource={coverageRows}
                        pagination={false}
                        columns={[
                          { title: "RFQ", dataIndex: "line_number", width: 70 },
                          { title: "Позиция", dataIndex: "item_description" },
                          { title: "Компонент", dataIndex: "component_cat_number", width: 160 },
                          { title: "Описание", dataIndex: "component_description" },
                          { title: "Кол-во", dataIndex: "required_qty", width: 90 },
                          { title: "Стратегия", dataIndex: "strategy_mode", width: 100 },
                          { title: "Поставщики", dataIndex: "suppliers_count", width: 110 },
                          { title: "Ответы", dataIndex: "responses_count", width: 90 },
                          {
                            title: "Лучшее",
                            dataIndex: "best_price",
                            width: 140,
                            render: (value, record) =>
                              value === "-" ? "-" : `${value} ${record.best_currency}`.trim(),
                          },
                          { title: "Поставщик", dataIndex: "best_supplier", width: 160 },
                        ]}
                      />
                    ),
                  },
                  {
                    key: "selection",
                    label: "Selection",
                    disabled: !isStructureConfirmed,
                    children: (
                      <Space direction="vertical" style={{ width: "100%" }}>
                        <Table
                          rowKey="id"
                          dataSource={selections}
                          pagination={false}
                          columns={[
                            { title: "Статус", dataIndex: "status", width: 120 },
                            { title: "Комментарий", dataIndex: "note" },
                            { title: "Создано", dataIndex: "created_at", width: 120, render: formatDate },
                          ]}
                        />
                        <Table
                          rowKey="id"
                          dataSource={selectionLines}
                          pagination={false}
                          columns={[
                            { title: "RFQ item", dataIndex: "rfq_item_id", width: 90 },
                            { title: "Компонент", dataIndex: "component_cat_number", width: 160 },
                            { title: "Поставщик", dataIndex: "supplier_name", width: 180 },
                            { title: "Предложение", dataIndex: "supplier_part_number", width: 160 },
                            { title: "Тип", dataIndex: "offer_type", width: 90 },
                            {
                              title: "Цена",
                              dataIndex: "price",
                              width: 120,
                              render: (value, record) =>
                                value == null ? "-" : `${value} ${record.currency || ""}`.trim(),
                            },
                            { title: "Qty", dataIndex: "qty", width: 80 },
                            { title: "Комментарий", dataIndex: "decision_note" },
                          ]}
                        />
                      </Space>
                    ),
                  },
                  {
                    key: "economics",
                    label: "Экономика",
                    disabled: !isStructureConfirmed,
                    children: (
                      <Space direction="vertical" style={{ width: "100%" }}>
                        <Table
                          rowKey="id"
                          dataSource={shipmentGroups}
                          pagination={false}
                          columns={[
                            { title: "Группа", dataIndex: "name" },
                            { title: "Маршрут", dataIndex: "origin_location" },
                            { title: "Транспорт", dataIndex: "transport_mode", width: 120 },
                          ]}
                        />
                        <Table
                          rowKey="id"
                          dataSource={landedCosts}
                          pagination={false}
                          columns={[
                            { title: "Снимок", dataIndex: "name" },
                            { title: "Итого", dataIndex: "landed_total", width: 120 },
                            { title: "Валюта", dataIndex: "currency", width: 90 },
                          ]}
                        />
                      </Space>
                    ),
                  },
                  {
                    key: "sales",
                    label: "КП",
                    disabled: !isStructureConfirmed,
                    children: (
                      <Table
                        rowKey="id"
                        dataSource={salesQuotes}
                        pagination={false}
                        columns={[
                          { title: "Статус", dataIndex: "status", width: 120 },
                          { title: "Валюта", dataIndex: "currency", width: 90 },
                          { title: "Создано", dataIndex: "created_at", width: 120, render: formatDate },
                        ]}
                      />
                    ),
                  },
                  {
                    key: "contracts",
                    label: "Контракт",
                    disabled: !isStructureConfirmed,
                    children: (
                      <Table
                        rowKey="id"
                        dataSource={contracts}
                        pagination={false}
                        columns={[
                          { title: "Номер", dataIndex: "contract_number" },
                          { title: "Статус", dataIndex: "status", width: 120 },
                          { title: "Дата", dataIndex: "contract_date", width: 120, render: formatDate },
                        ]}
                      />
                    ),
                  },
                  {
                    key: "po",
                    label: "PO",
                    disabled: !isStructureConfirmed,
                    children: (
                      <Table
                        rowKey="id"
                        dataSource={purchaseOrders}
                        pagination={false}
                        columns={[
                          { title: "Поставщик", dataIndex: "supplier_name" },
                          { title: "Статус", dataIndex: "status", width: 120 },
                          { title: "Ссылка", dataIndex: "supplier_reference" },
                          { title: "Создано", dataIndex: "created_at", width: 120, render: formatDate },
                        ]}
                      />
                    ),
                  },
                ]}
              />
            </Space>
          </Card>
        ) : (
          <Card size="small">
            <Text type="secondary">Выберите RFQ для просмотра рабочего пространства.</Text>
          </Card>
        )}
      </Space>
      <Modal
        open={supplierCreateOpen}
        onCancel={() => setSupplierCreateOpen(false)}
        footer={null}
        title="Создать поставщика"
      >
        <Form
          form={supplierCreateForm}
          layout="vertical"
          onFinish={handleCreateSupplier}
        >
          <Form.Item
            label="Название"
            name="name"
            rules={[{ required: true, message: "Введите название поставщика" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="Код поставщика"
            name="public_code"
            rules={[{ required: true, message: "Введите код поставщика" }]}
          >
            <Input placeholder="Например SUP-01" />
          </Form.Item>
          <Form.Item>
            <Checkbox
              checked={autoAddCreatedSupplier}
              onChange={(e) => setAutoAddCreatedSupplier(e.target.checked)}
            >
              Сразу добавить в RFQ
            </Checkbox>
          </Form.Item>
          <Space>
            <Button onClick={() => setSupplierCreateOpen(false)}>Отмена</Button>
            <Button type="primary" htmlType="submit">
              Создать
            </Button>
          </Space>
        </Form>
      </Modal>
      <Modal
        open={bundleModal.open}
        onCancel={() =>
          setBundleModal({
            open: false,
            item: null,
            bundles: [],
            loading: false,
            activeBundleId: null,
            bundleSummary: null,
            saving: false,
          })
        }
        footer={
          <Space>
            <Button
              onClick={() =>
                setBundleModal({
                  open: false,
                  item: null,
                  bundles: [],
                  loading: false,
                  activeBundleId: null,
                  bundleSummary: null,
                  saving: false,
                })
              }
            >
              Отмена
            </Button>
            <Button
              type="primary"
              disabled={!bundleModal.activeBundleId}
              loading={bundleModal.saving}
              onClick={confirmBundleSelection}
            >
              Выбрать комплект
            </Button>
          </Space>
        }
        width={820}
        title={
          bundleModal.item
            ? `Комплекты для ${bundleModal.item.original_cat_number || bundleModal.item.client_part_number || "позиции"}`
            : "Комплекты"
        }
      >
        <Table
          rowKey="id"
          dataSource={bundleModal.bundles}
          loading={bundleModal.loading}
          pagination={false}
          rowSelection={{
            type: "radio",
            selectedRowKeys: bundleModal.activeBundleId ? [bundleModal.activeBundleId] : [],
            onChange: (keys) => loadBundleSummary(keys?.[0]),
          }}
          columns={[
            { title: "Название", dataIndex: "title" },
            { title: "Позиции", dataIndex: "items_count", width: 110 },
            { title: "Примечание", dataIndex: "note" },
          ]}
        />
        {bundleModal.bundleSummary ? (
          <Card size="small" style={{ marginTop: 12 }} title="Состав комплекта">
            <Table
              rowKey="id"
              dataSource={bundleModal.bundleSummary.items || []}
              pagination={false}
              columns={[
                { title: "Роль", dataIndex: "role_label", width: 200 },
                { title: "Кол-во", dataIndex: "qty", width: 120 },
              ]}
            />
          </Card>
        ) : null}
      </Modal>
    </PageWrapper>
  )
}

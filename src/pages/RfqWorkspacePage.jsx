import React, { useEffect, useMemo, useRef, useState } from "react"
import { Button, Card, Checkbox, Form, Input, Modal, Select, Space, Steps, Table, Tabs, Tag, Tooltip, Tree, Typography, message } from "antd"
import { DeleteOutlined } from "@ant-design/icons"
import PageWrapper from "@/components/common/PageWrapper"
import axios from "@/api/axiosInstance"
import confirmAction from "@/utils/confirmAction"
import { useAuth } from "@/auth/AuthContext"

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
  if (value === "invited") return "default"
  if (value === "sent") return "blue"
  if (value === "received") return "green"
  if (value === "responded") return "green"
  if (value === "structured") return "cyan"
  if (value === "draft") return "default"
  return "gold"
}

const rfqStatusLabel = (value) => {
  if (!value) return "—"
  const labels = {
    draft: "Черновик",
    structured: "Структура готова",
    sent: "RFQ отправлен",
    responded: "Ответы получены",
  }
  return labels[value] || value
}

const supplierStatusLabel = (value) => {
  if (!value) return "—"
  const labels = {
    invited: "Приглашен",
    sent: "Отправлен",
    received: "Ответ получен",
    responded: "Ответ получен",
  }
  return labels[value] || value
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
  const { user } = useAuth()
  const selectionNodeMapRef = useRef(new Map())
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
  const [selectionModal, setSelectionModal] = useState({
    open: false,
    supplier: null,
    loading: false,
    saving: false,
    selectedKeys: [],
    hints: null,
    onlyHinted: false,
  })
  const [supplierHintsCache, setSupplierHintsCache] = useState({})
  const [bundleCache, setBundleCache] = useState({})
  const [bundleItemsCache, setBundleItemsCache] = useState({})
  const [bundleChoice, setBundleChoice] = useState({})
  const [kitPreview, setKitPreview] = useState({
    open: false,
    partId: null,
    bundles: [],
    bundleId: null,
    items: [],
    loading: false,
  })
  const [altPartsMap, setAltPartsMap] = useState({})
  const [altModal, setAltModal] = useState({
    open: false,
    loading: false,
    partId: null,
    items: [],
  })

  const [createForm] = Form.useForm()
  const [supplierForm] = Form.useForm()
  const [supplierCreateForm] = Form.useForm()
  const [users, setUsers] = useState([])
  const autoFillRef = useRef(new Set())
  const supplierSelectionInitRef = useRef(false)
  const hintTypeOrder = useRef({ OEM: 0, ANALOG: 1, UNKNOWN: 2 })

  const activeSupplierHints = useMemo(() => {
    const supplierId = selectionModal?.supplier?.supplier_id
    return selectionModal?.hints || (supplierId ? supplierHintsCache[supplierId] : null) || null
  }, [selectionModal?.hints, selectionModal?.supplier?.supplier_id, supplierHintsCache])

  const getOriginalHints = (partId) =>
    activeSupplierHints?.originals?.[String(partId)] || []
  const getBundleItemHints = (bundleItemId) =>
    activeSupplierHints?.bundle_items?.[String(bundleItemId)] || []

  const sortHints = (hints) =>
    (Array.isArray(hints) ? [...hints] : []).sort((a, b) => {
      const oa = hintTypeOrder.current[String(a?.part_type || "UNKNOWN")] ?? 99
      const ob = hintTypeOrder.current[String(b?.part_type || "UNKNOWN")] ?? 99
      return oa - ob || String(a?.supplier_part_number || "").localeCompare(String(b?.supplier_part_number || ""))
    })

  const buildHintsTooltip = (hints) => {
    const list = sortHints(hints)
    if (!list.length) return null
    return (
      <div style={{ maxWidth: 520 }}>
        {list.slice(0, 12).map((h, idx) => (
          <div key={`${h.supplier_part_id || h.supplier_part_number || idx}`}>
            {h.supplier_part_number || "—"} {h.part_type ? `(${h.part_type})` : ""}
            {h.description_ru || h.description_en ? ` · ${h.description_ru || h.description_en}` : ""}
          </div>
        ))}
        {list.length > 12 ? <div>…ещё {list.length - 12}</div> : null}
      </div>
    )
  }

  const renderHintsBadge = (hints) => {
    const list = sortHints(hints)
    if (!list.length) return null
    const numbers = list.map((h) => h.supplier_part_number).filter(Boolean)
    const shown = numbers.slice(0, 2)
    const more = Math.max(0, numbers.length - shown.length)
    const summary = shown.join(", ") + (more ? ` +${more}` : "")
    const tooltip = buildHintsTooltip(list)
    return (
      <Tooltip title={tooltip}>
        <Tag color="blue" style={{ marginInlineEnd: 0 }}>
          Есть: {summary || list.length}
        </Tag>
      </Tooltip>
    )
  }

  const hasHintsForSelectionKey = (key) => {
    if (!activeSupplierHints) return false
    const meta = selectionNodeMapRef.current.get(String(key))
    const type = String(meta?.line_type || "").toUpperCase()
    if (type === "DEMAND" || type === "BOM_COMPONENT") {
      const effectivePartId = meta?.alt_original_part_id || meta?.original_part_id
      if (!effectivePartId) return false
      return getOriginalHints(effectivePartId).length > 0
    }
    if (type === "KIT_ROLE") {
      const id = meta?.bundle_item_id
      if (!id) return false
      return getBundleItemHints(id).length > 0
    }
    return false
  }

  const filterSelectionTree = (nodes) => {
    const list = Array.isArray(nodes) ? nodes : []
    const walk = (node) => {
      const children = Array.isArray(node.children) ? node.children : []
      const keptChildren = children.map(walk).filter(Boolean)
      if (keptChildren.length) return { ...node, children: keptChildren }

      const key = String(node.key || "")
      if (node.checkable === false) {
        if (key.startsWith("alt-inline:")) {
          const parts = key.split(":")
          const basePartId = Number(parts[2])
          const altParts = altPartsMap?.[basePartId] || []
          return altParts.some((alt) => getOriginalHints(alt.alt_part_id).length) ? node : null
        }
        if (key.startsWith("kit-inline:")) {
          const parts = key.split(":")
          const rfqItemId = Number(parts[1])
          const basePartId = Number(parts[2])
          const bundleId = bundleChoice?.[`part:${basePartId}`] || bundleChoice?.[`item:${rfqItemId}`]
          const roles = bundleId ? bundleItemsCache?.[bundleId] || [] : []
          return roles.some((r) => getBundleItemHints(r.id).length) ? node : null
        }
        return null
      }

      return hasHintsForSelectionKey(node.key) ? node : null
    }
    return list.map(walk).filter(Boolean)
  }

  const handleSelectAllHinted = () => {
    if (!activeSupplierHints) return
    let next = new Set(selectionModal.selectedKeys || [])
    selectionNodeMapRef.current.forEach((meta, key) => {
      const type = String(meta?.line_type || "").toUpperCase()
      if (type === "DEMAND" || type === "BOM_COMPONENT") {
        if (meta?.alt_original_part_id) return
        if (!hasHintsForSelectionKey(key)) return
        next.add(key)
        next = applyAltExclusion(next, key, true)
      } else if (type === "KIT_ROLE") {
        if (!hasHintsForSelectionKey(key)) return
        next.add(key)
        next = applyAltExclusion(next, key, true)
      }
    })
    setSelectionModal((prev) => ({ ...prev, selectedKeys: Array.from(next) }))
  }

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
    const loadSuppliers = async () => {
      try {
        const { data } = await axios.get("/suppliers")
        setAllSuppliers(Array.isArray(data) ? data : [])
      } catch (e) {
        console.error(e)
      }
    }
    loadSuppliers()
  }, [])

  useEffect(() => {
    if (user?.id) {
      createForm.setFieldsValue({ assigned_to_user_id: user.id })
    }
  }, [createForm, user])

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

  const loadSupplierHints = async (rfqId, supplierId) => {
    if (!rfqId || !supplierId) return null
    const cached = supplierHintsCache[supplierId]
    if (cached) return cached
    try {
      const { data } = await axios.get(`/rfqs/${rfqId}/supplier-hints`, {
        params: { supplier_id: supplierId },
      })
      setSupplierHintsCache((prev) => ({ ...prev, [supplierId]: data }))
      return data
    } catch (e) {
      console.error(e)
      message.error("Не удалось загрузить подсказки по поставщику")
      return null
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
        assigned_to_user_id: values.assigned_to_user_id || null,
      })
      if (data?.id) {
        await axios.post(`/rfqs/${data.id}/items/bulk`)
      }
      message.success("RFQ создан")
      createForm.resetFields()
      if (user?.id) {
        createForm.setFieldsValue({ assigned_to_user_id: user.id })
      }
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

  const handleSupplierLanguage = async (record, lang) => {
    if (!activeRfqId || !record?.id) return
    try {
      const res = await axios.patch(
        `/rfqs/${activeRfqId}/suppliers/${record.id}`,
        { language: lang }
      )
      const nextLang = res?.data?.language || lang
      setSuppliers((prev) =>
        prev.map((row) =>
          row.id === record.id ? { ...row, language: nextLang } : row
        )
      )
    } catch (e) {
      console.error(e)
      message.error("Не удалось обновить язык RFQ")
    }
  }

  const loadBundlesForPart = async (partId) => {
    if (!partId || bundleCache[partId]) return bundleCache[partId] || []
    try {
      const { data } = await axios.get("/supplier-bundles", {
        params: { original_part_id: partId },
      })
      const list = Array.isArray(data) ? data : []
      setBundleCache((prev) => ({ ...prev, [partId]: list }))
      return list
    } catch (e) {
      console.error(e)
      message.error("Не удалось загрузить комплекты")
      return []
    }
  }

  const loadBundleItems = async (bundleId) => {
    if (!bundleId || bundleItemsCache[bundleId]) return bundleItemsCache[bundleId] || []
    try {
      const { data } = await axios.get(`/supplier-bundles/${bundleId}/items`)
      const list = Array.isArray(data) ? data : []
      setBundleItemsCache((prev) => ({ ...prev, [bundleId]: list }))
      return list
    } catch (e) {
      console.error(e)
      message.error("Не удалось загрузить состав комплекта")
      return []
    }
  }

  const collectBomPartIds = (nodes, set) => {
    if (!Array.isArray(nodes)) return
    nodes.forEach((node) => {
      if (node?.original_part_id) set.add(node.original_part_id)
      if (node?.children?.length) collectBomPartIds(node.children, set)
    })
  }

  const loadAltPartsBulk = async (partIds) => {
    const ids = Array.isArray(partIds) ? partIds.filter(Boolean) : []
    if (!ids.length) {
      setAltPartsMap({})
      return {}
    }
    try {
      const { data } = await axios.get("/original-part-alt/bulk", {
        params: { part_ids: ids.join(",") },
      })
      const list = Array.isArray(data) ? data : Array.isArray(data?.parts) ? data.parts : []
      const nextMap = {}
      list.forEach((row) => {
        if (!row?.original_part_id) return
        nextMap[row.original_part_id] = Array.isArray(row.alt_parts) ? row.alt_parts : []
      })
      setAltPartsMap(nextMap)
      return nextMap
    } catch (e) {
      console.error(e)
      message.error("Не удалось загрузить альтернативы")
      setAltPartsMap({})
      return {}
    }
  }

  const openSelectionModal = async (supplier) => {
    if (!activeRfqId || !supplier?.id) return
    const supplierId = supplier?.supplier_id
    const cachedHints = supplierId ? supplierHintsCache[supplierId] : null
    setSelectionModal({
      open: true,
      supplier,
      loading: true,
      saving: false,
      selectedKeys: [],
      hints: cachedHints,
      onlyHinted: false,
    })
    try {
      const [selectionsResp, hints] = await Promise.all([
        axios.get(`/rfqs/${activeRfqId}/suppliers/${supplier.id}/line-selections`),
        supplierId ? loadSupplierHints(activeRfqId, supplierId) : Promise.resolve(null),
      ])
      const data = selectionsResp?.data
      const keys = []
      const nextBundleChoice = {}
      const partIdsToLoad = new Set()
      ;(Array.isArray(data) ? data : []).forEach((row) => {
        const type = String(row.line_type || "").toUpperCase()
        if (type === "DEMAND") {
          if (row.alt_original_part_id) {
            keys.push(
              `alt:${row.rfq_item_id}:${row.original_part_id}:${row.alt_original_part_id}`
            )
          } else {
            keys.push(`demand:${row.rfq_item_id}`)
          }
        } else if (type === "BOM_COMPONENT") {
          if (row.alt_original_part_id) {
            keys.push(
              `alt:${row.rfq_item_id}:${row.original_part_id}:${row.alt_original_part_id}`
            )
          } else {
            keys.push(`bom:${row.rfq_item_id}:${row.original_part_id}`)
          }
        } else if (type === "KIT_ROLE") {
          keys.push(`kit:${row.rfq_item_id}:${row.bundle_id}:${row.bundle_item_id}`)
          if (row.bundle_id) {
            if (row.original_part_id) {
              nextBundleChoice[`part:${row.original_part_id}`] = row.bundle_id
              partIdsToLoad.add(row.original_part_id)
            } else {
              nextBundleChoice[`item:${row.rfq_item_id}`] = row.bundle_id
            }
          }
        }
      })
      await Promise.all([...partIdsToLoad].map((id) => loadBundlesForPart(id)))
      if (!Object.keys(altPartsMap || {}).length) {
        const ids = new Set()
        structureItems.forEach((item) => {
          if (item.original_part_id) ids.add(item.original_part_id)
          const bomOpt = (item.options || []).find((opt) => opt.type === "BOM")
          collectBomPartIds(bomOpt?.children || [], ids)
        })
        await loadAltPartsBulk(Array.from(ids))
      }
      setBundleChoice(nextBundleChoice)
      await Promise.all(
        Object.values(nextBundleChoice)
          .filter(Boolean)
          .map((bundleId) => loadBundleItems(bundleId))
      )
      setSelectionModal((prev) => ({
        ...prev,
        loading: false,
        selectedKeys: keys,
        hints: hints || prev.hints,
      }))
    } catch (e) {
      console.error(e)
      message.error("Не удалось загрузить выбор")
      setSelectionModal((prev) => ({ ...prev, loading: false }))
    }
  }

  const openKitPreview = async (partId) => {
    if (!partId) return
    setKitPreview({
      open: true,
      partId,
      bundles: [],
      bundleId: null,
      items: [],
      loading: true,
    })
    try {
      const bundles = await loadBundlesForPart(partId)
      const list = Array.isArray(bundles) ? bundles : []
      const nextBundleId = list.length === 1 ? list[0].id : null
      const items = nextBundleId ? await loadBundleItems(nextBundleId) : []
      setKitPreview({
        open: true,
        partId,
        bundles: list,
        bundleId: nextBundleId,
        items: Array.isArray(items) ? items : [],
        loading: false,
      })
    } catch (e) {
      console.error(e)
      message.error("Не удалось загрузить комплект")
      setKitPreview((prev) => ({ ...prev, loading: false }))
    }
  }

  const loadAltPartsForPart = async (partId) => {
    if (!partId) return []
    if (altPartsMap[partId]) return altPartsMap[partId]
    try {
      const { data } = await axios.get("/original-part-alt", {
        params: { original_part_id: partId },
      })
      const groups = Array.isArray(data) ? data : []
      const flat = []
      const seen = new Set()
      groups.forEach((g) => {
        ;(g.items || []).forEach((item) => {
          if (seen.has(item.alt_part_id)) return
          seen.add(item.alt_part_id)
          flat.push(item)
        })
      })
      setAltPartsMap((prev) => ({ ...prev, [partId]: flat }))
      return flat
    } catch (e) {
      console.error(e)
      message.error("Не удалось загрузить альтернативы")
      return []
    }
  }

  const openAltModal = async (partId) => {
    if (!partId) return
    setAltModal({ open: true, loading: true, partId, items: [] })
    const items = await loadAltPartsForPart(partId)
    setAltModal({ open: true, loading: false, partId, items })
  }

  const saveSelections = async (nodeMap) => {
    if (!activeRfqId || !selectionModal.supplier?.id) return
    const supplierId = selectionModal.supplier.id
    const payload = selectionModal.selectedKeys
      .map((key) => {
        const node = nodeMap.get(key)
        if (!node) return null
        return {
          rfq_item_id: node.rfq_item_id,
          line_type: node.line_type,
          original_part_id: node.original_part_id || null,
          alt_original_part_id: node.alt_original_part_id || null,
          bundle_id: node.bundle_id || null,
          bundle_item_id: node.bundle_item_id || null,
          line_label: node.line_label || null,
          line_description: node.line_description || null,
          qty: node.qty ?? null,
          uom: node.uom || null,
        }
      })
      .filter(Boolean)
    setSelectionModal((prev) => ({ ...prev, saving: true }))
    try {
      await axios.put(
        `/rfqs/${activeRfqId}/suppliers/${supplierId}/line-selections`,
        { selections: payload }
      )
      message.success("Выбор сохранен")
      setSelectionModal((prev) => ({ ...prev, saving: false, open: false }))
    } catch (e) {
      console.error(e)
      message.error("Не удалось сохранить выбор")
      setSelectionModal((prev) => ({ ...prev, saving: false }))
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

  const userOptions = useMemo(
    () =>
      users.map((u) => ({
        value: u.id,
        label: u.full_name || u.username || `User ${u.id}`,
      })),
    [users]
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

  const structureItems = useMemo(
    () => (Array.isArray(structure?.items) ? structure.items : []),
    [structure?.items]
  )
  const altLoadKeyRef = useRef("")

  const parseAltKey = (key) => {
    const parts = String(key).split(":")
    if (parts[0] !== "alt" || parts.length < 4) return null
    return {
      rfqItemId: Number(parts[1]),
      basePartId: Number(parts[2]),
      altPartId: Number(parts[3]),
    }
  }

  const parseBomKey = (key) => {
    const parts = String(key).split(":")
    if (parts[0] !== "bom" || parts.length < 3) return null
    return {
      rfqItemId: Number(parts[1]),
      basePartId: Number(parts[2]),
    }
  }

  const parseKitKey = (key) => {
    const parts = String(key).split(":")
    if (parts[0] !== "kit" || parts.length < 4) return null
    return {
      rfqItemId: Number(parts[1]),
      bundleId: Number(parts[2]),
      roleId: Number(parts[3]),
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
      next.delete(`bom:${rfqItemId}:${basePartId}`)
    }
  }

  const removeKitRolesForBase = (next, rfqItemId, basePartId) => {
    Array.from(next).forEach((key) => {
      const node = selectionNodeMapRef.current.get(key)
      if (
        node?.line_type === "KIT_ROLE" &&
        Number(node.rfq_item_id) === Number(rfqItemId) &&
        Number(node.original_part_id) === Number(basePartId)
      ) {
        next.delete(key)
      }
    })
  }

  const applyAltExclusion = (prevKeys, actionKey, actionChecked) => {
    const next = new Set(prevKeys)
    if (!actionChecked) return next
    const keyStr = String(actionKey)
    if (keyStr.startsWith("alt:")) {
      const parsed = parseAltKey(keyStr)
      if (!parsed) return next
      const lineType = selectionNodeMapRef.current.get(keyStr)?.line_type
      if (!lineType) return next
      removeOriginalForBase(next, lineType, parsed.rfqItemId, parsed.basePartId)
      removeKitRolesForBase(next, parsed.rfqItemId, parsed.basePartId)
      return next
    }
    if (keyStr.startsWith("kit:")) {
      const parsed = parseKitKey(keyStr)
      if (!parsed) return next
      const node = selectionNodeMapRef.current.get(keyStr)
      const basePartId = node?.original_part_id
      if (basePartId) {
        removeOriginalForBase(next, "DEMAND", parsed.rfqItemId, basePartId)
        removeOriginalForBase(next, "BOM_COMPONENT", parsed.rfqItemId, basePartId)
        removeAltForBase(next, parsed.rfqItemId, basePartId)
      }
      return next
    }
    if (keyStr.startsWith("demand:")) {
      const node = selectionNodeMapRef.current.get(keyStr)
      if (node?.original_part_id) {
        removeAltForBase(next, node.rfq_item_id, node.original_part_id)
        removeKitRolesForBase(next, node.rfq_item_id, node.original_part_id)
      }
      return next
    }
    if (keyStr.startsWith("bom:")) {
      const parsed = parseBomKey(keyStr)
      if (parsed) {
        removeAltForBase(next, parsed.rfqItemId, parsed.basePartId)
        removeKitRolesForBase(next, parsed.rfqItemId, parsed.basePartId)
      }
    }
    return next
  }

  useEffect(() => {
    if (!structureItems.length) {
      if (altLoadKeyRef.current) {
        altLoadKeyRef.current = ""
        setAltPartsMap({})
      }
      return
    }
    const ids = new Set()
    structureItems.forEach((item) => {
      if (item.original_part_id) ids.add(item.original_part_id)
      const bomOpt = (item.options || []).find((opt) => opt.type === "BOM")
      collectBomPartIds(bomOpt?.children || [], ids)
    })
    const list = Array.from(ids).filter(Boolean).sort((a, b) => a - b)
    const key = list.join(",")
    if (!key || key === altLoadKeyRef.current) return
    altLoadKeyRef.current = key
    loadAltPartsBulk(list)
  }, [structureItems])

  const selectionTreeData = useMemo(() => {
    const nodeMap = new Map()
    const selectedKeys = new Set(selectionModal.selectedKeys || [])

    const renderSideColumn = ({ hintsBadge, kitSelect, kitTags, altTags }) => (
      <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
        {hintsBadge ? <div>{hintsBadge}</div> : null}
        {kitSelect || kitTags ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <Tag color="green">Комплект</Tag>
            {kitSelect}
            {kitTags}
          </div>
        ) : null}
        {altTags ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <Tag color="orange">Подмена</Tag>
            {altTags}
          </div>
        ) : null}
      </div>
    )

    const buildAltTags = ({ rfqItemId, basePartId, lineType, qty, uom }) => {
      const altParts = altPartsMap[basePartId] || []
      if (!altParts.length) return null
      return (
        <Space size={4} wrap>
          {altParts.map((alt) => {
            const key = `alt:${rfqItemId}:${basePartId}:${alt.alt_part_id}`
            const hints = getOriginalHints(alt.alt_part_id)
            const hasHints = hints.length > 0
            nodeMap.set(key, {
              key,
              line_type: lineType,
              rfq_item_id: rfqItemId,
              original_part_id: basePartId,
              alt_original_part_id: alt.alt_part_id,
              line_label: alt.cat_number || "",
              line_description: alt.description_ru || alt.description_en || "",
              qty: qty ?? null,
              uom: uom || null,
            })
            const label = alt.cat_number || "—"
            const desc = alt.description_ru || alt.description_en || ""
            const isSelected = selectedKeys.has(key)
            const color = isSelected ? "orange" : hasHints ? "blue" : "default"
            return (
              <Tooltip key={key} title={buildHintsTooltip(hints)}>
                <Tag
                  color={color}
                  style={{ cursor: "pointer" }}
                  onClick={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    setSelectionModal((prev) => {
                      const next = new Set(prev.selectedKeys || [])
                      const willSelect = !next.has(key)
                      if (willSelect) {
                        next.add(key)
                      } else {
                        next.delete(key)
                      }
                      const normalized = applyAltExclusion(next, key, willSelect)
                      return { ...prev, selectedKeys: Array.from(normalized) }
                    })
                  }}
                >
                  {label}
                  {desc ? ` · ${desc}` : ""}
                  {hasHints ? ` (${hints.length})` : ""}
                </Tag>
              </Tooltip>
            )
          })}
        </Space>
      )
    }

    const buildKitTags = ({ rfqItemId, basePartId, bundleId, roles, qty, uom }) => {
      if (!bundleId || !Array.isArray(roles) || !roles.length) return null
      return (
        <Space size={4} wrap onClick={(event) => event.stopPropagation()}>
          {roles.map((role) => {
            const roleKey = `kit:${rfqItemId}:${bundleId}:${role.id}`
            const hints = getBundleItemHints(role.id)
            const hasHints = hints.length > 0
            nodeMap.set(roleKey, {
              key: roleKey,
              line_type: "KIT_ROLE",
              rfq_item_id: rfqItemId,
              original_part_id: basePartId || null,
              bundle_id: bundleId,
              bundle_item_id: role.id,
              line_label: role.role_label || "",
              line_description: role.role_label || "",
              qty: (role.qty ?? 1) * (qty ?? 1),
              uom: uom || null,
            })
            const isSelected = selectedKeys.has(roleKey)
            const color = isSelected ? "green" : hasHints ? "blue" : "default"
            return (
              <Tooltip key={roleKey} title={buildHintsTooltip(hints)}>
                <Tag
                  color={color}
                  style={{ cursor: "pointer" }}
                  onClick={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    setSelectionModal((prev) => {
                      const next = new Set(prev.selectedKeys || [])
                      const willSelect = !next.has(roleKey)
                      if (willSelect) {
                        next.add(roleKey)
                      } else {
                        next.delete(roleKey)
                      }
                      const normalized = applyAltExclusion(next, roleKey, willSelect)
                      return { ...prev, selectedKeys: Array.from(normalized) }
                    })
                  }}
                >
                  {role.role_label || "—"}
                  {hasHints ? ` (${hints.length})` : ""}
                </Tag>
              </Tooltip>
            )
          })}
        </Space>
      )
    }

    const buildBomNodes = (nodes, item) => {
      if (!Array.isArray(nodes) || !nodes.length) return []
      return nodes.map((comp) => {
        const key = `bom:${item.rfq_item_id}:${comp.original_part_id}`
        const compHints = comp.original_part_id ? getOriginalHints(comp.original_part_id) : []
        nodeMap.set(key, {
          key,
          line_type: "BOM_COMPONENT",
          rfq_item_id: item.rfq_item_id,
          original_part_id: comp.original_part_id,
          line_label: comp.cat_number || "",
          line_description: comp.description || "",
          qty: comp.required_qty ?? null,
          uom: comp.uom || item.uom || null,
        })

        const children = []

        const compBundleKey = `part:${comp.original_part_id}`
        const selectedBundleId = bundleChoice[compBundleKey]
        const compBundleItems = selectedBundleId
          ? bundleItemsCache[selectedBundleId] || []
          : []

        const compKitChildren = selectedBundleId
          ? compBundleItems.map((role) => {
              const roleKey = `kit:${item.rfq_item_id}:${selectedBundleId}:${role.id}`
              nodeMap.set(roleKey, {
                key: roleKey,
                line_type: "KIT_ROLE",
                rfq_item_id: item.rfq_item_id,
                original_part_id: comp.original_part_id,
                bundle_id: selectedBundleId,
                bundle_item_id: role.id,
                line_label: role.role_label || "",
                line_description: role.role_label || "",
                qty: (role.qty ?? 1) * (comp.required_qty ?? 1),
                uom: comp.uom || item.uom || null,
              })
              return {
                key: roleKey,
                title: (
                  <Space>
                    <Tag color="green">Роль</Tag>
                    <Text>{role.role_label || "—"}</Text>
                  </Space>
                ),
                isLeaf: true,
              }
            })
          : []

        const nested = buildBomNodes(comp.children || [], item)
        if (nested.length) {
          children.push(...nested)
        }

        const altTags = buildAltTags({
          rfqItemId: item.rfq_item_id,
          basePartId: comp.original_part_id,
          lineType: "BOM_COMPONENT",
          qty: comp.required_qty ?? null,
          uom: comp.uom || item.uom || null,
        })

        const kitTags = buildKitTags({
          rfqItemId: item.rfq_item_id,
          basePartId: comp.original_part_id,
          bundleId: selectedBundleId,
          roles: compBundleItems,
          qty: comp.required_qty ?? null,
          uom: comp.uom || item.uom || null,
        })

        const kitSelect =
          (comp.bundle_count || 0) > 0 ? (
            <Select
              size="small"
              style={{ width: 180 }}
              placeholder="Комплект"
              value={selectedBundleId || undefined}
              options={(bundleCache[comp.original_part_id] || []).map((b) => ({
                value: b.id,
                label: b.title || `Комплект #${b.id}`,
              }))}
              onFocus={() => loadBundlesForPart(comp.original_part_id)}
              onClick={(event) => event.stopPropagation()}
              onChange={async (value) => {
                setBundleChoice((prev) => ({ ...prev, [compBundleKey]: value }))
                await loadBundleItems(value)
              }}
            />
          ) : null

        return {
          key,
          title: (
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, width: "100%" }}>
              <Space>
                <Text>{comp.cat_number || "—"}</Text>
                {comp.description ? <Text type="secondary">· {comp.description}</Text> : null}
              </Space>
              {renderSideColumn({ hintsBadge: renderHintsBadge(compHints), kitSelect, kitTags, altTags })}
            </div>
          ),
          children,
        }
      })
    }

    const tree = structureItems.map((item) => {
      const itemNodeKey = `item:${item.rfq_item_id}`
      const itemTitle = (
        <Space>
          <Tag>{item.line_number}</Tag>
          <Text strong>{item.original_cat_number || item.client_part_number || "—"}</Text>
          <Text type="secondary">{item.description || ""}</Text>
        </Space>
      )

      const demandKey = `demand:${item.rfq_item_id}`
      nodeMap.set(demandKey, {
        key: demandKey,
        line_type: "DEMAND",
        rfq_item_id: item.rfq_item_id,
        original_part_id: item.original_part_id || null,
        line_label: item.original_cat_number || item.client_part_number || "",
        line_description: item.description || "",
        qty: item.requested_qty ?? null,
        uom: item.uom || null,
      })

      const children = [
        {
          key: demandKey,
          title: (
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, width: "100%" }}>
              <Space>
                <Text>Позиция (оригинал)</Text>
                <Text type="secondary">{item.original_cat_number || item.client_part_number || ""}</Text>
              </Space>
              {renderHintsBadge(item.original_part_id ? getOriginalHints(item.original_part_id) : [])}
            </div>
          ),
          isLeaf: true,
        },
      ]

      if (item.original_part_id) {
        const itemBundleKey = `item:${item.rfq_item_id}`
        const selectedBundleId = bundleChoice[itemBundleKey]
        const bundleItems = selectedBundleId ? bundleItemsCache[selectedBundleId] || [] : []

        const altTags = buildAltTags({
          rfqItemId: item.rfq_item_id,
          basePartId: item.original_part_id,
          lineType: "DEMAND",
          qty: item.requested_qty ?? null,
          uom: item.uom || null,
        })

        const kitTags = buildKitTags({
          rfqItemId: item.rfq_item_id,
          basePartId: item.original_part_id,
          bundleId: selectedBundleId,
          roles: bundleItems,
          qty: item.requested_qty ?? null,
          uom: item.uom || null,
        })

        const kitSelect =
          (item.bundle_count || 0) > 0 ? (
            <Select
              size="small"
              style={{ width: 180 }}
              placeholder="Комплект"
              value={selectedBundleId || undefined}
              options={(bundleCache[item.original_part_id] || []).map((b) => ({
                value: b.id,
                label: b.title || `Комплект #${b.id}`,
              }))}
              onFocus={() => item.original_part_id && loadBundlesForPart(item.original_part_id)}
              onClick={(event) => event.stopPropagation()}
              onChange={async (value) => {
                setBundleChoice((prev) => ({ ...prev, [itemBundleKey]: value }))
                await loadBundleItems(value)
              }}
            />
          ) : null

        if (altTags) {
          children.push({
            key: `alt-inline:${item.rfq_item_id}:${item.original_part_id}`,
            title: (
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, width: "100%" }}>
                <Space>
                  <Text>Подмена</Text>
                </Space>
                {renderSideColumn({ hintsBadge: null, kitSelect, kitTags, altTags })}
              </div>
            ),
            selectable: false,
            checkable: false,
            isLeaf: true,
          })
        } else if (kitSelect || kitTags) {
          children.push({
            key: `kit-inline:${item.rfq_item_id}:${item.original_part_id}`,
            title: (
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, width: "100%" }}>
                <Space>
                  <Text>Комплект</Text>
                </Space>
                {renderSideColumn({ hintsBadge: null, kitSelect, kitTags, altTags: null })}
              </div>
            ),
            selectable: false,
            checkable: false,
            isLeaf: true,
          })
        }
      }

      const bomOpt = (item.options || []).find((opt) => opt.type === "BOM")
      const bomChildren = buildBomNodes(bomOpt?.children || [], item)
      if (bomChildren.length) {
        children.push({
          key: `bomgroup:${item.rfq_item_id}`,
          title: "BOM компоненты",
          selectable: false,
          checkable: false,
          children: bomChildren,
        })
      }

      return {
        key: itemNodeKey,
        title: itemTitle,
        selectable: false,
        checkable: false,
        children,
      }
    })

    selectionNodeMapRef.current = nodeMap
    return tree
  }, [structureItems, bundleChoice, bundleCache, bundleItemsCache, loadBundleItems, loadBundlesForPart, altPartsMap, selectionModal.selectedKeys, activeSupplierHints])

  const selectionTreeDataVisible = useMemo(() => {
    if (!selectionModal.onlyHinted) return selectionTreeData
    if (!activeSupplierHints) return selectionTreeData
    return filterSelectionTree(selectionTreeData)
  }, [selectionTreeData, selectionModal.onlyHinted, activeSupplierHints, altPartsMap, bundleChoice, bundleItemsCache])
  const rfqTreeData = useMemo(() => {
    const mapBomNodes = (nodes) => {
      if (!Array.isArray(nodes)) return []
      return nodes.map((node) => ({
        key: `bom-${node.original_part_id}-${node.key || Math.random()}`,
        type: "BOM_COMPONENT",
        original_part_id: node.original_part_id || null,
        cat_number: node.cat_number,
        description: node.description,
        required_qty: node.required_qty,
        uom: node.uom,
        has_bom: Array.isArray(node.children) && node.children.length > 0,
        bundle_count: node.bundle_count || 0,
        children: mapBomNodes(node.children || []),
      }))
    }

    return structureItems.map((item) => {
      const bomOption = (item.options || []).find((opt) => opt.type === "BOM")
      const children = mapBomNodes(bomOption?.children || [])
      return {
        key: `demand-${item.rfq_item_id}`,
        type: "DEMAND",
        rfq_item_id: item.rfq_item_id,
        line_number: item.line_number,
        original_part_id: item.original_part_id || null,
        original_cat_number: item.original_cat_number,
        client_part_number: item.client_part_number,
        description: item.description,
        requested_qty: item.requested_qty,
        uom: item.uom,
        has_bom: item.has_bom,
        bundle_count: item.bundle_count,
        children,
      }
    })
  }, [structureItems])
  const activeStep = TAB_TO_STEP[activeTabKey] ?? 0
  const isStructureConfirmed = true

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
      title: "Ответственный",
      dataIndex: "assigned_user_name",
      width: 180,
      render: (value) => value || "—",
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
      render: (value) => <Tag color={statusToColor(value)}>{rfqStatusLabel(value)}</Tag>,
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
        if (record.type === "BOM_COMPONENT") {
          return record.cat_number || "-"
        }
        return "-"
      },
    },
    {
      title: "Описание",
      dataIndex: "description",
      render: (value, record) => {
        return value || "-"
      },
    },
    {
      title: "Признаки",
      dataIndex: "flags",
      width: 160,
      render: (_, record) => {
        const tags = []
        if (record.has_bom) {
          tags.push(<Tag key="assembly" color="blue">Сборка</Tag>)
        }
        if ((record.bundle_count || 0) > 0) {
          tags.push(
            <Tag
              key="kit"
              color="green"
              style={{ cursor: "pointer" }}
              onClick={() => openKitPreview(record.original_part_id)}
            >
              Комплект
            </Tag>
          )
        }
        const altCount =
          record.original_part_id && altPartsMap[record.original_part_id]
            ? altPartsMap[record.original_part_id].length
            : 0
        if (altCount > 0) {
          tags.push(
            <Tag
              key="alt"
              color="orange"
              style={{ cursor: "pointer" }}
              onClick={() => openAltModal(record.original_part_id)}
            >
              Альтернативы {altCount}
            </Tag>
          )
        }
        return tags.length ? <Space size={4} wrap>{tags}</Space> : "—"
      },
    },
    {
      title: "Кол-во",
      dataIndex: "qty",
      width: 100,
      render: (_, record) => {
        if (record.type === "DEMAND") return record.requested_qty ?? "-"
        if (record.type === "BOM_COMPONENT") return record.required_qty ?? "-"
        return "-"
      },
    },
    {
      title: "Ед.",
      dataIndex: "uom",
      width: 80,
      render: (_, record) => {
        if (record.type === "DEMAND") return record.uom || "-"
        if (record.type === "BOM_COMPONENT") return record.uom || "-"
        return "-"
      },
    },
    {
      title: "Тип",
      dataIndex: "type",
      width: 120,
      render: (value, record) => {
        if (record.type === "DEMAND") return <Tag>Заявка</Tag>
        if (record.type === "BOM_COMPONENT") return <Tag>Компонент</Tag>
        return "-"
      },
    },
  ]

  return (
    <PageWrapper
      title="RFQ Workspace"
      helpText="Сквозной поток по RFQ: от назначенного релиза заявки до заказа поставщику."
    >
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
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
                    {rfqStatusLabel(activeRfq.status)}
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
                          <Tag color="blue">Структура (обзор)</Tag>
                          <Text type="secondary">
                            Показываем состав заявки и признаки сборок/комплектов.
                          </Text>
                        </Space>
                        <Table
                          rowKey="key"
                          loading={!structure && !!activeRfqId}
                          dataSource={rfqTreeData}
                          pagination={false}
                          columns={rfqStructureColumns}
                          onRow={(record) => {
                            if (Number(record.bundle_count || 0) > 0) {
                              return { style: { background: "#f1fff2" } }
                            }
                            if (record.type === "DEMAND" && record.has_bom) {
                              return { style: { background: "#f0f7ff" } }
                            }
                            return {}
                          }}
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
                                title: "RU",
                                width: 70,
                                align: "center",
                                render: (_, record) => (
                                  <Checkbox
                                    checked={(record.language || "ru") === "ru"}
                                    onChange={() =>
                                      handleSupplierLanguage(record, "ru")
                                    }
                                  />
                                ),
                              },
                              {
                                title: "EN",
                                width: 70,
                                align: "center",
                                render: (_, record) => (
                                  <Checkbox
                                    checked={(record.language || "ru") === "en"}
                                    onChange={() =>
                                      handleSupplierLanguage(record, "en")
                                    }
                                  />
                                ),
                              },
                              {
                                title: "Настройка",
                                width: 130,
                                render: (_, record) => (
                                  <Button size="small" onClick={() => openSelectionModal(record)}>
                                    Структура
                                  </Button>
                                ),
                              },
                              {
                                title: "Статус",
                                dataIndex: "status",
                                width: 120,
                                render: (value) => (
                                  <Tag color={statusToColor(value)}>
                                    {supplierStatusLabel(value || "invited")}
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
        open={selectionModal.open}
        onCancel={() => setSelectionModal((prev) => ({ ...prev, open: false }))}
        title={`Структура для поставщика: ${selectionModal.supplier?.supplier_name || ""}`}
        width={1000}
        okText="Сохранить"
        onOk={() => saveSelections(selectionNodeMapRef.current)}
        confirmLoading={selectionModal.saving}
      >
        {selectionModal.loading ? (
          <Text type="secondary">Загрузка…</Text>
        ) : (
          <Space direction="vertical" style={{ width: "100%" }} size={12}>
            <Space wrap align="center">
              <Checkbox
                checked={selectionModal.onlyHinted}
                disabled={!activeSupplierHints}
                onChange={(e) =>
                  setSelectionModal((prev) => ({ ...prev, onlyHinted: e.target.checked }))
                }
              >
                Показать только где есть
              </Checkbox>
              <Button disabled={!activeSupplierHints} onClick={handleSelectAllHinted}>
                Отметить всё где есть
              </Button>
              {!activeSupplierHints ? (
                <Text type="secondary">Нет подсказок по поставщику</Text>
              ) : null}
            </Space>
            <Tree
              checkable
              checkStrictly
              defaultExpandAll
              showLine
              checkedKeys={selectionModal.selectedKeys}
              onCheck={(checked, info) => {
                const next = new Set(Array.isArray(checked) ? checked : checked.checked)
                const actionKey = info?.node?.key
                const actionChecked = info?.checked
                const normalized =
                  actionKey !== undefined
                    ? applyAltExclusion(next, actionKey, actionChecked)
                    : next
                setSelectionModal((prev) => ({ ...prev, selectedKeys: Array.from(normalized) }))
              }}
              treeData={selectionTreeDataVisible}
            />
          </Space>
        )}
      </Modal>

      <Modal
        open={kitPreview.open}
        onCancel={() =>
          setKitPreview({
            open: false,
            partId: null,
            bundles: [],
            bundleId: null,
            items: [],
            loading: false,
          })
        }
        title="Роли комплекта"
        width={700}
        footer={<Button onClick={() => setKitPreview((prev) => ({ ...prev, open: false }))}>Закрыть</Button>}
      >
        {kitPreview.loading ? (
          <Text type="secondary">Загрузка…</Text>
        ) : (
          <Space direction="vertical" style={{ width: "100%" }}>
            <Select
              placeholder="Выберите комплект"
              value={kitPreview.bundleId || undefined}
              options={kitPreview.bundles.map((b) => ({
                value: b.id,
                label: b.title || `Комплект #${b.id}`,
              }))}
              onChange={async (value) => {
                const items = await loadBundleItems(value)
                setKitPreview((prev) => ({
                  ...prev,
                  bundleId: value,
                  items: Array.isArray(items) ? items : [],
                }))
              }}
              style={{ width: 360 }}
            />
            <Table
              rowKey="id"
              dataSource={kitPreview.items}
              pagination={false}
              columns={[
                { title: "Роль", dataIndex: "role_label" },
                { title: "Кол-во", dataIndex: "qty", width: 120 },
              ]}
            />
          </Space>
        )}
      </Modal>

      <Modal
        open={altModal.open}
        onCancel={() =>
          setAltModal({ open: false, loading: false, partId: null, items: [] })
        }
        title="Альтернативные оригиналы"
        width={820}
        footer={
          <Button
            onClick={() =>
              setAltModal({ open: false, loading: false, partId: null, items: [] })
            }
          >
            Закрыть
          </Button>
        }
      >
        {altModal.loading ? (
          <Text type="secondary">Загрузка…</Text>
        ) : (
          <Table
            rowKey={(row) => row.alt_part_id}
            dataSource={altModal.items}
            pagination={false}
            size="small"
            columns={[
              { title: "Part #", dataIndex: "cat_number", width: 160 },
              {
                title: "Описание",
                render: (_, r) => r.description_ru || r.description_en || "—",
              },
              { title: "Производитель", dataIndex: "manufacturer_name", width: 200 },
              { title: "Модель", dataIndex: "model_name", width: 200 },
            ]}
          />
        )}
      </Modal>

    </PageWrapper>
  )
}

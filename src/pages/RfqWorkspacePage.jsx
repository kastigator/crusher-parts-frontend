import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Button, Card, Checkbox, Form, Input, Modal, Select, Space, Steps, Table, Tabs, Tag, Tooltip, Tree, Typography, message } from "antd"
import { DeleteOutlined } from "@ant-design/icons"
import dayjs from "dayjs"
import PageWrapper from "@/components/common/PageWrapper"
import AltPartsModal from "@/components/rfqWorkspace/AltPartsModal"
import ContractsTabContent from "@/components/rfqWorkspace/ContractsTabContent"
import CoverageTabContent from "@/components/rfqWorkspace/CoverageTabContent"
import EconomicsTabContent from "@/components/rfqWorkspace/EconomicsTabContent"
import ImportResponsesModal from "@/components/rfqWorkspace/ImportResponsesModal"
import KitPreviewModal from "@/components/rfqWorkspace/KitPreviewModal"
import PurchaseOrdersTabContent from "@/components/rfqWorkspace/PurchaseOrdersTabContent"
import ResponsesTabContent from "@/components/rfqWorkspace/ResponsesTabContent"
import RfqOverviewTabContent from "@/components/rfqWorkspace/RfqOverviewTabContent"
import RfqWorkspaceMainContent from "@/components/rfqWorkspace/RfqWorkspaceMainContent"
import SalesTabContent from "@/components/rfqWorkspace/SalesTabContent"
import SelectionTabContent from "@/components/rfqWorkspace/SelectionTabContent"
import SelectionStructureModal from "@/components/rfqWorkspace/SelectionStructureModal"
import SuppliersTabContent from "@/components/rfqWorkspace/SuppliersTabContent"
import SupplierCreateModal from "@/components/rfqWorkspace/SupplierCreateModal"
import {
  buildPriceSourceText,
  formatDate,
  formatHintDate,
  renderMatchTypes,
  rfqStatusLabel,
  STEP_LABELS,
  STEP_TO_TAB,
  statusToColor,
  supplierStatusLabel,
  TAB_TO_STEP,
} from "@/components/rfqWorkspace/rfqWorkspaceUtils"
import { applyAltExclusionToKeys } from "@/components/rfqWorkspace/rfqSelectionUtils"
import axios from "@/api/axiosInstance"
import { formatPriceWithCurrency } from "@/utils/priceFormat"
import confirmAction from "@/utils/confirmAction"
import { useAuth } from "@/auth/AuthContext"
import { useLocation } from "react-router-dom"

const { Text } = Typography

const debugLog = (...args) => {
  if (typeof window !== "undefined" && window.__RFQ_DEBUG__) {
    console.log("[RFQ]", ...args)
  }
}

export default function RfqWorkspacePage() {
  const { user } = useAuth()
  const location = useLocation()
  const selectionNodeMapRef = useRef(new Map())
  const [rfqs, setRfqs] = useState([])
  const [_requests, _setRequests] = useState([])
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
  const [_rfqDocuments, setRfqDocuments] = useState([])
  const [docsLoading, setDocsLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [supplierSendingId, setSupplierSendingId] = useState(null)
  const [selectedSupplierIds, setSelectedSupplierIds] = useState([])
  const [supplierCreateOpen, setSupplierCreateOpen] = useState(false)
  const [autoAddCreatedSupplier, setAutoAddCreatedSupplier] = useState(true)
  const [responses, setResponses] = useState([])
  const [responseLines, setResponseLines] = useState([])
  const [responseWorkspaceRows, setResponseWorkspaceRows] = useState([])
  const [showArchivedResponses, setShowArchivedResponses] = useState(false)
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
    acceptedKeys: [],
    acceptedPriceByKey: {},
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
  const [dispatchSummary, setDispatchSummary] = useState([])
  const [dispatches, setDispatches] = useState([])
  const [sendIncludePriced, setSendIncludePriced] = useState(false)
  const [importModal, setImportModal] = useState({
    open: false,
    supplierId: null,
    detectedSupplierId: null,
    detectedSupplierName: "",
    text: "",
    rows: [],
    loading: false,
    fileName: "",
    newRevision: false,
  })
  const [_lineStatuses, setLineStatuses] = useState({})
  const [lineStatusSaving, setLineStatusSaving] = useState(false)

  const [createForm] = Form.useForm()
  const [supplierForm] = Form.useForm()
  const [supplierCreateForm] = Form.useForm()
  const [_users, _setUsers] = useState([])
  const autoFillRef = useRef(new Set())
  const supplierSelectionInitRef = useRef(false)
  const hintTypeOrder = useRef({ OEM: 0, ANALOG: 1, UNKNOWN: 2 })

  const activeSupplierHints = useMemo(() => {
    const supplierId = selectionModal?.supplier?.supplier_id
    return selectionModal?.hints || (supplierId ? supplierHintsCache[supplierId] : null) || null
  }, [selectionModal?.hints, selectionModal?.supplier?.supplier_id, supplierHintsCache])

  const getOriginalHints = useCallback(
    (partId) => activeSupplierHints?.originals?.[String(partId)] || [],
    [activeSupplierHints]
  )
  const getBundleItemHints = useCallback(
    (bundleItemId) => activeSupplierHints?.bundle_items?.[String(bundleItemId)] || [],
    [activeSupplierHints]
  )

  const sortHints = useCallback(
    (hints) =>
      (Array.isArray(hints) ? [...hints] : []).sort((a, b) => {
        const oa = hintTypeOrder.current[String(a?.part_type || "UNKNOWN")] ?? 99
        const ob = hintTypeOrder.current[String(b?.part_type || "UNKNOWN")] ?? 99
        return (
          oa - ob ||
          String(a?.supplier_part_number || "").localeCompare(
            String(b?.supplier_part_number || "")
          )
        )
      }),
    []
  )

  const buildHintPriceChoices = useCallback((hints) => {
    const result = []
    const seen = new Set()
    sortHints(hints).forEach((hint, hintIndex) => {
      const history =
        Array.isArray(hint?.price_history) && hint.price_history.length
          ? hint.price_history
          : [
              {
                price_id: `latest:${hint?.supplier_part_id || hintIndex}`,
                price: hint?.latest_price,
                currency: hint?.latest_currency,
                date: hint?.latest_price_date,
                offer_type: hint?.part_type || "UNKNOWN",
                lead_time_days: hint?.lead_time_days,
                min_order_qty: hint?.min_order_qty,
                packaging: hint?.packaging,
                validity_days: hint?.latest_price_validity_days,
                source_type: hint?.latest_price_source_type || null,
                source_subtype:
                  hint?.latest_price_source_subtype ||
                  hint?.latest_price_entry_source ||
                  null,
                source_id:
                  hint?.latest_price_price_list_id ||
                  hint?.latest_price_rfq_id ||
                  null,
                rfq_id: hint?.latest_price_rfq_id || null,
                rfq_number: hint?.latest_price_rfq_number || null,
                rfq_response_rev_number: hint?.latest_price_rfq_rev_number || null,
                price_list_id: hint?.latest_price_price_list_id || null,
                price_list_code: hint?.latest_price_price_list_code || null,
                price_list_name: hint?.latest_price_price_list_name || null,
                price_list_valid_from: hint?.latest_price_price_list_valid_from || null,
                price_list_valid_to: hint?.latest_price_price_list_valid_to || null,
                comment: null,
                response_entry_source: hint?.latest_price_entry_source || null,
              },
            ]

      history.forEach((entry, entryIndex) => {
        const price = Number(entry?.price)
        const currency = String(entry?.currency || "").toUpperCase()
        if (!Number.isFinite(price) || !currency) return
        const sourceType = String(
          entry?.source_type || hint?.latest_price_source_type || ""
        ).toUpperCase()
        const sourceSubtype = String(
          entry?.source_subtype ||
            entry?.response_entry_source ||
            hint?.latest_price_source_subtype ||
            hint?.latest_price_entry_source ||
            ""
        ).toUpperCase()
        const key =
          entry?.price_id != null
            ? String(entry.price_id)
            : `${hint?.supplier_part_id || "sp"}:${sourceType}:${sourceSubtype}:${
                entry?.source_id || "src"
              }:${entry?.date || "date"}:${entryIndex}`
        if (seen.has(key)) return
        seen.add(key)

        result.push({
          key,
          price,
          currency,
          date: entry?.date || hint?.latest_price_date || null,
          offer_type: entry?.offer_type || hint?.part_type || "UNKNOWN",
          lead_time_days:
            entry?.lead_time_days != null ? entry.lead_time_days : hint?.lead_time_days,
          min_order_qty:
            entry?.min_order_qty != null ? entry.min_order_qty : hint?.min_order_qty,
          packaging: entry?.packaging != null ? entry.packaging : hint?.packaging,
          validity_days:
            entry?.validity_days != null
              ? entry.validity_days
              : hint?.latest_price_validity_days,
          source_type: sourceType || null,
          source_subtype: sourceSubtype || null,
          source_id: entry?.source_id || null,
          source_price_id: entry?.price_id || null,
          rfq_id: entry?.rfq_id || hint?.latest_price_rfq_id || null,
          rfq_number: entry?.rfq_number || hint?.latest_price_rfq_number || null,
          rfq_response_rev_number:
            entry?.rfq_response_rev_number || hint?.latest_price_rfq_rev_number || null,
          price_list_id: entry?.price_list_id || hint?.latest_price_price_list_id || null,
          price_list_code:
            entry?.price_list_code || hint?.latest_price_price_list_code || null,
          price_list_name:
            entry?.price_list_name || hint?.latest_price_price_list_name || null,
          price_list_valid_from:
            entry?.price_list_valid_from ||
            hint?.latest_price_price_list_valid_from ||
            null,
          price_list_valid_to:
            entry?.price_list_valid_to || hint?.latest_price_price_list_valid_to || null,
          comment: entry?.comment || null,
          supplier_part_id: hint?.supplier_part_id || null,
          supplier_part_number: hint?.supplier_part_number || null,
          supplier_part_description: hint?.description_ru || hint?.description_en || null,
          part_type: hint?.part_type || null,
        })
      })
    })

    return result.sort((a, b) => {
      const aDate = dayjs(a.date).valueOf()
      const bDate = dayjs(b.date).valueOf()
      const aSafe = Number.isFinite(aDate) ? aDate : 0
      const bSafe = Number.isFinite(bDate) ? bDate : 0
      if (aSafe !== bSafe) return bSafe - aSafe
      return String(a.supplier_part_number || "").localeCompare(
        String(b.supplier_part_number || "")
      )
    })
  }, [sortHints])

  const isHintPriced = useCallback(
    (hint) => buildHintPriceChoices([hint]).length > 0,
    [buildHintPriceChoices]
  )

  const buildHintsTooltip = useCallback((hints) => {
    const list = sortHints(hints)
    if (!list.length) return null
    return (
      <div style={{ maxWidth: 520 }}>
        {list.slice(0, 12).map((h, idx) => (
          <div
            key={`${h.supplier_part_id || h.supplier_part_number || idx}`}
            style={{ marginBottom: idx === Math.min(list.length, 12) - 1 ? 0 : 8 }}
          >
            <div style={{ fontSize: 12, fontWeight: 600 }}>
              Вариант {idx + 1}: {h.supplier_part_number || "—"}{" "}
              {h.part_type ? `(${h.part_type})` : ""}
            </div>
            {h.description_ru || h.description_en ? (
              <div style={{ color: "#6b7280", fontSize: 12 }}>
                {h.description_ru || h.description_en}
              </div>
            ) : null}
            <div style={{ color: "#4b5563", fontSize: 12 }}>
              Цена:{" "}
              {h?.latest_price != null
                ? formatPriceWithCurrency(h.latest_price, h.latest_currency)
                : "не задана"}
            </div>
            <div style={{ color: "#6b7280", fontSize: 12 }}>
              Источник: {buildPriceSourceText(h) || "—"}
              {h?.latest_price_date ? ` · ${formatHintDate(h.latest_price_date)}` : ""}
            </div>
          </div>
        ))}
        {list.length > 12 ? <div>…ещё {list.length - 12}</div> : null}
      </div>
    )
  }, [sortHints])

  const renderHintsBadge = useCallback((hints) => {
    const list = sortHints(hints).filter(isHintPriced)
    if (!list.length) return null
    const pricedCount = list.length
    const preview = list.slice(0, 2)
    const more = Math.max(0, list.length - preview.length)
    const tooltip = buildHintsTooltip(list)
    return (
      <Tooltip title={tooltip} placement="left">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
          <Tag color={pricedCount > 0 ? "blue" : "default"} style={{ marginInlineEnd: 0 }}>
            {pricedCount > 0 ? `Варианты с ценой: ${pricedCount}` : `Варианты без цены: ${list.length}`}
          </Tag>
          {preview.map((h, idx) => {
            const choice = buildHintPriceChoices([h])[0] || null
            const source = choice ? buildPriceSourceText(choice) : buildPriceSourceText(h)
            const price = choice
              ? formatPriceWithCurrency(choice.price, choice.currency)
              : formatPriceWithCurrency(h.latest_price, h.latest_currency)
            const date = formatHintDate(choice?.date || h?.latest_price_date)
            return (
              <div
                key={`${h?.supplier_part_id || h?.supplier_part_number || idx}`}
                style={{
                  border: "1px solid #dbeafe",
                  background: "#f8fbff",
                  borderRadius: 6,
                  padding: "4px 8px",
                  minWidth: 280,
                  maxWidth: 360,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 2 }}>
                  <Text strong style={{ fontSize: 12 }}>
                    Вариант {idx + 1}: {h?.supplier_part_number || "Без номера"}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {h?.part_type || "UNKNOWN"}
                  </Text>
                </div>
                {h?.description_ru || h?.description_en ? (
                  <Text type="secondary" style={{ fontSize: 12, display: "block" }}>
                    {h.description_ru || h.description_en}
                  </Text>
                ) : null}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 2, alignItems: "center" }}>
                  <Text style={{ fontSize: 12, fontWeight: 600 }}>
                    Цена: {price}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Источник: {source || "—"}
                  </Text>
                  {date ? (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Дата: {date}
                    </Text>
                  ) : null}
                </div>
              </div>
            )
          })}
          {more > 0 ? (
            <Text type="secondary" style={{ fontSize: 12 }}>
              + еще {more} вариантов (наведите для деталей)
            </Text>
          ) : null}
        </div>
      </Tooltip>
    )
  }, [sortHints, buildHintsTooltip, isHintPriced, buildHintPriceChoices])

  const hasHintsForSelectionKey = useCallback((key) => {
    if (!activeSupplierHints) return false
    const meta = selectionNodeMapRef.current.get(String(key))
    const type = String(meta?.line_type || "").toUpperCase()
    if (type === "DEMAND" || type === "BOM_COMPONENT") {
      const effectivePartId = meta?.alt_original_part_id || meta?.original_part_id
      if (!effectivePartId) return false
      return buildHintPriceChoices(getOriginalHints(effectivePartId)).length > 0
    }
    if (type === "KIT_ROLE") {
      const id = meta?.bundle_item_id
      if (!id) return false
      return buildHintPriceChoices(getBundleItemHints(id)).length > 0
    }
    return false
  }, [activeSupplierHints, getOriginalHints, getBundleItemHints, buildHintPriceChoices])

  const applyAltExclusion = useCallback(
    (prevKeys, actionKey, actionChecked) =>
      applyAltExclusionToKeys(
        prevKeys,
        actionKey,
        actionChecked,
        selectionNodeMapRef.current,
      ),
    [],
  )

  const applySelectedKeysWithCleanup = useCallback((prevState, selectedSet) => {
    const accepted = new Set(prevState.acceptedKeys || [])
    const acceptedPriceByKey = { ...(prevState.acceptedPriceByKey || {}) }
    Array.from(accepted).forEach((key) => {
      if (!selectedSet.has(key)) {
        accepted.delete(key)
        delete acceptedPriceByKey[key]
      }
    })
    return {
      ...prevState,
      selectedKeys: Array.from(selectedSet),
      acceptedKeys: Array.from(accepted),
      acceptedPriceByKey,
    }
  }, [])

  const clearKitRoleSelectionForContext = useCallback(
    ({ rfqItemId, originalPartId, rfqItemComponentId = null }) => {
      if (!rfqItemId || !originalPartId) return
      setSelectionModal((prev) => {
        const next = new Set(prev.selectedKeys || [])
        Array.from(next).forEach((key) => {
          const keyStr = String(key)
          if (!keyStr.startsWith(`kit:${rfqItemId}:`)) return
          const node = selectionNodeMapRef.current.get(keyStr)
          const nodeOriginalId = Number(node?.original_part_id || 0)
          const nodeComponentId = Number(node?.rfq_item_component_id || 0)
          if (!node && keyStr.startsWith(`kit:${rfqItemId}:`)) {
            next.delete(keyStr)
            return
          }
          if (nodeOriginalId !== Number(originalPartId || 0)) return
          if (nodeComponentId !== Number(rfqItemComponentId || 0)) return
          next.delete(keyStr)
        })
        return applySelectedKeysWithCleanup(prev, next)
      })
    },
    [applySelectedKeysWithCleanup]
  )

  const selectKitRoleQuick = useCallback(
    (roleKey) => {
      const keyStr = String(roleKey || "")
      if (!keyStr) return
      const node = selectionNodeMapRef.current.get(keyStr)
      if (!node) return
      const rfqItemId = Number(node.rfq_item_id || 0)
      const originalPartId = Number(node.original_part_id || 0)
      const rfqItemComponentId = Number(node.rfq_item_component_id || 0)
      if (!rfqItemId || !originalPartId) return
      setSelectionModal((prev) => {
        const next = new Set(prev.selectedKeys || [])
        selectionNodeMapRef.current.forEach((meta, key) => {
          if (String(meta?.line_type || "").toUpperCase() !== "KIT_ROLE") return
          if (Number(meta?.rfq_item_id || 0) !== rfqItemId) return
          if (Number(meta?.original_part_id || 0) !== originalPartId) return
          if (Number(meta?.rfq_item_component_id || 0) !== rfqItemComponentId) return
          next.delete(String(key))
        })
        next.add(keyStr)
        const normalized = applyAltExclusion(next, keyStr, true)
        return applySelectedKeysWithCleanup(prev, normalized)
      })
    },
    [applyAltExclusion, applySelectedKeysWithCleanup]
  )

  const filterSelectionTree = useCallback((nodes) => {
    const list = Array.isArray(nodes) ? nodes : []
    const walk = (node) => {
      const children = Array.isArray(node.children) ? node.children : []
      const keptChildren = children.map(walk).filter(Boolean)
      if (keptChildren.length) return { ...node, children: keptChildren }

      if (node.checkable === false) {
        // Group/helper nodes are kept only when they have visible children.
        return null
      }

      return hasHintsForSelectionKey(node.key) ? node : null
    }
    return list.map(walk).filter(Boolean)
  }, [hasHintsForSelectionKey])

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
    setSelectionModal((prev) => applySelectedKeysWithCleanup(prev, next))
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

  // Подхватываем rfq_id из query/state при переходе из дашборда
  useEffect(() => {
    if (!rfqs.length) return
    const params = new URLSearchParams(location.search || "")
    const queryId = Number(params.get("rfq") || params.get("rfq_id"))
    const stateId = Number(location.state?.rfqId || location.state?.rfq_id)
    const desiredId = Number.isFinite(queryId) && queryId > 0
      ? queryId
      : Number.isFinite(stateId) && stateId > 0
      ? stateId
      : null
    if (desiredId && rfqs.some((row) => Number(row.id) === Number(desiredId))) {
      setActiveRfqId(desiredId)
    }
  }, [location, rfqs])

  // обновлять сводку/историю отправок при смене активного RFQ или его ревизии
  useEffect(() => {
    if (activeRfqId) {
      loadDispatchSummary(activeRfqId)
      loadDispatches(activeRfqId)
    }
  }, [activeRfqId, activeRfq?.rev_number])

  // Автовыбор первого RFQ, если еще не выбрали ничего
  useEffect(() => {
    if (!activeRfqId && rfqs.length) {
      setActiveRfqId(rfqs[0].id)
    }
  }, [rfqs, activeRfqId])

  useEffect(() => {
    if (user?.id) {
      createForm.setFieldsValue({ assigned_to_user_id: user.id })
    }
  }, [createForm, user])

  const _loadRevisions = async (requestId) => {
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

  const loadDispatchSummary = async (rfqId) => {
    if (!rfqId) {
      setDispatchSummary([])
      return
    }
    try {
      const { data } = await axios.get(`/rfqs/${rfqId}/dispatch-summary`)
      setDispatchSummary(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
    }
  }

  const loadDispatches = async (rfqId) => {
    if (!rfqId) {
      setDispatches([])
      return
    }
    try {
      const { data } = await axios.get(`/rfqs/${rfqId}/dispatches`)
      setDispatches(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
    }
  }

  const loadResponsesAndLines = async (rfqId, includeArchived = showArchivedResponses) => {
    const id = Number(rfqId)
    if (!Number.isFinite(id) || id <= 0) {
      setResponses([])
      setResponseLines([])
      setResponseWorkspaceRows([])
      return
    }
    try {
      const [respHeaders, respLines, workspaceRows] = await Promise.all([
        axios.get("/supplier-responses"),
        axios.get("/supplier-responses/lines", {
          params: { rfq_id: id, include_archived: includeArchived ? 1 : undefined },
        }),
        axios.get("/supplier-responses/workspace", {
          params: { rfq_id: id, include_archived: includeArchived ? 1 : undefined },
        }),
      ])
      const responseList = Array.isArray(respHeaders.data) ? respHeaders.data : []
      const responseLinesList = Array.isArray(respLines.data) ? respLines.data : []
      const workspaceList = Array.isArray(workspaceRows.data) ? workspaceRows.data : []
      setResponses(responseList.filter((row) => Number(row.rfq_id) === Number(rfqId)))
      setResponseLines(responseLinesList)
      setResponseWorkspaceRows(workspaceList)
    } catch (e) {
      // не блокируем UI, просто лог
      console.debug("loadResponsesAndLines skip:", e?.response?.data || e?.message)
    }
  }

  const _handleCreateRfq = async (values) => {
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
      setResponseWorkspaceRows([])
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
        let attempts = 0
        const maxAttempts = 3
        const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

        try {
          const rfq = rfqs.find((row) => Number(row.id) === Number(activeRfqId)) || null
          setActiveRfq(rfq || null)

        const safeGet = async (promise, fallback) => {
          try {
            const resp = await promise
            return resp?.data ?? fallback
          } catch (err) {
            console.debug("loadDetails safeGet", err?.response?.config?.url, err?.response?.data || err?.message)
            return fallback
          }
        }

        let itemsData = []
        let suppliersData = []
        let suggestedData = []
        let docsData = []
        let responsesData = []
        let workspaceData = []
        let structureData = null
        let coverageData = []
        let selectionsData = []
        let dispatchSummaryData = []
        let dispatchesData = []
        let groupsData = []
        let landedData = []
        let quotesData = []
        let contractsData = []
        let poData = []

        while (!cancelled && attempts < maxAttempts) {
          attempts += 1
          ;[
            itemsData,
            suppliersData,
            suggestedData,
            docsData,
            responsesData,
            workspaceData,
            structureData,
            coverageData,
            selectionsData,
            dispatchSummaryData,
            dispatchesData,
            groupsData,
            landedData,
            quotesData,
            contractsData,
            poData,
          ] = await Promise.all([
            safeGet(axios.get(`/rfqs/${activeRfqId}/items`), []),
            safeGet(axios.get(`/rfqs/${activeRfqId}/suppliers`), []),
            safeGet(axios.get(`/rfqs/${activeRfqId}/suggested-suppliers`), []),
            safeGet(axios.get(`/rfqs/${activeRfqId}/documents`), []),
            safeGet(axios.get("/supplier-responses"), []),
            safeGet(
              axios.get("/supplier-responses/workspace", {
                params: { rfq_id: activeRfqId, include_archived: showArchivedResponses ? 1 : undefined },
              }),
              []
            ),
            safeGet(axios.get(`/rfqs/${activeRfqId}/structure`, { params: { view: "master" } }), null),
            safeGet(axios.get("/coverage", { params: { rfq_id: activeRfqId } }), []),
            safeGet(axios.get("/selection"), []),
            safeGet(axios.get(`/rfqs/${activeRfqId}/dispatch-summary`), []),
            safeGet(axios.get(`/rfqs/${activeRfqId}/dispatches`), []),
            safeGet(axios.get("/economics/shipment-groups"), []),
            safeGet(axios.get("/economics/landed-costs"), []),
            safeGet(axios.get("/sales-quotes"), []),
            safeGet(rfq?.client_id ? axios.get("/contracts", { params: { client_id: rfq.client_id } }) : Promise.resolve({ data: [] }), []),
            safeGet(axios.get("/purchase-orders"), []),
          ])

          if (Array.isArray(itemsData) && itemsData.length) break
          // пробуем bulk и ждём чуть-чуть
          try {
            await axios.post(`/rfqs/${activeRfqId}/items/bulk`)
          } catch {
            // игнор, пробуем всё равно перезагрузить
          }
          await delay(500)
        }

        if (cancelled) return

        const refetchItemsAndStructure = async () => {
          const [refItems, refStructure] = await Promise.all([
            axios.get(`/rfqs/${activeRfqId}/items`),
            axios.get(`/rfqs/${activeRfqId}/structure`, { params: { view: "master" } }),
          ])
          return {
            items: Array.isArray(refItems.data) ? refItems.data : [],
            structure: refStructure?.data || null,
          }
        }

        let itemList = Array.isArray(itemsData) ? itemsData : []
        const supplierList = Array.isArray(suppliersData) ? suppliersData : []
        const suggestedList = Array.isArray(suggestedData) ? suggestedData : []
        const docsList = Array.isArray(docsData) ? docsData : []
        const responseList = Array.isArray(responsesData) ? responsesData : []
        const workspaceList = Array.isArray(workspaceData) ? workspaceData : []
        let responseLinesList = []
        const rfqIdNum = Number(activeRfqId)
        if (supplierList.length > 0 && Number.isFinite(rfqIdNum) && rfqIdNum > 0) {
          responseLinesList = await safeGet(
            axios.get("/supplier-responses/lines", {
              params: { rfq_id: rfqIdNum, include_archived: showArchivedResponses ? 1 : undefined },
            }),
            []
          )
        }
        const structurePayload = structureData
        const coveragePayload = Array.isArray(coverageData) ? coverageData : []
        const selectionList = Array.isArray(selectionsData) ? selectionsData : []
        const dispatchSummaryList = Array.isArray(dispatchSummaryData) ? dispatchSummaryData : []
        const dispatchesList = Array.isArray(dispatchesData) ? dispatchesData : []
        const groupList = Array.isArray(groupsData) ? groupsData : []
        const landedList = Array.isArray(landedData) ? landedData : []
        const quoteList = Array.isArray(quotesData) ? quotesData : []
        const contractList = Array.isArray(contractsData) ? contractsData : []
        const poList = Array.isArray(poData) ? poData : []

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
            const refreshed = await refetchItemsAndStructure()
            itemList = refreshed.items
            if (!cancelled) {
              setStructure(refreshed.structure)
            }
          } catch (e) {
            console.debug("auto-fill items failed", e?.response?.data || e?.message)
          }
        }

        // если после попытки всё ещё пусто — пробуем ещё раз под этим же токеном
        if (!itemList.length) {
          try {
            const refreshed = await refetchItemsAndStructure()
            itemList = refreshed.items
            if (!cancelled && !structurePayload) {
              setStructure(refreshed.structure)
            }
          } catch (e) {
            console.debug("second fetch items failed", e?.response?.data || e?.message)
          }
        }

        // Если структура не приехала, а строки уже есть — строим простой фолбэк, чтобы таблица не была пустой
        let finalStructure = structurePayload
        if (!finalStructure && itemList.length) {
          const fallbackItems = itemList.map((it) => ({
            rfq_item_id: it.id || it.rfq_item_id,
            line_number: it.line_number,
            description: it.client_description || it.original_description_ru || it.original_description_en || "",
            original_cat_number: it.original_cat_number || "",
            client_part_number: it.client_part_number || "",
            requested_qty: it.requested_qty || it.client_requested_qty || "",
            uom: it.uom || it.client_uom || "",
            options: [],
          }))
          finalStructure = { items: fallbackItems }
        }

        setItems(itemList)
        setSuppliers(supplierList)
        setSuggestedSuppliers(suggestedList)
        setSuggestedSelection([])
        setRfqDocuments(docsList)
        setResponses(rfqResponses)
        setResponseLines(responseLinesList)
        setResponseWorkspaceRows(workspaceList)
        setStructure(finalStructure)
        setCoverage(coveragePayload)
        setSelections(rfqSelections)
        setDispatchSummary(dispatchSummaryList)
        setDispatches(dispatchesList)
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
          // логируем URL и тело ответа, чтобы быстро найти 400
          console.error("loadDetails error", e?.response?.config?.url, e?.response?.data || e?.message)
        }
      }
    }

    loadDetails()
    return () => {
      cancelled = true
    }
  }, [activeRfqId, rfqs, showArchivedResponses])

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

  const _refreshStructure = async (opts = {}) => {
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

  const loadBundlesForPart = useCallback(async (partId) => {
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
  }, [bundleCache])

  const loadBundleItems = useCallback(async (bundleId) => {
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
  }, [bundleItemsCache])

  const collectBomPartIds = useCallback((nodes, set) => {
    if (!Array.isArray(nodes)) return
    nodes.forEach((node) => {
      if (node?.original_part_id) set.add(node.original_part_id)
      if (node?.children?.length) collectBomPartIds(node.children, set)
    })
  }, [])

  const loadAltPartsBulk = useCallback(async (partIds) => {
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
  }, [])

  const loadLineStatuses = async (rfqId, supplierId) => {
    if (!rfqId || !supplierId) return
    try {
      const { data } = await axios.get(`/rfqs/${rfqId}/suppliers/${supplierId}/line-status`)
      const map = {}
      ;(Array.isArray(data) ? data : []).forEach((row) => {
        if (row.rfq_item_id) map[row.rfq_item_id] = row.status
      })
      setLineStatuses((prev) => ({ ...prev, [supplierId]: map }))
    } catch (e) {
      console.debug("loadLineStatuses skip:", e?.response?.data || e?.message)
    }
  }

  const _saveLineStatus = async ({ supplierId, rfqItemId, status }) => {
    if (!activeRfqId || !supplierId || !rfqItemId) return
    setLineStatusSaving(true)
    try {
      await axios.put(`/rfqs/${activeRfqId}/suppliers/${supplierId}/line-status`, {
        lines: [{ rfq_item_id: rfqItemId, status }],
      })
      await loadLineStatuses(activeRfqId, supplierId)
    } catch (e) {
      console.error(e)
      message.error("Не удалось обновить статус строки")
    } finally {
      setLineStatusSaving(false)
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
      acceptedKeys: [],
      acceptedPriceByKey: {},
      hints: cachedHints,
      onlyHinted: false,
    })
    try {
      const [selectionsResp, hints] = await Promise.all([
        axios.get(`/rfqs/${activeRfqId}/suppliers/${supplier.id}/line-selections`),
        supplierId ? loadSupplierHints(activeRfqId, supplierId) : Promise.resolve(null),
      ])
      await loadLineStatuses(activeRfqId, supplierId)
      const data = selectionsResp?.data
      const keys = []
      const acceptedKeys = []
      const nextBundleChoice = {}
      const partIdsToLoad = new Set()
      ;(Array.isArray(data) ? data : []).forEach((row) => {
        const type = String(row.line_type || "").toUpperCase()
        const savedSelectionKey = String(row.selection_key || "").trim()
        const pushSelectionKey = (key) => {
          if (!key) return
          keys.push(key)
          if (Number(row.use_existing_price) === 1) acceptedKeys.push(key)
        }
        if (savedSelectionKey) {
          pushSelectionKey(savedSelectionKey)
        } else
        if (type === "DEMAND") {
          if (row.alt_original_part_id) {
            const key = `alt:${row.rfq_item_id}:${row.original_part_id}:${row.alt_original_part_id}`
            pushSelectionKey(key)
          } else {
            const key = `demand:${row.rfq_item_id}`
            pushSelectionKey(key)
          }
        } else if (type === "BOM_COMPONENT") {
          if (row.alt_original_part_id) {
            const key = `alt:${row.rfq_item_id}:${row.original_part_id}:${row.alt_original_part_id}`
            pushSelectionKey(key)
          } else {
            const key = `bom:${row.rfq_item_id}:${row.original_part_id}`
            pushSelectionKey(key)
          }
        } else if (type === "KIT_ROLE") {
          const key = `kit:${row.rfq_item_id}:${row.bundle_id}:${row.bundle_item_id}`
          pushSelectionKey(key)
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
        acceptedKeys,
        acceptedPriceByKey: {},
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

  const getHintsForNode = (node, hintsPayload) => {
    const type = String(node?.line_type || "").toUpperCase()
    if (type === "DEMAND" || type === "BOM_COMPONENT") {
      const effectivePartId = node?.alt_original_part_id || node?.original_part_id
      if (!effectivePartId) return []
      return hintsPayload?.originals?.[String(effectivePartId)] || []
    }
    if (type === "KIT_ROLE") {
      const bundleItemId = Number(node?.bundle_item_id || 0)
      if (!bundleItemId) return []
      return hintsPayload?.bundle_items?.[String(bundleItemId)] || []
    }
    return []
  }

  const saveSelections = async (nodeMap) => {
    if (!activeRfqId || !selectionModal.supplier?.id) return
    const rfqSupplierId = selectionModal.supplier.id
    const supplierId = selectionModal.supplier.supplier_id
    const acceptedSet = new Set(selectionModal.acceptedKeys || [])
    const acceptedPriceByKey = selectionModal.acceptedPriceByKey || {}
    const payload = selectionModal.selectedKeys
      .map((key) => {
        const node = nodeMap.get(key)
        if (!node) return null
        return {
          selection_key: key,
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
          use_existing_price: acceptedSet.has(key) ? 1 : 0,
        }
      })
      .filter(Boolean)
    const requestRows = payload.filter((row) => Number(row.use_existing_price) !== 1)
    const requestItemIds = new Set(
      requestRows
        .map((row) => Number(row.rfq_item_id))
        .filter((id) => Number.isFinite(id) && id > 0)
    )
    const activeItemIds = [
      ...new Set(
        (Array.isArray(structureItems) ? structureItems : [])
          .map((item) => Number(item?.rfq_item_id))
          .filter((id) => Number.isFinite(id) && id > 0)
      ),
    ]
    const statusLines = activeItemIds.map((rfqItemId) => {
      let nextStatus = "NONE"
      if (requestItemIds.has(rfqItemId)) {
        nextStatus = "REQUEST"
      }
      return { rfq_item_id: rfqItemId, status: nextStatus }
    })
    setSelectionModal((prev) => ({ ...prev, saving: true }))
    try {
      await axios.put(
        `/rfqs/${activeRfqId}/suppliers/${rfqSupplierId}/line-selections`,
        {
          selections: payload,
        }
      )
      const existingAcceptedSignatures = new Set(
        (Array.isArray(responseLines) ? responseLines : [])
          .filter((row) => Number(row.supplier_id) === Number(supplierId))
          .filter((row) => Number(row.accepted_from_existing_price) === 1)
          .map(
            (row) =>
              `${Number(row.rfq_item_id) || 0}:${Number(row.original_part_id) || 0}:${Number(
                row.bundle_item_id
              ) || 0}`
          )
      )
      const accepts = payload.filter((row) => Number(row.use_existing_price) === 1)
      for (const row of accepts) {
        const node = nodeMap.get(row.selection_key)
        if (!node) continue
        const hints = getHintsForNode(node, selectionModal.hints)
        const priceChoices = buildHintPriceChoices(hints)
        const selectedPriceKey = acceptedPriceByKey[row.selection_key]
        const bestHint =
          priceChoices.find((choice) => choice.key === selectedPriceKey) ||
          priceChoices[0] ||
          null
        if (!bestHint || bestHint.price == null || !bestHint.currency) continue
        const effectiveOriginalPartId =
          Number(node.alt_original_part_id || node.original_part_id || 0) || null
        const requestedOriginalPartId = Number(node.original_part_id || 0) || null
        const sig = `${Number(row.rfq_item_id) || 0}:${effectiveOriginalPartId || 0}:${
          Number(row.bundle_item_id) || 0
        }`
        if (existingAcceptedSignatures.has(sig)) continue
        await axios.post(`/rfqs/${activeRfqId}/suppliers/${supplierId}/accept-price`, {
          rfq_item_id: row.rfq_item_id,
          selection_key: row.selection_key,
          supplier_part_id: bestHint.supplier_part_id || null,
          requested_original_part_id: requestedOriginalPartId,
          original_part_id: effectiveOriginalPartId,
          rfq_item_component_id: node.rfq_item_component_id || null,
          bundle_id: row.bundle_id || null,
          bundle_item_id: row.bundle_item_id || null,
          price: bestHint.price,
          currency: bestHint.currency,
          lead_time_days: bestHint.lead_time_days || null,
          validity_days: bestHint.validity_days || null,
          offer_type: bestHint.offer_type || bestHint.part_type || "UNKNOWN",
          source_type: bestHint.source_type || null,
          source_subtype: bestHint.source_subtype || null,
          source_ref:
            bestHint.source_price_id ||
            bestHint.source_id ||
            bestHint.price_list_id ||
            bestHint.rfq_id ||
            bestHint.price_list_code ||
            null,
          note: buildPriceSourceText(bestHint) || null,
          new_revision: false,
        })
      }
      if (supplierId && statusLines.length) {
        await axios.put(`/rfqs/${activeRfqId}/suppliers/${supplierId}/line-status`, {
          lines: statusLines,
        })
      }
      await Promise.all([loadLineStatuses(activeRfqId, supplierId), loadResponsesAndLines(activeRfqId)])
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
      const { data } = await axios.post(`/rfqs/${activeRfqId}/send`, {
        supplier_ids: supplierIds,
        include_priced: sendIncludePriced,
      })
      await loadRfqs()
      if (Array.isArray(data?.documents) && data.documents.length) {
        setRfqDocuments(data.documents)
      } else {
        await loadDocuments(activeRfqId)
      }
      await loadDispatches(activeRfqId)
      const refreshed = await axios.get(`/rfqs/${activeRfqId}/suppliers`)
      setSuppliers(Array.isArray(refreshed.data) ? refreshed.data : [])
      message.success("RFQ отправлен и файлы сформированы")
    } catch (e) {
      console.error(e)
      message.error("Не удалось сформировать RFQ")
    } finally {
      if (activeRfqId) {
        await loadDispatchSummary(activeRfqId)
      }
      setSending(false)
    }
  }

  const handleSendForSupplier = async (supplier, mode = "full") => {
    if (!activeRfqId || !supplier?.supplier_id) return
    setSupplierSendingId(supplier.supplier_id)
    try {
      const { data } = await axios.post(`/rfqs/${activeRfqId}/send`, {
        supplier_ids: [supplier.supplier_id],
        mode,
        include_priced: sendIncludePriced,
      })
      if (data?.errors?.length) {
        message.warning(
          data.errors.map((e) => e.message).join("; ") || "Ошибка формирования файла",
        )
      } else {
        message.success(
          mode === "delta" ? "Excel (только новые) сформирован" : "Excel (полный) сформирован",
        )
      }
      if (Array.isArray(data?.documents) && data.documents.length) {
        setRfqDocuments(data.documents)
      } else {
        await loadDocuments(activeRfqId)
      }
      await loadDispatches(activeRfqId)
      await loadDispatchSummary(activeRfqId)
    } catch (e) {
      console.error(e)
      message.error("Не удалось сформировать файл")
    } finally {
      setSupplierSendingId(null)
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

  const _requestOptions = useMemo(
    () =>
      _requests.map((r) => ({
        value: r.id,
        label: `${r.client_name || "Клиент"} · ${r.internal_number || r.client_reference || `#${r.id}`}`,
      })),
    [_requests]
  )

  const _userOptions = useMemo(
    () =>
      _users.map((u) => ({
        value: u.id,
        label: u.full_name || u.username || `User ${u.id}`,
      })),
    [_users]
  )

  const _revisionOptions = useMemo(
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
        label: `${s.name || "Поставщик без названия"}${s.public_code ? ` · ${s.public_code}` : ""}`,
      })),
    [allSuppliers]
  )

  const dispatchSummaryMap = useMemo(() => {
    const map = new Map()
    dispatchSummary.forEach((row) => {
      map.set(row.supplier_id, row)
    })
    return map
  }, [dispatchSummary])

  const responseSuppliers = useMemo(() => {
    const ids = new Set()
    const list = []
    suppliers.forEach((row) => {
      if (!ids.has(row.supplier_id)) {
        ids.add(row.supplier_id)
        list.push({
          value: row.supplier_id,
          label: row.supplier_name || "Поставщик без названия",
        })
      }
    })
    responseWorkspaceRows.forEach((row) => {
      if (!ids.has(row.supplier_id)) {
        ids.add(row.supplier_id)
        list.push({
          value: row.supplier_id,
          label: row.supplier_name || "Поставщик без названия",
        })
      }
    })
    responseLines.forEach((row) => {
      if (!ids.has(row.supplier_id)) {
        ids.add(row.supplier_id)
        list.push({
          value: row.supplier_id,
          label: row.supplier_name || "Поставщик без названия",
        })
      }
    })
    return list
  }, [suppliers, responseWorkspaceRows, responseLines])

  const [responseSupplierFilter, setResponseSupplierFilter] = useState(null)

  const fileDispatches = useMemo(() => dispatches, [dispatches])

  const totalNewLines = useMemo(
    () => dispatchSummary.reduce((sum, row) => sum + (row.new_lines_count || 0), 0),
    [dispatchSummary]
  )
  const hasAnySupplierSent = useMemo(
    () => dispatchSummary.some((row) => Number(row.last_sent_rfq_revision_id) > 0),
    [dispatchSummary]
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
  }, [structureItems, collectBomPartIds, loadAltPartsBulk])

  const selectionTreeData = useMemo(() => {
    const supplierId = selectionModal?.supplier?.supplier_id
    const supplierSummary = supplierId ? dispatchSummaryMap.get(supplierId) : null
    const newLineSet = new Set(supplierSummary?.new_line_numbers || [])
    const selectedSet = new Set(selectionModal.selectedKeys || [])
    const acceptedSet = new Set(selectionModal.acceptedKeys || [])
    const acceptedPriceByKey = selectionModal.acceptedPriceByKey || {}
    const nodeMap = new Map()

    const renderSideColumn = ({
      hintsBadge,
      kitSelect,
      roleSelect,
      altCount = 0,
      statusTag = null,
      nodeKey = null,
      hints = [],
    }) => {
      const acceptedChecked = nodeKey ? acceptedSet.has(nodeKey) : false
      const isSelected = nodeKey ? selectedSet.has(nodeKey) : false
      const priceChoices = buildHintPriceChoices(hints)
      const selectedPriceKey = nodeKey ? acceptedPriceByKey[nodeKey] : null
      const selectedPrice =
        (selectedPriceKey
          ? priceChoices.find((choice) => choice.key === selectedPriceKey)
          : null) || priceChoices[0] || null

      const handleAcceptToggle = (checked) => {
        if (checked) {
          if (!isSelected) {
            message.warning("Сначала отметьте строку галочкой в структуре")
            return
          }
          if (!selectedPrice) {
            message.warning("Для этой позиции нет цены")
            return
          }
        }
        setSelectionModal((prev) => {
          const next = new Set(prev.acceptedKeys || [])
          const nextPriceByKey = { ...(prev.acceptedPriceByKey || {}) }
          if (checked) next.add(nodeKey)
          else {
            next.delete(nodeKey)
            if (nodeKey) delete nextPriceByKey[nodeKey]
          }
          if (checked && nodeKey && selectedPrice?.key) {
            nextPriceByKey[nodeKey] = selectedPrice.key
          }
          return {
            ...prev,
            acceptedKeys: Array.from(next),
            acceptedPriceByKey: nextPriceByKey,
          }
        })
      }

      const changeAcceptedPrice = (value) => {
        if (!nodeKey) return
        setSelectionModal((prev) => ({
          ...prev,
          acceptedPriceByKey: {
            ...(prev.acceptedPriceByKey || {}),
            [nodeKey]: value,
          },
        }))
      }

      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
          {statusTag}
          {isSelected && (selectedPrice || acceptedChecked) ? (
            <Checkbox
              checked={acceptedChecked}
              disabled={lineStatusSaving || (!selectedPrice && !acceptedChecked)}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => handleAcceptToggle(e.target.checked)}
            >
              Использовать цену
            </Checkbox>
          ) : null}
          {isSelected && priceChoices.length > 1 ? (
            <Select
              size="small"
              style={{ width: 340 }}
              value={selectedPrice?.key}
              disabled={lineStatusSaving}
              onClick={(event) => event.stopPropagation()}
              onChange={changeAcceptedPrice}
              options={priceChoices.map((choice) => ({
                value: choice.key,
                label: `${choice.supplier_part_number || "Без номера"} · ${formatPriceWithCurrency(
                  choice.price,
                  choice.currency
                )} · ${buildPriceSourceText(choice) || "Источник не указан"}${
                  choice.date ? ` · ${formatHintDate(choice.date)}` : ""
                }`,
              }))}
            />
          ) : null}
          {hintsBadge ? <div>{hintsBadge}</div> : null}
          {kitSelect || roleSelect || altCount > 0 ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              {kitSelect}
              {roleSelect}
              {altCount > 0 ? <Tag color="orange">Подмены: {altCount}</Tag> : null}
            </div>
          ) : null}
        </div>
      )
    }

    const buildAltChildren = ({
      rfqItemId,
      basePartId,
      lineType,
      qty,
      uom,
      keyContext = null,
      rfqItemComponentId = null,
    }) => {
      const altParts = altPartsMap[basePartId] || []
      if (!altParts.length) return []
      return altParts.map((alt) => {
        const baseKey = `alt:${rfqItemId}:${basePartId}:${alt.alt_part_id}`
        const key = keyContext ? `${baseKey}:${keyContext}` : baseKey
        const hints = getOriginalHints(alt.alt_part_id)
        nodeMap.set(key, {
          key,
          line_type: lineType,
          rfq_item_id: rfqItemId,
          original_part_id: basePartId,
          alt_original_part_id: alt.alt_part_id,
          rfq_item_component_id: rfqItemComponentId,
          line_label: alt.cat_number || "",
          line_description: alt.description_ru || alt.description_en || "",
          qty: qty ?? null,
          uom: uom || null,
        })
        return {
          key,
          title: (
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, width: "100%" }}>
              <Space>
                <Tag color="orange">Подмена</Tag>
                <Text>{alt.cat_number || "—"}</Text>
                {alt.description_ru || alt.description_en ? (
                  <Text type="secondary">· {alt.description_ru || alt.description_en}</Text>
                ) : null}
              </Space>
              {renderSideColumn({
                hintsBadge: renderHintsBadge(hints, rfqItemId),
                statusTag: acceptedSet.has(key) ? <Tag color="green">Цена принята</Tag> : null,
                rfqItemId,
                nodeKey: key,
                hints,
              })}
            </div>
          ),
          isLeaf: true,
        }
      })
    }

    const buildKitChildren = ({
      rfqItemId,
      basePartId,
      bundleId,
      roles,
      qty,
      uom,
      keyContext = null,
      rfqItemComponentId = null,
    }) => {
      if (!bundleId || !Array.isArray(roles) || !roles.length) return []
      return roles.map((role) => {
        const roleKeyBase = `kit:${rfqItemId}:${bundleId}:${role.id}`
        const roleKey = keyContext ? `${roleKeyBase}:${keyContext}` : roleKeyBase
        const hints = getBundleItemHints(role.id)
        nodeMap.set(roleKey, {
          key: roleKey,
          line_type: "KIT_ROLE",
          rfq_item_id: rfqItemId,
          original_part_id: basePartId || null,
          rfq_item_component_id: rfqItemComponentId,
          bundle_id: bundleId,
          bundle_item_id: role.id,
          line_label: role.role_label || "",
          line_description: role.role_label || "",
          qty: (role.qty ?? 1) * (qty ?? 1),
          uom: uom || null,
        })
        return {
          key: roleKey,
          title: (
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, width: "100%" }}>
              <Space>
                <Tag color="green">Роль</Tag>
                <Text>{role.role_label || "—"}</Text>
              </Space>
              {renderSideColumn({
                hintsBadge: renderHintsBadge(hints, rfqItemId),
                statusTag: acceptedSet.has(roleKey) ? <Tag color="green">Цена принята</Tag> : null,
                rfqItemId,
                nodeKey: roleKey,
                hints,
              })}
            </div>
          ),
          selectable: false,
          checkable: false,
          isLeaf: true,
        }
      })
    }

    const collectBomCounts = (nodes, item, counts) => {
      if (!Array.isArray(nodes) || !nodes.length) return
      nodes.forEach((comp) => {
        const key = `${item.rfq_item_id}:${comp.original_part_id}`
        counts.set(key, (counts.get(key) || 0) + 1)
        collectBomCounts(comp.children || [], item, counts)
      })
    }

    const buildBomNodes = (nodes, item, bomCounts) => {
      if (!Array.isArray(nodes) || !nodes.length) return []
      return nodes.map((comp) => {
        const baseKey = `bom:${item.rfq_item_id}:${comp.original_part_id}`
        const dupCount = bomCounts.get(`${item.rfq_item_id}:${comp.original_part_id}`) || 0
        const suffix = String(
          comp.key || comp.rfq_item_component_id || comp.required_qty || ""
        ).trim()
        const key = dupCount > 1 && suffix ? `${baseKey}:${suffix}` : baseKey
        const keyContext = key !== baseKey ? key : null
        const compHints = comp.original_part_id ? getOriginalHints(comp.original_part_id) : []
        nodeMap.set(key, {
          key,
          line_type: "BOM_COMPONENT",
          rfq_item_id: item.rfq_item_id,
          rfq_item_component_id: comp.rfq_item_component_id || comp.id || null,
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
        const altChildren = buildAltChildren({
          rfqItemId: item.rfq_item_id,
          basePartId: comp.original_part_id,
          lineType: "BOM_COMPONENT",
          qty: comp.required_qty ?? null,
          uom: comp.uom || item.uom || null,
          keyContext,
          rfqItemComponentId: comp.rfq_item_component_id || comp.id || null,
        })
        const kitChildren = buildKitChildren({
          rfqItemId: item.rfq_item_id,
          basePartId: comp.original_part_id,
          bundleId: selectedBundleId,
          roles: compBundleItems,
          qty: comp.required_qty ?? null,
          uom: comp.uom || item.uom || null,
          keyContext,
          rfqItemComponentId: comp.rfq_item_component_id || comp.id || null,
        })
        const statusTag = acceptedSet.has(key) ? <Tag color="green">Цена принята</Tag> : null

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
                clearKitRoleSelectionForContext({
                  rfqItemId: item.rfq_item_id,
                  originalPartId: comp.original_part_id,
                  rfqItemComponentId: comp.rfq_item_component_id || comp.id || null,
                })
                setBundleChoice((prev) => ({ ...prev, [compBundleKey]: value }))
                const loadedRoles = await loadBundleItems(value)
                if (Array.isArray(loadedRoles) && loadedRoles.length === 1) {
                  const autoKeyBase = `kit:${item.rfq_item_id}:${value}:${loadedRoles[0].id}`
                  const autoKey = keyContext ? `${autoKeyBase}:${keyContext}` : autoKeyBase
                  selectKitRoleQuick(autoKey)
                }
              }}
            />
          ) : null

        const kitRoleOptions = kitChildren.map((roleNode) => {
          const roleMeta = nodeMap.get(String(roleNode.key))
          const roleLabel = String(roleMeta?.line_label || "Роль")
          return { value: String(roleNode.key), label: roleLabel }
        })
        const selectedRoleKey =
          kitRoleOptions.find((opt) => selectedSet.has(opt.value))?.value || undefined
        const roleSelect =
          kitRoleOptions.length > 0 ? (
            <Select
              size="small"
              style={{ width: 220 }}
              placeholder="Роль"
              value={selectedRoleKey}
              options={kitRoleOptions}
              allowClear
              onClick={(event) => event.stopPropagation()}
              onChange={(value) => {
                if (!value) {
                  clearKitRoleSelectionForContext({
                    rfqItemId: item.rfq_item_id,
                    originalPartId: comp.original_part_id,
                    rfqItemComponentId: comp.rfq_item_component_id || comp.id || null,
                  })
                  return
                }
                selectKitRoleQuick(value)
              }}
            />
          ) : null

        if (altChildren.length) {
          children.push({
            key: `alt-group-bom:${item.rfq_item_id}:${comp.original_part_id}`,
            title: <Text type="secondary">Подмены</Text>,
            selectable: false,
            checkable: false,
            children: altChildren,
          })
        }
        const nested = buildBomNodes(comp.children || [], item, bomCounts)
        if (nested.length) {
          children.push(...nested)
        }

        return {
          key,
          title: (
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, width: "100%" }}>
              <Space>
                <Text>{comp.cat_number || "—"}</Text>
                {comp.description ? <Text type="secondary">· {comp.description}</Text> : null}
              </Space>
              {renderSideColumn({
                hintsBadge: renderHintsBadge(compHints, item.rfq_item_id),
                kitSelect,
                roleSelect,
                altCount: altChildren.length,
                statusTag,
                rfqItemId: item.rfq_item_id,
                nodeKey: key,
                hints: compHints,
              })}
            </div>
          ),
          children,
        }
      })
    }

    const tree = structureItems.map((item) => {
      const itemNodeKey = `item:${item.rfq_item_id}`
      const demandKey = `demand:${item.rfq_item_id}`
      const statusTag = acceptedSet.has(demandKey) ? <Tag color="green">Цена принята</Tag> : null
      const itemTitle = (
        <Space>
          <Tag>{item.line_number}</Tag>
          {newLineSet.has(Number(item.line_number)) ? <Tag color="orange">NEW</Tag> : null}
          <Text strong>{item.original_cat_number || item.client_part_number || "—"}</Text>
          <Text type="secondary">{item.description || ""}</Text>
          {statusTag}
        </Space>
      )

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
                {newLineSet.has(Number(item.line_number)) ? <Tag color="orange">NEW</Tag> : null}
              </Space>
              {renderSideColumn({
                hintsBadge: renderHintsBadge(item.original_part_id ? getOriginalHints(item.original_part_id) : [], item.rfq_item_id),
                statusTag,
                rfqItemId: item.rfq_item_id,
                nodeKey: demandKey,
                hints: item.original_part_id ? getOriginalHints(item.original_part_id) : [],
              })}
            </div>
          ),
          isLeaf: true,
        },
      ]

      if (item.original_part_id) {
        const itemBundleKey = `item:${item.rfq_item_id}`
        const selectedBundleId = bundleChoice[itemBundleKey]
        const bundleItems = selectedBundleId ? bundleItemsCache[selectedBundleId] || [] : []

        const altChildren = buildAltChildren({
          rfqItemId: item.rfq_item_id,
          basePartId: item.original_part_id,
          lineType: "DEMAND",
          qty: item.requested_qty ?? null,
          uom: item.uom || null,
        })
        const kitChildren = buildKitChildren({
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
                clearKitRoleSelectionForContext({
                  rfqItemId: item.rfq_item_id,
                  originalPartId: item.original_part_id,
                  rfqItemComponentId: null,
                })
                setBundleChoice((prev) => ({ ...prev, [itemBundleKey]: value }))
                const loadedRoles = await loadBundleItems(value)
                if (Array.isArray(loadedRoles) && loadedRoles.length === 1) {
                  const autoKey = `kit:${item.rfq_item_id}:${value}:${loadedRoles[0].id}`
                  selectKitRoleQuick(autoKey)
                }
              }}
            />
          ) : null

        const kitRoleOptions = kitChildren.map((roleNode) => {
          const roleMeta = nodeMap.get(String(roleNode.key))
          const roleLabel = String(roleMeta?.line_label || "Роль")
          return { value: String(roleNode.key), label: roleLabel }
        })
        const selectedRoleKey =
          kitRoleOptions.find((opt) => selectedSet.has(opt.value))?.value || undefined
        const roleSelect =
          kitRoleOptions.length > 0 ? (
            <Select
              size="small"
              style={{ width: 220 }}
              placeholder="Роль"
              value={selectedRoleKey}
              options={kitRoleOptions}
              allowClear
              onClick={(event) => event.stopPropagation()}
              onChange={(value) => {
                if (!value) {
                  clearKitRoleSelectionForContext({
                    rfqItemId: item.rfq_item_id,
                    originalPartId: item.original_part_id,
                    rfqItemComponentId: null,
                  })
                  return
                }
                selectKitRoleQuick(value)
              }}
            />
          ) : null

        if (altChildren.length) {
          children.push({
            key: `alt-group-item:${item.rfq_item_id}:${item.original_part_id}`,
            title: <Text type="secondary">Подмены</Text>,
            selectable: false,
            checkable: false,
            children: altChildren,
          })
        }
        if (kitSelect || roleSelect || altChildren.length) {
          children.push({
            key: `controls-inline:${item.rfq_item_id}:${item.original_part_id}`,
            title: (
              <div style={{ display: "flex", justifyContent: "flex-end", width: "100%" }}>
                {renderSideColumn({
                  hintsBadge: null,
                  kitSelect,
                  roleSelect,
                  altCount: altChildren.length,
                  rfqItemId: item.rfq_item_id,
                })}
              </div>
            ),
            selectable: false,
            checkable: false,
            isLeaf: true,
          })
        }
      }

      const bomOpt = (item.options || []).find((opt) => opt.type === "BOM")
      const bomCounts = new Map()
      collectBomCounts(bomOpt?.children || [], item, bomCounts)
      const bomChildren = buildBomNodes(bomOpt?.children || [], item, bomCounts)
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
  }, [
    structureItems,
    bundleChoice,
    bundleCache,
    bundleItemsCache,
    loadBundleItems,
    loadBundlesForPart,
    altPartsMap,
    selectionModal.selectedKeys,
    selectionModal.acceptedKeys,
    selectionModal.acceptedPriceByKey,
    selectionModal?.supplier?.supplier_id,
    buildHintPriceChoices,
    dispatchSummaryMap,
    getBundleItemHints,
    getOriginalHints,
    lineStatusSaving,
    renderHintsBadge,
    clearKitRoleSelectionForContext,
    selectKitRoleQuick,
  ])

  const selectionTreeDataVisible = useMemo(() => {
    if (!selectionModal.onlyHinted) return selectionTreeData
    if (!activeSupplierHints) return selectionTreeData
    return filterSelectionTree(selectionTreeData)
  }, [selectionTreeData, selectionModal.onlyHinted, activeSupplierHints, filterSelectionTree])
  const selectionCoverage = useMemo(() => {
    let total = 0
    let hinted = 0
    let selected = 0
    let selectedHinted = 0
    const selectedSet = new Set(selectionModal.selectedKeys || [])
    const itemIds = new Set()
    const hintedItemIds = new Set()
    const selectedItemIds = new Set()

    selectionNodeMapRef.current.forEach((meta, key) => {
      const type = String(meta?.line_type || "").toUpperCase()
      if (!["DEMAND", "BOM_COMPONENT", "KIT_ROLE"].includes(type)) return
      const rfqItemId = Number(meta?.rfq_item_id)
      if (rfqItemId) itemIds.add(rfqItemId)
      total += 1
      const hasHints = hasHintsForSelectionKey(key)
      if (hasHints) {
        hinted += 1
        if (rfqItemId) hintedItemIds.add(rfqItemId)
      }
      if (selectedSet.has(key)) {
        selected += 1
        if (rfqItemId) selectedItemIds.add(rfqItemId)
        if (hasHints) selectedHinted += 1
      }
    })

    const totalItems = structureItems.length || itemIds.size
    return {
      total,
      hinted,
      selected,
      selectedHinted,
      totalItems,
      hintedItems: hintedItemIds.size,
      selectedItems: selectedItemIds.size,
    }
  }, [
    selectionModal.selectedKeys,
    structureItems,
    hasHintsForSelectionKey,
  ])
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
  const handleStepChange = useCallback(
    (index) => {
      const nextKey = STEP_TO_TAB[index]
      if (!nextKey) return
      if (index > 0 && !isStructureConfirmed) {
        message.warning("Сначала подтвердите структуру RFQ")
        return
      }
      setActiveTabKey(nextKey)
    },
    [isStructureConfirmed]
  )

  return (
    <PageWrapper
      title="Рабочее место RFQ"
      helpText="Сквозной поток по RFQ: от отправленной в закупку заявки до заказа поставщику."
    >
      <RfqWorkspaceMainContent
        clientFilterOptions={clientFilterOptions}
        filterClientId={filterClientId}
        setFilterClientId={setFilterClientId}
        filterRequestNumber={filterRequestNumber}
        setFilterRequestNumber={setFilterRequestNumber}
        filteredRfqs={filteredRfqs}
        loading={loading}
        setActiveRfqId={setActiveRfqId}
        activeRfqId={activeRfqId}
        activeRfq={activeRfq}
        activeStep={activeStep}
        handleStepChange={handleStepChange}
        flowStatus={flowStatus}
        stepLabels={STEP_LABELS}
        activeTabKey={activeTabKey}
        setActiveTabKey={setActiveTabKey}
        isStructureConfirmed={isStructureConfirmed}
        structure={structure}
        activeRfqIdForTabs={activeRfqId}
        rfqTreeData={rfqTreeData}
        openKitPreview={openKitPreview}
        altPartsMap={altPartsMap}
        openAltModal={openAltModal}
        suggestedSuppliers={suggestedSuppliers}
        suggestedSelection={suggestedSelection}
        setSuggestedSelection={setSuggestedSelection}
        renderMatchTypes={renderMatchTypes}
        handleAddSuggestedSuppliers={handleAddSuggestedSuppliers}
        supplierForm={supplierForm}
        handleAddSupplier={handleAddSupplier}
        supplierOptions={supplierOptions}
        setSupplierCreateOpen={setSupplierCreateOpen}
        hasAnySupplierSent={hasAnySupplierSent}
        totalNewLines={totalNewLines}
        suppliers={suppliers}
        selectedSupplierIds={selectedSupplierIds}
        setSelectedSupplierIds={setSelectedSupplierIds}
        handleSupplierLanguage={handleSupplierLanguage}
        openSelectionModal={openSelectionModal}
        dispatchSummaryMap={dispatchSummaryMap}
        formatDate={formatDate}
        supplierSendingId={supplierSendingId}
        handleSendForSupplier={handleSendForSupplier}
        statusToColor={statusToColor}
        supplierStatusLabel={supplierStatusLabel}
        handleSendRfq={handleSendRfq}
        sending={sending}
        loadDocuments={loadDocuments}
        sendIncludePriced={sendIncludePriced}
        setSendIncludePriced={setSendIncludePriced}
        fileDispatches={fileDispatches}
        docsLoading={docsLoading}
        responseSuppliers={responseSuppliers}
        responseSupplierFilter={responseSupplierFilter}
        setResponseSupplierFilter={setResponseSupplierFilter}
        loadResponsesAndLines={loadResponsesAndLines}
        showArchivedResponses={showArchivedResponses}
        setShowArchivedResponses={setShowArchivedResponses}
        importModal={importModal}
        setImportModal={setImportModal}
        responseWorkspaceRows={responseWorkspaceRows}
        responseLines={responseLines}
        coverageRows={coverageRows}
        selections={selections}
        selectionLines={selectionLines}
        shipmentGroups={shipmentGroups}
        landedCosts={landedCosts}
        salesQuotes={salesQuotes}
        contracts={contracts}
        purchaseOrders={purchaseOrders}
        rfqStatusLabel={rfqStatusLabel}
        handleDeleteRfq={handleDeleteRfq}
      />
      <SupplierCreateModal
        open={supplierCreateOpen}
        onCancel={() => setSupplierCreateOpen(false)}
        form={supplierCreateForm}
        onFinish={handleCreateSupplier}
        autoAddCreatedSupplier={autoAddCreatedSupplier}
        setAutoAddCreatedSupplier={setAutoAddCreatedSupplier}
      />
      <SelectionStructureModal
        selectionModal={selectionModal}
        setSelectionModal={setSelectionModal}
        activeSupplierHints={activeSupplierHints}
        selectionCoverage={selectionCoverage}
        selectionTreeDataVisible={selectionTreeDataVisible}
        applyAltExclusion={applyAltExclusion}
        selectionNodeMapRef={selectionNodeMapRef}
        handleSelectAllHinted={handleSelectAllHinted}
        saveSelections={saveSelections}
      />

      <KitPreviewModal
        kitPreview={kitPreview}
        setKitPreview={setKitPreview}
        loadBundleItems={loadBundleItems}
      />

      <AltPartsModal altModal={altModal} setAltModal={setAltModal} />

      <ImportResponsesModal
        importModal={importModal}
        setImportModal={setImportModal}
        activeRfqId={activeRfqId}
        suppliers={suppliers}
        onImported={loadResponsesAndLines}
      />

    </PageWrapper>
  )
}

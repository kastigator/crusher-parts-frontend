import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  Modal,
  Space,
  Tag,
  Button,
  message,
  Alert,
  Typography,
  Tabs,
} from "antd"
import axios from "@/api/axiosInstance"
import NewOfferTabContent from "@/components/orders/offerModal/NewOfferTabContent"
import OffersListTabContent from "@/components/orders/offerModal/OffersListTabContent"
import ReadyVariantsTabContent from "@/components/orders/offerModal/ReadyVariantsTabContent"
import {
  computeRouteLogistics,
  INITIAL_FORM,
  isOfferVisible,
  normalizeOfferStatus,
  OFFER_STATUS_META,
  statusMakesVisible,
} from "@/components/orders/offerModal/offerModalUtils"
import SupplierPartPickerDrawer from "@/components/originalParts/bundle/SupplierPartPickerDrawer"

const { Text } = Typography


export default function OfferModal({
  open,
  onClose,
  item,
  canEditOffers,
  canSelect,
  onOffersUpdated,
  inline = false,
}) {
  const [adding, setAdding] = useState(false)
  const [supplierPartPickerOpen, setSupplierPartPickerOpen] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [linkWhenAdding, setLinkWhenAdding] = useState(true)
  const [clientVisibleOnAdd, setClientVisibleOnAdd] = useState(false)
  const [routes, setRoutes] = useState([])
  const [formValues, setFormValues] = useState(INITIAL_FORM)
  const [bundles, setBundles] = useState([])
  const [bundlesLoading, setBundlesLoading] = useState(false)
  const [, setSelectedSuggestions] = useState([])
  const [offers, setOffers] = useState([])
  const [offersLoading, setOffersLoading] = useState(false)
  const [offersFilter, setOffersFilter] = useState("all")
  const [selectedOfferKeys, setSelectedOfferKeys] = useState([])
  const [bulkStatus, setBulkStatus] = useState(null)
  const [bulkUpdating, setBulkUpdating] = useState(false)
  const [selectedVariantKeys, setSelectedVariantKeys] = useState([])
  const [selectedVariants, setSelectedVariants] = useState([])
  const [activeTab, setActiveTab] = useState("ready")
  const [materials, setMaterials] = useState([])
  const [materialsLoading, setMaterialsLoading] = useState(false)
  const [calc, setCalc] = useState(null)
  const [calcLoading, setCalcLoading] = useState(false)
  const [readyMarkupPct, setReadyMarkupPct] = useState(null)
  const [readyMarkupAbs, setReadyMarkupAbs] = useState(null)
  const [readyRouteId, setReadyRouteId] = useState(null)
  const [readyCalcs, setReadyCalcs] = useState({})
  const [readyCalcLoading, setReadyCalcLoading] = useState(false)
  const [readyRouteByKey, setReadyRouteByKey] = useState({})

  const loadOffers = useCallback(async (orderItemId) => {
    if (!orderItemId) {
      setOffers([])
      return
    }
    setOffersLoading(true)
    try {
      const { data } = await axios.get(`/client-orders/items/${orderItemId}/offers`)
      setOffers(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error("load offers error", e)
      message.error("Не удалось загрузить офферы")
    } finally {
      setOffersLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) {
      setFormValues(INITIAL_FORM)
      setSuggestions([])
      setLinkWhenAdding(true)
      setClientVisibleOnAdd(false)
      setOffers([])
      setSelectedVariantKeys([])
      setSelectedVariants([])
      setOffersFilter("all")
      setSelectedOfferKeys([])
      setBulkStatus(null)
      setBulkUpdating(false)
      setMaterials([])
      setCalc(null)
      setReadyCalcs({})
      setReadyRouteByKey({})
      return
    }
    const hasInitialOffers =
      Array.isArray(item?.offers) && item.offers.length > 0
    setActiveTab(hasInitialOffers ? "list" : "ready")
    setOffersFilter("all")
    setSelectedOfferKeys([])
    setBulkStatus(null)
    setClientVisibleOnAdd(false)
    setCalc(null)
    if (item?.order_currency) {
      setFormValues((prev) => ({ ...prev, client_currency: item.order_currency }))
    }
    setReadyMarkupPct(null)
    setReadyMarkupAbs(null)
    setReadyRouteId(null)
    setReadyCalcs({})
    setReadyRouteByKey({})
    const loadRoutes = async () => {
      try {
        const { data } = await axios.get("/logistics-routes")
        setRoutes(Array.isArray(data) ? data : [])
      } catch (_e) {
        // ок, оставляем пустым
      }
    }
    loadRoutes()
    if (item?.original_part_id) {
      loadSuggestions(item.original_part_id)
      loadBundles(item.original_part_id)
    }
    if (item?.offers) {
      setOffers(Array.isArray(item.offers) ? item.offers : [])
    }
    if (item?.id) {
      loadOffers(item.id)
    }
  }, [open, item?.original_part_id, item?.id, item?.offers, item?.order_currency, loadOffers])

  useEffect(() => {
    setSelectedOfferKeys([])
  }, [offersFilter])

  const loadSuggestions = async (originalId) => {
    setSuggestionsLoading(true)
    try {
      const { data } = await axios.get(
        "/supplier-part-originals/of-original",
        { params: { original_part_id: originalId } },
      )
      setSuggestions(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error("load suggestions error", e)
    } finally {
      setSuggestionsLoading(false)
    }
  }

  const loadBundles = async (originalId) => {
    setBundlesLoading(true)
    try {
      const { data: list } = await axios.get("/supplier-bundles", {
        params: { original_part_id: originalId },
      })
      const ids = Array.isArray(list) ? list.map((b) => b.id) : []
      const summaries = await Promise.all(
        ids.map(async (id) => {
          try {
            const { data } = await axios.get(`/supplier-bundles/${id}/summary`)
            return { id, ...data }
          } catch (_e) {
            return null
          }
        }),
      )
      setBundles(summaries.filter(Boolean))
    } catch (e) {
      console.error("load bundles error", e)
      setBundles([])
    } finally {
      setBundlesLoading(false)
    }
  }

  const loadMaterials = async (supplierPartId) => {
    if (!supplierPartId) {
      setMaterials([])
      return
    }
    setMaterialsLoading(true)
    try {
      const { data } = await axios.get(`/supplier-part-materials/${supplierPartId}`)
      setMaterials(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error("load materials error", e)
      setMaterials([])
    } finally {
      setMaterialsLoading(false)
    }
  }

  const convertFx = async (amount, from, to) => {
    const fromCur = (from || "").trim().toUpperCase()
    const toCur = (to || "").trim().toUpperCase()
    if (amount == null || !Number.isFinite(Number(amount))) {
      return { value: null, rate: null }
    }
    if (!fromCur || !toCur || fromCur === toCur) {
      return { value: Number(amount), rate: 1 }
    }
    const { data } = await axios.get("/fx/convert", {
      params: { from: fromCur, to: toCur, amount: amount },
    })
    return {
      value: data?.converted ?? Number(amount) * (data?.rate || 1),
      rate: data?.rate || null,
    }
  }

  const handleCalculate = async () => {
    try {
      setCalcLoading(true)
      const targetCurrency =
        formValues.client_currency ||
        item?.order_currency ||
        formValues.supplier_currency ||
        "USD"
      const supplierCurrency = formValues.supplier_currency || targetCurrency
      const route = routes.find((r) => r.id === formValues.logistics_route_id)
      const routeCalc = computeRouteLogistics(route, item)
      const rawLogi =
        formValues.logistics_cost != null
          ? Number(formValues.logistics_cost)
          : routeCalc.amount != null
            ? Number(routeCalc.amount)
            : null
      const surchargePct = route?.surcharge_pct != null ? Number(route.surcharge_pct) : 0
      const surchargeAbs = route?.surcharge_abs != null ? Number(route.surcharge_abs) : 0
      const logiWithSurcharge =
        rawLogi != null ? rawLogi * (1 + surchargePct / 100) + surchargeAbs : null
      const logisticsCurrency =
        formValues.logistics_currency || routeCalc.currency || route?.currency || targetCurrency

      const supplierPrice = formValues.supplier_price != null ? Number(formValues.supplier_price) : null
      const supplierConv = await convertFx(supplierPrice, supplierCurrency, targetCurrency)
      const logisticsConv = await convertFx(logiWithSurcharge, logisticsCurrency, targetCurrency)

      const dutyRate = item?.tnved_duty_rate != null ? Number(item.tnved_duty_rate) : null
      const dutyAmount =
        dutyRate != null && (supplierConv.value != null || logisticsConv.value != null)
          ? ((supplierConv.value || 0) + (logisticsConv.value || 0)) * dutyRate * 0.01
          : null

      const landed =
        supplierConv.value != null || logisticsConv.value != null || dutyAmount != null
          ? (supplierConv.value || 0) + (logisticsConv.value || 0) + (dutyAmount || 0)
          : null
      const mp = formValues.markup_pct != null ? Number(formValues.markup_pct) : 0
      const ma = formValues.markup_abs != null ? Number(formValues.markup_abs) : 0
      const clientPrice = landed != null ? landed * (1 + mp / 100) + ma : null

      setCalc({
        target_currency: targetCurrency,
        supplier: { amount: supplierPrice, currency: supplierCurrency, converted: supplierConv.value, fx_rate: supplierConv.rate },
        logistics: {
          amount: rawLogi,
          currency: logisticsCurrency,
          surcharge_pct: surchargePct || null,
          surcharge_abs: surchargeAbs || null,
          with_surcharge: logiWithSurcharge,
          converted: logisticsConv.value,
          fx_rate: logisticsConv.rate,
          pricing: routeCalc.meta,
        },
        duty_amount: dutyAmount,
        duty_rate: dutyRate,
        landed_cost: landed,
        markup_pct: formValues.markup_pct,
        markup_abs: formValues.markup_abs,
        client_price: clientPrice,
        eta: route?.eta_days != null || formValues.lead_time_days != null
          ? (Number(formValues.lead_time_days || 0) + Number(route?.eta_days || 0))
          : null,
      })
    } catch (e) {
      console.error("calc error", e)
      message.error("Не удалось пересчитать цену")
    } finally {
      setCalcLoading(false)
    }
  }

  const computeReadyCalcs = async () => {
    setReadyCalcLoading(true)
    try {
      const targetCurrency =
        item?.order_currency ||
        formValues.client_currency ||
        formValues.supplier_currency ||
        "USD"
      const res = {}
      for (const row of suggestionRows) {
        const routeId = readyRouteByKey[row.key] ?? readyRouteId
        const route = routes.find((r) => r.id === routeId)
        const supplierPrice = row.latest_price != null ? Number(row.latest_price) : null
        const supplierCurrency = row.latest_price_currency || targetCurrency
        const routeCalc = computeRouteLogistics(route, item)
        const rawLogi = routeCalc.amount != null ? Number(routeCalc.amount) : null
        const surchargePct = route?.surcharge_pct != null ? Number(route.surcharge_pct) : 0
        const surchargeAbs = route?.surcharge_abs != null ? Number(route.surcharge_abs) : 0
        const logiWithSurcharge =
          rawLogi != null ? rawLogi * (1 + surchargePct / 100) + surchargeAbs : null
        const logisticsCurrency = routeCalc.currency || route?.currency || targetCurrency

        const supplierConv = await convertFx(supplierPrice, supplierCurrency, targetCurrency)
        const logisticsConv = await convertFx(logiWithSurcharge, logisticsCurrency, targetCurrency)

        const dutyRate = item?.tnved_duty_rate != null ? Number(item.tnved_duty_rate) : null
        const dutyAmount =
          dutyRate != null && (supplierConv.value != null || logisticsConv.value != null)
            ? ((supplierConv.value || 0) + (logisticsConv.value || 0)) * dutyRate * 0.01
            : null

        const landed =
          supplierConv.value != null || logisticsConv.value != null || dutyAmount != null
            ? (supplierConv.value || 0) + (logisticsConv.value || 0) + (dutyAmount || 0)
            : null

        const mp = readyMarkupPct != null ? Number(readyMarkupPct) : 0
        const ma = readyMarkupAbs != null ? Number(readyMarkupAbs) : 0
        const clientPrice = landed != null ? landed * (1 + mp / 100) + ma : null
        const eta = (route?.eta_days != null ? Number(route.eta_days) : 0) + 0

        res[row.key] = {
          client_price: clientPrice,
          currency: targetCurrency,
          eta: Number.isFinite(eta) && eta > 0 ? eta : null,
        }
      }
      setReadyCalcs(res)
    } catch (e) {
      console.error("ready calc error", e)
      message.error("Не удалось пересчитать варианты")
    } finally {
      setReadyCalcLoading(false)
    }
  }

  const offersStats = useMemo(() => {
    const stats = {
      total: offers.length,
      visible: 0,
      approved: 0,
      proposed: 0,
      rejected: 0,
      draft: 0,
    }
    offers.forEach((o) => {
      if (isOfferVisible(o)) stats.visible += 1
      switch (normalizeOfferStatus(o.status)) {
        case "approved":
          stats.approved += 1
          break
        case "proposed":
          stats.proposed += 1
          break
        case "rejected":
          stats.rejected += 1
          break
        case "draft":
          stats.draft += 1
          break
        default:
          break
      }
    })
    return stats
  }, [offers])

  const offerFilterOptions = useMemo(
    () => [
      { label: `Все (${offersStats.total})`, value: "all" },
      { label: `Для клиента (${offersStats.visible})`, value: "visible" },
      { label: `Предложены (${offersStats.proposed})`, value: "proposed" },
      { label: `Выбран (${offersStats.approved})`, value: "approved" },
      { label: `Отклонены (${offersStats.rejected})`, value: "rejected" },
      { label: `Черновики (${offersStats.draft})`, value: "draft" },
    ],
    [offersStats],
  )

  const filteredOffers = useMemo(() => {
    if (offersFilter === "visible") {
      return offers.filter((o) => isOfferVisible(o))
    }
    if (offersFilter === "approved") {
      return offers.filter((o) => o.status === "approved")
    }
    if (offersFilter === "proposed") {
      return offers.filter((o) => o.status === "proposed")
    }
    if (offersFilter === "rejected") {
      return offers.filter((o) => o.status === "rejected")
    }
    if (offersFilter === "draft") {
      return offers.filter((o) => o.status === "draft")
    }
    return offers
  }, [offers, offersFilter])

  const selectedOffers = useMemo(() => {
    if (!selectedOfferKeys.length) return []
    const map = new Map(offers.map((o) => [o.id, o]))
    return selectedOfferKeys.map((id) => map.get(id)).filter(Boolean)
  }, [offers, selectedOfferKeys])

  const updateOffers = async (ids, payload, successMessage) => {
    if (!ids.length || !item?.id) return
    setBulkUpdating(true)
    try {
      await Promise.all(
        ids.map((id) => axios.put(`/client-orders/offers/${id}`, payload)),
      )
      message.success(successMessage)
      await loadOffers(item.id)
      onOffersUpdated?.()
      setSelectedOfferKeys([])
    } catch (e) {
      console.error("bulk update offers error", e)
      message.error("Не удалось обновить офферы")
    } finally {
      setBulkUpdating(false)
    }
  }

  const handleBulkVisibility = async (visible) => {
    const messageText = visible ? "Офферы показаны клиенту" : "Офферы скрыты"
    const nextStatus = visible ? "proposed" : "draft"
    await updateOffers(
      selectedOfferKeys,
      { status: nextStatus, client_visible: visible ? 1 : 0 },
      messageText,
    )
  }

  const handleBulkStatus = async (status) => {
    const normalized = normalizeOfferStatus(status)
    setBulkStatus(normalized)
    await updateOffers(
      selectedOfferKeys,
      { status: normalized, client_visible: statusMakesVisible(normalized) ? 1 : 0 },
      "Статус обновлён",
    )
    setBulkStatus(null)
  }

  const linkToOriginal = async (supplierPartId) => {
    if (!linkWhenAdding || !item?.original_part_id || !supplierPartId) return
    try {
      await axios.post("/supplier-part-originals", {
        supplier_part_id: supplierPartId,
        original_part_id: item.original_part_id,
      })
    } catch {
      // дубликат — не критично
    }
  }

  const _quickAddSelected = async () => {
    const rows = selectedVariants
    if (!item?.id || !rows.length) return
    const quickStatus = clientVisibleOnAdd ? "proposed" : "draft"
    try {
      await Promise.all(
        rows.map(async (row) => {
          await linkToOriginal(row.supplier_part_id)
          await axios.post(`/client-orders/items/${item.id}/offers`, {
            supplier_part_id: row.supplier_part_id,
            material_id: row.material_id || null,
            supplier_price: row.latest_price ?? null,
            supplier_currency: row.latest_price_currency || null,
            markup_pct: readyMarkupPct,
            markup_abs: readyMarkupAbs,
            logistics_route_id: readyRouteByKey[row.key] ?? readyRouteId,
            client_visible: clientVisibleOnAdd ? 1 : 0,
            status: quickStatus,
          })
        }),
      )
      message.success("Офферы добавлены")
      setSelectedSuggestions([])
      await loadOffers(item.id)
      onOffersUpdated?.()
    } catch (e) {
      console.error("bulk add offers error", e)
      message.error("Не удалось добавить выбранные")
    }
  }

  const addSupplierPartOffer = async (row) => {
    if (!item?.id || !row?.supplier_part_id) return
    const quickStatus = clientVisibleOnAdd ? "proposed" : "draft"
    await linkToOriginal(row.supplier_part_id)
    await axios.post(`/client-orders/items/${item.id}/offers`, {
      supplier_part_id: row.supplier_part_id,
      material_id: row.material_id || null,
      supplier_price: row.latest_price ?? null,
      supplier_currency: row.latest_price_currency || null,
      markup_pct: readyMarkupPct,
      markup_abs: readyMarkupAbs,
      logistics_route_id: readyRouteByKey[row.key] ?? readyRouteId,
      client_visible: clientVisibleOnAdd ? 1 : 0,
      status: quickStatus,
    })
  }

  const quickAddBundle = async (bundle, { silent = false } = {}) => {
    if (!item?.id) return
    const defaults = Array.isArray(bundle.options)
      ? bundle.options.filter((o) => o.is_default)
      : []
    if (!defaults.length) {
      if (!silent) message.warning("У комплекта нет вариантов по умолчанию")
      return
    }
    const quickStatus = clientVisibleOnAdd ? "proposed" : "draft"
    try {
      await Promise.all(
        defaults.map(async (opt) => {
          await linkToOriginal(opt.supplier_part_id)
          await axios.post(`/client-orders/items/${item.id}/offers`, {
            bundle_id: bundle.id,
            supplier_id: opt.supplier_id || null,
            supplier_part_id: opt.supplier_part_id || null,
            supplier_price: opt.last_price ?? opt.price ?? null,
            supplier_currency:
              opt.last_currency ||
              opt.currency ||
              (bundle.totals && bundle.totals[0]?.currency_iso3) ||
              null,
            original_part_id: item?.original_part_id || null,
            client_visible: clientVisibleOnAdd ? 1 : 0,
            status: quickStatus,
            comment_internal: opt.role_label ? `Роль: ${opt.role_label}` : null,
          })
        }),
      )
      if (!silent) message.success("Комплект добавлен целиком")
      await loadOffers(item.id)
      onOffersUpdated?.()
    } catch (e) {
      console.error("add bundle offer error", e)
      if (!silent) message.error(e?.response?.data?.message || "Не удалось добавить комплект")
    }
  }

  const handleAdd = async () => {
    if (!item?.id) {
      message.warning("Сначала сохраните заказ и позицию")
      return
    }
    if (!formValues.supplier_part_id) {
      message.warning("Выберите деталь поставщика")
      return
    }
    if (!formValues.supplier_price) {
      message.warning("Укажите цену поставщика")
      return
    }
    try {
      setAdding(true)
      await linkToOriginal(formValues.supplier_part_id)
      const normalizedStatus = normalizeOfferStatus(formValues.status)
      const nextVisible = statusMakesVisible(normalizedStatus)
      await axios.post(`/client-orders/items/${item.id}/offers`, {
        ...formValues,
        status: normalizedStatus,
        client_visible: nextVisible ? 1 : 0,
      })
      message.success("Оффер добавлен")
      await loadOffers(item.id)
      onOffersUpdated?.()
      setFormValues(INITIAL_FORM)
      setCalc(null)
    } catch (e) {
      console.error("add offer error", e)
      message.error(e?.response?.data?.message || "Не удалось добавить оффер")
    } finally {
      setAdding(false)
    }
  }

  const handleStatusChange = useCallback(async (offer, status) => {
    if (!canEditOffers) return
    try {
      const normalized = normalizeOfferStatus(status)
      await axios.put(`/client-orders/offers/${offer.id}`, {
        status: normalized,
        client_visible: statusMakesVisible(normalized) ? 1 : 0,
      })
      await loadOffers(offer.order_item_id)
      onOffersUpdated?.()
    } catch (e) {
      console.error("update offer error", e)
      message.error("Не удалось обновить статус оффера")
    }
  }, [canEditOffers, loadOffers, onOffersUpdated])

  const handleToggleVisibility = useCallback(async (offer, visible) => {
    try {
      const currentStatus = normalizeOfferStatus(offer?.status)
      const nextStatus = visible
        ? currentStatus === "approved"
          ? "approved"
          : "proposed"
        : currentStatus === "approved"
          ? "approved"
          : "draft"
      await axios.put(`/client-orders/offers/${offer.id}`, {
        status: nextStatus,
        client_visible: visible ? 1 : 0,
      })
      message.success(visible ? "Оффер добавлен в предложение" : "Оффер скрыт из предложения")
      await loadOffers(offer.order_item_id)
      onOffersUpdated?.()
    } catch (e) {
      console.error("toggle offer visibility error", e)
      message.error("Не удалось обновить видимость оффера")
    }
  }, [loadOffers, onOffersUpdated])

  const handleSelectOffer = useCallback(async (offer) => {
    if (!item?.id) return
    try {
      await axios.post(`/client-orders/items/${item.id}/decision`, {
        offer_id: offer.id,
      })
      message.success("Оффер выбран")
      await loadOffers(item.id)
      onOffersUpdated?.()
    } catch (e) {
      console.error("select offer error", e)
      message.error("Не удалось выбрать оффер")
    }
  }, [item?.id, loadOffers, onOffersUpdated])

  const handleDeleteOffer = useCallback(async (offer) => {
    try {
      await axios.delete(`/client-orders/offers/${offer.id}`)
      message.success("Оффер удалён")
      await loadOffers(offer.order_item_id)
      onOffersUpdated?.()
    } catch (e) {
      console.error("delete offer error", e)
      message.error("Не удалось удалить оффер")
    }
  }, [loadOffers, onOffersUpdated])

  const renderSupplier = useCallback((row) =>
    canEditOffers ? (
      <Space direction="vertical" size={2}>
        <span>{row.supplier_name || row.supplier_public_code || "—"}</span>
        {row.supplier_public_code && <Tag>{row.supplier_public_code}</Tag>}
      </Space>
    ) : (
      <Tag>{row.supplier_public_code || "—"}</Tag>
    ), [canEditOffers])

  const editingDisabled = !item?.id

  const suggestionRows = useMemo(() => {
    const rows = []
    suggestions.forEach((s) => {
      if (Array.isArray(s.materials) && s.materials.length) {
        s.materials.forEach((m) => {
          rows.push({
            key: `part-${s.supplier_part_id}-mat-${m.material_id}`,
            type: "part",
            supplier_name: s.supplier_name,
            supplier_public_code: s.supplier_public_code,
            supplier_part_number: s.supplier_part_number,
            supplier_description: s.description,
            material_label: m.material_name || m.material_code || m.material_id,
            material_id: m.material_id,
            latest_price: m.latest_price != null ? m.latest_price : s.latest_price,
            latest_price_currency: m.latest_currency || s.latest_price_currency,
            raw: { ...s, material: m },
          })
        })
      } else {
        rows.push({
          key: `part-${s.supplier_part_id}`,
          type: "part",
          supplier_name: s.supplier_name,
          supplier_public_code: s.supplier_public_code,
          supplier_part_number: s.supplier_part_number,
          supplier_description: s.description,
          latest_price: s.latest_price,
          latest_price_currency: s.latest_price_currency,
          raw: s,
        })
      }
    })
    return rows
  }, [suggestions])

  const handleAddSelectedVariants = async () => {
    if (!item?.id) {
      message.warning("Сохраните заказ и позицию, чтобы добавить офферы")
      return
    }
    if (!selectedVariants.length) {
      message.info("Выберите варианты для добавления")
      return
    }
    try {
      for (const variant of selectedVariants) {
        if (variant.type === "bundle") {
          await quickAddBundle(variant.raw, { silent: true })
        } else if (variant.type === "part") {
          await addSupplierPartOffer(variant.raw)
        }
      }
      message.success("Выбранные варианты добавлены")
      setSelectedVariantKeys([])
      setSelectedVariants([])
      await loadOffers(item.id)
      onOffersUpdated?.()
    } catch (e) {
      console.error("add selected variants error", e)
      message.error("Не удалось добавить выбранные варианты")
    }
  }

  const modalContent = (
    <Space direction="vertical" style={{ width: "100%" }} size="large">
      <Alert
        type="info"
        showIcon
        message="Как работать с офферами"
        description={
          <div>
            <div>Комплектовщик подбирает варианты (готовые связи или поиск).</div>
            <div>Статус «Предложен» = показываем клиенту (галочка и статус синхронизированы).</div>
            <div>
              Тариф маршрута: логистика считается по весу/объему детали, если выбран тариф
              за кг/м³. Пример: вес 120 кг, ставка 4 USD/кг, минимум 500 USD → 500 USD.
            </div>
            <div>«Черновик» — только для внутренней работы, «Выбран» — утверждён клиентом.</div>
            <div>После согласования выберите один оффер — статус станет «Выбран».</div>
            <div>Выберите варианты чекбоксами и нажмите «Добавить выбранные» или добавьте комплект целиком.</div>
            {!item?.id && (
              <Text type="danger">Сохраните заказ и позицию, чтобы добавить офферы.</Text>
            )}
          </div>
        }
      />
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: "ready",
            label: "Готовые варианты",
            children: (
              <ReadyVariantsTabContent
                routes={routes}
                readyRouteId={readyRouteId}
                setReadyRouteId={setReadyRouteId}
                readyMarkupPct={readyMarkupPct}
                setReadyMarkupPct={setReadyMarkupPct}
                readyMarkupAbs={readyMarkupAbs}
                setReadyMarkupAbs={setReadyMarkupAbs}
                computeReadyCalcs={computeReadyCalcs}
                readyCalcLoading={readyCalcLoading}
                clientVisibleOnAdd={clientVisibleOnAdd}
                setClientVisibleOnAdd={setClientVisibleOnAdd}
                canSelect={canSelect}
                readyCalcs={readyCalcs}
                readyRouteByKey={readyRouteByKey}
                setReadyRouteByKey={setReadyRouteByKey}
                bundles={bundles}
                suggestionRows={suggestionRows}
                bundlesLoading={bundlesLoading}
                suggestionsLoading={suggestionsLoading}
                renderSupplier={renderSupplier}
                selectedVariantKeys={selectedVariantKeys}
                setSelectedVariantKeys={setSelectedVariantKeys}
                selectedVariants={selectedVariants}
                setSelectedVariants={setSelectedVariants}
                setSelectedSuggestions={setSelectedSuggestions}
                onAddSelected={handleAddSelectedVariants}
                editingDisabled={editingDisabled}
              />
            ),
          },
          {
            key: "list",
            label: `Текущие офферы (${offers.length || 0})`,
            children: (
              <OffersListTabContent
                offersFilter={offersFilter}
                setOffersFilter={setOffersFilter}
                offerFilterOptions={offerFilterOptions}
                offersStats={offersStats}
                canEditOffers={canEditOffers}
                canSelect={canSelect}
                selectedOfferKeys={selectedOfferKeys}
                bulkUpdating={bulkUpdating}
                handleBulkVisibility={handleBulkVisibility}
                bulkStatus={bulkStatus}
                handleBulkStatus={handleBulkStatus}
                selectedOffers={selectedOffers}
                filteredOffers={filteredOffers}
                offers={offers}
                offersLoading={offersLoading}
                setSelectedOfferKeys={setSelectedOfferKeys}
                handleToggleVisibility={handleToggleVisibility}
                handleStatusChange={handleStatusChange}
                handleSelectOffer={handleSelectOffer}
                handleDeleteOffer={handleDeleteOffer}
                renderSupplier={renderSupplier}
              />
            ),
          },
          {
            key: "new",
            label: "Новый оффер",
            children: (
              <NewOfferTabContent
                canEditOffers={canEditOffers}
                formValues={formValues}
                setFormValues={setFormValues}
                editingDisabled={editingDisabled}
                setSupplierPartPickerOpen={setSupplierPartPickerOpen}
                materialsLoading={materialsLoading}
                materials={materials}
                routes={routes}
                linkWhenAdding={linkWhenAdding}
                setLinkWhenAdding={setLinkWhenAdding}
                handleAdd={handleAdd}
                adding={adding}
                calc={calc}
                calcLoading={calcLoading}
                handleCalculate={handleCalculate}
                item={item}
              />
            ),
          },
        ]}
      />
    </Space>
  )

  return (
    <>
      {inline ? (
        open ? <div className="offer-inline-panel">{modalContent}</div> : null
      ) : (
        <Modal
          title={`Офферы по строке #${item?.line_number || item?.id || ""}`}
          open={open}
          onCancel={onClose}
          maskClosable={false}
          footer={null}
          width={1100}
          getContainer={() => document.body}
          zIndex={1300}
          bodyStyle={{ maxHeight: "75vh", overflow: "auto" }}
        >
          {modalContent}
        </Modal>
      )}

      <SupplierPartPickerDrawer
        open={supplierPartPickerOpen}
        onClose={() => setSupplierPartPickerOpen(false)}
        onPick={(rows) => {
          const r = rows?.[0]
          if (r) {
            loadMaterials(r.id)
            setFormValues((prev) => ({
              ...prev,
              supplier_part_id: r.id,
              supplier_price: r.latest_price ?? prev.supplier_price,
              supplier_currency: r.latest_currency || prev.supplier_currency,
              supplier_part_number: r.supplier_part_number,
              supplier_part_description:
                r.description_ru || r.description_en || r.description || "",
            }))
          }
        }}
        initialQuery={item?.cat_number || ""}
        getContainer={() => document.body}
        zIndex={2000}
      />
    </>
  )
}

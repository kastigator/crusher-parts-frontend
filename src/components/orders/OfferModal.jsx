import React, { useEffect, useMemo, useState } from "react"
import {
  Modal,
  Table,
  Space,
  Tag,
  Button,
  InputNumber,
  Input,
  Select,
  Divider,
  message,
  Checkbox,
  Alert,
  Typography,
  Tabs,
  Card,
  Descriptions,
  Tooltip,
  Segmented,
} from "antd"
import { InfoCircleOutlined } from "@ant-design/icons"
import axios from "@/api/axiosInstance"
import SupplierPartPickerDrawer from "@/components/originalParts/bundle/SupplierPartPickerDrawer"
import CurrencySelect from "@/components/inputs/CurrencySelect"

const { Text } = Typography

const fmtMoney = (v, cur) =>
  v == null || Number.isNaN(Number(v)) ? "—" : `${Number(v).toFixed(2)} ${cur || ""}`

const toNum = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

const roundUp = (value, step) => {
  const base = toNum(value)
  const stepNum = toNum(step)
  if (base == null) return null
  if (!stepNum || stepNum <= 0) return base
  return Math.ceil(base / stepNum) * stepNum
}

const getItemMetrics = (item) => {
  const qty = toNum(item?.requested_qty) ?? 1
  const unitWeight = toNum(item?.weight_kg ?? item?.op_weight_kg)
  const weightKg = unitWeight != null && unitWeight > 0 ? unitWeight * qty : null
  const length = toNum(item?.length_cm ?? item?.op_length_cm)
  const width = toNum(item?.width_cm ?? item?.op_width_cm)
  const height = toNum(item?.height_cm ?? item?.op_height_cm)
  const unitVolumeCbm =
    length != null && width != null && height != null && length > 0 && width > 0 && height > 0
      ? (length * width * height) / 1e6
      : null
  const volumeCbm = unitVolumeCbm != null ? unitVolumeCbm * qty : null
  return {
    qty,
    unit_weight_kg: unitWeight,
    weight_kg: weightKg,
    unit_volume_cbm: unitVolumeCbm,
    volume_cbm: volumeCbm,
  }
}

const computeRouteLogistics = (route, item) => {
  if (!route) return { amount: null, currency: null, meta: null }
  const model = (route.pricing_model || "fixed").toLowerCase()
  const ratePerKg = toNum(route.rate_per_kg)
  const ratePerCbm = toNum(route.rate_per_cbm)
  const minCost = toNum(route.min_cost)
  const volCoef = toNum(route.volumetric_kg_per_cbm) ?? 167
  const roundKg = toNum(route.round_step_kg)
  const roundCbm = toNum(route.round_step_cbm)

  const metrics = getItemMetrics(item)
  const weightTotal = toNum(metrics.weight_kg)
  const volumeTotal = toNum(metrics.volume_cbm)
  const roundedWeight = weightTotal != null ? roundUp(weightTotal, roundKg) : null
  const roundedVolume = volumeTotal != null ? roundUp(volumeTotal, roundCbm) : null

  let baseCost = null
  let chargeableKg = null
  let chargeableCbm = null
  let volumetricWeight = null

  if (model === "fixed") {
    baseCost = toNum(route.cost)
  } else if (model === "per_kg") {
    chargeableKg = roundedWeight
    baseCost = chargeableKg != null && ratePerKg != null ? chargeableKg * ratePerKg : null
  } else if (model === "per_cbm") {
    chargeableCbm = roundedVolume
    baseCost = chargeableCbm != null && ratePerCbm != null ? chargeableCbm * ratePerCbm : null
  } else if (model === "per_kg_or_cbm_max") {
    volumetricWeight = roundedVolume != null ? roundedVolume * volCoef : null
    if (roundedWeight != null && volumetricWeight != null) {
      chargeableKg = Math.max(roundedWeight, volumetricWeight)
    } else {
      chargeableKg = roundedWeight != null ? roundedWeight : volumetricWeight
    }
    if (chargeableKg != null && ratePerKg != null) {
      baseCost = chargeableKg * ratePerKg
    } else if (roundedVolume != null && ratePerCbm != null) {
      baseCost = roundedVolume * ratePerCbm
    }
  }

  if (baseCost != null && minCost != null && baseCost < minCost) {
    baseCost = minCost
  }

  return {
    amount: baseCost,
    currency: route.currency || null,
    meta: {
      pricing_model: model,
      rate_per_kg: ratePerKg,
      rate_per_cbm: ratePerCbm,
      min_cost: minCost,
      volumetric_kg_per_cbm: volCoef,
      round_step_kg: roundKg,
      round_step_cbm: roundCbm,
      qty: metrics.qty,
      unit_weight_kg: metrics.unit_weight_kg,
      weight_kg: metrics.weight_kg,
      unit_volume_cbm: metrics.unit_volume_cbm,
      volume_cbm: metrics.volume_cbm,
      chargeable_kg: chargeableKg,
      chargeable_cbm: chargeableCbm,
      volumetric_weight_kg: volumetricWeight,
      base_cost: baseCost,
    },
  }
}

const OFFER_STATUS_META = {
  draft: { color: "default", label: "Черновик" },
  proposed: { color: "processing", label: "Предложен" },
  approved: { color: "success", label: "Выбран" },
  rejected: { color: "error", label: "Отклонён" },
}

const INITIAL_FORM = {
  supplier_part_id: null,
  supplier_part_number: "",
  supplier_part_description: "",
  supplier_price: null,
  supplier_currency: "USD",
  lead_time_days: null,
  logistics_route_id: null,
  logistics_cost: null,
  logistics_currency: null,
  moq: null,
  packaging: "",
  markup_pct: null,
  markup_abs: null,
  material_id: null,
  client_price: null,
  client_currency: "USD",
  status: "draft",
  comment_internal: "",
  comment_client: "",
  client_visible: false,
}

const normalizeOfferStatus = (status) =>
  status ? String(status).trim().toLowerCase() : "draft"

const statusMakesVisible = (status) =>
  ["proposed", "approved"].includes(normalizeOfferStatus(status))

const isOfferVisible = (offer) =>
  !!offer?.client_visible || statusMakesVisible(offer?.status)

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
  const [bundleAddingId, setBundleAddingId] = useState(null)
  const [selectedSuggestions, setSelectedSuggestions] = useState([])
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
      } catch (e) {
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
  }, [open, item?.original_part_id, item?.id])

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
          } catch (e) {
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

  const loadOffers = async (orderItemId) => {
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

  const quickAddSelected = async () => {
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
    setBundleAddingId(bundle.id)
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
    } finally {
      setBundleAddingId(null)
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

  const handleStatusChange = async (offer, status) => {
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
  }

  const handleToggleVisibility = async (offer, visible) => {
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
  }

  const handleSelectOffer = async (offer) => {
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
  }

  const handleDeleteOffer = async (offer) => {
    try {
      await axios.delete(`/client-orders/offers/${offer.id}`)
      message.success("Оффер удалён")
      await loadOffers(offer.order_item_id)
      onOffersUpdated?.()
    } catch (e) {
      console.error("delete offer error", e)
      message.error("Не удалось удалить оффер")
    }
  }

  const renderSupplier = (row) =>
    canEditOffers ? (
      <Space direction="vertical" size={2}>
        <span>{row.supplier_name || row.supplier_public_code || "—"}</span>
        {row.supplier_public_code && <Tag>{row.supplier_public_code}</Tag>}
      </Space>
    ) : (
      <Tag>{row.supplier_public_code || "—"}</Tag>
    )

  const offerRowClassName = (record) => {
    const classes = []
    if (isOfferVisible(record)) classes.push("offer-row-visible")
    if (record.status === "approved") classes.push("offer-row-approved")
    return classes.join(" ")
  }

  const columnsOffers = useMemo(
    () => [
      {
        title: "Тип",
        dataIndex: "bundle_id",
        width: 90,
        render: (v) =>
          v ? <Tag color="geekblue">Комплект</Tag> : <Tag>Деталь</Tag>,
      },
      {
        title: "Поставщик",
        key: "supplier",
        width: 200,
        render: (_, r) => renderSupplier(r),
      },
      {
        title: "Cat# пост.",
        dataIndex: "supplier_part_number",
        width: 140,
        ellipsis: true,
      },
      {
        title: "Описание у поставщика",
        dataIndex: "supplier_part_description",
        width: 220,
        ellipsis: true,
        render: (v) => v || "—",
      },
      {
        title: "Деталь / Комплектация",
        dataIndex: "supplier_part_description",
        width: 220,
        ellipsis: true,
        render: (v, r) => (
          <Space direction="vertical" size={2}>
            <span>{v || r.comment_internal || "—"}</span>
            {r.bundle_id && r.comment_internal && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {r.comment_internal}
              </Text>
            )}
          </Space>
        ),
      },
      {
        title: "Цена пост.",
        dataIndex: "supplier_price",
        width: 120,
        render: (v, r) =>
          fmtMoney(v, r.supplier_currency || ""),
      },
      {
        title: "Логистика",
        key: "logi",
        width: 140,
        render: (v, r) =>
          r.logistics_cost != null
            ? fmtMoney(r.logistics_cost, r.logistics_currency || "")
            : "—",
      },
      {
        title: "Цена клиенту",
        dataIndex: "client_price",
        width: 140,
        render: (v, r) =>
          fmtMoney(v, r.client_currency || ""),
      },
      {
        title: "ETA",
        dataIndex: "eta_days_effective",
        width: 80,
        render: (v) => (v != null ? `${v} дн.` : "—"),
      },
      {
        title: "Для клиента",
        dataIndex: "client_visible",
        width: 130,
        render: (v, record) => {
          const visible = isOfferVisible(record)
          const isLocked = normalizeOfferStatus(record?.status) === "approved"
          if (canSelect) {
            return (
              <Checkbox
                checked={visible}
                disabled={isLocked}
                onChange={(e) =>
                  handleToggleVisibility(record, e.target.checked)
                }
              >
                Показать
              </Checkbox>
            )
          }
          return visible ? (
            <Tag color="green">Показан</Tag>
          ) : (
            <Tag>Скрыт</Tag>
          )
        },
      },
      {
        title: "Статус",
        dataIndex: "status",
        width: 140,
        render: (v, record) => {
          const meta = OFFER_STATUS_META[v] || { color: "default", label: v || "—" }
          if (!canEditOffers) return <Tag color={meta.color}>{meta.label}</Tag>
          return (
            <Select
              value={v}
              style={{ width: 130 }}
              onChange={(val) => handleStatusChange(record, val)}
              options={Object.entries(OFFER_STATUS_META).map(([value, m]) => ({
                value,
                label: m.label,
              }))}
            />
          )
        },
      },
      {
        title: "",
        key: "actions",
        width: 180,
        render: (_, r) => (
          <Space>
            {canSelect && (
              <Button size="small" type="primary" onClick={() => handleSelectOffer(r)}>
                Выбрать
              </Button>
            )}
            {canEditOffers && (
              <Button size="small" danger onClick={() => handleDeleteOffer(r)}>
                Удалить
              </Button>
            )}
          </Space>
        ),
      },
    ],
    [canEditOffers, canSelect, handleToggleVisibility],
  )

  const bundleColumns = [
    { title: "Название", dataIndex: "title", width: 200, ellipsis: true },
    {
      title: "Комплектация (по умолчанию)",
      key: "defaults",
      render: (_, b) => {
        const defaults = (b.options || []).filter((o) => o.is_default)
        if (!defaults.length) return "—"
        return (
          <Space direction="vertical" size={4}>
            {defaults.map((o) => (
              <div key={o.link_id || `${o.item_id}-${o.supplier_part_id}`}>
                <Text type="secondary">{o.role_label || "деталь"}</Text>:{" "}
                <Tag>{o.supplier_part_number}</Tag>{" "}
                {canEditOffers ? (
                  <Text>{o.supplier_name || o.supplier_id || ""}</Text>
                ) : (
                  <Tag>{o.supplier_public_code || o.supplier_id || "—"}</Tag>
                )}
                {o.last_price != null && (
                  <Text>
                    {" "}
                    · {fmtMoney(o.last_price, o.last_currency || "")}
                  </Text>
                )}
              </div>
            ))}
          </Space>
        )
      },
    },
    {
      title: "Итого",
      dataIndex: "totals",
      width: 180,
      render: (_, b) => {
        const totals = b.totals || []
        if (!totals.length) return "—"
        return (
          <Space direction="vertical" size={2}>
            {totals.map((t, idx) => (
              <span key={idx}>
                {fmtMoney(t.total_price, t.currency_iso3)}
              </span>
            ))}
          </Space>
        )
      },
    },
    {
      title: "",
      key: "act",
      width: 150,
      render: (_, b) => (
        <Space>
          <Button
            size="small"
            onClick={() => quickAddBundle(b)}
            loading={bundleAddingId === b.id}
          >
            Добавить комплект
          </Button>
        </Space>
      ),
    },
  ]

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

  const readyTabContent = (
    <>
      <Divider orientation="left" style={{ margin: "4px 0" }}>
        Варианты для добавления (чекбоксами можно выбрать несколько)
      </Divider>
      <Space wrap align="center" style={{ marginBottom: 8 }}>
        <Select
          placeholder="Маршрут для быстрых добавлений"
          allowClear
          style={{ minWidth: 220 }}
          value={readyRouteId}
          onChange={setReadyRouteId}
          options={routes.map((r) => ({ value: r.id, label: r.name || `Маршрут #${r.id}` }))}
        />
        <InputNumber
          placeholder="Маржа, %"
          value={readyMarkupPct}
          onChange={setReadyMarkupPct}
          addonAfter={
            <Tooltip title="Процент наценки от себестоимости (цена пост. + логистика + пошлина)">
              <InfoCircleOutlined />
            </Tooltip>
          }
        />
        <InputNumber
          placeholder="Маржа, ед."
          value={readyMarkupAbs}
          onChange={setReadyMarkupAbs}
          addonAfter={
            <Tooltip title="Фиксированная наценка в валюте заказа, прибавляется после процента">
              <InfoCircleOutlined />
            </Tooltip>
          }
        />
        <Button size="small" type="primary" onClick={computeReadyCalcs} loading={readyCalcLoading}>
          Пересчитать варианты
        </Button>
        <Checkbox
          checked={clientVisibleOnAdd}
          onChange={(e) => setClientVisibleOnAdd(e.target.checked)}
          disabled={!canSelect}
        >
          Сразу показывать клиенту (статус «Предложен»)
        </Checkbox>
        <Text type="secondary">Применится ко всем выбранным быстрым офферам.</Text>
      </Space>
      <div
        style={{
          overflowX: "auto",
          border: "1px solid #f0f0f0",
          borderRadius: 8,
          padding: 12,
          background: "#fff",
        }}
      >
        <Table
          rowKey="key"
          size="small"
          className="op-table"
          columns={[
            {
              title: "Тип",
              dataIndex: "type",
              width: 110,
              render: (v) =>
                v === "bundle" ? (
                  <Tag color="geekblue">Комплект</Tag>
                ) : (
                  <Tag>Деталь</Tag>
                ),
            },
            {
              title: "Поставщик / роль",
              dataIndex: "supplier",
              width: 220,
              render: (_, r) => (
                <Space direction="vertical" size={2}>
                  {renderSupplier(r)}
                  {r.role_label && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Роль: {r.role_label}
                    </Text>
                  )}
                </Space>
              ),
            },
            {
              title: "Материал",
              dataIndex: "material_label",
              width: 160,
              ellipsis: true,
              render: (v) => v || "—",
            },
            {
              title: "Cat# пост.",
              dataIndex: "supplier_part_number",
              width: 140,
              ellipsis: true,
            },
            {
              title: "Маршрут",
              dataIndex: "route",
              width: 190,
              render: (_, r) => (
                <Select
                  allowClear
                  placeholder="Маршрут"
                  value={readyRouteByKey[r.key] ?? readyRouteId}
                  style={{ width: 180 }}
                  onChange={(v) =>
                    setReadyRouteByKey((prev) => ({
                      ...prev,
                      [r.key]: v || null,
                    }))
                  }
                  options={routes.map((rt) => ({
                    value: rt.id,
                    label: rt.name || `Маршрут #${rt.id}`,
                  }))}
                />
              ),
            },
            {
              title: "Деталь / Комплектация",
              dataIndex: "part",
              ellipsis: true,
              render: (_, r) =>
                r.type === "bundle" ? (
                  <Space direction="vertical" size={2}>
                    <Text strong>{r.title}</Text>
                    {(r.defaults || []).map((d) => (
                      <Text key={`${d.role_label}-${d.supplier_part_number}`} type="secondary" style={{ fontSize: 12 }}>
                        {d.role_label || "деталь"}: {d.supplier_part_number} · {d.supplier_name || d.supplier_public_code || ""}
                        {d.last_price != null && ` · ${fmtMoney(d.last_price, d.last_currency || "")}`}
                      </Text>
                    ))}
                  </Space>
                ) : (
                  <span>{r.supplier_description || "—"}</span>
                ),
            },
            {
              title: "Цена",
              dataIndex: "price",
              width: 130,
              render: (v) => (v ? v : "—"),
            },
            {
              title: "Цена клиенту",
              dataIndex: "client_price",
              width: 150,
              render: (_, r) => {
                const calcRow = readyCalcs[r.key]
                return calcRow?.client_price != null
                  ? `${calcRow.client_price.toFixed(2)} ${calcRow.currency || ""}`
                  : "—"
              },
            },
            {
              title: "ETA",
              dataIndex: "eta",
              width: 90,
              render: (_, r) => {
                const calcRow = readyCalcs[r.key]
                return calcRow?.eta != null ? `${calcRow.eta} дн.` : "—"
              },
            },
            {
              title: "Приоритет",
              dataIndex: "priority",
              width: 120,
              render: (_, r) => {
                const calcRow = readyCalcs[r.key]
                if (!calcRow || calcRow.client_price == null) return null
                const prices = Object.values(readyCalcs)
                  .map((c) => c.client_price)
                  .filter((v) => v != null)
                const etas = Object.values(readyCalcs)
                  .map((c) => c.eta)
                  .filter((v) => v != null)
                const minPrice = prices.length ? Math.min(...prices) : null
                const minEta = etas.length ? Math.min(...etas) : null
                const tags = []
                if (minPrice != null && calcRow.client_price === minPrice) {
                  tags.push(<Tag color="green" key="best-price">Лучшая цена</Tag>)
                }
                if (minEta != null && calcRow.eta === minEta) {
                  tags.push(<Tag color="blue" key="best-eta">Быстрее</Tag>)
                }
                return tags.length ? <Space size={[4, 4]} wrap>{tags}</Space> : null
              },
            },
          ]}
          dataSource={[
            ...bundles.map((b) => ({
              key: `bundle-${b.id}`,
              type: "bundle",
              title: b.title || `Комплект #${b.id}`,
              price:
                Array.isArray(b.totals) && b.totals[0]
                  ? fmtMoney(b.totals[0].total_price, b.totals[0].currency_iso3 || "")
                  : "",
              defaults: Array.isArray(b.options)
                ? b.options.filter((o) => o.is_default)
                : [],
              supplier_name: (() => {
                const d = Array.isArray(b.options) ? b.options.find((o) => o.is_default) : null
                return d?.supplier_name || null
              })(),
              supplier_public_code: (() => {
                const d = Array.isArray(b.options) ? b.options.find((o) => o.is_default) : null
                return d?.supplier_public_code || null
              })(),
              supplier_part_number: (() => {
                const d = Array.isArray(b.options) ? b.options.find((o) => o.is_default) : null
                return d?.supplier_part_number || null
              })(),
              supplier_description: (() => {
                const d = Array.isArray(b.options) ? b.options.find((o) => o.is_default) : null
                return d?.role_label || null
              })(),
              raw: b,
            })),
            ...suggestionRows.map((s) => ({
              ...s,
              price:
                s.latest_price != null
                  ? fmtMoney(s.latest_price, s.latest_price_currency || "")
                  : "",
              raw: s.raw,
            })),
          ]}
          pagination={false}
          loading={bundlesLoading || suggestionsLoading}
          locale={{ emptyText: "Готовых вариантов нет" }}
          rowSelection={{
            selectedRowKeys: selectedVariantKeys,
            onChange: (_, rows) => {
              setSelectedVariantKeys(rows.map((r) => r.key))
              setSelectedVariants(rows)
              setSelectedSuggestions(rows)
            },
          }}
        />
        <div style={{ marginTop: 8, display: "flex", gap: 12, alignItems: "center" }}>
          <Button
            type="primary"
            size="small"
            onClick={async () => {
              if (!item?.id) {
                message.warning("Сохраните заказ и позицию, чтобы добавить офферы")
                return
              }
              if (!selectedVariants.length) {
                message.info("Выберите варианты для добавления")
                return
              }
              try {
                for (const v of selectedVariants) {
                  if (v.type === "bundle") {
                    // добавляем комплект целиком
                    // eslint-disable-next-line no-await-in-loop
                    await quickAddBundle(v.raw, { silent: true })
                  } else if (v.type === "part") {
                    // eslint-disable-next-line no-await-in-loop
                    await addSupplierPartOffer(v.raw)
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
            }}
            disabled={editingDisabled}
          >
            Добавить выбранные ({selectedVariants.length})
          </Button>
          <Text type="secondary">
            Комплект добавляется целиком (по вариантам по умолчанию), деталь — как отдельный оффер.
          </Text>
        </div>
      </div>
    </>
  )

  const offersTabContent = (
    <div
      style={{
        overflowX: "auto",
        border: "1px solid #f0f0f0",
        borderRadius: 8,
        padding: 12,
        background: "#fafafa",
      }}
    >
      <Space direction="vertical" size={12} style={{ width: "100%" }}>
        <Space
          wrap
          align="center"
          style={{ width: "100%", justifyContent: "space-between" }}
        >
          <Segmented
            size="small"
            value={offersFilter}
            onChange={setOffersFilter}
            options={offerFilterOptions}
          />
          <Space wrap>
            <Tag>Всего: {offersStats.total}</Tag>
            <Tag color="blue">Для клиента: {offersStats.visible}</Tag>
            <Tag color="green">Выбраны: {offersStats.approved}</Tag>
          </Space>
        </Space>

        {(canEditOffers || canSelect) && (
          <Space wrap align="center">
            <Text type="secondary">Выбрано: {selectedOfferKeys.length}</Text>
            <Button
              size="small"
              onClick={() => handleBulkVisibility(true)}
              disabled={!canSelect || !selectedOfferKeys.length}
              loading={bulkUpdating}
            >
              Показать клиенту
            </Button>
            <Button
              size="small"
              onClick={() => handleBulkVisibility(false)}
              disabled={!canSelect || !selectedOfferKeys.length}
              loading={bulkUpdating}
            >
              Скрыть
            </Button>
            <Select
              size="small"
              placeholder="Статус выбранным"
              value={bulkStatus || undefined}
              onChange={handleBulkStatus}
              disabled={!canEditOffers || !selectedOfferKeys.length}
              loading={bulkUpdating}
              style={{ width: 200 }}
              options={Object.entries(OFFER_STATUS_META).map(([value, m]) => ({
                value,
                label: m.label,
              }))}
            />
            <Button
              size="small"
              type="primary"
              onClick={() => handleSelectOffer(selectedOffers[0])}
              disabled={!canSelect || selectedOffers.length !== 1}
            >
              Выбрать
            </Button>
            <Text type="secondary">
              Показано: {filteredOffers.length} из {offers.length}
            </Text>
          </Space>
        )}

        <Table
          rowKey="id"
          size="small"
          className="op-table"
          columns={columnsOffers}
          dataSource={filteredOffers}
          pagination={false}
          scroll={{ x: 940 }}
          loading={offersLoading}
          rowClassName={offerRowClassName}
          rowSelection={
            canEditOffers || canSelect
              ? {
                  selectedRowKeys: selectedOfferKeys,
                  onChange: setSelectedOfferKeys,
                }
              : undefined
          }
          locale={{ emptyText: offersLoading ? "Загрузка..." : "Офферы пока не добавлены" }}
          title={() =>
            "Текущие офферы (галочка «Для клиента» синхронизирует статус «Предложен/Черновик»)"
          }
        />
      </Space>
    </div>
  )

  const newOfferTabContent = (
    <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
      <Space direction="vertical" style={{ flex: 1, minWidth: 620 }} size="middle">
        <Space wrap>
          <Input
            placeholder="Деталь поставщика (выберите через поиск)"
            value={
              formValues.supplier_part_id
                ? `Выбрана деталь: ${formValues.supplier_part_number || formValues.supplier_part_id}${
                    formValues.supplier_part_description
                      ? ` — ${formValues.supplier_part_description}`
                      : ""
                  }`
                : ""
            }
            readOnly
            style={{ width: 320 }}
          />
          <Button onClick={() => setSupplierPartPickerOpen(true)} disabled={editingDisabled}>
            Найти деталь поставщика
          </Button>
          <InputNumber
            placeholder="Цена пост."
            value={formValues.supplier_price}
            onChange={(v) =>
              setFormValues((prev) => ({ ...prev, supplier_price: v }))
            }
          />
          <CurrencySelect
            value={formValues.supplier_currency}
            onChange={(v) =>
              setFormValues((prev) => ({
                ...prev,
                supplier_currency: v || null,
              }))
            }
            style={{ minWidth: 120 }}
          />
          <InputNumber
            placeholder="Срок, дн."
            value={formValues.lead_time_days}
            onChange={(v) =>
              setFormValues((prev) => ({ ...prev, lead_time_days: v }))
            }
          />
          <InputNumber
            placeholder="MOQ"
            value={formValues.moq}
            onChange={(v) =>
              setFormValues((prev) => ({ ...prev, moq: v }))
            }
          />
        </Space>
        <Space wrap>
          <Input
            placeholder="Упаковка"
            style={{ width: 200 }}
            value={formValues.packaging}
            onChange={(e) =>
              setFormValues((prev) => ({ ...prev, packaging: e.target.value }))
            }
          />
          <Select
            placeholder="Материал"
            allowClear
            loading={materialsLoading}
            style={{ minWidth: 200 }}
            value={formValues.material_id || undefined}
            onChange={(v) =>
              setFormValues((prev) => ({
                ...prev,
                material_id: v || null,
              }))
            }
            options={materials.map((m) => ({
              value: m.material_id,
              label: m.material_name || m.material_code || m.material_id,
            }))}
          />
          <InputNumber
            placeholder="Маржа, %"
            value={formValues.markup_pct}
            onChange={(v) =>
              setFormValues((prev) => ({ ...prev, markup_pct: v }))
            }
            addonAfter={
              <Tooltip title="Процент наценки от себестоимости (цена пост. + логистика + пошлина)">
                <InfoCircleOutlined />
              </Tooltip>
            }
            style={{ minWidth: 180 }}
          />
          <InputNumber
            placeholder="Маржа, ед."
            value={formValues.markup_abs}
            onChange={(v) =>
              setFormValues((prev) => ({ ...prev, markup_abs: v }))
            }
            addonAfter={
              <Tooltip title="Фиксированная наценка в валюте заказа, прибавляется после процента">
                <InfoCircleOutlined />
              </Tooltip>
            }
            style={{ minWidth: 180 }}
          />
          <Select
            placeholder="Маршрут"
            allowClear
            style={{ width: 200 }}
            value={formValues.logistics_route_id}
            onChange={(v) =>
              setFormValues((prev) => ({ ...prev, logistics_route_id: v }))
            }
            options={routes.map((r) => ({
              value: r.id,
              label: r.name || `Маршрут #${r.id}`,
            }))}
            suffixIcon={
              <Tooltip title="Тариф/стоимость и надбавки маршрута попадут в логистику и ETA">
                <InfoCircleOutlined />
              </Tooltip>
            }
          />
          <InputNumber
            placeholder="Логистика"
            value={formValues.logistics_cost}
            onChange={(v) =>
              setFormValues((prev) => ({ ...prev, logistics_cost: v }))
            }
          />
          <CurrencySelect
            value={formValues.logistics_currency}
            onChange={(v) =>
              setFormValues((prev) => ({
                ...prev,
                logistics_currency: v || null,
              }))
            }
            style={{ minWidth: 140 }}
          />
          <CurrencySelect
            value={formValues.client_currency}
            onChange={(v) =>
              setFormValues((prev) => ({
                ...prev,
                client_currency: v || null,
              }))
            }
            style={{ minWidth: 140 }}
            placeholder="Валюта клиента"
          />
          <Select
            value={formValues.status}
            style={{ width: 180 }}
            onChange={(v) => {
              const nextStatus = normalizeOfferStatus(v)
              setFormValues((prev) => ({
                ...prev,
                status: nextStatus,
                client_visible: statusMakesVisible(nextStatus),
              }))
            }}
            options={Object.entries(OFFER_STATUS_META).map(([value, m]) => ({
              value,
              label: m.label,
            }))}
          />
          <Checkbox
            checked={linkWhenAdding}
            onChange={(e) => setLinkWhenAdding(e.target.checked)}
          >
            Привязать к оригиналу
          </Checkbox>
          <Checkbox
            checked={!!formValues.client_visible}
            onChange={(e) => {
              const visible = e.target.checked
              setFormValues((prev) => {
                const currentStatus = normalizeOfferStatus(prev.status)
                const nextStatus = visible
                  ? currentStatus === "approved"
                    ? "approved"
                    : "proposed"
                  : currentStatus === "approved"
                    ? "approved"
                    : "draft"
                return {
                  ...prev,
                  status: nextStatus,
                  client_visible: visible,
                }
              })
            }}
          >
            Показать клиенту (статус «Предложен»)
          </Checkbox>
          <Button
            type="primary"
            onClick={handleAdd}
            loading={adding}
            disabled={!formValues.supplier_part_id || editingDisabled}
          >
            Добавить оффер
          </Button>
        </Space>
        <Input.TextArea
          rows={2}
          placeholder="Внутренний комментарий"
          value={formValues.comment_internal}
          onChange={(e) =>
            setFormValues((prev) => ({ ...prev, comment_internal: e.target.value }))
          }
        />
        <Input.TextArea
          rows={2}
          placeholder="Комментарий для клиента"
          value={formValues.comment_client}
          onChange={(e) =>
            setFormValues((prev) => ({ ...prev, comment_client: e.target.value }))
          }
        />
      </Space>
      <Card
        size="small"
        title="Калькулятор цены"
        style={{ minWidth: 300, maxWidth: 360 }}
        extra={
          <Button size="small" type="primary" onClick={handleCalculate} loading={calcLoading}>
            Пересчитать
          </Button>
        }
      >
        <Space direction="vertical" size={8} style={{ width: "100%" }}>
          <Text type="secondary">
            Использует цену пост., логистику, маршрут (наценка), ТН ВЭД: {item?.tnved_code_value || "—"}.
            Маржа % от себестоимости (пост.+логистика+пошлина), маржа ед. добавляется сверху.
          </Text>
          {calc ? (
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="Целевая валюта">{calc.target_currency || item?.order_currency || "—"}</Descriptions.Item>
              <Descriptions.Item label="Пост. в целевой">
                {fmtMoney(calc.supplier.converted, calc.target_currency)}
                {calc.supplier.fx_rate ? ` (FX ${calc.supplier.fx_rate})` : ""}
              </Descriptions.Item>
              <Descriptions.Item label="Логистика (с надб.)">
                {fmtMoney(calc.logistics.converted, calc.target_currency)}
              </Descriptions.Item>
              <Descriptions.Item label="Пошлина">
                {calc.duty_amount != null
                  ? `${fmtMoney(calc.duty_amount, calc.target_currency)} (${calc.duty_rate || 0}%)`
                  : "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Себестоимость">{fmtMoney(calc.landed_cost, calc.target_currency)}</Descriptions.Item>
              <Descriptions.Item label="Маржа">
                {calc.markup_pct != null ? `${calc.markup_pct || 0}%` : ""}{" "}
                {calc.markup_abs != null && `+ ${fmtMoney(calc.markup_abs, calc.target_currency)}`}
              </Descriptions.Item>
              <Descriptions.Item label="Цена клиенту">{fmtMoney(calc.client_price, calc.target_currency)}</Descriptions.Item>
              <Descriptions.Item label="ETA">{calc.eta != null ? `${calc.eta} дн.` : "—"}</Descriptions.Item>
            </Descriptions>
          ) : (
            <Text type="secondary">Заполните цену, логистику и нажмите «Пересчитать», чтобы увидеть цепочку.</Text>
          )}
        </Space>
      </Card>
    </div>
  )

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
          { key: "ready", label: "Готовые варианты", children: readyTabContent },
          { key: "list", label: `Текущие офферы (${offers.length || 0})`, children: offersTabContent },
          {
            key: "new",
            label: "Новый оффер",
            children: canEditOffers
              ? newOfferTabContent
              : <Alert type="warning" message="Добавление офферов недоступно для вашей роли" />,
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

import React, { useEffect, useMemo, useState } from "react"
import {
  Alert,
  Button,
  Form,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd"
import axios from "@/api/axiosInstance"
import { formatPriceWithCurrency } from "@/utils/priceFormat"
import GroupRoutesPanel from "./economics/GroupRoutesPanel"
import AdhocRouteModal from "./economics/AdhocRouteModal"
import CandidatesCard from "./economics/CandidatesCard"
import GroupsCard from "./economics/GroupsCard"
import ScenariosCard from "./economics/ScenariosCard"

const { Text } = Typography

const safeNum = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}
const strategyLabel = (value) => {
  const key = String(value || "").toUpperCase()
  if (key === "MIN_LANDED") return "Минимальная итоговая стоимость"
  if (key === "MIN_ETA") return "Минимальный срок"
  if (key === "BALANCED") return "Сбалансировано"
  if (key === "MANUAL") return "Ручной"
  return value || "—"
}

const pricingModelLabel = (value) => {
  const raw = String(value || "")
  if (raw === "fixed") return "Фикс"
  if (raw === "per_kg") return "За кг"
  if (raw === "per_cbm") return "За м³"
  if (raw === "per_kg_or_cbm_max") return "Макс(кг/м³)"
  if (raw === "hybrid") return "Гибрид"
  return raw || "—"
}

export default function EconomicsTabContent({ rfqId }) {
  const [coverageCandidates, setCoverageCandidates] = useState([])
  const [candidatesLoading, setCandidatesLoading] = useState(false)
  const [candidatesError, setCandidatesError] = useState("")
  const [selectedCandidateId, setSelectedCandidateId] = useState(null)
  const [consolidationGroups, setConsolidationGroups] = useState([])
  const [groupsLoading, setGroupsLoading] = useState(false)
  const [groupsError, setGroupsError] = useState("")
  const [economyScenarios, setEconomyScenarios] = useState([])
  const [scenariosLoading, setScenariosLoading] = useState(false)
  const [scenariosError, setScenariosError] = useState("")
  const [autoGroupLoading, setAutoGroupLoading] = useState(false)
  const [createScenarioLoading, setCreateScenarioLoading] = useState(false)
  const [selectedScenarioId, setSelectedScenarioId] = useState(null)

  const [groupRoutes, setGroupRoutes] = useState([])
  const [groupRoutesLoading, setGroupRoutesLoading] = useState(false)
  const [groupRoutesError, setGroupRoutesError] = useState("")
  const [recalcScenarioLoading, setRecalcScenarioLoading] = useState(false)
  const [dutyBasis, setDutyBasis] = useState("GOODS_ONLY")

  const [adhocModalOpen, setAdhocModalOpen] = useState(false)
  const [adhocTargetRow, setAdhocTargetRow] = useState(null)
  const [adhocSaving, setAdhocSaving] = useState(false)
  const [adhocForm] = Form.useForm()

  const [corridors, setCorridors] = useState([])
  const [routeTemplates, setRouteTemplates] = useState([])
  const [catalogsLoading, setCatalogsLoading] = useState(false)
  const [catalogsError, setCatalogsError] = useState("")

  const loadCatalogs = async () => {
    setCatalogsLoading(true)
    setCatalogsError("")
    try {
      const [corridorsResp, templatesResp] = await Promise.all([
        axios.get(`/economics/v2/logistics/corridors`, { params: { active: 1 } }),
        axios.get(`/economics/v2/logistics/route-templates`, { params: { active: 1 } }),
      ])
      setCorridors(Array.isArray(corridorsResp?.data) ? corridorsResp.data : [])
      setRouteTemplates(Array.isArray(templatesResp?.data) ? templatesResp.data : [])
    } catch (e) {
      setCorridors([])
      setRouteTemplates([])
      setCatalogsError(e?.response?.data?.message || "Не удалось загрузить каталоги логистики")
    } finally {
      setCatalogsLoading(false)
    }
  }

  const loadCandidates = async () => {
    if (!rfqId) {
      setCoverageCandidates([])
      setCandidatesError("")
      return
    }
    setCandidatesLoading(true)
    setCandidatesError("")
    try {
      const { data } = await axios.get(`/economics/v2/rfq/${rfqId}/candidates`)
      const rows = Array.isArray(data?.rows) ? data.rows : []
      setCoverageCandidates(rows)
    } catch (e) {
      setCoverageCandidates([])
      setCandidatesError(e?.response?.data?.message || "Не удалось загрузить кандидатов экономики")
    } finally {
      setCandidatesLoading(false)
    }
  }

  useEffect(() => {
    loadCandidates()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rfqId])

  useEffect(() => {
    loadCatalogs()
  }, [])

  useEffect(() => {
    if (!coverageCandidates.length) {
      setSelectedCandidateId(null)
      return
    }
    const selected = Number(selectedCandidateId || 0)
    const exists = coverageCandidates.some((row) => Number(row?.candidate_set_id || 0) === selected)
    if (!exists) {
      setSelectedCandidateId(Number(coverageCandidates[0]?.candidate_set_id || 0) || null)
    }
  }, [coverageCandidates, selectedCandidateId])

  useEffect(() => {
    if (!economyScenarios.length) {
      setSelectedScenarioId(null)
      return
    }
    const selected = Number(selectedScenarioId || 0)
    const exists = economyScenarios.some((row) => Number(row?.scenario_id || 0) === selected)
    if (!exists) {
      setSelectedScenarioId(Number(economyScenarios[0]?.scenario_id || 0) || null)
    }
  }, [economyScenarios, selectedScenarioId])

  const loadGroups = async (candidateSetIdOverride) => {
    const candidateSetId = Number(candidateSetIdOverride || selectedCandidateId || 0)
    if (!rfqId || !candidateSetId) {
      setConsolidationGroups([])
      setGroupsError("")
      return
    }
    setGroupsLoading(true)
    setGroupsError("")
    try {
      const { data } = await axios.get(`/economics/v2/rfq/${rfqId}/shipment-groups`, {
        params: { candidate_set_id: candidateSetId },
      })
      setConsolidationGroups(Array.isArray(data?.rows) ? data.rows : [])
    } catch (e) {
      setConsolidationGroups([])
      setGroupsError(e?.response?.data?.message || "Не удалось загрузить группы консолидации")
    } finally {
      setGroupsLoading(false)
    }
  }

  const loadScenarios = async (candidateSetIdOverride) => {
    const candidateSetId = Number(candidateSetIdOverride || selectedCandidateId || 0)
    if (!rfqId || !candidateSetId) {
      setEconomyScenarios([])
      setScenariosError("")
      return
    }
    setScenariosLoading(true)
    setScenariosError("")
    try {
      const { data } = await axios.get(`/economics/v2/rfq/${rfqId}/scenarios`, {
        params: { candidate_set_id: candidateSetId },
      })
      setEconomyScenarios(Array.isArray(data?.rows) ? data.rows : [])
    } catch (e) {
      setEconomyScenarios([])
      setScenariosError(e?.response?.data?.message || "Не удалось загрузить сценарии экономики")
    } finally {
      setScenariosLoading(false)
    }
  }

  useEffect(() => {
    if (!selectedCandidateId) {
      setConsolidationGroups([])
      setGroupsError("")
      setEconomyScenarios([])
      setScenariosError("")
      setSelectedScenarioId(null)
      setGroupRoutes([])
      setGroupRoutesError("")
      return
    }
    loadGroups(selectedCandidateId)
    loadScenarios(selectedCandidateId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rfqId, selectedCandidateId])

  const loadGroupRoutes = async (scenarioIdOverride) => {
    const scenarioId = Number(scenarioIdOverride || selectedScenarioId || 0)
    if (!rfqId || !scenarioId) {
      setGroupRoutes([])
      setGroupRoutesError("")
      return
    }
    setGroupRoutesLoading(true)
    setGroupRoutesError("")
    try {
      const { data } = await axios.get(`/economics/v2/rfq/${rfqId}/scenarios/${scenarioId}/group-routes`)
      setGroupRoutes(Array.isArray(data) ? data : [])
    } catch (e) {
      setGroupRoutes([])
      setGroupRoutesError(e?.response?.data?.message || "Не удалось загрузить маршруты групп для сценария")
    } finally {
      setGroupRoutesLoading(false)
    }
  }

  useEffect(() => {
    if (!selectedScenarioId) {
      setGroupRoutes([])
      setGroupRoutesError("")
      return
    }
    loadGroupRoutes(selectedScenarioId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rfqId, selectedScenarioId])

  const handleAutoGroup = async () => {
    const candidateSetId = Number(selectedCandidateId || 0)
    if (!rfqId || !candidateSetId) return
    setAutoGroupLoading(true)
    try {
      const { data } = await axios.post(`/economics/v2/rfq/${rfqId}/shipment-groups/auto-from-candidate`, {
        candidate_set_id: candidateSetId,
        replace_existing: true,
      })
      message.success(data?.message || "Группы консолидации созданы")
      await loadGroups(candidateSetId)
      await loadScenarios(candidateSetId)
    } catch (e) {
      message.error(e?.response?.data?.message || "Не удалось создать группы консолидации")
    } finally {
      setAutoGroupLoading(false)
    }
  }

  const handleCreateScenario = async () => {
    const candidateSetId = Number(selectedCandidateId || 0)
    if (!rfqId || !candidateSetId) return
    setCreateScenarioLoading(true)
    try {
      const { data } = await axios.post(`/economics/v2/rfq/${rfqId}/scenarios/create-draft`, {
        candidate_set_id: candidateSetId,
        calc_currency: targetCurrency || "USD",
      })
      message.success(data?.message || "Черновой сценарий создан")
      await loadScenarios(candidateSetId)
    } catch (e) {
      message.error(e?.response?.data?.message || "Не удалось создать сценарий экономики")
    } finally {
      setCreateScenarioLoading(false)
    }
  }

  useEffect(() => {
    const handler = (event) => {
      const eventRfqId = Number(event?.detail?.rfqId || 0)
      if (!rfqId || !eventRfqId || Number(rfqId) !== eventRfqId) return
      loadCandidates()
    }
    window.addEventListener("rfq:econ2-candidates-updated", handler)
    return () => window.removeEventListener("rfq:econ2-candidates-updated", handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rfqId])

  const corridorOptions = useMemo(() => {
    const rows = Array.isArray(corridors) ? corridors : []
    return rows
      .map((c) => {
        const id = Number(c?.corridor_id || c?.id || 0) || null
        const name = c?.corridor_name || c?.name || "—"
        const mode = c?.transport_mode ? String(c.transport_mode) : ""
        return {
          value: id,
          label: `${name}${mode ? ` (${mode})` : ""}`,
          raw: c,
        }
      })
      .filter((o) => o.value)
  }, [corridors])

  const routeTemplateOptions = useMemo(() => {
    const rows = Array.isArray(routeTemplates) ? routeTemplates : []
    return rows
      .map((t) => {
        const id = Number(t?.route_template_id || t?.id || 0) || null
        const name = t?.route_template_name || t?.name || "—"
        const corridorName = t?.corridor_name || ""
        const currency = t?.currency || ""
        const model = t?.pricing_model || t?.pricing_model_snapshot || ""
        const extra = [corridorName, currency, model ? pricingModelLabel(model) : ""].filter(Boolean).join(", ")
        return {
          value: id,
          label: extra ? `${name} (${extra})` : name,
          raw: t,
        }
      })
      .filter((o) => o.value)
  }, [routeTemplates])

  const selectedScenario = useMemo(() => {
    const id = Number(selectedScenarioId || 0)
    if (!id) return null
    return economyScenarios.find((s) => Number(s?.scenario_id || 0) === id) || null
  }, [economyScenarios, selectedScenarioId])

  const catalogsEmpty = useMemo(
    () => !catalogsLoading && !corridors.length && !routeTemplates.length,
    [catalogsLoading, corridors, routeTemplates]
  )
  const targetCurrency = selectedScenario?.calc_currency || economyScenarios?.[0]?.calc_currency || "USD"
  const hasCandidates = coverageCandidates.length > 0
  const hasCandidateSelected = Number(selectedCandidateId || 0) > 0
  const hasScenarioSelected = Number(selectedScenarioId || 0) > 0

  const updateGroupRouteRow = (nextRow) => {
    if (!nextRow || !nextRow.id) return
    setGroupRoutes((prev) => prev.map((r) => (Number(r.id) === Number(nextRow.id) ? { ...r, ...nextRow } : r)))
  }

  const assignRouteTemplate = async (row, routeTemplateId) => {
    const scenarioId = Number(selectedScenarioId || 0)
    const groupId = Number(row?.shipment_group_id || 0)
    const tplId = Number(routeTemplateId || 0)
    if (!rfqId || !scenarioId || !groupId || !tplId) return
    try {
      const { data } = await axios.post(
        `/economics/v2/rfq/${rfqId}/scenarios/${scenarioId}/groups/${groupId}/route-template`,
        {
          route_template_id: tplId,
          selected_for_scenario: Number(row?.selected_for_scenario || 0) ? 1 : 0,
        }
      )
      if (data?.row) updateGroupRouteRow(data.row)
      message.success(data?.message || "Шаблон маршрута назначен")
    } catch (e) {
      message.error(e?.response?.data?.message || "Не удалось назначить шаблон маршрута")
    }
  }

  const openAdhocModal = (row) => {
    setAdhocTargetRow(row || null)
    const payload = row?.route_source_type === "adhoc" ? row?.route_payload_json : null
    const corridorId = Number(payload?.corridor_id || row?.corridor_id || row?.corridor_id_resolved || 0) || null
    const currency = payload?.currency || row?.currency_snapshot || "USD"
    const pricingModel = payload?.pricing_model || row?.pricing_model_snapshot || "fixed"

    adhocForm.setFieldsValue({
      corridor_id: corridorId,
      name: payload?.name || row?.route_name_snapshot || "",
      pricing_model: pricingModel,
      currency,
      fixed_cost: payload?.fixed_cost ?? null,
      rate_per_kg: payload?.rate_per_kg ?? null,
      rate_per_cbm: payload?.rate_per_cbm ?? null,
      min_cost: payload?.min_cost ?? null,
      markup_pct: payload?.markup_pct ?? 0,
      markup_fixed: payload?.markup_fixed ?? 0,
      eta_min_days: payload?.eta_min_days ?? row?.corridor_eta_min_days ?? null,
      eta_max_days: payload?.eta_max_days ?? row?.corridor_eta_max_days ?? null,
    })
    setAdhocModalOpen(true)
  }

  const saveAdhocRoute = async () => {
    const scenarioId = Number(selectedScenarioId || 0)
    const groupId = Number(adhocTargetRow?.shipment_group_id || 0)
    if (!rfqId || !scenarioId || !groupId) return
    let values
    try {
      values = await adhocForm.validateFields()
    } catch (_e) {
      return
    }
    setAdhocSaving(true)
    try {
      const { data } = await axios.post(
        `/economics/v2/rfq/${rfqId}/scenarios/${scenarioId}/groups/${groupId}/route-adhoc`,
        {
          ...values,
          selected_for_scenario: Number(adhocTargetRow?.selected_for_scenario || 0) ? 1 : 0,
        }
      )
      if (data?.row) updateGroupRouteRow(data.row)
      message.success(data?.message || "Ad-hoc маршрут назначен")
      setAdhocModalOpen(false)
      setAdhocTargetRow(null)
    } catch (e) {
      message.error(e?.response?.data?.message || "Не удалось назначить ad-hoc маршрут")
    } finally {
      setAdhocSaving(false)
    }
  }

  const toggleGroupSelected = async (row, checked) => {
    const scenarioId = Number(selectedScenarioId || 0)
    const groupId = Number(row?.shipment_group_id || 0)
    if (!rfqId || !scenarioId || !groupId) return

    const selectedForScenario = checked ? 1 : 0
    try {
      if (String(row?.route_source_type) === "template" && row?.route_template_id) {
        const { data } = await axios.post(
          `/economics/v2/rfq/${rfqId}/scenarios/${scenarioId}/groups/${groupId}/route-template`,
          { route_template_id: Number(row.route_template_id), selected_for_scenario: selectedForScenario }
        )
        if (data?.row) updateGroupRouteRow(data.row)
        return
      }
      if (String(row?.route_source_type) === "adhoc") {
        const payload = row?.route_payload_json || {}
        const corridorId = Number(payload?.corridor_id || row?.corridor_id || 0) || null
        if (!corridorId) throw new Error("corridor_missing")
        const { data } = await axios.post(
          `/economics/v2/rfq/${rfqId}/scenarios/${scenarioId}/groups/${groupId}/route-adhoc`,
          { ...payload, corridor_id: corridorId, selected_for_scenario: selectedForScenario }
        )
        if (data?.row) updateGroupRouteRow(data.row)
        return
      }
      message.warning("Сначала назначьте маршрут (шаблон или ad-hoc)")
    } catch (e) {
      message.error(e?.response?.data?.message || "Не удалось изменить включение группы в сценарий")
    }
  }

  const handleRecalculateScenario = async () => {
    const scenarioId = Number(selectedScenarioId || 0)
    if (!rfqId || !scenarioId) return
    setRecalcScenarioLoading(true)
    try {
      const { data } = await axios.post(`/economics/v2/rfq/${rfqId}/scenarios/${scenarioId}/recalculate`, {
        duty_basis: dutyBasis,
      })
      message.success(data?.message || "Сценарий пересчитан")
      if (data?.row?.scenario_id) {
        setEconomyScenarios((prev) =>
          prev.map((s) => (Number(s.scenario_id) === Number(data.row.scenario_id) ? { ...s, ...data.row } : s))
        )
      }
      await loadGroupRoutes(scenarioId)
    } catch (e) {
      message.error(e?.response?.data?.message || "Не удалось пересчитать сценарий")
    } finally {
      setRecalcScenarioLoading(false)
    }
  }

  const candidateColumns = useMemo(
    () => [
      { title: "Кандидат", dataIndex: "name" },
      {
        title: "Прогресс структуры",
        dataIndex: "progress_structure_pct",
        width: 140,
        render: (v) => <Tag color="blue">{safeNum(v) === null ? "—" : `${Number(v)}%`}</Tag>,
      },
      {
        title: "Прогресс с ценой",
        dataIndex: "progress_priced_pct",
        width: 130,
        render: (v) => (safeNum(v) === null ? "—" : `${Number(v)}%`),
      },
      {
        title: "OEM",
        dataIndex: "oem_ok",
        width: 90,
        render: (v) => (Number(v || 0) ? <Tag color="green">OK</Tag> : <Tag>—</Tag>),
      },
      { title: "Поставщиков", dataIndex: "supplier_count", width: 110 },
      { title: "Стран", dataIndex: "country_count", width: 80 },
      {
        title: "Консолидация",
        dataIndex: "consolidation_potential",
        width: 130,
        render: (v) => {
          const raw = String(v || "unknown")
          if (raw === "high") return <Tag color="green">Высокий</Tag>
          if (raw === "medium") return <Tag color="orange">Средний</Tag>
          if (raw === "low") return <Tag color="red">Низкий</Tag>
          return <Tag>Неизвестно</Tag>
        },
      },
      {
        title: "Score",
        dataIndex: "score_total",
        width: 90,
        render: (v) => (safeNum(v) === null ? "—" : Number(v).toFixed(0)),
      },
      {
        title: "Статус",
        dataIndex: "status",
        width: 160,
        render: (v) => {
          const s = String(v || "")
          if (s === "selected_for_economics") return <Tag color="green">Выбран для расчета</Tag>
          if (s === "candidate") return <Tag color="blue">Кандидат</Tag>
          if (s === "draft") return <Tag>Черновик</Tag>
          if (s === "archived") return <Tag color="default">Архив</Tag>
          return s || "—"
        },
      },
      { title: "Атомов", dataIndex: "candidate_items_count", width: 80 },
      { title: "С ценой", dataIndex: "candidate_items_with_price_count", width: 80 },
    ],
    []
  )

  const selectedCandidate = useMemo(
    () =>
      coverageCandidates.find(
        (row) => Number(row?.candidate_set_id || 0) === Number(selectedCandidateId || 0)
      ) || null,
    [coverageCandidates, selectedCandidateId]
  )

  const groupColumns = useMemo(
    () => [
      { title: "Группа", dataIndex: "name" },
      { title: "Код", dataIndex: "code", width: 80, render: (v) => v || "—" },
      { title: "Откуда", dataIndex: "from_country", width: 90, render: (v) => v || "—" },
      { title: "Куда", dataIndex: "to_country", width: 90, render: (v) => v || "—" },
      {
        title: "Статус",
        dataIndex: "status",
        width: 130,
        render: (v) => {
          const raw = String(v || "")
          if (raw === "draft") return <Tag>Черновик</Tag>
          if (raw === "ready_for_routing") return <Tag color="blue">Готово к маршрутам</Tag>
          if (raw === "routed") return <Tag color="green">Маршрут назначен</Tag>
          if (raw === "archived") return <Tag color="default">Архив</Tag>
          return raw || "—"
        },
      },
      {
        title: "Готовность данных",
        dataIndex: "data_readiness",
        width: 140,
        render: (v) => {
          const raw = String(v || "")
          if (raw === "ready") return <Tag color="green">ready</Tag>
          if (raw === "partial") return <Tag color="orange">partial</Tag>
          if (raw === "unknown") return <Tag>unknown</Tag>
          return raw || "—"
        },
      },
      { title: "Элементов", dataIndex: "linked_items_count", width: 95 },
      { title: "Поставщиков", dataIndex: "linked_suppliers_count", width: 105 },
      {
        title: "Товар (sum)",
        dataIndex: "goods_amount_sum",
        width: 140,
        render: (v, r) => formatPriceWithCurrency(v, r.goods_currency_hint || targetCurrency),
      },
      { title: "Срок (макс)", dataIndex: "lead_time_days_worst", width: 110, render: (v) => v ?? "—" },
    ],
    [targetCurrency]
  )

  const scenarioColumns = useMemo(
    () => [
      { title: "Сценарий", dataIndex: "name" },
      {
        title: "Стратегия",
        dataIndex: "strategy",
        width: 180,
        render: (v) => strategyLabel(v),
      },
      {
        title: "Статус",
        dataIndex: "status",
        width: 120,
        render: (v) => {
          const raw = String(v || "")
          if (raw === "draft") return <Tag>Черновик</Tag>
          if (raw === "calculated") return <Tag color="blue">Рассчитан</Tag>
          if (raw === "selected") return <Tag color="green">Выбран</Tag>
          if (raw === "archived") return <Tag color="default">Архив</Tag>
          return raw || "—"
        },
      },
      {
        title: "Прогресс",
        dataIndex: "coverage_progress_pct",
        width: 100,
        render: (v) => (safeNum(v) === null ? "—" : `${Number(v)}%`),
      },
      {
        title: "С ценой",
        dataIndex: "priced_progress_pct",
        width: 100,
        render: (v) => (safeNum(v) === null ? "—" : `${Number(v)}%`),
      },
      {
        title: "Товар",
        dataIndex: "goods_total",
        width: 130,
        render: (v, r) => formatPriceWithCurrency(v, r.calc_currency || targetCurrency),
      },
      {
        title: "Логистика",
        dataIndex: "logistics_total",
        width: 130,
        render: (v, r) => formatPriceWithCurrency(v, r.calc_currency || targetCurrency),
      },
      {
        title: "Пошлина",
        dataIndex: "duty_total",
        width: 130,
        render: (v, r) => formatPriceWithCurrency(v, r.calc_currency || targetCurrency),
      },
      {
        title: "Итог",
        dataIndex: "landed_total",
        width: 130,
        render: (v, r) => formatPriceWithCurrency(v, r.calc_currency || targetCurrency),
      },
      { title: "Групп", dataIndex: "groups_count", width: 70 },
      { title: "Маршр. OK", dataIndex: "routed_groups_ok_count", width: 90 },
      { title: "Проблем", dataIndex: "routed_groups_problem_count", width: 90 },
    ],
    [targetCurrency]
  )

  return (
    <Space direction="vertical" style={{ width: "100%" }} size={12}>
      <Alert
        type="info"
        showIcon
        message="Последовательность работы: Покрытие → Экономика → Выбор"
        description="1) В Покрытии сформируйте кандидатов и передайте их в Экономику. 2) В Экономике: выберите кандидата, сгруппируйте поставки, создайте сценарий, назначьте маршруты и пересчитайте итог. 3) Во вкладке Выбор примите финальное решение по позициям вручную."
      />
      <Space wrap>
        <Tag color={hasCandidates ? "green" : "default"}>1. Кандидаты</Tag>
        <Tag color={hasCandidateSelected ? "green" : "default"}>2. Группы</Tag>
        <Tag color={hasCandidateSelected ? "green" : "default"}>3. Сценарии</Tag>
        <Tag color={hasScenarioSelected ? "green" : "default"}>4. Маршруты и пересчет</Tag>
      </Space>

      <CandidatesCard
        loadCandidates={loadCandidates}
        candidatesLoading={candidatesLoading}
        selectedCandidateId={selectedCandidateId}
        autoGroupLoading={autoGroupLoading}
        handleAutoGroup={handleAutoGroup}
        createScenarioLoading={createScenarioLoading}
        handleCreateScenario={handleCreateScenario}
        candidatesError={candidatesError}
        coverageCandidates={coverageCandidates}
        setSelectedCandidateId={setSelectedCandidateId}
        candidateColumns={candidateColumns}
      />

      {hasCandidateSelected ? (
        <GroupsCard
          loadGroups={loadGroups}
          groupsLoading={groupsLoading}
          groupsError={groupsError}
          consolidationGroups={consolidationGroups}
          groupColumns={groupColumns}
          summary={() =>
            selectedCandidate ? (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={2}>
                  <Text type="secondary">Кандидат: {selectedCandidate.name}</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} colSpan={2}>
                  <Text type="secondary">
                    Прогресс: {safeNum(selectedCandidate.progress_structure_pct) ?? 0}% / с ценой{" "}
                    {safeNum(selectedCandidate.progress_priced_pct) ?? 0}%
                  </Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3} colSpan={6} />
              </Table.Summary.Row>
            ) : null
          }
        />
      ) : null}

      {hasCandidateSelected ? (
        <ScenariosCard
          loadScenarios={loadScenarios}
          scenariosLoading={scenariosLoading}
          scenariosError={scenariosError}
          economyScenarios={economyScenarios}
          scenarioColumns={scenarioColumns}
          selectedScenarioId={selectedScenarioId}
          setSelectedScenarioId={setSelectedScenarioId}
        />
      ) : null}

      {hasScenarioSelected ? (
        <GroupRoutesPanel
          groupRoutesError={groupRoutesError}
          groupRoutes={groupRoutes}
          groupRoutesLoading={groupRoutesLoading}
          loadCatalogs={loadCatalogs}
          catalogsLoading={catalogsLoading}
          loadGroupRoutes={loadGroupRoutes}
          handleRecalculateScenario={handleRecalculateScenario}
          recalcScenarioLoading={recalcScenarioLoading}
          dutyBasis={dutyBasis}
          setDutyBasis={setDutyBasis}
          routeTemplateOptions={routeTemplateOptions}
          assignRouteTemplate={assignRouteTemplate}
          openAdhocModal={openAdhocModal}
          toggleGroupSelected={toggleGroupSelected}
          targetCurrency={targetCurrency}
          catalogsEmpty={catalogsEmpty}
          catalogsError={catalogsError}
          safeNum={safeNum}
          pricingModelLabel={pricingModelLabel}
        />
      ) : null}

      <AdhocRouteModal
        open={adhocModalOpen}
        onCancel={() => {
          setAdhocModalOpen(false)
          setAdhocTargetRow(null)
        }}
        onOk={saveAdhocRoute}
        confirmLoading={adhocSaving}
        form={adhocForm}
        corridorOptions={corridorOptions}
        pricingModelLabel={pricingModelLabel}
      />
      {hasScenarioSelected ? (
        <Alert
          type="success"
          showIcon
          message="Дальше: вкладка «Выбор»"
          description="После пересчета сценария и назначения маршрутов переходите во вкладку «Выбор» для ручной финализации по позициям."
        />
      ) : null}
    </Space>
  )
}

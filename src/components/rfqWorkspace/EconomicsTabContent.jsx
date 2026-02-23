import React, { useEffect, useMemo, useState } from "react"
import { Alert, Button, Card, Select, Space, Table, Tag, Typography, message } from "antd"
import axios from "@/api/axiosInstance"
import { formatPriceWithCurrency } from "@/utils/priceFormat"

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
const selectionLabel = (value) => {
  const raw = String(value || "").trim()
  if (!raw) return "—"
  const lower = raw.toLowerCase()
  if (lower.startsWith("bom:")) return "Вариант BOM"
  if (lower.startsWith("kit:")) return "Вариант комплекта"
  if (lower.startsWith("role:")) return "Роль комплекта"
  if (lower.startsWith("item:")) return "Позиция"
  if (raw === "__NO_SELECTION__") return "Базовая позиция"
  return raw
}

export default function EconomicsTabContent({
  rfqId,
  economicsDashboard,
  economicsRebuildLoading,
  onRebuildEconomicsScenario,
}) {
  const suppliers = Array.isArray(economicsDashboard?.suppliers)
    ? economicsDashboard.suppliers
    : []
  const linesRaw = Array.isArray(economicsDashboard?.lines) ? economicsDashboard.lines : []
  const scenarios = Array.isArray(economicsDashboard?.scenarios)
    ? economicsDashboard.scenarios
    : []
  const latestScenarioLines = Array.isArray(economicsDashboard?.latest_scenario_lines)
    ? economicsDashboard.latest_scenario_lines
    : []
  const targetCurrency = economicsDashboard?.target_currency || null

  const [supplierFilter, setSupplierFilter] = useState(null)
  const [routeFilter, setRouteFilter] = useState(null)
  const [econ2Candidates, setEcon2Candidates] = useState([])
  const [econ2CandidatesLoading, setEcon2CandidatesLoading] = useState(false)
  const [econ2CandidatesError, setEcon2CandidatesError] = useState("")
  const [selectedEcon2CandidateId, setSelectedEcon2CandidateId] = useState(null)
  const [econ2Groups, setEcon2Groups] = useState([])
  const [econ2GroupsLoading, setEcon2GroupsLoading] = useState(false)
  const [econ2GroupsError, setEcon2GroupsError] = useState("")
  const [econ2Scenarios, setEcon2Scenarios] = useState([])
  const [econ2ScenariosLoading, setEcon2ScenariosLoading] = useState(false)
  const [econ2ScenariosError, setEcon2ScenariosError] = useState("")
  const [econ2AutoGroupLoading, setEcon2AutoGroupLoading] = useState(false)
  const [econ2CreateScenarioLoading, setEcon2CreateScenarioLoading] = useState(false)

  const loadEcon2Candidates = async () => {
    if (!rfqId) {
      setEcon2Candidates([])
      setEcon2CandidatesError("")
      return
    }
    setEcon2CandidatesLoading(true)
    setEcon2CandidatesError("")
    try {
      const { data } = await axios.get(`/economics/v2/rfq/${rfqId}/candidates`)
      const rows = Array.isArray(data?.rows) ? data.rows : []
      setEcon2Candidates(rows)
    } catch (e) {
      setEcon2Candidates([])
      setEcon2CandidatesError(
        e?.response?.data?.message || "Не удалось загрузить кандидатов Экономики v2"
      )
    } finally {
      setEcon2CandidatesLoading(false)
    }
  }

  useEffect(() => {
    loadEcon2Candidates()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rfqId])

  useEffect(() => {
    if (!econ2Candidates.length) {
      setSelectedEcon2CandidateId(null)
      return
    }
    const selected = Number(selectedEcon2CandidateId || 0)
    const exists = econ2Candidates.some((row) => Number(row?.candidate_set_id || 0) === selected)
    if (!exists) {
      setSelectedEcon2CandidateId(Number(econ2Candidates[0]?.candidate_set_id || 0) || null)
    }
  }, [econ2Candidates, selectedEcon2CandidateId])

  const loadEcon2Groups = async (candidateSetIdOverride) => {
    const candidateSetId = Number(candidateSetIdOverride || selectedEcon2CandidateId || 0)
    if (!rfqId || !candidateSetId) {
      setEcon2Groups([])
      setEcon2GroupsError("")
      return
    }
    setEcon2GroupsLoading(true)
    setEcon2GroupsError("")
    try {
      const { data } = await axios.get(`/economics/v2/rfq/${rfqId}/shipment-groups`, {
        params: { candidate_set_id: candidateSetId },
      })
      setEcon2Groups(Array.isArray(data?.rows) ? data.rows : [])
    } catch (e) {
      setEcon2Groups([])
      setEcon2GroupsError(
        e?.response?.data?.message || "Не удалось загрузить группы консолидации v2"
      )
    } finally {
      setEcon2GroupsLoading(false)
    }
  }

  const loadEcon2Scenarios = async (candidateSetIdOverride) => {
    const candidateSetId = Number(candidateSetIdOverride || selectedEcon2CandidateId || 0)
    if (!rfqId || !candidateSetId) {
      setEcon2Scenarios([])
      setEcon2ScenariosError("")
      return
    }
    setEcon2ScenariosLoading(true)
    setEcon2ScenariosError("")
    try {
      const { data } = await axios.get(`/economics/v2/rfq/${rfqId}/scenarios`, {
        params: { candidate_set_id: candidateSetId },
      })
      setEcon2Scenarios(Array.isArray(data?.rows) ? data.rows : [])
    } catch (e) {
      setEcon2Scenarios([])
      setEcon2ScenariosError(
        e?.response?.data?.message || "Не удалось загрузить сценарии Экономики v2"
      )
    } finally {
      setEcon2ScenariosLoading(false)
    }
  }

  useEffect(() => {
    if (!selectedEcon2CandidateId) {
      setEcon2Groups([])
      setEcon2GroupsError("")
      setEcon2Scenarios([])
      setEcon2ScenariosError("")
      return
    }
    loadEcon2Groups(selectedEcon2CandidateId)
    loadEcon2Scenarios(selectedEcon2CandidateId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rfqId, selectedEcon2CandidateId])

  const handleEcon2AutoGroup = async () => {
    const candidateSetId = Number(selectedEcon2CandidateId || 0)
    if (!rfqId || !candidateSetId) return
    setEcon2AutoGroupLoading(true)
    try {
      const { data } = await axios.post(`/economics/v2/rfq/${rfqId}/shipment-groups/auto-from-candidate`, {
        candidate_set_id: candidateSetId,
        replace_existing: true,
      })
      message.success(data?.message || "Группы консолидации созданы")
      await loadEcon2Groups(candidateSetId)
      await loadEcon2Scenarios(candidateSetId)
    } catch (e) {
      message.error(e?.response?.data?.message || "Не удалось создать группы консолидации v2")
    } finally {
      setEcon2AutoGroupLoading(false)
    }
  }

  const handleEcon2CreateScenario = async () => {
    const candidateSetId = Number(selectedEcon2CandidateId || 0)
    if (!rfqId || !candidateSetId) return
    setEcon2CreateScenarioLoading(true)
    try {
      const { data } = await axios.post(`/economics/v2/rfq/${rfqId}/scenarios/create-draft`, {
        candidate_set_id: candidateSetId,
        calc_currency: targetCurrency || "USD",
      })
      message.success(data?.message || "Черновой сценарий создан")
      await loadEcon2Scenarios(candidateSetId)
    } catch (e) {
      message.error(e?.response?.data?.message || "Не удалось создать сценарий Экономики v2")
    } finally {
      setEcon2CreateScenarioLoading(false)
    }
  }

  useEffect(() => {
    const handler = (event) => {
      const eventRfqId = Number(event?.detail?.rfqId || 0)
      if (!rfqId || !eventRfqId || Number(rfqId) !== eventRfqId) return
      loadEcon2Candidates()
    }
    window.addEventListener("rfq:econ2-candidates-updated", handler)
    return () => window.removeEventListener("rfq:econ2-candidates-updated", handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rfqId])

  const supplierOptions = useMemo(() => {
    const seen = new Set()
    const out = []
    linesRaw.forEach((row) => {
      const label = String(row?.supplier_name || "").trim()
      if (!label || seen.has(label)) return
      seen.add(label)
      out.push({ label, value: label })
    })
    return out.sort((a, b) => a.label.localeCompare(b.label))
  }, [linesRaw])

  const routeOptions = useMemo(() => {
    const seen = new Set()
    const out = []
    linesRaw.forEach((row) => {
      const label = String(row?.route_name || "").trim()
      if (!label || seen.has(label)) return
      seen.add(label)
      out.push({ label, value: label })
    })
    return out.sort((a, b) => a.label.localeCompare(b.label))
  }, [linesRaw])

  const lines = useMemo(
    () =>
      linesRaw.filter((row) => {
        if (supplierFilter && row?.supplier_name !== supplierFilter) return false
        if (routeFilter && row?.route_name !== routeFilter) return false
        return true
      }),
    [linesRaw, supplierFilter, routeFilter]
  )

  const summaryCards = useMemo(() => {
    const withLanded = linesRaw.filter((r) => safeNum(r?.landed_amount) !== null)
    const linesWithFxGap = linesRaw.filter((r) => Number(r?.fx_missing || 0) > 0).length
    return {
      totalLines: linesRaw.length,
      pricedLines: withLanded.length,
      fxGapLines: linesWithFxGap,
      suppliers: new Set(linesRaw.map((r) => r?.supplier_name).filter(Boolean)).size,
    }
  }, [linesRaw])

  const econ2CandidateColumns = useMemo(
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

  const econ2SelectedCandidate = useMemo(
    () =>
      econ2Candidates.find(
        (row) => Number(row?.candidate_set_id || 0) === Number(selectedEcon2CandidateId || 0)
      ) || null,
    [econ2Candidates, selectedEcon2CandidateId]
  )

  const econ2GroupColumns = useMemo(
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

  const econ2ScenarioColumns = useMemo(
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
      <Card
        size="small"
        title="Кандидаты из Покрытия (Экономика v2)"
        extra={
          <Space>
            <Button size="small" onClick={loadEcon2Candidates} loading={econ2CandidatesLoading}>
              Обновить v2
            </Button>
            <Button
              size="small"
              type="primary"
              disabled={!selectedEcon2CandidateId}
              loading={econ2AutoGroupLoading}
              onClick={handleEcon2AutoGroup}
            >
              Автосгруппировать
            </Button>
            <Button
              size="small"
              disabled={!selectedEcon2CandidateId}
              loading={econ2CreateScenarioLoading}
              onClick={handleEcon2CreateScenario}
            >
              Создать черновой сценарий
            </Button>
          </Space>
        }
      >
        {econ2CandidatesError ? (
          <Alert type="error" showIcon message={econ2CandidatesError} />
        ) : !econ2Candidates.length ? (
          <Alert
            type="info"
            showIcon
            message="Кандидаты еще не переданы из Покрытия"
            description="На вкладке «Покрытие» откройте режим «Комбинации», нажмите «Подсказать комбинации», затем «Передать в Экономику»."
          />
        ) : (
          <Table
            rowKey={(record) => Number(record.candidate_set_id)}
            dataSource={econ2Candidates}
            loading={econ2CandidatesLoading}
            pagination={{ pageSize: 8 }}
            rowSelection={{
              type: "radio",
              selectedRowKeys: selectedEcon2CandidateId ? [Number(selectedEcon2CandidateId)] : [],
              onChange: (keys) => setSelectedEcon2CandidateId(keys?.length ? Number(keys[0]) : null),
            }}
            columns={econ2CandidateColumns}
          />
        )}
      </Card>

      <Card
        size="small"
        title="Группы консолидации (Экономика v2)"
        extra={
          <Button
            size="small"
            onClick={() => loadEcon2Groups()}
            loading={econ2GroupsLoading}
            disabled={!selectedEcon2CandidateId}
          >
            Обновить группы
          </Button>
        }
      >
        {!selectedEcon2CandidateId ? (
          <Alert type="info" showIcon message="Выберите кандидата выше" />
        ) : econ2GroupsError ? (
          <Alert type="error" showIcon message={econ2GroupsError} />
        ) : !econ2Groups.length ? (
          <Alert
            type="info"
            showIcon
            message="Группы консолидации еще не созданы"
            description="Нажмите «Автосгруппировать» для выбранного кандидата."
          />
        ) : (
          <Table
            rowKey={(record) => `econ2-group:${record.shipment_group_id}`}
            dataSource={econ2Groups}
            loading={econ2GroupsLoading}
            pagination={{ pageSize: 8 }}
            columns={econ2GroupColumns}
            summary={() =>
              econ2SelectedCandidate ? (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={2}>
                    <Text type="secondary">
                      Кандидат: {econ2SelectedCandidate.name}
                    </Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={2} colSpan={2}>
                    <Text type="secondary">
                      Прогресс: {safeNum(econ2SelectedCandidate.progress_structure_pct) ?? 0}% / с ценой{" "}
                      {safeNum(econ2SelectedCandidate.progress_priced_pct) ?? 0}%
                    </Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={3} colSpan={6} />
                </Table.Summary.Row>
              ) : null
            }
          />
        )}
      </Card>

      <Card
        size="small"
        title="Сценарии (Экономика v2)"
        extra={
          <Button
            size="small"
            onClick={() => loadEcon2Scenarios()}
            loading={econ2ScenariosLoading}
            disabled={!selectedEcon2CandidateId}
          >
            Обновить сценарии
          </Button>
        }
      >
        {!selectedEcon2CandidateId ? (
          <Alert type="info" showIcon message="Выберите кандидата выше" />
        ) : econ2ScenariosError ? (
          <Alert type="error" showIcon message={econ2ScenariosError} />
        ) : !econ2Scenarios.length ? (
          <Alert
            type="info"
            showIcon
            message="Сценарии v2 еще не созданы"
            description="После автогруппировки нажмите «Создать черновой сценарий»."
          />
        ) : (
          <Table
            rowKey={(record) => `econ2-scenario:${record.scenario_id}`}
            dataSource={econ2Scenarios}
            loading={econ2ScenariosLoading}
            pagination={{ pageSize: 8 }}
            columns={econ2ScenarioColumns}
          />
        )}
      </Card>

      <Card size="small">
        <Space wrap align="center" style={{ justifyContent: "space-between", width: "100%" }}>
          <Space wrap>
            <Tag color="blue">Строк в расчете: {summaryCards.totalLines}</Tag>
            <Tag color="green">Со стоимостью: {summaryCards.pricedLines}</Tag>
            <Tag color={summaryCards.fxGapLines ? "orange" : "success"}>
              Без курса: {summaryCards.fxGapLines}
            </Tag>
            <Tag>Поставщиков: {summaryCards.suppliers}</Tag>
            {targetCurrency ? <Tag color="geekblue">Валюта расчета: {targetCurrency}</Tag> : null}
          </Space>
          <Button
            type="primary"
            onClick={onRebuildEconomicsScenario}
            loading={economicsRebuildLoading}
          >
            Пересчитать авто-сценарий
          </Button>
        </Space>
      </Card>

      <Card size="small" title="Сводка по поставщикам">
        <Table
          rowKey={(record, idx) => `${record.supplier_name || "s"}:${record.route_name || "r"}:${idx}`}
          dataSource={suppliers}
          pagination={false}
          columns={[
            { title: "Поставщик", dataIndex: "supplier_name" },
            { title: "Маршрут", dataIndex: "route_name", width: 180 },
            { title: "Строк", dataIndex: "lines_count", width: 80 },
            {
              title: "Товар",
              dataIndex: "goods_total",
              width: 130,
              render: (v, r) => formatPriceWithCurrency(v, r.calc_currency),
            },
            {
              title: "Логистика",
              dataIndex: "logistics_total",
              width: 130,
              render: (v, r) => formatPriceWithCurrency(v, r.calc_currency),
            },
            {
              title: "Пошлина",
              dataIndex: "duty_total",
              width: 130,
              render: (v, r) => formatPriceWithCurrency(v, r.calc_currency),
            },
            {
              title: "Итог",
              dataIndex: "landed_total",
              width: 140,
              render: (v, r) => formatPriceWithCurrency(v, r.calc_currency),
            },
            { title: "Срок, дн (макс)", dataIndex: "eta_days_worst", width: 130 },
            {
              title: "Строк без курса",
              dataIndex: "lines_with_currency_gap",
              width: 130,
              render: (v) => (Number(v || 0) > 0 ? <Tag color="orange">{v}</Tag> : <Tag color="green">0</Tag>),
            },
          ]}
        />
      </Card>

      <Card
        size="small"
        title="Варианты по строкам"
        extra={
          <Space wrap>
            <Select
              allowClear
              style={{ width: 220 }}
              options={supplierOptions}
              value={supplierFilter}
              onChange={setSupplierFilter}
              placeholder="Фильтр по поставщику"
              optionFilterProp="label"
              showSearch
            />
            <Select
              allowClear
              style={{ width: 220 }}
              options={routeOptions}
              value={routeFilter}
              onChange={setRouteFilter}
              placeholder="Фильтр по маршруту"
              optionFilterProp="label"
              showSearch
            />
          </Space>
        }
      >
        <Table
          rowKey={(record, idx) => record.row_key || `line:${idx}`}
          dataSource={lines}
          pagination={{ pageSize: 12 }}
          columns={[
            { title: "Строка RFQ", dataIndex: "line_number", width: 95 },
            { title: "Кат. номер", dataIndex: "part_number", width: 150 },
            { title: "Описание", dataIndex: "part_description" },
            {
              title: "Вариант",
              dataIndex: "selection_key_norm",
              width: 180,
              render: (v) => selectionLabel(v),
            },
            { title: "Поставщик", dataIndex: "supplier_name", width: 180 },
            { title: "Маршрут", dataIndex: "route_name", width: 150 },
            {
              title: "Товар",
              dataIndex: "goods_amount",
              width: 130,
              render: (v, r) => formatPriceWithCurrency(v, r.goods_currency || r.landed_currency),
            },
            {
              title: "Логистика",
              dataIndex: "logistics_amount",
              width: 130,
              render: (v, r) => formatPriceWithCurrency(v, r.logistics_currency || r.landed_currency),
            },
            {
              title: "Пошлина",
              dataIndex: "duty_amount",
              width: 130,
              render: (v, r) => formatPriceWithCurrency(v, r.landed_currency),
            },
            {
              title: "Итог",
              dataIndex: "landed_amount",
              width: 140,
              render: (v, r) => formatPriceWithCurrency(v, r.landed_currency),
            },
            { title: "Срок, дн", dataIndex: "eta_total_days", width: 95 },
            {
              title: "FX",
              dataIndex: "fx_missing",
              width: 70,
              render: (v) => (Number(v || 0) > 0 ? <Tag color="orange">нет</Tag> : <Tag color="green">ок</Tag>),
            },
          ]}
        />
      </Card>

      <Card size="small" title="Сценарии выбора">
        {!scenarios.length ? (
          <Alert
            type="info"
            showIcon
            message="Сценарии пока не рассчитаны"
            description="Нажмите «Пересчитать авто-сценарий», чтобы получить первый вариант выбора."
          />
        ) : (
          <Table
            rowKey={(record, idx) => record.scenario_id || `scenario:${idx}`}
            dataSource={scenarios}
            pagination={false}
            columns={[
              { title: "Название", dataIndex: "name" },
              {
                title: "Стратегия",
                dataIndex: "strategy",
                width: 220,
                render: (v) => strategyLabel(v),
              },
              { title: "Выбрано строк", dataIndex: "picked_lines", width: 120 },
              {
                title: "Товар",
                dataIndex: "goods_total",
                width: 120,
                render: (v, r) => formatPriceWithCurrency(v, r.currency_hint || targetCurrency),
              },
              {
                title: "Логистика",
                dataIndex: "logistics_total",
                width: 120,
                render: (v, r) => formatPriceWithCurrency(v, r.currency_hint || targetCurrency),
              },
              {
                title: "Пошлина",
                dataIndex: "duty_total",
                width: 120,
                render: (v, r) => formatPriceWithCurrency(v, r.currency_hint || targetCurrency),
              },
              {
                title: "Итог",
                dataIndex: "landed_total",
                width: 130,
                render: (v, r) => formatPriceWithCurrency(v, r.currency_hint || targetCurrency),
              },
              { title: "Срок, дн (макс)", dataIndex: "eta_days_worst", width: 130 },
              {
                title: "Ср. рейтинг",
                dataIndex: "avg_supplier_score",
                width: 110,
                render: (v) => (safeNum(v) === null ? "—" : Number(v).toFixed(2)),
              },
            ]}
          />
        )}
      </Card>

      {latestScenarioLines.length ? (
        <Card
          size="small"
          title={
            <Space>
              <span>Состав последнего сценария</span>
              {economicsDashboard?.latest_scenario_name ? (
                <Text type="secondary">{economicsDashboard.latest_scenario_name}</Text>
              ) : null}
            </Space>
          }
        >
          <Table
            rowKey={(record, idx) => record.row_key || `picked:${idx}`}
            dataSource={latestScenarioLines}
            pagination={false}
            columns={[
              { title: "Строка RFQ", dataIndex: "line_number", width: 95 },
              { title: "Кат. номер", dataIndex: "part_number", width: 150 },
              { title: "Описание", dataIndex: "part_description" },
              {
                title: "Вариант",
                dataIndex: "selection_key_norm",
                width: 180,
                render: (v) => selectionLabel(v),
              },
              { title: "Поставщик", dataIndex: "supplier_name", width: 180 },
              {
                title: "Итог",
                dataIndex: "landed_amount",
                width: 130,
                render: (v, r) => formatPriceWithCurrency(v, r.landed_currency || targetCurrency),
              },
              { title: "Срок, дн", dataIndex: "eta_total_days", width: 95 },
            ]}
          />
        </Card>
      ) : null}
    </Space>
  )
}

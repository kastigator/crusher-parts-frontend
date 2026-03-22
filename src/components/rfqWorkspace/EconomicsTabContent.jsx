import React, { useEffect, useMemo, useState } from "react"
import { Alert, Button, Card, Drawer, Form, Select, Space, Tag, Typography, message } from "antd"
import axios from "@/api/axiosInstance"
import { formatPriceWithCurrency } from "@/utils/priceFormat"
import DraggableColumnsTable from "@/components/common/DraggableColumnsTable"
import GroupRoutesPanel from "@/components/rfqWorkspace/economics/GroupRoutesPanel"
import AdhocRouteModal from "@/components/rfqWorkspace/economics/AdhocRouteModal"

const OPTION_KIND_LABELS = {
  WHOLE: "Целиком",
  BOM: "По составу",
  KIT: "Комплект",
  MIXED: "Комбинированный",
  MANUAL: "Ручной",
}

const { Paragraph, Text } = Typography
const SCENARIO_STATUS_LABELS = {
  draft: "Черновик",
  active: "Активный",
  selected: "Выбран",
  archived: "Архив",
  logistics_ready: "Готов к логистике",
  calculated: "Рассчитан",
}

const WARNING_LABELS = {
  missing_origin_country: "Нет страны происхождения",
  missing_incoterms: "Нет Incoterms",
  missing_incoterms_place: "Нет пункта Incoterms",
  missing_weight: "Нет веса",
  missing_lead_time: "Нет срока",
  missing_tnved: "Нет ТН ВЭД",
  missing_duty_rate: "Нет ставки пошлины",
  mixed_duty_rates: "Смешанные ставки пошлины",
  missing_fx_rate: "Нет курса валют",
}

const SOURCE_LABELS = {
  coverage_snapshot: "Страна происхождения: из покрытия",
  response_or_cost_base: "Страна происхождения: из ответа/базы себестоимости",
  supplier_only: "Страна происхождения: только страна поставщика",
  missing: "Страна происхождения: не определена",
  tnved: "Пошлина: по ТН ВЭД",
  tnved_missing_rate: "Пошлина: ТН ВЭД есть, ставки нет",
}

const WARNING_ACTIONS = {
  missing_origin_country: {
    tabKey: "coverage",
    buttonLabel: "Открыть Покрытие",
    hint: "Заполните страну происхождения в варианте покрытия или проверьте исходный ответ поставщика.",
  },
  missing_weight: {
    tabKey: "responses",
    buttonLabel: "Открыть Ответы",
    hint: "Проверьте вес в детали поставщика на вкладке Ответы. Для ручного варианта покрытия вес можно задать прямо в Покрытии.",
  },
  missing_incoterms: {
    tabKey: "responses",
    buttonLabel: "Открыть Ответы",
    hint: "Проверьте ответ поставщика: должны быть заполнены Incoterms.",
  },
  missing_incoterms_place: {
    tabKey: "responses",
    buttonLabel: "Открыть Ответы",
    hint: "Проверьте ответ поставщика: должен быть заполнен пункт Incoterms.",
  },
  missing_lead_time: {
    tabKey: "responses",
    buttonLabel: "Открыть Ответы",
    hint: "Проверьте срок поставки в ответе поставщика или в покрытии.",
  },
  missing_tnved: {
    tabKey: "coverage",
    buttonLabel: "Открыть Покрытие",
    hint: "Проверьте ТН ВЭД и связь строки покрытия с номенклатурой.",
  },
  missing_duty_rate: {
    tabKey: "coverage",
    buttonLabel: "Открыть Покрытие",
    hint: "ТН ВЭД найден, но ставки пошлины нет. Проверьте справочник ТН ВЭД.",
  },
  missing_fx_rate: {
    tabKey: "scenarios",
    buttonLabel: "Открыть Сценарии",
    hint: "Проверьте валюту сценария и доступность курса FX.",
  },
}

const parseWarnings = (value) => {
  if (!value) return []
  if (Array.isArray(value)) return value.filter(Boolean)
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed.filter(Boolean) : []
    } catch (_e) {
      return []
    }
  }
  return []
}

const ECONOMICS_HELP_SECTIONS = [
  {
    title: "Зачем нужна вкладка",
    body:
      "Экономика собирает уже выбранный сценарий в денежный результат: товар, фрахт, пошлины и итоговую себестоимость по строкам и по сценарию целиком.",
  },
  {
    title: "Что здесь происходит",
    body:
      "Сначала на вкладке Сценарии выбирается вариант исполнения на каждую строку RFQ. Затем Логистика добавляет группы отгрузки. После этого Экономика считает итог по каждой строке и сводный итог сценария.",
  },
  {
    title: "Как читать таблицу",
    body:
      "Товар показывает стоимость закупки, Фрахт — логистическую часть, Пошлина — импортные начисления, Себестоимость — суммарный результат по строке после логистики и пошлин.",
  },
]

const normalizeOptionNote = (note) => {
  const text = String(note || "").trim()
  return text.replace(/^Автосохранение покрытия по поставщику\s+/i, "Вариант по поставщику ").trim()
}

const buildScenarioOptionLabel = (row) => {
  const kindLabel = OPTION_KIND_LABELS[String(row?.option_kind || "").toUpperCase()] || row?.option_kind || "Вариант"
  const source = normalizeOptionNote(row?.option_note) || kindLabel
  const completeness = `${Number(row?.completeness_pct || 0)}%`
  return `${source} · ${kindLabel} · ${completeness}`
}

const buildRemediationItems = (warnings = []) =>
  Array.from(new Set(warnings.filter(Boolean)))
    .map((warning) => ({ warning, ...WARNING_ACTIONS[warning] }))
    .filter((item) => item.hint)

export default function EconomicsTabContent({ rfqId, onNavigateTab }) {
  const [scenarios, setScenarios] = useState([])
  const [selectedScenarioId, setSelectedScenarioId] = useState(null)
  const [loadingScenarios, setLoadingScenarios] = useState(false)
  const [loadingEconomics, setLoadingEconomics] = useState(false)
  const [recalculating, setRecalculating] = useState(false)
  const [scenarioMeta, setScenarioMeta] = useState(null)
  const [rows, setRows] = useState([])
  const [columnKeys, setColumnKeys] = useState([])
  const [helpOpen, setHelpOpen] = useState(false)
  const [groupRoutes, setGroupRoutes] = useState([])
  const [groupRoutesLoading, setGroupRoutesLoading] = useState(false)
  const [groupRoutesError, setGroupRoutesError] = useState("")
  const [routeCatalogsLoading, setRouteCatalogsLoading] = useState(false)
  const [routeCatalogsError, setRouteCatalogsError] = useState("")
  const [routeTemplateOptions, setRouteTemplateOptions] = useState([])
  const [catalogsEmpty, setCatalogsEmpty] = useState(false)
  const [dutyBasis, setDutyBasis] = useState("GOODS_ONLY")
  const [adhocOpen, setAdhocOpen] = useState(false)
  const [adhocSaving, setAdhocSaving] = useState(false)
  const [adhocTargetRow, setAdhocTargetRow] = useState(null)
  const [adhocForm] = Form.useForm()

  const safeNum = (value) => {
    if (value === undefined || value === null || value === "") return null
    const n = Number(String(value).replace(",", "."))
    return Number.isFinite(n) ? n : null
  }

  const pricingModelLabel = (value) => {
    const key = String(value || "").toLowerCase()
    if (key === "fixed") return "Фиксированная"
    if (key === "per_kg") return "За кг"
    if (key === "per_cbm") return "За м³"
    if (key === "per_kg_or_cbm_max") return "Макс. из кг/м³"
    if (key === "hybrid") return "Гибридная"
    return value || "—"
  }

  const loadScenarios = async () => {
    if (!rfqId) return
    setLoadingScenarios(true)
    try {
      const { data } = await axios.get(`/economics/rfq/${rfqId}/scenarios`)
      const list = Array.isArray(data?.rows) ? data.rows : []
      setScenarios(list)
      setSelectedScenarioId((prev) => prev || Number(list?.[0]?.id || 0) || null)
    } catch (e) {
      setScenarios([])
      setSelectedScenarioId(null)
      message.error(e?.response?.data?.message || "Не удалось загрузить сценарии")
    } finally {
      setLoadingScenarios(false)
    }
  }

  const loadEconomics = async (scenarioIdOverride) => {
    const scenarioId = Number(scenarioIdOverride || selectedScenarioId || 0) || null
    if (!rfqId || !scenarioId) {
      setScenarioMeta(null)
      setRows([])
      return
    }
    setLoadingEconomics(true)
    try {
      const { data } = await axios.get(`/economics/rfq/${rfqId}/scenarios/${scenarioId}/economics`)
      setScenarioMeta(data?.scenario || null)
      setRows(Array.isArray(data?.rows) ? data.rows : [])
    } catch (e) {
      setScenarioMeta(null)
      setRows([])
      message.error(e?.response?.data?.message || "Не удалось загрузить экономику сценария")
    } finally {
      setLoadingEconomics(false)
    }
  }

  useEffect(() => {
    loadScenarios()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rfqId])

  useEffect(() => {
    loadEconomics()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rfqId, selectedScenarioId])

  const loadCatalogs = async () => {
    const scenarioId = Number(selectedScenarioId || 0)
    if (!rfqId || !scenarioId) return
    setRouteCatalogsLoading(true)
    setRouteCatalogsError("")
    try {
      const { data } = await axios.get(`/economics/rfq/${rfqId}/scenarios/${scenarioId}/route-catalogs`)
      const templates = Array.isArray(data?.templates) ? data.templates : []
      setRouteTemplateOptions(
        templates.map((row) => ({
          value: Number(row.id),
          label: `${row.name}${row.origin_country && row.destination_country ? ` · ${row.origin_country} → ${row.destination_country}` : ""}${row.transport_mode ? ` · ${row.transport_mode}` : ""}`,
        })),
      )
      setCatalogsEmpty(templates.length === 0)
    } catch (e) {
      setRouteCatalogsError(e?.response?.data?.message || "Не удалось загрузить шаблоны доставки")
      setCatalogsEmpty(false)
    } finally {
      setRouteCatalogsLoading(false)
    }
  }

  const loadGroupRoutes = async (scenarioIdOverride) => {
    const scenarioId = Number(scenarioIdOverride || selectedScenarioId || 0)
    if (!rfqId || !scenarioId) {
      setGroupRoutes([])
      return
    }
    setGroupRoutesLoading(true)
    setGroupRoutesError("")
    try {
      const { data } = await axios.get(`/economics/rfq/${rfqId}/scenarios/${scenarioId}/group-routes`)
      setGroupRoutes(Array.isArray(data?.rows) ? data.rows : [])
    } catch (e) {
      setGroupRoutes([])
      setGroupRoutesError(e?.response?.data?.message || "Не удалось загрузить варианты доставки групп")
    } finally {
      setGroupRoutesLoading(false)
    }
  }

  useEffect(() => {
    loadCatalogs()
    loadGroupRoutes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rfqId, selectedScenarioId])

  const columns = useMemo(
    () => [
      {
        key: "rfq_line",
        title: "Строка RFQ",
        render: (_, row) => (
          <Space direction="vertical" size={0}>
            <span>{row.line_number} · {row.original_cat_number || row.client_part_number || `#${row.rfq_item_id}`}</span>
            {row.client_description ? <span style={{ color: "#666", fontSize: 12 }}>{row.client_description}</span> : null}
          </Space>
        ),
      },
      {
        key: "execution",
        title: "Вариант исполнения",
        width: 280,
        render: (_, row) => buildScenarioOptionLabel(row),
      },
      {
        key: "goods",
        title: "Товар",
        width: 120,
        render: (_, row) => formatPriceWithCurrency(row?.goods_amount, row?.currency || scenarioMeta?.calc_currency || "USD"),
      },
      {
        key: "freight",
        title: "Фрахт",
        width: 120,
        render: (_, row) => formatPriceWithCurrency(row?.freight_amount, row?.currency || scenarioMeta?.calc_currency || "USD"),
      },
      {
        key: "duty",
        title: "Пошлина",
        width: 120,
        render: (_, row) => formatPriceWithCurrency(row?.duty_amount, row?.currency || scenarioMeta?.calc_currency || "USD"),
      },
      {
        key: "landed",
        title: "Себестоимость",
        width: 120,
        render: (_, row) => formatPriceWithCurrency(row?.landed_amount, row?.currency || scenarioMeta?.calc_currency || "USD"),
      },
      {
        key: "warnings",
        title: "Проблемы",
        width: 280,
        render: (_, row) => {
          const warnings = parseWarnings(row?.warning_json)
          if (!warnings.length) return "—"
          const fixes = buildRemediationItems(warnings)
          return (
            <Space direction="vertical" size={4}>
              <Space size={[4, 4]} wrap>
                {warnings.map((warning) => (
                  <Tag key={warning} color="orange">
                    {WARNING_LABELS[warning] || warning}
                  </Tag>
                ))}
              </Space>
              {fixes.length ? (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {fixes.map((item) => item.hint).join(" ")}
                </Text>
              ) : null}
            </Space>
          )
        },
      },
      {
        key: "sources",
        title: "Источники",
        width: 280,
        render: (_, row) => (
            <Space size={[4, 4]} wrap>
              <Tag>{SOURCE_LABELS[row?.origin_source] || row?.origin_source || "Страна происхождения: —"}</Tag>
              <Tag color={row?.duty_source === "tnved" ? "blue" : "default"}>
                {SOURCE_LABELS[row?.duty_source] || row?.duty_source || "Пошлина: —"}
              </Tag>
          </Space>
        ),
      },
      { key: "eta", title: "ETA, дн", dataIndex: "eta_days", width: 100, render: (value) => value ?? "—" },
    ],
    [scenarioMeta],
  )

  useEffect(() => {
    const nextKeys = columns.map((column) => column.key).filter(Boolean)
    setColumnKeys((prev) => {
      const prevSet = new Set(prev)
      const preserved = prev.filter((key) => nextKeys.includes(key))
      const missing = nextKeys.filter((key) => !prevSet.has(key))
      const merged = [...preserved, ...missing]
      return merged.length === prev.length && merged.every((key, index) => key === prev[index]) ? prev : merged
    })
  }, [columns])

  const orderedColumns = useMemo(() => {
    if (!columnKeys.length) return columns
    const byKey = new Map(columns.map((column) => [column.key, column]))
    return columnKeys.map((key) => byKey.get(key)).filter(Boolean)
  }, [columns, columnKeys])

  const handleRecalculate = async () => {
    const scenarioId = Number(selectedScenarioId || 0)
    if (!rfqId || !scenarioId) return
    setRecalculating(true)
    try {
      const { data } = await axios.post(`/economics/rfq/${rfqId}/scenarios/${scenarioId}/calculate`)
      message.success(data?.message || "Сценарий пересчитан")
      await loadScenarios()
      await loadEconomics(scenarioId)
      await loadGroupRoutes(scenarioId)
    } catch (e) {
      message.error(e?.response?.data?.message || "Не удалось пересчитать сценарий")
    } finally {
      setRecalculating(false)
    }
  }

  const createDraftRoute = async (row) => {
    try {
      await axios.post(`/economics/shipment-groups/${row.shipment_group_id}/routes/draft`)
      await loadGroupRoutes()
    } catch (e) {
      message.error(e?.response?.data?.message || "Не удалось добавить вариант доставки")
    }
  }

  const assignRouteTemplate = async (row, routeTemplateId) => {
    if (!row?.id || !routeTemplateId) return
    try {
      await axios.put(`/economics/shipment-group-routes/${row.id}/template`, {
        route_template_id: routeTemplateId,
      })
      message.success("Шаблон доставки назначен")
      await loadGroupRoutes()
    } catch (e) {
      message.error(e?.response?.data?.message || "Не удалось назначить шаблон доставки")
    }
  }

  const toggleGroupSelected = async (row, checked) => {
    if (!row?.id) return
    try {
      await axios.patch(`/economics/shipment-group-routes/${row.id}/selected`, {
        selected: checked ? 1 : 0,
      })
      message.success(checked ? "Вариант доставки выбран для сценария" : "Вариант доставки снят с выбора")
      await loadGroupRoutes()
      await loadEconomics()
    } catch (e) {
      message.error(e?.response?.data?.message || "Не удалось выбрать вариант доставки")
    }
  }

  const openAdhocModal = (row) => {
    setAdhocTargetRow(row)
    adhocForm.setFieldsValue({
      origin_country: row?.route_payload_json?.origin_country || row?.corridor_origin_country || row?.from_country,
      destination_country: row?.route_payload_json?.destination_country || row?.corridor_destination_country || row?.to_country,
      transport_mode: row?.route_payload_json?.transport_mode || row?.transport_mode || "ROAD",
      name: row?.route_name_snapshot || row?.route_payload_json?.name,
      pricing_model: row?.pricing_model_snapshot || row?.route_payload_json?.pricing_model || "fixed",
      currency: row?.currency_snapshot || row?.route_payload_json?.currency || scenarioMeta?.calc_currency || "USD",
      fixed_cost: row?.fixed_cost_snapshot ?? row?.route_payload_json?.fixed_cost,
      min_cost: row?.min_cost_snapshot ?? row?.route_payload_json?.min_cost,
      rate_per_kg: row?.rate_per_kg_snapshot ?? row?.route_payload_json?.rate_per_kg,
      rate_per_cbm: row?.rate_per_cbm_snapshot ?? row?.route_payload_json?.rate_per_cbm,
      markup_pct: row?.markup_pct_snapshot ?? row?.route_payload_json?.markup_pct,
      markup_fixed: row?.markup_fixed_snapshot ?? row?.route_payload_json?.markup_fixed,
      eta_min_days: row?.eta_min_days_snapshot ?? row?.route_payload_json?.eta_min_days,
      eta_max_days: row?.eta_max_days_snapshot ?? row?.route_payload_json?.eta_max_days,
    })
    setAdhocOpen(true)
  }

  const handleSaveAdhoc = async () => {
    if (!adhocTargetRow?.id) return
    try {
      const values = await adhocForm.validateFields()
      setAdhocSaving(true)
      await axios.put(`/economics/shipment-group-routes/${adhocTargetRow.id}/adhoc`, values)
      message.success("Ручной вариант доставки сохранен")
      setAdhocOpen(false)
      setAdhocTargetRow(null)
      adhocForm.resetFields()
      await loadGroupRoutes()
    } catch (e) {
      if (e?.errorFields) return
      message.error(e?.response?.data?.message || "Не удалось сохранить ручной вариант доставки")
    } finally {
      setAdhocSaving(false)
    }
  }

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <Alert
        type="info"
        showIcon
        message="Экономика считает сценарий целиком"
        description="На этом шаге система берёт выбранные варианты покрытия, группы отгрузки и рассчитывает товарную стоимость, фрахт и полную себестоимость по строкам и по сценарию."
      />

      <Space wrap>
          <Select
            style={{ minWidth: 360 }}
            loading={loadingScenarios}
            value={selectedScenarioId || undefined}
            onChange={(value) => setSelectedScenarioId(Number(value || 0) || null)}
            placeholder="Выберите сценарий"
            options={scenarios.map((row) => ({
              value: Number(row.id),
              label: `${row.name} · ${SCENARIO_STATUS_LABELS[String(row.status || "").toLowerCase()] || row.status}`,
            }))}
          />
        <Button onClick={handleRecalculate} loading={recalculating} disabled={!selectedScenarioId}>
          Пересчитать сценарий
        </Button>
        <Button onClick={() => setHelpOpen(true)}>Справка</Button>
      </Space>

      {scenarioMeta ? (
        <Space wrap>
          <Tag>Статус: {SCENARIO_STATUS_LABELS[String(scenarioMeta.status || "").toLowerCase()] || scenarioMeta.status}</Tag>
          <Tag color="blue">Покрытие: {scenarioMeta.coverage_pct ?? "—"}%</Tag>
          <Tag color="gold">С ценой: {scenarioMeta.priced_pct ?? "—"}%</Tag>
          <Tag color={Number(scenarioMeta.is_oem_ok || 0) ? "green" : "default"}>
            OEM: {Number(scenarioMeta.is_oem_ok || 0) ? "OK" : "не гарантировано"}
          </Tag>
          <Tag>Товар: {formatPriceWithCurrency(scenarioMeta.goods_total, scenarioMeta.calc_currency || "USD")}</Tag>
          <Tag>Фрахт: {formatPriceWithCurrency(scenarioMeta.freight_total, scenarioMeta.calc_currency || "USD")}</Tag>
          <Tag>Пошлина: {formatPriceWithCurrency(scenarioMeta.duty_total, scenarioMeta.calc_currency || "USD")}</Tag>
          <Tag color="green">Себестоимость: {formatPriceWithCurrency(scenarioMeta.landed_total, scenarioMeta.calc_currency || "USD")}</Tag>
          {scenarioMeta.fx_as_of ? <Tag color="blue">Срез FX: {String(scenarioMeta.fx_as_of).slice(0, 10)}</Tag> : null}
          {parseWarnings(scenarioMeta.warning_json).map((warning) => (
            <Tag key={warning} color="orange">{WARNING_LABELS[warning] || warning}</Tag>
          ))}
        </Space>
      ) : null}

      {(() => {
        const scenarioWarnings = parseWarnings(scenarioMeta?.warning_json)
        const rowWarnings = rows.flatMap((row) => parseWarnings(row?.warning_json))
        const remediationItems = buildRemediationItems([...scenarioWarnings, ...rowWarnings])
        if (!remediationItems.length) return null

        return (
          <Alert
            type="warning"
            showIcon
            message="Есть данные, которые лучше уточнить до финального выбора"
            description={
              <Space direction="vertical" size={8} style={{ width: "100%" }}>
                {remediationItems.map((item) => (
                  <Space key={item.warning} wrap>
                    <Text>{WARNING_LABELS[item.warning] || item.warning}: {item.hint}</Text>
                    {item.tabKey && typeof onNavigateTab === "function" ? (
                      <Button size="small" onClick={() => onNavigateTab(item.tabKey)}>
                        {item.buttonLabel}
                      </Button>
                    ) : null}
                  </Space>
                ))}
              </Space>
            }
          />
        )
      })()}

      <Card
        size="small"
        title="Построчная экономика сценария"
        extra={
          <Space size={8}>
            <span style={{ color: "#666", fontSize: 12 }}>Колонки можно перетаскивать мышью за заголовки.</span>
            <Button size="small" onClick={() => loadEconomics()} loading={loadingEconomics}>
              Обновить
            </Button>
          </Space>
        }
      >
        <DraggableColumnsTable
          size="small"
          loading={loadingEconomics}
          rowKey="id"
          dataSource={rows}
          pagination={{ pageSize: 20, hideOnSinglePage: true }}
          columns={orderedColumns}
          onColumnOrderChange={({ orderedVisibleKeys }) => setColumnKeys(orderedVisibleKeys)}
        />
      </Card>

      <GroupRoutesPanel
        groupRoutesError={groupRoutesError}
        groupRoutes={groupRoutes}
        groupRoutesLoading={groupRoutesLoading}
        loadCatalogs={loadCatalogs}
        catalogsLoading={routeCatalogsLoading}
        loadGroupRoutes={loadGroupRoutes}
        handleRecalculateScenario={handleRecalculate}
        recalcScenarioLoading={recalculating}
        dutyBasis={dutyBasis}
        setDutyBasis={setDutyBasis}
        routeTemplateOptions={routeTemplateOptions}
        assignRouteTemplate={assignRouteTemplate}
        openAdhocModal={openAdhocModal}
        toggleGroupSelected={toggleGroupSelected}
        createDraftRoute={createDraftRoute}
        targetCurrency={scenarioMeta?.calc_currency || "USD"}
        catalogsEmpty={catalogsEmpty}
        catalogsError={routeCatalogsError}
        safeNum={safeNum}
        pricingModelLabel={pricingModelLabel}
      />

      <AdhocRouteModal
        open={adhocOpen}
        onCancel={() => {
          setAdhocOpen(false)
          setAdhocTargetRow(null)
          adhocForm.resetFields()
        }}
        onOk={handleSaveAdhoc}
        confirmLoading={adhocSaving}
        form={adhocForm}
        pricingModelLabel={pricingModelLabel}
        groupDirection={adhocTargetRow ? `${adhocTargetRow.from_country || "—"} → ${adhocTargetRow.to_country || "—"}` : ""}
      />

      <Drawer
        title="Справка по экономике"
        placement="right"
        width={420}
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
      >
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          {ECONOMICS_HELP_SECTIONS.map((section) => (
            <div key={section.title}>
              <Text strong>{section.title}</Text>
              <Paragraph style={{ marginTop: 8, marginBottom: 0 }}>{section.body}</Paragraph>
            </div>
          ))}
        </Space>
      </Drawer>
    </Space>
  )
}

import React, { useEffect, useMemo, useState } from "react"
import { Alert, Button, Card, Drawer, Select, Space, Tag, Typography, message } from "antd"
import axios from "@/api/axiosInstance"
import { formatPriceWithCurrency } from "@/utils/priceFormat"
import DraggableColumnsTable from "@/components/common/DraggableColumnsTable"

const OPTION_KIND_LABELS = {
  WHOLE: "Узел целиком",
  BOM: "По составу",
  KIT: "Комплект",
  MIXED: "Смешанный",
  MANUAL: "Ручной",
}

const { Paragraph, Text } = Typography

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
  coverage_snapshot: "Origin: из покрытия",
  response_or_cost_base: "Origin: из ответа/базы себестоимости",
  supplier_only: "Origin: только страна поставщика",
  missing: "Origin: не определён",
  tnved: "Пошлина: по ТН ВЭД",
  tnved_missing_rate: "Пошлина: ТН ВЭД есть, ставки нет",
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

export default function EconomicsTabContent({ rfqId }) {
  const [scenarios, setScenarios] = useState([])
  const [selectedScenarioId, setSelectedScenarioId] = useState(null)
  const [loadingScenarios, setLoadingScenarios] = useState(false)
  const [loadingEconomics, setLoadingEconomics] = useState(false)
  const [recalculating, setRecalculating] = useState(false)
  const [scenarioMeta, setScenarioMeta] = useState(null)
  const [rows, setRows] = useState([])
  const [columnKeys, setColumnKeys] = useState([])
  const [helpOpen, setHelpOpen] = useState(false)

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
          return (
            <Space size={[4, 4]} wrap>
              {warnings.map((warning) => (
                <Tag key={warning} color="orange">
                  {WARNING_LABELS[warning] || warning}
                </Tag>
              ))}
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
            <Tag>{SOURCE_LABELS[row?.origin_source] || row?.origin_source || "Origin: —"}</Tag>
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
    } catch (e) {
      message.error(e?.response?.data?.message || "Не удалось пересчитать сценарий")
    } finally {
      setRecalculating(false)
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
            label: `${row.name} · ${row.status}`,
          }))}
        />
        <Button onClick={handleRecalculate} loading={recalculating} disabled={!selectedScenarioId}>
          Пересчитать сценарий
        </Button>
        <Button onClick={() => setHelpOpen(true)}>Справка</Button>
      </Space>

      {scenarioMeta ? (
        <Space wrap>
          <Tag>Статус: {scenarioMeta.status}</Tag>
          <Tag color="blue">Покрытие: {scenarioMeta.coverage_pct ?? "—"}%</Tag>
          <Tag color="gold">С ценой: {scenarioMeta.priced_pct ?? "—"}%</Tag>
          <Tag color={Number(scenarioMeta.is_oem_ok || 0) ? "green" : "default"}>
            OEM: {Number(scenarioMeta.is_oem_ok || 0) ? "OK" : "не гарантировано"}
          </Tag>
          <Tag>Товар: {formatPriceWithCurrency(scenarioMeta.goods_total, scenarioMeta.calc_currency || "USD")}</Tag>
          <Tag>Фрахт: {formatPriceWithCurrency(scenarioMeta.freight_total, scenarioMeta.calc_currency || "USD")}</Tag>
          <Tag>Пошлина: {formatPriceWithCurrency(scenarioMeta.duty_total, scenarioMeta.calc_currency || "USD")}</Tag>
          <Tag color="green">Себестоимость: {formatPriceWithCurrency(scenarioMeta.landed_total, scenarioMeta.calc_currency || "USD")}</Tag>
          {scenarioMeta.fx_as_of ? <Tag color="blue">FX snapshot: {String(scenarioMeta.fx_as_of).slice(0, 10)}</Tag> : null}
          {parseWarnings(scenarioMeta.warning_json).map((warning) => (
            <Tag key={warning} color="orange">{WARNING_LABELS[warning] || warning}</Tag>
          ))}
        </Space>
      ) : null}

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

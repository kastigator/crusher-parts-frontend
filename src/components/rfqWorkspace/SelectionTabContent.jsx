import React, { useEffect, useState } from "react"
import { Alert, Button, Card, Drawer, Select, Space, Table, Tag, Typography, message } from "antd"
import axios from "@/api/axiosInstance"
import { formatPriceWithCurrency } from "@/utils/priceFormat"

const { Paragraph, Text } = Typography
const SCENARIO_BASIS_LABELS = {
  CHEAPEST: "Минимальная стоимость",
  FASTEST: "Минимальный срок",
  BALANCED: "Сбалансированный",
  OEM: "OEM приоритет",
  MANUAL: "Ручной",
}

const OPTION_KIND_LABELS = {
  WHOLE: "Целиком",
  BOM: "По составу",
  KIT: "Комплект",
  MIXED: "Комбинированный",
  MANUAL: "Ручной",
}

const SCENARIO_STATUS_LABELS = {
  draft: "Черновик",
  active: "Активный",
  selected: "Выбран",
  archived: "Архив",
}

const SELECTION_HELP_SECTIONS = [
  {
    title: "Зачем нужна вкладка",
    body:
      "Выбор утверждает один сценарий как финальный план исполнения заказа. После этого именно он становится основой для КП, контракта и PO.",
  },
  {
    title: "Что здесь проверять",
    body:
      "Перед утверждением смотрите, чтобы сценарий был полным, понятным по вариантам исполнения и соответствовал ожидаемой стоимости. Это последний контрольный шаг перед фиксацией решения.",
  },
  {
    title: "Что произойдёт после утверждения",
    body:
      "Система создаст финальный выбор как снимок на текущий момент. Дальнейшие документы должны опираться уже на этот выбор, а не на черновые сценарии.",
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

export default function SelectionTabContent({ rfqId, selections, formatDate, onSelectionFinalized }) {
  const [scenarios, setScenarios] = useState([])
  const [selectedScenarioId, setSelectedScenarioId] = useState(null)
  const [loadingScenarios, setLoadingScenarios] = useState(false)
  const [loadingScenario, setLoadingScenario] = useState(false)
  const [saving, setSaving] = useState(false)
  const [scenarioMeta, setScenarioMeta] = useState(null)
  const [scenarioLines, setScenarioLines] = useState([])
  const [helpOpen, setHelpOpen] = useState(false)
  const [selectionLines, setSelectionLines] = useState([])
  const [loadingSelectionLines, setLoadingSelectionLines] = useState(false)

  const loadScenarios = async () => {
    if (!rfqId) return
    setLoadingScenarios(true)
    try {
      const { data } = await axios.get(`/economics/rfq/${rfqId}/scenarios`)
      const rows = Array.isArray(data?.rows) ? data.rows : []
      setScenarios(rows)
      const selected = rows.find((row) => String(row?.status || "").toUpperCase() === "SELECTED")
      setSelectedScenarioId((prev) => prev || Number(selected?.id || rows?.[0]?.id || 0) || null)
    } catch (e) {
      setScenarios([])
      setSelectedScenarioId(null)
      message.error(e?.response?.data?.message || "Не удалось загрузить сценарии")
    } finally {
      setLoadingScenarios(false)
    }
  }

  const loadScenario = async (scenarioIdOverride) => {
    const scenarioId = Number(scenarioIdOverride || selectedScenarioId || 0) || null
    if (!rfqId || !scenarioId) {
      setScenarioMeta(null)
      setScenarioLines([])
      return
    }
    setLoadingScenario(true)
    try {
      const { data } = await axios.get(`/economics/rfq/${rfqId}/scenarios/${scenarioId}`)
      setScenarioMeta(data?.scenario || null)
      setScenarioLines(Array.isArray(data?.lines) ? data.lines : [])
    } catch (e) {
      setScenarioMeta(null)
      setScenarioLines([])
      message.error(e?.response?.data?.message || "Не удалось загрузить детали сценария")
    } finally {
      setLoadingScenario(false)
    }
  }

  useEffect(() => {
    loadScenarios()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rfqId])

  useEffect(() => {
    loadScenario()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rfqId, selectedScenarioId])

  const handleFinalize = async () => {
    const scenarioId = Number(selectedScenarioId || 0)
    if (!rfqId || !scenarioId) return
    setSaving(true)
    try {
      const { data } = await axios.post(`/economics/rfq/${rfqId}/scenarios/${scenarioId}/finalize-selection`, {
        note: "Финализировано во вкладке «Выбор»",
      })
      message.success(data?.message || "Финальный выбор создан")
      await loadScenarios()
      await loadScenario(scenarioId)
      if (typeof onSelectionFinalized === "function") {
        await onSelectionFinalized()
      }
    } catch (e) {
      message.error(e?.response?.data?.message || "Не удалось финализировать сценарий")
    } finally {
      setSaving(false)
    }
  }

  const loadSelectionLines = async (selectionId) => {
    const id = Number(selectionId || 0)
    if (!id) {
      setSelectionLines([])
      return
    }
    setLoadingSelectionLines(true)
    try {
      const { data } = await axios.get(`/selection/${id}/lines`)
      setSelectionLines(Array.isArray(data) ? data : [])
    } catch (e) {
      setSelectionLines([])
      message.error(e?.response?.data?.message || "Не удалось загрузить baseline lines")
    } finally {
      setLoadingSelectionLines(false)
    }
  }

  useEffect(() => {
    const latestSelectionId = Array.isArray(selections) && selections.length ? Number(selections[0]?.id || 0) : 0
    loadSelectionLines(latestSelectionId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selections])

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <Alert
        type="info"
        showIcon
        message="Выбор фиксирует сценарий как финальный снимок"
        description="После утверждения создаётся procurement baseline: supplier mix, себестоимость, origin и supplier public codes фиксируются в selection. Дальше продавец работает уже от этого baseline."
      />

      <Space wrap>
        <Select
          style={{ minWidth: 360 }}
          value={selectedScenarioId || undefined}
          loading={loadingScenarios}
          placeholder="Выберите сценарий"
          onChange={(value) => setSelectedScenarioId(Number(value || 0) || null)}
          options={scenarios.map((row) => ({
            value: Number(row.id),
            label: `${row.name} · ${SCENARIO_BASIS_LABELS[String(row.basis || "").toUpperCase()] || row.basis || "Ручной"} · ${SCENARIO_STATUS_LABELS[String(row.status || "").toLowerCase()] || row.status || "—"} · ${formatPriceWithCurrency(row.landed_total, row.calc_currency || "USD")}`,
          }))}
        />
        <Button type="primary" onClick={handleFinalize} loading={saving} disabled={!selectedScenarioId}>
          Утвердить сценарий
        </Button>
        <Button onClick={() => setHelpOpen(true)}>Справка</Button>
      </Space>

      {scenarioMeta ? (
        <Space wrap>
          <Tag>Статус: {SCENARIO_STATUS_LABELS[String(scenarioMeta.status || "").toLowerCase()] || scenarioMeta.status}</Tag>
          <Tag>Режим: {SCENARIO_BASIS_LABELS[String(scenarioMeta.basis || "").toUpperCase()] || scenarioMeta.basis || "Ручной"}</Tag>
          <Tag color="green">Итог: {formatPriceWithCurrency(scenarioMeta.landed_total, scenarioMeta.calc_currency || "USD")}</Tag>
        </Space>
      ) : null}

      <Card size="small" title="Состав утверждаемого сценария">
        <Table
          size="small"
          loading={loadingScenario}
          rowKey="id"
          dataSource={scenarioLines}
          pagination={{ pageSize: 20, hideOnSinglePage: true }}
          columns={[
            {
              title: "Строка RFQ",
              render: (_, row) => (
                <Space direction="vertical" size={0}>
                  <span>{row.line_number} · {row.original_cat_number || row.client_part_number || `#${row.rfq_item_id}`}</span>
                  {row.client_description ? <span style={{ color: "#666", fontSize: 12 }}>{row.client_description}</span> : null}
                </Space>
              ),
            },
            {
              title: "Вариант исполнения",
              width: 280,
              render: (_, row) => buildScenarioOptionLabel(row),
            },
            { title: "Тип", dataIndex: "option_kind", width: 120 },
            { title: "Полнота", dataIndex: "completeness_pct", width: 120, render: (value) => `${value ?? 0}%` },
            { title: "С ценой", dataIndex: "priced_pct", width: 100, render: (value) => `${value ?? 0}%` },
            {
              title: "OEM",
              dataIndex: "is_oem_ok",
              width: 90,
              render: (value) => <Tag color={Number(value || 0) ? "green" : "default"}>{Number(value || 0) ? "OK" : "—"}</Tag>,
            },
            {
              title: "Товар",
              width: 120,
              render: (_, row) => formatPriceWithCurrency(row?.costs?.goods_amount || row?.goods_total, row?.costs?.currency || row?.goods_currency || scenarioMeta?.calc_currency || "USD"),
            },
            {
              title: "Себестоимость",
              width: 120,
              render: (_, row) => formatPriceWithCurrency(row?.costs?.landed_amount, row?.costs?.currency || scenarioMeta?.calc_currency || "USD"),
            },
          ]}
        />
      </Card>

      <Card size="small" title="Уже созданные selection">
        {Array.isArray(selections) && selections.length ? (
          <Space direction="vertical" size={8} style={{ width: "100%" }}>
            {selections.map((selection) => (
              <Space key={selection.id} wrap>
                <Text strong>Выбор #{selection.id}</Text>
                <Tag>{SCENARIO_STATUS_LABELS[String(selection.status || "").toLowerCase()] || selection.status || "Черновик"}</Tag>
                <Text type="secondary">{formatDate(selection.created_at)}</Text>
              </Space>
            ))}
          </Space>
        ) : (
          <Text type="secondary">Финальный выбор ещё не создан.</Text>
        )}
      </Card>

      <Card
        size="small"
        title="Baseline для продавца"
        extra={<span style={{ color: "#666", fontSize: 12 }}>Это snapshot procurement-решения, из которого создаётся КП.</span>}
      >
        <Table
          size="small"
          loading={loadingSelectionLines}
          rowKey="id"
          dataSource={selectionLines}
          pagination={{ pageSize: 10, hideOnSinglePage: true }}
          columns={[
            {
              title: "Строка",
              render: (_, row) => (
                <Space direction="vertical" size={0}>
                  <span>{row.line_number} · {row.original_cat_number || row.client_part_number || `#${row.rfq_item_id}`}</span>
                  {row.client_description ? <span style={{ color: "#666", fontSize: 12 }}>{row.client_description}</span> : null}
                </Space>
              ),
            },
            {
              title: "Supplier code",
              width: 160,
              render: (_, row) => row.supplier_public_code ? <Tag color="blue">{row.supplier_public_code}</Tag> : <Tag>—</Tag>,
            },
            {
              title: "Cost basis",
              width: 180,
              render: (_, row) => formatPriceWithCurrency(row.landed_amount, row.selection_currency || scenarioMeta?.calc_currency || "USD"),
            },
            {
              title: "Origin",
              dataIndex: "origin_country",
              width: 100,
              render: (value) => value || "—",
            },
          ]}
        />
      </Card>

      <Drawer
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        width={420}
        title="Справка по вкладке «Выбор»"
      >
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          {SELECTION_HELP_SECTIONS.map((section) => (
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

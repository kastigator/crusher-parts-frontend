import React, { useEffect, useMemo, useState } from "react"
import { Alert, Button, Card, Drawer, Select, Space, Table, Tag, Typography, message } from "antd"
import axios from "@/api/axiosInstance"
import { formatPriceWithCurrency } from "@/utils/priceFormat"
import { COVERAGE_KIND_LABELS } from "@/components/rfqWorkspace/rfqDisplayUtils"
import { getClientFacingDescription, getClientFacingPartNumber } from "@/components/rfqWorkspace/partDisplay"

const { Paragraph, Text } = Typography
const SCENARIO_BASIS_LABELS = {
  CHEAPEST: "Минимальная стоимость",
  FASTEST: "Минимальный срок",
  BALANCED: "Сбалансированный",
  OEM: "OEM приоритет",
  MANUAL: "Ручной",
}

const OPTION_KIND_LABELS = COVERAGE_KIND_LABELS

const SCENARIO_STATUS_LABELS = {
  draft: "Черновик",
  active: "Активный",
  selected: "Выбран",
  archived: "Архив",
  calculated: "Рассчитан",
  approved: "Утвержден",
}

const SELECTION_HELP_SECTIONS = [
  {
    title: "Зачем нужна вкладка",
    body:
      "Выбор утверждает один сценарий как финальный план исполнения заказа. После этого именно он становится основой для коммерческого предложения, контракта и заказа поставщику.",
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
  return text
    .replace(/^Автосохранение покрытия по поставщику\s+/i, "Вариант по поставщику ")
    .replace(/\bwhole supplier\b/gi, "поставщик целиком")
    .trim()
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
  const [showScenarioComposition, setShowScenarioComposition] = useState(false)
  const [selectionLines, setSelectionLines] = useState([])
  const [loadingSelectionLines, setLoadingSelectionLines] = useState(false)
  const latestSelection = useMemo(
    () => (Array.isArray(selections) && selections.length ? selections[0] : null),
    [selections]
  )
  const selectionHistoryPreview = useMemo(
    () => (Array.isArray(selections) ? selections.slice(0, 3) : []),
    [selections]
  )
  const scenarioReadiness = useMemo(() => {
    const totalLines = Array.isArray(scenarioLines) ? scenarioLines.length : 0
    const incompleteLines = scenarioLines.filter((row) => Number(row?.completeness_pct || 0) < 100).length
    const unpricedLines = scenarioLines.filter((row) => Number(row?.priced_pct || 0) < 100).length
    const oemRiskLines = scenarioLines.filter(
      (row) => Number(row?.is_oem_ok || 0) !== 1 && String(row?.option_kind || "").toUpperCase() === "OEM"
    ).length

    const blockers = []
    if (incompleteLines > 0) blockers.push(`Неполных строк: ${incompleteLines}`)
    if (unpricedLines > 0) blockers.push(`Строк без полной цены: ${unpricedLines}`)
    if (oemRiskLines > 0) blockers.push(`OEM-рисков: ${oemRiskLines}`)

    return {
      totalLines,
      incompleteLines,
      unpricedLines,
      oemRiskLines,
      blockers,
      ready: totalLines > 0 && blockers.length === 0,
    }
  }, [scenarioLines])

  const attentionScenarioLines = useMemo(() => {
    return (Array.isArray(scenarioLines) ? scenarioLines : [])
      .filter((row) => {
        const incomplete = Number(row?.completeness_pct || 0) < 100
        const unpriced = Number(row?.priced_pct || 0) < 100
        const oemRisk =
          Number(row?.is_oem_ok || 0) !== 1 &&
          String(row?.option_kind || "").toUpperCase() === "OEM"
        return incomplete || unpriced || oemRisk
      })
      .slice(0, 6)
  }, [scenarioLines])

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
      message.error(e?.response?.data?.message || "Не удалось загрузить строки утвержденного выбора")
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
        description="После утверждения создаётся финальная закупочная база: состав поставщиков, себестоимость, страна происхождения и публичные коды поставщиков фиксируются в выборе. Дальше продавец работает уже от этого утвержденного набора."
      />

      <Card
        size="small"
        title="Решение по сценарию"
        extra={<Button size="small" onClick={() => setHelpOpen(true)}>Справка</Button>}
      >
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
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
          </Space>

          {scenarioMeta ? (
            <Space wrap size={[8, 8]}>
              <Tag>Статус: {SCENARIO_STATUS_LABELS[String(scenarioMeta.status || "").toLowerCase()] || scenarioMeta.status}</Tag>
              <Tag>Режим: {SCENARIO_BASIS_LABELS[String(scenarioMeta.basis || "").toUpperCase()] || scenarioMeta.basis || "Ручной"}</Tag>
              <Tag color="green">Итог: {formatPriceWithCurrency(scenarioMeta.landed_total, scenarioMeta.calc_currency || "USD")}</Tag>
              <Tag color={scenarioReadiness.ready ? "green" : "gold"}>
                {scenarioReadiness.ready ? "Можно утверждать" : "Нужна проверка"}
              </Tag>
              {latestSelection ? <Tag color="blue">{`Последний выбор #${latestSelection.id}`}</Tag> : null}
            </Space>
          ) : null}

          {scenarioMeta ? (
            <Space wrap size={[8, 8]}>
              <Tag>Строк в сценарии: {scenarioReadiness.totalLines}</Tag>
              <Tag color={scenarioReadiness.incompleteLines > 0 ? "orange" : "green"}>
                Неполных: {scenarioReadiness.incompleteLines}
              </Tag>
              <Tag color={scenarioReadiness.unpricedLines > 0 ? "orange" : "green"}>
                Без полной цены: {scenarioReadiness.unpricedLines}
              </Tag>
              {scenarioReadiness.oemRiskLines > 0 ? (
                <Tag color="volcano">OEM-риски: {scenarioReadiness.oemRiskLines}</Tag>
              ) : null}
            </Space>
          ) : null}

          {!scenarioReadiness.ready && scenarioReadiness.blockers.length ? (
            <Alert
              type="warning"
              showIcon
              message="Перед утверждением стоит проверить сценарий"
              description={scenarioReadiness.blockers.join(" · ")}
            />
          ) : null}
        </Space>
      </Card>

      {attentionScenarioLines.length ? (
        <Card
          size="small"
          title="Строки, требующие внимания перед утверждением"
          extra={<Text type="secondary">{`Показано: ${attentionScenarioLines.length}`}</Text>}
        >
          <Table
            size="small"
            rowKey="id"
            dataSource={attentionScenarioLines}
            pagination={false}
            tableLayout="auto"
            scroll={{ x: "max-content" }}
            columns={[
              {
                title: "Строка RFQ",
                width: 260,
                render: (_, row) => (
                  <Space direction="vertical" size={0}>
                    <span>{row.line_number} · {getClientFacingPartNumber(row, `#${row.rfq_item_id}`)}</span>
                    {getClientFacingDescription(row) ? (
                      <span style={{ color: "#666", fontSize: 12 }}>{getClientFacingDescription(row)}</span>
                    ) : null}
                  </Space>
                ),
              },
              {
                title: "Проблема",
                width: 260,
                render: (_, row) => (
                  <Space wrap size={[6, 6]}>
                    {Number(row?.completeness_pct || 0) < 100 ? (
                      <Tag color="orange">{`Полнота ${Number(row?.completeness_pct || 0)}%`}</Tag>
                    ) : null}
                    {Number(row?.priced_pct || 0) < 100 ? (
                      <Tag color="gold">{`С ценой ${Number(row?.priced_pct || 0)}%`}</Tag>
                    ) : null}
                    {Number(row?.is_oem_ok || 0) !== 1 &&
                    String(row?.option_kind || "").toUpperCase() === "OEM" ? (
                      <Tag color="volcano">OEM-риск</Tag>
                    ) : null}
                  </Space>
                ),
              },
              {
                title: "Вариант",
                width: 280,
                render: (_, row) => (
                  <Text type="secondary">{buildScenarioOptionLabel(row)}</Text>
                ),
              },
            ]}
          />
        </Card>
      ) : null}

      <Card
        size="small"
        title="Полный состав утверждаемого сценария"
        extra={
          <Space>
            <Text type="secondary">
              {scenarioReadiness.totalLines ? `Строк: ${scenarioReadiness.totalLines}` : "Нет строк"}
            </Text>
            <Button size="small" onClick={() => setShowScenarioComposition((prev) => !prev)}>
              {showScenarioComposition ? "Скрыть состав" : "Показать состав"}
            </Button>
          </Space>
        }
      >
        {showScenarioComposition ? (
          <Table
            size="small"
            loading={loadingScenario}
            rowKey="id"
            dataSource={scenarioLines}
            pagination={{ pageSize: 20, hideOnSinglePage: true }}
            tableLayout="auto"
            scroll={{ x: "max-content" }}
            columns={[
              {
                title: "Строка RFQ",
                width: 240,
                render: (_, row) => (
                  <Space direction="vertical" size={0}>
                    <span>{row.line_number} · {getClientFacingPartNumber(row, `#${row.rfq_item_id}`)}</span>
                    {getClientFacingDescription(row) ? <span style={{ color: "#666", fontSize: 12 }}>{getClientFacingDescription(row)}</span> : null}
                  </Space>
                ),
              },
              {
                title: "Вариант исполнения",
                width: 240,
                render: (_, row) => buildScenarioOptionLabel(row),
              },
              {
                title: "Тип",
                dataIndex: "option_kind",
                width: 140,
                render: (value) => OPTION_KIND_LABELS[String(value || "").toUpperCase()] || value || "—",
              },
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
        ) : (
          <Text type="secondary">
            Полный состав сценария скрыт, чтобы основной фокус оставался на решении и проблемных строках.
          </Text>
        )}
      </Card>

      <Card
        size="small"
        title="Утверждённый выбор для продавца"
        extra={<span style={{ color: "#666", fontSize: 12 }}>Это downstream-база для КП, контракта и заказа поставщику.</span>}
      >
        {latestSelection ? (
          <Space direction="vertical" size={8} style={{ width: "100%", marginBottom: 12 }}>
            <Space wrap>
              <Text strong>{`Последний выбор #${latestSelection.id}`}</Text>
              <Tag>{SCENARIO_STATUS_LABELS[String(latestSelection.status || "").toLowerCase()] || latestSelection.status || "Черновик"}</Tag>
              <Text type="secondary">{formatDate(latestSelection.created_at)}</Text>
              <Tag color="blue">{`Всего выборов: ${Array.isArray(selections) ? selections.length : 0}`}</Tag>
            </Space>
            <Space wrap size={[8, 8]}>
              {selectionHistoryPreview.map((selection) => (
                <Tag key={selection.id}>{`#${selection.id} · ${formatDate(selection.created_at)}`}</Tag>
              ))}
              {Array.isArray(selections) && selections.length > selectionHistoryPreview.length ? (
                <Tag>{`+${selections.length - selectionHistoryPreview.length}`}</Tag>
              ) : null}
            </Space>
          </Space>
        ) : (
          <Text type="secondary" style={{ display: "block", marginBottom: 12 }}>
            Финальный выбор ещё не создан.
          </Text>
        )}
        <Table
          size="small"
          loading={loadingSelectionLines}
          rowKey="id"
          dataSource={selectionLines}
          pagination={{ pageSize: 10, hideOnSinglePage: true }}
          tableLayout="auto"
          scroll={{ x: "max-content" }}
          columns={[
            {
              title: "Строка",
              width: 260,
              render: (_, row) => (
                <Space direction="vertical" size={0}>
                  <Space size={6} wrap>
                    <span>{row.line_number} · {getClientFacingPartNumber(row, `#${row.rfq_item_id}`)}</span>
                    {row.has_supplier_display_override ? <Tag color="orange">Подмена в закупке</Tag> : null}
                  </Space>
                  {getClientFacingDescription(row) ? <span style={{ color: "#666", fontSize: 12 }}>{getClientFacingDescription(row)}</span> : null}
                  {row.has_supplier_display_override && row.supplier_display_part_number ? (
                    <span style={{ color: "#ad6800", fontSize: 12 }}>
                      Закупка велась по номеру: {row.supplier_display_part_number}
                    </span>
                  ) : null}
                </Space>
              ),
            },
            {
              title: "Код поставщика",
              width: 160,
              render: (_, row) => row.supplier_public_code ? <Tag color="blue">{row.supplier_public_code}</Tag> : <Tag>—</Tag>,
            },
            {
              title: "База себестоимости",
              width: 180,
              render: (_, row) => formatPriceWithCurrency(row.landed_amount, row.selection_currency || scenarioMeta?.calc_currency || "USD"),
            },
            {
              title: "Страна происхождения",
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

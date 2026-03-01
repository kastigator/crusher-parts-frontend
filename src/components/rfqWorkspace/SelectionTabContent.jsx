import React, { useEffect, useMemo, useState } from "react"
import { Alert, Button, Checkbox, Select, Space, Table, Tag, Typography, message } from "antd"
import axios from "@/api/axiosInstance"
import { formatPriceWithCurrency } from "@/utils/priceFormat"

const { Text } = Typography

const selectionStatusLabel = (status) => {
  const key = String(status || "").toLowerCase()
  if (key === "approved") return { label: "Утверждено", color: "green" }
  if (key === "draft") return { label: "Черновик", color: "default" }
  if (key === "review") return { label: "На согласовании", color: "gold" }
  return { label: status || "—", color: "default" }
}

export default function SelectionTabContent({ rfqId, selections, formatDate, onSelectionFinalized }) {
  const [scenarios, setScenarios] = useState([])
  const [scenariosLoading, setScenariosLoading] = useState(false)
  const [selectedScenarioId, setSelectedScenarioId] = useState(null)
  const [lineOptions, setLineOptions] = useState([])
  const [lineOptionsLoading, setLineOptionsLoading] = useState(false)
  const [scenarioMeta, setScenarioMeta] = useState(null)
  const [supplierFilter, setSupplierFilter] = useState(null)
  const [onlyPriced, setOnlyPriced] = useState(false)
  const [allowPartial, setAllowPartial] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [selectedByItem, setSelectedByItem] = useState({})
  const [dutyBasis, setDutyBasis] = useState("GOODS_ONLY")
  const [reasonCodes, setReasonCodes] = useState([])
  const [reasonNote, setReasonNote] = useState("")

  const loadScenarios = async () => {
    if (!rfqId) {
      setScenarios([])
      setSelectedScenarioId(null)
      return
    }
    setScenariosLoading(true)
    try {
      const { data } = await axios.get(`/economics/v2/rfq/${rfqId}/scenarios`)
      const rows = Array.isArray(data?.rows) ? data.rows : []
      setScenarios(rows)
      const selectedRow = rows.find((row) => String(row?.status || "").toLowerCase() === "selected")
      const nextId = Number(selectedRow?.scenario_id || rows?.[0]?.scenario_id || 0) || null
      setSelectedScenarioId((prev) => prev || nextId)
    } catch (e) {
      setScenarios([])
      setSelectedScenarioId(null)
      message.error(e?.response?.data?.message || "Не удалось загрузить сценарии v2")
    } finally {
      setScenariosLoading(false)
    }
  }

  const loadLineOptions = async (scenarioId) => {
    if (!rfqId || !scenarioId) {
      setLineOptions([])
      setScenarioMeta(null)
      setSelectedByItem({})
      return
    }
    setLineOptionsLoading(true)
    try {
      const { data } = await axios.get(`/economics/v2/rfq/${rfqId}/scenarios/${scenarioId}/line-options`, {
        params: { duty_basis: dutyBasis },
      })
      const rows = Array.isArray(data?.rows) ? data.rows : []
      setLineOptions(rows)
      setScenarioMeta(data?.scenario || null)

      const autoSelected = {}
      rows.forEach((row) => {
        const itemId = Number(row?.rfq_item_id || 0)
        const candidateItemId = Number(row?.candidate_item_id || 0)
        if (!itemId || !candidateItemId) return
        if (Number(row?.is_best_for_item || 0)) {
          autoSelected[itemId] = candidateItemId
        }
      })
      setSelectedByItem(autoSelected)
    } catch (e) {
      setLineOptions([])
      setScenarioMeta(null)
      setSelectedByItem({})
      message.error(e?.response?.data?.message || "Не удалось загрузить строки сценария")
    } finally {
      setLineOptionsLoading(false)
    }
  }

  useEffect(() => {
    loadScenarios()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rfqId])

  useEffect(() => {
    if (!selectedScenarioId) {
      setLineOptions([])
      setScenarioMeta(null)
      setSelectedByItem({})
      return
    }
    loadLineOptions(selectedScenarioId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rfqId, selectedScenarioId, dutyBasis])

  const supplierOptions = useMemo(() => {
    const seen = new Set()
    const options = []
    lineOptions.forEach((row) => {
      const supplier = String(row?.supplier_name || "").trim()
      if (!supplier || seen.has(supplier)) return
      seen.add(supplier)
      options.push({ value: supplier, label: supplier })
    })
    return options.sort((a, b) => a.label.localeCompare(b.label))
  }, [lineOptions])

  const filteredRows = useMemo(
    () =>
      lineOptions.filter((row) => {
        if (supplierFilter && String(row?.supplier_name || "") !== supplierFilter) return false
        if (onlyPriced && Number(row?.has_price || 0) !== 1) return false
        return true
      }),
    [lineOptions, supplierFilter, onlyPriced]
  )

  const allItemIds = useMemo(() => {
    const set = new Set()
    lineOptions.forEach((row) => {
      const id = Number(row?.rfq_item_id || 0)
      if (id) set.add(id)
    })
    return Array.from(set)
  }, [lineOptions])

  const selectedCandidateIds = useMemo(
    () =>
      Object.values(selectedByItem)
        .map((id) => Number(id || 0))
        .filter((id) => id > 0),
    [selectedByItem]
  )

  const selectedRows = useMemo(() => {
    const selectedSet = new Set(selectedCandidateIds)
    return lineOptions.filter((row) => selectedSet.has(Number(row?.candidate_item_id || 0)))
  }, [lineOptions, selectedCandidateIds])

  const selectionTotals = useMemo(() => {
    const calc = selectedRows.reduce(
      (acc, row) => {
        const goods = Number(row?.goods_amount_calc)
        const logistics = Number(row?.logistics_amount_calc)
        const duty = Number(row?.duty_amount_calc)
        const landed = Number(row?.landed_amount_calc)
        if (Number.isFinite(goods)) acc.goods += goods
        if (Number.isFinite(logistics)) acc.logistics += logistics
        if (Number.isFinite(duty)) acc.duty += duty
        if (Number.isFinite(landed)) acc.landed += landed
        return acc
      },
      { goods: 0, logistics: 0, duty: 0, landed: 0 }
    )
    return calc
  }, [selectedRows])

  const missingCount = Math.max(allItemIds.length - selectedRows.length, 0)
  const canFinalize = selectedRows.length > 0 && (allowPartial || missingCount === 0)

  const handlePick = (row, checked) => {
    const itemId = Number(row?.rfq_item_id || 0)
    const candidateItemId = Number(row?.candidate_item_id || 0)
    if (!itemId || !candidateItemId) return
    setSelectedByItem((prev) => {
      const next = { ...prev }
      if (checked) next[itemId] = candidateItemId
      else delete next[itemId]
      return next
    })
  }

  const handleFinalize = async () => {
    if (!rfqId || !selectedScenarioId || !canFinalize) return
    setSaveLoading(true)
    try {
      const { data } = await axios.post(
        `/economics/v2/rfq/${rfqId}/scenarios/${selectedScenarioId}/finalize-selection`,
        {
          selected_candidate_item_ids: selectedCandidateIds,
          allow_partial: allowPartial ? 1 : 0,
          duty_basis: dutyBasis,
          reason_codes: reasonCodes,
          reason_note: reasonNote || null,
          note: "Финализировано вручную во вкладке Выбор",
        }
      )
      message.success(data?.message || "Финальный выбор создан")
      await loadScenarios()
      await loadLineOptions(selectedScenarioId)
      if (typeof onSelectionFinalized === "function") {
        await onSelectionFinalized()
      }
    } catch (e) {
      const err = e?.response?.data
      if (Array.isArray(err?.missing_lines) && err.missing_lines.length) {
        message.error(`Не выбраны позиции: ${err.missing_lines.join(", ")}`)
      } else {
        message.error(err?.message || "Не удалось создать финальный выбор")
      }
    } finally {
      setSaveLoading(false)
    }
  }

  return (
    <Space direction="vertical" style={{ width: "100%" }} size={12}>
      <Alert
        type="info"
        showIcon
        message="Финальный выбор делается вручную"
        description="Сценарий экономики дает расчет по затратам, а вы отмечаете чекбоксом итогового поставщика по каждой позиции."
      />

      {!scenarios.length ? (
        <Alert
          type="info"
          showIcon
          message="Сценарии экономики пока не созданы"
          description="Перейдите во вкладку «Экономика», создайте и пересчитайте сценарий."
        />
      ) : null}

      <Space wrap>
        <Select
          style={{ minWidth: 360 }}
          value={selectedScenarioId || undefined}
          placeholder="Выберите сценарий экономики"
          loading={scenariosLoading}
          onChange={(value) => setSelectedScenarioId(Number(value || 0) || null)}
          options={scenarios.map((row) => ({
            value: Number(row?.scenario_id),
            label: `${row?.name || `Сценарий #${row?.scenario_id}`} · ${String(row?.status || "draft").toUpperCase()} · ${formatPriceWithCurrency(
              row?.landed_total,
              row?.calc_currency || "USD"
            )}`,
          }))}
        />
        <Button onClick={loadScenarios} loading={scenariosLoading}>
          Обновить сценарии
        </Button>
      </Space>

      {scenarioMeta ? (
        <Space wrap>
          <Tag color="blue">Позиции RFQ: {allItemIds.length}</Tag>
          <Tag color={missingCount ? "orange" : "green"}>Отмечено: {selectedRows.length}</Tag>
          <Tag>Стратегия: {scenarioMeta?.strategy || "MANUAL"}</Tag>
          <Tag color="geekblue">Валюта: {scenarioMeta?.calc_currency || "USD"}</Tag>
          <Tag>
            Товар: {formatPriceWithCurrency(selectionTotals.goods, scenarioMeta?.calc_currency)}
          </Tag>
          <Tag>
            Логистика: {formatPriceWithCurrency(selectionTotals.logistics, scenarioMeta?.calc_currency)}
          </Tag>
          <Tag>
            Пошлина: {formatPriceWithCurrency(selectionTotals.duty, scenarioMeta?.calc_currency)}
          </Tag>
          <Tag color="green">
            Итог: {formatPriceWithCurrency(selectionTotals.landed, scenarioMeta?.calc_currency)}
          </Tag>
        </Space>
      ) : null}

      <Space wrap>
        <Select
          allowClear
          style={{ minWidth: 260 }}
          placeholder="Фильтр по поставщику"
          value={supplierFilter}
          onChange={(value) => setSupplierFilter(value || null)}
          options={supplierOptions}
          showSearch
          optionFilterProp="label"
        />
        <Select
          style={{ minWidth: 180 }}
          value={onlyPriced ? "priced" : "all"}
          onChange={(value) => setOnlyPriced(value === "priced")}
          options={[
            { value: "all", label: "Все строки" },
            { value: "priced", label: "Только с ценой" },
          ]}
        />
        <Checkbox checked={allowPartial} onChange={(e) => setAllowPartial(e.target.checked)}>
          Разрешить частичный выбор
        </Checkbox>
        <Select
          style={{ minWidth: 260 }}
          value={dutyBasis}
          onChange={setDutyBasis}
          options={[
            { value: "GOODS_ONLY", label: "Пошлина: от товара" },
            { value: "CUSTOMS_VALUE", label: "Пошлина: товар + логистика" },
          ]}
        />
        <Select
          mode="multiple"
          allowClear
          style={{ minWidth: 340 }}
          value={reasonCodes}
          onChange={(vals) => setReasonCodes(Array.isArray(vals) ? vals : [])}
          placeholder="Причины выбора"
          options={[
            { value: "MIN_TOTAL", label: "Минимальная итоговая стоимость" },
            { value: "CONSOLIDATION", label: "Консолидация у меньшего числа поставщиков" },
            { value: "LEAD_TIME", label: "Лучший срок поставки" },
            { value: "OEM_PRIORITY", label: "Приоритет OEM/качества" },
            { value: "RISK_REDUCTION", label: "Снижение рисков поставки" },
          ]}
        />
        <Button
          type="primary"
          onClick={handleFinalize}
          disabled={!canFinalize}
          loading={saveLoading}
        >
          Зафиксировать финальный выбор
        </Button>
      </Space>
      <Space direction="vertical" style={{ width: "100%" }} size={4}>
        <Text type="secondary">Комментарий к решению (попадет в историю выбора)</Text>
        <textarea
          value={reasonNote}
          onChange={(e) => setReasonNote(e.target.value)}
          rows={2}
          style={{ width: "100%", border: "1px solid #d9d9d9", borderRadius: 6, padding: 8 }}
          placeholder="Например: берем 90% у одного поставщика ради консолидации и снижения операционной сложности"
        />
      </Space>

      <Table
        rowKey={(record) => `candidate:${record?.candidate_item_id}`}
        dataSource={filteredRows}
        loading={lineOptionsLoading}
        pagination={{ pageSize: 50 }}
        scroll={{ x: "max-content" }}
        locale={{ emptyText: "Нет строк для выбранного сценария" }}
        columns={[
          {
            title: "Строка RFQ",
            dataIndex: "line_number",
            width: 110,
            render: (value, record) => value || record?.rfq_item_id || "—",
          },
          {
            title: "Позиция",
            dataIndex: "item_label",
            width: 240,
            render: (value, record) => (
              <Space direction="vertical" size={0}>
                <Text>{value || "—"}</Text>
                {record?.item_description ? <Text type="secondary">{record.item_description}</Text> : null}
              </Space>
            ),
          },
          { title: "Поставщик", dataIndex: "supplier_name", width: 220, render: (value) => value || "—" },
          { title: "Вариант", dataIndex: "slot_name", width: 180, render: (value) => value || "—" },
          {
            title: "Товар",
            dataIndex: "goods_amount_calc",
            width: 140,
            render: (value, record) => formatPriceWithCurrency(value, record?.calc_currency),
          },
          {
            title: "Логистика",
            dataIndex: "logistics_amount_calc",
            width: 140,
            render: (value, record) => formatPriceWithCurrency(value, record?.calc_currency),
          },
          {
            title: "Пошлина",
            dataIndex: "duty_amount_calc",
            width: 120,
            render: (value, record) => formatPriceWithCurrency(value, record?.calc_currency),
          },
          {
            title: "Итог",
            dataIndex: "landed_amount_calc",
            width: 150,
            render: (value, record) => formatPriceWithCurrency(value, record?.calc_currency),
          },
          { title: "Срок, дн", dataIndex: "lead_time_days", width: 95, render: (value) => value || "—" },
          {
            title: "Сигналы",
            key: "signals",
            width: 220,
            render: (_, record) => (
              <Space wrap>
                {Number(record?.is_best_for_item || 0) ? <Tag color="green">Реком.</Tag> : null}
                {Number(record?.is_oem_offer || 0) ? <Tag color="gold">OEM</Tag> : null}
                {record?.goods_fx_warning || record?.logistics_warning ? (
                  <Tag color="orange">FX/логистика</Tag>
                ) : null}
                {record?.duty_warning ? <Tag color="orange">Нет пошлины ТН ВЭД</Tag> : null}
              </Space>
            ),
          },
          {
            title: "Выбрать",
            key: "pick",
            width: 120,
            render: (_, record) => {
              const itemId = Number(record?.rfq_item_id || 0)
              const candidateItemId = Number(record?.candidate_item_id || 0)
              const checked = Number(selectedByItem[itemId] || 0) === candidateItemId
              return (
                <Checkbox
                  checked={checked}
                  onChange={(e) => handlePick(record, e.target.checked)}
                />
              )
            },
          },
        ]}
      />

      {missingCount > 0 && !allowPartial ? (
        <Alert
          type="warning"
          showIcon
          message={`Не выбрано позиций: ${missingCount}`}
          description="Для финализации без частичного режима отметьте по одному варианту на каждую позицию RFQ."
        />
      ) : null}

      <Table
        rowKey={(record, idx) => (record?.id != null ? `selection:${record.id}` : `selection:${idx}`)}
        dataSource={Array.isArray(selections) ? selections : []}
        pagination={false}
        locale={{ emptyText: "История финальных выборов пока пустая" }}
        columns={[
          {
            title: "Статус",
            dataIndex: "status",
            width: 140,
            render: (value) => {
              const meta = selectionStatusLabel(value)
              return <Tag color={meta.color}>{meta.label}</Tag>
            },
          },
          { title: "Комментарий", dataIndex: "note" },
          { title: "Создано", dataIndex: "created_at", width: 140, render: formatDate },
        ]}
      />
    </Space>
  )
}

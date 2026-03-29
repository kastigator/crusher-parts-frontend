import React, { useEffect, useMemo, useRef, useState } from "react"
import { Alert, Button, Card, Checkbox, Form, Input, Popover, Select, Space, Table, Tag, Typography } from "antd"
import useCapabilities from "@/hooks/useCapabilities"
import useTableScrollHints from "@/utils/useTableScrollHints"
import "@/styles/tableStyles.css"

const { Text } = Typography
const HINT_FILTER_MODE_KEY = "rfq_workspace_suppliers_hint_filter_mode"
const HINT_FILTER_HIDE_ADDED_KEY = "rfq_workspace_suppliers_hint_hide_added"
const MATCH_TYPE_LABELS = {
  WHOLE: "Целиком",
  BOM: "По составу",
  KIT: "Комплект",
  STANDARD: "По стандартной детали",
}

export default function SuppliersTabContent({
  suggestedSuppliers,
  suggestedSelection,
  setSuggestedSelection,
  renderMatchTypes,
  handleAddSuggestedSuppliers,
  supplierForm,
  handleAddSupplier,
  supplierOptions,
  setSupplierCreateOpen,
  hasAnySupplierSent,
  totalNewLines,
  suppliers,
  selectedSupplierIds,
  setSelectedSupplierIds,
  handleSupplierLanguage,
  openSelectionModal,
  dispatchSummaryMap,
  formatDate,
  supplierSendingId,
  handleSendForSupplier,
  statusToColor,
  supplierStatusLabel,
  handleSendRfq,
  sending,
  activeRfqId,
  loadDocuments,
  sendIncludePriced,
  setSendIncludePriced,
  fileDispatches,
  docsLoading,
  activeRfq,
}) {
  const { can } = useCapabilities()
  const canEditCatalogs = can("catalogs.edit", "workflow.rfq.master_data.write")
  const [hintFilterMode, setHintFilterMode] = useState(() => {
    if (typeof window === "undefined") return "all"
    const saved = window.localStorage.getItem(HINT_FILTER_MODE_KEY)
    if (["all", "preferred", "priced", "unpriced"].includes(saved)) return saved
    return "all"
  })
  const [onlyNotAddedHints, setOnlyNotAddedHints] = useState(() => {
    if (typeof window === "undefined") return false
    return window.localStorage.getItem(HINT_FILTER_HIDE_ADDED_KEY) === "1"
  })
  const [historyOpen, setHistoryOpen] = useState(false)
  const dispatchTableWrapRef = useRef(null)
  const historyTableWrapRef = useRef(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    window.localStorage.setItem(HINT_FILTER_MODE_KEY, hintFilterMode)
  }, [hintFilterMode])

  useEffect(() => {
    if (typeof window === "undefined") return
    window.localStorage.setItem(HINT_FILTER_HIDE_ADDED_KEY, onlyNotAddedHints ? "1" : "0")
  }, [onlyNotAddedHints])

  const normalizeMatchRow = (row) => {
    if (!row) return null
    if (typeof row === "string") {
      return {
        text: row,
        priced: false,
        isPreferred: false,
        type: null,
      }
    }
    return {
      text: row?.text || "—",
      priced: Number(row?.priced || 0) > 0,
      isPreferred: Number(row?.is_preferred || 0) > 0,
      type: row?.match_type || null,
      target: row?.target || null,
      supplierPartNumber: row?.supplier_part_number || null,
    }
  }

  const renderMatchRow = (row, idx) => {
    const item = normalizeMatchRow(row)
    if (!item) return null
    const left = item.target || item.text || "—"
    const right = item.supplierPartNumber || "без номера"
    const typeLabel = MATCH_TYPE_LABELS[String(item.type || "").toUpperCase()] || item.type
    const source = String(row?.match_source || "").toUpperCase()
    return (
      <Space key={`match-${idx}-${item.text}`} size={6} wrap align="start">
        <Text style={{ fontSize: 12, maxWidth: 540 }}>
          {left} {"\u2192"} {right}
        </Text>
        {source === "OEM" ? (
          <Tag color="blue" style={{ marginInlineEnd: 0 }}>
            По OEM
          </Tag>
        ) : source === "STANDARD" ? (
          <Tag color="green" style={{ marginInlineEnd: 0 }}>
            По стандартной детали
          </Tag>
        ) : null}
        {typeLabel ? (
          <Tag color="blue" style={{ marginInlineEnd: 0 }}>
            {typeLabel}
          </Tag>
        ) : null}
        <Tag color={item.priced ? "green" : "default"} style={{ marginInlineEnd: 0 }}>
          {item.priced ? "с ценой" : "без цены"}
        </Tag>
      </Space>
    )
  }

  const hasPreferredInPreview = (preview) => {
    const list = Array.isArray(preview) ? preview : []
    return list.some((row) => Number(row?.is_preferred || 0) > 0)
  }

  const supplierInRfqBySupplierId = useMemo(() => {
    const map = new Map()
    ;(Array.isArray(suppliers) ? suppliers : []).forEach((item) => {
      const supplierId = Number(item?.supplier_id || 0)
      if (supplierId > 0) map.set(supplierId, item)
    })
    return map
  }, [suppliers])

  const filteredSuggestedSuppliers = useMemo(() => {
    const list = Array.isArray(suggestedSuppliers) ? suggestedSuppliers : []
    return list.filter((row) => {
      const preferred =
        Number(row?.has_preferred_match || 0) > 0 || hasPreferredInPreview(row?.match_preview)
      const pricedCount = Number(row?.priced_parts_count || 0)
      const inRfq = supplierInRfqBySupplierId.has(Number(row?.supplier_id || 0))

      if (onlyNotAddedHints && inRfq) return false
      if (hintFilterMode === "preferred" && !preferred) return false
      if (hintFilterMode === "priced" && pricedCount <= 0) return false
      if (hintFilterMode === "unpriced" && pricedCount > 0) return false
      return true
    })
  }, [suggestedSuppliers, onlyNotAddedHints, hintFilterMode, supplierInRfqBySupplierId])

  const hintQuickStats = useMemo(() => {
    const list = Array.isArray(suggestedSuppliers) ? suggestedSuppliers : []
    const total = list.length
    const preferred = list.filter(
      (row) =>
        Number(row?.has_preferred_match || 0) > 0 || hasPreferredInPreview(row?.match_preview)
    ).length
    const withPrice = list.filter((row) => Number(row?.priced_parts_count || 0) > 0).length
    const alreadyInRfq = list.filter((row) =>
      supplierInRfqBySupplierId.has(Number(row?.supplier_id || 0))
    ).length
    return { total, preferred, withPrice, alreadyInRfq }
  }, [suggestedSuppliers, supplierInRfqBySupplierId])

  const selectedSupplierRows = useMemo(() => {
    const selectedSet = new Set(
      (Array.isArray(selectedSupplierIds) ? selectedSupplierIds : []).map((id) => Number(id))
    )
    return (Array.isArray(suppliers) ? suppliers : []).filter((row) =>
      selectedSet.has(Number(row?.supplier_id || 0))
    )
  }, [selectedSupplierIds, suppliers])

  const sendSummary = useMemo(() => {
    const selectedCount = selectedSupplierRows.length
    const summaryRows = selectedSupplierRows.map((row) => {
      const dispatch = dispatchSummaryMap.get(row.supplier_id) || {}
      const hadSent = Number(dispatch?.last_sent_rfq_revision_id || 0) > 0
      const newLines = Number(dispatch?.new_lines_count || 0)
      return { hadSent, newLines }
    })
    const previouslySentCount = summaryRows.filter((row) => row.hadSent).length
    const firstSendCount = selectedCount - previouslySentCount
    const deltaEligibleCount = summaryRows.filter((row) => row.hadSent && row.newLines > 0).length
    const deltaEmptyCount = summaryRows.filter((row) => row.hadSent && row.newLines <= 0).length
    const deltaLinesTotal = summaryRows.reduce((sum, row) => sum + (row.newLines > 0 ? row.newLines : 0), 0)
    return {
      selectedCount,
      previouslySentCount,
      firstSendCount,
      deltaEligibleCount,
      deltaEmptyCount,
      deltaLinesTotal,
    }
  }, [selectedSupplierRows, dispatchSummaryMap])

  const dispatchScrollHints = useTableScrollHints(dispatchTableWrapRef, [suppliers, selectedSupplierIds, dispatchSummaryMap])
  const historyScrollHints = useTableScrollHints(historyTableWrapRef, [fileDispatches, docsLoading, historyOpen])

  const renderMatchPreview = (value) => {
    const list = Array.isArray(value) ? value.filter(Boolean) : []
    if (!list.length) return <Text type="secondary">—</Text>
    const shown = list.slice(0, 3)
    const extra = Math.max(0, list.length - shown.length)
    const popoverContent = (
      <Space direction="vertical" size={4} style={{ maxWidth: 760 }}>
        {list.map((row, idx) => renderMatchRow(row, idx))}
      </Space>
    )
    return (
      <Space direction="vertical" size={2}>
        {shown.map((row, idx) => renderMatchRow(row, idx))}
        {extra > 0 ? (
          <Popover title="Все совпадения" content={popoverContent} trigger="hover" placement="rightTop">
            <Text type="secondary" style={{ fontSize: 12, cursor: "pointer" }}>
              + еще {extra} (наведите)
            </Text>
          </Popover>
        ) : null}
      </Space>
    )
  }

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Space direction="vertical" size={4} style={{ width: "100%" }}>
        <Text strong>Режим 1. Подбор и состав поставщиков</Text>
        <Text type="secondary">
          Здесь вы подбираете кандидатов, вручную добавляете поставщиков и формируете состав RFQ до отправки.
        </Text>
      </Space>

      <Card size="small" title="Кандидаты по подсказкам">
        <Space direction="vertical" style={{ width: "100%" }}>
          <Space wrap>
            <Select
              size="small"
              style={{ width: 260 }}
              value={hintFilterMode}
              onChange={setHintFilterMode}
              options={[
                { value: "all", label: "Показывать: все подсказки" },
                { value: "preferred", label: "Только приоритетные связи" },
                { value: "priced", label: "Только поставщики с ценой" },
                { value: "unpriced", label: "Только без цены" },
              ]}
            />
            <Checkbox
              checked={onlyNotAddedHints}
              onChange={(e) => setOnlyNotAddedHints(e.target.checked)}
            >
              Скрыть уже добавленных в RFQ
            </Checkbox>
            <Tag color="blue" style={{ marginInlineEnd: 0 }}>
              Всего: {hintQuickStats.total}
            </Tag>
            <Tag color="gold" style={{ marginInlineEnd: 0 }}>
              Приоритетных: {hintQuickStats.preferred}
            </Tag>
            <Tag color="green" style={{ marginInlineEnd: 0 }}>
              С ценой: {hintQuickStats.withPrice}
            </Tag>
            <Tag style={{ marginInlineEnd: 0 }}>
              Уже в RFQ: {hintQuickStats.alreadyInRfq}
            </Tag>
            <Text type="secondary" style={{ fontSize: 12 }}>
              После фильтра: {filteredSuggestedSuppliers.length}
            </Text>
          </Space>
          <Table
            rowKey="supplier_id"
            dataSource={filteredSuggestedSuppliers}
            pagination={false}
            tableLayout="auto"
            scroll={{ x: "max-content" }}
            rowSelection={{
              selectedRowKeys: suggestedSelection,
              onChange: setSuggestedSelection,
            }}
            columns={[
              { title: "Поставщик", dataIndex: "supplier_name", width: 220, ellipsis: true },
              { title: "Совпадений", dataIndex: "parts_count", width: 130 },
              {
                title: "С ценой",
                dataIndex: "priced_parts_count",
                width: 130,
                render: (v, row) => `${Number(v || 0)}/${Number(row?.parts_count || 0)}`,
              },
              {
                title: "Типы",
                dataIndex: "match_types",
                width: 130,
                render: renderMatchTypes,
              },
              {
                title: "Что совпало",
                dataIndex: "match_preview",
                width: 320,
                render: renderMatchPreview,
              },
              {
                title: "Приоритетный",
                dataIndex: "has_preferred_match",
                width: 140,
                render: (value, row) => {
                  const preferred =
                    Number(value || 0) > 0 || hasPreferredInPreview(row?.match_preview)
                  return preferred ? (
                    <Tag color="gold" style={{ marginInlineEnd: 0 }}>
                      Да
                    </Tag>
                  ) : (
                    <Text type="secondary">—</Text>
                  )
                },
              },
              {
                title: "Сигналы",
                key: "signals",
                width: 180,
                render: (_, row) => {
                  const preferred =
                    Number(row?.has_preferred_match || 0) > 0 ||
                    hasPreferredInPreview(row?.match_preview)
                  const pricedCount = Number(row?.priced_parts_count || 0)
                  const partsCount = Number(row?.parts_count || 0)
                  const hasOemMatch = Number(row?.has_oem_match || 0) > 0
                  const hasStandardMatch = Number(row?.has_standard_match || 0) > 0
                  const inRfq = supplierInRfqBySupplierId.has(Number(row?.supplier_id || 0))
                  return (
                    <Space size={4} wrap>
                      {preferred ? <Tag color="gold">Приоритетный</Tag> : null}
                      {hasOemMatch ? <Tag color="blue">По OEM</Tag> : null}
                      {!hasOemMatch && hasStandardMatch ? (
                        <Tag color="green">По стандартной детали</Tag>
                      ) : null}
                      <Tag color={pricedCount > 0 ? "green" : "default"}>
                        Цена {pricedCount}/{partsCount}
                      </Tag>
                      {inRfq ? <Tag color="blue">В RFQ</Tag> : <Tag>Новый</Tag>}
                    </Space>
                  )
                },
              },
            ]}
          />
          <Button
            type="primary"
            onClick={handleAddSuggestedSuppliers}
            disabled={!filteredSuggestedSuppliers.length}
          >
            Добавить выбранных
          </Button>
        </Space>
      </Card>

      <Card size="small" title="Ручное добавление поставщика">
        <Form
          form={supplierForm}
          onFinish={handleAddSupplier}
          layout="vertical"
        >
          <Space wrap align="start">
            <Form.Item
              label="Поставщик"
              name="supplier_id"
              rules={[{ required: true, message: "Выберите поставщика" }]}
            >
              <Select
                showSearch
                optionFilterProp="label"
                style={{ width: 260 }}
                options={supplierOptions}
                placeholder="Поиск по названию"
              />
            </Form.Item>
            <Form.Item label="Комментарий" name="note">
              <Input style={{ width: 220 }} />
            </Form.Item>
            <Form.Item style={{ marginTop: 30 }}>
              <Button type="primary" htmlType="submit">
                Добавить
              </Button>
            </Form.Item>
            <Form.Item style={{ marginTop: 30 }}>
              <Button onClick={() => setSupplierCreateOpen(true)} disabled={!canEditCatalogs}>
                Создать поставщика
              </Button>
            </Form.Item>
          </Space>
        </Form>
      </Card>

      <Space direction="vertical" size={4} style={{ width: "100%" }}>
        <Text strong>Режим 2. Отправка и история</Text>
        <Text type="secondary">
          Здесь вы настраиваете состав рассылки, отправляете RFQ выбранным поставщикам и проверяете историю файлов.
        </Text>
      </Space>

      <Card size="small" title="Состав рассылки RFQ">
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message="Перед отправкой"
          description={
            <Space direction="vertical" size={6} style={{ width: "100%" }}>
              <Space size={8} wrap>
                <Tag color="blue" style={{ marginInlineEnd: 0 }}>
                  Выбрано поставщиков: {sendSummary.selectedCount}
                </Tag>
                <Tag color="default" style={{ marginInlineEnd: 0 }}>
                  Первая отправка: {sendSummary.firstSendCount}
                </Tag>
                <Tag color="cyan" style={{ marginInlineEnd: 0 }}>
                  Уже отправлялось: {sendSummary.previouslySentCount}
                </Tag>
                <Tag color={sendSummary.deltaEligibleCount > 0 ? "orange" : "default"} style={{ marginInlineEnd: 0 }}>
                  Только новые доступно: {sendSummary.deltaEligibleCount}
                </Tag>
                <Tag color={sendSummary.deltaEmptyCount > 0 ? "red" : "green"} style={{ marginInlineEnd: 0 }}>
                  Без новых строк: {sendSummary.deltaEmptyCount}
                </Tag>
                <Tag color="default" style={{ marginInlineEnd: 0 }}>
                  Новых строк всего: {sendSummary.deltaLinesTotal}
                </Tag>
                <Tag color={sendIncludePriced ? "green" : "default"} style={{ marginInlineEnd: 0 }}>
                  {sendIncludePriced ? "Переиспользование цен: вкл" : "Переиспользование цен: выкл"}
                </Tag>
              </Space>
            </Space>
          }
        />
        <Space direction="vertical" size={6} style={{ width: "100%", marginBottom: 12 }}>
          <Space wrap>
            <Button
              type="primary"
              onClick={handleSendRfq}
              disabled={!suppliers.length}
              loading={sending}
            >
              Сформировать Excel
            </Button>
            <Checkbox
              checked={sendIncludePriced}
              onChange={(e) => setSendIncludePriced(e.target.checked)}
            >
              Включать строки с уже принятой ценой
            </Checkbox>
          </Space>
          <Text type="secondary">
            Сначала настраивается состав рассылки, затем формируются файлы RFQ.
          </Text>
        </Space>
        {hasAnySupplierSent && totalNewLines > 0 ? (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 12 }}
            message={`Новые позиции в ревизии: ${totalNewLines}`}
            description="Используйте «Только новые» у выбранных поставщиков, если хотите дослать только добавленные строки без повторной полной рассылки."
          />
        ) : null}
        <div
          ref={dispatchTableWrapRef}
          className={`op-table-wrap${dispatchScrollHints.left ? " scroll-left" : ""}${
            dispatchScrollHints.right ? " scroll-right" : ""
          }`}
        >
          {dispatchScrollHints.right && !dispatchScrollHints.left ? (
            <Text type="secondary" className="op-table-scroll-note">
              В таблице есть продолжение вправо
            </Text>
          ) : null}
          <Table
            rowKey="supplier_id"
            dataSource={suppliers}
            pagination={false}
            tableLayout="auto"
            scroll={{ x: "max-content" }}
            rowSelection={{
              selectedRowKeys: selectedSupplierIds,
              onChange: setSelectedSupplierIds,
            }}
            columns={[
            { title: "Поставщик", dataIndex: "supplier_name", width: 220, ellipsis: true },
            {
              title: "Контакт",
              dataIndex: "contact_person",
              width: 220,
              render: (_, record) => {
                const parts = [
                  record.contact_person,
                  record.contact_email,
                  record.contact_phone,
                ].filter(Boolean)
                return parts.length ? parts.join(" / ") : "—"
              },
            },
            {
              title: "RU",
              width: 70,
              align: "center",
              render: (_, record) => (
                <Checkbox
                  checked={(record.language || "ru") === "ru"}
                  onChange={() =>
                    handleSupplierLanguage(record, "ru")
                  }
                />
              ),
            },
            {
              title: "EN",
              width: 70,
              align: "center",
              render: (_, record) => (
                <Checkbox
                  checked={(record.language || "ru") === "en"}
                  onChange={() =>
                    handleSupplierLanguage(record, "en")
                  }
                />
              ),
            },
            {
              title: "Настройка",
              width: 110,
              render: (_, record) => (
                <Button size="small" onClick={() => openSelectionModal(record)}>
                  Структура
                </Button>
              ),
            },
            {
              title: "Отправка",
              width: 250,
              render: (_, record) => {
                const summary = dispatchSummaryMap.get(record.supplier_id) || {}
                const newCount = summary.new_lines_count || 0
                const lastRev = summary.last_sent_rfq_revision_number
                const lastAt = summary.last_sent_at ? formatDate(summary.last_sent_at) : null
                return (
                  <Space direction="vertical" size={4}>
                    <Space size={6} wrap>
                      <Tag color={lastRev ? "blue" : "default"}>
                        {lastRev ? `Отправлено: Rev ${lastRev}` : "Еще не отправляли"}
                      </Tag>
                      <Tag color={newCount > 0 ? "orange" : "green"}>
                        Новых строк: {newCount}
                      </Tag>
                    </Space>
                    {lastAt ? (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Последняя отправка: {lastAt}
                      </Text>
                    ) : (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Первичная отправка
                      </Text>
                    )}
                    <Space size={8} wrap>
                      <Button
                        size="small"
                        loading={supplierSendingId === record.supplier_id}
                        onClick={() => handleSendForSupplier(record, "full")}
                      >
                        Отправить все
                      </Button>
                      {lastRev ? (
                        <Button
                          size="small"
                          type="primary"
                          disabled={newCount === 0}
                          loading={supplierSendingId === record.supplier_id}
                          onClick={() => handleSendForSupplier(record, "delta")}
                        >
                          Только новые
                        </Button>
                      ) : null}
                    </Space>
                  </Space>
                )
              },
            },
            {
              title: "Статус",
              dataIndex: "status",
              width: 110,
              render: (value) => (
                <Tag color={statusToColor(value)}>
                  {supplierStatusLabel(value || "invited")}
                </Tag>
              ),
            },
            {
              title: "Дата",
              dataIndex: "invited_at",
              width: 110,
              render: formatDate,
            },
            { title: "Комментарий", dataIndex: "note", width: 220, ellipsis: true },
            ]}
          />
        </div>
      </Card>

      <Card
        size="small"
        title="История отправок RFQ"
        extra={
          <Space>
            <Button size="small" onClick={() => setHistoryOpen((prev) => !prev)}>
              {historyOpen ? "Скрыть историю" : "Показать историю"}
            </Button>
            {historyOpen ? (
              <Button size="small" onClick={() => activeRfqId && loadDocuments(activeRfqId)}>
                Обновить список
              </Button>
            ) : null}
          </Space>
        }
      >
        {historyOpen ? (
          <Space direction="vertical" style={{ width: "100%" }}>
            <Text type="secondary">
              Показываются все сформированные файлы RFQ. После формирования статус RFQ станет «отправлен».
            </Text>
            <div
              ref={historyTableWrapRef}
              className={`op-table-wrap${historyScrollHints.left ? " scroll-left" : ""}${
                historyScrollHints.right ? " scroll-right" : ""
              }`}
            >
              {historyScrollHints.right && !historyScrollHints.left ? (
                <Text type="secondary" className="op-table-scroll-note">
                  В таблице есть продолжение вправо
                </Text>
              ) : null}
              <Table
                rowKey="id"
                dataSource={fileDispatches}
                loading={docsLoading}
                pagination={false}
                tableLayout="auto"
                scroll={{ x: "max-content" }}
                columns={[
                {
                  title: "Файл",
                  dataIndex: "file_name",
                  render: (value, record) => {
                    const humanizedValue = value
                      ? String(value)
                          .replace(/\bDelta\b/gi, "Только новые")
                          .replace(/\bFull\b/gi, "Полный")
                      : null
                    const fallback =
                      humanizedValue ||
                      `${activeRfq?.rfq_number || `RFQ-${activeRfqId || ""}`} Rev ${
                        record.rfq_revision_number || "-"
                      } ${record.dispatch_type === "DELTA" ? "Только новые" : "Полный"}`
                    return record.file_url ? (
                      <a href={record.file_url} target="_blank" rel="noreferrer">
                        {fallback}
                      </a>
                    ) : (
                      <Text type="secondary">{fallback}</Text>
                    )
                  },
                },
                {
                  title: "Rev",
                  dataIndex: "rfq_revision_number",
                  width: 80,
                  render: (v) => v || "—",
                },
                {
                  title: "Поставщик",
                  dataIndex: "supplier_name",
                  width: 220,
                },
                {
                  title: "Режим",
                  dataIndex: "dispatch_type",
                  width: 100,
                  render: (v) => (
                    <Tag color={v === "DELTA" ? "orange" : "blue"}>
                      {v === "DELTA" ? "Только новые" : "Полный"}
                    </Tag>
                  ),
                },
                {
                  title: "Строки",
                  width: 140,
                  render: (_, r) =>
                    r.rows_total
                      ? `${r.rows_total}${
                        r.rows_changed ? ` (новых: ${r.rows_changed})` : ""
                      }`
                      : "—",
                },
                { title: "Создано", dataIndex: "sent_at", width: 140, render: formatDate },
                ]}
              />
            </div>
          </Space>
        ) : (
          <Text type="secondary">
            История файлов скрыта, чтобы основной фокус оставался на текущем составе рассылки и отправке RFQ.
          </Text>
        )}
      </Card>
    </Space>
  )
}

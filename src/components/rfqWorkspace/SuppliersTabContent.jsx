import React, { useEffect, useMemo, useState } from "react"
import { Alert, Button, Card, Checkbox, Form, Input, Popover, Select, Space, Table, Tag, Typography } from "antd"
import useCapabilities from "@/hooks/useCapabilities"

const { Text } = Typography
const HINT_FILTER_MODE_KEY = "rfq_workspace_suppliers_hint_filter_mode"
const HINT_FILTER_HIDE_ADDED_KEY = "rfq_workspace_suppliers_hint_hide_added"
const MATCH_TYPE_LABELS = {
  WHOLE: "Целиком",
  BOM: "По составу",
  KIT: "Комплект",
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
    return (
      <Space key={`match-${idx}-${item.text}`} size={6} wrap align="start">
        <Text style={{ fontSize: 12, maxWidth: 540 }}>
          {left} {"\u2192"} {right}
        </Text>
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
      <Card size="small" title="Подсказки по поставщикам">
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
            rowSelection={{
              selectedRowKeys: suggestedSelection,
              onChange: setSuggestedSelection,
            }}
            columns={[
              { title: "Поставщик", dataIndex: "supplier_name" },
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
                width: 160,
                render: renderMatchTypes,
              },
              {
                title: "Что совпало",
                dataIndex: "match_preview",
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
                width: 220,
                render: (_, row) => {
                  const preferred =
                    Number(row?.has_preferred_match || 0) > 0 ||
                    hasPreferredInPreview(row?.match_preview)
                  const pricedCount = Number(row?.priced_parts_count || 0)
                  const partsCount = Number(row?.parts_count || 0)
                  const inRfq = supplierInRfqBySupplierId.has(Number(row?.supplier_id || 0))
                  return (
                    <Space size={4} wrap>
                      {preferred ? <Tag color="gold">Приоритетный</Tag> : null}
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

      <Card size="small" title="Добавить поставщика">
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

      <Card size="small" title="Поставщики в RFQ">
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message={
            <Space size={8} wrap>
              <Text strong>Перед отправкой:</Text>
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
              <Tag color="orange" style={{ marginInlineEnd: 0 }}>
                Новых строк всего: {sendSummary.deltaLinesTotal}
              </Tag>
              <Tag color={sendIncludePriced ? "volcano" : "green"} style={{ marginInlineEnd: 0 }}>
                Переиспользование цен: {sendIncludePriced ? "выкл (включаем строки с уже принятой ценой)" : "вкл (исключаем строки с уже принятой ценой)"}
              </Tag>
            </Space>
          }
        />
        {hasAnySupplierSent && totalNewLines > 0 ? (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 12 }}
            message={`Новые позиции в ревизии: ${totalNewLines}. Нажмите «Только новые» у выбранных поставщиков — старые файлы останутся в истории, новые отправятся отдельным Excel.`}
          />
        ) : null}
        <Table
          rowKey="supplier_id"
          dataSource={suppliers}
          pagination={false}
          rowSelection={{
            selectedRowKeys: selectedSupplierIds,
            onChange: setSelectedSupplierIds,
          }}
          columns={[
            { title: "Поставщик", dataIndex: "supplier_name" },
            {
              title: "Контакт",
              dataIndex: "contact_person",
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
              width: 130,
              render: (_, record) => (
                <Button size="small" onClick={() => openSelectionModal(record)}>
                  Структура
                </Button>
              ),
            },
            {
              title: "Отправка",
              width: 360,
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
                      {lastAt ? <Text type="secondary">{lastAt}</Text> : null}
                      <Tag color={newCount > 0 ? "orange" : "green"}>
                        Новых строк: {newCount}
                      </Tag>
                      {!lastRev ? <Tag>Первичная отправка</Tag> : null}
                    </Space>
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
              width: 120,
              render: (value) => (
                <Tag color={statusToColor(value)}>
                  {supplierStatusLabel(value || "invited")}
                </Tag>
              ),
            },
            {
              title: "Дата",
              dataIndex: "invited_at",
              width: 120,
              render: formatDate,
            },
            { title: "Комментарий", dataIndex: "note" },
          ]}
        />
      </Card>

      <Card size="small" title="Файлы RFQ">
        <Space direction="vertical" style={{ width: "100%" }}>
          <Space wrap align="center">
            <Button
              type="primary"
              onClick={handleSendRfq}
              disabled={!suppliers.length}
              loading={sending}
            >
              Сформировать Excel
            </Button>
            <Button onClick={() => activeRfqId && loadDocuments(activeRfqId)}>
              Обновить список
            </Button>
            <Checkbox
              checked={sendIncludePriced}
              onChange={(e) => setSendIncludePriced(e.target.checked)}
            >
              Включать строки с уже принятой ценой
            </Checkbox>
            <Text type="secondary">
              Показываются все сформированные файлы RFQ. После формирования статус RFQ станет «отправлен».
            </Text>
          </Space>
          <Table
            rowKey="id"
            dataSource={fileDispatches}
            loading={docsLoading}
            pagination={false}
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
        </Space>
      </Card>
    </Space>
  )
}

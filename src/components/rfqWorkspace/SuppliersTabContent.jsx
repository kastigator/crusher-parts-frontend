import React from "react"
import { Alert, Button, Card, Checkbox, Form, Input, Select, Space, Table, Tag, Typography } from "antd"

const { Text } = Typography

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
  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Card size="small" title="Подсказки по поставщикам">
        <Space direction="vertical" style={{ width: "100%" }}>
          <Table
            rowKey="supplier_id"
            dataSource={suggestedSuppliers}
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
            ]}
          />
          <Button
            type="primary"
            onClick={handleAddSuggestedSuppliers}
            disabled={!suggestedSuppliers.length}
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
              <Button onClick={() => setSupplierCreateOpen(true)}>
                Создать поставщика
              </Button>
            </Form.Item>
          </Space>
        </Form>
      </Card>

      <Card size="small" title="Поставщики в RFQ">
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

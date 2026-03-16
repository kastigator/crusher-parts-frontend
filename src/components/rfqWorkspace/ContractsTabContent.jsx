import React, { useState } from "react"
import { Alert, Button, Card, Drawer, Space, Table, Tag, Typography } from "antd"
import { formatPriceWithCurrency } from "@/utils/priceFormat"

const CONTRACT_STATUS_META = {
  draft: { color: "default", label: "Черновик" },
  sent_to_client: { color: "blue", label: "Отправлен клиенту" },
  signed: { color: "green", label: "Подписан" },
  in_execution: { color: "gold", label: "В исполнении" },
  completed: { color: "success", label: "Исполнен" },
  closed_with_issues: { color: "volcano", label: "Закрыт с проблемами" },
}

export default function ContractsTabContent({ contracts, formatDate, onCommercialUpdated }) {
  const [helpOpen, setHelpOpen] = useState(false)
  const executionReadyCount = (Array.isArray(contracts) ? contracts : []).filter(
    (row) => ["signed", "in_execution"].includes(String(row?.status || "").toLowerCase())
  ).length

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <Alert
        type={executionReadyCount > 0 ? "success" : "info"}
        showIcon
        message={
          executionReadyCount > 0
            ? "Есть контракт, открытый к исполнению: PO можно оформлять по утвержденной ревизии КП"
            : "До подписанного контракта PO создавать нельзя"
        }
        description="Контракт создаётся и согласуется на стороне продавца в Client Request Workspace. После статуса «Подписан» первый PO переводит контракт в «В исполнении». Закупщик должен ориентироваться на утвержденную коммерческую ревизию, а не на весь исходный выбор закупки."
      />

      <Card
        size="small"
        title="Контракты по RFQ"
        extra={
          <Space>
            <Button size="small" onClick={() => setHelpOpen(true)}>
              Справка
            </Button>
            <Button size="small" onClick={onCommercialUpdated}>
              Обновить
            </Button>
          </Space>
        }
      >
        <Table
          rowKey="id"
          dataSource={contracts}
          pagination={{ pageSize: 10, hideOnSinglePage: true }}
          columns={[
            { title: "Контракт", dataIndex: "contract_number", width: 160 },
            { title: "КП", width: 90, render: (_, row) => `#${row.sales_quote_id}` },
            { title: "Rev КП", width: 90, render: (_, row) => (row.sales_quote_revision_number ? `Rev ${row.sales_quote_revision_number}` : "—") },
            {
              title: "Статус",
              dataIndex: "status",
              width: 140,
              render: (value) => {
                const meta = CONTRACT_STATUS_META[String(value || "").toLowerCase()] || null
                return <Tag color={meta?.color || "default"}>{meta?.label || value || "Черновик"}</Tag>
              },
            },
            { title: "PO", width: 80, render: (_, row) => `${Number(row.po_confirmed || 0)}/${Number(row.po_total || 0)}` },
            {
              title: "Открытые отклонения",
              width: 140,
              render: (_, row) =>
                Number(row.open_quality_events || 0) > 0 ? (
                  <Tag color="volcano">{Number(row.open_quality_events || 0)}</Tag>
                ) : (
                  <Tag color="green">0</Tag>
                ),
            },
            {
              title: "Дата",
              dataIndex: "contract_date",
              width: 120,
              render: formatDate,
            },
            {
              title: "Сумма",
              width: 140,
              render: (_, row) => formatPriceWithCurrency(row.amount, row.currency || "USD"),
            },
            { title: "Комментарий", dataIndex: "note" },
          ]}
        />
      </Card>

      <Drawer
        title="Справка по вкладке «Контракты»"
        placement="right"
        width={420}
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
      >
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Typography.Paragraph>
            Контракт фиксирует уже не закупочный выбор сам по себе, а конкретную коммерческую ревизию КП,
            которую согласовал клиент.
          </Typography.Paragraph>
          <Typography.Paragraph>
            После статуса <strong>«Подписан»</strong> закупщик может переходить к созданию PO поставщикам.
            Первый PO переводит контракт в статус <strong>«В исполнении»</strong>.
          </Typography.Paragraph>
          <Typography.Paragraph style={{ marginBottom: 0 }}>
            Контракт нельзя переводить в <strong>«Исполнен»</strong>, пока не подтверждены все PO и пока есть
            открытые события качества. Если исполнение завершилось с проблемами, используется статус
            <strong>«Закрыт с проблемами»</strong>.
          </Typography.Paragraph>
        </Space>
      </Drawer>
    </Space>
  )
}

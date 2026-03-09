import React from "react"
import { Alert, Button, Card, Space, Table, Tag } from "antd"
import { formatPriceWithCurrency } from "@/utils/priceFormat"

export default function ContractsTabContent({ contracts, formatDate, onCommercialUpdated }) {
  const signedCount = (Array.isArray(contracts) ? contracts : []).filter(
    (row) => String(row?.status || "").toLowerCase() === "signed"
  ).length

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <Alert
        type={signedCount > 0 ? "success" : "info"}
        showIcon
        message={
          signedCount > 0
            ? "Есть подписанный контракт, PO можно оформлять"
            : "До signed-контракта PO создавать нельзя"
        }
        description="Контракт создаётся и согласуется на стороне продавца в Client Request Workspace. Закупщик здесь видит только факт готовности downstream-процесса."
      />

      <Card
        size="small"
        title="Контракты по RFQ"
        extra={
          <Button size="small" onClick={onCommercialUpdated}>
            Обновить
          </Button>
        }
      >
        <Table
          rowKey="id"
          dataSource={contracts}
          pagination={{ pageSize: 10, hideOnSinglePage: true }}
          columns={[
            { title: "Контракт", dataIndex: "contract_number", width: 160 },
            { title: "КП", width: 90, render: (_, row) => `#${row.sales_quote_id}` },
            {
              title: "Статус",
              dataIndex: "status",
              width: 140,
              render: (value) => (
                <Tag color={String(value || "").toLowerCase() === "signed" ? "green" : "default"}>
                  {value || "draft"}
                </Tag>
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
    </Space>
  )
}

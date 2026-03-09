import React, { useMemo, useState } from "react"
import { Alert, Button, Card, Form, Select, Space, Table, Tag, message } from "antd"
import axios from "@/api/axiosInstance"
import { formatPriceWithCurrency } from "@/utils/priceFormat"

const quoteStatusOptions = [
  { value: "draft", label: "draft" },
  { value: "internal_review", label: "internal_review" },
  { value: "sent_to_client", label: "sent_to_client" },
]

export default function SalesTabContent({
  activeRfq,
  selections,
  salesQuotes,
  formatDate,
  onCommercialUpdated,
}) {
  const [creating, setCreating] = useState(false)
  const [updatingQuoteId, setUpdatingQuoteId] = useState(null)
  const [form] = Form.useForm()

  const selectionOptions = useMemo(
    () =>
      (Array.isArray(selections) ? selections : []).map((row) => ({
        value: Number(row.id),
        label: `Selection #${row.id} · ${row.status || "draft"} · ${formatPriceWithCurrency(
          row.landed_total,
          row.calc_currency || "USD"
        )}`,
      })),
    [selections]
  )

  const handleCreateQuote = async (values) => {
    const revisionId = Number(activeRfq?.client_request_revision_id || 0) || null
    if (!revisionId) {
      message.warning("У RFQ нет привязанной ревизии заявки клиента")
      return
    }
    setCreating(true)
    try {
      await axios.post("/sales-quotes", {
        client_request_revision_id: revisionId,
        selection_id: values.selection_id,
        status: values.status || "draft",
        currency: values.currency || "USD",
        auto_create_revision: true,
        autofill_from_selection: true,
      })
      message.success("КП создано и передано на сторону продавца")
      form.resetFields()
      if (typeof onCommercialUpdated === "function") {
        await onCommercialUpdated()
      }
    } catch (e) {
      message.error(e?.response?.data?.message || "Не удалось создать КП")
    } finally {
      setCreating(false)
    }
  }

  const updateQuoteStatus = async (quoteId, status) => {
    setUpdatingQuoteId(Number(quoteId))
    try {
      await axios.patch(`/sales-quotes/${quoteId}`, { status })
      message.success("Статус КП обновлён")
      if (typeof onCommercialUpdated === "function") {
        await onCommercialUpdated()
      }
    } catch (e) {
      message.error(e?.response?.data?.message || "Не удалось обновить статус КП")
    } finally {
      setUpdatingQuoteId(null)
    }
  }

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <Alert
        type="info"
        showIcon
        message="КП создаётся из утверждённого selection и уходит продавцу"
        description="Закупщик формирует cost basis из selection. Дальше продавец уже работает с seller-side ревизиями КП и своей маржой на стороне Client Request Workspace."
      />

      <Card size="small" title="Создать draft КП из selection">
        <Form
          form={form}
          layout="vertical"
          initialValues={{ status: "draft", currency: "USD" }}
          onFinish={handleCreateQuote}
        >
          <Space wrap align="start">
            <Form.Item
              name="selection_id"
              label="Selection"
              rules={[{ required: true, message: "Выберите selection" }]}
            >
              <Select style={{ width: 420 }} options={selectionOptions} />
            </Form.Item>
            <Form.Item name="status" label="Статус КП">
              <Select style={{ width: 180 }} options={quoteStatusOptions} />
            </Form.Item>
            <Form.Item name="currency" label="Валюта">
              <Select
                style={{ width: 120 }}
                options={[
                  { value: "USD", label: "USD" },
                  { value: "EUR", label: "EUR" },
                  { value: "RUB", label: "RUB" },
                ]}
              />
            </Form.Item>
          </Space>
          <Button type="primary" htmlType="submit" loading={creating}>
            Создать КП и передать продавцу
          </Button>
        </Form>
      </Card>

      <Card
        size="small"
        title="Коммерческие предложения по RFQ"
        extra={
          <Button size="small" onClick={onCommercialUpdated}>
            Обновить
          </Button>
        }
      >
        <Table
          rowKey="id"
          dataSource={salesQuotes}
          pagination={{ pageSize: 10, hideOnSinglePage: true }}
          columns={[
            { title: "КП", width: 90, render: (_, row) => `#${row.id}` },
            { title: "Selection", dataIndex: "selection_id", width: 100, render: (value) => value || "—" },
            {
              title: "Статус",
              width: 220,
              render: (_, row) => (
                <Select
                  size="small"
                  style={{ width: 180 }}
                  value={row.status || "draft"}
                  options={quoteStatusOptions}
                  loading={updatingQuoteId === Number(row.id)}
                  onChange={(value) => updateQuoteStatus(row.id, value)}
                />
              ),
            },
            { title: "Latest rev", dataIndex: "latest_revision_number", width: 100, render: (value) => value || "—" },
            {
              title: "Cost",
              width: 140,
              render: (_, row) => formatPriceWithCurrency(row.total_cost, row.currency || "USD"),
            },
            {
              title: "Sell",
              width: 140,
              render: (_, row) => formatPriceWithCurrency(row.total_sell, row.currency || "USD"),
            },
            {
              title: "Маржа",
              width: 100,
              render: (_, row) => `${Number(row.margin_pct_avg || 0).toFixed(1)}%`,
            },
            {
              title: "Создано",
              dataIndex: "created_at",
              width: 120,
              render: formatDate,
            },
            {
              title: "Seller-side",
              width: 150,
              render: (_, row) => (
                <Tag color={row.status === "sent_to_client" ? "green" : "blue"}>
                  {row.status === "sent_to_client" ? "У клиента" : "У продавца"}
                </Tag>
              ),
            },
          ]}
        />
      </Card>
    </Space>
  )
}

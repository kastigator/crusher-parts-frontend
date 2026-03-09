import React, { useEffect, useMemo, useState } from "react"
import { Alert, Button, Card, DatePicker, Form, Input, InputNumber, Select, Space, Table, Tag, message } from "antd"
import dayjs from "dayjs"
import axios from "@/api/axiosInstance"
import { formatPriceWithCurrency } from "@/utils/priceFormat"
import CompanyLegalSummary from "@/components/common/CompanyLegalSummary"

const formatDate = (value) => {
  if (!value) return "—"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("ru-RU")
}

const parseSnapshot = (value) => {
  if (!value) return null
  if (typeof value === "object") return value
  try {
    return JSON.parse(value)
  } catch (_e) {
    return null
  }
}

export default function RequestContractTabContent({ requestId }) {
  const [quotes, setQuotes] = useState([])
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [updatingContractId, setUpdatingContractId] = useState(null)
  const [form] = Form.useForm()

  const loadData = async () => {
    if (!requestId) return
    setLoading(true)
    try {
      const [{ data: quotesData }, { data: contractsData }] = await Promise.all([
        axios.get("/sales-quotes", { params: { request_id: requestId } }),
        axios.get("/contracts", { params: { request_id: requestId } }),
      ])
      setQuotes(Array.isArray(quotesData) ? quotesData : [])
      setContracts(Array.isArray(contractsData) ? contractsData : [])
    } catch (e) {
      message.error(e?.response?.data?.message || "Не удалось загрузить контракты")
      setQuotes([])
      setContracts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId])

  const quoteOptions = useMemo(
    () =>
      quotes.map((row) => ({
        value: Number(row.id),
        label: `КП #${row.id} · ${row.status} · ${formatPriceWithCurrency(row.total_sell, row.currency || "USD")}`,
      })),
    [quotes]
  )
  const latestContractProfile = useMemo(
    () => parseSnapshot(contracts?.[0]?.company_legal_snapshot_json),
    [contracts]
  )

  const handleCreateContract = async (values) => {
    setSaving(true)
    try {
      await axios.post("/contracts", {
        sales_quote_id: values.sales_quote_id,
        contract_number: values.contract_number,
        contract_date: values.contract_date?.format("YYYY-MM-DD"),
        amount: values.amount,
        currency: values.currency,
        status: values.status,
        note: values.note,
      })
      message.success("Контракт создан")
      form.resetFields()
      await loadData()
    } catch (e) {
      message.error(e?.response?.data?.message || "Не удалось создать контракт")
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateContractStatus = async (contractId, status) => {
    setUpdatingContractId(Number(contractId))
    try {
      await axios.patch(`/contracts/${contractId}`, { status })
      message.success("Статус контракта обновлён")
      await loadData()
    } catch (e) {
      message.error(e?.response?.data?.message || "Не удалось обновить статус контракта")
    } finally {
      setUpdatingContractId(null)
    }
  }

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <CompanyLegalSummary
        profile={latestContractProfile}
        title={latestContractProfile ? "Реквизиты, зафиксированные в контракте" : "Реквизиты нашего юрлица"}
        description={
          latestContractProfile
            ? `В последнем контракте зафиксирована версия реквизитов с ${latestContractProfile.effective_from}.`
            : undefined
        }
      />

      <Alert
        type="info"
        showIcon
        message="Контракт закрывает seller-side цикл и открывает PO"
        description="После контракта со статусом signed закупщик получает право оформлять supplier PO по утверждённому selection."
      />

      <Card size="small" title="Новый контракт">
        <Form form={form} layout="vertical" onFinish={handleCreateContract} initialValues={{ status: "draft", currency: "USD" }}>
          <Space wrap align="start">
            <Form.Item name="sales_quote_id" label="КП" rules={[{ required: true }]}>
              <Select style={{ width: 360 }} options={quoteOptions} />
            </Form.Item>
            <Form.Item name="contract_number" label="Номер" rules={[{ required: true }]}>
              <Input style={{ width: 180 }} />
            </Form.Item>
            <Form.Item name="contract_date" label="Дата" rules={[{ required: true }]}>
              <DatePicker style={{ width: 160 }} format="DD.MM.YYYY" />
            </Form.Item>
            <Form.Item name="amount" label="Сумма">
              <InputNumber style={{ width: 160 }} min={0} />
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
            <Form.Item name="status" label="Статус">
              <Select
                style={{ width: 160 }}
                options={[
                  { value: "draft", label: "draft" },
                  { value: "sent_to_client", label: "sent_to_client" },
                  { value: "signed", label: "signed" },
                ]}
              />
            </Form.Item>
          </Space>
          <Form.Item name="note" label="Комментарий">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={saving}>
            Создать контракт
          </Button>
        </Form>
      </Card>

      <Card size="small" title="Контракты по заявке">
        <Table
          rowKey="id"
          loading={loading}
          dataSource={contracts}
          pagination={false}
          columns={[
            { title: "Номер", dataIndex: "contract_number", width: 160 },
            {
              title: "Статус",
              width: 180,
              render: (_, row) => (
                <Select
                  size="small"
                  style={{ width: 160 }}
                  value={row.status || "draft"}
                  loading={updatingContractId === Number(row.id)}
                  onChange={(value) => handleUpdateContractStatus(row.id, value)}
                  options={[
                    { value: "draft", label: "draft" },
                    { value: "sent_to_client", label: "sent_to_client" },
                    { value: "signed", label: "signed" },
                  ]}
                />
              ),
            },
            { title: "Дата", dataIndex: "contract_date", width: 120, render: formatDate },
            { title: "Сумма", width: 140, render: (_, row) => formatPriceWithCurrency(row.amount, row.currency || "USD") },
            { title: "КП", width: 90, render: (_, row) => `#${row.sales_quote_id}` },
            { title: "Комментарий", dataIndex: "note" },
          ]}
        />
      </Card>
    </Space>
  )
}

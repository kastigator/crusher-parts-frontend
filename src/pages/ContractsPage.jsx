import React, { useEffect, useMemo, useState } from "react"
import {
  Alert,
  Card,
  Space,
  Table,
  Form,
  Input,
  InputNumber,
  Select,
  Button,
  message,
} from "antd"
import PageWrapper from "@/components/common/PageWrapper"
import axios from "@/api/axiosInstance"
import { formatPriceWithCurrency } from "@/utils/priceFormat"

const CREATE_STATUS_OPTIONS = [
  { value: "draft", label: "Черновик" },
  { value: "sent_to_client", label: "Отправлен клиенту" },
  { value: "signed", label: "Подписан" },
]

const STATUS_LABELS = {
  draft: "Черновик",
  sent_to_client: "Отправлен клиенту",
  signed: "Подписан",
  in_execution: "В исполнении",
  completed: "Исполнен",
  closed_with_issues: "Закрыт с проблемами",
}

export default function ContractsPage() {
  const [contracts, setContracts] = useState([])
  const [quotes, setQuotes] = useState([])
  const [loading, setLoading] = useState(false)
  const [form] = Form.useForm()

  const handleGenerate = async (contract) => {
    try {
      const { data } = await axios.post(`/contracts/${contract.id}/generate`)
      await loadContracts()
      if (data?.url) window.open(data.url, "_blank", "noopener")
      message.success("DOCX контракта сформирован")
    } catch (e) {
      console.error(e)
      message.error(e?.response?.data?.message || "Не удалось сформировать DOCX")
    }
  }

  const loadContracts = async () => {
    setLoading(true)
    try {
      const { data } = await axios.get("/contracts")
      setContracts(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
      message.error("Не удалось загрузить контракты")
    } finally {
      setLoading(false)
    }
  }

  const loadQuotes = async () => {
    try {
      const { data } = await axios.get("/sales-quotes")
      setQuotes(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadContracts()
    loadQuotes()
  }, [])

  const quoteOptions = useMemo(
    () =>
      quotes.map((q) => ({
        value: q.id,
        label: `${q.client_name || "Клиент"} · ревизия ${q.rev_number || ""}`.trim(),
      })),
    [quotes],
  )

  const handleCreate = async (values) => {
    try {
      await axios.post("/contracts", {
        sales_quote_id: values.sales_quote_id,
        contract_number: values.contract_number,
        contract_date: values.contract_date,
        amount: values.amount ?? null,
        currency: values.currency || null,
        status: values.status || "draft",
        file_url: values.file_url || null,
        note: values.note || null,
      })
      form.resetFields()
      await loadContracts()
      message.success("Контракт создан")
    } catch (e) {
      console.error(e)
      message.error("Не удалось создать контракт")
    }
  }

  return (
    <PageWrapper
      title="Контракты"
      helpText="Контракт фиксирует согласованную коммерческую ревизию и открывает переход к заказам поставщикам."
    >
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Alert
          type="warning"
          showIcon
          message="Страница создания контрактов выведена из основного процесса"
          description="Новые контракты создавайте в Client Request Workspace. Здесь оставлены обзор и генерация DOCX для уже существующих контрактов."
        />
        <Card title="Новый контракт" size="small">
          <Form form={form} layout="vertical" onFinish={handleCreate}>
            <Space wrap align="start">
              <Form.Item
                label="КП"
                name="sales_quote_id"
                rules={[{ required: true, message: "Выберите КП" }]}
              >
                <Select style={{ width: 160 }} options={quoteOptions} />
              </Form.Item>
              <Form.Item
                label="Номер договора"
                name="contract_number"
                rules={[{ required: true, message: "Укажите номер" }]}
              >
                <Input style={{ width: 200 }} />
              </Form.Item>
              <Form.Item
                label="Дата"
                name="contract_date"
                rules={[{ required: true, message: "Укажите дату" }]}
              >
                <Input style={{ width: 140 }} placeholder="YYYY-MM-DD" />
              </Form.Item>
              <Form.Item label="Сумма" name="amount">
                <InputNumber style={{ width: 140 }} min={0} />
              </Form.Item>
              <Form.Item label="Валюта" name="currency">
                <Input style={{ width: 90 }} />
              </Form.Item>
              <Form.Item label="Статус" name="status" initialValue="draft">
                <Select
                  style={{ width: 140 }}
                  options={CREATE_STATUS_OPTIONS}
                />
              </Form.Item>
              <Form.Item label="Файл" name="file_url">
                <Input style={{ width: 240 }} placeholder="URL" />
              </Form.Item>
              <Form.Item label="Комментарий" name="note">
                <Input style={{ width: 240 }} />
              </Form.Item>
              <Form.Item style={{ marginTop: 30 }}>
                <Button type="primary" htmlType="submit" disabled>
                  Создать
                </Button>
              </Form.Item>
            </Space>
          </Form>
        </Card>

        <Card title="Список контрактов" size="small">
          <Table
            rowKey="id"
            dataSource={contracts}
            loading={loading}
            pagination={{ pageSize: 20 }}
            columns={[
              { title: "Клиент", dataIndex: "client_name" },
              { title: "Номер", dataIndex: "contract_number", width: 140 },
              { title: "Дата", dataIndex: "contract_date", width: 120 },
              {
                title: "Сумма",
                dataIndex: "amount",
                width: 160,
                render: (v, r) => formatPriceWithCurrency(v, r?.currency),
              },
              { title: "Валюта", dataIndex: "currency", width: 90 },
              {
                title: "Статус",
                dataIndex: "status",
                width: 160,
                render: (value) => STATUS_LABELS[String(value || "").trim()] || value || "—",
              },
              {
                title: "Файл",
                width: 220,
                render: (_, row) => (
                  <Space>
                    {row.file_url ? (
                      <Button size="small" onClick={() => window.open(row.file_url, "_blank", "noopener")}>
                        Открыть файл
                      </Button>
                    ) : null}
                    <Button size="small" onClick={() => handleGenerate(row)}>
                      Сформировать DOCX
                    </Button>
                  </Space>
                ),
              },
            ]}
          />
        </Card>
      </Space>
    </PageWrapper>
  )
}

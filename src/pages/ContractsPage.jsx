import React, { useEffect, useMemo, useState } from "react"
import {
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

export default function ContractsPage() {
  const [contracts, setContracts] = useState([])
  const [quotes, setQuotes] = useState([])
  const [loading, setLoading] = useState(false)
  const [form] = Form.useForm()

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
        label: `${q.client_name || "Клиент"} · Rev ${q.rev_number || ""}`.trim(),
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
      helpText="Фиксируйте согласованные условия с клиентом."
    >
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
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
                  options={[
                    { value: "draft", label: "Черновик" },
                    { value: "signed", label: "Подписан" },
                    { value: "closed", label: "Закрыт" },
                  ]}
                />
              </Form.Item>
              <Form.Item label="Файл" name="file_url">
                <Input style={{ width: 240 }} placeholder="URL" />
              </Form.Item>
              <Form.Item label="Комментарий" name="note">
                <Input style={{ width: 240 }} />
              </Form.Item>
              <Form.Item style={{ marginTop: 30 }}>
                <Button type="primary" htmlType="submit">
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
              { title: "Статус", dataIndex: "status", width: 120 },
            ]}
          />
        </Card>
      </Space>
    </PageWrapper>
  )
}

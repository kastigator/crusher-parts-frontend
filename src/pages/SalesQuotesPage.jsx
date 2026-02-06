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
  Drawer,
  Tabs,
  message,
  Tag,
} from "antd"
import PageWrapper from "@/components/common/PageWrapper"
import axios from "@/api/axiosInstance"
import { formatPriceWithCurrency } from "@/utils/priceFormat"

export default function SalesQuotesPage() {
  const [quotes, setQuotes] = useState([])
  const [requests, setRequests] = useState([])
  const [revisions, setRevisions] = useState([])
  const [selections, setSelections] = useState([])
  const [quoteRevisions, setQuoteRevisions] = useState([])
  const [quoteLines, setQuoteLines] = useState([])
  const [activeRevisionId, setActiveRevisionId] = useState(null)
  const [revisionItems, setRevisionItems] = useState([])

  const [loading, setLoading] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [activeQuote, setActiveQuote] = useState(null)

  const [createForm] = Form.useForm()
  const [revisionForm] = Form.useForm()
  const [lineForm] = Form.useForm()

  const revisionItemMap = useMemo(() => {
    const map = new Map()
    revisionItems.forEach((item) => {
      map.set(
        item.id,
        `${item.original_cat_number || "Без номера"} · ${item.client_description || ""}`.trim(),
      )
    })
    return map
  }, [revisionItems])

  const loadQuotes = async () => {
    setLoading(true)
    try {
      const { data } = await axios.get("/sales-quotes")
      setQuotes(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
      message.error("Не удалось загрузить КП")
    } finally {
      setLoading(false)
    }
  }

  const loadRequests = async () => {
    try {
      const { data } = await axios.get("/client-requests")
      setRequests(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
    }
  }

  const loadSelections = async () => {
    try {
      const { data } = await axios.get("/selection")
      setSelections(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
    }
  }

  const loadRequestRevisions = async (requestId) => {
    if (!requestId) {
      setRevisions([])
      return
    }
    try {
      const { data } = await axios.get(`/client-requests/${requestId}/revisions`)
      setRevisions(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadQuotes()
    loadRequests()
    loadSelections()
  }, [])

  const requestOptions = useMemo(
    () =>
      requests.map((r) => ({
        value: r.id,
        label: `${r.client_name || "Клиент"} ${r.created_at || ""}`.trim(),
      })),
    [requests],
  )

  const revisionOptions = useMemo(
    () =>
      revisions.map((rev) => ({
        value: rev.id,
        label: `Rev ${rev.rev_number}`,
      })),
    [revisions],
  )

  const selectionOptions = useMemo(
    () =>
      selections.map((s) => ({
        value: s.id,
        label: `${s.client_name || "Клиент"} · ${s.created_at || ""}`.trim(),
      })),
    [selections],
  )

  const handleCreate = async (values) => {
    try {
      await axios.post("/sales-quotes", {
        client_request_revision_id: values.client_request_revision_id,
        selection_id: values.selection_id,
        status: values.status || "draft",
        currency: values.currency || null,
      })
      createForm.resetFields()
      await loadQuotes()
      message.success("КП создано")
    } catch (e) {
      console.error(e)
      message.error("Не удалось создать КП")
    }
  }

  const loadQuoteRevisions = async (quoteId) => {
    try {
      const { data } = await axios.get(`/sales-quotes/${quoteId}/revisions`)
      const list = Array.isArray(data) ? data : []
      setQuoteRevisions(list)
      const latest = list[0]?.id || null
      setActiveRevisionId(latest)
      if (latest) {
        await loadQuoteLines(latest)
      } else {
        setQuoteLines([])
      }
    } catch (e) {
      console.error(e)
      message.error("Не удалось загрузить ревизии")
    }
  }

  const loadQuoteLines = async (revisionId) => {
    try {
      const { data } = await axios.get(
        `/sales-quotes/revisions/${revisionId}/lines`,
      )
      setQuoteLines(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
    }
  }

  const loadRevisionItems = async (revisionId) => {
    if (!revisionId) {
      setRevisionItems([])
      return
    }
    try {
      const { data } = await axios.get(
        `/client-requests/revisions/${revisionId}/items`,
      )
      setRevisionItems(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
    }
  }

  const handleAddRevision = async (values) => {
    if (!activeQuote?.id) return
    try {
      await axios.post(`/sales-quotes/${activeQuote.id}/revisions`, {
        note: values.note || null,
      })
      revisionForm.resetFields()
      await loadQuoteRevisions(activeQuote.id)
      message.success("Ревизия создана")
    } catch (e) {
      console.error(e)
      message.error("Не удалось создать ревизию")
    }
  }

  const handleAddLine = async (values) => {
    if (!activeRevisionId) return
    try {
      await axios.post(`/sales-quotes/revisions/${activeRevisionId}/lines`, {
        client_request_revision_item_id: values.client_request_revision_item_id,
        qty: values.qty ?? null,
        cost: values.cost ?? null,
        sell_price: values.sell_price ?? null,
        margin_pct: values.margin_pct ?? null,
        currency: values.currency || null,
        note: values.note || null,
      })
      lineForm.resetFields()
      await loadQuoteLines(activeRevisionId)
      message.success("Строка добавлена")
    } catch (e) {
      console.error(e)
      message.error("Не удалось добавить строку")
    }
  }

  const openDrawer = async (record) => {
    setActiveQuote(record)
    setDrawerOpen(true)
    await loadQuoteRevisions(record.id)
    if (record.client_request_revision_id) {
      await loadRevisionItems(record.client_request_revision_id)
    }
  }

  return (
    <PageWrapper
      title="Коммерческие предложения"
      helpText="Фиксируйте КП на основе выбора и ревизий заявки."
    >
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Card title="Новое КП" size="small">
          <Form form={createForm} layout="vertical" onFinish={handleCreate}>
            <Space wrap align="start">
              <Form.Item label="Заявка" name="client_request_id">
                <Select
                  style={{ width: 220 }}
                  options={requestOptions}
                  onChange={(val) => {
                    createForm.setFieldsValue({ client_request_revision_id: null })
                    loadRequestRevisions(val)
                  }}
                />
              </Form.Item>
              <Form.Item
                label="Ревизия"
                name="client_request_revision_id"
                rules={[{ required: true, message: "Выберите ревизию" }]}
              >
                <Select style={{ width: 180 }} options={revisionOptions} />
              </Form.Item>
              <Form.Item
                label="Выбор"
                name="selection_id"
                rules={[{ required: true, message: "Выберите выбор" }]}
              >
                <Select style={{ width: 180 }} options={selectionOptions} />
              </Form.Item>
              <Form.Item label="Статус" name="status" initialValue="draft">
                <Select
                  style={{ width: 140 }}
                  options={[
                    { value: "draft", label: "Черновик" },
                    { value: "sent", label: "Отправлено" },
                    { value: "approved", label: "Согласовано" },
                  ]}
                />
              </Form.Item>
              <Form.Item label="Валюта" name="currency">
                <Input style={{ width: 90 }} placeholder="USD" />
              </Form.Item>
              <Form.Item style={{ marginTop: 30 }}>
                <Button type="primary" htmlType="submit">
                  Создать КП
                </Button>
              </Form.Item>
            </Space>
          </Form>
        </Card>

        <Card title="Список КП" size="small">
          <Table
            rowKey="id"
            dataSource={quotes}
            loading={loading}
            pagination={{ pageSize: 20 }}
            onRow={(record) => ({
              onClick: () => openDrawer(record),
            })}
            columns={[
              { title: "Клиент", dataIndex: "client_name" },
              { title: "Rev", dataIndex: "rev_number", width: 80 },
              { title: "Статус", dataIndex: "status", width: 120 },
              { title: "Валюта", dataIndex: "currency", width: 90 },
              { title: "Создано", dataIndex: "created_at", width: 160 },
            ]}
          />
        </Card>
      </Space>

      <Drawer
        width={900}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={
          <Space>
            <span>Коммерческое предложение</span>
            {activeQuote?.status ? <Tag>{activeQuote.status}</Tag> : null}
          </Space>
        }
      >
        <Tabs
          defaultActiveKey="revisions"
          items={[
            {
              key: "revisions",
              label: "Ревизии",
              children: (
                <Space direction="vertical" style={{ width: "100%" }}>
                  <Card size="small" title="Новая ревизия">
                    <Form form={revisionForm} onFinish={handleAddRevision}>
                      <Space wrap align="start">
                        <Form.Item label="Комментарий" name="note">
                          <Input style={{ width: 320 }} />
                        </Form.Item>
                        <Form.Item style={{ marginTop: 30 }}>
                          <Button type="primary" htmlType="submit">
                            Создать
                          </Button>
                        </Form.Item>
                      </Space>
                    </Form>
                  </Card>

                  <Table
                    rowKey="id"
                    dataSource={quoteRevisions}
                    pagination={false}
                    onRow={(record) => ({
                      onClick: async () => {
                        setActiveRevisionId(record.id)
                        await loadQuoteLines(record.id)
                      },
                    })}
                    columns={[
                      { title: "Rev", dataIndex: "rev_number", width: 70 },
                      { title: "Комментарий", dataIndex: "note" },
                      { title: "Создано", dataIndex: "created_at", width: 160 },
                    ]}
                  />
                </Space>
              ),
            },
            {
              key: "lines",
              label: "Строки КП",
              children: (
                <Space direction="vertical" style={{ width: "100%" }}>
                  <Card size="small" title="Добавить строку">
                    <Form form={lineForm} onFinish={handleAddLine} layout="vertical">
                      <Space wrap align="start">
                        <Form.Item
                          label="Позиция заявки"
                          name="client_request_revision_item_id"
                          tooltip="Берите позицию из выбранной ревизии заявки"
                          rules={[{ required: true, message: "Укажите item" }]}
                        >
                          <Select
                            style={{ width: 260 }}
                            options={revisionItems.map((item) => ({
                              value: item.id,
                              label: `${item.original_cat_number || "Без номера"} · ${item.client_description || ""}`.trim(),
                            }))}
                            placeholder="Выберите позицию"
                          />
                        </Form.Item>
                        <Form.Item label="Кол-во" name="qty">
                          <InputNumber style={{ width: 120 }} min={0} />
                        </Form.Item>
                        <Form.Item label="Себестоимость" name="cost">
                          <InputNumber style={{ width: 140 }} min={0} />
                        </Form.Item>
                        <Form.Item label="Цена" name="sell_price">
                          <InputNumber style={{ width: 140 }} min={0} />
                        </Form.Item>
                        <Form.Item label="Маржа %" name="margin_pct">
                          <InputNumber style={{ width: 120 }} min={0} />
                        </Form.Item>
                        <Form.Item label="Валюта" name="currency">
                          <Input style={{ width: 90 }} />
                        </Form.Item>
                        <Form.Item label="Комментарий" name="note">
                          <Input style={{ width: 200 }} />
                        </Form.Item>
                        <Form.Item style={{ marginTop: 30 }}>
                          <Button type="primary" htmlType="submit" disabled={!activeRevisionId}>
                            Добавить
                          </Button>
                        </Form.Item>
                      </Space>
                    </Form>
                  </Card>

                  <Select
                    value={activeRevisionId}
                    onChange={async (val) => {
                      setActiveRevisionId(val)
                      await loadQuoteLines(val)
                      await loadRevisionItems(activeQuote?.client_request_revision_id)
                    }}
                    options={quoteRevisions.map((rev) => ({
                      value: rev.id,
                      label: `Rev ${rev.rev_number}`,
                    }))}
                    placeholder="Выберите ревизию"
                    style={{ width: 200 }}
                  />

                  <Table
                    rowKey="id"
                    dataSource={quoteLines}
                    pagination={false}
                    columns={[
                      {
                        title: "Позиция заявки",
                        dataIndex: "client_request_revision_item_id",
                        width: 220,
                        render: (v) => revisionItemMap.get(v) || "—",
                      },
                      { title: "Кол-во", dataIndex: "qty", width: 90 },
                      {
                        title: "Себестоимость",
                        dataIndex: "cost",
                        width: 150,
                        render: (v, r) => formatPriceWithCurrency(v, r?.currency),
                      },
                      {
                        title: "Цена",
                        dataIndex: "sell_price",
                        width: 150,
                        render: (v, r) => formatPriceWithCurrency(v, r?.currency),
                      },
                      { title: "Маржа %", dataIndex: "margin_pct", width: 100 },
                    ]}
                  />
                </Space>
              ),
            },
          ]}
        />
      </Drawer>
    </PageWrapper>
  )
}

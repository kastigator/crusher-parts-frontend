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
  message,
  Tag,
} from "antd"
import PageWrapper from "@/components/common/PageWrapper"
import axios from "@/api/axiosInstance"

export default function SelectionPage() {
  const [selections, setSelections] = useState([])
  const [rfqs, setRfqs] = useState([])
  const [loading, setLoading] = useState(false)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [activeSelection, setActiveSelection] = useState(null)
  const [lines, setLines] = useState([])
  const [rfqItems, setRfqItems] = useState([])
  const [responseLines, setResponseLines] = useState([])

  const [createForm] = Form.useForm()
  const [lineForm] = Form.useForm()

  const rfqItemMap = useMemo(() => {
    const map = new Map()
    rfqItems.forEach((item) => {
      map.set(
        item.id,
        `${item.original_cat_number || "Без номера"} · ${item.client_description || ""}`.trim(),
      )
    })
    return map
  }, [rfqItems])

  const responseLineMap = useMemo(() => {
    const map = new Map()
    responseLines.forEach((line) => {
      map.set(
        line.id,
        `${line.supplier_name || "Поставщик"} · ${line.supplier_part_number || line.original_cat_number || "Без номера"}`.trim(),
      )
    })
    return map
  }, [responseLines])

  const loadSelections = async () => {
    setLoading(true)
    try {
      const { data } = await axios.get("/selection")
      setSelections(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
      message.error("Не удалось загрузить выбор")
    } finally {
      setLoading(false)
    }
  }

  const loadRfqs = async () => {
    try {
      const { data } = await axios.get("/rfqs")
      setRfqs(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
    }
  }

  const loadLines = async (selectionId) => {
    try {
      const { data } = await axios.get(`/selection/${selectionId}/lines`)
      setLines(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
      message.error("Не удалось загрузить строки выбора")
    }
  }

  const loadRfqItems = async (rfqId) => {
    if (!rfqId) {
      setRfqItems([])
      return
    }
    try {
      const { data } = await axios.get(`/rfqs/${rfqId}/items`)
      setRfqItems(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
    }
  }

  const loadResponseLines = async (rfqId) => {
    if (!rfqId) {
      setResponseLines([])
      return
    }
    try {
      const { data } = await axios.get("/supplier-responses/lines", {
        params: { rfq_id: rfqId },
      })
      setResponseLines(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadSelections()
    loadRfqs()
  }, [])

  const rfqOptions = useMemo(
    () => rfqs.map((r) => ({ value: r.id, label: `RFQ #${r.id}` })),
    [rfqs],
  )

  const handleCreate = async (values) => {
    try {
      await axios.post("/selection", {
        rfq_id: values.rfq_id,
        status: values.status || "draft",
        note: values.note || null,
      })
      createForm.resetFields()
      await loadSelections()
      message.success("Выбор создан")
    } catch (e) {
      console.error(e)
      message.error("Не удалось создать выбор")
    }
  }

  const handleAddLine = async (values) => {
    if (!activeSelection?.id) return
    try {
      await axios.post(`/selection/${activeSelection.id}/lines`, {
        rfq_item_id: values.rfq_item_id,
        rfq_response_line_id: values.rfq_response_line_id || null,
        qty: values.qty ?? null,
        decision_note: values.decision_note || null,
      })
      lineForm.resetFields()
      await loadLines(activeSelection.id)
      message.success("Строка добавлена")
    } catch (e) {
      console.error(e)
      message.error("Не удалось добавить строку")
    }
  }

  const selectionColumns = [
    { title: "Клиент", dataIndex: "client_name" },
    { title: "Статус", dataIndex: "status", width: 120 },
    { title: "Комментарий", dataIndex: "note" },
    { title: "Создано", dataIndex: "created_at", width: 160 },
  ]

  return (
    <PageWrapper
      title="Выбор поставщиков"
      helpText="Фиксируйте решения по каждой позиции и причину выбора."
    >
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Card title="Новый выбор" size="small">
          <Form form={createForm} layout="vertical" onFinish={handleCreate}>
            <Space wrap align="start">
              <Form.Item
                label="RFQ"
                name="rfq_id"
                rules={[{ required: true, message: "Выберите RFQ" }]}
              >
                <Select style={{ width: 160 }} options={rfqOptions} />
              </Form.Item>
              <Form.Item label="Статус" name="status" initialValue="draft">
                <Select
                  style={{ width: 140 }}
                  options={[
                    { value: "draft", label: "Черновик" },
                    { value: "final", label: "Финальный" },
                  ]}
                />
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

        <Card title="Список выборов" size="small">
          <Table
            rowKey="id"
            columns={selectionColumns}
            dataSource={selections}
            loading={loading}
            pagination={{ pageSize: 20 }}
            onRow={(record) => ({
              onClick: async () => {
                setActiveSelection(record)
                setDrawerOpen(true)
                await loadLines(record.id)
                await loadRfqItems(record.rfq_id)
                await loadResponseLines(record.rfq_id)
              },
            })}
          />
        </Card>
      </Space>

      <Drawer
        width={720}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={
          <Space>
            <span>Выбор</span>
            {activeSelection?.status ? <Tag>{activeSelection.status}</Tag> : null}
          </Space>
        }
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <Card size="small" title="Добавить строку выбора">
            <Form form={lineForm} layout="vertical" onFinish={handleAddLine}>
              <Space wrap align="start">
                <Form.Item
                  label="Строка RFQ"
                  name="rfq_item_id"
                  rules={[{ required: true, message: "Укажите RFQ item" }]}
                >
                  <Select
                    style={{ width: 260 }}
                    options={rfqItems.map((item) => ({
                      value: item.id,
                      label: `${item.original_cat_number || "Без номера"} · ${item.client_description || ""}`.trim(),
                    }))}
                    placeholder="Выберите строку RFQ"
                  />
                </Form.Item>
                <Form.Item label="Строка ответа" name="rfq_response_line_id">
                  <Select
                    allowClear
                    style={{ width: 260 }}
                    options={responseLines.map((line) => ({
                      value: line.id,
                      label: `${line.supplier_name || "Поставщик"} · ${line.supplier_part_number || line.original_cat_number || "Без номера"}`.trim(),
                    }))}
                    placeholder="Выберите строку ответа"
                  />
                </Form.Item>
                <Form.Item label="Кол-во" name="qty">
                  <InputNumber style={{ width: 120 }} min={0} />
                </Form.Item>
                <Form.Item label="Комментарий" name="decision_note">
                  <Input style={{ width: 260 }} />
                </Form.Item>
                <Form.Item style={{ marginTop: 30 }}>
                  <Button type="primary" htmlType="submit">
                    Добавить
                  </Button>
                </Form.Item>
              </Space>
            </Form>
          </Card>

          <Table
            rowKey="id"
            dataSource={lines}
            pagination={false}
            columns={[
              {
                title: "Строка RFQ",
                dataIndex: "rfq_item_id",
                width: 180,
                render: (v) => rfqItemMap.get(v) || "—",
              },
              {
                title: "Строка ответа",
                dataIndex: "rfq_response_line_id",
                width: 220,
                render: (v) => (v ? responseLineMap.get(v) || "—" : "—"),
              },
              { title: "Кол-во", dataIndex: "qty", width: 100 },
              { title: "Комментарий", dataIndex: "decision_note" },
            ]}
          />
        </Space>
      </Drawer>
    </PageWrapper>
  )
}

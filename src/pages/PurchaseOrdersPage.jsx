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
import { formatPriceWithCurrency } from "@/utils/priceFormat"
import { formatIncotermsWithPlace } from "@/components/rfqWorkspace/rfqWorkspaceUtils"
import SupplierQualityEventModal from "@/components/suppliers/SupplierQualityEventModal"

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState([])
  const [selections, setSelections] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(false)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [qualityModalOpen, setQualityModalOpen] = useState(false)
  const [activeOrder, setActiveOrder] = useState(null)
  const [lines, setLines] = useState([])
  const [responseLines, setResponseLines] = useState([])

  const [createForm] = Form.useForm()
  const [lineForm] = Form.useForm()

  const responseLineMap = useMemo(() => {
    const map = new Map()
    responseLines.forEach((line) => {
      map.set(
        line.id,
        `${line.supplier_part_number || line.original_cat_number || "Без номера"} · ${line.offer_type || ""}`.trim(),
      )
    })
    return map
  }, [responseLines])

  const loadOrders = async () => {
    setLoading(true)
    try {
      const { data } = await axios.get("/purchase-orders")
      setOrders(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
      message.error("Не удалось загрузить заказы")
    } finally {
      setLoading(false)
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

  const loadSuppliers = async () => {
    try {
      const { data } = await axios.get("/suppliers")
      setSuppliers(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
    }
  }

  const loadLines = async (orderId) => {
    try {
      const { data } = await axios.get(`/purchase-orders/${orderId}/lines`)
      setLines(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
      message.error("Не удалось загрузить строки")
    }
  }

  const loadResponseLines = async (supplierId) => {
    if (!supplierId) {
      setResponseLines([])
      return
    }
    try {
      const { data } = await axios.get("/supplier-responses/lines", {
        params: { supplier_id: supplierId },
      })
      setResponseLines(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadOrders()
    loadSelections()
    loadSuppliers()
  }, [])

  const selectionOptions = useMemo(
    () =>
      selections.map((s) => ({
        value: s.id,
        label: `${s.client_name || "Клиент"} · ${s.created_at || ""}`.trim(),
      })),
    [selections],
  )

  const supplierOptions = useMemo(
    () =>
      suppliers.map((s) => ({
        value: s.id,
        label: s.name || s.company || `Поставщик #${s.id}`,
      })),
    [suppliers],
  )

  const handleCreate = async (values) => {
    try {
      await axios.post("/purchase-orders", {
        supplier_id: values.supplier_id,
        selection_id: values.selection_id,
        status: values.status || "draft",
        supplier_reference: values.supplier_reference || null,
        currency: values.currency || null,
        incoterms: values.incoterms || null,
        incoterms_place: values.incoterms_place || null,
      })
      createForm.resetFields()
      await loadOrders()
      message.success("Заказ создан")
    } catch (e) {
      console.error(e)
      message.error("Не удалось создать заказ")
    }
  }

  const handleAddLine = async (values) => {
    if (!activeOrder?.id) return
    try {
      await axios.post(`/purchase-orders/${activeOrder.id}/lines`, {
        rfq_response_line_id: values.rfq_response_line_id || null,
        qty: values.qty ?? null,
        price: values.price ?? null,
        currency: values.currency || null,
        lead_time_days: values.lead_time_days ?? null,
        note: values.note || null,
      })
      lineForm.resetFields()
      await loadLines(activeOrder.id)
      message.success("Строка добавлена")
    } catch (e) {
      console.error(e)
      message.error("Не удалось добавить строку")
    }
  }

  return (
    <PageWrapper
      title="Заказы поставщикам"
      helpText="Размещайте закупочные заказы по выбранным позициям."
    >
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Card title="Новый заказ" size="small">
          <Form form={createForm} layout="vertical" onFinish={handleCreate}>
            <Space wrap align="start">
              <Form.Item
                label="Поставщик"
                name="supplier_id"
                rules={[{ required: true, message: "Выберите поставщика" }]}
              >
                <Select style={{ width: 240 }} options={supplierOptions} />
              </Form.Item>
              <Form.Item
                label="Выбор"
                name="selection_id"
                rules={[{ required: true, message: "Выберите выбор" }]}
              >
                <Select style={{ width: 160 }} options={selectionOptions} />
              </Form.Item>
              <Form.Item label="Статус" name="status" initialValue="draft">
                <Select
                  style={{ width: 140 }}
                  options={[
                    { value: "draft", label: "Черновик" },
                    { value: "sent", label: "Отправлен" },
                    { value: "confirmed", label: "Подтвержден" },
                  ]}
                />
              </Form.Item>
              <Form.Item label="Референс" name="supplier_reference">
                <Input style={{ width: 180 }} />
              </Form.Item>
              <Form.Item label="Валюта" name="currency">
                <Input style={{ width: 90 }} />
              </Form.Item>
              <Form.Item label="Инкотермс" name="incoterms">
                <Input style={{ width: 120 }} />
              </Form.Item>
              <Form.Item label="Пункт Incoterms" name="incoterms_place">
                <Input style={{ width: 220 }} placeholder="Например: Shanghai Port" />
              </Form.Item>
              <Form.Item style={{ marginTop: 30 }}>
                <Button type="primary" htmlType="submit">
                  Создать
                </Button>
              </Form.Item>
            </Space>
          </Form>
        </Card>

        <Card title="Список заказов" size="small">
          <Table
            rowKey="id"
            dataSource={orders}
            loading={loading}
            pagination={{ pageSize: 20 }}
            onRow={(record) => ({
              onClick: async () => {
                setActiveOrder(record)
                setDrawerOpen(true)
                await loadLines(record.id)
                await loadResponseLines(record.supplier_id)
              },
            })}
            columns={[
              { title: "Поставщик", dataIndex: "supplier_name", width: 180 },
              { title: "Статус", dataIndex: "status", width: 120 },
              { title: "Референс", dataIndex: "supplier_reference" },
              {
                title: "Инкотермс",
                width: 180,
                render: (_, row) => formatIncotermsWithPlace(row?.incoterms, row?.incoterms_place),
              },
              {
                title: "Качество",
                width: 160,
                render: (_, row) => (
                  <Button
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation()
                      setActiveOrder(row)
                      setQualityModalOpen(true)
                    }}
                  >
                    Добавить событие
                  </Button>
                ),
              },
            ]}
          />
        </Card>
      </Space>

      <Drawer
        width={720}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={
          <Space>
            <span>Заказ поставщику</span>
            {activeOrder?.status ? <Tag>{activeOrder.status}</Tag> : null}
          </Space>
        }
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <Card size="small" title="Добавить строку заказа">
            <Form form={lineForm} layout="vertical" onFinish={handleAddLine}>
              <Space wrap align="start">
                <Form.Item label="Строка ответа" name="rfq_response_line_id">
                  <Select
                    style={{ width: 280 }}
                    options={responseLines.map((line) => ({
                      value: line.id,
                      label: `${line.supplier_part_number || line.original_cat_number || "Без номера"} · ${line.offer_type || ""}`.trim(),
                    }))}
                    placeholder="Выберите строку ответа"
                  />
                </Form.Item>
                <Form.Item label="Кол-во" name="qty">
                  <InputNumber style={{ width: 120 }} min={0} />
                </Form.Item>
                <Form.Item label="Цена" name="price">
                  <InputNumber style={{ width: 120 }} min={0} />
                </Form.Item>
                <Form.Item label="Валюта" name="currency">
                  <Input style={{ width: 90 }} />
                </Form.Item>
                <Form.Item label="Срок, дней" name="lead_time_days">
                  <InputNumber style={{ width: 120 }} min={0} />
                </Form.Item>
                <Form.Item label="Комментарий" name="note">
                  <Input style={{ width: 200 }} />
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
                title: "Строка ответа",
                dataIndex: "rfq_response_line_id",
                width: 220,
                render: (v) => responseLineMap.get(v) || "—",
              },
              { title: "Кол-во", dataIndex: "qty", width: 90 },
              {
                title: "Цена",
                dataIndex: "price",
                width: 140,
                render: (v, r) => formatPriceWithCurrency(v, r?.currency),
              },
              { title: "Валюта", dataIndex: "currency", width: 90 },
              { title: "Срок, дней", dataIndex: "lead_time_days", width: 110 },
              {
                title: "Качество",
                width: 150,
                render: () => (
                  <Button
                    size="small"
                    onClick={() => {
                      setQualityModalOpen(true)
                    }}
                  >
                    Событие качества
                  </Button>
                ),
              },
            ]}
          />
        </Space>
      </Drawer>

      <SupplierQualityEventModal
        open={qualityModalOpen}
        supplierId={activeOrder?.supplier_id || null}
        purchaseOrder={activeOrder}
        onClose={() => setQualityModalOpen(false)}
      />
    </PageWrapper>
  )
}

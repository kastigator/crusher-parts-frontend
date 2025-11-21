// src/components/orders/ClientOrdersMain.jsx
import React, { useEffect, useMemo, useState } from "react"
import {
  Card,
  Space,
  message,
  Modal,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Button,
  Divider,
} from "antd"
import dayjs from "dayjs"
import axios from "@/api/axiosInstance"
import TableToolbar from "@/components/common/TableToolbar"
import ClientOrdersTable from "./ClientOrdersTable"

const { TextArea } = Input

const trim = (v) => (typeof v === "string" ? v.trim() : v ?? "")

export default function ClientOrdersMain() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [createOpen, setCreateOpen] = useState(false)

  const [form] = Form.useForm()

  // ============================
  // Загрузка заказов
  // ============================

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const res = await axios.get("/client-orders")
      const rows = Array.isArray(res.data) ? res.data : []
      setOrders(rows)
    } catch (err) {
      console.error("Ошибка загрузки заказов клиентов:", err)
      message.error("Не удалось загрузить заказы клиентов")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  // ============================
  // CRUD
  // ============================

  const addRow = (order) =>
    setOrders((prev) => [order, ...prev])

  const removeRow = (id) =>
    setOrders((prev) => prev.filter((o) => o.id !== id))

  const handleOpenCreate = () => {
    form.resetFields()
    // по умолчанию одна строка товара
    form.setFieldsValue({
      items: [{ original_part_id: null, quantity: 1 }],
    })
    setCreateOpen(true)
  }

  const handleCreate = async () => {
    try {
      const values = await form.validateFields()

      const payload = {
        client_id: values.client_id,
        client_comment: trim(values.client_comment) || null,
        internal_comment: trim(values.internal_comment) || null,
        requested_delivery_date: values.requested_delivery_date
          ? values.requested_delivery_date.format("YYYY-MM-DD")
          : null,
        items: (values.items || [])
          .map((it) => ({
            original_part_id: it.original_part_id || null,
            quantity: it.quantity ?? null,
          }))
          .filter((it) => it.original_part_id && it.quantity),
      }

      if (!payload.client_id) {
        message.warning("Укажите ID клиента")
        return
      }

      if (!payload.items.length) {
        message.warning("Добавьте хотя бы одну позицию в заказе")
        return
      }

      const { data: created } = await axios.post("/client-orders", payload)
      addRow(created)
      setCreateOpen(false)
      message.success("Заказ создан")
    } catch (err) {
      if (err?.errorFields) {
        // валидация формы — уже подсветилась
        return
      }
      console.error("Ошибка создания заказа клиента:", err)
      const msg =
        err?.response?.data?.message || "Не удалось создать заказ клиента"
      message.error(msg)
    }
  }

  const handleDelete = async (order) => {
    try {
      await axios.delete(`/client-orders/${order.id}`, {
        // на будущее: если в роуте будет оптимистичная блокировка
        params: { version: order.version },
      })
      removeRow(order.id)
      message.success("Заказ удалён")
    } catch (err) {
      console.error("Ошибка удаления заказа клиента:", err)
      const msg =
        err?.response?.data?.message || "Не удалось удалить заказ клиента"
      message.error(msg)
    }
  }

  // ============================
  // Фильтрация
  // ============================

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return orders

    return orders.filter((o) => {
      return (
        String(o.order_number || "").toLowerCase().includes(q) ||
        String(o.client_name || "").toLowerCase().includes(q) ||
        String(o.status || "").toLowerCase().includes(q) ||
        String(o.client_comment || "").toLowerCase().includes(q) ||
        String(o.internal_comment || "").toLowerCase().includes(q)
      )
    })
  }, [orders, search])

  // ============================
  // Render
  // ============================

  return (
    <Space direction="vertical" style={{ width: "100%" }} size={16}>
      <Card size="small" title="Заказы клиентов">
        <TableToolbar
          search={search}
          onSearch={setSearch}
          title={null}
          onAdd={handleOpenCreate}
        />

        <div className="parts-table-wrap">
          <ClientOrdersTable
            data={filtered}
            loading={loading}
            onDelete={handleDelete}
          />
        </div>
      </Card>

      <Modal
        title="Новый заказ клиента"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={handleCreate}
        okText="Создать заказ"
        cancelText="Отмена"
        width={720}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            items: [{ original_part_id: null, quantity: 1 }],
          }}
        >
          <Form.Item
            label="ID клиента"
            name="client_id"
            rules={[{ required: true, message: "Укажите ID клиента" }]}
          >
            <InputNumber style={{ width: "100%" }} min={1} />
          </Form.Item>

          <Form.Item label="Желаемая дата поставки" name="requested_delivery_date">
            <DatePicker
              style={{ width: "100%" }}
              format="YYYY-MM-DD"
              disabledDate={(d) => d && d < dayjs().startOf("day")}
            />
          </Form.Item>

          <Form.Item label="Комментарий клиента" name="client_comment">
            <TextArea rows={2} />
          </Form.Item>

          <Form.Item label="Внутренний комментарий" name="internal_comment">
            <TextArea rows={2} />
          </Form.Item>

          <Divider orientation="left">Позиции заказа</Divider>

          <Form.List name="items">
            {(fields, { add, remove }) => (
              <>
                {fields.map((field, index) => (
                  <Space
                    key={field.key}
                    align="baseline"
                    style={{ display: "flex", marginBottom: 8 }}
                  >
                    <Form.Item
                      {...field}
                      name={[field.name, "original_part_id"]}
                      fieldKey={[field.fieldKey, "original_part_id"]}
                      label={index === 0 ? "ID оригинальной детали" : ""}
                      rules={[
                        {
                          required: true,
                          message: "Укажите ID оригинальной детали",
                        },
                      ]}
                    >
                      <InputNumber min={1} style={{ width: 220 }} />
                    </Form.Item>

                    <Form.Item
                      {...field}
                      name={[field.name, "quantity"]}
                      fieldKey={[field.fieldKey, "quantity"]}
                      label={index === 0 ? "Кол-во" : ""}
                      rules={[
                        { required: true, message: "Укажите количество" },
                      ]}
                    >
                      <InputNumber
                        min={1}
                        style={{ width: 120 }}
                      />
                    </Form.Item>

                    {fields.length > 1 && (
                      <Button
                        type="link"
                        danger
                        onClick={() => remove(field.name)}
                      >
                        Удалить
                      </Button>
                    )}
                  </Space>
                ))}

                <Form.Item>
                  <Button type="dashed" onClick={() => add()} block>
                    Добавить позицию
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>
    </Space>
  )
}

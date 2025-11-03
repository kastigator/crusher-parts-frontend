// src/components/supplierParts/PriceHistoryTab.jsx
import React, { useEffect, useState, useCallback, useRef, useMemo } from "react"
import { Table, Form, InputNumber, DatePicker, Button, Input, Select, Space, message, Popconfirm } from "antd"
import dayjs from "dayjs"
import axios from "@/api/axiosInstance"
import cc from "currency-codes"

const CURRENCY_OPTIONS = cc.codes().map(code => {
  const info = cc.code(code)
  return { value: code, label: `${code} — ${info?.currency || code}` }
})

export default function PriceHistoryTab({ supplierPartId, onChanged = () => {} }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState(false)
  const [form] = Form.useForm()
  const abortRef = useRef(null)

  const popupContainer = (trigger) =>
    trigger?.closest(".dock-shell")
      || trigger?.closest(".parts-table-wrap")
      || document.body

  const load = useCallback(async () => {
    if (!supplierPartId) { setRows([]); return }
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    try {
      const { data } = await axios.get("/supplier-part-prices", {
        params: { supplier_part_id: supplierPartId },
        signal: controller.signal,
      })
      setRows(Array.isArray(data) ? data : [])
    } catch (e) {
      if (e?.name !== "AbortError" && e?.code !== "ERR_CANCELED") {
        console.error(e)
        message.error("Не удалось загрузить историю цен")
      }
    } finally {
      setLoading(false)
    }
  }, [supplierPartId])

  useEffect(() => {
    const t = setTimeout(load, 150)
    return () => { clearTimeout(t); abortRef.current?.abort() }
  }, [load, supplierPartId])

  const addPrice = async () => {
    try {
      const v = await form.validateFields()
      setAdding(true)
      await axios.post("/supplier-part-prices", {
        supplier_part_id: supplierPartId,
        price: v.price,
        currency: v.currency || null,
        date: v.date ? v.date.toDate() : new Date(),
        comment: v.comment || null,
      })
      message.success("Цена добавлена")
      form.resetFields()
      await load()
      onChanged() // чтобы обновить «последнюю цену» в верхней таблице
    } catch (e) {
      if (!e?.errorFields) {
        console.error(e)
        message.error(e?.response?.data?.message || "Не удалось добавить цену")
      }
    } finally {
      setAdding(false)
    }
  }

  const quickToday = () => {
    const price = form.getFieldValue("price")
    if (!price && price !== 0) {
      message.info("Сначала укажите цену")
      return
    }
    form.setFieldsValue({ date: dayjs() })
    addPrice()
  }

  const handleDelete = async (row) => {
    try {
      await axios.delete(`/supplier-part-prices/${row.id}`)
      message.success("Запись удалена")
      await load()
      onChanged()
    } catch (e) {
      console.error(e)
      message.error(e?.response?.data?.message || "Не удалось удалить запись")
    }
  }

  const columns = useMemo(() => ([
    { title: "Дата", dataIndex: "date", width: 170, render: v => v ? dayjs(v).format("YYYY-MM-DD HH:mm") : "—" },
    { title: "Цена", dataIndex: "price", width: 120 },
    { title: "Валюта", dataIndex: "currency", width: 110, render: v => v || "—" },
    { title: "Комментарий", dataIndex: "comment" },
    {
      title: "",
      key: "actions",
      width: 90,
      align: "right",
      render: (_, row) => (
        <Popconfirm
          title="Удалить запись цены?"
          okText="Удалить"
          cancelText="Отмена"
          onConfirm={() => handleDelete(row)}
          getPopupContainer={popupContainer}
        >
          <Button danger size="small">Удалить</Button>
        </Popconfirm>
      ),
    }
  ]), [])

  const selectFilter = (input, option) =>
    (option?.label ?? "").toLowerCase().includes(input.toLowerCase())

  return (
    <div className="parts-table-wrap subtable-shell dock-shell">
      {/* форма добавления */}
      <Form
        form={form}
        layout="inline"
        className="table-section"
        style={{ flexWrap: "wrap", rowGap: 8 }}
      >
        <Form.Item
          name="price"
          label="Цена"
          rules={[{ required: true, message: "Укажите цену" }]}
        >
          <InputNumber min={0} step={0.01} style={{ width: 140 }} />
        </Form.Item>

        <Form.Item name="currency" label="Валюта (ISO3)">
          <Select
            allowClear
            showSearch
            options={CURRENCY_OPTIONS}
            optionFilterProp="label"
            filterOption={selectFilter}
            placeholder="Выберите валюту"
            style={{ width: 220 }}
            dropdownMatchSelectWidth={false}
            getPopupContainer={popupContainer}
          />
        </Form.Item>

        <Form.Item name="date" label="Дата">
          <DatePicker
            showTime
            allowClear
            style={{ width: 210 }}
            getPopupContainer={popupContainer}
          />
        </Form.Item>

        <Form.Item name="comment" label="Комментарий" style={{ flex: 1 }}>
          <Input placeholder="По прайсу №…" style={{ minWidth: 220 }} />
        </Form.Item>

        <Form.Item>
          <Space>
            <Button type="primary" onClick={addPrice} loading={adding}>
              Добавить
            </Button>
            <Button onClick={quickToday} loading={adding}>
              Обновить (сегодня)
            </Button>
          </Space>
        </Form.Item>
      </Form>

      {/* таблица */}
      <Table
        rowKey="id"
        className="op-table parts-table"
        dataSource={rows}
        columns={columns}
        loading={loading}
        size="small"
        pagination={{ pageSize: 10 }}
      />
    </div>
  )
}

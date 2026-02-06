import React, { useEffect, useMemo, useState } from "react"
import {
  Button,
  Checkbox,
  DatePicker,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Upload,
  message,
} from "antd"
import { CloseOutlined, DeleteOutlined, DownloadOutlined, EditOutlined, SaveOutlined, UploadOutlined } from "@ant-design/icons"
import dayjs from "dayjs"
import axios from "@/api/axiosInstance"
import { formatPrice } from "@/utils/priceFormat"

const STATUS_COLORS = {
  draft: "default",
  active: "green",
  superseded: "orange",
  expired: "red",
  archived: "default",
}

const CURRENCY_OPTIONS = [
  { value: "USD", label: "USD" },
  { value: "EUR", label: "EUR" },
  { value: "RUB", label: "RUB" },
  { value: "CNY", label: "CNY" },
]

export default function SupplierPriceListsDrawer({ open, supplier, onClose }) {
  const [loading, setLoading] = useState(false)
  const [lists, setLists] = useState([])
  const [activeListId, setActiveListId] = useState(null)
  const [lines, setLines] = useState([])
  const [linesLoading, setLinesLoading] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [addLineLoading, setAddLineLoading] = useState(false)
  const [fillLoading, setFillLoading] = useState(false)
  const [fillOnlyWithoutActualPrice, setFillOnlyWithoutActualPrice] = useState(true)
  const [editingLineId, setEditingLineId] = useState(null)
  const [editingLineData, setEditingLineData] = useState(null)
  const [lineSaving, setLineSaving] = useState(false)
  const [lineDeletingId, setLineDeletingId] = useState(null)
  const [listDeleting, setListDeleting] = useState(false)

  const [createForm] = Form.useForm()
  const [lineForm] = Form.useForm()

  const supplierId = supplier?.id || null
  const activeList = useMemo(() => lists.find((x) => Number(x.id) === Number(activeListId)) || null, [lists, activeListId])

  const loadLists = async () => {
    if (!supplierId) return
    setLoading(true)
    try {
      const { data } = await axios.get("/supplier-price-lists", { params: { supplier_id: supplierId } })
      const arr = Array.isArray(data) ? data : []
      setLists(arr)
      if (!activeListId && arr.length) setActiveListId(arr[0].id)
      if (activeListId && !arr.some((x) => Number(x.id) === Number(activeListId))) {
        setActiveListId(arr[0]?.id || null)
      }
    } catch (e) {
      console.error(e)
      message.error("Не удалось загрузить прайс-листы")
    } finally {
      setLoading(false)
    }
  }

  const loadLines = async (listId) => {
    if (!listId) {
      setLines([])
      return
    }
    setLinesLoading(true)
    try {
      const { data } = await axios.get(`/supplier-price-lists/${listId}/lines`)
      setLines(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
      message.error("Не удалось загрузить строки прайс-листа")
    } finally {
      setLinesLoading(false)
    }
  }

  useEffect(() => {
    if (!open) return
    loadLists()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, supplierId])

  useEffect(() => {
    if (!open) return
    loadLines(activeListId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activeListId])

  const handleCreate = async (values) => {
    if (!supplierId) return
    setCreateLoading(true)
    try {
      const { data } = await axios.post("/supplier-price-lists", {
        supplier_id: supplierId,
        list_code: values.list_code || null,
        list_name: values.list_name || null,
        currency_default: values.currency_default || null,
        valid_from: values.valid_from ? values.valid_from.format("YYYY-MM-DD") : null,
        valid_to: values.valid_to ? values.valid_to.format("YYYY-MM-DD") : null,
        note: values.note || null,
      })
      message.success("Прайс-лист создан")
      setCreateOpen(false)
      createForm.resetFields()
      if (data?.id) {
        setActiveListId(data.id)
        try {
          await axios.post(`/supplier-price-lists/${data.id}/fill-from-catalog`, {
            only_without_actual_price: false,
          })
          message.success("Каталог поставщика добавлен в прайс")
        } catch (seedErr) {
          console.warn(seedErr)
        }
      }
      await loadLists()
    } catch (e) {
      console.error(e)
      message.error(e?.response?.data?.message || "Не удалось создать прайс-лист")
    } finally {
      setCreateLoading(false)
    }
  }

  const handleActivate = async () => {
    if (!activeListId) return
    try {
      await axios.post(`/supplier-price-lists/${activeListId}/activate`)
      message.success("Прайс-лист активирован")
      await Promise.all([loadLists(), loadLines(activeListId)])
    } catch (e) {
      console.error(e)
      message.error(e?.response?.data?.message || "Не удалось активировать прайс-лист")
    }
  }

  const handleImport = async ({ file }) => {
    if (!activeListId) {
      message.warning("Сначала выберите прайс-лист")
      return
    }
    const formData = new FormData()
    formData.append("file", file)
    formData.append("replace", "true")
    setImporting(true)
    try {
      const { data } = await axios.post(`/supplier-price-lists/${activeListId}/import`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      message.success(`Импорт завершен: ${data?.inserted || 0} строк`)
      await Promise.all([loadLists(), loadLines(activeListId)])
    } catch (e) {
      console.error(e)
      message.error(e?.response?.data?.message || "Ошибка импорта прайс-листа")
    } finally {
      setImporting(false)
    }
  }

  const downloadTemplate = async () => {
    try {
      const { data } = await axios.get("/supplier-price-lists/template", { responseType: "blob" })
      const blob = new Blob([data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "template_price_list_ru.xlsx"
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (e) {
      console.error(e)
      message.error("Не удалось скачать шаблон")
    }
  }

  const handleAddLine = async () => {
    if (!activeListId) return
    try {
      const v = await lineForm.validateFields()
      setAddLineLoading(true)
      await axios.post(`/supplier-price-lists/${activeListId}/lines`, {
        supplier_part_number_raw: v.supplier_part_number_raw,
        description_raw: v.description_raw || null,
        price: v.price,
        currency: v.currency || null,
        offer_type: v.offer_type || "UNKNOWN",
        lead_time_days: v.lead_time_days ?? null,
        min_order_qty: v.min_order_qty ?? null,
        packaging: v.packaging || null,
        validity_days: v.validity_days ?? null,
        valid_from: v.valid_from ? v.valid_from.format("YYYY-MM-DD") : null,
        valid_to: v.valid_to ? v.valid_to.format("YYYY-MM-DD") : null,
        material_code_raw: v.material_code_raw || null,
        comment: v.comment || null,
      })
      message.success("Строка добавлена")
      lineForm.resetFields()
      await Promise.all([loadLists(), loadLines(activeListId)])
    } catch (e) {
      if (e?.errorFields) return
      console.error(e)
      message.error(e?.response?.data?.message || "Не удалось добавить строку")
    } finally {
      setAddLineLoading(false)
    }
  }

  const handleFillFromCatalog = async () => {
    if (!activeListId) {
      message.warning("Сначала выберите прайс-лист")
      return
    }
    setFillLoading(true)
    try {
      const { data } = await axios.post(`/supplier-price-lists/${activeListId}/fill-from-catalog`, {
        only_without_actual_price: !!fillOnlyWithoutActualPrice,
      })
      message.success(`Добавлено из каталога: ${data?.inserted || 0}`)
      await Promise.all([loadLists(), loadLines(activeListId)])
    } catch (e) {
      console.error(e)
      message.error(e?.response?.data?.message || "Не удалось заполнить из каталога")
    } finally {
      setFillLoading(false)
    }
  }

  const startEditLine = (row) => {
    setEditingLineId(row.id)
    setEditingLineData({
      price: row.price,
      currency: row.currency || null,
      lead_time_days: row.lead_time_days,
      min_order_qty: row.min_order_qty,
      validity_days: row.validity_days,
      comment: row.comment || "",
    })
  }

  const cancelEditLine = () => {
    setEditingLineId(null)
    setEditingLineData(null)
  }

  const saveEditLine = async (row) => {
    if (!editingLineData) return
    setLineSaving(true)
    try {
      await axios.put(`/supplier-price-lists/lines/${row.id}`, {
        price: editingLineData.price,
        currency: editingLineData.currency,
        lead_time_days: editingLineData.lead_time_days,
        min_order_qty: editingLineData.min_order_qty,
        validity_days: editingLineData.validity_days,
        comment: editingLineData.comment,
      })
      message.success("Строка обновлена")
      cancelEditLine()
      await Promise.all([loadLists(), loadLines(activeListId)])
    } catch (e) {
      console.error(e)
      message.error(e?.response?.data?.message || "Не удалось сохранить строку")
    } finally {
      setLineSaving(false)
    }
  }

  const deleteLine = async (row) => {
    setLineDeletingId(row.id)
    try {
      await axios.delete(`/supplier-price-lists/lines/${row.id}`)
      if (editingLineId === row.id) cancelEditLine()
      message.success("Строка удалена")
      await Promise.all([loadLists(), loadLines(activeListId)])
    } catch (e) {
      console.error(e)
      message.error(e?.response?.data?.message || "Не удалось удалить строку")
    } finally {
      setLineDeletingId(null)
    }
  }

  const deleteList = async () => {
    if (!activeListId) return
    setListDeleting(true)
    try {
      await axios.delete(`/supplier-price-lists/${activeListId}`)
      message.success("Прайс-лист удален")
      setEditingLineId(null)
      setEditingLineData(null)
      setActiveListId(null)
      setLines([])
      await loadLists()
    } catch (e) {
      console.error(e)
      message.error(e?.response?.data?.message || "Не удалось удалить прайс-лист")
    } finally {
      setListDeleting(false)
    }
  }

  return (
    <>
      <Drawer
        title={`Прайс-листы поставщика${supplier?.company || supplier?.name ? `: ${supplier.company || supplier.name}` : ""}`}
        open={open}
        onClose={onClose}
        width={1240}
      >
        <Space direction="vertical" style={{ width: "100%" }} size={16}>
          <Space wrap>
            <Button type="primary" onClick={() => setCreateOpen(true)}>
              Новый прайс-лист
            </Button>
            <Button icon={<DownloadOutlined />} onClick={downloadTemplate}>
              Скачать шаблон
            </Button>
            <Upload
              showUploadList={false}
              beforeUpload={() => false}
              customRequest={handleImport}
              disabled={!activeListId || importing}
            >
              <Button icon={<UploadOutlined />} loading={importing} disabled={!activeListId}>
                Импорт Excel
              </Button>
            </Upload>
            <Button onClick={handleActivate} disabled={!activeListId}>
              Активировать выбранный
            </Button>
            <Button danger onClick={deleteList} disabled={!activeListId} loading={listDeleting}>
              Удалить выбранный
            </Button>
            <Button loading={fillLoading} disabled={!activeListId} onClick={handleFillFromCatalog}>
              Заполнить из каталога
            </Button>
            <Checkbox
              checked={fillOnlyWithoutActualPrice}
              onChange={(e) => setFillOnlyWithoutActualPrice(e.target.checked)}
              disabled={fillLoading}
            >
              Только детали без актуальной цены
            </Checkbox>
          </Space>

          <Table
            rowKey="id"
            loading={loading}
            dataSource={lists}
            pagination={false}
            onRow={(record) => ({ onClick: () => setActiveListId(record.id) })}
            rowClassName={(row) => (Number(row.id) === Number(activeListId) ? "ant-table-row-selected" : "")}
            columns={[
              { title: "Код", dataIndex: "list_code", width: 180, render: (v) => v || "—" },
              { title: "Название", dataIndex: "list_name", render: (v) => v || "—" },
              {
                title: "Период",
                width: 220,
                render: (_, r) =>
                  [r.valid_from ? dayjs(r.valid_from).format("DD.MM.YYYY") : "—", r.valid_to ? dayjs(r.valid_to).format("DD.MM.YYYY") : "—"].join(" — "),
              },
              {
                title: "Статус",
                dataIndex: "status",
                width: 140,
                render: (v) => <Tag color={STATUS_COLORS[v] || "default"}>{v || "—"}</Tag>,
              },
              { title: "Строк", dataIndex: "lines_count", width: 90 },
              { title: "Сопоставлено", dataIndex: "matched_count", width: 120 },
              { title: "Проблемы", dataIndex: "issues_count", width: 100 },
            ]}
          />

          <CardLineForm
            activeList={activeList}
            lineForm={lineForm}
            onAdd={handleAddLine}
            adding={addLineLoading}
          />

          <Table
            rowKey="id"
            loading={linesLoading}
            dataSource={lines}
            pagination={{ pageSize: 20 }}
            columns={[
              { title: "Номер", dataIndex: "supplier_part_number_raw", width: 180 },
              { title: "Описание", dataIndex: "description_raw", width: 240, render: (v) => v || "—" },
              {
                title: "Цена",
                width: 120,
                render: (_, row) =>
                  editingLineId === row.id ? (
                    <InputNumber
                      min={0}
                      step={0.01}
                      style={{ width: 110 }}
                      value={editingLineData?.price}
                      onChange={(v) => setEditingLineData((prev) => ({ ...(prev || {}), price: v }))}
                    />
                  ) : (row.price == null ? "—" : formatPrice(row.price)),
              },
              {
                title: "Валюта",
                width: 110,
                render: (_, row) =>
                  editingLineId === row.id ? (
                    <Select
                      allowClear
                      style={{ width: 100 }}
                      value={editingLineData?.currency || undefined}
                      onChange={(v) => setEditingLineData((prev) => ({ ...(prev || {}), currency: v || null }))}
                      options={CURRENCY_OPTIONS}
                    />
                  ) : (row.currency || "—"),
              },
              {
                title: "Срок",
                width: 100,
                render: (_, row) =>
                  editingLineId === row.id ? (
                    <InputNumber
                      min={0}
                      style={{ width: 90 }}
                      value={editingLineData?.lead_time_days}
                      onChange={(v) => setEditingLineData((prev) => ({ ...(prev || {}), lead_time_days: v }))}
                    />
                  ) : (row.lead_time_days ?? "—"),
              },
              {
                title: "MOQ",
                width: 100,
                render: (_, row) =>
                  editingLineId === row.id ? (
                    <InputNumber
                      min={0}
                      style={{ width: 90 }}
                      value={editingLineData?.min_order_qty}
                      onChange={(v) => setEditingLineData((prev) => ({ ...(prev || {}), min_order_qty: v }))}
                    />
                  ) : (row.min_order_qty ?? "—"),
              },
              {
                title: "Валид., дн",
                width: 120,
                render: (_, row) =>
                  editingLineId === row.id ? (
                    <InputNumber
                      min={0}
                      style={{ width: 110 }}
                      value={editingLineData?.validity_days}
                      onChange={(v) => setEditingLineData((prev) => ({ ...(prev || {}), validity_days: v }))}
                    />
                  ) : (row.validity_days ?? "—"),
              },
              {
                title: "Статус",
                dataIndex: "line_status",
                width: 160,
                render: (v) => {
                  const color =
                    v === "matched" ? "green" :
                    v === "ignored" ? "default" :
                    v === "pending" ? "blue" :
                    v === "ambiguous" ? "orange" : "red"
                  return <Tag color={color}>{v}</Tag>
                },
              },
              {
                title: "Комментарий",
                width: 260,
                render: (_, row) =>
                  editingLineId === row.id ? (
                    <Input
                      value={editingLineData?.comment}
                      onChange={(e) => setEditingLineData((prev) => ({ ...(prev || {}), comment: e.target.value }))}
                    />
                  ) : (row.comment || row.match_note || "—"),
              },
              {
                title: "Действия",
                width: 160,
                render: (_, row) => (
                  <Space size={4}>
                    {editingLineId === row.id ? (
                      <>
                        <Button
                          type="text"
                          icon={<SaveOutlined />}
                          loading={lineSaving}
                          onClick={() => saveEditLine(row)}
                        />
                        <Button type="text" icon={<CloseOutlined />} onClick={cancelEditLine} />
                      </>
                    ) : (
                      <Button type="text" icon={<EditOutlined />} onClick={() => startEditLine(row)} />
                    )}
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      loading={lineDeletingId === row.id}
                      onClick={() => deleteLine(row)}
                    />
                  </Space>
                ),
              },
            ]}
          />
        </Space>
      </Drawer>

      <Modal
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        title="Новый прайс-лист"
        onOk={() => createForm.submit()}
        confirmLoading={createLoading}
      >
        <Form form={createForm} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="list_code" label="Код/номер">
            <Input placeholder="PL-HANTOP-2026-Q1" />
          </Form.Item>
          <Form.Item name="list_name" label="Название">
            <Input placeholder="Прайс 1 квартал 2026" />
          </Form.Item>
          <Form.Item name="currency_default" label="Валюта по умолчанию">
            <Select allowClear options={CURRENCY_OPTIONS} />
          </Form.Item>
          <Space style={{ width: "100%" }} size={12}>
            <Form.Item name="valid_from" label="Действует с" style={{ flex: 1 }}>
              <DatePicker style={{ width: "100%" }} format="DD.MM.YYYY" />
            </Form.Item>
            <Form.Item name="valid_to" label="Действует до" style={{ flex: 1 }}>
              <DatePicker style={{ width: "100%" }} format="DD.MM.YYYY" />
            </Form.Item>
          </Space>
          <Form.Item name="note" label="Комментарий">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

function CardLineForm({ activeList, lineForm, onAdd, adding }) {
  return (
    <div style={{ border: "1px solid #f0f0f0", borderRadius: 8, padding: 12 }}>
      <Space direction="vertical" style={{ width: "100%" }} size={8}>
        <div style={{ fontWeight: 600 }}>
          {activeList ? `Добавить строку в прайс: ${activeList.list_name || activeList.list_code || `#${activeList.id}`}` : "Выберите прайс-лист"}
        </div>
        <Form form={lineForm} layout="inline" style={{ rowGap: 8 }}>
          <Form.Item name="supplier_part_number_raw" label="Номер" rules={[{ required: true, message: "Введите номер" }]}>
            <Input style={{ width: 180 }} />
          </Form.Item>
          <Form.Item name="description_raw" label="Описание">
            <Input style={{ width: 180 }} />
          </Form.Item>
          <Form.Item name="price" label="Цена" rules={[{ required: true, message: "Цена обязательна" }]}>
            <InputNumber min={0} step={0.01} style={{ width: 110 }} />
          </Form.Item>
          <Form.Item name="currency" label="Валюта">
            <Select allowClear style={{ width: 90 }} options={CURRENCY_OPTIONS} />
          </Form.Item>
          <Form.Item name="offer_type" label="Тип">
            <Select allowClear style={{ width: 120 }} options={[{ value: "OEM" }, { value: "ANALOG" }, { value: "UNKNOWN" }]} />
          </Form.Item>
          <Form.Item name="lead_time_days" label="Срок">
            <InputNumber min={0} style={{ width: 90 }} />
          </Form.Item>
          <Form.Item name="min_order_qty" label="MOQ">
            <InputNumber min={0} style={{ width: 90 }} />
          </Form.Item>
          <Form.Item name="validity_days" label="Валид., дн">
            <InputNumber min={0} style={{ width: 100 }} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" onClick={onAdd} loading={adding} disabled={!activeList}>
              Добавить
            </Button>
          </Form.Item>
        </Form>
      </Space>
    </div>
  )
}

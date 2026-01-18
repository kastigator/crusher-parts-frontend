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
  Checkbox,
  Tag,
  Modal,
  Typography,
} from "antd"
import { DeleteOutlined } from "@ant-design/icons"
import PageWrapper from "@/components/common/PageWrapper"
import axios from "@/api/axiosInstance"
import confirmAction from "@/utils/confirmAction"
import { useLocation } from "react-router-dom"

const UOM_OPTIONS = [
  { value: "pcs", label: "шт" },
  { value: "kg", label: "кг" },
  { value: "set", label: "компл." },
]

const { Text } = Typography

const formatDateOnly = (value) => {
  if (!value) return "—"
  try {
    return new Date(value).toLocaleDateString("ru-RU")
  } catch {
    return "—"
  }
}

export default function RfqPage() {
  const location = useLocation()
  const [rfqs, setRfqs] = useState([])
  const [requests, setRequests] = useState([])
  const [revisions, setRevisions] = useState([])
  const [revisionItems, setRevisionItems] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [suggestedSuppliers, setSuggestedSuppliers] = useState([])
  const [loading, setLoading] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [activeRfq, setActiveRfq] = useState(null)
  const [rfqItems, setRfqItems] = useState([])
  const [rfqSuppliers, setRfqSuppliers] = useState([])
  const [rfqDocuments, setRfqDocuments] = useState([])
  const [bulkAdding, setBulkAdding] = useState(false)
  const [sending, setSending] = useState(false)
  const [docsLoading, setDocsLoading] = useState(false)
  const [suggestedLoading, setSuggestedLoading] = useState(false)
  const [suggestedSelection, setSuggestedSelection] = useState([])
  const [pendingOpenId, setPendingOpenId] = useState(null)

  const [createForm] = Form.useForm()
  const [itemForm] = Form.useForm()
  const [supplierForm] = Form.useForm()

  const loadRfqs = async () => {
    setLoading(true)
    try {
      const { data } = await axios.get("/rfqs")
      setRfqs(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
      message.error("Не удалось загрузить RFQ")
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

  const loadRevisions = async (requestId) => {
    if (!requestId) {
      setRevisions([])
      return
    }
    try {
      const { data } = await axios.get(`/client-requests/${requestId}/revisions`)
      setRevisions(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
      message.error("Не удалось загрузить ревизии")
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

  const loadSuppliers = async () => {
    try {
      const { data } = await axios.get("/suppliers")
      setSuppliers(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadRfqs()
    loadRequests()
    loadSuppliers()
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const openId = Number(params.get("open"))
    if (Number.isFinite(openId) && openId > 0) {
      setPendingOpenId(openId)
    }
  }, [location.search])

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
        label: `Rev ${rev.rev_number}${rev.created_at ? ` · ${rev.created_at}` : ""}`,
      })),
    [revisions],
  )

  const revisionItemOptions = useMemo(
    () =>
      revisionItems.map((item) => ({
        value: item.id,
        label: `${item.original_cat_number || "Без номера"} · ${item.client_description || ""} · ${item.requested_qty || 0} ${item.uom || "pcs"}`.trim(),
      })),
    [revisionItems],
  )

  const revisionItemMap = useMemo(() => {
    const map = new Map()
    revisionItems.forEach((item) => map.set(item.id, item))
    return map
  }, [revisionItems])

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
      if (!values.client_request_revision_id) {
        message.warning("Выберите ревизию заявки")
        return
      }
      await axios.post("/rfqs", {
        client_request_revision_id: values.client_request_revision_id,
        note: values.note || null,
      })
      message.success("RFQ создан")
      createForm.resetFields()
      loadRfqs()
    } catch (e) {
      console.error(e)
      message.error("Не удалось создать RFQ")
    }
  }

  const openDrawer = async (record) => {
    setActiveRfq(record)
    setDrawerOpen(true)
    await loadRevisionItems(record.client_request_revision_id)
    await loadRfqItems(record.id)
    await loadRfqSuppliers(record.id)
    await loadSuggestedSuppliers(record.id)
    await loadRfqDocuments(record.id)
  }

  useEffect(() => {
    if (!pendingOpenId || !rfqs.length) return
    const record = rfqs.find((item) => Number(item.id) === Number(pendingOpenId))
    if (record) {
      openDrawer(record)
      setPendingOpenId(null)
    }
  }, [pendingOpenId, rfqs])

  const loadRfqItems = async (rfqId) => {
    try {
      const { data } = await axios.get(`/rfqs/${rfqId}/items`)
      setRfqItems(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
      message.error("Не удалось загрузить строки RFQ")
    }
  }

  const loadRfqSuppliers = async (rfqId) => {
    try {
      const { data } = await axios.get(`/rfqs/${rfqId}/suppliers`)
      setRfqSuppliers(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
      message.error("Не удалось загрузить поставщиков")
    }
  }

  const loadRfqDocuments = async (rfqId) => {
    if (!rfqId) {
      setRfqDocuments([])
      return
    }
    setDocsLoading(true)
    try {
      const { data } = await axios.get(`/rfqs/${rfqId}/documents`)
      setRfqDocuments(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
      message.error("Не удалось загрузить документы RFQ")
    } finally {
      setDocsLoading(false)
    }
  }

  const loadSuggestedSuppliers = async (rfqId) => {
    if (!rfqId) {
      setSuggestedSuppliers([])
      return
    }
    setSuggestedLoading(true)
    try {
      const { data } = await axios.get(`/rfqs/${rfqId}/suggested-suppliers`)
      setSuggestedSuppliers(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
    } finally {
      setSuggestedLoading(false)
    }
  }

  const handleAddItem = async (values) => {
    if (!activeRfq?.id) return
    try {
      await axios.post(`/rfqs/${activeRfq.id}/items`, {
        client_request_revision_item_id: values.client_request_revision_item_id,
        requested_qty: values.requested_qty,
        uom: values.uom,
        oem_only: values.oem_only ? 1 : 0,
        note: values.note || null,
      })
      itemForm.resetFields()
      await loadRfqItems(activeRfq.id)
      await loadSuggestedSuppliers(activeRfq.id)
      message.success("Строка добавлена")
    } catch (e) {
      console.error(e)
      message.error("Не удалось добавить строку")
    }
  }

  const handleAddAllItems = async () => {
    if (!activeRfq?.id) return
    setBulkAdding(true)
    try {
      const { data } = await axios.post(`/rfqs/${activeRfq.id}/items/bulk`)
      await loadRfqItems(activeRfq.id)
      await loadSuggestedSuppliers(activeRfq.id)
      if (data?.inserted) {
        message.success(`Добавлено позиций: ${data.inserted}`)
      } else {
        message.info("Новых позиций не найдено")
      }
    } catch (e) {
      console.error(e)
      message.error("Не удалось добавить позиции")
    } finally {
      setBulkAdding(false)
    }
  }

  const handleAddSupplier = async (values) => {
    if (!activeRfq?.id) return
    try {
      await axios.post(`/rfqs/${activeRfq.id}/suppliers`, {
        supplier_id: values.supplier_id,
        status: values.status || "invited",
        invited_at: values.invited_at || null,
        note: values.note || null,
      })
      supplierForm.resetFields()
      await loadRfqSuppliers(activeRfq.id)
      message.success("Поставщик добавлен")
    } catch (e) {
      console.error(e)
      message.error("Не удалось добавить поставщика")
    }
  }

  const handleAddSuggestedSuppliers = async () => {
    if (!activeRfq?.id) return
    if (!suggestedSelection.length) {
      message.warning("Выберите поставщиков из рекомендаций")
      return
    }
    try {
      await axios.post(`/rfqs/${activeRfq.id}/suppliers/bulk`, {
        supplier_ids: suggestedSelection,
        status: "invited",
      })
      setSuggestedSelection([])
      await loadRfqSuppliers(activeRfq.id)
      await loadSuggestedSuppliers(activeRfq.id)
      message.success("Поставщики добавлены")
    } catch (e) {
      console.error(e)
      message.error("Не удалось добавить поставщиков")
    }
  }

  const handleSendRfq = async () => {
    if (!activeRfq?.id) return
    const { confirmed } = await confirmAction({
      title: "Отправить RFQ?",
      text: "Сформируем документы и отметим RFQ как отправленный.",
      icon: "warning",
      confirmLabel: "Отправить",
    })
    if (!confirmed) return
    setSending(true)
    try {
      const { data } = await axios.post(`/rfqs/${activeRfq.id}/send`)
      const sentCount = Array.isArray(data?.documents) ? data.documents.length : 0
      const errorList = Array.isArray(data?.errors) ? data.errors : []
      if (sentCount) {
        message.success(`Отправлено документов: ${sentCount}`)
      } else {
        message.warning("Документы не сформированы")
      }
      if (errorList.length) {
        Modal.warning({
          title: "Часть документов не создана",
          content: (
            <div>
              {errorList.map((err) => (
                <div key={`${err.supplier_id}-${err.message}`}>
                  {err.supplier_name || `Поставщик ${err.supplier_id}`}: {err.message}
                </div>
              ))}
            </div>
          ),
        })
      }
      const updated = await axios.get(`/rfqs/${activeRfq.id}`)
      if (updated?.data) {
        setActiveRfq(updated.data)
      }
      await loadRfqs()
      await loadRfqSuppliers(activeRfq.id)
      await loadRfqDocuments(activeRfq.id)
    } catch (e) {
      console.error(e)
      message.error("Не удалось отправить RFQ")
    } finally {
      setSending(false)
    }
  }

  const handleCreateResponse = async (supplierRow) => {
    try {
      await axios.post("/supplier-responses", {
        rfq_supplier_id: supplierRow.id,
        status: "received",
        create_revision: true,
      })
      message.success("Ответ создан")
      await loadRfqSuppliers(activeRfq.id)
    } catch (e) {
      console.error(e)
      message.error("Не удалось создать ответ")
    }
  }

  const existingSupplierIds = useMemo(
    () => new Set(rfqSuppliers.map((s) => s.supplier_id)),
    [rfqSuppliers],
  )

  const canSendRfq = rfqItems.length > 0 && rfqSuppliers.length > 0

  const suggestedSupplierRows = useMemo(
    () => suggestedSuppliers.filter((s) => !existingSupplierIds.has(s.supplier_id)),
    [suggestedSuppliers, existingSupplierIds],
  )

  const renderMatchTypes = (value) => {
    if (!value) return "—"
    const types = String(value)
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
    if (!types.length) return "—"
    return (
      <Space size="small">
        {types.includes("link") && <Tag color="blue">связи</Tag>}
        {types.includes("cat_number") && <Tag color="orange">кат. номер</Tag>}
      </Space>
    )
  }

  const rfqColumns = [
    { title: "Клиент", dataIndex: "client_name" },
    { title: "Rev", dataIndex: "rev_number", width: 80 },
    {
      title: "Статус",
      dataIndex: "status",
      width: 140,
      render: (value) => {
        const color =
          value === "sent" ? "blue" : value === "responded" ? "green" : "default"
        return <Tag color={color}>{value || "draft"}</Tag>
      },
    },
    { title: "Комментарий", dataIndex: "note" },
    {
      title: "Создано",
      dataIndex: "created_at",
      width: 140,
      render: formatDateOnly,
    },
    {
      title: "Действия",
      dataIndex: "actions",
      width: 110,
      render: (_, record) => (
        <Button
          danger
          type="text"
          icon={<DeleteOutlined />}
          onClick={async (event) => {
            event.stopPropagation()
            const { confirmed } = await confirmAction({
              title: "Удалить RFQ?",
              text: "Будут удалены ответы поставщиков и связанные расчеты.",
              icon: "warning",
              confirmLabel: "Удалить",
            })
            if (!confirmed) return
            try {
              await axios.delete(`/rfqs/${record.id}`)
              if (activeRfq?.id === record.id) {
                setDrawerOpen(false)
                setActiveRfq(null)
              }
              await loadRfqs()
              message.success("RFQ удален")
            } catch (e) {
              console.error(e)
              message.error("Не удалось удалить RFQ")
            }
          }}
        />
      ),
    },
  ]

  return (
    <PageWrapper
      title="RFQ"
      helpText="Создайте RFQ на ревизию заявки и отправьте его поставщикам."
    >
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Card title="Новый RFQ" size="small">
          <Form form={createForm} layout="vertical" onFinish={handleCreate}>
            <Space wrap align="start">
              <Form.Item label="Заявка" name="client_request_id">
                <Select
                  style={{ width: 240 }}
                  options={requestOptions}
                  showSearch
                  optionFilterProp="label"
                  onChange={(val) => {
                    createForm.setFieldsValue({ client_request_revision_id: null })
                    loadRevisions(val)
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
              <Form.Item label="Комментарий" name="note">
                <Input style={{ width: 260 }} />
              </Form.Item>
              <Form.Item style={{ marginTop: 30 }}>
                <Button type="primary" htmlType="submit">
                  Создать RFQ
                </Button>
              </Form.Item>
            </Space>
          </Form>
        </Card>

        <Card title="Список RFQ" size="small">
          <Table
            rowKey="id"
            columns={rfqColumns}
            dataSource={rfqs}
            loading={loading}
            pagination={{ pageSize: 20 }}
            onRow={(record) => ({
              onClick: () => openDrawer(record),
            })}
          />
        </Card>
      </Space>

      <Drawer
        width={900}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={
          <Space>
            <span>RFQ</span>
            {activeRfq?.status ? (
              <Tag color={activeRfq.status === "sent" ? "blue" : "default"}>
                {activeRfq.status}
              </Tag>
            ) : null}
            {activeRfq?.sent_at ? (
              <Text type="secondary">
                Отправлено: {formatDateOnly(activeRfq.sent_at)}
              </Text>
            ) : null}
          </Space>
        }
      >
        <Tabs
          defaultActiveKey="items"
          items={[
            {
              key: "items",
              label: "Строки RFQ",
              children: (
                <Space direction="vertical" style={{ width: "100%" }}>
                  <Card size="small" title="Добавить строку">
                    <Form form={itemForm} onFinish={handleAddItem} layout="vertical">
                      <Space wrap align="start">
                        <Form.Item
                          label="Позиция заявки"
                          name="client_request_revision_item_id"
                          tooltip="Берем строки из выбранной ревизии заявки"
                          rules={[{ required: true, message: "Выберите позицию" }]}
                        >
                          <Select
                            style={{ width: 260 }}
                            options={revisionItemOptions}
                            placeholder="Выберите строку заявки"
                            onChange={(value) => {
                              const item = revisionItemMap.get(value)
                              if (item) {
                                itemForm.setFieldsValue({
                                  requested_qty: item.requested_qty,
                                  uom: item.uom || "pcs",
                                  oem_only: Boolean(item.oem_only),
                                })
                              }
                            }}
                            onDropdownVisibleChange={(open) => {
                              if (open && activeRfq?.client_request_revision_id) {
                                loadRevisionItems(activeRfq.client_request_revision_id)
                              }
                            }}
                          />
                        </Form.Item>
                        <Form.Item
                          label="Кол-во"
                          name="requested_qty"
                          tooltip="По умолчанию подставляется из заявки, можно изменить"
                        >
                          <InputNumber style={{ width: 120 }} min={0} />
                        </Form.Item>
                        <Form.Item label="Ед." name="uom" initialValue="pcs">
                          <Select style={{ width: 100 }} options={UOM_OPTIONS} />
                        </Form.Item>
                        <Form.Item name="oem_only" valuePropName="checked">
                          <Checkbox>OEM только</Checkbox>
                        </Form.Item>
                        <Form.Item label="Комментарий" name="note">
                          <Input style={{ width: 220 }} />
                        </Form.Item>
                        <Form.Item style={{ marginTop: 30 }}>
                          <Button type="primary" htmlType="submit">
                            Добавить
                          </Button>
                        </Form.Item>
                        <Form.Item style={{ marginTop: 30 }}>
                          <Button
                            type="default"
                            onClick={handleAddAllItems}
                            loading={bulkAdding}
                          >
                            Добавить все позиции ревизии
                          </Button>
                        </Form.Item>
                      </Space>
                    </Form>
                  </Card>

                  <Table
                    rowKey="id"
                    dataSource={rfqItems}
                    pagination={false}
                    columns={[
                      { title: "№", dataIndex: "line_number", width: 70 },
                      {
                        title: "Кат. номер",
                        dataIndex: "original_cat_number",
                        width: 160,
                        render: (value, record) =>
                          value || record.client_part_number || "—",
                      },
                      { title: "Описание клиента", dataIndex: "client_description" },
                      { title: "Кол-во", dataIndex: "requested_qty", width: 100 },
                      { title: "Ед.", dataIndex: "uom", width: 80 },
                      {
                        title: "OEM",
                        dataIndex: "oem_only",
                        width: 80,
                        render: (v) => (v ? "Да" : "—"),
                      },
                      { title: "Комментарий", dataIndex: "note" },
                    ]}
                  />
                </Space>
              ),
            },
            {
              key: "suppliers",
              label: "Поставщики",
              children: (
                <Space direction="vertical" style={{ width: "100%" }}>
                  <Card size="small" title="Отправка RFQ">
                    <Space wrap align="center">
                      <Button
                        type="primary"
                        onClick={handleSendRfq}
                        loading={sending}
                        disabled={!canSendRfq}
                      >
                        Отправить RFQ
                      </Button>
                      <Text type="secondary">
                        Создаст документы для поставщиков и отметит статус как отправленный.
                      </Text>
                    </Space>
                  </Card>
                  <Card size="small" title="Рекомендованные поставщики">
                    <Space direction="vertical" style={{ width: "100%" }}>
                      <Table
                        rowKey="supplier_id"
                        dataSource={suggestedSupplierRows}
                        loading={suggestedLoading}
                        pagination={false}
                        rowSelection={{
                          selectedRowKeys: suggestedSelection,
                          onChange: setSuggestedSelection,
                        }}
                        columns={[
                          { title: "Поставщик", dataIndex: "supplier_name" },
                          { title: "Совпадений", dataIndex: "parts_count", width: 140 },
                          {
                            title: "Источник",
                            dataIndex: "match_types",
                            width: 160,
                            render: renderMatchTypes,
                          },
                        ]}
                      />
                      <Button
                        type="primary"
                        onClick={handleAddSuggestedSuppliers}
                        disabled={!suggestedSupplierRows.length}
                      >
                        Добавить выбранных
                      </Button>
                    </Space>
                  </Card>
                  <Card size="small" title="Добавить поставщика">
                    <Form
                      form={supplierForm}
                      onFinish={handleAddSupplier}
                      layout="vertical"
                    >
                      <Space wrap align="start">
                        <Form.Item
                          label="Поставщик"
                          name="supplier_id"
                          rules={[{ required: true, message: "Выберите поставщика" }]}
                        >
                          <Select style={{ width: 260 }} options={supplierOptions} />
                        </Form.Item>
                        <Form.Item label="Статус" name="status" initialValue="invited">
                          <Select
                            style={{ width: 160 }}
                            options={[
                              { value: "invited", label: "Приглашен" },
                              { value: "replied", label: "Ответил" },
                              { value: "declined", label: "Отказ" },
                            ]}
                          />
                        </Form.Item>
                        <Form.Item label="Дата" name="invited_at">
                          <Input style={{ width: 160 }} placeholder="YYYY-MM-DD" />
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
                    dataSource={rfqSuppliers}
                    pagination={false}
                    columns={[
                      { title: "Поставщик", dataIndex: "supplier_name" },
                      {
                        title: "Статус",
                        dataIndex: "status",
                        width: 120,
                        render: (value) => (
                          <Tag color={value === "sent" ? "blue" : "default"}>
                            {value || "invited"}
                          </Tag>
                        ),
                      },
                      {
                        title: "Дата",
                        dataIndex: "invited_at",
                        width: 120,
                        render: formatDateOnly,
                      },
                      { title: "Комментарий", dataIndex: "note" },
                      {
                        title: "Ответ",
                        dataIndex: "response_id",
                        width: 140,
                        render: (value, record) =>
                          value ? (
                            <Tag color="green">Есть</Tag>
                          ) : (
                            <Button
                              size="small"
                              type="link"
                              onClick={() => handleCreateResponse(record)}
                            >
                              Создать
                            </Button>
                          ),
                      },
                    ]}
                  />
                </Space>
              ),
            },
            {
              key: "documents",
              label: "Документы",
              children: (
                <Table
                  rowKey="id"
                  dataSource={rfqDocuments}
                  loading={docsLoading}
                  pagination={false}
                  columns={[
                    {
                      title: "Файл",
                      dataIndex: "file_name",
                      render: (value, record) =>
                        record.file_url ? (
                          <a href={record.file_url} target="_blank" rel="noreferrer">
                            {value || "Документ"}
                          </a>
                        ) : (
                          value || "Документ"
                        ),
                    },
                    { title: "Поставщик", dataIndex: "supplier_name", width: 180 },
                    {
                      title: "Создано",
                      dataIndex: "created_at",
                      width: 140,
                      render: formatDateOnly,
                    },
                  ]}
                />
              ),
            },
          ]}
        />
      </Drawer>
    </PageWrapper>
  )
}

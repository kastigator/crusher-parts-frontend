import React, { useEffect, useMemo, useState } from "react"
import { Alert, Button, Card, Drawer, Form, Input, Select, Space, Table, Tag, Typography, message } from "antd"
import axios from "@/api/axiosInstance"
import { formatIncotermsWithPlace } from "./rfqWorkspaceUtils"
import SupplierQualityEventModal from "@/components/suppliers/SupplierQualityEventModal"

const statusOptions = [
  { value: "draft", label: "Черновик" },
  { value: "sent", label: "Отправлен" },
  { value: "confirmed", label: "Подтвержден" },
]

export default function PurchaseOrdersTabContent({
  selections,
  contracts,
  purchaseOrders,
  formatDate,
  onCommercialUpdated,
}) {
  const [helpOpen, setHelpOpen] = useState(false)
  const [qualityModalOpen, setQualityModalOpen] = useState(false)
  const [qualityOrder, setQualityOrder] = useState(null)
  const [selectedSelectionId, setSelectedSelectionId] = useState(null)
  const [selectionLines, setSelectionLines] = useState([])
  const [loadingLines, setLoadingLines] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form] = Form.useForm()

  const signedSelectionIds = useMemo(
    () =>
      new Set(
        (Array.isArray(contracts) ? contracts : [])
          .filter((row) => ["signed", "in_execution"].includes(String(row?.status || "").toLowerCase()))
          .map((row) => Number(row.selection_id || 0))
          .filter(Boolean)
      ),
    [contracts]
  )

  const selectionOptions = useMemo(
    () =>
      (Array.isArray(selections) ? selections : []).map((row) => ({
        value: Number(row.id),
        label: `Выбор #${row.id} · ${row.status || "draft"}`,
        disabled: !signedSelectionIds.has(Number(row.id)),
      })),
    [selections, signedSelectionIds]
  )

  const supplierOptions = useMemo(() => {
    const grouped = new Map()
    selectionLines.forEach((row) => {
      const supplierId = Number(row?.supplier_id || 0)
      if (!supplierId || grouped.has(supplierId)) return
      grouped.set(supplierId, {
        value: supplierId,
        label: row.supplier_name || row.supplier_public_code || `Поставщик #${supplierId}`,
      })
    })
    return Array.from(grouped.values())
  }, [selectionLines])

  useEffect(() => {
    form.setFieldValue("supplier_id", undefined)
  }, [supplierOptions, form])

  const loadSelectionLines = async (selectionIdOverride) => {
    const selectionId = Number(selectionIdOverride || selectedSelectionId || 0) || null
    if (!selectionId) {
      setSelectionLines([])
      return
    }
    setLoadingLines(true)
    try {
      const { data } = await axios.get(`/selection/${selectionId}/lines`)
      setSelectionLines(Array.isArray(data) ? data : [])
    } catch (e) {
      setSelectionLines([])
      message.error(e?.response?.data?.message || "Не удалось загрузить строки выбора закупки")
    } finally {
      setLoadingLines(false)
    }
  }

  useEffect(() => {
    loadSelectionLines()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSelectionId])

  const handleCreatePo = async (values) => {
    if (!signedSelectionIds.has(Number(values.selection_id))) {
      message.warning("PO можно создавать только после контракта, открытого к исполнению")
      return
    }
    setCreating(true)
    try {
      await axios.post("/purchase-orders", {
        supplier_id: values.supplier_id,
        selection_id: values.selection_id,
        status: values.status || "draft",
        supplier_reference: values.supplier_reference,
        currency: values.currency || "USD",
        incoterms: values.incoterms,
        incoterms_place: values.incoterms_place || null,
        autofill_from_selection: true,
      })
      message.success("PO создан")
      form.resetFields(["supplier_id", "supplier_reference", "incoterms", "incoterms_place"])
      if (typeof onCommercialUpdated === "function") {
        await onCommercialUpdated()
      }
    } catch (e) {
      message.error(e?.response?.data?.message || "Не удалось создать PO")
    } finally {
      setCreating(false)
    }
  }

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <Alert
        type="info"
        showIcon
        message="PO открывается только после подписанного контракта"
        description="После подписанного контракта закупщик выпускает PO поставщику не по всему выбору, а по составу подписанной коммерческой ревизии: исключённые строки не попадут в PO, а количество берется из утвержденного коммерческого объема. Первый PO переводит контракт в статус «В исполнении»."
      />

      <Card
        size="small"
        title="Создать PO поставщику"
        extra={
          <Button size="small" onClick={() => setHelpOpen(true)}>
            Справка
          </Button>
        }
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ status: "draft", currency: "USD" }}
          onFinish={handleCreatePo}
        >
          <Space wrap align="start">
            <Form.Item
              name="selection_id"
              label="Выбор закупки"
              rules={[{ required: true, message: "Выберите утвержденный выбор" }]}
            >
              <Select
                style={{ width: 320 }}
                options={selectionOptions}
                onChange={(value) => {
                  const id = Number(value || 0) || null
                  setSelectedSelectionId(id)
                }}
              />
            </Form.Item>
            <Form.Item
              name="supplier_id"
              label="Поставщик"
              rules={[{ required: true, message: "Выберите поставщика" }]}
            >
              <Select style={{ width: 320 }} loading={loadingLines} options={supplierOptions} />
            </Form.Item>
            <Form.Item name="status" label="Статус">
              <Select style={{ width: 140 }} options={statusOptions} />
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
            <Form.Item name="incoterms" label="Инкотермс">
              <Input style={{ width: 120 }} placeholder="EXW" />
            </Form.Item>
            <Form.Item name="incoterms_place" label="Пункт Incoterms">
              <Input style={{ width: 220 }} placeholder="Например: Shanghai Port" />
            </Form.Item>
            <Form.Item name="supplier_reference" label="Ref поставщика">
              <Input style={{ width: 180 }} />
            </Form.Item>
          </Space>
          <Button type="primary" htmlType="submit" loading={creating}>
            Создать PO
          </Button>
        </Form>
      </Card>

      <Card
        size="small"
        title="PO поставщикам по RFQ"
        extra={
          <Button size="small" onClick={onCommercialUpdated}>
            Обновить
          </Button>
        }
      >
        <Table
          rowKey="id"
          dataSource={purchaseOrders}
          pagination={{ pageSize: 10, hideOnSinglePage: true }}
          columns={[
            { title: "PO", width: 80, render: (_, row) => `#${row.id}` },
            { title: "Выбор", dataIndex: "selection_id", width: 100 },
            {
              title: "Поставщик",
              width: 220,
              render: (_, row) => row.supplier_name || row.supplier_public_code || `#${row.supplier_id}`,
            },
            {
              title: "Статус",
              dataIndex: "status",
              width: 120,
              render: (value) => <Tag>{statusOptions.find((item) => item.value === value)?.label || value || "Черновик"}</Tag>,
            },
            { title: "Референс поставщика", dataIndex: "supplier_reference", width: 180 },
            {
              title: "Incoterms",
              width: 180,
              render: (_, row) => formatIncotermsWithPlace(row.incoterms, row.incoterms_place),
            },
            {
              title: "Основание",
              width: 160,
              render: (_, row) => (signedSelectionIds.has(Number(row.selection_id || 0)) ? "Контракт открыт к исполнению" : "Только выбор"),
            },
            {
              title: "Качество",
              width: 160,
              render: (_, row) => (
                <Button
                  size="small"
                  onClick={() => {
                    setQualityOrder(row)
                    setQualityModalOpen(true)
                  }}
                >
                  Добавить событие
                </Button>
              ),
            },
            { title: "Создано", dataIndex: "created_at", width: 120, render: formatDate },
          ]}
        />
      </Card>

      <Drawer
        title="Справка по вкладке «PO поставщикам»"
        placement="right"
        width={460}
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
      >
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Typography.Paragraph>
            Здесь закупщик выпускает PO поставщику только после того, как продавец и клиент закончили торг и
            по RFQ появился подписанный контракт.
          </Typography.Paragraph>
          <Typography.Paragraph>
            Источник для PO теперь не весь исходный выбор закупки, а утвержденная коммерческая ревизия:
            исключённые строки не попадают в заказ, а количество берётся из согласованного коммерческого
            объема.
          </Typography.Paragraph>
          <Typography.Paragraph style={{ marginBottom: 0 }}>
            Если позже по поставке появляется задержка, рекламация или иное отклонение, событие качества
            следует фиксировать по строке PO в карточке поставщика.
          </Typography.Paragraph>
        </Space>
      </Drawer>

      <SupplierQualityEventModal
        open={qualityModalOpen}
        supplierId={qualityOrder?.supplier_id || null}
        purchaseOrder={qualityOrder}
        onClose={() => {
          setQualityModalOpen(false)
          setQualityOrder(null)
        }}
      />
    </Space>
  )
}

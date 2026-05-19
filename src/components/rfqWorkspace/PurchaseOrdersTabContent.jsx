import React, { useEffect, useMemo, useRef, useState } from "react"
import { Alert, Button, Card, Drawer, Form, Input, Select, Space, Table, Tag, Typography, message } from "antd"
import axios from "@/api/axiosInstance"
import { formatIncotermsWithPlace } from "./rfqWorkspaceUtils"
import SupplierQualityEventModal from "@/components/suppliers/SupplierQualityEventModal"
import useCapabilities from "@/hooks/useCapabilities"
import { resolveAppHref } from "@/utils/resolveAppHref"
import useTableScrollHints from "@/utils/useTableScrollHints"
import "@/styles/tableStyles.css"

const statusOptions = [
  { value: "draft", label: "Черновик" },
  { value: "sent", label: "Отправлен" },
  { value: "confirmed", label: "Подтвержден" },
]

const buildSelectionLabel = (selection, formatDate) => {
  if (!selection) return "Выбор закупки"
  const date = formatDate?.(selection.created_at)
  const parts = [date && date !== "—" ? `Выбор от ${date}` : "Выбор закупки"]
  if (selection.status) parts.push(selection.status)
  if (selection.landed_total != null && selection.calc_currency) {
    parts.push(`${Number(selection.landed_total || 0).toFixed(2)} ${selection.calc_currency}`)
  }
  return parts.join(" · ")
}

export default function PurchaseOrdersTabContent({
  selections,
  contracts,
  purchaseOrders,
  formatDate,
  onCommercialUpdated,
}) {
  const { can } = useCapabilities()
  const canManagePurchaseOrders = can("workflow.purchase_orders.manage")
  const [helpOpen, setHelpOpen] = useState(false)
  const [qualityModalOpen, setQualityModalOpen] = useState(false)
  const [qualityOrder, setQualityOrder] = useState(null)
  const [generatingOrderId, setGeneratingOrderId] = useState(null)
  const [selectedSelectionId, setSelectedSelectionId] = useState(null)
  const [selectionLines, setSelectionLines] = useState([])
  const [loadingLines, setLoadingLines] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [form] = Form.useForm()
  const ordersTableWrapRef = useRef(null)

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
        label: buildSelectionLabel(row, formatDate),
        disabled: !signedSelectionIds.has(Number(row.id)),
      })),
    [selections, signedSelectionIds, formatDate]
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

  const ordersScrollHints = useTableScrollHints(ordersTableWrapRef, [purchaseOrders])

  const selectedSupplierId = Form.useWatch("supplier_id", form)
  const selectedShipmentGroupId = Form.useWatch("shipment_group_id", form)

  const shipmentGroupOptions = useMemo(() => {
    const grouped = new Map()
    selectionLines
      .filter((row) => Number(row?.supplier_id || 0) === Number(selectedSupplierId || 0))
      .forEach((row) => {
        const shipmentGroupId = Number(row?.shipment_group_id || 0)
        if (!shipmentGroupId || grouped.has(shipmentGroupId)) return
        const parts = [`Группа #${shipmentGroupId}`]
        if (row?.route_name_snapshot) parts.push(row.route_name_snapshot)
        if (row?.route_type) parts.push(String(row.route_type).toUpperCase())
        if (row?.incoterms) parts.push(formatIncotermsWithPlace(row.incoterms, row.incoterms_place))
        grouped.set(shipmentGroupId, {
          value: shipmentGroupId,
          label: parts.filter(Boolean).join(" · "),
        })
      })
    return Array.from(grouped.values())
  }, [selectionLines, selectedSupplierId])

  const selectedExecutionProfile = useMemo(() => {
    const rows = selectionLines.filter((row) => {
      if (Number(row?.supplier_id || 0) !== Number(selectedSupplierId || 0)) return false
      if (selectedShipmentGroupId && Number(row?.shipment_group_id || 0) !== Number(selectedShipmentGroupId || 0)) return false
      return true
    })
    if (!rows.length) return null
    const unique = (key) =>
      Array.from(new Set(rows.map((row) => String(row?.[key] || "").trim()).filter(Boolean)))
    return {
      route_type: unique("route_type").length === 1 ? unique("route_type")[0] : null,
      incoterms: unique("incoterms").length === 1 ? unique("incoterms")[0] : null,
      incoterms_place: unique("incoterms_place").length === 1 ? unique("incoterms_place")[0] : null,
      currency: unique("currency").length === 1 ? unique("currency")[0] : null,
      mixed: unique("route_type").length > 1 || unique("incoterms").length > 1 || unique("incoterms_place").length > 1 || unique("currency").length > 1,
    }
  }, [selectionLines, selectedSupplierId, selectedShipmentGroupId])

  const requiresShipmentGroup = Number(selectedSupplierId || 0) > 0 && shipmentGroupOptions.length > 1 && !selectedShipmentGroupId

  useEffect(() => {
    form.setFieldValue("supplier_id", undefined)
    form.setFieldValue("shipment_group_id", undefined)
  }, [supplierOptions, form])

  useEffect(() => {
    form.setFieldValue("shipment_group_id", undefined)
  }, [selectedSupplierId, form])

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
      message.warning("Заказ поставщику можно создавать только после контракта, открытого к исполнению")
      return
    }
    if (shipmentGroupOptions.length > 1 && !values.shipment_group_id) {
      message.warning("У поставщика несколько групп поставки. Выберите конкретную группу для отдельного заказа.")
      return
    }
    setCreating(true)
    try {
      await axios.post("/purchase-orders", {
        supplier_id: values.supplier_id,
        selection_id: values.selection_id,
        shipment_group_id: values.shipment_group_id || null,
        supplier_reference: values.supplier_reference,
        autofill_from_selection: true,
      })
      message.success("Заказ поставщику создан")
      form.resetFields(["supplier_id", "shipment_group_id", "supplier_reference"])
      if (typeof onCommercialUpdated === "function") {
        await onCommercialUpdated()
      }
    } catch (e) {
      message.error(e?.response?.data?.message || "Не удалось создать заказ поставщику")
    } finally {
      setCreating(false)
    }
  }

  const handleGenerateOrderPdf = async (orderId) => {
    setGeneratingOrderId(Number(orderId))
    try {
      await axios.post(`/purchase-orders/${orderId}/generate`)
      message.success("DOCX заказа поставщику сформирован")
      if (typeof onCommercialUpdated === "function") {
        await onCommercialUpdated()
      }
    } catch (e) {
      message.error(e?.response?.data?.message || "Не удалось сформировать DOCX заказа поставщику")
    } finally {
      setGeneratingOrderId(null)
    }
  }

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <Alert
        type="info"
        showIcon
        message="Заказы поставщикам открываются только после подписанного контракта"
        description="После подписанного контракта закупщик выпускает заказ поставщику не по всему выбору, а по составу подписанной коммерческой ревизии: исключённые строки не попадут в заказ, а количество берется из утвержденного коммерческого объема. Первый заказ поставщику переводит контракт в статус «В исполнении»."
      />

      <Card
        size="small"
        title="Выпущенные заказы поставщикам"
        extra={
          <Button size="small" onClick={onCommercialUpdated}>
            Обновить
          </Button>
        }
      >
        <div
          ref={ordersTableWrapRef}
          className={`op-table-wrap${ordersScrollHints.left ? " scroll-left" : ""}${
            ordersScrollHints.right ? " scroll-right" : ""
          }`}
        >
          {ordersScrollHints.right && !ordersScrollHints.left ? (
            <Typography.Text type="secondary" className="op-table-scroll-note">
              В таблице есть продолжение вправо
            </Typography.Text>
          ) : null}
          <Table
            size="small"
            rowKey="id"
            dataSource={purchaseOrders}
            pagination={{ pageSize: 10, hideOnSinglePage: true }}
            tableLayout="auto"
            scroll={{ x: "max-content" }}
            columns={[
            {
              title: "Заказ",
              width: 180,
              render: (_, row) => (
                <Space direction="vertical" size={2}>
                  <span>{`#${row.id}`}</span>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {`Выбор ${row.selection_id || "—"}`}
                  </Typography.Text>
                  <Tag style={{ width: "fit-content" }}>
                    {statusOptions.find((item) => item.value === row.status)?.label || row.status || "Черновик"}
                  </Tag>
                </Space>
              ),
            },
            {
              title: "Поставщик",
              width: 240,
              render: (_, row) => (
                <Space direction="vertical" size={2}>
                  <span>{row.supplier_name || row.supplier_public_code || `#${row.supplier_id}`}</span>
                  {row.supplier_reference ? (
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {`Референс: ${row.supplier_reference}`}
                    </Typography.Text>
                  ) : null}
                  {Number(row.substitution_lines_total || 0) > 0 ? (
                    <Tag color="orange">Подмена в закупке</Tag>
                  ) : null}
                </Space>
              ),
            },
            {
              title: "Incoterms",
              width: 160,
              render: (_, row) => formatIncotermsWithPlace(row.incoterms, row.incoterms_place),
            },
            {
              title: "Основание",
              width: 220,
              render: (_, row) => (
                <>
                  <div>{signedSelectionIds.has(Number(row.selection_id || 0)) ? "Контракт открыт к исполнению" : "Только выбор"}</div>
                  {row.shipment_group_name ? <div style={{ color: "#8c8c8c" }}>{row.shipment_group_name}</div> : null}
                  {Number(row.substitution_lines_total || 0) > 0 ? (
                    <div style={{ color: "#ad6800" }}>
                      Закупка шла по нашему номеру: {row.first_supplier_display_part_number || "—"}
                    </div>
                  ) : null}
                </>
              ),
            },
            {
              title: "Строки",
              width: 90,
              render: (_, row) =>
                Number(row.substitution_lines_total || 0) > 0
                  ? `${Number(row.substitution_lines_total || 0)}/${Number(row.lines_total || 0)}`
                  : `${Number(row.lines_total || 0)}`
            },
            { title: "Создано", dataIndex: "created_at", width: 110, render: formatDate },
            {
              title: "Действия",
              width: 300,
              render: (_, row) => (
                <Space wrap size={[8, 8]}>
                  <Button
                    size="small"
                    onClick={() => window.open(resolveAppHref(`/purchase-orders/${row.id}/preview`), "_blank", "noopener")}
                  >
                    Открыть
                  </Button>
                  {row.file_url ? (
                    <Button
                      size="small"
                      onClick={() => window.open(row.file_url, "_blank", "noopener")}
                    >
                      DOCX
                    </Button>
                  ) : null}
                  <Button
                    size="small"
                    disabled={!canManagePurchaseOrders}
                    onClick={() => {
                      setQualityOrder(row)
                      setQualityModalOpen(true)
                    }}
                  >
                    Качество
                  </Button>
                  <Button
                    size="small"
                    loading={generatingOrderId === Number(row.id)}
                    onClick={() => handleGenerateOrderPdf(row.id)}
                    disabled={!canManagePurchaseOrders}
                  >
                    Пересобрать
                  </Button>
                </Space>
              ),
            },
            ]}
          />
        </div>
      </Card>

      <Card
        size="small"
        title="Создание нового заказа поставщику"
        extra={
          <Space>
            <Button size="small" onClick={() => setCreateOpen((prev) => !prev)}>
              {createOpen ? "Скрыть форму" : "Показать форму"}
            </Button>
            <Button size="small" onClick={() => setHelpOpen(true)}>
              Справка
            </Button>
          </Space>
        }
      >
        {createOpen ? (
          <Form
            form={form}
            layout="vertical"
            onFinish={handleCreatePo}
          >
            <Space wrap align="start" style={{ width: "100%" }}>
              <Form.Item
                name="selection_id"
                label="Выбор закупки"
                rules={[{ required: true, message: "Выберите утвержденный выбор" }]}
              >
                <Select
                  style={{ width: 300, maxWidth: "100%" }}
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
                <Select style={{ width: 300, maxWidth: "100%" }} loading={loadingLines} options={supplierOptions} />
              </Form.Item>
              <Form.Item
                name="shipment_group_id"
                label="Группа поставки"
                tooltip="Если у поставщика несколько утвержденных групп/профилей, заказы нужно создавать отдельно по каждой группе."
              >
                <Select
                  allowClear
                  style={{ width: 340, maxWidth: "100%" }}
                  options={shipmentGroupOptions}
                  placeholder={shipmentGroupOptions.length ? "Выберите конкретную группу поставки" : "Сначала выберите поставщика"}
                />
              </Form.Item>
              <Form.Item name="supplier_reference" label="Референс поставщика">
                <Input style={{ width: 180 }} />
              </Form.Item>
            </Space>
            {selectedExecutionProfile ? (
              <Space wrap size={[8, 8]} style={{ marginBottom: 12 }}>
                <Tag color={selectedExecutionProfile.mixed ? "orange" : "blue"}>
                  Incoterms: {formatIncotermsWithPlace(selectedExecutionProfile.incoterms, selectedExecutionProfile.incoterms_place) || "из профиля исполнения"}
                </Tag>
                <Tag color="default">Доставка: {selectedExecutionProfile.route_type || "из профиля"}</Tag>
                <Tag color="default">Валюта: {selectedExecutionProfile.currency || "из профиля"}</Tag>
              </Space>
            ) : null}
            {requiresShipmentGroup ? (
              <Alert
                type="warning"
                showIcon
                style={{ marginBottom: 12 }}
                message="У поставщика несколько групп поставки"
                description="Создайте отдельный заказ по каждой группе, чтобы не смешивать разные Incoterms, валюты или маршруты в одном заказе."
              />
            ) : null}
            <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
              Incoterms, пункт Incoterms, тип доставки и валюта наследуются из утверждённого профиля исполнения и не вводятся повторно вручную.
            </Typography.Paragraph>
            <Button type="primary" htmlType="submit" loading={creating} disabled={!canManagePurchaseOrders || requiresShipmentGroup}>
              Создать заказ
            </Button>
          </Form>
        ) : (
          <Typography.Text type="secondary">
            Форма создания скрыта, чтобы обзор выпущенных заказов оставался главным рабочим режимом экрана.
          </Typography.Text>
        )}
      </Card>

      <Drawer
        title="Справка по вкладке «Заказы поставщикам»"
        placement="right"
        width={460}
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
      >
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Typography.Paragraph>
            Здесь закупщик выпускает заказ поставщику только после того, как продавец и клиент закончили торг и
            по RFQ появился подписанный контракт.
          </Typography.Paragraph>
          <Typography.Paragraph>
            Источник для заказа теперь не весь исходный выбор закупки, а утвержденная коммерческая ревизия:
            исключённые строки не попадают в заказ, а количество берётся из согласованного коммерческого
            объема.
          </Typography.Paragraph>
          <Typography.Paragraph>
            Если у одного поставщика в утвержденном выборе получилось несколько разных профилей исполнения
            или консолидационных групп, их нужно оформлять отдельными заказами. Система больше не должна
            смешивать в одном заказе разные `Incoterms`, профили доставки или несовместимые группы.
          </Typography.Paragraph>
          <Typography.Paragraph style={{ marginBottom: 0 }}>
            Если позже по поставке появляется задержка, рекламация или иное отклонение, событие качества
            лучше фиксировать прямо из заказа поставщику или по его строке в карточке поставщика.
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

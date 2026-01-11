import React, { useCallback, useEffect, useMemo, useState } from "react"
import { Table, Space, Tag, Button, Tooltip, Typography, message, Alert } from "antd"
import { FileTextOutlined } from "@ant-design/icons"
import axios from "@/api/axiosInstance"
import OfferModal from "./OfferModal"

const { Text } = Typography

const UOM_LABELS = {
  pcs: "шт",
  kg: "кг",
  set: "компл.",
}

const ITEM_STATUS_META = {
  open: { color: "default", label: "Открыта" },
  sourcing: { color: "processing", label: "В подборе" },
  proposed: { color: "blue", label: "Предложена" },
  approved: { color: "success", label: "Утверждена" },
  rejected: { color: "error", label: "Отклонена" },
  rework: { color: "orange", label: "Доработка" },
}

const itemRowKey = (r) =>
  r.id || r.local_id || `${r.original_part_id}_${r.line_number || ""}`

const summarizeOffers = (record) => {
  const offers = Array.isArray(record.offers) ? record.offers : []
  const total = offers.length
  const visible = offers.filter(
    (o) => o.client_visible || o.status === "proposed" || o.status === "approved",
  ).length
  const approved = offers.filter((o) => o.status === "approved").length
  return { total, visible, approved }
}

const getOfferStage = (record) => {
  const { total, visible, approved } = summarizeOffers(record)
  if (record.decision_offer_id || approved > 0) {
    return {
      label: "Выбран",
      color: "success",
      className: "order-item-stage-approved",
    }
  }
  if (visible > 0) {
    return {
      label: "На согласовании",
      color: "processing",
      className: "order-item-stage-proposed",
    }
  }
  if (total > 0) {
    return {
      label: "В подборе",
      color: "orange",
      className: "order-item-stage-sourcing",
    }
  }
  return {
    label: "Нет офферов",
    color: "default",
    className: "order-item-stage-empty",
  }
}

export default function OrderInlinePanel({
  orderId,
  onOpenOrder,
}) {
  const [order, setOrder] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [offerModalOpen, setOfferModalOpen] = useState(false)
  const [offerItem, setOfferItem] = useState(null)

  const loadDetail = useCallback(async () => {
    if (!orderId) return
    setLoading(true)
    try {
      const { data } = await axios.get(`/client-orders/${orderId}`)
      setOrder(data?.order || null)
      setItems(Array.isArray(data?.items) ? data.items : [])
    } catch (e) {
      console.error("load order inline error", e)
      message.error("Не удалось загрузить заказ")
    } finally {
      setLoading(false)
    }
  }, [orderId])

  useEffect(() => {
    loadDetail()
  }, [loadDetail])

  const openOfferModal = (record) => {
    setOfferItem(record)
    setOfferModalOpen(true)
  }

  const closeOfferModal = () => {
    setOfferModalOpen(false)
    setOfferItem(null)
  }

  const getUomLabel = useCallback((uom) => {
    if (!uom) return ""
    const normalized = String(uom).toLowerCase()
    return UOM_LABELS[normalized] || uom
  }, [])

  const columns = useMemo(
    () => [
      {
        title: "Позиция",
        dataIndex: "cat_number",
        width: 180,
        render: (v, r) =>
          v || r.original_part_number || r.original_part_id || "—",
      },
      {
        title: "Описание",
        dataIndex: "description_ru",
        ellipsis: true,
        render: (v, r) =>
          v || r.description_en || r.client_description || "—",
      },
      {
        title: "Кол-во",
        dataIndex: "requested_qty",
        width: 150,
        render: (v, r) => (
          <Space size={6}>
            <Text>{v ?? "—"}</Text>
            <Text type="secondary">{getUomLabel(r.uom)}</Text>
          </Space>
        ),
      },
      {
        title: "Статус",
        dataIndex: "status",
        width: 140,
        render: (v) => {
          const meta = ITEM_STATUS_META[v] || {
            color: "default",
            label: v || "—",
          }
          return <Tag color={meta.color}>{meta.label}</Tag>
        },
      },
      {
        title: "Офферы",
        key: "offers",
        width: 220,
        render: (_, record) => {
          const summary = summarizeOffers(record)
          const stage = getOfferStage(record)
          return (
            <Space size={6} wrap>
              <Tag color={stage.color}>{stage.label}</Tag>
              <Tooltip title="Показано клиенту / всего">
                <Text type="secondary">
                  {summary.visible}/{summary.total || 0}
                </Text>
              </Tooltip>
            </Space>
          )
        },
      },
      {
        title: "",
        key: "actions",
        width: 70,
        render: (_, record) => (
          <Button
            size="small"
            icon={<FileTextOutlined />}
            onClick={() => openOfferModal(record)}
            disabled={!record?.id}
          />
        ),
      },
    ],
    [getUomLabel],
  )

  return (
    <div className="order-inline-panel">
      <Space
        align="center"
        style={{ width: "100%", justifyContent: "space-between" }}
      >
        <Space align="center" size={12}>
          <Text strong>
            Заказ {order?.order_number ? `№${order.order_number}` : `#${orderId}`}
          </Text>
          <Text type="secondary">Позиции: {items.length}</Text>
        </Space>
        <Space>
          <Button size="small" onClick={loadDetail} loading={loading}>
            Обновить
          </Button>
          {onOpenOrder && (
            <Button size="small" type="primary" onClick={onOpenOrder}>
              Открыть заказ
            </Button>
          )}
        </Space>
      </Space>

      <Text type="secondary" style={{ display: "block", marginTop: 8 }}>
        Редактирование позиций и офферов выполняется в карточке заказа.
      </Text>
      <Alert
        type="info"
        showIcon
        message="Где открыть офферы"
        description="Нажмите кнопку с иконкой документа в строке позиции, чтобы открыть и выбрать офферы."
        style={{ marginTop: 12 }}
      />

      <Table
        rowKey={itemRowKey}
        size="small"
        className="op-table order-inline-table"
        columns={columns}
        dataSource={items}
        tableLayout="fixed"
        style={{ width: "100%" }}
        pagination={false}
        loading={loading}
        rowClassName={(record) => getOfferStage(record).className}
      />
      <OfferModal
        open={offerModalOpen}
        onClose={closeOfferModal}
        item={offerItem ? { ...offerItem, order_currency: order?.currency } : null}
        canEditOffers
        canSelect
        onOffersUpdated={loadDetail}
        inline
      />
    </div>
  )
}

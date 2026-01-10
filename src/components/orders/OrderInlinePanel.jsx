import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  Table,
  Space,
  Tag,
  Button,
  Tooltip,
  Typography,
  message,
  Input,
  InputNumber,
} from "antd"
import { DeleteOutlined } from "@ant-design/icons"
import axios from "@/api/axiosInstance"
import confirmAction from "@/utils/confirmAction"
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
  viewRole,
  onOpenOrder,
  resetToken,
}) {
  const [order, setOrder] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [expandedRowKeys, setExpandedRowKeys] = useState([])
  const [quickQty, setQuickQty] = useState(1)
  const [quickAdding, setQuickAdding] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [qtyDrafts, setQtyDrafts] = useState({})

  const viewAsRole = (viewRole || "").toLowerCase()
  const canEditOffers =
    viewAsRole === "komplektovshchik" ||
    viewAsRole === "komplektovshik" ||
    viewAsRole === "комплектовщик" ||
    viewAsRole === "admin"
  const canSelectOffer =
    viewAsRole === "prodavec" ||
    viewAsRole === "продавец" ||
    canEditOffers ||
    viewAsRole === "admin"

  const loadDetail = useCallback(async () => {
    if (!orderId) return
    setLoading(true)
    try {
      const { data } = await axios.get(`/client-orders/${orderId}`)
      setOrder(data?.order || null)
      setItems(Array.isArray(data?.items) ? data.items : [])
      setExpandedRowKeys([])
      setQtyDrafts({})
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

  const getUomLabel = useCallback((uom) => {
    if (!uom) return ""
    const normalized = String(uom).toLowerCase()
    return UOM_LABELS[normalized] || uom
  }, [])

  useEffect(() => {
    setSearchResults([])
    setSearchQuery("")
    setExpandedRowKeys([])
  }, [orderId, resetToken])

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
    }
  }, [searchQuery])

  const addItemByPart = async (part) => {
    if (!orderId || !part?.id) return
    const resolvedUom =
      (part.uom && String(part.uom).toLowerCase()) ||
      (part.qty_unit && String(part.qty_unit).toLowerCase()) ||
      "pcs"
    await axios.post(`/client-orders/${orderId}/items`, {
      original_part_id: part.id,
      requested_qty: quickQty || 1,
      uom: resolvedUom,
    })
  }

  const handleSearch = async () => {
    const q = searchQuery.trim()
    if (!q) {
      message.warning("Введите номер или описание")
      return
    }
    setSearchLoading(true)
    try {
      let exactAdded = false
      try {
        const { data: exact } = await axios.get("/original-parts/lookup", {
          params: { cat_number: q },
        })
        await addItemByPart(exact)
        message.success(`Позиция добавлена: ${exact?.cat_number || q}`)
        setSearchQuery("")
        setSearchResults([])
        await loadDetail()
        exactAdded = true
      } catch (lookupError) {
        const status = lookupError?.response?.status
        const isClientError = status && status < 500
        if (!isClientError) throw lookupError
      }
      if (exactAdded) return
      if (q.length < 3) {
        message.info("Введите минимум 3 символа для поиска")
        setSearchResults([])
        return
      }
      const { data } = await axios.get("/original-parts", { params: { q } })
      const rows = Array.isArray(data) ? data : []
      setSearchResults(rows)
      if (!rows.length) message.info("Ничего не найдено")
    } catch (e) {
      console.error("search originals error", e)
      message.error("Не удалось найти детали")
    } finally {
      setSearchLoading(false)
    }
  }

  const handleAddFromSearch = async (part) => {
    if (!part?.id) return
    setQuickAdding(true)
    try {
      await addItemByPart(part)
      message.success(`Позиция добавлена: ${part.cat_number || part.id}`)
      setSearchResults([])
      setSearchQuery("")
      await loadDetail()
    } catch (e) {
      console.error("add search item error", e)
      message.error("Не удалось добавить позицию")
    } finally {
      setQuickAdding(false)
    }
  }

  const handleDeleteItem = useCallback(async (record) => {
    if (!record?.id) return
    const { confirmed } = await confirmAction("Удалить позицию из заказа?")
    if (!confirmed) return
    setDeletingId(record.id)
    try {
      await axios.delete(`/client-orders/items/${record.id}`)
      message.success("Позиция удалена")
      await loadDetail()
    } catch (e) {
      console.error("delete order item error", e)
      message.error("Не удалось удалить позицию")
    } finally {
      setDeletingId(null)
    }
  }, [loadDetail])

  const handleUpdateQty = useCallback(
    async (record, nextValue) => {
      if (!record?.id) return
      const qtyNum = Number(nextValue)
      if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
        message.warning("Количество должно быть > 0")
        setQtyDrafts((prev) => ({ ...prev, [record.id]: record.requested_qty }))
        return
      }
      if (qtyNum === Number(record.requested_qty)) return
      try {
        await axios.put(`/client-orders/items/${record.id}`, {
          requested_qty: qtyNum,
        })
        message.success("Количество обновлено")
        await loadDetail()
      } catch (e) {
        console.error("update qty error", e)
        message.error("Не удалось обновить количество")
      }
    },
    [loadDetail],
  )

  const isRowExpandable = (record) => !!record.id && !!orderId

  const isRowExpanded = (record) =>
    expandedRowKeys.includes(itemRowKey(record))

  const toggleRowExpanded = (record) => {
    const key = itemRowKey(record)
    setExpandedRowKeys((prev) => (prev.includes(key) ? [] : [key]))
  }

  const handleRowExpand = (expanded, record) => {
    const key = itemRowKey(record)
    setExpandedRowKeys((prev) =>
      expanded ? [key] : prev.filter((k) => k !== key),
    )
  }

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
          <div className="order-inline-qty">
            <InputNumber
              min={1}
              value={
                qtyDrafts[r.id] !== undefined ? qtyDrafts[r.id] : r.requested_qty
              }
              onChange={(val) =>
                setQtyDrafts((prev) => ({ ...prev, [r.id]: val }))
              }
              onBlur={(e) => handleUpdateQty(r, e.target.value)}
              onPressEnter={(e) => handleUpdateQty(r, e.target.value)}
              style={{ width: 80 }}
            />
            <Text type="secondary" className="order-inline-uom">
              {getUomLabel(r.uom)}
            </Text>
          </div>
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
          const canExpand = isRowExpandable(record)
          if (!canExpand) {
            return <Text type="secondary">Сохраните позицию</Text>
          }
          return (
            <Space size={6} wrap>
              <Tag color={stage.color}>{stage.label}</Tag>
              <Tooltip title="Показано клиенту / всего">
                <Text type="secondary">
                  {summary.visible}/{summary.total || 0}
                </Text>
              </Tooltip>
              <Button
                size="small"
                type="link"
                disabled={!canExpand}
                onClick={() => toggleRowExpanded(record)}
              >
                {isRowExpanded(record)
                  ? "Свернуть"
                  : summary.total
                    ? `Офферы (${summary.total})`
                    : "Подобрать"}
              </Button>
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
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteItem(record)}
            loading={deletingId === record.id}
            disabled={!record.id}
          />
        ),
      },
    ],
    [expandedRowKeys, orderId, handleDeleteItem, deletingId, qtyDrafts, handleUpdateQty, getUomLabel],
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

      <Space wrap align="center" style={{ width: "100%" }}>
        <Input
          placeholder="Поиск по номеру или описанию"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onPressEnter={handleSearch}
          style={{ width: 320 }}
        />
        <InputNumber
          min={1}
          value={quickQty}
          onChange={(val) => setQuickQty(val || 1)}
          style={{ width: 120 }}
        />
        <Button
          type="primary"
          onClick={handleSearch}
          loading={searchLoading}
        >
          Найти / добавить
        </Button>
        {searchResults.length > 0 && (
          <Text type="secondary">
            Найдено: {searchResults.length}
          </Text>
        )}
        <Text type="secondary">
          Точное совпадение добавится сразу, иначе покажем список.
        </Text>
      </Space>

      {searchResults.length > 0 && (
        <Table
          rowKey="id"
          size="small"
          className="op-table order-inline-search-table"
          dataSource={searchResults}
          tableLayout="fixed"
          style={{ width: "100%" }}
          pagination={{ pageSize: 5, showSizeChanger: false }}
          columns={[
            {
              title: "Позиция",
              dataIndex: "cat_number",
              width: 180,
              render: (v) => v || "—",
            },
            {
              title: "Описание",
              dataIndex: "description_ru",
              ellipsis: true,
              render: (v, r) =>
                v || r.description_en || r.tech_description || "—",
            },
            {
              title: "Модель / Производитель",
              dataIndex: "model_name",
              width: 220,
              render: (_, r) =>
                r.model_name || r.manufacturer_name
                  ? `${r.manufacturer_name || ""} ${r.model_name || ""}`.trim()
                  : "—",
            },
            {
              title: "",
              key: "act",
              width: 140,
              render: (_, r) => (
                <Button
                  size="small"
                  onClick={() => handleAddFromSearch(r)}
                  loading={quickAdding}
                >
                  Добавить
                </Button>
              ),
            },
          ]}
        />
      )}

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
        expandable={{
          showExpandColumn: false,
          expandIcon: () => null,
          expandIconColumnIndex: -1,
          indentSize: 0,
          expandedRowKeys,
          onExpand: handleRowExpand,
          rowExpandable: isRowExpandable,
          expandedRowRender: (record) =>
            record.id ? (
              <div className="offer-inline-shell">
                <div style={{ marginBottom: 8 }}>
                  <Text strong>
                    Позиция {record.line_number || record.id} •{" "}
                    {record.cat_number || record.original_part_number || "—"}
                  </Text>
                </div>
                <OfferModal
                  inline
                  open
                  item={{
                    ...record,
                    order_currency:
                      order?.currency || record?.order_currency || null,
                  }}
                  canEditOffers={canEditOffers}
                  canSelect={canSelectOffer}
                  onOffersUpdated={loadDetail}
                />
              </div>
            ) : (
              <div className="offer-inline-shell">
                <Text type="secondary">
                  Сохраните заказ и позицию, чтобы добавить офферы.
                </Text>
              </div>
            ),
        }}
      />
    </div>
  )
}

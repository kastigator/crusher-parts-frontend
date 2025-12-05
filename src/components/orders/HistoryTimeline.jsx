import React, { useMemo, useState } from "react"
import { Timeline, Tag, Space, Checkbox, Button, Typography, Divider, Tooltip } from "antd"
import dayjs from "dayjs"
import { InfoCircleOutlined } from "@ant-design/icons"

const TYPE_COLORS = {
  order_status_change: "blue",
  item_status_change: "orange",
  offer_status_change: "cyan",
  offer_added: "green",
  item_added: "green",
  item_deleted: "red",
  order_created: "blue",
  offer_selected: "success",
}

const TYPE_LABELS = {
  order_status_change: "Статус заказа",
  item_status_change: "Статус позиции",
  offer_status_change: "Статус оффера",
  offer_added: "Оффер добавлен",
  item_added: "Позиция добавлена",
  item_deleted: "Позиция удалена",
  order_created: "Заказ создан",
  offer_selected: "Оффер выбран",
}

const { Text } = Typography

const summarizeEvent = (e) => {
  const payload = e.payload || {}
  const line = e.order_item_id ? `Позиция #${e.order_item_id}` : null
  const offerCode = [payload.supplier_public_code, payload.supplier_part_number].filter(Boolean).join(" · ")
  switch (e.type) {
    case "order_status_change":
      return `${line ? line + " · " : ""}Статус заказа: ${e.from_status || "—"} → ${e.to_status || "—"}`
    case "item_status_change":
      return `${line || "Позиция"}: ${e.from_status || "—"} → ${e.to_status || "—"}`
    case "offer_status_change":
      return `Оффер: ${offerCode || "—"} · ${e.from_status || "—"} → ${e.to_status || "—"}`
    case "offer_added": {
      const price = payload.client_price || payload.supplier_price
      const cur = payload.client_currency || payload.supplier_currency
      const priceStr = price != null ? `${price} ${cur || ""}` : ""
      const route = payload.logistics_route_name || payload.logistics_route_id
      const eta = payload.eta_days_effective || payload.lead_time_days
      const etaStr = eta != null ? ` · ETA ${eta} дн.` : ""
      const routeStr = route ? ` · Маршрут: ${route}` : ""
      return `Оффер добавлен: ${offerCode || "—"}${priceStr ? " · " + priceStr : ""}${routeStr}${etaStr}`
    }
    case "offer_selected":
      return `Оффер выбран: ${offerCode || payload.offer_id || "—"}`
    case "item_added":
      return `${line || "Позиция"} добавлена · Кол-во: ${payload.qty || payload.requested_qty || "—"}`
    case "item_deleted":
      return `${line || "Позиция"} удалена`
    case "order_created":
      return `Заказ создан · № ${payload.order_number || e.order_number || ""}`
    default:
      return TYPE_LABELS[e.type] || e.type
  }
}

export default function HistoryTimeline({ events = [] }) {
  if (!events.length) {
    return <div style={{ color: "#999" }}>История пуста</div>
  }

  const [visibleTypes, setVisibleTypes] = useState(() => new Set(events.map((e) => e.type)))
  const [showPayload, setShowPayload] = useState(false)

  const typeOptions = useMemo(() => {
    const uniq = Array.from(new Set(events.map((e) => e.type)))
    return uniq.map((t) => ({
      label: TYPE_LABELS[t] || t,
      value: t,
      color: TYPE_COLORS[t] || "default",
    }))
  }, [events])

  const filtered = events.filter((e) => visibleTypes.has(e.type))

  const toggleType = (value, checked) => {
    setVisibleTypes((prev) => {
      const next = new Set(prev)
      if (checked) next.add(value)
      else next.delete(value)
      return next
    })
  }

  return (
    <div>
      <Space wrap align="center" style={{ marginBottom: 12 }}>
        <Text strong>Фильтр событий:</Text>
        {typeOptions.map((opt) => (
          <Checkbox
            key={opt.value}
            checked={visibleTypes.has(opt.value)}
            onChange={(e) => toggleType(opt.value, e.target.checked)}
          >
            <Tag color={opt.color} style={{ marginRight: 6 }}>
              {opt.label}
            </Tag>
          </Checkbox>
        ))}
        <Divider type="vertical" />
        <Checkbox checked={showPayload} onChange={(e) => setShowPayload(e.target.checked)}>
          Показывать JSON
        </Checkbox>
        <Tooltip title="Процент — наценка от себестоимости, фикс — после процента">
          <InfoCircleOutlined style={{ color: "#999" }} />
        </Tooltip>
      </Space>

      <Timeline
        items={filtered.map((e) => ({
          color: TYPE_COLORS[e.type] || "gray",
          children: (
            <div>
              <div style={{ marginBottom: 4 }}>
                <Tag color={TYPE_COLORS[e.type] || "default"}>{TYPE_LABELS[e.type] || e.type}</Tag>
                {e.from_status && <Tag color="default">из: {e.from_status}</Tag>}
                {e.to_status && <Tag color="success">в: {e.to_status}</Tag>}
                {e.order_item_id && <Tag color="purple">Позиция #{e.order_item_id}</Tag>}
                {e.offer_id && <Tag color="cyan">Оффер #{e.offer_id}</Tag>}
              </div>
              <div style={{ color: "#555", marginBottom: 4 }}>
                {e.user_name || "Неизвестно"} — {dayjs(e.created_at).format("YYYY-MM-DD HH:mm:ss")}
              </div>
              <div style={{ marginBottom: 6 }}>{summarizeEvent(e)}</div>
              {showPayload && e.payload ? (
                <pre
                  style={{
                    marginTop: 6,
                    background: "#f6f6f6",
                    padding: 8,
                    borderRadius: 6,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {typeof e.payload === "string"
                    ? e.payload
                    : JSON.stringify(e.payload, null, 2)}
                </pre>
              ) : null}
            </div>
          ),
        }))}
      />
    </div>
  )
}

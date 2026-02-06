import React, { useEffect, useMemo, useState } from "react"
import { Timeline, Tag, Space, Checkbox, Button, Typography, Divider, Tooltip, Empty } from "antd"
import dayjs from "dayjs"
import { DownloadOutlined, InfoCircleOutlined } from "@ant-design/icons"
import { formatPriceWithCurrency } from "@/utils/priceFormat"

const TYPE_COLORS = {
  order_status_change: "blue",
  item_status_change: "orange",
  offer_status_change: "cyan",
  offer_added: "green",
  item_added: "green",
  item_deleted: "red",
  order_created: "blue",
  offer_selected: "success",
  offer_deleted: "red",
  order_deleted: "red",
  contract_created: "purple",
  contract_updated: "purple",
  contract_deleted: "red",
  contract_generated: "purple",
  contract_file_uploaded: "purple",
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
  offer_deleted: "Оффер удалён",
  order_deleted: "Заказ удалён",
  contract_created: "Контракт создан",
  contract_updated: "Контракт обновлён",
  contract_deleted: "Контракт удалён",
  contract_generated: "Контракт сформирован",
  contract_file_uploaded: "Контракт загружен",
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
      const priceStr = price != null ? formatPriceWithCurrency(price, cur || "", { empty: "" }) : ""
      const route = payload.logistics_route_name || payload.logistics_route_id
      const eta = payload.eta_days_effective || payload.lead_time_days
      const etaStr = eta != null ? ` · ETA ${eta} дн.` : ""
      const routeStr = route ? ` · Маршрут: ${route}` : ""
      return `Оффер добавлен: ${offerCode || "—"}${priceStr ? " · " + priceStr : ""}${routeStr}${etaStr}`
    }
    case "offer_selected":
      return `Оффер выбран: ${offerCode || payload.offer_id || "—"}`
    case "offer_deleted":
      return `Оффер удалён: ${offerCode || payload.offer_id || "—"}`
    case "item_added":
      return `${line || "Позиция"} добавлена · Кол-во: ${payload.qty || payload.requested_qty || "—"}`
    case "item_deleted":
      return `${line || "Позиция"} удалена`
    case "order_created":
      return `Заказ создан · № ${payload.order_number || e.order_number || ""}`
    case "order_deleted":
      return `Заказ удалён · № ${payload.order_number || e.order_number || ""}`
    case "contract_created":
      return `Контракт создан: ${payload.contract_number || payload.contract_id || "—"}`
    case "contract_updated":
      return `Контракт обновлён: ${payload.contract_number || payload.contract_id || "—"}`
    case "contract_deleted":
      return `Контракт удалён: ${payload.contract_number || payload.contract_id || "—"}`
    case "contract_generated":
      return `Контракт сформирован: ${payload.contract_number || payload.contract_id || "—"}`
    case "contract_file_uploaded":
      return `Контракт загружен: ${payload.contract_number || payload.contract_id || "—"}`
    default:
      return TYPE_LABELS[e.type] || e.type
  }
}

export default function HistoryTimeline({ events = [] }) {
  const [visibleTypes, setVisibleTypes] = useState(() => new Set(events.map((e) => e.type)))
  const [showPayload, setShowPayload] = useState(false)

  useEffect(() => {
    setVisibleTypes(new Set(events.map((e) => e.type)))
  }, [events])

  const typeOptions = useMemo(() => {
    const uniq = Array.from(new Set(events.map((e) => e.type)))
    return uniq.map((t) => ({
      label: TYPE_LABELS[t] || t,
      value: t,
      color: TYPE_COLORS[t] || "default",
    }))
  }, [events])

  const filtered = events.filter((e) => visibleTypes.has(e.type))

  const escapeCsv = (value) => {
    const str = value == null ? "" : String(value)
    if (str.includes("\"")) {
      return `"${str.replace(/\"/g, "\"\"")}"`
    }
    if (str.includes(";") || str.includes("\n")) {
      return `"${str}"`
    }
    return str
  }

  const exportCSV = () => {
    const header = [
      "Дата",
      "Пользователь",
      "Тип",
      "Описание",
      "Позиция",
      "Оффер",
      "Payload",
    ]
    const rows = filtered.map((e) => [
      e.created_at ? dayjs(e.created_at).format("YYYY-MM-DD HH:mm:ss") : "",
      e.user_name || "",
      TYPE_LABELS[e.type] || e.type,
      summarizeEvent(e),
      e.order_item_id || "",
      e.offer_id || "",
      e.payload ? (typeof e.payload === "string" ? e.payload : JSON.stringify(e.payload)) : "",
    ])
    const csv = [header, ...rows]
      .map((row) => row.map(escapeCsv).join(";"))
      .join("\n")

    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `order_events_${Date.now()}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const toggleType = (value, checked) => {
    setVisibleTypes((prev) => {
      const next = new Set(prev)
      if (checked) next.add(value)
      else next.delete(value)
      return next
    })
  }

  if (!events.length) {
    return <Empty description="История пуста" />
  }

  return (
    <div>
      <Space wrap align="center" style={{ marginBottom: 12, justifyContent: "space-between", width: "100%" }}>
        <Space wrap align="center">
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
        <Button icon={<DownloadOutlined />} onClick={exportCSV}>
          Скачать CSV
        </Button>
      </Space>

      {filtered.length === 0 ? (
        <Empty description="Нет событий по фильтру" />
      ) : (
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
      )}
    </div>
  )
}

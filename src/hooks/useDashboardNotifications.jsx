import { useCallback, useEffect, useRef } from "react"
import { Tag, Space, Button, Typography } from "antd"
import axios from "@/api/axiosInstance"
import { appMessage as message, appNotification as notification } from "@/utils/uiFeedback"

const { Text } = Typography

const EVENT_LABELS = {
  order_created: "Новый заказ",
  offer_selected: "Согласован оффер",
  offer_status_change: "Согласован оффер",
}

const EVENTS_POLL_INTERVAL_MS = 30000
const CLIENT_ORDERS_ENABLED = false

export default function useDashboardNotifications() {
  const lastEventRef = useRef({ at: null, id: 0 })

  const openOrderById = useCallback((orderId) => {
    if (!orderId) return
    message.info("Легаси-модуль client orders удалён из текущей конфигурации")
  }, [])

  const fetchEvents = useCallback(async () => {
    const last = lastEventRef.current
    if (!last?.at) {
      lastEventRef.current.at = new Date().toISOString()
      lastEventRef.current.id = 0
      return
    }
    try {
      const { data } = await axios.get("/dashboard/events", {
        params: { after: last.at, after_id: last.id },
      })
      const events = Array.isArray(data?.events) ? data.events : []
      if (!events.length) return

      const latest = events[events.length - 1]
      if (latest?.created_at) {
        lastEventRef.current.at = new Date(latest.created_at).toISOString()
        lastEventRef.current.id = latest.id || last.id
      }

      notification.open({
        message: `Новые события (${events.length})`,
        description: (
          <Space direction="vertical" size={4}>
            {events.map((event) => (
              <Space key={event.id} size={8} wrap>
                <Tag color={event.type === "order_created" ? "blue" : "green"}>
                  {EVENT_LABELS[event.type] || event.type}
                </Tag>
                <Text>
                  Заказ {event.order_number || `#${event.order_id}`} · {event.client_company_name || "—"}
                </Text>
                <Button
                  size="small"
                  type="link"
                  onClick={() => openOrderById(event.order_id)}
                  disabled={!CLIENT_ORDERS_ENABLED}
                >
                  {CLIENT_ORDERS_ENABLED ? "Открыть" : "Недоступно"}
                </Button>
              </Space>
            ))}
          </Space>
        ),
        duration: 6,
      })
    } catch (e) {
      console.error("dashboard events error", e)
    }
  }, [openOrderById])

  useEffect(() => {
    if (!lastEventRef.current.at) {
      lastEventRef.current.at = new Date().toISOString()
      lastEventRef.current.id = 0
    }
    const eventsTimer = setInterval(fetchEvents, EVENTS_POLL_INTERVAL_MS)
    return () => clearInterval(eventsTimer)
  }, [fetchEvents])
}

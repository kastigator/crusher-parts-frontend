import { useEffect, useRef } from "react"
import { notification, Tag, Space, Button, Typography } from "antd"
import { useNavigate } from "react-router-dom"
import axios from "@/api/axiosInstance"

const { Text } = Typography

const EVENT_LABELS = {
  order_created: "Новый заказ",
  offer_selected: "Согласован оффер",
  offer_status_change: "Согласован оффер",
}

const EVENTS_POLL_INTERVAL_MS = 30000

export default function useDashboardNotifications() {
  const navigate = useNavigate()
  const lastEventRef = useRef({ at: null, id: 0 })

  const openOrderById = (orderId) => {
    if (!orderId) return
    navigate(`/client-orders?orderId=${encodeURIComponent(orderId)}`)
  }

  const fetchEvents = async () => {
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
                >
                  Открыть
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
  }

  useEffect(() => {
    if (!lastEventRef.current.at) {
      lastEventRef.current.at = new Date().toISOString()
      lastEventRef.current.id = 0
    }
    const eventsTimer = setInterval(fetchEvents, EVENTS_POLL_INTERVAL_MS)
    return () => clearInterval(eventsTimer)
  }, [])
}

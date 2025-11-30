import React from "react"
import { Timeline, Tag } from "antd"
import dayjs from "dayjs"

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

export default function HistoryTimeline({ events = [] }) {
  if (!events.length) {
    return <div style={{ color: "#999" }}>История пуста</div>
  }

  return (
    <Timeline
      items={events.map((e) => ({
        color: TYPE_COLORS[e.type] || "gray",
        children: (
          <div>
            <div style={{ marginBottom: 4 }}>
              <Tag color={TYPE_COLORS[e.type] || "default"}>{e.type}</Tag>
              {e.from_status && (
                <Tag color="default">из: {e.from_status}</Tag>
              )}
              {e.to_status && (
                <Tag color="success">в: {e.to_status}</Tag>
              )}
            </div>
            <div style={{ color: "#555" }}>
              {e.user_name || "Неизвестно"} —{" "}
              {dayjs(e.created_at).format("YYYY-MM-DD HH:mm:ss")}
            </div>
            {e.payload ? (
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
  )
}

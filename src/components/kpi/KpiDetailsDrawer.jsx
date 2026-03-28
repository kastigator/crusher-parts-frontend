import React from "react"
import { Drawer, Empty, Table, Tag, Typography } from "antd"
import { useNavigate } from "react-router-dom"

const { Text } = Typography

const STATUS_LABELS = {
  approved: "Утверждено",
  draft: "Черновик",
  sent: "Отправлено",
  sent_to_client: "Отправлено клиенту",
  internal_review: "Внутреннее согласование",
  client_approved: "Согласовано клиентом",
  contract_signed: "Контракт подписан",
  signed: "Подписан",
  in_execution: "В исполнении",
  completed: "Завершён",
  closed: "Закрыт",
  closed_with_issues: "Закрыт с замечаниями",
  open: "Открыт",
  responded: "Ответ получен",
  invited: "Приглашён",
  confirmed: "Подтверждён",
  cancelled: "Отменён",
}

const EVENT_TYPE_LABELS = {
  COMPLAINT: "Жалоба",
  DELAY: "Задержка",
  PROCESSING_RATING: "Оценка обработки",
}

const formatDate = (value) => {
  if (!value) return "—"
  const dt = new Date(value)
  if (Number.isNaN(dt.getTime())) return String(value)
  return dt.toLocaleDateString("ru-RU")
}

const formatNumber = (value) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return "—"
  return new Intl.NumberFormat("ru-RU").format(num)
}

const formatMoney = (value, currency) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return "—"
  try {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: currency || "RUB",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num)
  } catch {
    return formatNumber(num)
  }
}

const formatStatus = (value) => {
  if (!value) return "—"
  return STATUS_LABELS[String(value)] || String(value)
}

const formatEventType = (value) => {
  if (!value) return "—"
  return EVENT_TYPE_LABELS[String(value)] || String(value)
}

export default function KpiDetailsDrawer({
  open,
  onClose,
  title,
  loading,
  rows,
  type,
  currency = "RUB",
}) {
  const navigate = useNavigate()

  const openWorkspaceObject = (row) => {
    if (!row?.workspace) return
    if (row.workspace === "client_request" && row.client_request_id) {
      const params = new URLSearchParams({
        request_id: String(row.client_request_id),
      })
      if (row.workspace_tab) params.set("tab", row.workspace_tab)
      onClose?.()
      navigate(`/client-request-workspace?${params.toString()}`)
      return
    }
    if (row.workspace === "rfq" && row.rfq_id) {
      const params = new URLSearchParams({
        rfq_id: String(row.rfq_id),
      })
      if (row.workspace_tab) params.set("tab", row.workspace_tab)
      onClose?.()
      navigate(`/rfq-workspace?${params.toString()}`)
    }
  }

  const columns = [
    {
      title: "Дата",
      dataIndex: "event_date",
      width: 120,
      render: (value) => formatDate(value),
    },
    {
      title: "Объект",
      dataIndex: "title",
      render: (_, row) => (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {row.workspace ? (
            <button
              type="button"
              onClick={() => openWorkspaceObject(row)}
              style={{
                padding: 0,
                border: 0,
                background: "none",
                color: "#1677ff",
                textAlign: "left",
                cursor: "pointer",
                font: "inherit",
              }}
            >
              {row.title || "—"}
            </button>
          ) : (
            <span>{row.title || "—"}</span>
          )}
          {row.subtitle ? (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {row.subtitle}
            </Text>
          ) : null}
        </div>
      ),
    },
    {
      title: "Статус",
      dataIndex: "status",
      width: 180,
      render: (value) => (value ? <Tag>{formatStatus(value)}</Tag> : "—"),
    },
  ]

  if (type === "sales_contracts") {
    columns.push({
      title: "Сумма",
      dataIndex: "amount",
      width: 160,
      align: "right",
      render: (_, row) => formatMoney(row.amount, row.currency || currency),
    })
  }

  if (type === "procurement_landed") {
    columns.push({
      title: "Сумма",
      dataIndex: "landed_amount_normalized",
      width: 180,
      align: "right",
      render: (_, row) =>
        formatMoney(
          row.landed_amount_normalized ?? row.landed_total,
          row.landed_amount_normalized != null ? currency : row.calc_currency || currency,
        ),
    })
  }

  if (type === "quality_events") {
    columns.splice(2, 0, {
      title: "Тип",
      dataIndex: "event_type",
      width: 170,
      render: (value) => formatEventType(value),
    })
    columns.push({
      title: "Важность",
      dataIndex: "severity",
      width: 110,
      align: "right",
      render: (value) => formatNumber(value),
    })
  }

  return (
    <Drawer
      title={title}
      width={900}
      open={open}
      onClose={onClose}
      destroyOnHidden
    >
      {Array.isArray(rows) && rows.length ? (
        <Table
          rowKey={(row) => `${row.id}-${row.event_date || ""}`}
          loading={loading}
          columns={columns}
          dataSource={rows}
          pagination={{ pageSize: 20, hideOnSinglePage: true }}
          scroll={{ x: 800 }}
          size="small"
        />
      ) : (
        <Empty description={loading ? "Загрузка..." : "Нет данных за выбранный период"} />
      )}
    </Drawer>
  )
}

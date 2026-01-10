import React, { useEffect, useMemo, useState, useCallback } from "react"
import {
  Card,
  Space,
  message,
  Table,
  Tag,
  Select,
  DatePicker,
  Button,
  Tooltip,
  Badge,
} from "antd"
import dayjs from "dayjs"
import {
  ReloadOutlined,
  PlusOutlined,
  EyeOutlined,
  FilePdfOutlined,
} from "@ant-design/icons"
import ActionButtons from "@/components/common/ActionButtons"
import axios from "@/api/axiosInstance"
import TableToolbar from "@/components/common/TableToolbar"
import confirmAction from "@/utils/confirmAction"
import { useAuth } from "@/auth/AuthContext"
import FullHistoryDialog from "@/components/common/FullHistoryDialog"
import OrderDrawer from "./OrderDrawer"
import OrderInlinePanel from "./OrderInlinePanel"
import createTablePagination from "@/utils/tablePagination"
import ProposalPreviewModal from "./ProposalPreviewModal"

const ORDER_STATUS_META = {
  draft: { color: "default", label: "Черновик" },
  new: { color: "blue", label: "Новый" },
  submitted: { color: "processing", label: "Отправлен" },
  confirmed: { color: "success", label: "Подтверждён" },
  rework: { color: "orange", label: "Доработка" },
  cancelled: { color: "error", label: "Отменён" },
}

const VIEW_AS_OPTIONS = [
  { value: "actual", label: "Мои права" },
  { value: "prodavec", label: "Просмотр как: Продавец" },
  { value: "komplektovshchik", label: "Просмотр как: Комплектовщик" },
]

const getRoleSlug = (user) =>
  (user?.role_slug || user?.role || "").toString().toLowerCase()

export default function ClientOrdersMain() {
  const { user } = useAuth()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState(null)
  const [dateFrom, setDateFrom] = useState(null)
  const [dateTo, setDateTo] = useState(null)
  const [selected, setSelected] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [viewAs, setViewAs] = useState("actual")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [deletingId, setDeletingId] = useState(null)
  const [proposalOpen, setProposalOpen] = useState(false)
  const [proposalOrder, setProposalOrder] = useState(null)
  const [proposalItems, setProposalItems] = useState([])
  const [proposalLoading, setProposalLoading] = useState(false)
  const [expandedOrderId, setExpandedOrderId] = useState(null)
  const [inlineResetToken, setInlineResetToken] = useState(0)
  const [historyForId, setHistoryForId] = useState(null)

  const roleSlug = getRoleSlug(user)
  const isAdmin = useMemo(
    () =>
      !!(
        user &&
        (roleSlug === "admin" || user.role_id === 1 || user.is_admin === true)
      ),
    [user, roleSlug],
  )

  const appliedRole = useMemo(() => {
    if (!isAdmin || viewAs === "actual") return roleSlug
    return viewAs // slug из опции
  }, [roleSlug, isAdmin, viewAs])

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, pageSize }
      if (statusFilter) params.status = statusFilter
      if (search.trim()) params.search = search.trim()
      if (dateFrom) params.created_from = dateFrom.format("YYYY-MM-DD")
      if (dateTo) params.created_to = dateTo.format("YYYY-MM-DD")

      const { data } = await axios.get("/client-orders", { params })
      const rows = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data)
          ? data
          : []
      setOrders(rows)
      const pg = data?.pagination
      if (pg) {
        setPage(pg.page || 1)
        setPageSize(pg.pageSize || pageSize)
        setTotal(pg.total || rows.length)
      } else {
        setTotal(rows.length)
      }
    } catch (err) {
      console.error("Ошибка загрузки заказов:", err)
      message.error("Не удалось загрузить заказы")
    } finally {
      setLoading(false)
    }
  }, [statusFilter, search, dateFrom, dateTo, page, pageSize])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  useEffect(() => {
    if (!expandedOrderId) return
    const exists = orders.some((o) => o.id === expandedOrderId)
    if (!exists) setExpandedOrderId(null)
  }, [orders, expandedOrderId])

  const handleOpenCreate = () => {
    setSelected(null)
    setDrawerOpen(true)
  }

  const handleRowOpen = (record) => {
    setSelected(record)
    setDrawerOpen(true)
  }

  const handleRowClick = (record) => (event) => {
    const target = event.target
    if (
      target.closest(".ant-table-row-expand-icon") ||
      target.closest(".ant-table-row-expand-icon-cell") ||
      target.closest("button") ||
      target.closest("a")
    ) {
      return
    }
    handleRowOpen(record)
  }

  const handleDelete = async (order) => {
    const { confirmed } = await confirmAction("Удалить заказ?")
    if (!confirmed) return
    setDeletingId(order.id)
    try {
      await axios.delete(`/client-orders/${order.id}`)
      setOrders((prev) => prev.filter((o) => o.id !== order.id))
      message.success("Заказ удалён")
    } catch (err) {
      console.error("Ошибка удаления заказа", err)
      const msg = err?.response?.data?.message || "Не удалось удалить заказ"
      message.error(msg)
    } finally {
      setDeletingId(null)
    }
  }

  const handleOpenProposal = async (order) => {
    if (!order?.id) return
    setProposalLoading(true)
    try {
      const { data } = await axios.get(`/client-orders/${order.id}`)
      setProposalOrder(data?.order || null)
      setProposalItems(Array.isArray(data?.items) ? data.items : [])
      setProposalOpen(true)
    } catch (e) {
      console.error("load proposal error", e)
      message.error("Не удалось открыть предложение")
    } finally {
      setProposalLoading(false)
    }
  }

  const columns = useMemo(
    () => [
      {
        title: "№",
        dataIndex: "order_number",
        key: "order_number",
        width: 150,
        render: (v) => v || "—",
      },
      {
        title: "Заказ клиента",
        dataIndex: "client_po_number",
        key: "client_po_number",
        width: 160,
        render: (v) => v || "—",
      },
      {
        title: "Клиент",
        dataIndex: "client_company_name",
        key: "client_company_name",
        ellipsis: true,
        render: (_, r) =>
          r.client_company_name ||
          (r.client_id ? `Клиент #${r.client_id}` : "—"),
      },
      {
        title: "Статус",
        dataIndex: "status",
        key: "status",
        width: 140,
        render: (v) => {
          const meta = ORDER_STATUS_META[v] || { color: "default", label: v || "—" }
          return <Tag color={meta.color}>{meta.label}</Tag>
        },
      },
      {
        title: "Желаемая дата",
        dataIndex: "requested_delivery_date",
        width: 140,
        render: (v) => (v ? String(v).slice(0, 10) : "—"),
      },
      {
        title: "Создан",
        dataIndex: "created_at",
        width: 160,
        render: (v) => (v ? String(v).replace("T", " ").slice(0, 19) : "—"),
      },
      {
        title: "Ответственный",
        dataIndex: "responsible_name",
        width: 180,
        render: (_, r) =>
          r.responsible_name
            ? r.responsible_name
            : r.responsible_user_id
              ? `#${r.responsible_user_id}`
              : "—",
      },
      {
        title: "Комментарий",
        dataIndex: "comment_internal",
        ellipsis: true,
        render: (v, r) =>
          v || r.comment_client ? (
            <Tooltip title={v || r.comment_client}>
              <Badge color="blue" text={v || r.comment_client} />
            </Tooltip>
          ) : (
            "—"
          ),
      },
      {
        title: "Действия",
        key: "actions",
        width: 110,
        render: (_, record) => (
          <div onClick={(e) => e.stopPropagation()}>
            <ActionButtons
              size="small"
              onHistory={() => setHistoryForId(record.id)}
              onDelete={() => handleDelete(record)}
              loadingDelete={deletingId === record.id}
              titles={{ delete: "Удалить", history: "История изменений" }}
              extraButtons={[
                {
                  key: "proposal",
                  label: "Предложение",
                  icon: <EyeOutlined />,
                  type: "text",
                  showText: false,
                  onClick: () => handleOpenProposal(record),
                },
              ]}
            />
          </div>
        ),
      },
    ],
    [handleDelete, deletingId],
  )

  const filtered = useMemo(() => {
    // серверный фильтр, но оставим лёгкий клиентский
    const q = search.trim().toLowerCase()
    if (!q) return orders
    return orders.filter((o) => {
      return (
        String(o.order_number || "").toLowerCase().includes(q) ||
        String(o.client_company_name || "").toLowerCase().includes(q) ||
        String(o.comment_internal || "").toLowerCase().includes(q) ||
        String(o.comment_client || "").toLowerCase().includes(q)
      )
    })
  }, [orders, search])

  const pagination = useMemo(
    () =>
      createTablePagination({
        page,
        pageSize,
        total,
        setPage,
        setPageSize,
      }),
    [page, pageSize, total],
  )

  return (
    <Space direction="vertical" style={{ width: "100%" }} size={16}>
      <Card
        size="small"
        title={null}
        extra={
          <Space>
            {isAdmin && (
              <Select
                size="small"
                value={viewAs}
                onChange={setViewAs}
                options={VIEW_AS_OPTIONS}
                style={{ width: 200 }}
              />
            )}
            <Button icon={<ReloadOutlined />} onClick={fetchOrders}>
              Обновить
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleOpenCreate}
            >
              Новый заказ
            </Button>
          </Space>
        }
      >
        <Space
          style={{ width: "100%", marginBottom: 12 }}
          align="center"
          wrap
        >
          <TableToolbar
            title={null}
            search={search}
            onSearch={setSearch}
            onAdd={null}
          />
          <Select
            allowClear
            placeholder="Статус"
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 160 }}
            options={Object.entries(ORDER_STATUS_META).map(([value, meta]) => ({
              value,
              label: meta.label,
            }))}
          />
          <DatePicker
            placeholder="Создан с"
            value={dateFrom}
            onChange={setDateFrom}
          />
          <DatePicker
            placeholder="Создан до"
            value={dateTo}
            onChange={setDateTo}
          />
        </Space>

        <Table
          size="small"
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={filtered}
          pagination={pagination}
          className="op-table"
          onRow={(record) => ({
            onClick: handleRowClick(record),
            style: { cursor: "pointer" },
          })}
          rowClassName={(record) => {
            const classes = ["clickable-row"]
            if (expandedOrderId && record.id === expandedOrderId) {
              classes.push("ant-table-row-selected", "op-row-expanded")
            }
            return classes.join(" ")
          }}
          expandable={{
            expandedRowKeys: expandedOrderId ? [expandedOrderId] : [],
            onExpand: (expanded, record) => {
              setExpandedOrderId(expanded ? record.id : null)
              setInlineResetToken((prev) => prev + 1)
            },
            expandedRowRender: (record) => (
              <div className="subtable-shell table-section">
                <OrderInlinePanel
                  orderId={record.id}
                  viewRole={appliedRole}
                  onOpenOrder={() => handleRowOpen(record)}
                  resetToken={inlineResetToken}
                />
              </div>
            ),
          }}
        />
      </Card>

      <OrderDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        orderId={selected?.id || null}
        initialOrder={selected}
        onSaved={fetchOrders}
        viewRole={appliedRole}
      />

      <ProposalPreviewModal
        open={proposalOpen}
        onClose={() => setProposalOpen(false)}
        order={proposalOrder}
        items={proposalItems}
        viewRole={appliedRole}
      />

      {historyForId != null && (
        <FullHistoryDialog
          entityType="client_orders"
          entityId={historyForId}
          onClose={() => setHistoryForId(null)}
        />
      )}
    </Space>
  )
}

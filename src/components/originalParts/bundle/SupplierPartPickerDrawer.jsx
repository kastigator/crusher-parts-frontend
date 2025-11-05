import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Drawer, Table, Space, Input, Button, Tag, Tooltip, Empty, message } from "antd"
import { SearchOutlined, CheckOutlined, CloseOutlined } from "@ant-design/icons"
import axios from "@/api/axiosInstance"

/**
 * Пикер деталей поставщика:
 * - глобальный поиск по всем поставщикам (по номеру/описанию)
 * - мультивыбор и возврат выбранных строк через onPick(rows)
 *
 * Props:
 *  - open: boolean
 *  - onClose: () => void
 *  - onPick: (rows) => void
 */
export default function SupplierPartPickerDrawer({ open, onClose, onPick }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [q, setQ] = useState("")
  const [selectedRowKeys, setSelectedRowKeys] = useState([])
  const [selectedRows, setSelectedRows] = useState([])

  const abortRef = useRef(null)
  const timerRef = useRef(null)

  const fetchList = useCallback(async () => {
    if (!open) return
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setLoading(true)
    try {
      // без supplier_id — глобальный поиск по всем поставщикам
      const params = { q: q?.trim() || undefined, page_size: 50, page: 1 }
      const { data } = await axios.get("/supplier-parts", { params, signal: ctrl.signal })
      const list = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []
      setRows(list)

      // синхронизируем выделение, если какие-то ключи выпали из результата
      if (selectedRowKeys.length) {
        const setIds = new Set(list.map((r) => r.id))
        const keep = selectedRowKeys.filter((id) => setIds.has(id))
        setSelectedRowKeys(keep)
        setSelectedRows((prev) => prev.filter((r) => setIds.has(r.id)))
      }
    } catch (e) {
      if (e?.name !== "CanceledError" && e?.code !== "ERR_CANCELED") {
        console.error(e)
        message.error("Не удалось загрузить детали поставщиков")
      }
    } finally {
      setLoading(false)
    }
  }, [open, q, selectedRowKeys])

  useEffect(() => {
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(fetchList, 250)
    return () => clearTimeout(timerRef.current)
  }, [fetchList])

  useEffect(() => {
    if (!open) {
      setQ("")
      setRows([])
      setSelectedRowKeys([])
      setSelectedRows([])
      abortRef.current?.abort()
    }
  }, [open])

  const columns = useMemo(
    () => [
      {
        title: "Поставщик",
        dataIndex: "supplier_name",
        width: 220,
        render: (v) => v || "—",
      },
      {
        title: "№ у пост.",
        dataIndex: "supplier_part_number",
        width: 180,
        render: (v) => (v ? <Tooltip title={v}>{v}</Tooltip> : "—"),
      },
      {
        title: "Описание",
        dataIndex: "description",
        ellipsis: true,
        render: (v) => v || "—",
      },
      {
        title: "Последняя цена",
        dataIndex: "latest_price",
        width: 140,
        align: "right",
        render: (v, r) => (v ? `${Number(v).toFixed(2)} ${r.latest_currency || ""}` : <Tag>нет</Tag>),
      },
      {
        title: "Дата",
        dataIndex: "latest_price_date",
        width: 130,
        render: (v) => (v ? new Date(v).toLocaleDateString() : "—"),
      },
    ],
    []
  )

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys, selRows) => {
      setSelectedRowKeys(keys)
      setSelectedRows(selRows)
    },
  }

  const header = (
    <Space style={{ width: "100%", justifyContent: "space-between" }}>
      <Input
        allowClear
        style={{ width: 360 }}
        placeholder="Поиск по номеру/описанию…"
        prefix={<SearchOutlined />}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        disabled={!open}
      />
      <Space>
        <Button onClick={onClose} icon={<CloseOutlined />}>
          Отмена
        </Button>
        <Button
          type="primary"
          icon={<CheckOutlined />}
          disabled={!selectedRowKeys.length}
          onClick={() => onPick?.(selectedRows)}
        >
          Выбрать ({selectedRowKeys.length})
        </Button>
      </Space>
    </Space>
  )

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Выбрать детали поставщиков"
      width={980}
      destroyOnClose
      bodyStyle={{ padding: 12 }}
      footer={null}
    >
      {header}
      <div style={{ marginTop: 12 }}>
        {!rows.length && !loading ? (
          <Empty description={q ? "Ничего не найдено" : "Начните с поиска"} />
        ) : (
          <Table
            rowKey="id"
            className="op-table"
            columns={columns}
            dataSource={rows}
            loading={loading}
            pagination={{ pageSize: 50 }}
            size="middle"
            tableLayout="fixed"
            rowSelection={rowSelection}
            scroll={{ x: true, y: "calc(100vh - 360px)" }}
            onRow={(record) => ({
              onDoubleClick: () => {
                setSelectedRowKeys([record.id])
                setSelectedRows([record])
              },
            })}
          />
        )}
      </div>
    </Drawer>
  )
}

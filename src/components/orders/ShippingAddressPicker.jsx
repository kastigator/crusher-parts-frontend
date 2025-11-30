import React, { useEffect, useState, useRef } from "react"
import { Drawer, Table, Input, Button, Space, message } from "antd"
import axios from "@/api/axiosInstance"

export default function ShippingAddressPicker({
  open,
  onClose,
  clientId,
  onPick,
}) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [selectedId, setSelectedId] = useState(null)
  const abortRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => load(), 250)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, search, clientId])

  useEffect(() => {
    if (!open) {
      setRows([])
      setSelectedId(null)
      setSearch("")
    }
  }, [open])

  const load = async () => {
    if (!clientId) return
    abortRef.current?.abort?.()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setLoading(true)
    try {
      const params = { client_id: clientId }
      if (search.trim()) params.q = search.trim()
      const { data } = await axios.get("/client-shipping-addresses", {
        params,
        signal: ctrl.signal,
      })
      setRows(Array.isArray(data) ? data : [])
    } catch (e) {
      const name = e?.name || e?.code
      if (name !== "AbortError" && name !== "ERR_CANCELED") {
        console.error(e)
        message.error("Не удалось загрузить адреса доставки")
      }
    } finally {
      setLoading(false)
    }
  }

  const onConfirm = () => {
    const picked = rows.find((r) => r.id === selectedId)
    if (picked) onPick?.(picked)
    onClose?.()
  }

  const columns = [
    {
      title: "Адрес",
      dataIndex: "formatted_address",
      ellipsis: true,
    },
    {
      title: "Комментарий",
      dataIndex: "comment",
      ellipsis: true,
    },
  ]

  return (
    <Drawer
      title="Выбрать адрес доставки"
      open={open}
      onClose={onClose}
      width={1000}
      destroyOnClose
      extra={
        <Space>
          <Button onClick={onClose}>Отмена</Button>
          <Button type="primary" disabled={!selectedId} onClick={onConfirm}>
            Выбрать
          </Button>
        </Space>
      }
    >
      <Space direction="vertical" style={{ width: "100%" }} size="middle">
        <Input.Search
          allowClear
          placeholder="Поиск по адресу/комментарию"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onSearch={(v) => setSearch(v)}
        />
        <Table
          rowKey="id"
          size="small"
          className="op-table"
          columns={columns}
          dataSource={rows}
          loading={loading}
          pagination={{ pageSize: 10 }}
          rowSelection={{
            type: "radio",
            selectedRowKeys: selectedId ? [selectedId] : [],
            onChange: (keys) => setSelectedId(keys[0]),
          }}
          onRow={(record) => ({
            onClick: () => setSelectedId(record.id),
            style: { cursor: "pointer" },
          })}
        />
      </Space>
    </Drawer>
  )
}

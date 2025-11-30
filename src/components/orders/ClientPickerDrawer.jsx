import React, { useEffect, useMemo, useRef, useState } from "react"
import { Drawer, Table, Input, Space, Button, Tooltip, Tag, message } from "antd"
import axios from "@/api/axiosInstance"

/**
 * Выбор клиента из списка.
 *
 * Props:
 *  - open: boolean
 *  - onClose: () => void
 *  - onPick: (client) => void
 */
export default function ClientPickerDrawer({ open, onClose, onPick }) {
  const [search, setSearch] = useState("")
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const abortRef = useRef(null)

  const cancelIfRunning = () => {
    try {
      abortRef.current?.abort?.()
    } catch {}
    abortRef.current = null
  }

  const load = async () => {
    cancelIfRunning()
    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    try {
      const params = { limit: 200, offset: 0 }
      if (search.trim()) params.q = search.trim()
      const { data } = await axios.get("/clients", {
        params,
        signal: controller.signal,
      })
      setRows(Array.isArray(data) ? data : [])
    } catch (e) {
      const name = e?.name || e?.code
      if (name !== "AbortError" && name !== "ERR_CANCELED") {
        console.error(e)
        message.error("Не удалось загрузить клиентов")
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!open) return
    const t = setTimeout(load, 250)
    return () => {
      clearTimeout(t)
      cancelIfRunning()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, search])

  useEffect(() => {
    if (!open) {
      setRows([])
      setSearch("")
      setSelectedId(null)
    }
  }, [open])

  const columns = useMemo(
    () => [
      {
        title: "Компания",
        dataIndex: "company_name",
        ellipsis: true,
      },
      {
        title: "Контакт",
        dataIndex: "contact_person",
        width: 160,
        ellipsis: true,
      },
      {
        title: "Телефон",
        dataIndex: "phone",
        width: 140,
        ellipsis: true,
      },
      {
        title: "Email",
        dataIndex: "email",
        width: 200,
        ellipsis: true,
      },
      {
        title: "Примечание",
        dataIndex: "notes",
        ellipsis: true,
      },
    ],
    [],
  )

  const onConfirm = () => {
    const picked = rows.find((r) => r.id === selectedId)
    if (picked) onPick?.(picked)
    onClose?.()
  }

  return (
    <Drawer
      title="Выбрать клиента"
      open={open}
      onClose={onClose}
      destroyOnClose
      width={960}
      extra={
        <Space>
          <Button onClick={onClose}>Отмена</Button>
          <Button
            type="primary"
            disabled={!selectedId}
            onClick={onConfirm}
          >
            Выбрать
          </Button>
        </Space>
      }
    >
      <Space direction="vertical" style={{ width: "100%" }} size="middle">
        <Input.Search
            allowClear
            placeholder="Поиск по названию/контактам"
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
          pagination={{ pageSize: 20 }}
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

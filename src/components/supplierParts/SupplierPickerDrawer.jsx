import React, { useEffect, useMemo, useRef, useState } from "react"
import { Drawer, Table, Space, Button, Input, message } from "antd"
import axios from "@/api/axiosInstance"

export default function SupplierPickerDrawer({ open, onClose, onPick }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [selectedRowKeys, setSelectedRowKeys] = useState([])
  const [selectedRow, setSelectedRow] = useState(null)
  const abortRef = useRef(null)
  const timerRef = useRef(null)

  const load = async (q) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    try {
      // ВАЖНО: правильный путь — /part-suppliers
      const { data } = await axios.get("/part-suppliers", {
        params: q ? { q } : {},
        signal: controller.signal,
      })
      setRows(Array.isArray(data) ? data : [])
    } catch (e) {
      const name = e?.name || e?.code
      if (name !== "AbortError" && name !== "ERR_CANCELED") {
        console.error(e)
        message.error("Не удалось загрузить поставщиков")
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!open) return
    load("")
    setSelectedRowKeys([])
    setSelectedRow(null)
    setSearch("")
    return () => abortRef.current?.abort()
  }, [open])

  // debounce поиска
  useEffect(() => {
    if (!open) return
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => load(search.trim()), 300)
    return () => clearTimeout(timerRef.current)
  }, [search, open])

  const columns = useMemo(() => [
    { title: "Компания", dataIndex: "name", ellipsis: true },
    { title: "Страна", dataIndex: "country", width: 90 },
    { title: "Контакт", dataIndex: "contact_person", ellipsis: true },
    { title: "Телефон", dataIndex: "phone", width: 140, ellipsis: true },
    { title: "Email", dataIndex: "email", width: 180, ellipsis: true },
  ], [])

  const onRowSelect = (keys, [row]) => {
    setSelectedRowKeys(keys)
    setSelectedRow(row || null)
  }

  return (
    <Drawer
      title="Выбрать поставщика"
      open={open}
      onClose={onClose}
      width={760}
      destroyOnClose
      extra={
        <Input
          allowClear
          placeholder="Найти поставщика по названию..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 280 }}
        />
      }
      footer={
        <Space style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button onClick={onClose}>Отмена</Button>
          <Button
            type="primary"
            disabled={!selectedRow}
            onClick={() => {
              if (selectedRow) onPick?.(selectedRow)
              onClose?.()
            }}
          >
            Выбрать
          </Button>
        </Space>
      }
    >
      <Table
        rowKey="id"
        dataSource={rows}
        columns={columns}
        loading={loading}
        size="middle"
        pagination={{ pageSize: 10 }}
        rowSelection={{
          type: "radio",
          selectedRowKeys,
          onChange: onRowSelect,
        }}
        onRow={(r) => ({
          onDoubleClick: () => {
            onPick?.(r)
            onClose?.()
          },
        })}
      />
    </Drawer>
  )
}

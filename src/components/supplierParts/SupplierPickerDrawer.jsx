// src/components/supplierParts/SupplierPickerDrawer.jsx
import React, { useEffect, useMemo, useRef, useState } from "react"
import { Drawer, Table, Button, Input, Space, Tooltip, Empty, message } from "antd"
import axios from "@/api/axiosInstance"

export default function SupplierPickerDrawer({
  open,
  onClose,
  onPick,
  initialSupplierId = null,
}) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedId, setSelectedId] = useState(initialSupplierId)
  const [search, setSearch] = useState("")
  const abortRef = useRef(null)

  useEffect(() => { setSelectedId(initialSupplierId ?? null) }, [initialSupplierId])

  const load = async () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    try {
      const params = {}
      if (search?.trim()) params.q = search.trim()
      const { data } = await axios.get("/part-suppliers", { params, signal: controller.signal })
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
    const t = setTimeout(load, 300)
    return () => { clearTimeout(t); abortRef.current?.abort() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const columns = useMemo(() => [
    {
      title: "Компания",
      dataIndex: "name",
      render: (text) => (
        <Tooltip title={text}>
          <span className="cell-ellipsis" style={{ display: "inline-block", maxWidth: 380 }}>
            {text}
          </span>
        </Tooltip>
      ),
    },
    { title: "Страна", dataIndex: "country", width: 80 },
    {
      title: "Контакт",
      dataIndex: "contact_person",
      render: (v) => v || "—",
      width: 180,
      ellipsis: true,
    },
    { title: "Телефон", dataIndex: "phone", render: (v) => v || "—", width: 150 },
    { title: "Email", dataIndex: "email", render: (v) => v || "—", width: 220, ellipsis: true },
  ], [])

  const pickSelected = () => {
    const picked = rows.find(r => r.id === selectedId)
    if (picked) onPick?.(picked)
  }

  return (
    <Drawer
      width={900}
      title="Выбрать поставщика"
      open={open}
      onClose={onClose}
      // Кнопка «Выбрать» в правой части заголовка — как в других наших модалках
      extra={
        <Space>
          <Button onClick={onClose}>Отмена</Button>
          <Button type="primary" disabled={!selectedId} onClick={pickSelected}>
            Выбрать
          </Button>
        </Space>
      }
      footer={null}
    >
      <Space style={{ width: "100%", marginBottom: 12 }}>
        <Input
          allowClear
          placeholder="Найти поставщика по названию…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </Space>

      <Table
        rowKey="id"
        dataSource={rows}
        loading={loading}
        columns={columns}
        locale={{ emptyText: <Empty description="Поставщики не найдены" /> }}
        pagination={{ pageSize: 10 }}
        rowSelection={{
          type: "radio",
          selectedRowKeys: selectedId ? [selectedId] : [],
          onChange: (keys) => setSelectedId(keys?.[0]),
        }}
        onRow={(record) => ({
          onClick: () => setSelectedId(record.id),
          onDoubleClick: () => { setSelectedId(record.id); pickSelected() },
        })}
      />
    </Drawer>
  )
}

import React, { useCallback, useEffect, useState } from "react"
import { Table, Tag, Space, Button, Tooltip, message, Empty } from "antd"
import { ReloadOutlined } from "@ant-design/icons"
import axios from "@/api/axiosInstance"

export default function SuppliersLinksTab({ originalPartId }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!originalPartId) return
    setLoading(true)
    try {
      // ожидается бэкенд: GET /supplier-part-originals/of-original?original_part_id=...
      const { data } = await axios.get("/supplier-part-originals/of-original", {
        params: { original_part_id: originalPartId },
      })
      setRows(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
      message.error("Не удалось загрузить связанные детали поставщиков")
    } finally {
      setLoading(false)
    }
  }, [originalPartId])

  useEffect(() => { load() }, [load])

  const columns = [
    {
      title: "Поставщик",
      dataIndex: "supplier_name",
      width: 260,
      render: (v) => v ? <Tag color="geekblue">{v}</Tag> : "—",
    },
    { title: "№ у поставщика", dataIndex: "supplier_part_number", width: 220 },
    { title: "Описание", dataIndex: "description", ellipsis: true, render: v => v || "—" },
    {
      title: "Последняя цена",
      dataIndex: "latest_price",
      width: 140,
      align: "right",
      render: (v) => v ?? "—",
    },
    {
      title: "Дата цены",
      dataIndex: "latest_price_date",
      width: 150,
      render: (v) => (v ? new Date(v).toLocaleDateString() : "—"),
    },
  ]

  if (!rows.length && !loading) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={
          <Space>
            Привязанных «деталей поставщиков» пока нет
            <Tooltip title="Обновить">
              <Button size="small" icon={<ReloadOutlined />} onClick={load} />
            </Tooltip>
          </Space>
        }
      />
    )
  }

  return (
    <>
      <Space style={{ marginBottom: 8 }}>
        <Button icon={<ReloadOutlined />} onClick={load}>Обновить</Button>
      </Space>
      <Table
        className="op-table"
        rowKey={(r) => `${r.supplier_id}:${r.supplier_part_id}`}
        dataSource={rows}
        columns={columns}
        loading={loading}
        size="small"
        pagination={{ pageSize: 8, showSizeChanger: false }}
      />
    </>
  )
}

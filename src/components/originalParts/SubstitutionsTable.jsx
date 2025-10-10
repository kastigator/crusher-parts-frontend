import React, { useEffect, useState } from "react"
import { Table, Button, message } from "antd"
import axios from "@/api/axiosInstance"
import confirmAction from "@/utils/confirmAction"

export default function SubstitutionsTable({ originalPartId }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)

  const load = async () => {
    if (!originalPartId) return
    setLoading(true)
    try {
      const { data } = await axios.get(
        `/original-part-substitutions?original_id=${originalPartId}`
      )
      setRows(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error(err)
      message.error("Не удалось загрузить замены (комплекты)")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [originalPartId])

  const deleteRow = async (rec) => {
    const { confirmed } = await confirmAction("Удалить замену?")
    if (!confirmed) return
    try {
      await axios.delete(`/original-part-substitutions/${rec.id}`)
      message.success("Удалено")
      setRows((prev) => prev.filter((r) => r.id !== rec.id)) // локальное обновление без перезагрузки
    } catch (err) {
      console.error(err)
      message.error("Ошибка удаления")
    }
  }

  const columns = [
    {
      title: "Код комплекта",
      dataIndex: "kit_code",
      width: 180,
      render: (v) => v || "—",
    },
    {
      title: "Описание",
      dataIndex: "description",
      ellipsis: true,
      render: (v) => v || "—",
    },
    {
      title: "Действия",
      key: "act",
      width: 100,
      render: (_, r) => (
        <Button danger size="small" onClick={() => deleteRow(r)}>
          Удалить
        </Button>
      ),
    },
  ]

  return (
    <div className="subtable-shell" style={{ width: "100%" }}>
      <Table
        className="op-table"
        rowKey="id"
        columns={columns}
        dataSource={rows}
        loading={loading}
        pagination={false}
        size="small"
        scroll={{ x: true }} // ✅ единый скролл при необходимости
      />
    </div>
  )
}

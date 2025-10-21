import React, { useEffect, useState } from "react"
import { Table, Button, message, Empty, Space } from "antd"
import axios from "@/api/axiosInstance"
import confirmAction from "@/utils/confirmAction"

export default function SubstitutionsTable({ originalPartId }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)

  const load = async () => {
    if (!originalPartId) {
      setRows([])
      return
    }
    setLoading(true)
    try {
      const { data } = await axios.get(`/original-part-substitutions`, {
        params: { original_id: originalPartId },
      })
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [originalPartId])

  const deleteRow = async (rec) => {
    const { confirmed } = await confirmAction("Удалить замену?")
    if (!confirmed) return
    try {
      await axios.delete(`/original-part-substitutions/${rec.id}`)
      message.success("Удалено")
      setRows((prev) => prev.filter((r) => r.id !== rec.id))
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
    <div
      className="subtable-shell"
      style={{
        width: "100%",
        minHeight: 160,      // ✅ базовая высота блока
        maxHeight: "70vh",   // ✅ ограничение по высоте для больших наборов
        overflowY: "auto",
      }}
    >
      {(!loading && rows.length === 0) ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Нет замен (комплектов)"
          style={{ margin: "24px 0" }}
        />
      ) : (
        <Table
          className="op-table"
          rowKey="id"
          columns={columns}
          dataSource={rows}
          loading={loading}
          pagination={false}
          size="small"
          scroll={{ x: "max-content" }} // ✅ стабильный горизонтальный размер
        />
      )}
    </div>
  )
}

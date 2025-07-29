import React, { useEffect, useState } from "react"
import { Modal, Table, Typography, Spin, Empty } from "antd"
import axios from "@/api/axiosInstance"
import { logSchemas } from "@/utils/logSchemas"

export default function FullHistoryDialog({ entityId, entityType, onClose }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!entityId || !entityType) return

    const fetchLogs = async () => {
      setLoading(true)
      try {
        const res = await axios.get(`/activity-logs/${entityType}/${entityId}`)
        setLogs(res.data)
      } catch (err) {
        console.error("Ошибка при загрузке логов:", err)
        setLogs([])
      } finally {
        setLoading(false)
      }
    }

    fetchLogs()
  }, [entityId, entityType])

  const schema = logSchemas[entityType] || { fields: {}, excludeFields: [] }
  const { fields, excludeFields } = schema

  const filteredLogs = logs.filter(
    (log) => !excludeFields.includes(log.field_changed)
  )

  const columns = [
    {
      title: "Поле",
      dataIndex: "field_changed",
      render: (value) => fields[value] || value || "—",
      width: 150
    },
    {
      title: "Было",
      dataIndex: "old_value",
      render: (value) => value ?? "—"
    },
    {
      title: "Стало",
      dataIndex: "new_value",
      render: (value) => value ?? "—"
    },
    {
      title: "Пользователь",
      dataIndex: "user_name",
      render: (value) => value || "—",
      width: 180
    },
    {
      title: "Дата",
      dataIndex: "created_at",
      render: (value) =>
        value ? new Date(value).toLocaleString("ru-RU") : "—",
      width: 180
    }
  ]

  return (
    <Modal
      open={!!entityId}
      onCancel={onClose}
      onOk={onClose}
      width={900}
      title="История изменений"
      okText="Закрыть"
      cancelButtonProps={{ style: { display: "none" } }}
    >
      {loading ? (
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <Spin />
        </div>
      ) : filteredLogs.length === 0 ? (
        <Empty description="Изменений не найдено" style={{ padding: "2rem" }} />
      ) : (
        <Table
          dataSource={filteredLogs}
          columns={columns}
          rowKey={(row) =>
            `${row.field_changed}-${row.created_at}-${row.user_name}`
          }
          size="small"
          pagination={false}
          bordered
        />
      )}
    </Modal>
  )
}

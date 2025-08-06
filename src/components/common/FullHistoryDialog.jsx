// src/components/common/FullHistoryDialog.jsx

import React, { useEffect, useState } from "react"
import { Modal, Table, Spin, Empty } from "antd"
import axios from "@/api/axiosInstance"
import { logSchemas } from "@/utils/logSchemas"

export default function FullHistoryDialog({
  entityId,
  entityType,
  onClose,
  onlyDeleted = false
}) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!entityType || (entityId === null && !onlyDeleted)) return

    const fetchLogs = async () => {
      setLoading(true)
      try {
        let res

        if (onlyDeleted) {
          res = await axios.get("/clients/logs/deleted")
        } else if (entityType === "clients-combined") {
          res = await axios.get(`/clients/${entityId}/logs`)
        } else {
          res = await axios.get(`/activity-logs/${entityType}/${entityId}`)
        }

        setLogs(Array.isArray(res.data) ? res.data : [])
      } catch (err) {
        console.error("Ошибка при загрузке логов:", err)
        setLogs([])
      } finally {
        setLoading(false)
      }
    }

    fetchLogs()
  }, [entityId, entityType, onlyDeleted])

  // Собираем поля и исключения
  let combinedFields = {}
  let combinedExclude = []

  if (entityType === "clients-combined") {
    const related = [
      "clients",
      "client_billing_addresses",
      "client_shipping_addresses",
      "client_bank_details"
    ]
    related.forEach((key) => {
      const schema = logSchemas[key]
      if (schema) {
        Object.assign(combinedFields, schema.fields)
        combinedExclude.push(...(schema.excludeFields || []))
      }
    })
  } else {
    const schema = logSchemas[entityType] || { fields: {}, excludeFields: [] }
    combinedFields = schema.fields
    combinedExclude = schema.excludeFields
  }

  const baseLogs = onlyDeleted
    ? logs.filter((log) => log.action === "delete")
    : logs

  const filteredLogs = baseLogs.filter(
    (log) =>
      log.action === "delete" || !combinedExclude.includes(log.field_changed)
  )

  const columns = [
    {
      title: "Поле",
      dataIndex: "field_changed",
      render: (value, record) =>
        value
          ? combinedFields[value] || value
          : record.action === "delete"
          ? "Удалено"
          : record.comment || "—",
      width: 160
    },
    {
      title: "Комментарий",
      dataIndex: "comment",
      render: (value) => value || "—",
      width: 200
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
      render: (value, row) => value || row.user_id || "—",
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
      open={onlyDeleted || !!entityId}
      onCancel={onClose}
      onOk={onClose}
      width={1000}
      title={onlyDeleted ? "Удалённые записи" : "История изменений"}
      okText="Закрыть"
      cancelButtonProps={{ style: { display: "none" } }}
    >
      {loading ? (
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <Spin />
        </div>
      ) : filteredLogs.length === 0 ? (
        <Empty
          description={
            onlyDeleted ? "Удалённых записей не найдено" : "Изменений не найдено"
          }
          style={{ padding: "2rem" }}
        />
      ) : (
        <Table
          dataSource={filteredLogs}
          columns={columns}
          rowKey={(row, index) =>
            `${row.field_changed || "deleted"}-${row.created_at}-${row.user_name || row.user_id}-${index}`
          }
          size="small"
          pagination={false}
          bordered
        />
      )}
    </Modal>
  )
}

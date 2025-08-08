// src/components/common/FullHistoryDialog.jsx
import React, { useEffect, useState } from "react"
import { Modal, Table, Spin, Empty, Tag } from "antd"
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
    if (!entityType || (entityId == null && !onlyDeleted)) return

    const fetchLogs = async () => {
      setLoading(true)
      try {
        let res
        if (onlyDeleted) {
          res = await axios.get("/clients/logs/deleted")
        } else if (entityType === "clients-combined") {
          // сервер уже вернёт логи клиента + все связанные сущности
          res = await axios.get(`/clients/${entityId}/logs`)
        } else {
          // точечная история по конкретной сущности
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

  // Человеческие названия сущностей для колонки "Сущность"
  const entityLabels = {
    clients: "Клиент",
    client_billing_addresses: "Юр. адрес",
    client_shipping_addresses: "Адрес доставки",
    client_bank_details: "Банковские реквизиты",
    tnved_code: "ТН ВЭД"
  }

  // Технические поля, которые не несут смысла для пользователя
  const TECH_FIELDS = new Set(["id", "created_at", "updated_at", "client_id", "entity_id", "user_id"])

  // Аккуратно подписываем поле по схеме конкретной сущности строки
  const labelForField = (record) => {
    const schema = logSchemas[record?.entity_type]
    const nice = schema?.fields?.[record?.field_changed]
    if (nice) return nice

    // Если поле не указано (create/delete без конкретного поля)
    if (!record?.field_changed) {
      if (record?.action === "delete") return "Удаление"
      if (record?.action === "create") return "Создание"
      return record?.comment || "—"
    }
    // Фоллбэк — показать сырое имя поля
    return record.field_changed
  }

  // Фильтрация: показываем всё, кроме чисто технических полей (для update).
  const base = onlyDeleted ? logs.filter((l) => l.action === "delete") : logs
  const filteredLogs = base.filter((log) => {
    if (!log) return false
    if (log.action === "create" || log.action === "delete") return true
    // update
    if (!log.field_changed) return false
    if (TECH_FIELDS.has(log.field_changed)) return false
    return true
  })

  const columns = [
    {
      title: "Сущность",
      dataIndex: "entity_type",
      width: 170,
      render: (val) => entityLabels[val] || val
    },
    {
      title: "Действие",
      dataIndex: "action",
      width: 110,
      render: (val) => {
        const mapColor = { create: "green", update: "blue", delete: "red" }
        return <Tag color={mapColor[val] || "default"}>{val}</Tag>
      }
    },
    {
      title: "Поле",
      dataIndex: "field_changed",
      width: 220,
      render: (_val, record) => labelForField(record)
    },
    {
      title: "Было",
      dataIndex: "old_value",
      render: (v) => (v === null || v === undefined || v === "" ? "—" : String(v))
    },
    {
      title: "Стало",
      dataIndex: "new_value",
      render: (v) => (v === null || v === undefined || v === "" ? "—" : String(v))
    },
    {
      title: "Комментарий",
      dataIndex: "comment",
      width: 260,
      render: (v) => v || "—"
    },
    {
      title: "Пользователь",
      dataIndex: "user_name",
      width: 180,
      render: (v, row) => v || row.user_id || "—"
    },
    {
      title: "Дата",
      dataIndex: "created_at",
      width: 180,
      render: (value) => (value ? new Date(value).toLocaleString("ru-RU") : "—")
    }
  ]

  return (
    <Modal
      open={onlyDeleted || !!entityId}
      onCancel={onClose}
      onOk={onClose}
      width={1100}
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
          description={onlyDeleted ? "Удалённых записей не найдено" : "Изменений не найдено"}
          style={{ padding: "2rem" }}
        />
      ) : (
        <Table
          dataSource={filteredLogs}
          columns={columns}
          rowKey={(row, i) => row.id || `${row.entity_type}-${row.entity_id}-${row.action}-${row.field_changed || "action"}-${row.created_at || i}`}
          size="small"
          pagination={false}
          bordered
        />
      )}
    </Modal>
  )
}

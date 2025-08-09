// src/components/tnved/TnvedCodesTable.jsx
import React, { useState } from "react"
import { Table, Input, message } from "antd"
import ActionButtons from "@/components/common/ActionButtons"
import confirmAction from "@/utils/confirmAction"
import FullHistoryDialog from "@/components/common/FullHistoryDialog"
import VersionConflictModal from "@/components/common/VersionConflictModal"

const { TextArea } = Input

export default function TnvedCodesTable({
  data,
  loading,
  onUpdate,
  onDelete,
  // необязательные, но полезные колбэки для точечного обновления
  onReplaceRow, // (freshRow) => void
  onRefresh, // () => void
}) {
  const [editingKey, setEditingKey] = useState("")
  const [editedRow, setEditedRow] = useState(null)
  const [logId, setLogId] = useState(null)

  // состояние конфликта версий
  const [conflict, setConflict] = useState({
    open: false,
    current: null, // свежая запись с сервера
    draft: null,   // наши несохранённые правки
  })

  const isEditing = (record) => record.id === editingKey

  const startEdit = (record) => {
    setEditingKey(record.id)
    // важно: сохраняем version
    setEditedRow({ ...record })
  }

  const cancelEdit = () => {
    setEditingKey("")
    setEditedRow(null)
  }

  const saveEdit = async () => {
    try {
      // Передаём всё, включая version — родитель в onUpdate сделает PUT с version
      await onUpdate(editingKey, { ...editedRow })
      message.success("Изменения сохранены")
      cancelEdit()
    } catch (err) {
      // Специальные флаги приходят из axiosInstance
      if (err?.isDuplicateKey) {
        return message.error("Код уже существует")
      }
      if (err?.isVersionConflict) {
        setConflict({ open: true, current: err.currentRecord || null, draft: editedRow })
        return
      }
      console.error("Ошибка сохранения:", err)
      message.error("Не удалось сохранить изменения")
    }
  }

  const handleDelete = async (record) => {
    const { confirmed } = await confirmAction(`Удалить код ${record.code}?`)
    if (!confirmed) return

    try {
      await onDelete(record) // родитель сам передаст ?version=record.version при DELETE
      message.success("Запись удалена")
    } catch (err) {
      if (err?.isVersionConflict) {
        // Обновим строку, если сервер прислал свежую
        if (err.currentRecord && typeof onReplaceRow === "function") {
          onReplaceRow(err.currentRecord)
        } else if (typeof onRefresh === "function") {
          onRefresh()
        }
        return message.warning("Запись изменилась и не была удалена. Обновили данные.")
      }
      console.error("Ошибка удаления:", err)
      message.error("Не удалось удалить запись")
    }
  }

  const columns = [
    {
      title: "Код",
      dataIndex: "code",
      width: 140,
      render: (_, record) =>
        isEditing(record) ? (
          <Input
            value={editedRow.code}
            onChange={(e) => setEditedRow({ ...editedRow, code: e.target.value })}
            onPressEnter={saveEdit}
          />
        ) : (
          record.code || ""
        ),
    },
    {
      title: "Описание",
      dataIndex: "description",
      width: 360,
      render: (_, record) =>
        isEditing(record) ? (
          <TextArea
            value={editedRow.description || ""}
            onChange={(e) =>
              setEditedRow({ ...editedRow, description: e.target.value })
            }
            autoSize={{ minRows: 2, maxRows: 6 }}
          />
        ) : (
          record.description
            ? record.description.slice(0, 100) +
              (record.description.length > 100 ? "…" : "")
            : ""
        ),
    },
    {
      title: "Пошлина (%)",
      dataIndex: "duty_rate",
      width: 140,
      render: (_, record) =>
        isEditing(record) ? (
          <Input
            value={editedRow.duty_rate}
            type="number"
            onChange={(e) =>
              setEditedRow({ ...editedRow, duty_rate: e.target.value })
            }
            onPressEnter={saveEdit}
          />
        ) : (
          record.duty_rate ?? ""
        ),
    },
    {
      title: "Примечания",
      dataIndex: "notes",
      width: 260,
      render: (_, record) =>
        isEditing(record) ? (
          <TextArea
            value={editedRow.notes || ""}
            onChange={(e) => setEditedRow({ ...editedRow, notes: e.target.value })}
            autoSize={{ minRows: 2, maxRows: 4 }}
          />
        ) : (
          record.notes
            ? record.notes.slice(0, 80) + (record.notes.length > 80 ? "…" : "")
            : ""
        ),
    },
    {
      title: "Действия",
      dataIndex: "actions",
      width: 200,
      render: (_, record) => {
        const editing = isEditing(record)
        return (
          <ActionButtons
            onEdit={!editing ? () => startEdit(record) : undefined}
            onSave={editing ? saveEdit : undefined}
            onCancel={editing ? cancelEdit : undefined}
            onDelete={!editing ? () => handleDelete(record) : undefined}
            onHistory={!editing ? () => setLogId(record.id) : undefined}
            size="small"
          />
        )
      },
    },
  ]

  return (
    <>
      <div style={{ overflowX: "auto" }}>
        <Table
          dataSource={data}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          bordered
          size="small"
          onRow={(record) => ({
            onDoubleClick: () => startEdit(record),
          })}
          expandable={{
            expandedRowRender: (record) => (
              <div style={{ whiteSpace: "pre-wrap", padding: "8px 24px" }}>
                <b>Описание:</b> {record.description || "—"}
                <br />
                <b>Примечания:</b> {record.notes || "—"}
              </div>
            ),
          }}
        />
      </div>

      {logId && (
        <FullHistoryDialog
          entityId={logId}
          entityType="tnved_code"
          onClose={() => setLogId(null)}
        />
      )}

      <VersionConflictModal
        open={conflict.open}
        onReload={() => {
          if (conflict.current && typeof onReplaceRow === "function") {
            onReplaceRow(conflict.current)
          } else if (typeof onRefresh === "function") {
            onRefresh()
          } else {
            message.info("Обновите список — запись изменилась")
          }
          setConflict({ open: false, current: null, draft: null })
          cancelEdit()
        }}
        onManualMerge={() => {
          // пример: перенести черновые правки в свежую запись и снова открыть редактирование
          const base = conflict.current || {}
          const draft = conflict.draft || {}
          const merged = {
            ...base,
            description: draft.description ?? base.description,
            duty_rate: draft.duty_rate ?? base.duty_rate,
            notes: draft.notes ?? base.notes,
            // код лучше не перетирать автоматически
          }
          if (merged.id) {
            // открыть редактирование на слитой версии
            setEditingKey(merged.id)
            setEditedRow(merged)
          }
          setConflict({ open: false, current: null, draft: null })
        }}
        onCancel={() => setConflict({ open: false, current: null, draft: null })}
      />
    </>
  )
}

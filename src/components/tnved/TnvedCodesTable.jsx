// src/components/tnved/TnvedCodesTable.jsx

import React, { useState, useMemo } from "react"
import { Table, Input, InputNumber, message } from "antd"
import ActionButtons from "@/components/common/ActionButtons"
import confirmAction from "@/utils/confirmAction"
import FullHistoryDialog from "@/components/common/FullHistoryDialog"
import VersionConflictModal from "@/components/common/VersionConflictModal"
import createTablePagination from "@/utils/tablePagination"

const { TextArea } = Input

export default function TnvedCodesTable({
  data,
  loading,
  onUpdate,
  onDelete,
  onReplaceRow, // (freshRow) => void
  onRefresh, // () => void
}) {
  const [editingKey, setEditingKey] = useState("")
  const [editedRow, setEditedRow] = useState(null)
  const [logId, setLogId] = useState(null)

  const [conflict, setConflict] = useState({
    open: false,
    current: null,
    draft: null,
  })

  // локальная пагинация (данные уже все на клиенте)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const isEditing = (record) => record.id === editingKey

  const startEdit = (record) => {
    setEditingKey(record.id)
    setEditedRow({ ...record }) // важно сохранить version
  }

  const cancelEdit = () => {
    setEditingKey("")
    setEditedRow(null)
  }

  const saveEdit = async () => {
    try {
      await onUpdate(editingKey, { ...editedRow }) // version внутри editedRow
      // успех показывается родителем (TnvedCodesMain)
      cancelEdit()
    } catch (err) {
      if (err?.isDuplicateKey) {
        return message.error(
          "Запись с таким кодом и описанием уже существует"
        )
      }
      if (err?.isVersionConflict) {
        setConflict({
          open: true,
          current: err.currentRecord || null,
          draft: editedRow,
        })
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
      await onDelete(record) // родитель добавит ?version= и покажет сообщение об успехе
    } catch (err) {
      if (err?.isVersionConflict) {
        if (err.currentRecord && typeof onReplaceRow === "function") {
          onReplaceRow(err.currentRecord)
        } else if (typeof onRefresh === "function") {
          onRefresh()
        }
        return message.warning(
          "Запись изменилась и не была удалена. Обновили данные."
        )
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
            onChange={(e) =>
              setEditedRow({ ...editedRow, code: e.target.value })
            }
            onPressEnter={saveEdit}
            onBlur={saveEdit}
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
              setEditedRow({
                ...editedRow,
                description: e.target.value,
              })
            }
            autoSize={{ minRows: 2, maxRows: 6 }}
            onBlur={saveEdit}
          />
        ) : record.description ? (
          record.description.slice(0, 100) +
          (record.description.length > 100 ? "…" : "")
        ) : (
          ""
        ),
    },
    {
      title: "Пошлина (%)",
      dataIndex: "duty_rate",
      width: 140,
      render: (_, record) =>
        isEditing(record) ? (
          <InputNumber
            value={editedRow.duty_rate}
            step={0.01}
            style={{ width: "100%" }}
            onChange={(v) =>
              setEditedRow({ ...editedRow, duty_rate: v })
            }
            onPressEnter={saveEdit}
            onBlur={saveEdit}
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
            onChange={(e) =>
              setEditedRow({ ...editedRow, notes: e.target.value })
            }
            autoSize={{ minRows: 2, maxRows: 4 }}
            onBlur={saveEdit}
          />
        ) : record.notes ? (
          record.notes.slice(0, 80) +
          (record.notes.length > 80 ? "…" : "")
        ) : (
          ""
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
            // редактирование — только по двойному клику (см. onRow ниже)
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

  // ===== пагинация — общий helper, как в деталях поставщиков =====
  const pagination = useMemo(
    () =>
      createTablePagination({
        page,
        pageSize,
        total: Array.isArray(data) ? data.length : 0,
        setPage,
        setPageSize,
      }),
    [page, pageSize, data]
  )

  return (
    <>
      <div style={{ overflowX: "auto" }}>
        <Table
          className="op-table"
          dataSource={data}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={pagination}
          bordered
          size="small"
          onRow={(record) => ({
            onDoubleClick: () => startEdit(record),
          })}
          expandable={{
            expandedRowRender: (record) => (
              <div
                style={{
                  whiteSpace: "pre-wrap",
                  padding: "8px 24px",
                }}
              >
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
          entityType="tnved_codes"
          onClose={() => setLogId(null)}
        />
      )}

      <VersionConflictModal
        open={conflict.open}
        draft={conflict.draft}
        current={conflict.current}
        fields={[
          { key: "code", title: "Код" },
          { key: "description", title: "Описание" },
          {
            key: "duty_rate",
            title: "Пошлина (%)",
            format: (v) =>
              (v ?? "") === "" ? "—" : String(v),
          },
          { key: "notes", title: "Примечания" },
        ]}
        onReload={() => {
          if (conflict.current && typeof onReplaceRow === "function")
            onReplaceRow(conflict.current)
          else if (typeof onRefresh === "function") onRefresh()
          else message.info("Обновите список — запись изменилась")
          setConflict({ open: false, current: null, draft: null })
          cancelEdit()
        }}
        onManualMerge={() => {
          const base = conflict.current || {}
          const draft = conflict.draft || {}
          const merged = {
            ...base,
            description: draft.description ?? base.description,
            duty_rate: draft.duty_rate ?? base.duty_rate,
            notes: draft.notes ?? base.notes,
          }
          if (merged.id) {
            setEditingKey(merged.id)
            setEditedRow(merged)
          }
          setConflict({ open: false, current: null, draft: null })
        }}
        onCancel={() =>
          setConflict({ open: false, current: null, draft: null })
        }
      />
    </>
  )
}

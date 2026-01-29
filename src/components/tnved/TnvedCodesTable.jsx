// src/components/tnved/TnvedCodesTable.jsx

import React, { useMemo, useRef, useState } from "react"
import { Table, Input, InputNumber, message } from "antd"
import ActionButtons from "@/components/common/ActionButtons"
import confirmAction from "@/utils/confirmAction"
import FullHistoryDialog from "@/components/common/FullHistoryDialog"
import VersionConflictModal from "@/components/common/VersionConflictModal"
import createTablePagination from "@/utils/tablePagination"
import ValueDisplay from "@/components/common/ValueDisplay"
import { mergeConflictDraft } from "@/utils/versionConflict"
import useTableScrollHints from "@/utils/useTableScrollHints"

const { TextArea } = Input

export default function TnvedCodesTable({
  data,
  loading,
  onUpdate,
  onDelete,
  onReplaceRow,
  onRefresh,
}) {
  const wrapRef = useRef(null)
  const [editingKey, setEditingKey] = useState("")
  const [editedRow, setEditedRow] = useState(null)
  const [logId, setLogId] = useState(null)

  const [conflict, setConflict] = useState({
    open: false,
    current: null,
    draft: null,
  })

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const scrollHints = useTableScrollHints(wrapRef, [data, loading, page, pageSize])

  const isEditing = (record) => record.id === editingKey

  const startEdit = (record) => {
    if (editingKey && editingKey !== record.id) {
      message.warning("Сначала сохраните или отмените текущие изменения")
      return
    }
    setEditingKey(record.id)
    setEditedRow({ ...record })
  }

  const cancelEdit = () => {
    setEditingKey("")
    setEditedRow(null)
  }

  const saveEdit = async () => {
    try {
      await onUpdate(editingKey, { ...editedRow })
      cancelEdit()
    } catch (err) {
      if (err?.isDuplicateKey) {
        return message.error("Код уже существует")
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
      message.error("Не удалось сохранить строку")
    }
  }

  const handleDelete = async (record) => {
    const { confirmed } = await confirmAction(`Удалить код ${record.code}?`)
    if (!confirmed) return
    try {
      await onDelete(record)
    } catch (err) {
      if (err?.isVersionConflict) {
        if (err.currentRecord && typeof onReplaceRow === "function") {
          onReplaceRow(err.currentRecord)
        } else if (typeof onRefresh === "function") {
          onRefresh()
        }
        return message.warning(
          "Строка изменилась и не была удалена. Обновите данные.",
        )
      }
      console.error("Ошибка удаления:", err)
      message.error("Не удалось удалить строку")
    }
  }

  const columns = [
    {
      title: "Код",
      dataIndex: "code",
      width: 140,
      fixed: "left",
      ellipsis: true,
      render: (_, record) =>
        isEditing(record) ? (
          <Input
            value={editedRow.code}
            onChange={(e) =>
              setEditedRow({ ...editedRow, code: e.target.value })
            }
            onPressEnter={saveEdit}
            onKeyDown={(e) => {
              if (e.key === "Escape") cancelEdit()
            }}
          />
        ) : (
          <ValueDisplay value={record.code} />
        ),
    },
    {
      title: "Описание",
      dataIndex: "description",
      width: 360,
      ellipsis: true,
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
            onKeyDown={(e) => {
              if (e.key === "Escape") cancelEdit()
            }}
          />
        ) : (
          <ValueDisplay value={record.description} />
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
            onKeyDown={(e) => {
              if (e.key === "Escape") cancelEdit()
            }}
          />
        ) : (
          <ValueDisplay value={record.duty_rate} />
        ),
    },
    {
      title: "Примечание",
      dataIndex: "notes",
      width: 260,
      ellipsis: true,
      render: (_, record) =>
        isEditing(record) ? (
          <TextArea
            value={editedRow.notes || ""}
            onChange={(e) =>
              setEditedRow({ ...editedRow, notes: e.target.value })
            }
            autoSize={{ minRows: 2, maxRows: 4 }}
            onKeyDown={(e) => {
              if (e.key === "Escape") cancelEdit()
            }}
          />
        ) : (
          <ValueDisplay value={record.notes} />
        ),
    },
    {
      title: "Действия",
      dataIndex: "actions",
      width: 220,
      render: (_, record) => {
        const editing = isEditing(record)
        return (
          <ActionButtons
            onEdit={!editing ? () => startEdit(record) : undefined}
            onSave={editing ? saveEdit : undefined}
            onCancel={editing ? cancelEdit : undefined}
            onDelete={!editing ? () => handleDelete(record) : undefined}
            onHistory={!editing ? () => setLogId(record.id) : undefined}
            disabledEdit={!!editingKey && !editing}
            disabledDelete={!!editingKey && !editing}
            size="small"
          />
        )
      },
    },
  ]

  const pagination = useMemo(
    () =>
      createTablePagination({
        page,
        pageSize,
        total: Array.isArray(data) ? data.length : 0,
        setPage,
        setPageSize,
      }),
    [page, pageSize, data],
  )

  return (
    <>
      <div
        ref={wrapRef}
        className={`op-table-wrap${scrollHints.left ? " scroll-left" : ""}${
          scrollHints.right ? " scroll-right" : ""
        }`}
      >
        <Table
          className="op-table"
          dataSource={data}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={pagination}
          bordered
          size="small"
          tableLayout="fixed"
          scroll={{ x: "max-content" }}
          expandable={{
            expandedRowRender: (record) => (
              <div
                style={{
                  whiteSpace: "pre-wrap",
                  padding: "8px 24px",
                }}
              >
                <b>Описание:</b> {record.description || "-"}
                <br />
                <b>Примечание:</b> {record.notes || "-"}
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
            format: (v) => ((v ?? "") === "" ? "-" : String(v)),
          },
          { key: "notes", title: "Примечание" },
        ]}
        onReload={() => {
          if (conflict.current && typeof onReplaceRow === "function")
            onReplaceRow(conflict.current)
          else if (typeof onRefresh === "function") onRefresh()
          else message.info("Строка изменилась — обновите данные")
          setConflict({ open: false, current: null, draft: null })
          cancelEdit()
        }}
        onManualMerge={() => {
          const base = conflict.current || {}
          const draft = conflict.draft || {}
          const merged = mergeConflictDraft(base, {
            ...draft,
            description: draft.description ?? base.description,
            duty_rate: draft.duty_rate ?? base.duty_rate,
            notes: draft.notes ?? base.notes,
          })
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

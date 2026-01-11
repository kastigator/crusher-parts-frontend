// src/components/clients/BankDetailsTable.jsx
import React, { useState } from "react"
import { Table, Input, message } from "antd"
import ActionButtons from "@/components/common/ActionButtons"
import confirmAction from "@/utils/confirmAction"
import VersionConflictModal from "@/components/common/VersionConflictModal"
import CurrencySelect from "@/components/inputs/CurrencySelect"
import { mergeConflictDraft } from "@/utils/versionConflict"

export default function BankDetailsTable({
  data = [],
  loading,
  onUpdate,
  onDelete,
  onReplaceRow,
  onRefresh,
}) {
  const [editingId, setEditingId] = useState(null)
  const [edited, setEdited] = useState(null)

  const [conflict, setConflict] = useState({
    open: false,
    current: null,
    draft: null,
  })

  const isEditing = (r) => r.id === editingId

  const startEdit = (record) => {
    if (editingId && editingId !== record.id) {
      message.warning("Сначала сохраните или отмените текущие изменения")
      return
    }
    setEditingId(record.id)
    setEdited({ ...record }) // важно сохранить version
  }

  const cancel = () => {
    setEditingId(null)
    setEdited(null)
  }

  const save = async () => {
    if (!edited) return
    if (edited.version === undefined) {
      return message.error("Нет версии записи для сохранения")
    }

    try {
      await onUpdate(editingId, edited)
      cancel()
    } catch (e) {
      if (e?.isVersionConflict) {
        setConflict({
          open: true,
          current: e.currentRecord || null,
          draft: edited,
        })
        return
      }
      console.error("Ошибка сохранения банковских реквизитов:", e)
      message.error("Не удалось сохранить изменения")
    }
  }

  const handleDelete = async (record) => {
    const { confirmed } = await confirmAction("Удалить банковские реквизиты?")
    if (!confirmed) return

    try {
      await onDelete(record)
    } catch (e) {
      if (e?.isVersionConflict) {
        if (e.currentRecord && onReplaceRow) {
          onReplaceRow(e.currentRecord)
        } else if (onRefresh) {
          await onRefresh()
        }
        return message.warning(
          "Запись изменилась и не была удалена. Данные обновлены.",
        )
      }
      console.error("Ошибка при удалении реквизитов:", e)
      message.error("Не удалось удалить реквизиты")
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault()
      save()
    }
    if (e.key === "Escape") {
      e.preventDefault()
      cancel()
    }
  }

  const columns = [
    {
      title: "Банк",
      dataIndex: "bank_name",
      render: (_, r) =>
        isEditing(r) ? (
          <Input
            autoFocus
            value={edited.bank_name}
            onChange={(e) =>
              setEdited((p) => ({ ...p, bank_name: e.target.value }))
            }
            onKeyDown={handleKeyDown}
          />
        ) : (
          r.bank_name || "—"
        ),
    },
    {
      title: "БИК",
      dataIndex: "bic",
      width: 150,
      render: (_, r) =>
        isEditing(r) ? (
          <Input
            value={edited.bic}
            onChange={(e) =>
              setEdited((p) => ({ ...p, bic: e.target.value }))
            }
            onKeyDown={handleKeyDown}
          />
        ) : (
          r.bic || "—"
        ),
    },
    {
      title: "Кор. счёт",
      dataIndex: "correspondent_account",
      render: (_, r) =>
        isEditing(r) ? (
          <Input
            value={edited.correspondent_account}
            onChange={(e) =>
              setEdited((p) => ({
                ...p,
                correspondent_account: e.target.value,
              }))
            }
            onKeyDown={handleKeyDown}
          />
        ) : (
          r.correspondent_account || "—"
        ),
    },
    {
      title: "Валюта",
      dataIndex: "currency",
      width: 220,
      render: (_, r) =>
        isEditing(r) ? (
          <CurrencySelect
            value={edited.currency || "RUB"}
            onChange={(v) =>
              setEdited((p) => ({
                ...p,
                currency: v || "RUB",
              }))
            }
            allowClear={false}
            style={{ width: "100%" }}
            getPopupContainer={(trigger) =>
              trigger?.closest(".parts-table-wrap") || document.body
            }
          />
        ) : (
          r.currency || "RUB"
        ),
    },
    {
      title: "Расч. счёт",
      dataIndex: "account_number",
      render: (_, r) =>
        isEditing(r) ? (
          <Input
            value={edited.account_number}
            onChange={(e) =>
              setEdited((p) => ({ ...p, account_number: e.target.value }))
            }
            onKeyDown={handleKeyDown}
          />
        ) : (
          r.account_number || "—"
        ),
    },
    {
      title: "Действия",
      dataIndex: "actions",
      width: 160,
      render: (_, r) => (
        <ActionButtons
          onEdit={!isEditing(r) ? () => startEdit(r) : undefined}
          onSave={isEditing(r) ? save : undefined}
          onCancel={isEditing(r) ? cancel : undefined}
          onDelete={!isEditing(r) ? () => handleDelete(r) : undefined}
          disabledEdit={!!editingId && !isEditing(r)}
          disabledDelete={!!editingId && !isEditing(r)}
        />
      ),
    },
  ]

  return (
    <>
      <Table
        className="op-table"
        rowKey="id"
        columns={columns}
        dataSource={Array.isArray(data) ? data : []}
        loading={loading}
        pagination={false}
        size="small"
        tableLayout="fixed"
      />

      <VersionConflictModal
        open={conflict.open}
        draft={conflict.draft}
        current={conflict.current}
        fields={[
          { key: "bank_name", title: "Банк" },
          { key: "bic", title: "БИК" },
          { key: "correspondent_account", title: "Кор. счёт" },
          { key: "account_number", title: "Расч. счёт" },
          { key: "currency", title: "Валюта" },
        ]}
        onReload={async () => {
          if (conflict.current && onReplaceRow) {
            onReplaceRow(conflict.current)
          } else if (onRefresh) {
            await onRefresh()
          }
          setConflict({ open: false, current: null, draft: null })
          cancel()
        }}
        onManualMerge={() => {
          const merged = mergeConflictDraft(
            conflict.current || {},
            conflict.draft || {},
          )
          if (merged.id) {
            setEditingId(merged.id)
            setEdited(merged)
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

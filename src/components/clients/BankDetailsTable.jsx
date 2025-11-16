// src/components/clients/bankDetails/BankDetailsTable.jsx
import React, { useState } from "react"
import { Table, Input, Select, message } from "antd"
import ActionButtons from "@/components/common/ActionButtons"
import confirmAction from "@/utils/confirmAction"
import VersionConflictModal from "@/components/common/VersionConflictModal"

const CURRENCY_OPTIONS = [
  { value: "RUB", label: "RUB — Russian Ruble" },
  { value: "USD", label: "USD — US Dollar" },
  { value: "EUR", label: "EUR — Euro" },
]

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

  const cancel = () => {
    setEditingId(null)
    setEdited(null)
  }

  const save = async () => {
    if (!edited) return
    if (edited.version === undefined) {
      message.error("Нет версии записи для сохранения")
      return
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
      console.error("Ошибка при сохранении реквизитов:", e)
      message.error("Не удалось сохранить изменения")
    }
  }

  const handleDelete = async (record) => {
    const { confirmed } = await confirmAction("Удалить банковские реквизиты?")
    if (!confirmed) return

    try {
      await onDelete?.(record)
    } catch (e) {
      if (e?.isVersionConflict) {
        if (e.currentRecord && typeof onReplaceRow === "function") {
          onReplaceRow(e.currentRecord)
        } else if (typeof onRefresh === "function") {
          await onRefresh()
        }
        message.warning("Запись изменилась и не была удалена. Данные обновлены.")
        return
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
      width: 200,
      render: (_, r) =>
        isEditing(r) ? (
          <Select
            options={CURRENCY_OPTIONS}
            value={edited.currency || "RUB"}
            onChange={(v) => setEdited((p) => ({ ...p, currency: v }))}
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
      render: (_, r) => {
        const editing = isEditing(r)
        return (
          <ActionButtons
            onSave={editing ? save : undefined}
            onCancel={editing ? cancel : undefined}
            onDelete={!editing ? () => handleDelete(r) : undefined}
            confirmDelete={false}
            size="small"
            onEdit={
              !editing
                ? () => {
                    setEditingId(r.id)
                    setEdited({ ...r })
                  }
                : undefined
            }
          />
        )
      },
    },
  ]

  return (
    <>
      <Table
        className="op-table parts-table"
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={false}
        size="small"
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
          if (conflict.current && typeof onReplaceRow === "function") {
            onReplaceRow(conflict.current)
          } else if (typeof onRefresh === "function") {
            await onRefresh()
          }
          setConflict({ open: false, current: null, draft: null })
          cancel()
        }}
        onManualMerge={() => {
          const base = conflict.current || {}
          const draft = conflict.draft || {}
          const merged = {
            ...base,
            bank_name: draft.bank_name ?? base.bank_name,
            bic: draft.bic ?? base.bic,
            correspondent_account:
              draft.correspondent_account ?? base.correspondent_account,
            account_number: draft.account_number ?? base.account_number,
            currency: draft.currency ?? base.currency,
          }
          if (merged.id) {
            setEditingId(merged.id)
            setEdited(merged)
          }
          setConflict({ open: false, current: null, draft: null })
        }}
        onCancel={() => setConflict({ open: false, current: null, draft: null })}
      />
    </>
  )
}

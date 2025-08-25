import React, { useState } from "react"
import { Table, Input, message } from "antd"
import ActionButtons from "@/components/common/ActionButtons"
import confirmAction from "@/utils/confirmAction"
import VersionConflictModal from "@/components/common/VersionConflictModal"
import CurrencySelect from "@/components/inputs/CurrencySelect"

export default function BankDetailsTable({
  clientId,
  data = [],
  loading,
  onUpdate,
  onDelete,
  onReplaceRow,
  onRefresh,
}) {
  const [editingId, setEditingId] = useState(null)
  const [editedRow, setEditedRow] = useState(null)
  const [conflict, setConflict] = useState({ open: false, current: null, draft: null })

  const isEditing = (r) => r.id === editingId
  const cancelEdit = () => { setEditingId(null); setEditedRow(null) }

  const saveEdit = async () => {
    try {
      await onUpdate?.(editedRow.id, { ...editedRow })
      cancelEdit()
      message.success("Сохранено")
    } catch (err) {
      if (err?.isVersionConflict) {
        setConflict({ open: true, current: err.currentRecord || null, draft: editedRow })
        return
      }
      console.error(err)
      message.error("Не удалось сохранить изменения")
    }
  }

  const handleDelete = async (record) => {
    const { confirmed } = await confirmAction("Удалить реквизиты?")
    if (!confirmed) return
    try {
      await onDelete?.(record)
      message.success("Удалено")
    } catch (err) {
      if (err?.isVersionConflict) {
        if (err.currentRecord && typeof onReplaceRow === "function") onReplaceRow(err.currentRecord)
        else if (typeof onRefresh === "function") await onRefresh()
        return message.warning("Запись изменилась и не была удалена. Обновили данные.")
      }
      console.error(err)
      message.error("Не удалось удалить запись")
    }
  }

  const renderInput = (field, props = {}) => (
    <Input
      {...props}
      value={editedRow?.[field] ?? ""}
      onChange={(e) => setEditedRow((p) => ({ ...p, [field]: e.target.value }))}
      onPressEnter={saveEdit}
      size="small"
      autoFocus={props.autoFocus}
    />
  )

  const columns = [
    {
      title: "Банк",
      dataIndex: "bank_name",
      width: 260,
      render: (_, r) =>
        isEditing(r) ? renderInput("bank_name", { placeholder: "Банк", autoFocus: true }) : (r.bank_name || "—"),
    },
    {
      title: "БИК",
      dataIndex: "bic",
      width: 160,
      render: (_, r) =>
        isEditing(r) ? renderInput("bic", { placeholder: "БИК", maxLength: 11 }) : (r.bic || "—"),
    },
    {
      title: "Кор. счёт",
      dataIndex: "correspondent_account",
      width: 200,
      render: (_, r) =>
        isEditing(r)
          ? renderInput("correspondent_account", { placeholder: "Кор. счёт" })
          : (r.correspondent_account || "—"),
    },
    {
      title: "Валюта",
      dataIndex: "currency",
      width: 200,
      render: (_, r) =>
        isEditing(r) ? (
          <CurrencySelect
            value={editedRow?.currency || null}
            onChange={(val) => setEditedRow((p) => ({ ...p, currency: val }))}
            style={{ minWidth: 180 }}
            // якорь для попапа внутри раскрытой строки
            getPopupContainer={(node) =>
              node?.closest(".parts-table-wrap") || node?.parentElement || document.body
            }
          />
        ) : (
          r.currency || "—"
        ),
    },
    {
      title: "Расч. счёт",
      dataIndex: "account_number",
      width: 220,
      render: (_, r) =>
        isEditing(r) ? renderInput("account_number", { placeholder: "Расч. счёт" }) : (r.account_number || "—"),
    },
    {
      title: "Действия",
      dataIndex: "actions",
      width: 140,
      render: (_, r) => {
        const editing = isEditing(r)
        return (
          <ActionButtons
            onSave={editing ? saveEdit : undefined}
            onCancel={editing ? cancelEdit : undefined}
            onDelete={!editing ? () => handleDelete(r) : undefined}
            onHistory={undefined}
            size="small"
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
        onRow={(record) => ({
          onDoubleClick: () => {
            setEditingId(record.id)
            setEditedRow({ ...record }) // version остаётся
          },
        })}
      />

      <VersionConflictModal
        open={conflict.open}
        draft={conflict.draft}
        current={conflict.current}
        fields={[
          { key: "bank_name",             title: "Банк" },
          { key: "bic",                   title: "БИК" },
          { key: "correspondent_account", title: "Кор. счёт" },
          { key: "currency",              title: "Валюта" },
          { key: "account_number",        title: "Расч. счёт" },
        ]}
        onReload={async () => {
          if (conflict.current && typeof onReplaceRow === "function") onReplaceRow(conflict.current)
          else if (typeof onRefresh === "function") await onRefresh()
          setConflict({ open: false, current: null, draft: null })
          cancelEdit()
        }}
        onManualMerge={() => {
          const base = conflict.current || {}
          const draft = conflict.draft || {}
          const merged = {
            ...base,
            bank_name:             draft.bank_name             ?? base.bank_name,
            bic:                   draft.bic                   ?? base.bic,
            correspondent_account: draft.correspondent_account ?? base.correspondent_account,
            currency:              draft.currency              ?? base.currency,
            account_number:        draft.account_number        ?? base.account_number,
          }
          if (merged.id) { setEditingId(merged.id); setEditedRow(merged) }
          setConflict({ open: false, current: null, draft: null })
        }}
        onCancel={() => setConflict({ open: false, current: null, draft: null })}
      />
    </>
  )
}

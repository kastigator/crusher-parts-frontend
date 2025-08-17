// src/components/clients/BankDetailsTable.jsx
import React, { useState } from "react"
import { Table, Input, message } from "antd"
import { Autocomplete, TextField } from "@mui/material"
import ValueDisplay from "@/components/common/ValueDisplay"
import ActionButtons from "@/components/common/ActionButtons"
import confirmAction from "@/utils/confirmAction"
import VersionConflictModal from "@/components/common/VersionConflictModal"

const currencyOptions = ["RUB", "USD", "EUR", "CNY"]

export default function BankDetailsTable({
  data,
  loading,
  onUpdate,
  onDelete,
  onReplaceRow,
  onRefresh,
}) {
  const [editingId, setEditingId] = useState(null)
  const [editedRow, setEditedRow] = useState({})
  const [conflict, setConflict] = useState({ open: false, current: null, draft: null })

  const isEditing = (record) => editingId === record.id

  const makeEditable = (record) => {
    setEditingId(record.id)
    setEditedRow({ ...record }) // version внутри
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditedRow({})
  }

  const saveEdit = async (record) => {
    if (!editedRow?.version && editedRow?.version !== 0) {
      return message.error("Нет версии записи")
    }
    try {
      await onUpdate(record.id, { ...editedRow })
      cancelEdit()
    } catch (err) {
      if (err?.isDuplicateKey) return message.error("Такие реквизиты уже существуют")
      if (err?.isVersionConflict) {
        setConflict({ open: true, current: err.currentRecord || null, draft: editedRow })
        return
      }
      console.error("Ошибка сохранения:", err)
      message.error("Не удалось сохранить изменения")
    }
  }

  const deleteRow = async (record) => {
    const { confirmed } = await confirmAction("Удалить реквизиты?")
    if (!confirmed) return
    try {
      await onDelete(record)
    } catch (err) {
      if (err?.isVersionConflict) {
        if (err.currentRecord && typeof onReplaceRow === "function") onReplaceRow(err.currentRecord)
        else if (typeof onRefresh === "function") await onRefresh()
        return message.warning("Запись изменилась и не была удалена. Данные обновлены.")
      }
      console.error("Ошибка удаления:", err)
      message.error("Не удалось удалить")
    }
  }

  const renderInput = (field, record) => (
    <Input
      value={editedRow?.[field] ?? ""}
      onChange={(e) => setEditedRow((prev) => ({ ...prev, [field]: e.target.value }))}
      size="small"
      autoFocus
      onKeyDown={(e) => {
        if (e.key === "Enter") saveEdit(record)
        if (e.key === "Escape") cancelEdit()
      }}
    />
  )

  const renderCurrencySelect = (record) => (
    <Autocomplete
      options={currencyOptions}
      value={editedRow.currency ?? record.currency ?? "RUB"}
      onChange={(_, val) => setEditedRow((prev) => ({ ...prev, currency: val || "RUB" }))}
      disableClearable
      size="small"
      autoHighlight
      slotProps={{ popper: { disablePortal: true } }}
      renderInput={(params) => (
        <TextField {...params} label="Валюта" variant="standard" />
      )}
      sx={{ minWidth: 100 }}
    />
  )

  const columns = [
    {
      title: "Банк",
      dataIndex: "bank_name",
      render: (_, record) =>
        isEditing(record)
          ? renderInput("bank_name", record)
          : <ValueDisplay value={record.bank_name} />,
      onCell: (record) => ({ onDoubleClick: () => makeEditable(record) }),
    },
    {
      title: "BIC",
      dataIndex: "bic",
      render: (_, record) =>
        isEditing(record)
          ? renderInput("bic", record)
          : <ValueDisplay value={record.bic} />,
      onCell: (record) => ({ onDoubleClick: () => makeEditable(record) }),
    },
    {
      title: "Кор. счёт",
      dataIndex: "correspondent_account",
      render: (_, record) =>
        isEditing(record)
          ? renderInput("correspondent_account", record)
          : <ValueDisplay value={record.correspondent_account} />,
      onCell: (record) => ({ onDoubleClick: () => makeEditable(record) }),
    },
    {
      title: "Валюта",
      dataIndex: "currency",
      render: (_, record) =>
        isEditing(record)
          ? renderCurrencySelect(record)
          : <ValueDisplay value={record.currency} />,
      onCell: (record) => ({ onDoubleClick: () => makeEditable(record) }),
    },
    {
      title: "Расч. счёт",
      dataIndex: "account_number",
      render: (_, record) =>
        isEditing(record)
          ? renderInput("account_number", record)
          : <ValueDisplay value={record.account_number} />,
      onCell: (record) => ({ onDoubleClick: () => makeEditable(record) }),
    },
    {
      title: "Действия",
      dataIndex: "actions",
      width: 140,
      render: (_, record) => {
        const editing = isEditing(record)
        return (
          <ActionButtons
            onSave={editing ? () => saveEdit(record) : undefined}
            onCancel={editing ? cancelEdit : undefined}
            onDelete={!editing ? () => deleteRow(record) : undefined}
            size="small"
          />
        )
      },
    },
  ]

  return (
    <>
      <Table
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
          { key: "bic", title: "BIC" },
          { key: "correspondent_account", title: "Кор. счёт" },
          { key: "currency", title: "Валюта" },
          { key: "account_number", title: "Расч. счёт" },
        ]}
        onReload={async () => {
          if (conflict.current && typeof onReplaceRow === "function") onReplaceRow(conflict.current)
          await onRefresh?.()
          setConflict({ open: false, current: null, draft: null })
          cancelEdit()
        }}
        onManualMerge={() => {
          const base = conflict.current || {}
          const draft = conflict.draft || {}
          const merged = {
            ...base,
            bank_name: draft.bank_name ?? base.bank_name,
            bic: draft.bic ?? base.bic,
            correspondent_account: draft.correspondent_account ?? base.correspondent_account,
            currency: draft.currency ?? base.currency,
            account_number: draft.account_number ?? base.account_number,
          }
          if (merged.id) { setEditingId(merged.id); setEditedRow(merged) }
          setConflict({ open: false, current: null, draft: null })
        }}
        onCancel={() => setConflict({ open: false, current: null, draft: null })}
      />
    </>
  )
}

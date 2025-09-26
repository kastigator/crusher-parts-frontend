import React, { useState } from "react"
import { Table, Input, Select } from "antd"
import ActionButtons from "@/components/common/ActionButtons"

const CURRENCY_OPTIONS = [
  { value: "RUB", label: "RUB — Russian Ruble" },
  { value: "USD", label: "USD — US Dollar" },
  { value: "EUR", label: "EUR — Euro" },
]

export default function BankDetailsTable({ data = [], loading, onUpdate, onDelete }) {
  const [editingId, setEditingId] = useState(null)
  const [edited, setEdited] = useState(null)

  const isEditing = (r) => r.id === editingId
  const cancel = () => { setEditingId(null); setEdited(null) }
  const save = async () => { await onUpdate(editingId, edited); cancel() }

  const columns = [
    {
      title: "Банк",
      dataIndex: "bank_name",
      render: (_, r) =>
        isEditing(r)
          ? (
            <Input
              value={edited.bank_name}
              onChange={e => setEdited(p => ({ ...p, bank_name: e.target.value }))}
              onPressEnter={save}
            />
          )
          : r.bank_name || "—",
    },
    {
      title: "БИК",
      dataIndex: "bic",
      width: 150,
      render: (_, r) =>
        isEditing(r)
          ? (
            <Input
              value={edited.bic}
              onChange={e => setEdited(p => ({ ...p, bic: e.target.value }))}
              onPressEnter={save}
            />
          )
          : r.bic || "—",
    },
    {
      title: "Кор. счёт",
      dataIndex: "correspondent_account",
      render: (_, r) =>
        isEditing(r)
          ? (
            <Input
              value={edited.correspondent_account}
              onChange={e => setEdited(p => ({ ...p, correspondent_account: e.target.value }))}
              onPressEnter={save}
            />
          )
          : r.correspondent_account || "—",
    },
    {
      title: "Валюта",
      dataIndex: "currency",
      width: 200,
      render: (_, r) =>
        isEditing(r)
          ? (
            <Select
              options={CURRENCY_OPTIONS}
              value={edited.currency || "RUB"}
              onChange={(v) => setEdited(p => ({ ...p, currency: v }))}
              style={{ width: "100%" }}
              getPopupContainer={(trigger) =>
                trigger?.closest(".parts-table-wrap") || document.body
              }
            />
          )
          : (r.currency || "RUB"),
    },
    {
      title: "Расч. счёт",
      dataIndex: "account_number",
      render: (_, r) =>
        isEditing(r)
          ? (
            <Input
              value={edited.account_number}
              onChange={e => setEdited(p => ({ ...p, account_number: e.target.value }))}
              onPressEnter={save}
            />
          )
          : r.account_number || "—",
    },
    {
      title: "Действия",
      dataIndex: "actions",
      width: 140,
      render: (_, r) => {
        const editing = isEditing(r)
        return (
          <ActionButtons
            onSave={editing ? save : undefined}
            onCancel={editing ? cancel : undefined}
            onDelete={!editing ? () => onDelete(r) : undefined}
            confirmDelete={false}
            size="small"
            onEdit={
              !editing ? () => { setEditingId(r.id); setEdited({ ...r }) } : undefined
            }
          />
        )
      },
    },
  ]

  return (
    <Table
      className="op-table parts-table"
      rowKey="id"
      columns={columns}
      dataSource={data}
      loading={loading}
      pagination={false}
      size="small"
    />
  )
}

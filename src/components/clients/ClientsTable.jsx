// src/components/clients/ClientsTable.jsx
import React, { useState } from "react"
import { Table, Input, message, Tabs } from "antd"

import BillingAddressesMain from "./BillingAddressesMain"
import ShippingAddressesMain from "./ShippingAddressesMain"
import BankDetailsMain from "./BankDetailsMain"

import ValueDisplay from "@/components/common/ValueDisplay"
import FullHistoryDialog from "@/components/common/FullHistoryDialog"
import ActionButtons from "@/components/common/ActionButtons"
import confirmAction from "@/utils/confirmAction"
import VersionConflictModal from "@/components/common/VersionConflictModal"

export default function ClientsTable({
  data,
  loading,
  expandedClientId,
  setExpandedClientId,
  onReload,
  onChildChanged,

  // из ClientsMain
  onUpdate,
  onDelete,
  onReplaceRow,
  reloadKey,
}) {
  const [editingId, setEditingId] = useState(null)
  const [editedRow, setEditedRow] = useState(null)
  const [historyForId, setHistoryForId] = useState(null)

  const [conflict, setConflict] = useState({
    open: false,
    current: null,
    draft: null,
  })

  const isEditing = (record) => record.id === editingId

  const startEdit = (record) => {
    setEditingId(record.id)
    setEditedRow({ ...record }) // важно сохранить version
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditedRow(null)
  }

  const saveEdit = async () => {
    if (!editedRow) return
    if (editedRow.version === undefined) {
      return message.error("Нет версии записи для сохранения")
    }
    try {
      await onUpdate?.(editedRow.id, { ...editedRow })
      // onUpdate в ClientsMain уже обновляет строку через replaceRow
      cancelEdit()
    } catch (err) {
      if (err?.isDuplicateKey) {
        return message.error("Клиент с таким названием уже существует")
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

  const deleteClient = async (client) => {
    const { confirmed } = await confirmAction("Удалить клиента?")
    if (!confirmed) return

    try {
      await onDelete?.(client)
      // после удаления нам нужен полный рефетч списка
      await onReload?.()
    } catch (err) {
      if (err?.isVersionConflict) {
        if (err.currentRecord && typeof onReplaceRow === "function") {
          onReplaceRow(err.currentRecord)
        } else {
          await onReload?.()
        }
        return message.warning(
          "Запись изменилась и не была удалена. Данные обновлены."
        )
      }
      console.error("Ошибка при удалении клиента:", err)
      message.error("Не удалось удалить клиента")
    }
  }

  const renderInput = (field) => (
    <Input
      value={editedRow?.[field] ?? ""}
      onChange={(e) =>
        setEditedRow((prev) => ({ ...prev, [field]: e.target.value }))
      }
      onPressEnter={saveEdit}
      onKeyDown={(e) => {
        if (e.key === "Escape") cancelEdit()
      }}
      autoFocus
      size="small"
    />
  )

  const columns = [
    {
      title: "Компания",
      dataIndex: "company_name",
      render: (_, record) =>
        isEditing(record) ? (
          renderInput("company_name")
        ) : (
          <ValueDisplay value={record.company_name} />
        ),
      onCell: (record) => ({ onDoubleClick: () => startEdit(record) }),
    },
    {
      title: "Контакт",
      dataIndex: "contact_person",
      render: (_, record) =>
        isEditing(record) ? (
          renderInput("contact_person")
        ) : (
          <ValueDisplay value={record.contact_person} />
        ),
      onCell: (record) => ({ onDoubleClick: () => startEdit(record) }),
    },
    {
      title: "Телефон",
      dataIndex: "phone",
      render: (_, record) =>
        isEditing(record) ? (
          renderInput("phone")
        ) : (
          <ValueDisplay value={record.phone} />
        ),
      onCell: (record) => ({ onDoubleClick: () => startEdit(record) }),
    },
    {
      title: "Email",
      dataIndex: "email",
      render: (_, record) =>
        isEditing(record) ? (
          renderInput("email")
        ) : (
          <ValueDisplay value={record.email} type="email" />
        ),
      onCell: (record) => ({ onDoubleClick: () => startEdit(record) }),
    },
    {
      title: "Действия",
      key: "actions",
      width: 160,
      render: (_, record) => {
        const editing = isEditing(record)
        return (
          <ActionButtons
            onSave={editing ? saveEdit : undefined}
            onCancel={editing ? cancelEdit : undefined}
            onHistory={!editing ? () => setHistoryForId(record.id) : undefined}
            onDelete={!editing ? () => deleteClient(record) : undefined}
            size="small"
          />
        )
      },
    },
  ]

  const expandedRowRender = (client) => {
    if (!client?.id) return null
    return (
      <div className="subtable-shell parts-table-wrap">
        <Tabs
          destroyInactiveTabPane
          items={[
            {
              key: "billing",
              label: "Юридические адреса",
              children: (
                <BillingAddressesMain
                  key={`billing-${client.id}-${reloadKey}`}
                  clientId={client.id}
                  onChanged={onChildChanged}
                />
              ),
            },
            {
              key: "shipping",
              label: "Адреса доставки",
              children: (
                <ShippingAddressesMain
                  key={`shipping-${client.id}-${reloadKey}`}
                  clientId={client.id}
                  onChanged={onChildChanged}
                />
              ),
            },
            {
              key: "bank",
              label: "Банковские реквизиты",
              children: (
                <BankDetailsMain
                  key={`bank-${client.id}-${reloadKey}`}
                  clientId={client.id}
                  onChanged={onChildChanged}
                />
              ),
            },
          ]}
        />
      </div>
    )
  }

  return (
    <>
      <Table
        className="op-table"
        rowKey="id"
        dataSource={data}
        columns={columns}
        loading={loading}
        expandable={{
          expandedRowRender,
          expandedRowKeys: expandedClientId ? [expandedClientId] : [],
          onExpand: (expanded, record) =>
            setExpandedClientId(expanded ? record.id : null),
        }}
        pagination={{ pageSize: 10 }}
        size="middle"
      />

      {historyForId && (
        <FullHistoryDialog
          entityType="clients"
          entityId={historyForId}
          onlyDeleted={false}
          onClose={() => setHistoryForId(null)}
        />
      )}

      <VersionConflictModal
        open={conflict.open}
        draft={conflict.draft}
        current={conflict.current}
        fields={[
          { key: "company_name", title: "Компания" },
          { key: "contact_person", title: "Контактное лицо" },
          { key: "phone", title: "Телефон" },
          { key: "email", title: "Email" },
        ]}
        onReload={async () => {
          if (conflict.current && typeof onReplaceRow === "function") {
            onReplaceRow(conflict.current)
          }
          await onReload?.()
          setConflict({ open: false, current: null, draft: null })
          cancelEdit()
        }}
        onManualMerge={() => {
          const base = conflict.current || {}
          const draft = conflict.draft || {}

          const merged = {
            ...base,
            company_name: draft.company_name ?? base.company_name,
            contact_person: draft.contact_person ?? base.contact_person,
            phone: draft.phone ?? base.phone,
            email: draft.email ?? base.email,
          }

          if (merged.id) {
            setEditingId(merged.id)
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

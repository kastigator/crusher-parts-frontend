// src/components/suppliers/SuppliersTable.jsx
import React, { useState } from "react"
import { Table, Input, Tabs, message } from "antd"

import SupplierAddressesMain from "./SupplierAddressesMain"
import SupplierBankDetailsMain from "./SupplierBankDetailsMain"
import SupplierContactsMain from "./SupplierContactsMain"

import ActionButtons from "@/components/common/ActionButtons"
import confirmAction from "@/utils/confirmAction"
import FullHistoryDialog from "@/components/common/FullHistoryDialog"
import VersionConflictModal from "@/components/common/VersionConflictModal"
import CountrySelect from "@/components/inputs/CountrySelect"

const { TabPane } = Tabs

export default function SuppliersTable({
  data = [],
  loading,
  onUpdate,
  onDelete,
}) {
  const [editingId, setEditingId] = useState(null)
  const [editedRow, setEditedRow] = useState(null)
  const [expandedSupplierId, setExpandedSupplierId] = useState(null)
  const [logsSupplierId, setLogsSupplierId] = useState(null)
  const [conflict, setConflict] = useState({
    open: false,
    current: null,
    draft: null,
    id: null,
  })

  const startEdit = (record) => {
    setEditingId(record.id)
    setEditedRow({ ...record })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditedRow(null)
  }

  const onKey = (e) => {
    if (e.key === "Enter") saveEdit()
    if (e.key === "Escape") cancelEdit()
  }

  const saveEdit = async () => {
    if (!editedRow) return
    try {
      const fresh = await onUpdate?.(editedRow.id, editedRow)
      if (fresh) setEditedRow(fresh)
      setEditingId(null)
      setEditedRow(null)
      if (expandedSupplierId === editedRow.id) {
        setExpandedSupplierId(editedRow.id)
      }
      message.success("Изменения сохранены")
    } catch (err) {
      if (err?.isVersionConflict) {
        setConflict({
          open: true,
          current: err.currentRecord || null,
          draft: editedRow,
          id: editedRow.id,
        })
        return
      }
      if (err?.isDuplicateKey) {
        message.error("Поставщик с таким VAT уже существует")
        cancelEdit()
        return
      }
      console.error("Ошибка сохранения поставщика:", err)
    }
  }

  const handleDelete = async (record) => {
    const { confirmed } = await confirmAction("Удалить поставщика?")
    if (!confirmed) return
    await onDelete?.(record)
  }

  const renderTextCell = (key, width) => ({
    render: (_, record) => {
      const isEdit = editingId === record.id
      const value = isEdit ? editedRow?.[key] ?? "" : record[key] ?? ""
      if (isEdit) {
        return (
          <Input
            size="small"
            style={width ? { maxWidth: width } : undefined}
            value={value}
            onChange={(e) =>
              setEditedRow((prev) => ({ ...prev, [key]: e.target.value }))
            }
            onKeyDown={onKey}
            autoFocus={key === "name"}
          />
        )
      }
      return (
        <div onDoubleClick={() => startEdit(record)} className="cell-ellipsis">
          {value || ""}
        </div>
      )
    },
  })

  const columns = [
    {
      title: "Компания",
      dataIndex: "name",
      key: "name",
      ...renderTextCell("name", 220),
    },
    {
      title: "Страна",
      dataIndex: "country",
      key: "country",
      render: (_, record) => {
        const isEdit = editingId === record.id
        const value = isEdit ? editedRow?.country ?? null : record.country ?? null
        if (isEdit) {
          return (
            <CountrySelect
              value={value}
              onChange={(code) =>
                setEditedRow((prev) => ({ ...prev, country: code }))
              }
              style={{ width: 200 }}
            />
          )
        }
        return (
          <div onDoubleClick={() => startEdit(record)}>{value || ""}</div>
        )
      },
      width: 200,
    },
    {
      title: "VAT",
      dataIndex: "vat_number",
      key: "vat_number",
      ...renderTextCell("vat_number", 160),
    },
    {
      title: "Контакт",
      dataIndex: "contact_person",
      key: "contact_person",
      ...renderTextCell("contact_person", 160),
    },
    {
      title: "Телефон",
      dataIndex: "phone",
      key: "phone",
      ...renderTextCell("phone", 160),
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      ...renderTextCell("email", 220),
    },
    {
      title: "Примечание",
      dataIndex: "notes",
      key: "notes",
      ...renderTextCell("notes", 260),
    },
    // Колонку "Версия" УДАЛИЛ — техническое поле
    {
      title: "Действия",
      key: "actions",
      width: 140,
      render: (_, record) => (
        <ActionButtons
          size="small"
          // никаких редактировать/сохранить — редактирование по дабл-клику
          onDelete={() => handleDelete(record)}
          onHistory={() => setLogsSupplierId(record.id)}
          confirmDelete={false}
        />
      ),
    },
  ]

  return (
    <>
      <Table
        size="small"
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={data}
        pagination={{ pageSize: 50 }}
        expandable={{
          expandedRowKeys: expandedSupplierId ? [expandedSupplierId] : [],
          onExpand: (expanded, record) => {
            setExpandedSupplierId(expanded ? record.id : null)
          },
          expandedRowRender: (record) => (
            <Tabs defaultActiveKey="addresses" size="small">
              <TabPane tab="Адреса" key="addresses">
                <SupplierAddressesMain supplierId={record.id} onChanged={() => {}} />
              </TabPane>
              <TabPane tab="Контакты" key="contacts">
                <SupplierContactsMain supplierId={record.id} onChanged={() => {}} />
              </TabPane>
              <TabPane tab="Банковские реквизиты" key="bank">
                <SupplierBankDetailsMain supplierId={record.id} onChanged={() => {}} />
              </TabPane>
            </Tabs>
          ),
        }}
        onRow={(record) => ({
          onDoubleClick: () => startEdit(record),
          onKeyDown: onKey,
        })}
      />

      {logsSupplierId && (
        <FullHistoryDialog
          entityType="suppliers"
          entityId={logsSupplierId}
          onClose={() => setLogsSupplierId(null)}
        />
      )}

      <VersionConflictModal
        conflict={conflict.open ? conflict : null}
        onCancel={() =>
          setConflict({ open: false, current: null, draft: null, id: null })
        }
        onReload={() => {
          setEditingId(null)
          setEditedRow(null)
          setConflict({ open: false, current: null, draft: null, id: null })
        }}
        onMerge={(merged) => {
          if (!merged) return
          setEditedRow(merged)
          setEditingId(merged.id)
          setConflict({ open: false, current: null, draft: null, id: null })
        }}
      />
    </>
  )
}

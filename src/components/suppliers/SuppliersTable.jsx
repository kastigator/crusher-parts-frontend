import React, { useState, useMemo } from "react"
import { Table, Input, Tabs, message } from "antd"

import SupplierAddressesMain from "./SupplierAddressesMain"
import SupplierBankDetailsMain from "./SupplierBankDetailsMain"
import SupplierContactsMain from "./SupplierContactsMain"

import ActionButtons from "@/components/common/ActionButtons"
import confirmAction from "@/utils/confirmAction"
import FullHistoryDialog from "@/components/common/FullHistoryDialog"
import VersionConflictModal from "@/components/common/VersionConflictModal"
import ValueDisplay from "@/components/common/ValueDisplay"
import createTablePagination from "@/utils/tablePagination"

// 👇 библиотека стран: ISO2 → название по-русски
import countriesLib from "i18n-iso-countries"
import ru from "i18n-iso-countries/langs/ru.json"

countriesLib.registerLocale(ru)

const getCountryLabel = (code) => {
  if (!code) return ""
  try {
    return countriesLib.getName(code, "ru") || code
  } catch {
    return code
  }
}

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

  // пагинация как у клиентов и ТН ВЭД
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)

  const dataSource = Array.isArray(data) ? data : []

  const pagination = useMemo(
    () =>
      createTablePagination({
        page,
        pageSize,
        total: dataSource.length,
        setPage,
        setPageSize,
      }),
    [page, pageSize, dataSource.length],
  )

  const startEdit = (record) => {
    if (editingId && editingId !== record.id) {
      message.warning("Сначала сохраните или отмените текущие изменения")
      return
    }
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

      // оставляем раскрытие на том же поставщике
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
        if (err.duplicateField === "public_code") {
          message.error("Поставщик с таким публичным кодом уже существует")
        } else {
          message.error("Поставщик с таким VAT уже существует")
        }
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

  const renderTextCell = (key, width, valueType = "text") => ({
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

      const content =
        valueType === "phone" || valueType === "email" ? (
          <ValueDisplay value={value} type={valueType} />
        ) : (
          <ValueDisplay value={value} />
        )

      return <div>{content}</div>
    },
  })

  const columns = [
    {
      title: "Компания",
      dataIndex: "name",
      key: "name",
      width: 260,
      ...renderTextCell("name", 260),
    },
    {
      title: "Код",
      dataIndex: "public_code",
      key: "public_code",
      width: 100,
      ...renderTextCell("public_code", 100),
    },
    {
      title: "Страна",
      dataIndex: "country",
      key: "country",
      width: 220,
      render: (_, record) => {
        const label = getCountryLabel(record.country)
        return <ValueDisplay value={label} />
      },
    },
    {
      title: "VAT",
      dataIndex: "vat_number",
      key: "vat_number",
      width: 170,
      ...renderTextCell("vat_number", 170),
    },
    {
      title: "Контакт",
      dataIndex: "contact_person",
      key: "contact_person",
      width: 160,
      render: (_, record) => <ValueDisplay value={record.contact_person} />,
    },
    {
      title: "Телефон",
      dataIndex: "phone",
      key: "phone",
      width: 170,
      render: (_, record) => (
        <ValueDisplay value={record.phone} type="phone" />
      ),
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      width: 220,
      render: (_, record) => (
        <ValueDisplay value={record.email} type="email" />
      ),
    },
    {
      title: "Примечание",
      dataIndex: "notes",
      key: "notes",
      width: 220,
      ...renderTextCell("notes", 220),
    },
    {
      title: "Действия",
      key: "actions",
      width: 150,
      render: (_, record) => (
        <ActionButtons
          size="small"
          onEdit={editingId !== record.id ? () => startEdit(record) : undefined}
          onSave={editingId === record.id ? saveEdit : undefined}
          onCancel={editingId === record.id ? cancelEdit : undefined}
          onDelete={editingId !== record.id ? () => handleDelete(record) : undefined}
          onHistory={() => setLogsSupplierId(record.id)}
          disabledEdit={!!editingId && editingId !== record.id}
          disabledDelete={!!editingId && editingId !== record.id}
          confirmDelete={false}
        />
      ),
    },
  ]

  return (
    <>
      <Table
        className="op-table"
        size="small"
        bordered
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={dataSource}
        tableLayout="fixed"
        pagination={pagination}
        scroll={{ x: 1600 }}
        expandable={{
          expandedRowKeys: expandedSupplierId ? [expandedSupplierId] : [],
          onExpand: (expanded, record) => {
            setExpandedSupplierId(expanded ? record.id : null)
          },
          expandedRowRender: (record) => (
            <div className="subtable-shell parts-table-wrap table-section">
              <Tabs
                className="inner-tabs"
                size="small"
                destroyInactiveTabPane
                defaultActiveKey="addresses"
                items={[
                  {
                    key: "addresses",
                    label: "Адреса",
                    children: (
                      <SupplierAddressesMain
                        supplierId={record.id}
                        onChanged={() => {}}
                      />
                    ),
                  },
                  {
                    key: "contacts",
                    label: "Контакты",
                    children: (
                      <SupplierContactsMain
                        supplierId={record.id}
                        onChanged={() => {}}
                      />
                    ),
                  },
                  {
                    key: "bank",
                    label: "Банковские реквизиты",
                    children: (
                      <SupplierBankDetailsMain
                        supplierId={record.id}
                        onChanged={() => {}}
                      />
                    ),
                  },
                ]}
              />
            </div>
          ),
        }}
        onRow={() => ({
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
        entityLabel="поставщик"
        fields={[
          { key: "name", title: "Компания" },
          { key: "public_code", title: "Код" },
          { key: "vat_number", title: "VAT" },
          { key: "country", title: "Страна" },
          { key: "contact_person", title: "Контакт" },
          { key: "phone", title: "Телефон" },
          { key: "email", title: "Email" },
          { key: "notes", title: "Примечание" },
        ]}
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

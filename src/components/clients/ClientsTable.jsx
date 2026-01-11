// src/components/clients/ClientsTable.jsx
import React, { useState, useMemo } from "react"
import { Table, Input, message, Tabs } from "antd"

import BillingAddressesMain from "./BillingAddressesMain"
import ShippingAddressesMain from "./ShippingAddressesMain"
import BankDetailsMain from "./BankDetailsMain"

import ValueDisplay from "@/components/common/ValueDisplay"
import FullHistoryDialog from "@/components/common/FullHistoryDialog"
import ActionButtons from "@/components/common/ActionButtons"
import confirmAction from "@/utils/confirmAction"
import VersionConflictModal from "@/components/common/VersionConflictModal"
import createTablePagination from "@/utils/tablePagination"
import { mergeConflictDraft } from "@/utils/versionConflict"

export default function ClientsTable({
  data,
  loading,
  onUpdate,
  onDelete,
  onReload,
  // управляемое раскрытие + перезагрузка дочерних вкладок
  expandedClientId: controlledExpandedId,
  setExpandedClientId: setControlledExpandedId,
  onChildChanged,
  onReplaceRow,
  reloadKey: externalReloadKey,
}) {
  const [editingId, setEditingId] = useState(null)
  const [editedRow, setEditedRow] = useState(null)
  const [historyForId, setHistoryForId] = useState(null)

  // локальные fallback-состояния, если сверху ничего не передали
  const [localExpandedId, setLocalExpandedId] = useState(null)
  const [localReloadKey, setLocalReloadKey] = useState(0)

  const expandedClientId = controlledExpandedId ?? localExpandedId
  const reloadKey = externalReloadKey ?? localReloadKey

  const [conflict, setConflict] = useState({
    open: false,
    current: null,
    draft: null,
  })

  // локальная пагинация (как в ТН ВЭД)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

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

  const isEditing = (record) => record.id === editingId

  const startEdit = (record) => {
    if (editingId && editingId !== record.id) {
      message.warning("Сначала сохраните или отмените текущие изменения")
      return
    }
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
      console.error(err)
      message.error("Ошибка при сохранении клиента")
    }
  }

  const handleDelete = async (record) => {
    const { confirmed } = await confirmAction("Удалить клиента?")
    if (!confirmed) return

    try {
      // ⬇️ Передаём ВЕСЬ объект клиента, а не только id
      await onDelete?.(record)

      // если удалили раскрытого клиента — свернуть
      if (expandedClientId === record.id) {
        if (setControlledExpandedId) setControlledExpandedId(null)
        else setLocalExpandedId(null)
      }
    } catch (err) {
      // аккуратно обрабатываем конфликт версий
      if (err?.isVersionConflict) {
        if (err.currentRecord && typeof onReplaceRow === "function") {
          onReplaceRow(err.currentRecord)
        } else if (typeof onReload === "function") {
          await onReload()
        }
        message.warning(
          "Запись изменилась другим пользователем и не была удалена. Данные обновлены.",
        )
        return
      }

      console.error("Ошибка при удалении клиента:", err)
      message.error("Ошибка при удалении клиента")
    }
  }

  const handleChildChanged = () => {
    if (typeof onChildChanged === "function") {
      onChildChanged()
    } else if (typeof onReload === "function") {
      onReload()
    } else {
      // fallback только внутри таблицы
      setLocalReloadKey((k) => k + 1)
    }
  }

  const handleExpandToggle = (expanded, record) => {
    const id = expanded ? record.id : null
    if (setControlledExpandedId) setControlledExpandedId(id)
    else setLocalExpandedId(id)
  }

  const renderInput = (field) => (
    <Input
      value={editedRow?.[field] ?? ""}
      onChange={(e) =>
        setEditedRow((prev) => ({
          ...prev,
          [field]: e.target.value,
        }))
      }
      onPressEnter={saveEdit}
      onKeyDown={(e) => {
        if (e.key === "Escape") cancelEdit()
      }}
      autoFocus={field === "company_name"}
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
    },
    {
      title: "Телефон",
      dataIndex: "phone",
      width: 160,
      render: (_, record) =>
        isEditing(record) ? (
          renderInput("phone")
        ) : (
          <ValueDisplay value={record.phone} type="phone" />
        ),
    },
    {
      title: "Email",
      dataIndex: "email",
      width: 220,
      render: (_, record) =>
        isEditing(record) ? (
          renderInput("email")
        ) : (
          <ValueDisplay value={record.email} type="email" />
        ),
    },
    {
      title: "Действия",
      dataIndex: "actions",
      width: 150,
      fixed: "right",
      render: (_, record) => (
        <ActionButtons
          onEdit={!isEditing(record) ? () => startEdit(record) : undefined}
          onSave={isEditing(record) ? saveEdit : undefined}
          onCancel={isEditing(record) ? cancelEdit : undefined}
          onDelete={!isEditing(record) ? () => handleDelete(record) : undefined}
          onHistory={() => setHistoryForId(record.id)}
          disabledEdit={!!editingId && !isEditing(record)}
          disabledDelete={!!editingId && !isEditing(record)}
        />
      ),
    },
  ]

  const expandedRowRender = (client) => {
    if (!client?.id) return null

    return (
      <div className="subtable-shell parts-table-wrap table-section">
        <Tabs
          className="inner-tabs"
          size="small"
          destroyInactiveTabPane
          items={[
            {
              key: "billing",
              label: "Юридические адреса",
              children: (
                <BillingAddressesMain
                  key={`billing-${client.id}-${reloadKey}`}
                  clientId={client.id}
                  onChanged={handleChildChanged}
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
                  onChanged={handleChildChanged}
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
                  onChanged={handleChildChanged}
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
        dataSource={Array.isArray(data) ? data : []}
        columns={columns}
        loading={loading}
        bordered
        size="small"
        tableLayout="fixed"
        expandable={{
          expandedRowRender,
          expandedRowKeys: expandedClientId ? [expandedClientId] : [],
          onExpand: handleExpandToggle,
        }}
        pagination={pagination}
      />

      {historyForId && (
        <FullHistoryDialog
          entityType="clients"
          entityId={historyForId}
          onClose={() => setHistoryForId(null)}
        />
      )}

      <VersionConflictModal
        open={conflict.open}
        current={conflict.current}
        draft={conflict.draft}
        entityLabel="клиент"
        fields={[
          { key: "company_name", title: "Компания" },
          { key: "contact_person", title: "Контакт" },
          { key: "phone", title: "Телефон" },
          { key: "email", title: "Email" },
        ]}
        onReload={async () => {
          if (conflict.current && typeof onReplaceRow === "function") {
            onReplaceRow(conflict.current)
          } else if (typeof onReload === "function") {
            await onReload()
          }
          setConflict({ open: false, current: null, draft: null })
          cancelEdit()
        }}
        onManualMerge={() => {
          const merged = mergeConflictDraft(
            conflict.current || {},
            conflict.draft || {},
          )
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

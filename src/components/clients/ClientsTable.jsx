// src/components/clients/ClientsTable.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Space, Table, Typography, message } from "antd"

import ActionButtons from "@/components/common/ActionButtons"
import FullHistoryDialog from "@/components/common/FullHistoryDialog"
import ValueDisplay from "@/components/common/ValueDisplay"
import createTablePagination from "@/utils/tablePagination"
import useTableScrollHints from "@/utils/useTableScrollHints"
import DraggableColumnsTable from "@/components/common/DraggableColumnsTable"
import { getOrderedKeys } from "@/utils/columnOrder"

export default function ClientsTable({
  data = [],
  loading,
  onDelete,
  onEditRecord,
  onOpenDetail,
  highlightRowId = null,
  visibleColumnKeys = null,
  onColumnsMeta = null,
  columnOrderKeys = null,
  onColumnOrderKeysChange = null,
}) {
  const { Text } = Typography
  const [logsClientId, setLogsClientId] = useState(null)
  const wrapRef = useRef(null)

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)

  const dataSource = Array.isArray(data) ? data : []
  const scrollHints = useTableScrollHints(wrapRef, [dataSource, loading, page, pageSize])

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

  const handleDelete = useCallback(async (record) => {
    try {
      await onDelete?.(record)
    } catch (e) {
      console.error(e)
      message.error("Не удалось удалить клиента")
    }
  }, [onDelete])

  const companyMetaText = useCallback((record) => {
    const parts = [record?.contact_person, record?.phone].filter(Boolean)
    return parts.join(" · ")
  }, [])

  const columns = useMemo(() => [
    {
      title: "Клиент",
      dataIndex: "company_name",
      key: "company_name",
      width: 320,
      minWidth: 180,
      maxWidth: 520,
      ellipsis: { showTitle: false },
      onCell: () => ({ style: { overflow: "hidden" } }),
      render: (v, record) => (
        <Space direction="vertical" size={2} style={{ width: "100%", minWidth: 0 }}>
          <ValueDisplay value={v} />
          {companyMetaText(record) ? (
            <Text type="secondary" className="cell-ellipsis" style={{ maxWidth: "100%" }}>
              {companyMetaText(record)}
            </Text>
          ) : null}
        </Space>
      ),
    },
    {
      title: "Контакт",
      dataIndex: "contact_person",
      key: "contact_person",
      width: 220,
      minWidth: 140,
      maxWidth: 360,
      ellipsis: { showTitle: false },
      onCell: () => ({ style: { overflow: "hidden" } }),
      render: (v) => <ValueDisplay value={v} />,
    },
    {
      title: "Телефон",
      dataIndex: "phone",
      key: "phone",
      width: 170,
      minWidth: 120,
      maxWidth: 260,
      ellipsis: { showTitle: false },
      onCell: () => ({ style: { overflow: "hidden" } }),
      render: (v) => <ValueDisplay value={v} type="phone" />,
    },
    {
      title: "E-mail",
      dataIndex: "email",
      key: "email",
      width: 240,
      minWidth: 140,
      maxWidth: 360,
      ellipsis: { showTitle: false },
      onCell: () => ({ style: { overflow: "hidden" } }),
      render: (v) => <ValueDisplay value={v} type="email" />,
    },
    {
      title: "Сайт",
      dataIndex: "website",
      key: "website",
      width: 220,
      minWidth: 140,
      maxWidth: 360,
      ellipsis: { showTitle: false },
      onCell: () => ({ style: { overflow: "hidden" } }),
      render: (v) => <ValueDisplay value={v} />,
    },
    {
      title: "Рег. номер",
      dataIndex: "registration_number",
      key: "registration_number",
      width: 200,
      minWidth: 120,
      maxWidth: 320,
      ellipsis: { showTitle: false },
      onCell: () => ({ style: { overflow: "hidden" } }),
      render: (v) => <ValueDisplay value={v} />,
    },
    {
      title: "ИНН / Tax ID",
      dataIndex: "tax_id",
      key: "tax_id",
      width: 200,
      minWidth: 120,
      maxWidth: 320,
      ellipsis: { showTitle: false },
      onCell: () => ({ style: { overflow: "hidden" } }),
      render: (v) => <ValueDisplay value={v} />,
    },
    {
      title: "Примечание",
      dataIndex: "notes",
      key: "notes",
      width: 260,
      minWidth: 140,
      maxWidth: 420,
      ellipsis: { showTitle: false },
      onCell: () => ({ style: { overflow: "hidden" } }),
      render: (v) => <ValueDisplay value={v} />,
    },
    {
      title: "Действия",
      key: "actions",
      width: 120,
      render: (_, record) => (
        <ActionButtons
          size="small"
          onEdit={() => onEditRecord?.(record)}
          onHistory={() => setLogsClientId(record.id)}
          onDelete={() => handleDelete(record)}
          confirmDelete={false}
        />
      ),
    },
  ], [companyMetaText, handleDelete, onEditRecord])

  const defaultVisible = useMemo(() => ["company_name", "contact_person", "phone", "email"], [])
  const defaultOrder = [
    ...defaultVisible.filter((key) => key !== "actions"),
    ...(defaultVisible.includes("actions") ? ["actions"] : []),
  ]
  const effectiveVisibleKeys =
    Array.isArray(visibleColumnKeys) && visibleColumnKeys.length ? visibleColumnKeys : defaultVisible
  const effectiveOrderKeys = useMemo(
    () => getOrderedKeys(columnOrderKeys, defaultOrder),
    [columnOrderKeys, defaultOrder],
  )

  const orderedColumns = useMemo(() => {
    const idx = new Map(effectiveOrderKeys.map((k, i) => [k, i]))
    return [...columns].sort((a, b) => {
      const ai = idx.has(a.key) ? idx.get(a.key) : Number.MAX_SAFE_INTEGER
      const bi = idx.has(b.key) ? idx.get(b.key) : Number.MAX_SAFE_INTEGER
      return ai - bi
    })
  }, [columns, effectiveOrderKeys])

  const visibleColumns = useMemo(() => {
    const visible = new Set(effectiveVisibleKeys)
    return orderedColumns.filter((c) => visible.has(c.key))
  }, [orderedColumns, effectiveVisibleKeys])

  const columnOptions = useMemo(
    () => columns.filter((c) => c.key).map((c) => ({ key: c.key, label: c.title })),
    [columns],
  )

  const lockedKeys = useMemo(() => [], [])

  useEffect(() => {
    onColumnsMeta?.({
      options: columnOptions,
      defaultVisible,
      lockedKeys,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(columnOptions), JSON.stringify(defaultVisible), JSON.stringify(lockedKeys)])

  return (
    <>
      <div
        ref={wrapRef}
        className={`op-table-wrap${scrollHints.left ? " scroll-left" : ""}${
          scrollHints.right ? " scroll-right" : ""
        }`}
      >
        <DraggableColumnsTable
          className="op-table"
          columnSizingKey="clients_column_widths_v1"
          size="small"
          bordered
          rowKey="id"
          loading={loading}
          columns={visibleColumns}
          nonDraggableKeys={lockedKeys}
          onColumnOrderChange={({ activeKey, overKey }) => {
            if (typeof onColumnOrderKeysChange !== "function") return
            const nextFull = [...effectiveOrderKeys]
            const from = nextFull.indexOf(activeKey)
            const to = nextFull.indexOf(overKey)
            if (from < 0 || to < 0 || from === to) return
            const [item] = nextFull.splice(from, 1)
            nextFull.splice(to, 0, item)
            onColumnOrderKeysChange(nextFull)
          }}
          dataSource={dataSource}
          tableLayout="fixed"
          pagination={pagination}
          scroll={{ x: "max-content" }}
          rowClassName={(record) =>
            Number(record?.id) === Number(highlightRowId) ? "op-row-flash" : ""
          }
          onRow={(record) => ({
            onDoubleClick: (e) => {
              if (!onOpenDetail) return
              const target = e?.target
              if (
                target?.closest?.(
                  "button,a,input,textarea,select,.ant-btn,.ant-select,.ant-input,.ant-input-number,.ant-checkbox"
                )
              ) {
                return
              }
              onOpenDetail(record)
            },
          })}
        />
      </div>

      {logsClientId && (
        <FullHistoryDialog
          entityType="clients"
          entityId={logsClientId}
          onClose={() => setLogsClientId(null)}
        />
      )}
    </>
  )
}

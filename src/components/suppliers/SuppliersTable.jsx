import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Space, Table, Typography, message } from "antd"

import ActionButtons from "@/components/common/ActionButtons"
import FullHistoryDialog from "@/components/common/FullHistoryDialog"
import ValueDisplay from "@/components/common/ValueDisplay"
import createTablePagination from "@/utils/tablePagination"
import useTableScrollHints from "@/utils/useTableScrollHints"
import DraggableColumnsTable from "@/components/common/DraggableColumnsTable"
import { getOrderedKeys } from "@/utils/columnOrder"

export default function SuppliersTable({
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
  const [logsSupplierId, setLogsSupplierId] = useState(null)
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
      message.error("Не удалось удалить поставщика")
    }
  }, [onDelete])

  const supplierMetaText = useCallback((record) => {
    const parts = [record?.country, record?.contact_person].filter(Boolean)
    return parts.join(" · ")
  }, [])

  const columns = useMemo(() => [
    {
      title: "Поставщик",
      dataIndex: "name",
      key: "name",
      width: 300,
      minWidth: 180,
      maxWidth: 520,
      ellipsis: { showTitle: false },
      onCell: () => ({ style: { overflow: "hidden" } }),
      render: (v, record) => (
        <Space direction="vertical" size={2} style={{ width: "100%", minWidth: 0 }}>
          <ValueDisplay value={v} />
          {supplierMetaText(record) ? (
            <Text type="secondary" className="cell-ellipsis" style={{ maxWidth: "100%" }}>
              {supplierMetaText(record)}
            </Text>
          ) : null}
        </Space>
      ),
    },
    {
      title: "Код",
      dataIndex: "public_code",
      key: "public_code",
      width: 110,
      minWidth: 90,
      maxWidth: 220,
      ellipsis: { showTitle: false },
      onCell: () => ({ style: { overflow: "hidden" } }),
      render: (v) => <ValueDisplay value={v} />,
    },
    {
      title: "Страна",
      dataIndex: "country",
      key: "country",
      width: 200,
      minWidth: 120,
      maxWidth: 260,
      ellipsis: { showTitle: false },
      onCell: () => ({ style: { overflow: "hidden" } }),
      render: (v) => <ValueDisplay value={v} />,
    },
    {
      title: "VAT",
      dataIndex: "vat_number",
      key: "vat_number",
      width: 160,
      minWidth: 110,
      maxWidth: 260,
      ellipsis: { showTitle: false },
      onCell: () => ({ style: { overflow: "hidden" } }),
      render: (v) => <ValueDisplay value={v} />,
    },
    {
      title: "Контакт",
      dataIndex: "contact_person",
      key: "contact_person",
      width: 180,
      minWidth: 120,
      maxWidth: 320,
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
      width: 220,
      minWidth: 140,
      maxWidth: 360,
      ellipsis: { showTitle: false },
      onCell: () => ({ style: { overflow: "hidden" } }),
      render: (v) => <ValueDisplay value={v} type="email" />,
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
      title: "OEM",
      dataIndex: "can_oem",
      key: "can_oem",
      width: 90,
      render: (v) => <ValueDisplay value={v ? "да" : "нет"} />,
    },
    {
      title: "Аналоги",
      dataIndex: "can_analog",
      key: "can_analog",
      width: 100,
      render: (v) => <ValueDisplay value={v ? "да" : "нет"} />,
    },
    {
      title: "Рейтинг",
      dataIndex: "reliability_rating",
      key: "reliability_rating",
      width: 110,
      render: (v) => <ValueDisplay value={v} />,
    },
    {
      title: "Риск",
      dataIndex: "risk_level",
      key: "risk_level",
      width: 120,
      render: (v) => <ValueDisplay value={v || "—"} />,
    },
    {
      title: "Срок (база/ориентир), дн",
      dataIndex: "default_lead_time_days",
      key: "default_lead_time_days",
      width: 140,
      render: (v) => <ValueDisplay value={v} />,
    },
    {
      title: "Валюта (по умолчанию)",
      dataIndex: "preferred_currency",
      key: "preferred_currency",
      width: 100,
      render: (v) => <ValueDisplay value={v} />,
    },
    {
      title: "Город/порт (по умолчанию)",
      dataIndex: "default_pickup_location",
      key: "default_pickup_location",
      width: 180,
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
          onHistory={() => setLogsSupplierId(record.id)}
          onDelete={() => handleDelete(record)}
          confirmDelete={false}
        />
      ),
    },
  ], [handleDelete, onEditRecord, supplierMetaText])

  const defaultVisible = useMemo(
    () => ["name", "public_code", "phone", "email", "can_oem", "can_analog", "risk_level", "default_lead_time_days"],
    [],
  )
  const defaultOrder = [
    ...defaultVisible.filter((key) => key !== "actions"),
    ...(defaultVisible.includes("actions") ? ["actions"] : []),
  ]
  const effectiveVisibleKeys =
    Array.isArray(visibleColumnKeys) && visibleColumnKeys.length
      ? visibleColumnKeys
      : defaultVisible
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
    [columns]
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
          columnSizingKey="suppliers_column_widths_v1"
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

      {logsSupplierId && (
        <FullHistoryDialog
          entityType="suppliers"
          entityId={logsSupplierId}
          onClose={() => setLogsSupplierId(null)}
        />
      )}
    </>
  )
}

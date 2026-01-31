import React, { useEffect, useMemo, useRef, useState } from "react"
import { Table, message } from "antd"

import ActionButtons from "@/components/common/ActionButtons"
import confirmAction from "@/utils/confirmAction"
import FullHistoryDialog from "@/components/common/FullHistoryDialog"
import ValueDisplay from "@/components/common/ValueDisplay"
import createTablePagination from "@/utils/tablePagination"
import useTableScrollHints from "@/utils/useTableScrollHints"

export default function SuppliersTable({
  data = [],
  loading,
  onDelete,
  onOpenDetail,
  highlightRowId = null,
  visibleColumnKeys = null,
  onColumnsMeta = null,
}) {
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

  const handleDelete = async (record) => {
    const { confirmed } = await confirmAction("Удалить поставщика?")
    if (!confirmed) return
    try {
      await onDelete?.(record)
    } catch (e) {
      console.error(e)
      message.error("Не удалось удалить поставщика")
    }
  }

  const columns = [
    {
      title: "Компания",
      dataIndex: "name",
      key: "name",
      width: 280,
      fixed: "left",
      lock: true,
      render: (v) => <ValueDisplay value={v} />,
    },
    {
      title: "Код",
      dataIndex: "public_code",
      key: "public_code",
      width: 110,
      fixed: "left",
      lock: true,
      render: (v) => <ValueDisplay value={v} />,
    },
    {
      title: "Страна",
      dataIndex: "country",
      key: "country",
      width: 200,
      render: (v) => <ValueDisplay value={v} />,
    },
    {
      title: "VAT",
      dataIndex: "vat_number",
      key: "vat_number",
      width: 160,
      render: (v) => <ValueDisplay value={v} />,
    },
    {
      title: "Контакт",
      dataIndex: "contact_person",
      key: "contact_person",
      width: 180,
      render: (v) => <ValueDisplay value={v} />,
    },
    {
      title: "Телефон",
      dataIndex: "phone",
      key: "phone",
      width: 170,
      render: (v) => <ValueDisplay value={v} type="phone" />,
    },
    {
      title: "E-mail",
      dataIndex: "email",
      key: "email",
      width: 220,
      render: (v) => <ValueDisplay value={v} type="email" />,
    },
    {
      title: "Примечание",
      dataIndex: "notes",
      key: "notes",
      width: 260,
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
      title: "Срок (база), дн",
      dataIndex: "default_lead_time_days",
      key: "default_lead_time_days",
      width: 140,
      render: (v) => <ValueDisplay value={v} />,
    },
    {
      title: "Валюта",
      dataIndex: "preferred_currency",
      key: "preferred_currency",
      width: 100,
      render: (v) => <ValueDisplay value={v} />,
    },
    {
      title: "Инкотермс",
      dataIndex: "default_incoterms",
      key: "default_incoterms",
      width: 120,
      render: (v) => <ValueDisplay value={v} />,
    },
    {
      title: "Город/порт",
      dataIndex: "default_pickup_location",
      key: "default_pickup_location",
      width: 180,
      render: (v) => <ValueDisplay value={v} />,
    },
    {
      title: "Действия",
      key: "actions",
      width: 150,
      lock: true,
      render: (_, record) => (
        <ActionButtons
          size="small"
          onHistory={() => setLogsSupplierId(record.id)}
          onDelete={() => handleDelete(record)}
          confirmDelete={false}
        />
      ),
    },
  ]

  const defaultVisible = useMemo(() => columns.map((c) => c.key), [columns])
  const effectiveVisibleKeys =
    Array.isArray(visibleColumnKeys) && visibleColumnKeys.length
      ? visibleColumnKeys
      : defaultVisible

  const visibleColumns = useMemo(() => {
    const visible = new Set(effectiveVisibleKeys)
    return columns.filter((c) => c.lock || visible.has(c.key))
  }, [columns, effectiveVisibleKeys])

  const columnOptions = useMemo(
    () =>
      columns
        .filter((c) => c.key && !c.lock)
        .map((c) => ({ key: c.key, label: c.title })),
    [columns]
  )

  const lockedKeys = useMemo(
    () => columns.filter((c) => c.lock).map((c) => c.key),
    [columns]
  )

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
        <Table
          className="op-table"
          size="small"
          bordered
          rowKey="id"
          loading={loading}
          columns={visibleColumns}
          dataSource={dataSource}
          tableLayout="fixed"
          pagination={pagination}
          scroll={{ x: true }}
          rowClassName={(record) =>
            Number(record?.id) === Number(highlightRowId) ? "op-row-flash" : ""
          }
          onRow={(record) => ({
            onClick: (e) => {
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

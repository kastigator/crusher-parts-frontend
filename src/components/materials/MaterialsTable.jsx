import React, { useMemo, useRef } from "react"
import { Tooltip, Button, Popconfirm, Space } from "antd"
import { DeleteOutlined, EditOutlined } from "@ant-design/icons"
import "@/styles/tableStyles.css"
import useTableScrollHints from "@/utils/useTableScrollHints"
import DraggableColumnsTable from "@/components/common/DraggableColumnsTable"
import { getOrderedKeys } from "@/utils/columnOrder"

export default function MaterialsTable({
  data,
  loading,
  onRowClick,
  onEdit,
  onDelete,
  pagination,
  columnOrderKeys = null,
  onColumnOrderKeysChange = null,
}) {
  const wrapRef = useRef(null)
  const scrollHints = useTableScrollHints(wrapRef, [data, loading])
  const columns = useMemo(
    () => [
      {
        title: "Название",
        dataIndex: "name",
        key: "name",
        fixed: "left",
        render: (text, record) => (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontWeight: 600 }}>{text}</span>
            <span style={{ fontSize: 12, color: "#6b7280" }}>
              {record.category_name || "Без категории"}
            </span>
          </div>
        ),
      },
      {
        title: "Код",
        dataIndex: "code",
        key: "code",
        width: 140,
        render: (v) => v || <span style={{ color: "#9ca3af" }}>—</span>,
      },
      {
        title: "Стандарт",
        dataIndex: "standard",
        key: "standard",
        width: 120,
        render: (v) => v || <span style={{ color: "#9ca3af" }}>—</span>,
      },
      {
        title: "Описание",
        dataIndex: "description",
        key: "description",
        ellipsis: true,
        render: (v) =>
          v ? (
            <Tooltip title={v}>
              <span>{v}</span>
            </Tooltip>
          ) : (
            <span style={{ color: "#9ca3af" }}>—</span>
          ),
      },
      {
        title: "Действие",
        key: "actions",
        width: 110,
        align: "center",
        render: (_, record) => (
          <Space size={4}>
            <Tooltip title="Редактировать">
              <Button
                size="small"
                type="text"
                icon={<EditOutlined />}
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit?.(record)
                }}
              />
            </Tooltip>
            <Popconfirm
              title="Удалить материал?"
              okText="Да"
              cancelText="Нет"
              onConfirm={(e) => {
                e?.stopPropagation?.()
                onDelete?.(record)
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <Tooltip title="Удалить">
                <Button
                  size="small"
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={(e) => e.stopPropagation()}
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [onDelete, onEdit],
  )
  const defaultOrder = useMemo(() => columns.map((c) => c.key), [columns])
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
  const nonDraggableKeys = ["actions"]

  return (
    <div
      ref={wrapRef}
      className={`op-table-wrap${scrollHints.left ? " scroll-left" : ""}${
        scrollHints.right ? " scroll-right" : ""
      }`}
    >
      <DraggableColumnsTable
        className="op-table"
        size="small"
        rowKey="id"
        columns={orderedColumns}
        nonDraggableKeys={nonDraggableKeys}
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
        dataSource={data}
        loading={loading}
        pagination={pagination}
        tableLayout="fixed"
        scroll={{ x: true }}
        onRow={(record) => ({
          onClick: () => onRowClick?.(record),
        })}
        locale={{
          emptyText: "Нет данных",
        }}
      />
    </div>
  )
}

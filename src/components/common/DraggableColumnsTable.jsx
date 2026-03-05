import React, { useMemo } from "react"
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core"
import { SortableContext, arrayMove, horizontalListSortingStrategy, useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Table } from "antd"

function DraggableHeaderCell({ children, columnKey, dragDisabled, ...restProps }) {
  const sortable = useSortable({ id: columnKey, disabled: dragDisabled })

  const style = {
    ...restProps.style,
    transform: CSS.Translate.toString(sortable.transform),
    transition: sortable.transition,
    opacity: sortable.isDragging ? 0.5 : 1,
    cursor: dragDisabled ? (restProps.style?.cursor || "default") : "grab",
    userSelect: "none",
  }

  return (
    <th
      {...restProps}
      ref={sortable.setNodeRef}
      style={style}
      className={`${restProps.className || ""}${dragDisabled ? "" : " op-table-dnd-th"}`.trim()}
      {...(!dragDisabled ? sortable.attributes : {})}
      {...(!dragDisabled ? sortable.listeners : {})}
    >
      {children}
    </th>
  )
}

function reorderKeys(keys, activeKey, overKey) {
  const from = keys.indexOf(activeKey)
  const to = keys.indexOf(overKey)
  if (from < 0 || to < 0 || from === to) return keys
  return arrayMove(keys, from, to)
}

export default function DraggableColumnsTable({
  columns,
  onColumnOrderChange,
  nonDraggableKeys = [],
  components,
  ...tableProps
}) {
  const safeColumns = useMemo(() => (Array.isArray(columns) ? columns : []), [columns])

  const draggableKeySet = useMemo(() => {
    const blocked = new Set((Array.isArray(nonDraggableKeys) ? nonDraggableKeys : []).filter(Boolean))
    return new Set(
      safeColumns
        .map((c) => c?.key)
        .filter((key) => key && !blocked.has(key)),
    )
  }, [safeColumns, nonDraggableKeys])

  const sortableKeys = useMemo(
    () => safeColumns.map((c) => c?.key).filter((key) => key && draggableKeySet.has(key)),
    [safeColumns, draggableKeySet],
  )

  const mergedColumns = useMemo(
    () =>
      safeColumns.map((col) => {
        const baseOnHeaderCell = col?.onHeaderCell
        return {
          ...col,
          onHeaderCell: (column) => {
            const base =
              typeof baseOnHeaderCell === "function"
                ? baseOnHeaderCell(column)
                : baseOnHeaderCell || {}
            return {
              ...base,
              columnKey: col.key,
              dragDisabled: !draggableKeySet.has(col.key),
            }
          },
        }
      }),
    [safeColumns, draggableKeySet],
  )

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  )

  const mergedComponents = useMemo(
    () => ({
      ...(components || {}),
      header: {
        ...((components && components.header) || {}),
        cell: DraggableHeaderCell,
      },
    }),
    [components],
  )

  const canDrag = typeof onColumnOrderChange === "function" && sortableKeys.length > 1

  if (!canDrag) {
    return <Table {...tableProps} columns={mergedColumns} components={components} />
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={({ active, over }) => {
        const activeKey = String(active?.id || "")
        const overKey = String(over?.id || "")
        if (!activeKey || !overKey || activeKey === overKey) return

        const next = reorderKeys(sortableKeys, activeKey, overKey)
        if (next !== sortableKeys) {
          onColumnOrderChange({
            activeKey,
            overKey,
            orderedVisibleKeys: next,
          })
        }
      }}
    >
      <SortableContext items={sortableKeys} strategy={horizontalListSortingStrategy}>
        <Table {...tableProps} columns={mergedColumns} components={mergedComponents} />
      </SortableContext>
    </DndContext>
  )
}

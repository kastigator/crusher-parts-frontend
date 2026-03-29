import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core"
import { SortableContext, arrayMove, horizontalListSortingStrategy, useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Table } from "antd"

const clampWidth = (width, minWidth, maxWidth) => {
  const value = Number(width)
  const min = Number(minWidth || 0) || 0
  const max = Number(maxWidth || 0) || 0
  if (!Number.isFinite(value)) return min || max || 120
  if (min && value < min) return min
  if (max && value > max) return max
  return value
}

function DraggableHeaderCell({
  children,
  columnKey,
  dragDisabled,
  resizeDisabled,
  columnWidth,
  minWidth,
  maxWidth,
  onColumnResize,
  ...restProps
}) {
  const sortable = useSortable({ id: columnKey, disabled: dragDisabled })
  const resizeSessionRef = useRef(null)

  const stopResize = useCallback(() => {
    const session = resizeSessionRef.current
    if (!session) return
    window.removeEventListener("pointermove", session.onMove)
    window.removeEventListener("pointerup", session.onUp)
    window.removeEventListener("pointercancel", session.onUp)
    document.body.style.cursor = ""
    document.body.style.userSelect = ""
    resizeSessionRef.current = null
  }, [])

  const startResize = useCallback(
    (e) => {
      if (resizeDisabled || typeof onColumnResize !== "function" || !columnWidth) return
      e.preventDefault()
      e.stopPropagation()

      const startX = e.clientX
      const startWidth = Number(columnWidth) || 0

      const onMove = (moveEvent) => {
        moveEvent.preventDefault()
        const deltaX = moveEvent.clientX - startX
        onColumnResize(columnKey, clampWidth(startWidth + deltaX, minWidth, maxWidth))
      }

      const onUp = () => {
        stopResize()
      }

      resizeSessionRef.current = { onMove, onUp }
      document.body.style.cursor = "col-resize"
      document.body.style.userSelect = "none"
      window.addEventListener("pointermove", onMove)
      window.addEventListener("pointerup", onUp)
      window.addEventListener("pointercancel", onUp)
    },
    [columnKey, columnWidth, maxWidth, minWidth, onColumnResize, resizeDisabled, stopResize],
  )

  const style = {
    ...restProps.style,
    transform: CSS.Translate.toString(sortable.transform),
    transition: sortable.transition,
    opacity: sortable.isDragging ? 0.5 : 1,
    cursor: restProps.style?.cursor || "default",
    userSelect: "none",
    position: "relative",
  }
  const headerNode = (
    <th
      {...restProps}
      ref={sortable.setNodeRef}
      style={style}
      className={`${restProps.className || ""}${dragDisabled ? "" : " op-table-dnd-th"}`.trim()}
    >
      <div className="op-table-th-inner">
        {!dragDisabled ? (
          <span
            className="op-table-drag-handle"
            {...sortable.attributes}
            {...sortable.listeners}
            onClick={(e) => e.stopPropagation()}
            role="button"
            aria-label="Переместить колонку"
            tabIndex={0}
          >
            <span className="op-table-drag-handle__dots" />
          </span>
        ) : null}
        <span className="op-table-th-title">{children}</span>
      </div>
    </th>
  )

  if (resizeDisabled || typeof onColumnResize !== "function" || !columnWidth) {
    return headerNode
  }

  return React.cloneElement(headerNode, {
    children: (
      <>
        {headerNode.props.children}
        <span
          className="op-table-resize-handle"
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={startResize}
          onClick={(e) => e.stopPropagation()}
          role="separator"
          aria-orientation="vertical"
          aria-label="Изменить ширину колонки"
        />
      </>
    ),
  })
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
  onColumnResize,
  columnWidths,
  onColumnWidthsChange,
  columnSizingKey,
  nonDraggableKeys = [],
  components,
  className,
  ...tableProps
}) {
  const safeColumns = useMemo(() => (Array.isArray(columns) ? columns : []), [columns])
  const [localColumnWidths, setLocalColumnWidths] = useState({})

  useEffect(() => {
    if (!columnSizingKey || columnWidths) return
    try {
      const raw = localStorage.getItem(columnSizingKey)
      const parsed = raw ? JSON.parse(raw) : null
      setLocalColumnWidths(parsed && typeof parsed === "object" ? parsed : {})
    } catch {
      setLocalColumnWidths({})
    }
  }, [columnSizingKey, columnWidths])

  useEffect(() => {
    if (!columnSizingKey || columnWidths) return
    try {
      localStorage.setItem(columnSizingKey, JSON.stringify(localColumnWidths || {}))
    } catch {
      // ignore storage errors
    }
  }, [columnSizingKey, columnWidths, localColumnWidths])

  const effectiveColumnWidths = columnWidths || localColumnWidths

  const handleColumnResize = useCallback(
    (columnKey, nextWidth) => {
      if (!columnKey) return
      if (typeof onColumnResize === "function") {
        onColumnResize(columnKey, nextWidth)
        return
      }
      if (typeof onColumnWidthsChange === "function") {
        onColumnWidthsChange({
          ...(effectiveColumnWidths || {}),
          [columnKey]: nextWidth,
        })
        return
      }
      setLocalColumnWidths((prev) => ({
        ...(prev || {}),
        [columnKey]: nextWidth,
      }))
    },
    [effectiveColumnWidths, onColumnResize, onColumnWidthsChange],
  )

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
        const effectiveWidth =
          col?.key && Number.isFinite(Number(effectiveColumnWidths?.[col.key]))
            ? Number(effectiveColumnWidths[col.key])
            : col?.width
        const baseOnHeaderCell = col?.onHeaderCell
        return {
          ...col,
          width: effectiveWidth,
          onHeaderCell: (column) => {
            const base =
              typeof baseOnHeaderCell === "function"
                ? baseOnHeaderCell(column)
                : baseOnHeaderCell || {}
            return {
              ...base,
              columnKey: col.key,
              dragDisabled: !draggableKeySet.has(col.key),
              resizeDisabled:
                (typeof handleColumnResize !== "function" && typeof onColumnResize !== "function") ||
                col?.resizable === false ||
                !col?.key,
              columnWidth: effectiveWidth,
              minWidth: col?.minWidth || 80,
              maxWidth: col?.maxWidth || 640,
              onColumnResize: handleColumnResize,
            }
          },
        }
      }),
    [safeColumns, draggableKeySet, effectiveColumnWidths, handleColumnResize, onColumnResize],
  )

  const computedTableWidth = useMemo(
    () =>
      mergedColumns.reduce((sum, column) => {
        const width = Number(column?.width)
        return sum + (Number.isFinite(width) ? width : 160)
      }, 0),
    [mergedColumns],
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
  const canResize =
    typeof onColumnResize === "function" ||
    typeof onColumnWidthsChange === "function" ||
    Boolean(columnSizingKey)
  const tableClassName = [className, canResize ? "op-table--resizable" : ""]
    .filter(Boolean)
    .join(" ")

  const resolvedStyle = useMemo(() => {
    if (!canResize) return tableProps.style
    return {
      ...(tableProps.style || {}),
      "--op-table-resizable-width": `${computedTableWidth}px`,
    }
  }, [canResize, computedTableWidth, tableProps.style])

  const resolvedScroll = useMemo(() => {
    const incoming = tableProps.scroll
    if (!canResize) return incoming
    if (!incoming) return { x: computedTableWidth }

    const next = { ...incoming }
    if (
      next.x === undefined ||
      next.x === true ||
      next.x === "max-content"
    ) {
      next.x = computedTableWidth
    }
    return next
  }, [canResize, computedTableWidth, tableProps.scroll])

  if (!canDrag) {
    return (
      <Table
        {...tableProps}
        style={resolvedStyle}
        scroll={resolvedScroll}
        className={tableClassName}
        columns={mergedColumns}
        components={mergedComponents}
      />
    )
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
        <Table
          {...tableProps}
          style={resolvedStyle}
          scroll={resolvedScroll}
          className={tableClassName}
          columns={mergedColumns}
          components={mergedComponents}
        />
      </SortableContext>
    </DndContext>
  )
}

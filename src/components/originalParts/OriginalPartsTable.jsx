import React, { useState, useEffect, useMemo, useRef } from "react"
import { message } from "antd"
import ActionButtons from "@/components/common/ActionButtons"
import FullHistoryDialog from "@/components/common/FullHistoryDialog"
import ValueDisplay from "@/components/common/ValueDisplay"
import createTablePagination from "@/utils/tablePagination"
import useTableScrollHints from "@/utils/useTableScrollHints"
import DraggableColumnsTable from "@/components/common/DraggableColumnsTable"
import { getOrderedKeys } from "@/utils/columnOrder"
import { formatUomLabel } from "@/utils/uom"
import { runTrashDeleteFlow } from "@/utils/trashUi"

/**
 * Таблица оригинальных деталей.
 */
export default function OriginalPartsTable({
  data = [],
  loading = false,
  modelId: _modelId = null, // сейчас не используется, но оставляем на будущее
  onReload,
  onRemove,
  onOpenDetail,
  onEditRecord,
  onFlashRow: _onFlashRow, // (id:number) => void - подсветка строки после сохранения
  showAll = false, // 🔹 режим "Показать все детали"
  visibleColumnKeys = null, // array|null: управляемая видимость колонок (пер-viewMode)
  onVisibleColumnKeysChange: _onVisibleColumnKeysChange = null, // (nextKeys: string[]) => void
  onColumnsMeta = null, // ({ options, defaultVisible, lockedKeys }) => void
  columnOrderKeys = null,
  onColumnOrderKeysChange = null,
  highlightRowId = null, // number|null: подсветить/проскроллить к строке
}) {
  const [historyId, setHistoryId] = useState(null)

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const tableWrapRef = useRef(null)

  const scrollHints = useTableScrollHints(tableWrapRef, [
    data,
    loading,
    page,
    pageSize,
    showAll,
  ])

  // If a highlighted row is outside the current page, jump to that page first.
  useEffect(() => {
    const id = Number(highlightRowId)
    if (!id) return
    const arr = Array.isArray(data) ? data : []
    const idx = arr.findIndex((r) => Number(r?.id) === id)
    if (idx < 0) return
    const targetPage = Math.floor(idx / pageSize) + 1
    if (targetPage !== page) setPage(targetPage)
  }, [highlightRowId, data, page, pageSize])

  // Smooth scroll to the highlighted row inside the table body.
  useEffect(() => {
    const id = Number(highlightRowId)
    if (!id) return
    const wrap = tableWrapRef.current
    if (!wrap) return
    const row = wrap.querySelector(`tr[data-row-key="${id}"]`)
    if (!row) return
    try {
      row.scrollIntoView({ block: "center", behavior: "smooth" })
    } catch {
      row.scrollIntoView()
    }
  }, [highlightRowId, page, pageSize, data])

  /* -----------------------------------------------------------
     Фильтры для колонок
  ----------------------------------------------------------- */

  // Производитель (для режима showAll)
  const manufacturerFilters = useMemo(() => {
    const set = new Set()
    ;(Array.isArray(data) ? data : []).forEach((r) => {
      if (r.manufacturer_name) set.add(r.manufacturer_name)
    })
    return Array.from(set)
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({ text: name, value: name }))
  }, [data])

  // Модель (для режима showAll)
  const modelFilters = useMemo(() => {
    const set = new Set()
    ;(Array.isArray(data) ? data : []).forEach((r) => {
      if (r.model_name) set.add(r.model_name)
    })
    return Array.from(set)
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({ text: name, value: name }))
  }, [data])

  const clientFilters = useMemo(() => {
    const set = new Set()
    ;(Array.isArray(data) ? data : []).forEach((r) => {
      String(r.client_names || "")
        .split("|")
        .map((v) => v.trim())
        .filter(Boolean)
        .forEach((name) => set.add(name))
    })
    return Array.from(set)
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({ text: name, value: name }))
  }, [data])

  const clientMachineFilters = useMemo(() => {
    const set = new Set()
    ;(Array.isArray(data) ? data : []).forEach((r) => {
      String(r.client_machine_refs || "")
        .split("|")
        .map((v) => v.trim())
        .filter(Boolean)
        .forEach((name) => set.add(name))
    })
    return Array.from(set)
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({ text: name, value: name }))
  }, [data])

  // Группа (работает всегда, если есть group_name)
  const groupFilters = useMemo(() => {
    const set = new Set()
    ;(Array.isArray(data) ? data : []).forEach((r) => {
      if (r.group_name) set.add(r.group_name)
    })
    return Array.from(set)
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({ text: name, value: name }))
  }, [data])

  // ТН ВЭД (по коду)
  const tnvedFilters = useMemo(() => {
    const set = new Set()
    ;(Array.isArray(data) ? data : []).forEach((r) => {
      const code = r.tnved_code_text || r.tnved_code
      if (code) set.add(code)
    })
    return Array.from(set)
      .sort((a, b) => a.localeCompare(b))
      .map((code) => ({ text: code, value: code }))
  }, [data])

  /* -----------------------------------------------------------
     Удаление детали
  ----------------------------------------------------------- */
  const handleDelete = async (record) => {
    try {
      const targetModelId = Number(record?.equipment_model_id || _modelId || 0) || null
      const entityType = targetModelId ? "oem_part_model_fitments" : "oem_parts"
      const deleteUrl = targetModelId ? `/original-parts/${record.id}` : `/oem-parts/${record.id}`
      const result = await runTrashDeleteFlow({
        entityType,
        entityId: record.id,
        deleteUrl,
        deleteParams: targetModelId ? { equipment_model_id: targetModelId } : undefined,
        previewParams: targetModelId ? { equipment_model_id: targetModelId } : undefined,
        successMessage: targetModelId
          ? "Деталь удалена из модели"
          : "OEM деталь перемещена в корзину",
      })
      if (!result?.deleted) return
      if (typeof onRemove === "function") onRemove(record.id)
      if (typeof onReload === "function") onReload()
    } catch (err) {
      console.error(err)
      message.error("Ошибка удаления детали")
    }
  }

  /* -----------------------------------------------------------
     Колонки
  ----------------------------------------------------------- */
  const columnDefs = [
    // 🔹 в режиме "Показать все" добавляем производителя и модель
    ...(showAll
      ? [
          {
            key: "manufacturer",
            title: "Производитель",
            dataIndex: "manufacturer_name",
            width: 160,
            minWidth: 110,
            maxWidth: 260,
            ellipsis: { showTitle: false },
            onCell: () => ({ style: { overflow: "hidden" } }),
            filters: manufacturerFilters,
            onFilter: (value, record) =>
              (record.manufacturer_name || "") === value,
            sorter: (a, b) =>
              (a.manufacturer_name || "").localeCompare(
                b.manufacturer_name || "",
              ),
            sortDirections: ["ascend", "descend"],
            defaultSortOrder: "ascend",
          },
          {
            key: "model",
            title: "Модель оборудования",
            dataIndex: "model_name",
            width: 160,
            minWidth: 110,
            maxWidth: 280,
            ellipsis: { showTitle: false },
            onCell: () => ({ style: { overflow: "hidden" } }),
            filters: modelFilters,
            onFilter: (value, record) =>
              (record.model_name || "") === value,
            sorter: (a, b) =>
              (a.model_name || "").localeCompare(b.model_name || ""),
            sortDirections: ["ascend", "descend"],
          },
          {
            key: "client_names",
            title: "Клиенты",
            dataIndex: "client_names",
            width: 220,
            ellipsis: true,
            filters: clientFilters,
            onFilter: (value, record) =>
              String(record.client_names || "")
                .split("|")
                .map((v) => v.trim())
                .includes(String(value || "")),
            render: (value) => <ValueDisplay value={value ? value.replaceAll(" | ", ", ") : ""} />,
          },
          {
            key: "client_machine_refs",
            title: "Машины клиентов",
            dataIndex: "client_machine_refs",
            width: 260,
            ellipsis: true,
            filters: clientMachineFilters,
            onFilter: (value, record) =>
              String(record.client_machine_refs || "")
                .split("|")
                .map((v) => v.trim())
                .includes(String(value || "")),
            sorter: (a, b) => Number(a.client_units_count || 0) - Number(b.client_units_count || 0),
            sortDirections: ["ascend", "descend"],
            render: (value, record) => {
              const text = value ? value.replaceAll(" | ", ", ") : ""
              if (text) return <ValueDisplay value={text} />
              return Number(record.client_units_count || 0) > 0
                ? <ValueDisplay value={`${Number(record.client_units_count || 0)} шт.`} />
                : <ValueDisplay value="" />
            },
          },
        ]
      : []),

    {
      key: "cat_number",
      title: "Part number",
      dataIndex: "cat_number",
      width: 160,
      minWidth: 100,
      maxWidth: 280,
      ellipsis: { showTitle: false },
      onCell: () => ({ style: { overflow: "hidden" } }),
      sorter: (a, b) =>
        (a.cat_number || "").localeCompare(b.cat_number || ""),
      sortDirections: ["ascend", "descend"],
      render: (value) => <ValueDisplay value={value} />,
    },
    {
      key: "description_ru",
      title: "Описание (RU)",
      dataIndex: "description_ru",
      ellipsis: { showTitle: false },
      width: 260,
      minWidth: 140,
      maxWidth: 460,
      onCell: () => ({
        style: { overflow: "hidden" },
      }),
      render: (value) => <ValueDisplay value={value} />,
    },
    {
      key: "description_en",
      title: "Description (EN)",
      dataIndex: "description_en",
      ellipsis: { showTitle: false },
      width: 220,
      minWidth: 120,
      maxWidth: 420,
      onCell: () => ({
        style: { overflow: "hidden" },
      }),
      render: (value) => <ValueDisplay value={value} />,
    },

    // 🔹 Группа
    {
      key: "group_name",
      title: "Группа",
      dataIndex: "group_name",
      width: 160,
      minWidth: 110,
      maxWidth: 320,
      ellipsis: { showTitle: false },
      onCell: () => ({ style: { overflow: "hidden" } }),
      sorter: (a, b) =>
        (a.group_name || "").localeCompare(b.group_name || ""),
      sortDirections: ["ascend", "descend"],
      filters: groupFilters,
      onFilter: (value, record) =>
        (record.group_name || "") === (value || ""),
      render: (text) => <ValueDisplay value={text} />,
    },

    // 🔹 ТН ВЭД (короткая колонка, полное описание — в раскрытии)
    {
      key: "tnved_code",
      title: "ТН ВЭД",
      dataIndex: "tnved_code_text", // приходит из JOIN с tnved_codes
      width: 120,
      minWidth: 90,
      maxWidth: 220,
      ellipsis: { showTitle: false },
      onCell: () => ({ style: { overflow: "hidden" } }),
      filters: tnvedFilters,
      onFilter: (value, record) =>
        (record.tnved_code_text || record.tnved_code || "") === (value || ""),
      render: (_, record) => {
        const code =
          record.tnved_code_text || record.tnved_code || "" // fallback
        if (!code) return ""
        const tooltipParts = []
        if (record.tnved_description) tooltipParts.push(record.tnved_description)
        return (
          <span title={tooltipParts.join(" ") || undefined}>{code}</span>
        )
      },
    },

    // 🔹 Вес
    {
      key: "weight_kg",
      title: "Вес, кг",
      dataIndex: "weight_kg",
      align: "right",
      width: 120,
      sorter: (a, b) => (a.weight_kg || 0) - (b.weight_kg || 0),
      sortDirections: ["ascend", "descend"],
      render: (value) => value,
    },

    {
      key: "uom",
      title: "Ед. изм.",
      dataIndex: "uom",
      width: 110,
      render: (value) => formatUomLabel(value) || "",
    },

    // 🔹 Габариты
    {
      key: "dims",
      title: "Габариты, см",
      dataIndex: "length_cm",
      width: 200,
      render: (_, record) => {
        const { length_cm, width_cm, height_cm } = record
        if (length_cm == null && width_cm == null && height_cm == null) {
          return ""
        }
        const fmt = (v) => (v == null ? "-" : Number(v))
        return `${fmt(length_cm)} × ${fmt(width_cm)} × ${fmt(height_cm)}`
      },
    },

    {
      key: "is_overweight",
      title: "Тяжелая",
      dataIndex: "is_overweight",
      width: 110,
      render: (v) => (v ? "Да" : "Нет"),
    },
    {
      key: "is_oversize",
      title: "Негабарит",
      dataIndex: "is_oversize",
      width: 110,
      render: (v) => (v ? "Да" : "Нет"),
    },

    // 🔹 Наличие чертежа/КД
    {
      key: "has_drawing",
      title: "Докум.",
      dataIndex: "has_drawing",
      width: 90,
      render: (v) => (v ? "Да" : "Нет"),
    },

    {
      key: "is_assembly",
      title: "Сборка",
      dataIndex: "is_assembly",
      width: 90,
      render: (v) => (v ? "Да" : "Нет"),
    },
    {
      key: "actions",
      title: "Действия",
      width: 120,
      render: (_, record) => (
        <ActionButtons
          size="small"
          onEdit={() => onEditRecord?.(record)}
          onHistory={() => setHistoryId(record.id)}
          onDelete={() => handleDelete(record)}
          titles={{
            history: "История изменений",
            delete: "Удалить деталь",
          }}
        />
      ),
    },
  ]

  const defaultVisible = [
    ...(showAll ? ["manufacturer", "model"] : []),
    "cat_number",
    "description_ru",
    "group_name",
    "tnved_code",
    "weight_kg",
    "uom",
    "is_assembly",
    "actions",
  ].filter((key) => columnDefs.some((column) => column.key === key))
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
    [columnOrderKeys, defaultOrder]
  )

  const orderedColumnDefs = (() => {
    const idx = new Map(effectiveOrderKeys.map((k, i) => [k, i]))
    return [...columnDefs].sort((a, b) => {
      const ai = idx.has(a.key) ? idx.get(a.key) : Number.MAX_SAFE_INTEGER
      const bi = idx.has(b.key) ? idx.get(b.key) : Number.MAX_SAFE_INTEGER
      return ai - bi
    })
  })()

  const columns = (() => {
    const visible = new Set(effectiveVisibleKeys)
    return orderedColumnDefs.filter((c) => c.lock || visible.has(c.key))
  })()

  const columnOptions = columnDefs
    .filter((c) => c.key && !c.lock)
    .map((c) => ({ key: c.key, label: c.title }))

  const lockedKeys = columnDefs.filter((c) => c.lock).map((c) => c.key)

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
        ref={tableWrapRef}
        className={`op-table-wrap${scrollHints.left ? " scroll-left" : ""}${
          scrollHints.right ? " scroll-right" : ""
        }`}
      >
        <DraggableColumnsTable
          className="op-table op-table-originals"
          columnSizingKey="original_parts_column_widths_v1"
          rowKey="id"
          columns={columns}
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
          dataSource={Array.isArray(data) ? data : []}
          loading={loading}
          rowClassName={(record) =>
            Number(record?.id) === Number(highlightRowId) ? "op-row-flash" : ""
          }
          pagination={createTablePagination({
            page,
            pageSize,
            total: Array.isArray(data) ? data.length : 0,
            setPage,
            setPageSize,
            getPopupContainer: () => tableWrapRef.current || document.body,
          })}
          tableLayout="fixed"
          scroll={{ x: "max-content", y: 480 }}
          size="middle"
          onRow={(record) => ({
            onDoubleClick: (e) => {
              const target = e?.target
              if (target?.closest?.("button,a,input,textarea,select,.ant-btn,.ant-select,.ant-input,.ant-input-number")) {
                return
              }
              onOpenDetail?.(record)
            },
          })}
        />
      </div>

      {historyId != null && (
        <FullHistoryDialog
          entityType="original_parts"
          entityId={historyId}
          onClose={() => setHistoryId(null)}
        />
      )}
    </>
  )
}

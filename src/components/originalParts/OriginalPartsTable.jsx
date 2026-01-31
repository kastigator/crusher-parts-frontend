import React, { useState, useEffect, useMemo, useRef } from "react"
import { Table, message, Input, InputNumber, Select, Checkbox, Space } from "antd"
import axios from "@/api/axiosInstance"
import confirmAction from "@/utils/confirmAction"
import ActionButtons from "@/components/common/ActionButtons"
import FullHistoryDialog from "@/components/common/FullHistoryDialog"
import ValueDisplay from "@/components/common/ValueDisplay"
import createTablePagination from "@/utils/tablePagination"
import useTableScrollHints from "@/utils/useTableScrollHints"

const UOM_OPTIONS = [
  { value: "pcs", label: "шт" },
  { value: "kg", label: "кг" },
  { value: "set", label: "компл." },
]

const getUomLabel = (value) => {
  if (!value) return ""
  const normalized = String(value).toLowerCase()
  return UOM_OPTIONS.find((opt) => opt.value === normalized)?.label || value
}

/**
 * Таблица оригинальных деталей.
 */
export default function OriginalPartsTable({
  data = [],
  loading = false,
  modelId = null, // сейчас не используется, но оставляем на будущее
  onReload,
  onRemove,
  onOpenDetail,
  onFlashRow, // (id:number) => void - подсветка строки после сохранения
  showAll = false, // 🔹 режим "Показать все детали"
  visibleColumnKeys = null, // array|null: управляемая видимость колонок (пер-viewMode)
  onVisibleColumnKeysChange = null, // (nextKeys: string[]) => void
  onColumnsMeta = null, // ({ options, defaultVisible, lockedKeys }) => void
  highlightRowId = null, // number|null: подсветить/проскроллить к строке
}) {
  const [historyId, setHistoryId] = useState(null)

  // 🔹 справочник групп (для редактирования)
  const [groups, setGroups] = useState([])
  const [groupsLoading, setGroupsLoading] = useState(false)

  // 🔹 inline-редактирование
  const [editingId, setEditingId] = useState(null)
  const [editingValues, setEditingValues] = useState({
    cat_number: "",
    description_ru: "",
    description_en: "",
    weight_kg: null,
    uom: "pcs",
    group_id: null,
    has_drawing: false,
    is_overweight: false,
    is_oversize: false,
    length_cm: null,
    width_cm: null,
    height_cm: null,
    tech_description: "",
    tnved: null, // объект от TnvedPicker (или null)
  })
  const [savingEdit, setSavingEdit] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const tableWrapRef = useRef(null)

  /* -----------------------------------------------------------
     Группы
  ----------------------------------------------------------- */
  useEffect(() => {
    const loadGroups = async () => {
      setGroupsLoading(true)
      try {
        const { data } = await axios.get("/original-part-groups")
        setGroups(Array.isArray(data) ? data : [])
      } catch (e) {
        console.error("Не удалось загрузить группы деталей", e)
        message.error("Не удалось загрузить группы деталей")
      } finally {
        setGroupsLoading(false)
      }
    }
    loadGroups()
  }, [])

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
    const { confirmed } = await confirmAction(
      `Удалить деталь ${record.cat_number || ""}?`,
    )
    if (!confirmed) return
    try {
      await axios.delete(`/original-parts/${record.id}`)
      message.success("Деталь удалена")
      if (typeof onRemove === "function") onRemove(record.id)
      if (typeof onReload === "function") onReload()
    } catch (err) {
      console.error(err)
      message.error("Ошибка удаления детали")
    }
  }

  /* -----------------------------------------------------------
     Inline-редактирование
  ----------------------------------------------------------- */
  const startEdit = (record) => {
    if (editingId && editingId !== record.id) {
      message.warning("Сначала сохраните или отмените текущие изменения")
      return
    }
    setEditingId(record.id)

    // объект ТН ВЭД для пикапера (если есть)
    let tnvedObj = null
    if (record.tnved_code_id) {
      tnvedObj = {
        id: record.tnved_code_id,
        code: record.tnved_code_text || record.tnved_code || "",
        description: record.tnved_description || "",
      }
    }

    setEditingValues({
      cat_number: record.cat_number || "",
      description_ru: record.description_ru || "",
      description_en: record.description_en || "",
      weight_kg:
        record.weight_kg === undefined || record.weight_kg === null
          ? null
          : Number(record.weight_kg),
      uom: record.uom ? String(record.uom).toLowerCase() : "pcs",
      group_id:
        record.group_id === undefined || record.group_id === null
          ? null
          : record.group_id,
      has_drawing: !!record.has_drawing,
      is_overweight: !!record.is_overweight,
      is_oversize: !!record.is_oversize,
      length_cm:
        record.length_cm === undefined || record.length_cm === null
          ? null
          : Number(record.length_cm),
      width_cm:
        record.width_cm === undefined || record.width_cm === null
          ? null
          : Number(record.width_cm),
      height_cm:
        record.height_cm === undefined || record.height_cm === null
          ? null
          : Number(record.height_cm),
      tech_description: record.tech_description || "",
      tnved: tnvedObj,
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingValues({
      cat_number: "",
      description_ru: "",
      description_en: "",
      weight_kg: null,
      uom: "pcs",
      group_id: null,
      has_drawing: false,
      is_overweight: false,
      is_oversize: false,
      length_cm: null,
      width_cm: null,
      height_cm: null,
      tech_description: "",
      tnved: null,
    })
  }

  const saveEdit = async (id) => {
    if (!id) return
    setSavingEdit(true)
    try {
      const toNum = (v) =>
        v === null || v === "" || Number.isNaN(Number(v))
          ? null
          : Number(v)

      const payload = {
        cat_number: editingValues.cat_number || null,
        description_ru: editingValues.description_ru || null,
        description_en: editingValues.description_en || null,
        weight_kg: toNum(editingValues.weight_kg),
        uom: editingValues.uom || null,
        group_id:
          editingValues.group_id === undefined ||
          editingValues.group_id === null ||
          editingValues.group_id === ""
            ? null
            : Number(editingValues.group_id),
        has_drawing: editingValues.has_drawing ? 1 : 0,
        is_overweight: editingValues.is_overweight ? 1 : 0,
        is_oversize: editingValues.is_oversize ? 1 : 0,
        length_cm: toNum(editingValues.length_cm),
        width_cm: toNum(editingValues.width_cm),
        height_cm: toNum(editingValues.height_cm),
        tech_description:
          editingValues.tech_description?.trim() === ""
            ? null
            : editingValues.tech_description.trim(),
        tnved_code_id: editingValues.tnved?.id ?? null,
      }

      await axios.put(`/original-parts/${id}`, payload)
      message.success("Изменения сохранены")
      onFlashRow?.(id)
      cancelEdit()
      if (typeof onReload === "function") onReload()
    } catch (e) {
      console.error(e)
      if (e?.response?.data?.message) {
        message.error(e.response.data.message)
      } else {
        message.error("Не удалось сохранить изменения")
      }
    } finally {
      setSavingEdit(false)
    }
  }

  const makeKeyHandler = (id) => (e) => {
    if (e.key === "Escape") {
      e.stopPropagation()
      cancelEdit()
    } else if (e.key === "Enter") {
      e.preventDefault()
      e.stopPropagation()
      saveEdit(id)
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
            fixed: "left",
            ellipsis: true,
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
            fixed: "left",
            ellipsis: true,
            filters: modelFilters,
            onFilter: (value, record) =>
              (record.model_name || "") === value,
            sorter: (a, b) =>
              (a.model_name || "").localeCompare(b.model_name || ""),
            sortDirections: ["ascend", "descend"],
          },
        ]
      : []),

    {
      key: "cat_number",
      title: "Part number",
      dataIndex: "cat_number",
      width: 160,
      fixed: "left",
      sorter: (a, b) =>
        (a.cat_number || "").localeCompare(b.cat_number || ""),
      sortDirections: ["ascend", "descend"],
      render: (value, record) => {
        if (record.id !== editingId) return <ValueDisplay value={value} />
        return (
          <Input
            value={editingValues.cat_number}
            onChange={(e) =>
              setEditingValues((prev) => ({
                ...prev,
                cat_number: e.target.value,
              }))
            }
            onKeyDown={makeKeyHandler(record.id)}
          />
        )
      },
    },
    {
      key: "description_ru",
      title: "Описание (RU)",
      dataIndex: "description_ru",
      ellipsis: true,
      width: 260,
      onHeaderCell: () => ({
        style: { width: 260, minWidth: 260, maxWidth: 260 },
      }),
      onCell: () => ({
        style: { width: 260, minWidth: 260, maxWidth: 260 },
      }),
      render: (value, record) => {
        if (record.id !== editingId)
          return <ValueDisplay value={value} />
        return (
          <Input
            value={editingValues.description_ru}
            onChange={(e) =>
              setEditingValues((prev) => ({
                ...prev,
                description_ru: e.target.value,
              }))
            }
            onKeyDown={makeKeyHandler(record.id)}
          />
        )
      },
    },
    {
      key: "description_en",
      title: "Description (EN)",
      dataIndex: "description_en",
      ellipsis: true,
      width: 220,
      onHeaderCell: () => ({
        style: { width: 220, minWidth: 220, maxWidth: 220 },
      }),
      onCell: () => ({
        style: { width: 220, minWidth: 220, maxWidth: 220 },
      }),
      render: (value, record) => {
        if (record.id !== editingId)
          return <ValueDisplay value={value} />
        return (
          <Input
            value={editingValues.description_en}
            onChange={(e) =>
              setEditingValues((prev) => ({
                ...prev,
                description_en: e.target.value,
              }))
            }
            onKeyDown={makeKeyHandler(record.id)}
          />
        )
      },
    },

    // 🔹 Группа
    {
      key: "group_name",
      title: "Группа",
      dataIndex: "group_name",
      width: 160,
      ellipsis: true,
      sorter: (a, b) =>
        (a.group_name || "").localeCompare(b.group_name || ""),
      sortDirections: ["ascend", "descend"],
      filters: groupFilters,
      onFilter: (value, record) =>
        (record.group_name || "") === (value || ""),
      render: (text, record) => {
        if (record.id !== editingId) return <ValueDisplay value={text} />
        return (
          <Select
            style={{ width: "100%" }}
            placeholder="Не выбрано"
            allowClear
            loading={groupsLoading}
            value={
              editingValues.group_id === null
                ? undefined
                : editingValues.group_id
            }
            options={groups.map((g) => ({
              value: g.id,
              label: g.name,
            }))}
            onChange={(val) =>
              setEditingValues((prev) => ({
                ...prev,
                group_id: val ?? null,
              }))
            }
            onKeyDown={makeKeyHandler(record.id)}
          />
        )
      },
    },

    // 🔹 ТН ВЭД (короткая колонка, полное описание — в раскрытии)
    {
      key: "tnved_code",
      title: "ТН ВЭД",
      dataIndex: "tnved_code_text", // приходит из JOIN с tnved_codes
      width: 120,
      ellipsis: true,
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
      render: (value, record) => {
        if (record.id !== editingId) return value
        return (
          <InputNumber
            style={{ width: "100%" }}
            min={0}
            step={0.001}
            value={editingValues.weight_kg}
            onChange={(val) =>
              setEditingValues((prev) => ({
                ...prev,
                weight_kg: val,
              }))
            }
            onKeyDown={makeKeyHandler(record.id)}
          />
        )
      },
    },

    {
      key: "uom",
      title: "Ед. изм.",
      dataIndex: "uom",
      width: 110,
      render: (value, record) => {
        if (record.id !== editingId) {
          return getUomLabel(value)
        }
        return (
          <Select
            style={{ width: "100%" }}
            value={editingValues.uom || undefined}
            options={UOM_OPTIONS}
            onChange={(val) =>
              setEditingValues((prev) => ({ ...prev, uom: val }))
            }
            onKeyDown={makeKeyHandler(record.id)}
          />
        )
      },
    },

    // 🔹 Габариты
    {
      key: "dims",
      title: "Габариты, см",
      dataIndex: "length_cm",
      width: 200,
      render: (_, record) => {
        if (record.id !== editingId) {
          const { length_cm, width_cm, height_cm } = record
          if (
            length_cm == null &&
            width_cm == null &&
            height_cm == null
          ) {
            return ""
          }
          const fmt = (v) => (v == null ? "-" : Number(v))
          return `${fmt(length_cm)} × ${fmt(width_cm)} × ${fmt(height_cm)}`
        }

        return (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <InputNumber
              style={{ width: 70 }}
              min={0}
              step={0.1}
              value={editingValues.length_cm}
              onChange={(val) =>
                setEditingValues((prev) => ({
                  ...prev,
                  length_cm: val,
                }))
              }
              onKeyDown={makeKeyHandler(record.id)}
            />
            <span>×</span>
            <InputNumber
              style={{ width: 70 }}
              min={0}
              step={0.1}
              value={editingValues.width_cm}
              onChange={(val) =>
                setEditingValues((prev) => ({
                  ...prev,
                  width_cm: val,
                }))
              }
              onKeyDown={makeKeyHandler(record.id)}
            />
            <span>×</span>
            <InputNumber
              style={{ width: 70 }}
              min={0}
              step={0.1}
              value={editingValues.height_cm}
              onChange={(val) =>
                setEditingValues((prev) => ({
                  ...prev,
                  height_cm: val,
                }))
              }
              onKeyDown={makeKeyHandler(record.id)}
            />
          </div>
        )
      },
    },

    {
      key: "is_overweight",
      title: "Тяжелая",
      dataIndex: "is_overweight",
      width: 110,
      render: (v, record) => {
        if (record.id !== editingId) return v ? "Да" : "Нет"
        return (
          <Checkbox
            checked={!!editingValues.is_overweight}
            onChange={(e) =>
              setEditingValues((prev) => ({
                ...prev,
                is_overweight: e.target.checked,
              }))
            }
            onKeyDown={makeKeyHandler(record.id)}
          >
            Да
          </Checkbox>
        )
      },
    },
    {
      key: "is_oversize",
      title: "Негабарит",
      dataIndex: "is_oversize",
      width: 110,
      render: (v, record) => {
        if (record.id !== editingId) return v ? "Да" : "Нет"
        return (
          <Checkbox
            checked={!!editingValues.is_oversize}
            onChange={(e) =>
              setEditingValues((prev) => ({
                ...prev,
                is_oversize: e.target.checked,
              }))
            }
            onKeyDown={makeKeyHandler(record.id)}
          >
            Да
          </Checkbox>
        )
      },
    },

    // 🔹 Наличие чертежа/КД
    {
      key: "has_drawing",
      title: "Докум.",
      dataIndex: "has_drawing",
      width: 90,
      render: (v, record) => {
        if (record.id !== editingId) {
          return v ? "Да" : "Нет"
        }
        return (
          <Checkbox
            checked={!!editingValues.has_drawing}
            onChange={(e) =>
              setEditingValues((prev) => ({
                ...prev,
                has_drawing: e.target.checked,
              }))
            }
            onKeyDown={makeKeyHandler(record.id)}
          >
            Есть
          </Checkbox>
        )
      },
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
      width: 180,
      lock: true,
      render: (_, record) => (
        <ActionButtons
          size="small"
          onEdit={editingId !== record.id ? () => startEdit(record) : undefined}
          onSave={editingId === record.id ? () => saveEdit(record.id) : undefined}
          onCancel={editingId === record.id ? cancelEdit : undefined}
          onHistory={editingId ? undefined : () => setHistoryId(record.id)}
          onDelete={editingId !== record.id ? () => handleDelete(record) : undefined}
          disabledEdit={!!editingId && editingId !== record.id}
          disabledDelete={!!editingId && editingId !== record.id}
          titles={{
            history: "История изменений",
            delete: "Удалить деталь",
          }}
        />
      ),
    },
  ]

  const defaultVisible = useMemo(() => columnDefs.map((c) => c.key), [columnDefs])
  const effectiveVisibleKeys =
    Array.isArray(visibleColumnKeys) && visibleColumnKeys.length
      ? visibleColumnKeys
      : defaultVisible

  const columns = useMemo(() => {
    const visible = new Set(effectiveVisibleKeys)
    return columnDefs.filter((c) => c.lock || visible.has(c.key))
  }, [columnDefs, effectiveVisibleKeys])

  const columnOptions = columnDefs
    .filter((c) => c.key && !c.lock)
    .map((c) => ({ key: c.key, label: c.title }))

  const lockedKeys = useMemo(
    () => columnDefs.filter((c) => c.lock).map((c) => c.key),
    [columnDefs]
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
        ref={tableWrapRef}
        className={`op-table-wrap${scrollHints.left ? " scroll-left" : ""}${
          scrollHints.right ? " scroll-right" : ""
        }`}
      >
        <Table
          className="op-table op-table-originals"
          rowKey="id"
          columns={columns}
          dataSource={Array.isArray(data) ? data : []}
          loading={loading || savingEdit}
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
            onClick: (e) => {
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

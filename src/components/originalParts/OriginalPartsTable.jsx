import React, { useState, useEffect, useMemo } from "react"
import { Table, message, Input, InputNumber, Select, Checkbox } from "antd"
import axios from "@/api/axiosInstance"
import confirmAction from "@/utils/confirmAction"
import ActionButtons from "@/components/common/ActionButtons"
import FullHistoryDialog from "@/components/common/FullHistoryDialog"

/**
 * Таблица оригинальных деталей.
 */
export default function OriginalPartsTable({
  data = [],
  loading = false,
  modelId = null, // сейчас не используется, но оставляем на будущее
  onReload,
  onRemove,
  onSelect,
  selectedId = null,
  showAll = false, // 🔹 режим "Показать все детали"
}) {
  const [historyId, setHistoryId] = useState(null)

  // 🔹 справочник групп
  const [groups, setGroups] = useState([])
  const [groupsLoading, setGroupsLoading] = useState(false)

  // 🔹 inline-редактирование
  const [editingId, setEditingId] = useState(null)
  const [editingValues, setEditingValues] = useState({
    cat_number: "",
    description_ru: "",
    description_en: "",
    weight_kg: null,
    group_id: null,
    has_drawing: false,
    length_cm: null,
    width_cm: null,
    height_cm: null,
  })
  const [savingEdit, setSavingEdit] = useState(false)

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

  /* -----------------------------------------------------------
     Варианты для фильтров Производитель / Модель
  ----------------------------------------------------------- */
  const manufacturerFilters = useMemo(() => {
    const set = new Set()
    ;(Array.isArray(data) ? data : []).forEach((r) => {
      if (r.manufacturer_name) set.add(r.manufacturer_name)
    })
    return Array.from(set)
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({ text: name, value: name }))
  }, [data])

  const modelFilters = useMemo(() => {
    const set = new Set()
    ;(Array.isArray(data) ? data : []).forEach((r) => {
      if (r.model_name) set.add(r.model_name)
    })
    return Array.from(set)
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({ text: name, value: name }))
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
    setEditingId(record.id)
    setEditingValues({
      cat_number: record.cat_number || "",
      description_ru: record.description_ru || "",
      description_en: record.description_en || "",
      weight_kg:
        record.weight_kg === undefined || record.weight_kg === null
          ? null
          : Number(record.weight_kg),
      group_id:
        record.group_id === undefined || record.group_id === null
          ? null
          : record.group_id,
      has_drawing: !!record.has_drawing,
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
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingValues({
      cat_number: "",
      description_ru: "",
      description_en: "",
      weight_kg: null,
      group_id: null,
      has_drawing: false,
      length_cm: null,
      width_cm: null,
      height_cm: null,
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
        group_id:
          editingValues.group_id === undefined ||
          editingValues.group_id === null ||
          editingValues.group_id === ""
            ? null
            : Number(editingValues.group_id),
        has_drawing: editingValues.has_drawing ? 1 : 0,
        length_cm: toNum(editingValues.length_cm),
        width_cm: toNum(editingValues.width_cm),
        height_cm: toNum(editingValues.height_cm),
      }

      await axios.put(`/original-parts/${id}`, payload)
      message.success("Изменения сохранены")
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
  const columns = [
    // 🔹 в режиме "Показать все" добавляем производителя и модель
    ...(showAll
      ? [
          {
            title: "Производитель",
            dataIndex: "manufacturer_name",
            width: 180,
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
            title: "Модель оборудования",
            dataIndex: "model_name",
            width: 200,
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
      title: "Part number",
      dataIndex: "cat_number",
      width: 200,
      sorter: (a, b) =>
        (a.cat_number || "").localeCompare(b.cat_number || ""),
      sortDirections: ["ascend", "descend"],
      render: (value, record) => {
        if (record.id !== editingId) return value
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
      title: "Описание (RU)",
      dataIndex: "description_ru",
      ellipsis: true,
      onHeaderCell: () => ({
        style: { width: 420, minWidth: 420, maxWidth: 420 },
      }),
      onCell: () => ({
        style: { width: 420, minWidth: 420, maxWidth: 420 },
      }),
      render: (value, record) => {
        if (record.id !== editingId) return value
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
      title: "Description (EN)",
      dataIndex: "description_en",
      ellipsis: true,
      render: (value, record) => {
        if (record.id !== editingId) return value
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
      title: "Группа",
      dataIndex: "group_name",
      width: 180,
      ellipsis: true,
      sorter: (a, b) =>
        (a.group_name || "").localeCompare(b.group_name || ""),
      sortDirections: ["ascend", "descend"],
      render: (text, record) => {
        if (record.id !== editingId) return text
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

    // 🔹 Вес
    {
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

    // 🔹 Габариты
    {
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

    // 🔹 Наличие чертежа/КД
    {
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
      title: "Сборка",
      dataIndex: "is_assembly",
      width: 100,
      render: (v) => (v ? "Да" : "Нет"),
    },
    {
      title: "Действия",
      width: 110,
      render: (_, record) => (
        <ActionButtons
          size="small"
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

  return (
    <>
      <Table
        className="op-table"
        rowKey="id"
        columns={columns}
        dataSource={Array.isArray(data) ? data : []}
        loading={loading || savingEdit}
        pagination={{ pageSize: 50 }}
        tableLayout="fixed"
        scroll={{ x: true, y: 480 }}
        size="middle"
        onRow={(record) => ({
          onClick: () => {
            if (typeof onSelect === "function") onSelect(record)
          },
          onDoubleClick: () => {
            startEdit(record)
          },
        })}
        rowClassName={(record) =>
          record.id === selectedId ? "ant-table-row-selected" : ""
        }
      />

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

// src/components/logisticsRoutes/LogisticsRoutesTable.jsx
import React, { useMemo, useState } from "react"
import { Table, Input, InputNumber, Select, Space, message } from "antd"
import CountrySelect from "@/components/inputs/CountrySelect"
import CurrencySelect from "@/components/inputs/CurrencySelect"
import IncotermsSelect from "@/components/inputs/IncotermsSelect"
import ActionButtons from "@/components/common/ActionButtons"
import confirmAction from "@/utils/confirmAction"
import createTablePagination from "@/utils/tablePagination"
import ValueDisplay from "@/components/common/ValueDisplay"

export const ROUTE_TYPE_OPTIONS = [
  { value: "air", label: "Авиа" },
  { value: "sea", label: "Море" },
  { value: "road", label: "Авто" },
  { value: "rail", label: "Ж/д" },
  { value: "courier", label: "Экспресс" },
  { value: "other", label: "Другое" },
]

export const PRICING_MODEL_OPTIONS = [
  { value: "fixed", label: "Фикс" },
  { value: "per_kg", label: "За кг" },
  { value: "per_cbm", label: "За м³" },
  { value: "per_kg_or_cbm_max", label: "За кг/объём (max)" },
]

const typeLabel = Object.fromEntries(
  ROUTE_TYPE_OPTIONS.map((t) => [t.value, t.label]),
)
const pricingLabel = Object.fromEntries(
  PRICING_MODEL_OPTIONS.map((t) => [t.value, t.label]),
)

const fmtRate = (rate, unit, currency) => {
  if (rate == null) return null
  const cur = currency || ""
  return `${rate} ${cur}/${unit}`.trim()
}

const formatPricingSummary = (record) => {
  const model = record.pricing_model || "fixed"
  const cur = record.currency || ""
  if (model === "fixed") return pricingLabel.fixed
  if (model === "per_kg") {
    const main = fmtRate(record.rate_per_kg, "кг", cur)
    const extra = record.min_cost != null ? `мин ${record.min_cost} ${cur}`.trim() : null
    return [main, extra].filter(Boolean).join(" · ")
  }
  if (model === "per_cbm") {
    const main = fmtRate(record.rate_per_cbm, "м³", cur)
    const extra = record.min_cost != null ? `мин ${record.min_cost} ${cur}`.trim() : null
    return [main, extra].filter(Boolean).join(" · ")
  }
  if (model === "per_kg_or_cbm_max") {
    const main = fmtRate(record.rate_per_kg, "кг", cur) || fmtRate(record.rate_per_cbm, "м³", cur)
    const extra = [
      record.min_cost != null ? `мин ${record.min_cost} ${cur}`.trim() : null,
      record.volumetric_kg_per_cbm != null ? `${record.volumetric_kg_per_cbm} кг/м³` : null,
    ]
      .filter(Boolean)
      .join(" · ")
    return [main, extra].filter(Boolean).join(" · ")
  }
  return pricingLabel[model] || model
}

export default function LogisticsRoutesTable({
  data = [],
  loading = false,
  onUpdate,
  onDelete,
  onEditLegs,
}) {
  const [editingKey, setEditingKey] = useState(null)
  const [editedRow, setEditedRow] = useState(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const isEditing = (record) => record.id === editingKey

  const startEdit = (record) => {
    setEditingKey(record.id)
    setEditedRow({ ...record })
  }

  const cancelEdit = () => {
    setEditingKey(null)
    setEditedRow(null)
  }

  const saveEdit = async () => {
    if (!editedRow?.name?.trim()) {
      message.warning("Название обязательно")
      return
    }
    try {
      await onUpdate(editedRow.id, { ...editedRow })
      cancelEdit()
    } catch (err) {
      console.error("Ошибка сохранения маршрута:", err)
      message.error("Не удалось сохранить маршрут")
    }
  }

  const handleDelete = async (record) => {
    const { confirmed } = await confirmAction(
      `Удалить маршрут «${record.name}»?`,
    )
    if (!confirmed) return
    try {
      await onDelete(record)
    } catch (err) {
      console.error("Ошибка удаления маршрута:", err)
      message.error("Не удалось удалить маршрут")
    }
  }

  const columns = [
    {
      title: "Название",
      dataIndex: "name",
      width: 190,
      render: (_, record) =>
        isEditing(record) ? (
          <Input
            value={editedRow.name}
            onChange={(e) =>
              setEditedRow({ ...editedRow, name: e.target.value })
            }
            onPressEnter={saveEdit}
          />
        ) : (
          <ValueDisplay value={record.name} />
        ),
    },
    {
      title: "Тип",
      dataIndex: "type",
      width: 130,
      render: (_, record) =>
        isEditing(record) ? (
          <Select
            size="small"
            allowClear
            value={editedRow.type || undefined}
            onChange={(v) => setEditedRow({ ...editedRow, type: v || null })}
            options={ROUTE_TYPE_OPTIONS}
            style={{ minWidth: 120 }}
          />
        ) : (
          <ValueDisplay value={typeLabel[record.type] || record.type} />
        ),
    },
    {
      title: "Откуда",
      dataIndex: "from_country",
      width: 140,
      render: (_, record) =>
        isEditing(record) ? (
          <CountrySelect
            value={editedRow.from_country}
            onChange={(v) =>
              setEditedRow({ ...editedRow, from_country: v || null })
            }
            style={{ minWidth: 120 }}
          />
        ) : (
          <ValueDisplay value={record.from_country} />
        ),
    },
    {
      title: "Куда",
      dataIndex: "to_country",
      width: 140,
      render: (_, record) =>
        isEditing(record) ? (
          <CountrySelect
            value={editedRow.to_country}
            onChange={(v) =>
              setEditedRow({ ...editedRow, to_country: v || null })
            }
            style={{ minWidth: 120 }}
          />
        ) : (
          <ValueDisplay value={record.to_country} />
        ),
    },
    {
      title: "Incoterms",
      dataIndex: "incoterms",
      width: 150,
      render: (_, record) =>
        isEditing(record) ? (
          <IncotermsSelect
            value={editedRow.incoterms}
            onChange={(v) =>
              setEditedRow({ ...editedRow, incoterms: v || null })
            }
            allowClear
            style={{ minWidth: 160 }}
          />
        ) : (
          <ValueDisplay value={record.incoterms} />
        ),
    },
    {
      title: "ETA, дн.",
      dataIndex: "eta_days",
      width: 110,
      render: (_, record) =>
        isEditing(record) ? (
          <InputNumber
            min={0}
            value={editedRow.eta_days}
            onChange={(v) =>
              setEditedRow({ ...editedRow, eta_days: v ?? null })
            }
            style={{ width: "100%" }}
          />
        ) : (
          <ValueDisplay value={record.eta_days} />
        ),
    },
    {
      title: "Стоимость",
      dataIndex: "cost",
      width: 200,
      render: (_, record) =>
        isEditing(record) ? (
          <Space size={8} wrap>
            {(editedRow.pricing_model || "fixed") === "fixed" && (
              <InputNumber
                min={0}
                value={editedRow.cost}
                onChange={(v) =>
                  setEditedRow({ ...editedRow, cost: v ?? null })
                }
                style={{ width: 110 }}
              />
            )}
            <CurrencySelect
              value={editedRow.currency}
              onChange={(v) =>
                setEditedRow({ ...editedRow, currency: v || null })
              }
              style={{ minWidth: 120 }}
            />
          </Space>
        ) : (
          <ValueDisplay
            value={
              (record.pricing_model || "fixed") === "fixed" && record.cost != null
                ? `${record.cost} ${record.currency || ""}`.trim()
                : null
            }
          />
        ),
    },
    {
      title: "Тариф",
      dataIndex: "pricing_model",
      width: 280,
      render: (_, record) =>
        isEditing(record) ? (
          <Space size={8} wrap>
            <Select
              size="small"
              value={editedRow.pricing_model || "fixed"}
              onChange={(v) =>
                setEditedRow({ ...editedRow, pricing_model: v || "fixed" })
              }
              options={PRICING_MODEL_OPTIONS}
              style={{ minWidth: 160 }}
            />
            {["per_kg", "per_kg_or_cbm_max"].includes(
              editedRow.pricing_model || "fixed",
            ) && (
              <InputNumber
                min={0}
                placeholder="за кг"
                value={editedRow.rate_per_kg}
                onChange={(v) =>
                  setEditedRow({ ...editedRow, rate_per_kg: v ?? null })
                }
                style={{ width: 110 }}
              />
            )}
            {["per_cbm", "per_kg_or_cbm_max"].includes(
              editedRow.pricing_model || "fixed",
            ) && (
              <InputNumber
                min={0}
                placeholder="за м³"
                value={editedRow.rate_per_cbm}
                onChange={(v) =>
                  setEditedRow({ ...editedRow, rate_per_cbm: v ?? null })
                }
                style={{ width: 110 }}
              />
            )}
            {editedRow.pricing_model !== "fixed" && (
              <InputNumber
                min={0}
                placeholder="мин."
                value={editedRow.min_cost}
                onChange={(v) =>
                  setEditedRow({ ...editedRow, min_cost: v ?? null })
                }
                style={{ width: 100 }}
              />
            )}
            {(editedRow.pricing_model || "fixed") === "per_kg_or_cbm_max" && (
              <InputNumber
                min={0}
                placeholder="кг/м³"
                value={editedRow.volumetric_kg_per_cbm}
                onChange={(v) =>
                  setEditedRow({ ...editedRow, volumetric_kg_per_cbm: v ?? null })
                }
                style={{ width: 110 }}
              />
            )}
            {["per_kg", "per_kg_or_cbm_max"].includes(
              editedRow.pricing_model || "fixed",
            ) && (
              <InputNumber
                min={0}
                placeholder="шаг кг"
                value={editedRow.round_step_kg}
                onChange={(v) =>
                  setEditedRow({ ...editedRow, round_step_kg: v ?? null })
                }
                style={{ width: 100 }}
              />
            )}
            {["per_cbm", "per_kg_or_cbm_max"].includes(
              editedRow.pricing_model || "fixed",
            ) && (
              <InputNumber
                min={0}
                placeholder="шаг м³"
                value={editedRow.round_step_cbm}
                onChange={(v) =>
                  setEditedRow({ ...editedRow, round_step_cbm: v ?? null })
                }
                style={{ width: 100 }}
              />
            )}
          </Space>
        ) : (
          <ValueDisplay value={formatPricingSummary(record)} />
        ),
    },
    {
      title: "Наценка логист.",
      dataIndex: "surcharge_pct",
      width: 190,
      render: (_, record) =>
        isEditing(record) ? (
          <Space size={8} wrap>
            <InputNumber
              min={0}
              value={editedRow.surcharge_pct}
              addonAfter="%"
              onChange={(v) =>
                setEditedRow({ ...editedRow, surcharge_pct: v ?? null })
              }
              style={{ width: 120 }}
            />
            <InputNumber
              min={0}
              value={editedRow.surcharge_abs}
              placeholder="Фикс."
              onChange={(v) =>
                setEditedRow({ ...editedRow, surcharge_abs: v ?? null })
              }
              style={{ width: 100 }}
            />
          </Space>
        ) : (
          <ValueDisplay
            value={
              record.surcharge_pct != null || record.surcharge_abs != null
                ? [record.surcharge_pct ? `${record.surcharge_pct}%` : null, record.surcharge_abs]
                    .filter(Boolean)
                    .join(" / ")
                : null
            }
          />
        ),
    },
    {
      title: "Комментарий",
      dataIndex: "comment",
      ellipsis: true,
      render: (_, record) =>
        isEditing(record) ? (
          <Input
            value={editedRow.comment || ""}
            onChange={(e) =>
              setEditedRow({ ...editedRow, comment: e.target.value })
            }
          />
        ) : (
          <ValueDisplay value={record.comment} />
        ),
    },
    {
      title: "Звенья",
      dataIndex: "legs",
      width: 90,
      render: (_, record) => {
        const count = Array.isArray(record.legs) ? record.legs.length : 0
        return <ValueDisplay value={count ? `${count} шт.` : "—"} />
      },
    },
    {
      title: "Действия",
      dataIndex: "actions",
      width: 200,
      fixed: "right",
      render: (_, record) => {
        const editing = isEditing(record)
        return (
          <ActionButtons
            onEdit={!editing ? () => startEdit(record) : undefined}
            onSave={editing ? saveEdit : undefined}
            onCancel={editing ? cancelEdit : undefined}
            onDelete={!editing ? () => handleDelete(record) : undefined}
            extraButtons={
              !editing && onEditLegs
                ? [
                    {
                      key: "legs",
                      label: "Звенья",
                      onClick: () => onEditLegs(record),
                    },
                  ]
                : undefined
            }
          />
        )
      },
    },
  ]

  const pagination = useMemo(
    () =>
      createTablePagination({
        page,
        pageSize,
        total: data.length,
        setPage,
        setPageSize,
      }),
    [data.length, page, pageSize],
  )

  return (
    <Table
      rowKey="id"
      loading={loading}
      dataSource={data}
      columns={columns}
      pagination={pagination}
      size="middle"
      scroll={{ x: true }}
      rowClassName={(record) =>
        record.id === editingKey ? "editable-row" : ""
      }
    />
  )
}

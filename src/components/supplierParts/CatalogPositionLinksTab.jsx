import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  Button,
  Checkbox,
  Popconfirm,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd"
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons"
import axios from "@/api/axiosInstance"
import { runTrashDeleteFlow } from "@/utils/trashUi"
import CatalogPositionsPickerDrawer from "./CatalogPositionsPickerDrawer"

const { Text } = Typography

function getCatalogContext(row) {
  if (row.manufacturer_name || row.model_name) {
    return [
      {
        manufacturer_name: row.manufacturer_name || null,
        model_name: row.model_name || null,
      },
    ]
  }

  if (row.classifier_node_name) {
    return [{ classifier_node_name: row.classifier_node_name }]
  }
  return []
}

export default function CatalogPositionLinksTab({ supplierPartId, onChanged = () => {} }) {
  const [positionLinks, setPositionLinks] = useState([])
  const [loading, setLoading] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [preferredDraft, setPreferredDraft] = useState({})

  const popupContainer = (trigger) =>
    trigger?.closest(".dock-shell") ||
    trigger?.closest(".parts-table-wrap") ||
    document.body

  const loadLinks = useCallback(async () => {
    if (!supplierPartId) {
      setPositionLinks([])
      return
    }
    setLoading(true)
    try {
      const { data } = await axios.get("/supplier-part-catalog-positions", {
        params: { supplier_part_id: supplierPartId },
      })

      const nextLinks = Array.isArray(data) ? data : []
      setPositionLinks(nextLinks)

      const draft = {}
      nextLinks.forEach((row) => {
        draft[`catalog:${row.catalog_position_id}`] = Number(row.is_preferred || 0) > 0
      })
      setPreferredDraft(draft)
    } catch (e) {
      console.error(e)
      message.error("Не удалось загрузить привязки")
    } finally {
      setLoading(false)
    }
  }, [supplierPartId])

  useEffect(() => {
    setPositionLinks([])
    if (supplierPartId) loadLinks()
  }, [supplierPartId, loadLinks])

  const excludePositionIds = useMemo(
    () => positionLinks.map((x) => Number(x.catalog_position_id)).filter(Boolean),
    [positionLinks]
  )
  const addCatalogPositionLinks = async (pickedRows) => {
    if (!supplierPartId) return
    const toAdd = pickedRows.map((r) => Number(r.id)).filter((id) => id && !excludePositionIds.includes(id))
    if (!toAdd.length) {
      message.info("Нечего добавлять")
      return
    }

    let added = 0
    const errors = []
    for (const catalogPositionId of toAdd) {
      try {
        await axios.post("/supplier-part-catalog-positions", {
          supplier_part_id: supplierPartId,
          catalog_position_id: catalogPositionId,
        })
        added++
      } catch (e) {
        errors.push(`позиция #${catalogPositionId}: ${e?.response?.data?.message || "ошибка"}`)
      }
    }

    if (added) {
      message.success(`Добавлено связей с позициями каталога: ${added}`)
      await loadLinks()
      onChanged()
    }
    if (errors.length) message.warning(`Часть связей не добавилась: ${errors.join("; ")}`)
    setPickerOpen(false)
  }

  const updatePreferred = async (row) => {
    try {
      const key = `${row.link_type}:${row.link_id}`
      const is_preferred = preferredDraft[key] ? 1 : 0
      await axios.patch("/supplier-part-catalog-positions", {
        supplier_part_id: supplierPartId,
        catalog_position_id: row.link_id,
        is_preferred,
      })
      message.success("Признак приоритетности обновлен")
      await loadLinks()
      onChanged()
    } catch (e) {
      console.error(e)
      message.error("Не удалось обновить признак приоритетности")
    }
  }

  const unlink = async (row) => {
    try {
      const result = await runTrashDeleteFlow(
        {
          entityType: "supplier_part_catalog_positions",
          entityId: supplierPartId,
          deleteUrl: "/supplier-part-catalog-positions",
          deleteParams: { supplier_part_id: supplierPartId, catalog_position_id: row.link_id },
          previewParams: { catalog_position_id: row.link_id },
          successMessage: "Связь с позицией каталога удалена",
        }
      )
      if (!result?.deleted) return
      await loadLinks()
      onChanged()
    } catch (e) {
      console.error(e)
      message.error("Не удалось удалить привязку")
    }
  }

  const combinedRows = useMemo(() => {
    const rows = positionLinks.map((row) => ({
      ...row,
      key: `catalog:${row.catalog_position_id}`,
      link_type: "catalog_position",
      link_id: row.catalog_position_id,
      number_text: row.manufacturer_part_number || row.position_code,
      name_text: row.display_name_ru || row.display_name_en || row.display_name || "—",
      contexts: getCatalogContext(row),
      context_text: getCatalogContext(row)
        .map((ctx) => [ctx.manufacturer_name, ctx.model_name, ctx.classifier_node_name].filter(Boolean).join(" / "))
        .join("; "),
    }))
    return rows
  }, [positionLinks])

  const columns = [
    {
      title: "Тип привязки",
      dataIndex: "link_type",
      width: 170,
      render: (_, row) => (
        <Space size={4} wrap>
          <Tag color="blue">Позиция каталога</Tag>
          {row.source_kind === "model_bom" ? <Tag>BOM модели</Tag> : null}
        </Space>
      ),
    },
    {
      title: "Номер / обозначение",
      dataIndex: "number_text",
      width: 180,
      render: (v) => <Text strong>{v || "—"}</Text>,
    },
    {
      title: "Название / описание",
      dataIndex: "name_text",
      render: (v) => v || <Text type="secondary">—</Text>,
    },
    {
      title: "Контекст",
      dataIndex: "context_text",
      width: 260,
      render: (v, row) => (
        <Space size={6} wrap>
          {row.contexts?.length ? (
            row.contexts.map((ctx, index) => (
              <Tag key={`${row.key}:ctx:${index}`} color="geekblue">
                {[ctx.manufacturer_name, ctx.model_name, ctx.classifier_node_name].filter(Boolean).join(" / ") || "—"}
              </Tag>
            ))
          ) : (
            <Text type="secondary">—</Text>
          )}
        </Space>
      ),
    },
    {
      title: "Приоритетный",
      key: "is_preferred",
      width: 230,
      render: (_, row) => {
        const current = Number(row.is_preferred || 0) > 0
        const value = Boolean(preferredDraft[row.key])
        const changed = value !== current
        return (
          <Space size={6}>
            <Checkbox
              checked={value}
              onChange={(e) =>
                setPreferredDraft((prev) => ({
                  ...prev,
                  [row.key]: e.target.checked,
                }))
              }
            >
              приоритетный
            </Checkbox>
            <Button size="small" type={changed ? "primary" : "default"} disabled={!changed} onClick={() => updatePreferred(row)}>
              Сохранить
            </Button>
          </Space>
        )
      },
    },
    {
      title: "Действия",
      key: "actions",
      width: 140,
      render: (_, row) => (
        <Space>
          <Popconfirm
            title="Удалить привязку?"
            okType="danger"
            okText="Удалить"
            cancelText="Отмена"
            onConfirm={() => unlink(row)}
            getPopupContainer={popupContainer}
          >
            <Tooltip title="Удалить привязку" getPopupContainer={popupContainer}>
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <>
      <Space style={{ width: "100%", marginBottom: 8 }} wrap>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setPickerOpen(true)}>
          Добавить связь с позицией
        </Button>

        <Tag color="blue">Всего привязок: {combinedRows.length}</Tag>
        <Tag color="geekblue">Позиции каталога: {positionLinks.length}</Tag>

        <Text type="secondary">
          Здесь связываем деталь поставщика с тем, что уже есть в классификаторе или BOM модели.
        </Text>
      </Space>

      <Table
        size="middle"
        rowKey="key"
        loading={loading}
        dataSource={combinedRows}
        columns={columns}
        pagination={{ pageSize: 8, showSizeChanger: false }}
        className="op-table parts-table"
      />

      <CatalogPositionsPickerDrawer
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        excludeIds={excludePositionIds}
        onPick={addCatalogPositionLinks}
        title="Подбор позиций каталога"
      />

    </>
  )
}

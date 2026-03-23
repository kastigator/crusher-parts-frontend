import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  Button,
  Checkbox,
  Modal,
  Popconfirm,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd"
import { DeleteOutlined, LinkOutlined, PlusOutlined } from "@ant-design/icons"
import axios from "@/api/axiosInstance"
import OriginalsPickerDrawer from "./OriginalsPickerDrawer"
import StandardPartsPickerDrawer from "./StandardPartsPickerDrawer"

const { Text } = Typography

function parseOemContexts(row) {
  const raw = String(row.model_contexts || "").trim()
  if (raw) {
    return raw
      .split("\n")
      .map((entry) => {
        const [manufacturer_name, model_name] = entry.split("||")
        return {
          manufacturer_name: manufacturer_name || null,
          model_name: model_name || null,
        }
      })
      .filter((ctx) => ctx.manufacturer_name || ctx.model_name)
  }

  if (row.manufacturer_name || row.model_name) {
    return [
      {
        manufacturer_name: row.manufacturer_name || null,
        model_name: row.model_name || null,
      },
    ]
  }

  return []
}

export default function OriginalsLinkTab({ supplierPartId, onChanged = () => {} }) {
  const [oemLinks, setOemLinks] = useState([])
  const [standardLinks, setStandardLinks] = useState([])
  const [loading, setLoading] = useState(false)
  const [oemPickerOpen, setOemPickerOpen] = useState(false)
  const [standardPickerOpen, setStandardPickerOpen] = useState(false)
  const [preferredDraft, setPreferredDraft] = useState({})

  const popupContainer = (trigger) =>
    trigger?.closest(".dock-shell") ||
    trigger?.closest(".parts-table-wrap") ||
    document.body

  const loadLinks = useCallback(async () => {
    if (!supplierPartId) {
      setOemLinks([])
      setStandardLinks([])
      return
    }
    setLoading(true)
    try {
      const [{ data: oemData }, { data: standardData }] = await Promise.all([
        axios.get("/supplier-part-originals", { params: { supplier_part_id: supplierPartId } }),
        axios.get("/supplier-part-standard-parts", { params: { supplier_part_id: supplierPartId } }),
      ])

      const nextOem = Array.isArray(oemData) ? oemData : []
      const nextStandard = Array.isArray(standardData) ? standardData : []
      setOemLinks(nextOem)
      setStandardLinks(nextStandard)

      const draft = {}
      nextOem.forEach((row) => {
        draft[`oem:${row.original_part_id}`] = Number(row.is_preferred || 0) > 0
      })
      nextStandard.forEach((row) => {
        draft[`standard:${row.standard_part_id}`] = Number(row.is_preferred || 0) > 0
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
    setOemLinks([])
    setStandardLinks([])
    if (supplierPartId) loadLinks()
  }, [supplierPartId, loadLinks])

  const excludeOemIds = useMemo(
    () => oemLinks.map((x) => Number(x.original_part_id)).filter(Boolean),
    [oemLinks]
  )
  const excludeStandardIds = useMemo(
    () => standardLinks.map((x) => Number(x.standard_part_id)).filter(Boolean),
    [standardLinks]
  )

  const addOemLinks = async (pickedRows) => {
    if (!supplierPartId) return
    const toAdd = pickedRows.map((r) => Number(r.id)).filter((id) => id && !excludeOemIds.includes(id))
    if (!toAdd.length) {
      message.info("Нечего добавлять")
      return
    }

    let added = 0
    const errors = []
    for (const originalId of toAdd) {
      try {
        await axios.post("/supplier-part-originals", {
          supplier_part_id: supplierPartId,
          original_part_id: originalId,
        })
        added++
      } catch (e) {
        errors.push(`OEM ID ${originalId}: ${e?.response?.data?.message || "ошибка"}`)
      }
    }

    if (added) {
      message.success(`Добавлено OEM-привязок: ${added}`)
      await loadLinks()
      onChanged()
    }
    if (errors.length) message.warning(`Часть OEM-привязок не добавилась: ${errors.join("; ")}`)
    setOemPickerOpen(false)
  }

  const addStandardLinks = async (pickedRows) => {
    if (!supplierPartId) return
    const toAdd = pickedRows
      .map((r) => Number(r.id))
      .filter((id) => id && !excludeStandardIds.includes(id))
    if (!toAdd.length) {
      message.info("Нечего добавлять")
      return
    }

    let added = 0
    const errors = []
    for (const standardId of toAdd) {
      try {
        await axios.post("/supplier-part-standard-parts", {
          supplier_part_id: supplierPartId,
          standard_part_id: standardId,
        })
        added++
      } catch (e) {
        errors.push(`STD ID ${standardId}: ${e?.response?.data?.message || "ошибка"}`)
      }
    }

    if (added) {
      message.success(`Добавлено standard-привязок: ${added}`)
      await loadLinks()
      onChanged()
    }
    if (errors.length) message.warning(`Часть standard-привязок не добавилась: ${errors.join("; ")}`)
    setStandardPickerOpen(false)
  }

  const chooseLinkType = () => {
    Modal.confirm({
      title: "Что привязать к детали поставщика?",
      okText: "OEM деталь / сборка",
      cancelText: "Стандартное изделие",
      onOk: () => setOemPickerOpen(true),
      onCancel: () => setStandardPickerOpen(true),
    })
  }

  const updatePreferred = async (row) => {
    try {
      const key = `${row.link_type}:${row.link_id}`
      const is_preferred = preferredDraft[key] ? 1 : 0
      if (row.link_type === "oem") {
        await axios.patch("/supplier-part-originals", {
          supplier_part_id: supplierPartId,
          original_part_id: row.link_id,
          is_preferred,
        })
      } else {
        await axios.patch("/supplier-part-standard-parts", {
          supplier_part_id: supplierPartId,
          standard_part_id: row.link_id,
          is_preferred,
        })
      }
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
      if (row.link_type === "oem") {
        await axios.delete("/supplier-part-originals", {
          params: { supplier_part_id: supplierPartId, original_part_id: row.link_id },
        })
      } else {
        await axios.delete("/supplier-part-standard-parts", {
          params: { supplier_part_id: supplierPartId, standard_part_id: row.link_id },
        })
      }
      message.success("Привязка удалена")
      await loadLinks()
      onChanged()
    } catch (e) {
      console.error(e)
      message.error("Не удалось удалить привязку")
    }
  }

  const openLinkedItem = (row) => {
    const url =
      row.link_type === "oem"
        ? `/original-parts/${encodeURIComponent(row.link_id)}`
        : `/standard-parts`
    window.open(url, "_blank")
  }

  const combinedRows = useMemo(() => {
    const oemRows = oemLinks.map((row) => ({
      ...row,
      key: `oem:${row.original_part_id}`,
      link_type: "oem",
      link_id: row.original_part_id,
      number_text: row.cat_number,
      name_text: row.description_ru || row.description_en || "—",
      contexts: parseOemContexts(row),
      context_text: parseOemContexts(row)
        .map((ctx) => [ctx.manufacturer_name, ctx.model_name].filter(Boolean).join(" / "))
        .join("; "),
    }))
    const stdRows = standardLinks.map((row) => ({
      ...row,
      key: `standard:${row.standard_part_id}`,
      link_type: "standard",
      link_id: row.standard_part_id,
      number_text: row.display_name || row.designation,
      name_text: row.description_ru || row.description_en || "—",
      context_text: [row.class_name, row.designation].filter(Boolean).join(" / "),
    }))
    return [...oemRows, ...stdRows]
  }, [oemLinks, standardLinks])

  const columns = [
    {
      title: "Тип привязки",
      dataIndex: "link_type",
      width: 170,
      render: (value) =>
        value === "oem" ? <Tag color="blue">OEM деталь / сборка</Tag> : <Tag color="green">Стандартное изделие</Tag>,
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
          {row.link_type === "oem" ? (
            row.contexts?.length ? (
              row.contexts.map((ctx, index) => (
                <Tag key={`${row.key}:ctx:${index}`} color="geekblue">
                  {[ctx.manufacturer_name, ctx.model_name].filter(Boolean).join(" / ") || "—"}
                </Tag>
              ))
            ) : (
              <Text type="secondary">—</Text>
            )
          ) : (
            <>
              <Tag color="green">{row.class_name || "—"}</Tag>
              <Tag>{row.designation || "—"}</Tag>
            </>
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
          <Tooltip title="Открыть связанную деталь" getPopupContainer={popupContainer}>
            <Button size="small" icon={<LinkOutlined />} onClick={() => openLinkedItem(row)} />
          </Tooltip>
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
        <Button type="primary" icon={<PlusOutlined />} onClick={chooseLinkType}>
          Добавить привязку
        </Button>

        <Tag color="blue">Всего привязок: {combinedRows.length}</Tag>
        <Tag color="geekblue">OEM: {oemLinks.length}</Tag>
        <Tag color="green">Standard: {standardLinks.length}</Tag>

        <Text type="secondary">
          Для OEM-специфичных позиций привязывайте OEM деталь или сборку. Для болтов, подшипников и других типовых изделий привязывайте standard part.
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

      <OriginalsPickerDrawer
        open={oemPickerOpen}
        onClose={() => setOemPickerOpen(false)}
        excludeIds={excludeOemIds}
        onPick={addOemLinks}
        title="Подбор OEM деталей и сборок"
      />

      <StandardPartsPickerDrawer
        open={standardPickerOpen}
        onClose={() => setStandardPickerOpen(false)}
        excludeIds={excludeStandardIds}
        onPick={addStandardLinks}
        title="Подбор стандартных изделий"
      />
    </>
  )
}

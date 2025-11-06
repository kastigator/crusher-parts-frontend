import React, { useEffect, useMemo, useState } from "react"
import { Button, Empty, Input, InputNumber, message, Popconfirm, Space, Table, Tag, Tooltip, Typography } from "antd"
import { StarFilled } from "@ant-design/icons"
import axios from "@/api/axiosInstance"
import SupplierPartPickerDrawer from "./SupplierPartPickerDrawer"
import ActionButtons from "@/components/common/ActionButtons"

const { Text } = Typography

/**
 * Props:
 * - originalPartId: number (обязателен для загрузки комплекта)
 * - originalPart?: { id, part_number?, name? } — (необяз.) для красивой подписи
 */
export default function BundleTab({ originalPartId, originalPart }) {
  const [bundleId, setBundleId] = useState(null)
  const [loading, setLoading] = useState(false)

  const [items, setItems] = useState([])
  const [options, setOptions] = useState([])
  const [totals, setTotals] = useState([])

  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerItem, setPickerItem] = useState(null)
  const [qNewRole, setQNewRole] = useState("")
  const [defaultBusy, setDefaultBusy] = useState(false) // индикатор на «сделать дефолт»

  // --------------------- загрузка / создание комплекта ---------------------
  const ensureBundle = async () => {
    if (!originalPartId) return
    try {
      setLoading(true)
      const { data } = await axios.get("/supplier-bundles", { params: { original_part_id: originalPartId } })
      if (Array.isArray(data) && data.length) {
        setBundleId(data[0].id)
      } else {
        const { data: created } = await axios.post("/supplier-bundles", {
          original_part_id: originalPartId,
          title: "",
          note: ""
        })
        setBundleId(created.id)
        message.success("Создан новый комплект для этой детали")
      }
    } catch (e) {
      console.error(e)
      message.error("Не удалось получить/создать комплект")
    } finally {
      setLoading(false)
    }
  }

  // --------------------- загрузка содержимого ---------------------
  const loadData = async () => {
    if (!bundleId) return
    try {
      setLoading(true)
      const [itRes, optRes, totRes] = await Promise.all([
        axios.get(`/supplier-bundles/${bundleId}/items`),
        axios.get(`/supplier-bundles/${bundleId}/options`),
        axios.get(`/supplier-bundles/${bundleId}/totals`)
      ])
      setItems(Array.isArray(itRes.data) ? itRes.data : [])
      setOptions(Array.isArray(optRes.data) ? optRes.data : [])
      setTotals(Array.isArray(totRes.data) ? totRes.data : [])
    } catch (e) {
      console.error(e)
      message.error("Не удалось загрузить комплект")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { setBundleId(null); setItems([]); setOptions([]); setTotals([]) }, [originalPartId])
  useEffect(() => { if (originalPartId) ensureBundle() }, [originalPartId])
  useEffect(() => { if (bundleId) loadData() }, [bundleId])

  // --------------------- роли ---------------------
  const addRole = async () => {
    const label = qNewRole.trim()
    if (!label) return
    try {
      await axios.post("/supplier-bundles/items", { bundle_id: bundleId, role_label: label, qty: 1 })
      setQNewRole("")
      await loadData()
    } catch (e) {
      console.error(e)
      message.error("Не удалось добавить роль")
    }
  }

  const updateItemQty = async (itemId, qty) => {
    try {
      await axios.put(`/supplier-bundles/items/${itemId}`, { qty })
      await loadData()
    } catch (e) {
      console.error(e)
      message.error("Не удалось изменить количество")
    }
  }

  const deleteItem = async (itemId) => {
    try {
      await axios.delete(`/supplier-bundles/items/${itemId}`)
      await loadData()
    } catch (e) {
      console.error(e)
      message.error("Не удалось удалить роль")
    }
  }

  // --------------------- варианты ---------------------
  const openPicker = (item) => { setPickerItem(item); setPickerOpen(true) }

  const handlePickParts = async (pickedRows) => {
    if (!pickerItem || !pickedRows?.length) return
    try {
      const hasDefault = options.some(o => o.item_id === pickerItem.id && o.is_default)
      for (let idx = 0; idx < pickedRows.length; idx++) {
        const r = pickedRows[idx]
        await axios.post("/supplier-bundles/links", {
          item_id: pickerItem.id,
          supplier_part_id: r.id,
          is_default: (!hasDefault && idx === 0) ? 1 : 0
        })
      }
      message.success("Варианты добавлены")
      await loadData()
    } catch (e) {
      console.error(e)
      message.error("Не удалось добавить варианты")
    } finally {
      setPickerItem(null)
    }
  }

  const setDefault = async (linkId) => {
    try {
      setDefaultBusy(true)
      console.debug("[BundleTab] PUT /supplier-bundles/links/%s {is_default:1}", linkId)
      const res = await axios.put(`/supplier-bundles/links/${linkId}`, { is_default: 1 })
      console.debug("[BundleTab] response:", res?.status, res?.data)
      message.success("Вариант установлен по умолчанию")
      await loadData()
    } catch (e) {
      console.error("setDefault error:", e)
      const msg = e?.response?.data?.message || "Не удалось установить вариант по умолчанию"
      message.error(msg)
    } finally {
      setDefaultBusy(false)
    }
  }

  const deleteLink = async (linkId) => {
    try {
      await axios.delete(`/supplier-bundles/links/${linkId}`)
      await loadData()
    } catch (e) {
      console.error(e)
      message.error("Не удалось удалить вариант")
    }
  }

  // --------------------- таблица вариантов ---------------------
  const optionsByItem = useMemo(() => {
    const m = new Map()
    for (const o of options) {
      if (!m.has(o.item_id)) m.set(o.item_id, [])
      m.get(o.item_id).push(o)
    }
    return m
  }, [options])

  const renderOptionsTable = (item) => {
    const data = optionsByItem.get(item.id) || []
    const cols = [
      {
        title: "Поставщик",
        dataIndex: "supplier_name",
        width: 220,
        render: (_, r) => r.supplier_name || r.name || "—",
      },
      { title: "№ у поставщика", dataIndex: "supplier_part_number", width: 180, render: v => v || "—" },
      {
        title: "Описание",
        dataIndex: "description",
        ellipsis: true,
        render: (_, r) => r.description ?? r.supplier_part_description ?? "—",
      },
      {
        title: "Цена",
        dataIndex: "last_price",
        align: "right",
        width: 120,
        render: (v, r) => (v != null ? `${Number(v).toFixed(2)} ${r.last_currency || ""}` : "—")
      },
      {
        title: "Дата",
        dataIndex: "last_price_date",
        width: 120,
        render: (v) => v ? new Date(v).toLocaleDateString() : "—"
      },
      {
        title: "По умолчанию",
        dataIndex: "is_default",
        width: 120,
        render: (v) => v ? <Tag color="green">да</Tag> : <Tag>нет</Tag>
      },
      {
        title: "Действия",
        key: "act",
        width: 120,
        render: (_, r) => (
          <Space size="small">
            <Tooltip title="Сделать по умолчанию">
              <Button
                size="small"
                type="text"
                icon={<StarFilled style={{ color: r.is_default ? '#52c41a' : undefined }} />}
                disabled={!!r.is_default || defaultBusy}
                onClick={() => setDefault(r.link_id)}
                loading={defaultBusy}
              />
            </Tooltip>
            <ActionButtons
              size="small"
              onDelete={() => deleteLink(r.link_id)}
              titles={{ delete: "Удалить" }}
            />
          </Space>
        )
      }
    ]
    return (
      <div className="expanded-area" style={{ paddingLeft: 8 }}>
        <Table
          rowKey="link_id"
          className="op-table"
          size="small"
          columns={cols}
          dataSource={data}
          pagination={false}
        />
      </div>
    )
  }

  // --------------------- колонки ролей ---------------------
  const itemColumns = [
    { title: "Роль", dataIndex: "role_label", width: 240 },
    {
      title: "Кол-во",
      dataIndex: "qty",
      width: 120,
      align: "right",
      render: (v, r) => (
        <InputNumber
          min={0.0001}
          step={0.1}
          value={Number(v || 1)}
          onChange={(val) => updateItemQty(r.id, Number(val || 1))}
        />
      )
    },
    {
      title: "Действия",
      key: "actions",
      width: 220,
      render: (_, r) => (
        <Space>
          <Button size="small" onClick={() => openPicker(r)}>Добавить варианты</Button>
          <ActionButtons
            size="small"
            onDelete={() => deleteItem(r.id)}
            titles={{ delete: "Удалить роль" }}
          />
        </Space>
      )
    }
  ]

  if (!originalPartId) {
    return <Empty description="Сначала выберите оригинальную деталь" />
  }

  const partLabel = originalPart
    ? [originalPart.part_number, originalPart.name].filter(Boolean).join(" — ")
    : null

  return (
    <div className="table-section">
      <Space style={{ marginBottom: 8, width: "100%", justifyContent: "space-between" }}>
        <Space wrap>
          <Text strong>{bundleId ? `Комплект №${bundleId}` : "Комплект"}</Text>
          {partLabel ? (
            <Text type="secondary">({partLabel})</Text>
          ) : null}
          {totals?.length ? (
            <Text type="secondary">
              &nbsp;•&nbsp;Итого:&nbsp;
              {totals.map(t => `${Number(t.total_price ?? 0).toFixed(2)} ${t.currency_iso3}`).join("  |  ")}
            </Text>
          ) : null}
        </Space>
        <Space>
          <Input
            placeholder="Название роли (например, Насос)"
            value={qNewRole}
            onChange={(e) => setQNewRole(e.target.value)}
            onPressEnter={addRole}
            style={{ width: 260 }}
          />
          <Button type="primary" onClick={addRole} disabled={!qNewRole.trim()}>+ Добавить</Button>
          <Button onClick={loadData} loading={loading}>Обновить</Button>
        </Space>
      </Space>

      <Table
        rowKey="id"
        className="op-table"
        size="small"
        loading={loading && !bundleId}
        columns={itemColumns}
        dataSource={items}
        pagination={false}
        locale={{ emptyText: <Empty description="Нет ролей в комплекте" /> }}
        expandable={{
          expandedRowRender: renderOptionsTable,
          expandRowByClick: true,
          columnWidth: 36,
        }}
      />

      <SupplierPartPickerDrawer
        open={pickerOpen}
        onClose={() => { setPickerOpen(false); setPickerItem(null) }}
        excludeIds={pickerItem ? (optionsByItem.get(pickerItem.id) || []).map(o => o.supplier_part_id) : []}
        onPick={handlePickParts}
      />
    </div>
  )
}

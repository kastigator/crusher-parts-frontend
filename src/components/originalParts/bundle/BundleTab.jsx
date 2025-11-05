import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Card, Space, Button, Tag, Input, InputNumber, Table, message, Typography, Tooltip, Popconfirm } from "antd"
import {
  ReloadOutlined,
  PlusOutlined,
  DeleteOutlined,
  LinkOutlined,
  CheckOutlined,
  CloseOutlined,
} from "@ant-design/icons"
import axios from "@/api/axiosInstance"
import confirmAction from "@/utils/confirmAction"
import SupplierPartPickerDrawer from "./SupplierPartPickerDrawer"

const { Text } = Typography

/**
 * Вкладка "Комплект (сборный)" для выбранной оригинальной детали.
 * Требует backend-роутов /supplier-bundles* (мы их уже сделали).
 *
 * Props:
 * - originalPartId: number (обязателен)
 */
export default function BundleTab({ originalPartId }) {
  const [bundleId, setBundleId] = useState(null)

  const [items, setItems] = useState([])          // роли комплекта
  const [options, setOptions] = useState([])      // варианты (детали поставщиков) по ролям
  const [totals, setTotals] = useState([])        // свод по валютам

  const [loading, setLoading] = useState(false)
  const [createTitle, setCreateTitle] = useState("")  // при создании комплекта
  const [createNote, setCreateNote] = useState("")

  // добавление роли
  const [newRole, setNewRole] = useState("")
  const [newQty, setNewQty] = useState(1)

  // добавление вариантов в роль
  const [pickerOpen, setPickerOpen] = useState(false)
  const [activeItem, setActiveItem] = useState(null) // роль (item), куда будем добавлять варианты

  const wrapRef = useRef(null)

  // ===== helpers =====
  const loadOrResolveBundle = useCallback(async () => {
    if (!originalPartId) {
      setBundleId(null)
      setItems([])
      setOptions([])
      setTotals([])
      return
    }
    try {
      const { data } = await axios.get("/supplier-bundles", { params: { original_part_id: originalPartId } })
      if (Array.isArray(data) && data.length > 0) {
        setBundleId(data[0].id)
      } else {
        setBundleId(null)
      }
    } catch (e) {
      console.error(e)
      message.error("Не удалось загрузить список комплектов")
      setBundleId(null)
    }
  }, [originalPartId])

  const loadSummary = useCallback(async () => {
    if (!bundleId) return
    setLoading(true)
    try {
      const { data } = await axios.get(`/supplier-bundles/${bundleId}/summary`)
      setItems(Array.isArray(data?.items) ? data.items : [])
      setOptions(Array.isArray(data?.options) ? data.options : [])
      setTotals(Array.isArray(data?.totals) ? data.totals : [])
    } catch (e) {
      console.error(e)
      message.error("Не удалось загрузить комплект")
    } finally {
      setLoading(false)
    }
  }, [bundleId])

  useEffect(() => { loadOrResolveBundle() }, [loadOrResolveBundle])
  useEffect(() => { loadSummary() }, [bundleId, loadSummary])

  // ===== создание комплекта =====
  const createBundle = async () => {
    if (!originalPartId) return
    try {
      const { data } = await axios.post("/supplier-bundles", {
        original_part_id: originalPartId,
        title: createTitle || null,
        note: createNote || null,
      })
      setBundleId(data?.id)
      message.success("Комплект создан")
    } catch (e) {
      console.error(e)
      message.error(e?.response?.data?.message || "Не удалось создать комплект")
    }
  }

  // ===== работа с ролями =====
  const addItem = async () => {
    if (!bundleId) return
    const role = (newRole || "").trim()
    const qty = Number(newQty || 0)
    if (!role) return message.warning("Укажите роль")
    if (!(qty > 0)) return message.warning("Кол-во должно быть > 0")
    try {
      await axios.post("/supplier-bundles/items", { bundle_id: bundleId, role_label: role, qty })
      setNewRole("")
      setNewQty(1)
      await loadSummary()
      message.success("Роль добавлена")
    } catch (e) {
      console.error(e)
      message.error("Не удалось добавить роль")
    }
  }

  const removeItem = async (itemId) => {
    const { confirmed } = await confirmAction("Удалить роль с её вариантами?")
    if (!confirmed) return
    try {
      await axios.delete(`/supplier-bundles/items/${itemId}`)
      await loadSummary()
      message.success("Роль удалена")
    } catch (e) {
      console.error(e)
      message.error("Не удалось удалить роль")
    }
  }

  // ===== варианты (links) =====
  const addOptionsToItem = async (itemId, supplierPartRows) => {
    if (!itemId || !Array.isArray(supplierPartRows) || supplierPartRows.length === 0) return
    try {
      await Promise.all(
        supplierPartRows.map((r) =>
          axios.post("/supplier-bundles/links", {
            item_id: itemId,
            supplier_part_id: r.id,
            is_default: 0,
            note: null,
          })
        )
      )
      await loadSummary()
      message.success("Варианты добавлены")
    } catch (e) {
      console.error(e)
      message.error(e?.response?.data?.message || "Не удалось добавить варианты")
    }
  }

  const setDefaultLink = async (linkId) => {
    try {
      await axios.put(`/supplier-bundles/links/${linkId}`, { is_default: 1 })
      await loadSummary()
      message.success("Выбран вариант по умолчанию")
    } catch (e) {
      console.error(e)
      message.error("Не удалось установить default")
    }
  }

  const removeLink = async (linkId) => {
    const { confirmed } = await confirmAction("Удалить вариант поставщика из роли?")
    if (!confirmed) return
    try {
      await axios.delete(`/supplier-bundles/links/${linkId}`)
      await loadSummary()
      message.success("Вариант удалён")
    } catch (e) {
      console.error(e)
      message.error("Не удалось удалить вариант")
    }
  }

  // сгруппированные варианты по роли
  const optionsByItem = useMemo(() => {
    const map = new Map()
    for (const o of options) {
      if (!map.has(o.item_id)) map.set(o.item_id, [])
      map.get(o.item_id).push(o)
    }
    return map
  }, [options])

  // таблица ролей
  const itemCols = [
    { title: "Роль", dataIndex: "role_label", key: "role_label" },
    {
      title: "Кол-во",
      dataIndex: "qty",
      key: "qty",
      width: 110,
      align: "right",
      render: (v) => Number(v ?? 0),
    },
    {
      title: "Вариантов",
      key: "cnt",
      width: 120,
      render: (_, r) => <Tag>{optionsByItem.get(r.id)?.length || 0}</Tag>,
    },
    {
      title: "Действия",
      key: "actions",
      width: 240,
      render: (_, r) => (
        <Space>
          <Button
            size="small"
            icon={<LinkOutlined />}
            onClick={() => {
              setActiveItem(r)
              setPickerOpen(true)
            }}
          >
            Добавить варианты
          </Button>
          <Popconfirm
            title="Удалить роль?"
            placement="left"
            onConfirm={() => removeItem(r.id)}
            okText="Да"
            cancelText="Нет"
          >
            <Button danger size="small" icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  // раскладка вариантов для каждой роли
  const renderOptions = (item) => {
    const rows = optionsByItem.get(item.id) || []
    if (!rows.length) {
      return <div style={{ padding: 8, color: "#999" }}>Нет вариантов. Добавьте детали поставщиков.</div>
    }

    const cols = [
      {
        title: "Поставщик",
        dataIndex: "supplier_name",
        width: 220,
        render: (v) => v || "—",
      },
      {
        title: "№ у пост.",
        dataIndex: "supplier_part_number",
        width: 180,
        render: (v) => v || "—",
      },
      {
        title: "Описание",
        dataIndex: "description",
        render: (v) => v || "—",
      },
      {
        title: "Цена",
        dataIndex: "last_price",
        width: 120,
        align: "right",
        render: (v, r) => (v ? `${Number(v).toFixed(2)} ${r.last_currency || ""}` : "—"),
      },
      {
        title: "Дата",
        dataIndex: "last_price_date",
        width: 130,
        render: (v) => (v ? new Date(v).toLocaleDateString() : "—"),
      },
      {
        title: "По умолчанию",
        dataIndex: "is_default",
        width: 140,
        render: (v) => (v ? <Tag color="blue">default</Tag> : <Tag>—</Tag>),
      },
      {
        title: "Действия",
        key: "optActions",
        width: 160,
        render: (_, row) => (
          <Space>
            {!row.is_default && (
              <Tooltip title="Сделать вариантом по умолчанию">
                <Button size="small" icon={<CheckOutlined />} onClick={() => setDefaultLink(row.link_id)} />
              </Tooltip>
            )}
            <Tooltip title="Удалить вариант">
              <Button danger size="small" icon={<DeleteOutlined />} onClick={() => removeLink(row.link_id)} />
            </Tooltip>
          </Space>
        ),
      },
    ]

    return (
      <Table
        rowKey={(r) => r.link_id}
        columns={cols}
        dataSource={rows}
        pagination={false}
        size="small"
        tableLayout="fixed"
        className="op-table parts-subtable"
      />
    )
  }

  // верхняя панель
  const headerRight = (
    <Space>
      <Button icon={<ReloadOutlined />} onClick={loadSummary}>
        Обновить
      </Button>
    </Space>
  )

  // --- нет комплекта: форма создания
  if (!bundleId) {
    return (
      <Card size="small" title="Комплект (сборный)" extra={headerRight}>
        <Space direction="vertical" style={{ width: "100%" }}>
          <Text type="secondary">Комплект ещё не создан для этой детали.</Text>
          <Space wrap>
            <Input
              style={{ width: 320 }}
              placeholder="Название комплекта (необязательно)"
              value={createTitle}
              onChange={(e) => setCreateTitle(e.target.value)}
            />
            <Input
              style={{ width: 420 }}
              placeholder="Комментарий (необязательно)"
              value={createNote}
              onChange={(e) => setCreateNote(e.target.value)}
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={createBundle}>
              Создать комплект
            </Button>
          </Space>
        </Space>
      </Card>
    )
  }

  // --- есть комплект: список ролей + варианты
  return (
    <Card
      size="small"
      title={
        <Space wrap>
          <Text type="secondary">Комплект ID:</Text>
          <Tag color="blue">{bundleId}</Tag>
        </Space>
      }
      extra={headerRight}
      bodyStyle={{ paddingTop: 8 }}
    >
      <Space direction="vertical" style={{ width: "100%" }} size={12}>
        {/* Добавление роли */}
        <Space wrap align="center">
          <Text strong>Роль комплекта</Text>
          <Input
            style={{ width: 320 }}
            placeholder="Например: Насос"
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
          />
          <Text type="secondary">Кол-во:</Text>
          <InputNumber min={0.0001} step={1} value={newQty} onChange={(v) => setNewQty(v)} />
          <Button type="primary" icon={<PlusOutlined />} onClick={addItem}>
            Добавить
          </Button>
        </Space>

        {/* роли */}
        <div ref={wrapRef}>
          <Table
            rowKey="id"
            columns={itemCols}
            dataSource={items}
            loading={loading}
            pagination={false}
            size="middle"
            expandable={{
              expandedRowRender: (r) => renderOptions(r),
              expandRowByClick: true,
            }}
            className="op-table"
          />
        </div>

        {/* свод по валютам */}
        {!!totals.length && (
          <div style={{ marginTop: 6 }}>
            <Text type="secondary">Итого по выбранным default-вариантам:</Text>{" "}
            {totals.map((t) => (
              <Tag key={t.currency_iso3}>{`${(t.total_price ?? 0).toFixed(2)} ${t.currency_iso3}`}</Tag>
            ))}
          </div>
        )}
      </Space>

      {/* Drawer-пикер деталей поставщиков */}
      <SupplierPartPickerDrawer
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(rows) => {
          setPickerOpen(false)
          if (activeItem && Array.isArray(rows) && rows.length) addOptionsToItem(activeItem.id, rows)
        }}
      />
    </Card>
  )
}

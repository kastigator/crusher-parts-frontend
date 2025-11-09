// src/components/originalParts/AltOriginalsTable.jsx
import React, { useEffect, useMemo, useState } from "react"
import {
  Button,
  Empty,
  Input,
  message,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd"
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons"
import axios from "@/api/axiosInstance"
import confirmAction from "@/utils/confirmAction"
import AltOriginalsPickerDrawer from "./AltOriginalsPickerDrawer"

const { Text } = Typography

export default function AltOriginalsTable({ originalPartId }) {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(false)

  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerGroup, setPickerGroup] = useState(null)

  const [savingId, setSavingId] = useState(null)
  const [creating, setCreating] = useState(false)

  // ---------- загрузка ----------
  const loadGroups = async () => {
    if (!originalPartId) return
    setLoading(true)
    try {
      const { data } = await axios.get("/original-part-alt", {
        params: { original_part_id: originalPartId },
      })
      setGroups(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
      message.error("Не удалось загрузить альтернативные оригиналы")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setGroups([])
    if (originalPartId) loadGroups()
  }, [originalPartId])

  // ---------- создать группу ----------
  const handleCreate = async () => {
    if (!originalPartId) return
    setCreating(true)
    try {
      const { data } = await axios.post("/original-part-alt", {
        original_part_id: originalPartId,
        name: "Новая группа",
        comment: null,
      })
      const row = data && typeof data === "object" ? data : null
      if (row?.id) {
        setGroups((prev) => [...prev, { ...row, items: [] }])
      } else {
        await loadGroups()
      }
      message.success("Группа альтернатив создана")
    } catch (e) {
      console.error(e)
      const msg = e?.response?.data?.message || "Не удалось создать группу"
      message.error(msg)
    } finally {
      setCreating(false)
    }
  }

  // ---------- обновление name / comment ----------
  const updateGroupField = async (group, field, value) => {
    const trimmed = (value ?? "").trim()
    const oldVal = (group[field] ?? "") || ""
    if (trimmed === oldVal) return

    setSavingId(group.id)
    try {
      const payload = { [field]: trimmed || null }
      const { data } = await axios.put(`/original-part-alt/${group.id}`, payload)
      const fresh = data && typeof data === "object" ? data : null
      if (fresh?.id) {
        setGroups((prev) =>
          prev.map((g) => (g.id === fresh.id ? { ...g, ...fresh } : g)),
        )
      } else {
        await loadGroups()
      }
      message.success("Группа обновлена")
    } catch (e) {
      console.error(e)
      const msg = e?.response?.data?.message || "Не удалось обновить группу"
      message.error(msg)
    } finally {
      setSavingId(null)
    }
  }

  // ---------- удалить группу ----------
  const handleDeleteGroup = async (group) => {
    const { confirmed } = await confirmAction(
      `Удалить группу "${group.name || "без названия"}"?`,
    )
    if (!confirmed) return
    try {
      await axios.delete(`/original-part-alt/${group.id}`)
      setGroups((prev) => prev.filter((g) => g.id !== group.id))
      message.success("Группа удалена")
    } catch (e) {
      console.error(e)
      const msg = e?.response?.data?.message || "Не удалось удалить группу"
      message.error(msg)
    }
  }

  // ---------- элементы группы ----------
  const handleRemoveItem = async (groupId, altPartId) => {
    const { confirmed } = await confirmAction("Удалить деталь из группы?")
    if (!confirmed) return
    try {
      await axios.delete(`/original-part-alt/${groupId}/items`, {
        data: { alt_part_id: altPartId },
      })
      setGroups((prev) =>
        prev.map((g) =>
          g.id === groupId
            ? {
                ...g,
                items: (g.items || []).filter(
                  (i) => i.alt_part_id !== altPartId,
                ),
              }
            : g,
        ),
      )
      message.success("Удалено из группы")
    } catch (e) {
      console.error(e)
      const msg = e?.response?.data?.message || "Не удалось удалить позицию"
      message.error(msg)
    }
  }

  // добавить альтернативные детали (выбраны в Drawer)
  const handlePickedParts = async (pickedRows) => {
    const group = pickerGroup
    setPickerGroup(null)
    setPickerOpen(false)
    if (!group || !pickedRows?.length) return

    try {
      let added = 0
      for (const r of pickedRows) {
        try {
          await axios.post(`/original-part-alt/${group.id}/items`, {
            alt_part_id: r.id,
            note: null,
          })
          added += 1
        } catch (e) {
          if (e?.response?.status !== 409) throw e
        }
      }
      if (added) {
        message.success(`Добавлено альтернатив: ${added}`)
        await loadGroups()
      } else {
        message.info("Ничего не добавлено")
      }
    } catch (e) {
      console.error(e)
      const msg =
        e?.response?.data?.message ||
        "Не удалось добавить альтернативные детали в группу"
      message.error(msg)
    }
  }

  const openPickerForGroup = (group) => {
    setPickerGroup(group)
    setPickerOpen(true)
  }

  // ---------- таблица групп ----------
  const groupColumns = [
    {
      title: "Название группы",
      dataIndex: "name",
      render: (val, record) => (
        <Text
          editable={{
            onChange: (next) => updateGroupField(record, "name", next),
          }}
          type={val ? undefined : "secondary"}
        >
          {val || "Без названия"}
        </Text>
      ),
    },
    {
      title: "Комментарий",
      dataIndex: "comment",
      render: (val, record) => (
        <Text
          editable={{
            onChange: (next) => updateGroupField(record, "comment", next),
          }}
          type={val ? "secondary" : "secondary"}
        >
          {val || "Доп. пояснение (необязательно)"}
        </Text>
      ),
    },
    {
      title: "Позиции",
      width: 100,
      render: (_v, r) => (Array.isArray(r.items) ? r.items.length : 0),
    },
    {
      title: "Действия",
      width: 160,
      render: (_v, r) => (
        <Space>
          <Button size="small" onClick={() => openPickerForGroup(r)}>
            Добавить детали
          </Button>
          <Tooltip title="Удалить группу">
            <Button
              size="small"
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDeleteGroup(r)}
              loading={savingId === r.id}
            />
          </Tooltip>
        </Space>
      ),
    },
  ]

  // ---------- подтаблица с элементами ----------
  const renderItemsTable = (group) => {
    const items = Array.isArray(group.items) ? group.items : []
    if (!items.length) {
      return (
        <div
          style={{
            padding: "8px 16px 16px",
            color: "#999",
          }}
        >
          В этой группе пока нет альтернативных оригиналов.
        </div>
      )
    }

    const cols = [
      {
        title: "Part #",
        dataIndex: "cat_number",
        width: 160,
      },
      {
        title: "Описание (RU / EN)",
        key: "desc",
        ellipsis: true,
        render: (_v, r) =>
          r.description_ru || r.description_en || "—",
      },
      {
        title: "Производитель",
        dataIndex: "manufacturer_name",
        width: 220,
        ellipsis: true,
      },
      {
        title: "Модель",
        dataIndex: "model_name",
        width: 220,
        ellipsis: true,
      },
      {
        title: "Действия",
        width: 100,
        render: (_v, r) => (
          <Tooltip title="Удалить из группы">
            <Button
              size="small"
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleRemoveItem(group.id, r.alt_part_id)}
            />
          </Tooltip>
        ),
      },
    ]

    return (
      <div className="expanded-area" style={{ padding: "8px 16px 16px" }}>
        <Table
          rowKey={(row) => row.alt_part_id}
          className="op-table"
          size="small"
          columns={cols}
          dataSource={items}
          pagination={false}
        />
      </div>
    )
  }

  const headerInfo = useMemo(
    () => (
      <Space
        style={{
          width: "100%",
          marginBottom: 8,
          justifyContent: "space-between",
        }}
        align="center"
        wrap
      >
        <Space wrap>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreate}
            disabled={!originalPartId}
            loading={creating}
          >
            Создать группу
          </Button>
          <Tag>Групп: {groups.length}</Tag>
        </Space>
        <Text type="secondary" style={{ fontSize: 12 }}>
          Группа объединяет оригинальные детали разных производителей / моделей,
          которые можно считать взаимозаменяемыми с текущей деталью.
        </Text>
      </Space>
    ),
    [groups.length, creating, originalPartId],
  )

  if (!originalPartId) {
    return (
      <Empty description="Сначала выберите оригинальную деталь в таблице выше" />
    )
  }

  return (
    <div className="table-section">
      {headerInfo}

      <Table
        rowKey="id"
        className="op-table"
        size="small"
        loading={loading}
        columns={groupColumns}
        dataSource={groups}
        pagination={false}
        tableLayout="fixed"
        locale={{
          emptyText: (
            <Empty description="Нет альтернативных оригиналов" />
          ),
        }}
        expandable={{
          expandedRowRender: renderItemsTable,
          columnWidth: 32,
          expandRowByClick: true,
          defaultExpandAllRows: true,
        }}
      />

      <AltOriginalsPickerDrawer
        open={pickerOpen}
        onClose={() => {
          setPickerOpen(false)
          setPickerGroup(null)
        }}
        excludeIds={
          pickerGroup
            ? [
                originalPartId,
                ...(pickerGroup.items || []).map((i) => i.alt_part_id),
              ].filter(Boolean)
            : [originalPartId].filter(Boolean)
        }
        onPick={handlePickedParts}
      />
    </div>
  )
}

// src/components/supplierParts/OriginalsLinkTab.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react"
import { Button, Space, Table, Tag, Typography, message, Tooltip, Popconfirm } from "antd"
import { PlusOutlined, UnorderedListOutlined, DeleteOutlined, LinkOutlined } from "@ant-design/icons"
import axios from "@/api/axiosInstance"
import OriginalsPickerDrawer from "./OriginalsPickerDrawer"

const { Text } = Typography

/**
 * Вкладка «Привязки к оригиналам».
 * Props:
 * - supplierPartId: number (обязательно)
 * - onChanged?: () => void (опционально, уведомить родителя)
 */
export default function OriginalsLinkTab({ supplierPartId, onChanged = () => {} }) {
  const [list, setList] = useState([])     // [{ original_part_id, cat_number, description_ru, description_en, manufacturer_name, model_name }]
  const [loading, setLoading] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)

  const popupContainer = (trigger) =>
    trigger?.closest(".dock-shell")
      || trigger?.closest(".parts-table-wrap")
      || document.body

  const loadLinks = useCallback(async () => {
    if (!supplierPartId) { setList([]); return }
    setLoading(true)
    try {
      const { data } = await axios.get("/supplier-part-originals", {
        params: { supplier_part_id: supplierPartId }
      })
      setList(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
      message.error("Не удалось загрузить привязки")
    } finally {
      setLoading(false)
    }
  }, [supplierPartId])

  useEffect(() => {
    setList([])
    if (supplierPartId) loadLinks()
  }, [supplierPartId, loadLinks])

  // Уже привязанные original_part_id — исключаем в пикере
  const excludeIds = useMemo(
    () => list.map(x => Number(x.original_part_id)).filter(Boolean),
    [list]
  )

  const addLinks = async (pickedRows) => {
    if (!supplierPartId) return
    const toAdd = pickedRows
      .map(r => Number(r.id))
      .filter(id => id && !excludeIds.includes(id))

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
          original_part_id: originalId
        })
        added++
      } catch (e) {
        if (e?.response?.status === 409) {
          errors.push(`ID ${originalId}: уже существует`)
        } else {
          errors.push(`ID ${originalId}: ошибка`)
          console.error(e)
        }
      }
    }

    if (added) {
      message.success(`Добавлено привязок: ${added}`)
      await loadLinks()
      onChanged()
    }
    if (errors.length) {
      message.warning(`Часть не добавилась: ${errors.join("; ")}`)
    }
    setPickerOpen(false)
  }

  const unlink = async (original_part_id) => {
    try {
      await axios.delete("/supplier-part-originals", {
        data: { supplier_part_id: supplierPartId, original_part_id }
      })
      message.success("Привязка удалена")
      setList(prev => prev.filter(x => Number(x.original_part_id) !== Number(original_part_id)))
      onChanged()
    } catch (e) {
      console.error(e)
      message.error("Не удалось удалить привязку")
    }
  }

  const columns = [
    {
      title: "Оригинальная деталь",
      key: "cat",
      render: (_, r) => (
        <Space direction="vertical" size={2}>
          <Space size={6} wrap>
            <Text strong>{r.cat_number}</Text>
            {r.description_ru && <Tag>{r.description_ru}</Tag>}
          </Space>
          <Text type="secondary">{r.description_en || ""}</Text>
        </Space>
      )
    },
    {
      title: "Оборудование",
      key: "meta",
      width: 280,
      render: (_, r) => (
        <Space size={6} wrap>
          <Tag color="geekblue">{r.manufacturer_name || "—"}</Tag>
          <Tag>{r.model_name || "—"}</Tag>
        </Space>
      )
    },
    {
      title: "Действия",
      key: "actions",
      width: 120,
      render: (_, r) => (
        <Space>
          <Popconfirm
            title="Удалить привязку?"
            okType="danger"
            okText="Удалить"
            cancelText="Отмена"
            onConfirm={() => unlink(r.original_part_id)}
            getPopupContainer={popupContainer}
          >
            <Tooltip title="Удалить привязку" getPopupContainer={popupContainer}>
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      )
    }
  ]

  return (
    <>
      <Space style={{ width: "100%", marginBottom: 8 }} wrap>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setPickerOpen(true)}>
          Добавить привязку
        </Button>
        <Button icon={<UnorderedListOutlined />} onClick={loadLinks}>
          Обновить
        </Button>
        <Tag icon={<LinkOutlined />} color="blue">
          Привязок: {list.length}
        </Tag>
        <Text type="secondary">
          Можно привязывать несколько разных оригиналов (разные производители/модели).
        </Text>
      </Space>

      <Table
        size="middle"
        rowKey={(r) => String(r.original_part_id)}
        loading={loading}
        dataSource={list}
        columns={columns}
        pagination={{ pageSize: 8, showSizeChanger: false }}
        className="op-table parts-table"
      />

      <OriginalsPickerDrawer
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        excludeIds={excludeIds}
        onPick={addLinks}
      />
    </>
  )
}

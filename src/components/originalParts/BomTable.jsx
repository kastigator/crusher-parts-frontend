import React, { useEffect, useState } from "react"
import { Table, Space, Button, Input, InputNumber, message, Modal } from "antd"
import { PlusOutlined } from "@ant-design/icons"
import axios from "@/api/axiosInstance"
import confirmAction from "@/utils/confirmAction"

export default function BomTable({ parent, modelId, onReload }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)

  const load = async () => {
    if (!parent?.id) return
    setLoading(true)
    try {
      const { data } = await axios.get("/original-part-bom", { params: { parent_id: parent.id } })
      setItems(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
      message.error("Не удалось загрузить состав (children)")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [parent?.id]) // eslint-disable-line

  const addChildByCat = async () => {
    let modal
    const form = { cat: "", qty: 1 }
    const close = () => modal?.destroy()

    modal = Modal.confirm({
      title: "Добавить позицию в состав",
      icon: null,
      content: (
        <Space direction="vertical" style={{ width: "100%" }}>
          <Input placeholder="Cat number дочерней детали" onChange={(e) => (form.cat = e.target.value)} />
          <InputNumber min={0.0001} step={0.0001} style={{ width: "100%" }} defaultValue={1} onChange={(v) => (form.qty = v || 1)} />
        </Space>
      ),
      okText: "Добавить",
      async onOk() {
        const cat = String(form.cat || "").trim()
        const qty = Number(form.qty) || 1
        if (!cat) { message.warning("Введите Cat number"); return Promise.reject() }
        try {
          const params = { q: cat }
          if (modelId) params.equipment_model_id = modelId
          const { data: parts } = await axios.get("/original-parts", { params })
          const exact = (Array.isArray(parts) ? parts : []).find(p => String(p.cat_number).toLowerCase() === cat.toLowerCase())
          if (!exact) { message.error("Деталь с таким Cat number не найдена (в текущей модели)"); return Promise.reject() }

          await axios.post("/original-part-bom", {
            parent_part_id: parent.id,
            child_part_id: exact.id,
            quantity: qty
          })
          message.success("Позиция добавлена")
          await load()
          onReload?.()
        } catch (e) {
          if (e?.response?.status === 409) {
            message.warning(e?.response?.data?.message || "Строка BOM уже существует")
            return Promise.reject()
          }
          console.error(e); message.error("Не удалось добавить позицию"); return Promise.reject()
        } finally {
          close()
        }
      },
      onCancel: close
    })
  }

  const updateQty = async (childId, qty, qOrig) => {
    const q = Number(qty)
    if (!q || q === qOrig) return
    try {
      await axios.put("/original-part-bom", { parent_part_id: parent.id, child_part_id: childId, quantity: q })
      message.success("Количество обновлено")
      await load()
      onReload?.()
    } catch (e) {
      console.error(e); message.error("Не удалось сохранить количество")
    }
  }

  const removeChild = async (childId) => {
    const { confirmed } = await confirmAction("Удалить строку BOM?")
    if (!confirmed) return
    try {
      await axios.delete("/original-part-bom", { data: { parent_part_id: parent.id, child_part_id: childId } })
      message.success("Строка удалена")
      await load()
      onReload?.()
    } catch (e) {
      console.error(e); message.error("Не удалось удалить строку")
    }
  }

  return (
    <Table
      rowKey={(r) => `${r.parent_part_id}:${r.child_part_id}`}
      dataSource={items}
      loading={loading}
      size="small"
      pagination={false}
      columns={[
        { title: "Cat #", dataIndex: "child_cat_number", width: 160 },
        { title: "Описание", render: (_, r) => r.child_description_ru || r.child_description_en || "—" },
        {
          title: "Кол-во", dataIndex: "quantity", width: 180,
          render: (q, r) => (
            <Space.Compact style={{ width: "100%" }}>
              <InputNumber
                min={0.0001}
                step={0.0001}
                defaultValue={q}
                onPressEnter={(e) => updateQty(r.child_part_id, e.target.value, q)}
                onBlur={(e) => updateQty(r.child_part_id, e.target.value, q)}
              />
              <Button danger onClick={() => removeChild(r.child_part_id)}>Удалить</Button>
            </Space.Compact>
          )
        }
      ]}
      footer={() => (
        <div>
          <Button type="primary" icon={<PlusOutlined />} onClick={addChildByCat}>
            Добавить позицию
          </Button>
        </div>
      )}
    />
  )
}

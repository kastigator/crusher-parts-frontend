import React, { useEffect, useMemo, useState, useRef } from "react"
import { Table, Space, Button, InputNumber, message } from "antd"
import axios from "@/api/axiosInstance"
import confirmAction from "@/utils/confirmAction"
import { PlusOutlined } from "@ant-design/icons"
import BomChildPickerDrawer from "./BomChildPickerDrawer"

export default function BomTable({ parent, parentId: propParentId, modelId: propModelId, onReload }) {
  const parentId = parent?.id ?? propParentId ?? null
  const modelIdProp = propModelId ?? parent?.equipment_model_id ?? null

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [modelId, setModelId] = useState(modelIdProp)

  const lastSaveRef = useRef({ key: null, value: null })

  useEffect(() => {
    let ignore = false
    const fetchModelId = async () => {
      if (!parentId || modelIdProp) return
      try {
        const { data } = await axios.get(`/original-parts/${parentId}`)
        if (!ignore) setModelId(data?.equipment_model_id ?? null)
      } catch { }
    }
    fetchModelId()
    return () => { ignore = true }
  }, [parentId, modelIdProp])

  useEffect(() => { setModelId(modelIdProp ?? null) }, [modelIdProp])

  const load = async () => {
    if (!parentId) return
    setLoading(true)
    try {
      const { data } = await axios.get("/original-part-bom", { params: { parent_id: parentId } })
      setItems(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
      message.error("Не удалось загрузить состав (BOM)")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [parentId])

  const trySaveQty = async (childId, rawNext, qOrig) => {
    const q = Number(rawNext)
    if (!Number.isFinite(q) || q <= 0) return
    const saveKey = `${childId}:${q}`
    if (q === Number(qOrig) || (lastSaveRef.current.key === saveKey && lastSaveRef.current.value === q)) return

    try {
      lastSaveRef.current = { key: saveKey, value: q }
      await axios.put("/original-part-bom", { parent_part_id: parentId, child_part_id: childId, quantity: q })
      message.success("Количество обновлено")
      await load()
      onReload?.()
    } catch (e) {
      console.error(e)
      message.error("Не удалось сохранить количество")
    }
  }

  const removeChild = async (childId) => {
    const { confirmed } = await confirmAction("Удалить строку BOM?")
    if (!confirmed) return
    try {
      await axios.delete("/original-part-bom", { data: { parent_part_id: parentId, child_part_id: childId } })
      message.success("Строка удалена")
      await load()
      onReload?.()
    } catch (e) {
      console.error(e)
      message.error("Не удалось удалить строку")
    }
  }

  const addMany = async (list) => {
    if (!Array.isArray(list) || !list.length) return
    if (!parentId) { message.warning("Нет родителя для BOM"); return }

    let ok = 0, errors = []
    for (const item of list) {
      try {
        await axios.post("/original-part-bom", {
          parent_part_id: parentId,
          child_part_id: item.id,
          quantity: item.qty || 1,
        })
        ok += 1
      } catch (e) {
        const apiMsg = e?.response?.data?.message
        const label = item.cat_number || item.id
        errors.push(`${label}: ${apiMsg || "ошибка добавления"}`)
      }
    }

    if (ok) message.success(`Добавлено позиций: ${ok}`)
    if (errors.length) message.warning(`Не добавлено: ${errors.length}`)

    await load()
    onReload?.()
  }

  const excludeIds = useMemo(
    () => [parentId, ...items.map((r) => r.child_part_id)].filter(Boolean),
    [parentId, items]
  )

  return (
    <div className="subtable-shell">
      <Table
        rowKey={(r) => `${r.parent_part_id}:${r.child_part_id}`}
        dataSource={items}
        loading={loading}
        size="small"
        pagination={false}
        scroll={{ x: true }}
        columns={[
          { title: "Part number", dataIndex: "child_cat_number", width: 180 },
          { title: "Описание", ellipsis: true, render: (_, r) => r.child_description_ru || r.child_description_en || "—" },
          {
            title: "Кол-во",
            dataIndex: "quantity",
            width: 220,
            render: (q, r) => (
              <Space.Compact style={{ width: "100%" }}>
                <InputNumber
                  min={0.0001}
                  step={0.0001}
                  defaultValue={q}
                  style={{ width: "100%" }}
                  onPressEnter={(e) => trySaveQty(r.child_part_id, e.target.value, q)}
                  onBlur={(e) => trySaveQty(r.child_part_id, e.target.value, q)}
                />
                <Button danger onClick={() => removeChild(r.child_part_id)}>Удалить</Button>
              </Space.Compact>
            ),
          },
        ]}
        footer={() => (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setPickerOpen(true)}
              disabled={!modelId}
            >
              Добавить позиции
            </Button>
          </div>
        )}
      />

      <BomChildPickerDrawer
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        parentPartId={parentId}
        modelId={modelId}
        excludeIds={excludeIds}
        onPick={(picked) => { setPickerOpen(false); addMany(picked) }}
      />
    </div>
  )
}

// src/components/supplierParts/SupplierPartMetaCard.jsx
import React, { useEffect, useMemo, useState } from "react"
import { Button, Card, Checkbox, Input, InputNumber, Space, Typography, message } from "antd"
import axios from "@/api/axiosInstance"

const { Text } = Typography

const toNumOrNull = (v) => {
  if (v === undefined || v === null || v === "") return null
  const n = Number(String(v).replace(",", "."))
  return Number.isFinite(n) ? n : null
}

const normalizeStrOrNull = (v) => {
  const s = (v ?? "").toString().trim()
  return s === "" ? null : s
}

const metaFromPart = (part) => ({
  supplier_part_number: part?.supplier_part_number || "",
  description_ru: part?.description_ru || "",
  description_en: part?.description_en || "",
  comment: part?.comment || "",
  lead_time_days: part?.lead_time_days ?? null,
  min_order_qty: part?.min_order_qty ?? null,
  packaging: part?.packaging || "",
  is_oem: String(part?.part_type || "").toUpperCase() === "OEM",
  is_overweight: !!part?.is_overweight,
  is_oversize: !!part?.is_oversize,
  weight_kg: part?.weight_kg ?? null,
  length_cm: part?.length_cm ?? null,
  width_cm: part?.width_cm ?? null,
  height_cm: part?.height_cm ?? null,
})

export default function SupplierPartMetaCard({ part, onSaved }) {
  const partId = Number(part?.id)

  const [meta, setMeta] = useState(() => metaFromPart(part))
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setMeta(metaFromPart(part))
    setDirty(false)
  }, [partId, part])

  const canSave = useMemo(() => dirty && !saving, [dirty, saving])

  const setField = (key, value) => {
    setMeta((prev) => ({ ...prev, [key]: value }))
    setDirty(true)
  }

  const reset = () => {
    setMeta(metaFromPart(part))
    setDirty(false)
  }

  const save = async () => {
    if (!partId) return
    const number = meta.supplier_part_number?.trim()
    if (!number) {
      message.error("Номер у поставщика обязателен")
      return
    }

    setSaving(true)
    try {
      const payload = {
        supplier_part_number: normalizeStrOrNull(meta.supplier_part_number),
        description_ru: normalizeStrOrNull(meta.description_ru),
        description_en: normalizeStrOrNull(meta.description_en),
        comment: normalizeStrOrNull(meta.comment),
        lead_time_days: toNumOrNull(meta.lead_time_days),
        min_order_qty: toNumOrNull(meta.min_order_qty),
        packaging: normalizeStrOrNull(meta.packaging),
        part_type: meta.is_oem ? "OEM" : "ANALOG",
        is_overweight: !!meta.is_overweight,
        is_oversize: !!meta.is_oversize,
        weight_kg: toNumOrNull(meta.weight_kg),
        length_cm: toNumOrNull(meta.length_cm),
        width_cm: toNumOrNull(meta.width_cm),
        height_cm: toNumOrNull(meta.height_cm),
      }

      await axios.put(`/supplier-parts/${partId}`, payload)
      message.success("Изменения сохранены")
      setDirty(false)
      await onSaved?.()
    } catch (e) {
      console.error(e)
      message.error(e?.response?.data?.message || "Не удалось сохранить изменения")
    } finally {
      setSaving(false)
    }
  }

  if (!partId) return null

  return (
    <Card size="small" bodyStyle={{ padding: 12 }}>
      <Space direction="vertical" style={{ width: "100%" }} size={10}>
        <div>
          <Text strong>Основные поля</Text>
        </div>

        <Space style={{ width: "100%" }} size={10} wrap>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Номер у поставщика *</div>
            <Input
              value={meta.supplier_part_number}
              onChange={(e) => setField("supplier_part_number", e.target.value)}
              placeholder="например, S1535-1"
              allowClear
            />
          </div>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Описание (RU)</div>
            <Input
              value={meta.description_ru}
              onChange={(e) => setField("description_ru", e.target.value)}
              placeholder="Описание (RU)"
              allowClear
            />
          </div>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Описание (EN)</div>
            <Input
              value={meta.description_en}
              onChange={(e) => setField("description_en", e.target.value)}
              placeholder="Description (EN)"
              allowClear
            />
          </div>
        </Space>

        <div style={{ marginTop: 6 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Комментарий</div>
          <Input.TextArea
            value={meta.comment}
            onChange={(e) => setField("comment", e.target.value)}
            rows={2}
            placeholder="Внутренний комментарий"
          />
        </div>

        <Space wrap size={10}>
          <Checkbox checked={meta.is_oem} onChange={(e) => setField("is_oem", e.target.checked)}>
            OEM
          </Checkbox>
          <Checkbox
            checked={meta.is_overweight}
            onChange={(e) => setField("is_overweight", e.target.checked)}
          >
            Тяжелая
          </Checkbox>
          <Checkbox
            checked={meta.is_oversize}
            onChange={(e) => setField("is_oversize", e.target.checked)}
          >
            Негабарит
          </Checkbox>
        </Space>

        <div style={{ marginTop: 6 }}>
          <Text strong>Коммерческие условия</Text>
        </div>
        <Space style={{ width: "100%" }} size={10} wrap>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Срок поставки, дней</div>
            <InputNumber
              style={{ width: "100%" }}
              min={0}
              max={365}
              value={meta.lead_time_days}
              onChange={(v) => setField("lead_time_days", v)}
            />
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>MOQ</div>
            <InputNumber
              style={{ width: "100%" }}
              min={0}
              value={meta.min_order_qty}
              onChange={(v) => setField("min_order_qty", v)}
            />
          </div>
          <div style={{ flex: 2, minWidth: 260 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Упаковка</div>
            <Input
              value={meta.packaging}
              onChange={(e) => setField("packaging", e.target.value)}
              placeholder="например, по 10 шт"
              allowClear
            />
          </div>
        </Space>

        <div style={{ marginTop: 6 }}>
          <Text strong>Логистика</Text>
        </div>

        <Space style={{ width: "100%" }} size={10} wrap>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Вес, кг</div>
            <InputNumber
              style={{ width: "100%" }}
              min={0}
              step={0.01}
              value={meta.weight_kg}
              onChange={(v) => setField("weight_kg", v)}
            />
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Длина, см</div>
            <InputNumber
              style={{ width: "100%" }}
              min={0}
              step={0.1}
              value={meta.length_cm}
              onChange={(v) => setField("length_cm", v)}
            />
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Ширина, см</div>
            <InputNumber
              style={{ width: "100%" }}
              min={0}
              step={0.1}
              value={meta.width_cm}
              onChange={(v) => setField("width_cm", v)}
            />
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Высота, см</div>
            <InputNumber
              style={{ width: "100%" }}
              min={0}
              step={0.1}
              value={meta.height_cm}
              onChange={(v) => setField("height_cm", v)}
            />
          </div>
        </Space>

        <Space>
          <Button type="primary" onClick={save} disabled={!canSave} loading={saving}>
            Сохранить
          </Button>
          <Button onClick={reset} disabled={!dirty || saving}>
            Сбросить
          </Button>
        </Space>
      </Space>
    </Card>
  )
}

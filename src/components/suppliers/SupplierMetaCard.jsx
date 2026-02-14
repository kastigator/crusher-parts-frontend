// src/components/suppliers/SupplierMetaCard.jsx
import React, { useEffect, useMemo, useState } from "react"
import { Button, Card, Checkbox, Input, InputNumber, Select, Space, Typography, message } from "antd"
import axios from "@/api/axiosInstance"

const { Text } = Typography

const trimOrNull = (v) => {
  const s = (v ?? "").toString().trim()
  return s === "" ? null : s
}

const metaFromSupplier = (s) => ({
  name: s?.name || "",
  public_code: s?.public_code || "",
  vat_number: s?.vat_number || "",
  website: s?.website || "",
  payment_terms: s?.payment_terms || "",
  preferred_currency: s?.preferred_currency || "",
  default_incoterms: s?.default_incoterms || "",
  default_pickup_location: s?.default_pickup_location || "",
  can_oem: !!s?.can_oem,
  can_analog: s?.can_analog === undefined ? true : !!s?.can_analog,
  reliability_rating: s?.reliability_rating ?? null,
  risk_level: s?.risk_level || "",
  default_lead_time_days: s?.default_lead_time_days ?? null,
  notes: s?.notes || "",
  version: s?.version,
})

export default function SupplierMetaCard({ supplier, onSaved }) {
  const supplierId = Number(supplier?.id)

  const [meta, setMeta] = useState(() => metaFromSupplier(supplier))
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setMeta(metaFromSupplier(supplier))
    setDirty(false)
  }, [supplierId, supplier])

  const canSave = useMemo(() => dirty && !saving, [dirty, saving])

  const setField = (key, value) => {
    setMeta((prev) => ({ ...prev, [key]: value }))
    setDirty(true)
  }

  const reset = () => {
    setMeta(metaFromSupplier(supplier))
    setDirty(false)
  }

  const save = async () => {
    if (!supplierId) return

    const name = meta.name?.trim()
    const code = meta.public_code?.trim()
    if (!name) return message.error("Название поставщика обязательно")
    if (!code) return message.error("Код поставщика обязателен")

    setSaving(true)
    try {
      const payload = {
        version: meta.version,
        name: name,
        public_code: code,
        vat_number: trimOrNull(meta.vat_number),
        website: trimOrNull(meta.website),
        payment_terms: trimOrNull(meta.payment_terms),
        preferred_currency: trimOrNull(meta.preferred_currency),
        default_incoterms: trimOrNull(meta.default_incoterms),
        default_pickup_location: trimOrNull(meta.default_pickup_location),
        can_oem: meta.can_oem ? 1 : 0,
        can_analog: meta.can_analog ? 1 : 0,
        reliability_rating: meta.reliability_rating ?? null,
        risk_level: trimOrNull(meta.risk_level),
        default_lead_time_days: meta.default_lead_time_days ?? null,
        notes: trimOrNull(meta.notes),
      }

      await axios.put(`/suppliers/${supplierId}`, payload)
      message.success("Изменения сохранены")
      setDirty(false)
      await onSaved?.()
    } catch (e) {
      console.error(e)
      if (e?.response?.status === 409) {
        message.error("Конфликт версии. Обнови страницу и попробуй ещё раз.")
        await onSaved?.()
        return
      }
      message.error(e?.response?.data?.message || "Не удалось сохранить изменения")
    } finally {
      setSaving(false)
    }
  }

  if (!supplierId) return null

  return (
    <Card size="small" bodyStyle={{ padding: 12 }}>
      <Space direction="vertical" style={{ width: "100%" }} size={10}>
        <div>
          <Text strong>Основные поля</Text>
        </div>

        <Space style={{ width: "100%" }} size={10} wrap>
          <div style={{ flex: 2, minWidth: 260 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Название *</div>
            <Input value={meta.name} onChange={(e) => setField("name", e.target.value)} allowClear />
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Код *</div>
            <Input value={meta.public_code} onChange={(e) => setField("public_code", e.target.value)} allowClear />
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>VAT</div>
            <Input value={meta.vat_number} onChange={(e) => setField("vat_number", e.target.value)} allowClear />
          </div>
        </Space>

        <Space style={{ width: "100%" }} size={10} wrap>
          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Сайт</div>
            <Input value={meta.website} onChange={(e) => setField("website", e.target.value)} allowClear />
          </div>
          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Условия оплаты</div>
            <Input value={meta.payment_terms} onChange={(e) => setField("payment_terms", e.target.value)} allowClear />
          </div>
        </Space>

        <Space style={{ width: "100%" }} size={10} wrap>
          <div style={{ minWidth: 180 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Валюта</div>
            <Input value={meta.preferred_currency} onChange={(e) => setField("preferred_currency", e.target.value)} allowClear />
          </div>
          <div style={{ minWidth: 180 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Инкотермс</div>
            <Input value={meta.default_incoterms} onChange={(e) => setField("default_incoterms", e.target.value)} allowClear />
          </div>
          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Город/порт</div>
            <Input value={meta.default_pickup_location} onChange={(e) => setField("default_pickup_location", e.target.value)} allowClear />
          </div>
        </Space>

        <Space wrap size={10}>
          <Checkbox checked={meta.can_oem} onChange={(e) => setField("can_oem", e.target.checked)}>
            Может OEM
          </Checkbox>
          <Checkbox checked={meta.can_analog} onChange={(e) => setField("can_analog", e.target.checked)}>
            Может аналоги
          </Checkbox>
        </Space>

        <Space style={{ width: "100%" }} size={10} wrap>
          <div style={{ minWidth: 220 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Рейтинг надёжности</div>
            <InputNumber
              style={{ width: "100%" }}
              min={0}
              max={10}
              value={meta.reliability_rating}
              onChange={(v) => setField("reliability_rating", v)}
            />
          </div>
          <div style={{ minWidth: 220 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Риск</div>
            <Select
              allowClear
              style={{ width: "100%" }}
              value={meta.risk_level || undefined}
              onChange={(v) => setField("risk_level", v || "")}
              options={[
                { value: "low", label: "низкий" },
                { value: "medium", label: "средний" },
                { value: "high", label: "высокий" },
              ]}
            />
          </div>
          <div style={{ minWidth: 220 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Срок поставки (база), дн</div>
            <InputNumber
              style={{ width: "100%" }}
              min={0}
              max={365}
              value={meta.default_lead_time_days}
              onChange={(v) => setField("default_lead_time_days", v)}
            />
          </div>
        </Space>

        <div>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Заметки</div>
          <Input.TextArea value={meta.notes} onChange={(e) => setField("notes", e.target.value)} rows={3} />
        </div>

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

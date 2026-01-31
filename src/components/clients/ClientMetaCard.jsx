// src/components/clients/ClientMetaCard.jsx
import React, { useEffect, useMemo, useState } from "react"
import { Button, Card, Input, Space, Typography, message } from "antd"
import axios from "@/api/axiosInstance"

const { Text } = Typography

const trimOrNull = (v) => {
  const s = (v ?? "").toString().trim()
  return s === "" ? null : s
}

const metaFromClient = (c) => ({
  company_name: c?.company_name || "",
  contact_person: c?.contact_person || "",
  phone: c?.phone || "",
  email: c?.email || "",
  registration_number: c?.registration_number || "",
  tax_id: c?.tax_id || "",
  website: c?.website || "",
  notes: c?.notes || "",
  version: c?.version,
})

export default function ClientMetaCard({ client, onSaved }) {
  const clientId = Number(client?.id)

  const [meta, setMeta] = useState(() => metaFromClient(client))
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setMeta(metaFromClient(client))
    setDirty(false)
  }, [clientId])

  const canSave = useMemo(() => dirty && !saving, [dirty, saving])

  const setField = (key, value) => {
    setMeta((prev) => ({ ...(prev || {}), [key]: value }))
    setDirty(true)
  }

  const reset = () => {
    setMeta(metaFromClient(client))
    setDirty(false)
  }

  const save = async () => {
    if (!clientId) return
    const name = meta.company_name?.trim()
    if (!name) return message.error("Название компании обязательно")

    setSaving(true)
    try {
      const payload = {
        version: meta.version,
        company_name: name,
        contact_person: trimOrNull(meta.contact_person),
        phone: trimOrNull(meta.phone),
        email: trimOrNull(meta.email),
        registration_number: trimOrNull(meta.registration_number),
        tax_id: trimOrNull(meta.tax_id),
        website: trimOrNull(meta.website),
        notes: trimOrNull(meta.notes),
      }

      await axios.put(`/clients/${clientId}`, payload)
      message.success("Изменения сохранены")
      setDirty(false)
      await onSaved?.()
    } catch (e) {
      console.error(e)
      if (e?.response?.status === 409) {
        message.error("Конфликт версии. Обнови данные и попробуй ещё раз.")
        await onSaved?.()
        return
      }
      message.error(e?.response?.data?.message || "Не удалось сохранить изменения")
    } finally {
      setSaving(false)
    }
  }

  if (!clientId) return null

  return (
    <Card size="small" bodyStyle={{ padding: 12 }}>
      <Space direction="vertical" style={{ width: "100%" }} size={10}>
        <div>
          <Text strong>Основные поля</Text>
        </div>

        <Space style={{ width: "100%" }} size={10} wrap>
          <div style={{ flex: 2, minWidth: 320 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Компания *</div>
            <Input
              value={meta.company_name}
              onChange={(e) => setField("company_name", e.target.value)}
              allowClear
            />
          </div>
          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Контактное лицо</div>
            <Input
              value={meta.contact_person}
              onChange={(e) => setField("contact_person", e.target.value)}
              allowClear
            />
          </div>
        </Space>

        <Space style={{ width: "100%" }} size={10} wrap>
          <div style={{ minWidth: 220 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Телефон</div>
            <Input value={meta.phone} onChange={(e) => setField("phone", e.target.value)} allowClear />
          </div>
          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>E-mail</div>
            <Input value={meta.email} onChange={(e) => setField("email", e.target.value)} allowClear />
          </div>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Сайт</div>
            <Input value={meta.website} onChange={(e) => setField("website", e.target.value)} allowClear />
          </div>
        </Space>

        <Space style={{ width: "100%" }} size={10} wrap>
          <div style={{ minWidth: 260 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Рег. номер</div>
            <Input
              value={meta.registration_number}
              onChange={(e) => setField("registration_number", e.target.value)}
              allowClear
            />
          </div>
          <div style={{ minWidth: 260 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>ИНН / Tax ID</div>
            <Input value={meta.tax_id} onChange={(e) => setField("tax_id", e.target.value)} allowClear />
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


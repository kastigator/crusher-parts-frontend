// src/components/clients/ClientMetaCard.jsx
import React, { useMemo, useState } from "react"
import { EditOutlined } from "@ant-design/icons"
import { Button, Card, Descriptions, Form, Space, Typography, message } from "antd"
import axios from "@/api/axiosInstance"
import ClientUpsertDrawer from "./ClientUpsertDrawer"

const { Text } = Typography

const trimOrNull = (v) => {
  const s = (v ?? "").toString().trim()
  return s === "" ? null : s
}

const formInitialValues = (record = null) => ({
  company_name: record?.company_name || "",
  contact_person: record?.contact_person || "",
  phone: record?.phone || "",
  email: record?.email || "",
  registration_number: record?.registration_number || "",
  tax_id: record?.tax_id || "",
  website: record?.website || "",
  notes: record?.notes || "",
})

const buildPayload = (values) => ({
  company_name: String(values.company_name || "").trim(),
  contact_person: trimOrNull(values.contact_person),
  phone: trimOrNull(values.phone),
  email: trimOrNull(values.email),
  registration_number: trimOrNull(values.registration_number),
  tax_id: trimOrNull(values.tax_id),
  website: trimOrNull(values.website),
  notes: trimOrNull(values.notes),
})

export default function ClientMetaCard({ client, onSaved }) {
  const clientId = Number(client?.id)
  const [editForm] = Form.useForm()
  const [editOpen, setEditOpen] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)

  const summaryItems = useMemo(
    () => [
      { key: "company", label: "Компания", children: client?.company_name || "—" },
      { key: "contact", label: "Контакт", children: client?.contact_person || "—" },
      { key: "phone", label: "Телефон", children: client?.phone || "—" },
      { key: "email", label: "E-mail", children: client?.email || "—" },
      { key: "reg", label: "Регистрационный номер", children: client?.registration_number || "—" },
      { key: "tax", label: "ИНН / Tax ID", children: client?.tax_id || "—" },
      { key: "site", label: "Сайт", children: client?.website || "—" },
      { key: "notes", label: "Примечание", children: client?.notes || "—" },
    ],
    [client]
  )

  const openEdit = () => {
    editForm.setFieldsValue(formInitialValues(client))
    setEditOpen(true)
  }

  const saveEdit = async () => {
    if (!clientId) return
    try {
      const values = await editForm.validateFields()
      const payload = {
        ...buildPayload(values),
        version: Number(client?.version),
      }
      setSavingEdit(true)
      await axios.put(`/clients/${clientId}`, payload)
      message.success("Клиент обновлен")
      setEditOpen(false)
      await onSaved?.()
    } catch (e) {
      if (e?.errorFields) return
      console.error(e)
      message.error(e?.response?.data?.message || "Не удалось сохранить клиента")
    } finally {
      setSavingEdit(false)
    }
  }

  if (!clientId) return null

  return (
    <>
      <Card
        size="small"
        bodyStyle={{ padding: 12 }}
        extra={
          <Button type="primary" icon={<EditOutlined />} onClick={openEdit}>
            Редактировать клиента
          </Button>
        }
      >
        <Space direction="vertical" style={{ width: "100%" }} size={10}>
          <Text type="secondary">
            Основные данные клиента вынесены в единое боковое окно создания/редактирования.
          </Text>
          <Descriptions size="small" column={2} items={summaryItems} />
        </Space>
      </Card>

      <ClientUpsertDrawer
        open={editOpen}
        title="Редактировать клиента"
        form={editForm}
        saving={savingEdit}
        onClose={() => setEditOpen(false)}
        onSubmit={saveEdit}
      />
    </>
  )
}

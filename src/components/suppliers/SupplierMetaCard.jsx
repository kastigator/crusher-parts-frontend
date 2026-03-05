// src/components/suppliers/SupplierMetaCard.jsx
import React, { useMemo, useState } from "react"
import { Button, Card, Descriptions, Form, Space, Tag, Typography, message } from "antd"
import { EditOutlined } from "@ant-design/icons"
import axios from "@/api/axiosInstance"
import SupplierUpsertDrawer from "./SupplierUpsertDrawer"

const { Text } = Typography

const trimOrNull = (v) => {
  const s = (v ?? "").toString().trim()
  return s === "" ? null : s
}

const riskLabel = (v) => {
  if (v === "low") return "низкий"
  if (v === "medium") return "средний"
  if (v === "high") return "высокий"
  return "—"
}

const formInitialValues = (record = null) => ({
  name: record?.name || "",
  public_code: record?.public_code || "",
  vat_number: record?.vat_number || "",
  website: record?.website || "",
  payment_terms: record?.payment_terms || "",
  preferred_currency: record?.preferred_currency || "",
  default_pickup_location: record?.default_pickup_location || "",
  can_oem: !!record?.can_oem,
  can_analog: record?.can_analog === undefined ? true : !!record?.can_analog,
  reliability_rating:
    record?.reliability_rating === undefined || record?.reliability_rating === null
      ? null
      : Number(record.reliability_rating),
  risk_level: record?.risk_level || "",
  default_lead_time_days:
    record?.default_lead_time_days === undefined || record?.default_lead_time_days === null
      ? null
      : Number(record.default_lead_time_days),
  notes: record?.notes || "",
})

const buildPayload = (values) => ({
  name: String(values.name || "").trim(),
  public_code: String(values.public_code || "").trim(),
  vat_number: trimOrNull(values.vat_number),
  website: trimOrNull(values.website),
  payment_terms: trimOrNull(values.payment_terms),
  preferred_currency: trimOrNull(values.preferred_currency),
  default_pickup_location: trimOrNull(values.default_pickup_location),
  can_oem: values.can_oem ? 1 : 0,
  can_analog: values.can_analog === false ? 0 : 1,
  reliability_rating: values.reliability_rating ?? null,
  risk_level: trimOrNull(values.risk_level),
  default_lead_time_days: values.default_lead_time_days ?? null,
  notes: trimOrNull(values.notes),
})

export default function SupplierMetaCard({ supplier, onSaved }) {
  const supplierId = Number(supplier?.id)
  const [editForm] = Form.useForm()
  const [editOpen, setEditOpen] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)

  const summaryItems = useMemo(
    () => [
      {
        key: "company",
        label: "Название",
        children: supplier?.name || "—",
      },
      {
        key: "code",
        label: "Код",
        children: supplier?.public_code || "—",
      },
      {
        key: "vat",
        label: "VAT",
        children: supplier?.vat_number || "—",
      },
      {
        key: "website",
        label: "Сайт",
        children: supplier?.website || "—",
      },
      {
        key: "payment",
        label: "Условия оплаты (по умолчанию)",
        children: supplier?.payment_terms || "—",
      },
      {
        key: "currency",
        label: "Валюта (по умолчанию)",
        children: supplier?.preferred_currency || "—",
      },
      {
        key: "pickup",
        label: "Город/порт отгрузки",
        children: supplier?.default_pickup_location || "—",
      },
      {
        key: "reliability",
        label: "Рейтинг надежности",
        children:
          supplier?.reliability_rating === undefined || supplier?.reliability_rating === null
            ? "—"
            : Number(supplier.reliability_rating),
      },
      {
        key: "risk",
        label: "Риск",
        children: riskLabel(supplier?.risk_level),
      },
      {
        key: "lead",
        label: "Срок поставки базовый, дн",
        children:
          supplier?.default_lead_time_days === undefined || supplier?.default_lead_time_days === null
            ? "—"
            : Number(supplier.default_lead_time_days),
      },
      {
        key: "notes",
        label: "Заметки",
        children: supplier?.notes || "—",
      },
    ],
    [supplier]
  )

  const openEdit = () => {
    editForm.setFieldsValue(formInitialValues(supplier))
    setEditOpen(true)
  }

  const saveEdit = async () => {
    if (!supplierId) return
    try {
      const values = await editForm.validateFields()
      const payload = {
        ...buildPayload(values),
        version: Number(supplier?.version),
      }
      setSavingEdit(true)
      await axios.put(`/suppliers/${supplierId}`, payload)
      message.success("Поставщик обновлен")
      setEditOpen(false)
      await onSaved?.()
    } catch (e) {
      if (e?.errorFields) return
      console.error(e)
      message.error(e?.response?.data?.message || "Не удалось сохранить поставщика")
    } finally {
      setSavingEdit(false)
    }
  }

  if (!supplierId) return null

  return (
    <>
      <Card
        size="small"
        bodyStyle={{ padding: 12 }}
        extra={
          <Button type="primary" icon={<EditOutlined />} onClick={openEdit}>
            Редактировать поставщика
          </Button>
        }
      >
        <Space direction="vertical" size={10} style={{ width: "100%" }}>
          <Text type="secondary">
            Основные данные поставщика вынесены в единое боковое окно создания/редактирования.
          </Text>

          <Space size={8} wrap>
            <Tag color={supplier?.can_oem ? "blue" : "default"}>
              OEM: {supplier?.can_oem ? "да" : "нет"}
            </Tag>
            <Tag color={supplier?.can_analog ? "green" : "default"}>
              Аналоги: {supplier?.can_analog ? "да" : "нет"}
            </Tag>
          </Space>

          <Descriptions size="small" column={2} items={summaryItems} />
        </Space>
      </Card>

      <SupplierUpsertDrawer
        open={editOpen}
        title="Редактировать поставщика"
        form={editForm}
        saving={savingEdit}
        onClose={() => setEditOpen(false)}
        onSubmit={saveEdit}
      />
    </>
  )
}

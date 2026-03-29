import React, { useCallback, useEffect, useState } from "react"
import { Button, Card, Checkbox, Form, Input, Space, Typography, message } from "antd"
import axios from "@/api/axiosInstance"
import { runTrashDeleteFlow } from "@/utils/trashUi"

const { Text } = Typography

const emptyProfile = {
  internal_part_number: "",
  internal_part_name: "",
  supplier_visible_part_number: "",
  supplier_visible_description: "",
  drawing_code: "",
  use_by_default_in_supplier_rfq: false,
  note: "",
}

export default function OriginalPartPresentationProfileTab({ partId }) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(null)
  const [form] = Form.useForm()

  const load = useCallback(async () => {
    if (!partId) {
      setLoaded(emptyProfile)
      form.setFieldsValue(emptyProfile)
      return
    }
    setLoading(true)
    try {
      const { data } = await axios.get(`/original-parts/${partId}/presentation-profile`)
      const next = {
        ...emptyProfile,
        ...(data || {}),
        use_by_default_in_supplier_rfq: Number(data?.use_by_default_in_supplier_rfq) === 1,
      }
      setLoaded(next)
      form.setFieldsValue(next)
    } catch (err) {
      console.error("GET /original-parts/:id/presentation-profile error:", err)
      message.error(err?.response?.data?.message || "Не удалось загрузить внутреннее представление детали")
    } finally {
      setLoading(false)
    }
  }, [form, partId])

  useEffect(() => {
    load()
  }, [load])

  const save = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)
      await axios.put(`/original-parts/${partId}/presentation-profile`, {
        internal_part_number: values.internal_part_number || null,
        internal_part_name: values.internal_part_name || null,
        supplier_visible_part_number: values.supplier_visible_part_number || null,
        supplier_visible_description: values.supplier_visible_description || null,
        drawing_code: values.drawing_code || null,
        use_by_default_in_supplier_rfq: values.use_by_default_in_supplier_rfq ? 1 : 0,
        note: values.note || null,
      })
      message.success("Внутреннее представление детали сохранено")
      await load()
    } catch (err) {
      if (err?.errorFields) return
      console.error("PUT /original-parts/:id/presentation-profile error:", err)
      message.error(err?.response?.data?.message || "Не удалось сохранить внутреннее представление детали")
    } finally {
      setSaving(false)
    }
  }

  const removeProfile = async () => {
    if (!partId || !loaded?.id) return
    try {
      const result = await runTrashDeleteFlow({
        entityType: "oem_part_presentation_profiles",
        entityId: partId,
        deleteUrl: `/original-parts/${partId}/presentation-profile`,
        successMessage: "Профиль представления перемещён в корзину",
      })
      if (!result?.deleted) return
      await load()
    } catch (err) {
      console.error("DELETE /original-parts/:id/presentation-profile error:", err)
      message.error(err?.response?.data?.message || "Не удалось удалить профиль представления")
    }
  }

  return (
    <Card size="small" loading={loading}>
      <Space direction="vertical" style={{ width: "100%" }} size={12}>
        <Text type="secondary">
          Эти поля не меняют OEM-идентичность детали. Здесь задаются наш внутренний номер и то представление,
          которое можно использовать в запросе поставщику вместо OEM-номера.
        </Text>

        <Form layout="vertical" form={form}>
          <Form.Item label="Наш внутренний номер" name="internal_part_number">
            <Input placeholder="Например, DRW-001" />
          </Form.Item>

          <Form.Item label="Наше внутреннее название" name="internal_part_name">
            <Input placeholder="Например, Комплект уплотнений, исполнение A" />
          </Form.Item>

          <Form.Item label="Номер для поставщика" name="supplier_visible_part_number">
            <Input placeholder="Что поставщик увидит вместо OEM номера" />
          </Form.Item>

          <Form.Item label="Описание для поставщика" name="supplier_visible_description">
            <Input.TextArea rows={3} placeholder="Описание без ссылки на OEM и производителя" />
          </Form.Item>

          <Form.Item label="Код чертежа" name="drawing_code">
            <Input placeholder="Например, DRW-001-REV-B" />
          </Form.Item>

          <Form.Item name="use_by_default_in_supplier_rfq" valuePropName="checked">
            <Checkbox>Предлагать этот вариант по умолчанию в запросах поставщикам</Checkbox>
          </Form.Item>

          <Form.Item label="Комментарий" name="note">
            <Input.TextArea rows={2} placeholder="Внутренняя заметка" />
          </Form.Item>
        </Form>

        <Space>
          <Button type="primary" loading={saving} onClick={save}>
            Сохранить
          </Button>
          <Button onClick={load} disabled={saving}>
            Обновить
          </Button>
          <Button danger onClick={removeProfile} disabled={saving || !loaded?.id}>
            Удалить профиль
          </Button>
        </Space>
      </Space>
    </Card>
  )
}

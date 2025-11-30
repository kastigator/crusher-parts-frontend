import React, { useState } from "react"
import { Modal, Form, Input, Select, message } from "antd"
import axios from "@/api/axiosInstance"

export default function BankDetailsModal({ open, onClose, clientId, onCreated }) {
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)

  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      if (!clientId) {
        message.warning("Сначала выберите клиента")
        return
      }
      setSaving(true)
      const { data } = await axios.post("/client-bank-details", {
        client_id: clientId,
        bank_name: values.bank_name,
        account_number: values.account_number,
        currency: values.currency,
        bic: values.bic || null,
        correspondent_account: values.correspondent_account || null,
      })
      message.success("Реквизиты добавлены")
      onCreated?.(data)
      form.resetFields()
      onClose?.()
    } catch (e) {
      if (e?.errorFields) return
      console.error("bank create error", e)
      message.error(e?.response?.data?.message || "Не удалось добавить реквизиты")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title="Новые банковские реквизиты"
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={saving}
      destroyOnClose
    >
      <Form layout="vertical" form={form}>
        <Form.Item
          label="Банк"
          name="bank_name"
          rules={[{ required: true, message: "Укажите банк" }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          label="Расчётный счёт"
          name="account_number"
          rules={[{ required: true, message: "Укажите счёт" }]}
        >
          <Input />
        </Form.Item>
        <Form.Item label="BIC" name="bic">
          <Input />
        </Form.Item>
        <Form.Item label="Корр. счёт" name="correspondent_account">
          <Input />
        </Form.Item>
        <Form.Item
          label="Валюта"
          name="currency"
          rules={[{ required: true, message: "Укажите валюту" }]}
        >
          <Select
            options={[
              { value: "USD", label: "USD" },
              { value: "EUR", label: "EUR" },
              { value: "RUB", label: "RUB" },
            ]}
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}

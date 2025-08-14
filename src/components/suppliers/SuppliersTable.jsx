// src/components/suppliers/SuppliersTable.jsx
import React, { useMemo, useState } from "react"
import { Table, Input, InputNumber, Tabs, Form, Button, message, Space } from "antd"
import axios from "@/api/axiosInstance"
import SupplierAddressesMain from "./SupplierAddressesMain"
import SupplierBankDetailsMain from "./SupplierBankDetailsMain"
import SupplierContactsMain from "./SupplierContactsMain"
import ValueDisplay from "@/components/common/ValueDisplay"
import ActionButtons from "@/components/common/ActionButtons"
import FullHistoryDialog from "@/components/common/FullHistoryDialog"
import confirmAction from "@/utils/confirmAction"

// наши выпадающие (MUI Autocomplete + react-window)
import CountrySelect from "@/components/inputs/CountrySelect"
import CurrencySelect from "@/components/inputs/CurrencySelect"
import IncotermsSelect from "@/components/inputs/IncotermsSelect"

export default function SuppliersTable({
  data,
  loading,
  expandedSupplierId,
  setExpandedSupplierId,
  onReload,
  onChildChanged
}) {
  // редактирование: храним id + поле, и черновик строки
  const [editing, setEditing] = useState(null) // { id, field } | null
  const [draft, setDraft] = useState(null)     // копия текущей строки в редактировании
  const [historyForId, setHistoryForId] = useState(null)

  const isEditingCell = (record, field) => editing && editing.id === record.id && editing.field === field

  const startEditCell = (record, field) => {
    setEditing({ id: record.id, field })
    setDraft({ ...record })
  }

  const cancelEdit = () => {
    setEditing(null)
    setDraft(null)
  }

  // нормализация значений перед сохранением
  const norm = (field, value) => {
    if (value === "" || value === undefined) return null
    if (field === "country") return String(value).trim().toUpperCase().slice(0, 2)
    if (field === "preferred_currency") return String(value).trim().toUpperCase().slice(0, 3)
    return typeof value === "string" ? value.trim() : value
  }

  const saveCell = async (record, field, rawValue) => {
    const value = norm(field, rawValue)
    try {
      const payload = { [field]: value, version: record.version }
      await axios.put(`/part-suppliers/${record.id}`, payload)
      message.success("Сохранено")
      cancelEdit()
      // мягко обновим таблицу: перезагрузим (так надёжнее из-за version)
      await onReload?.()
      // если строка была раскрыта — оставим раскрытой
      if (expandedSupplierId === record.id) {
        setExpandedSupplierId(record.id)
      }
    } catch (err) {
      // обработка 409 конфликта
      const status = err?.response?.status
      if (status === 409) {
        const current = err?.response?.data?.current
        const { confirmed } = await confirmAction({
          title: "Появились новые изменения",
          text: "Принять серверную версию и продолжить редактирование?",
          icon: "warning",
          confirmLabel: "Принять",
          cancelLabel: "Отмена"
        })
        if (confirmed && current) {
          // подменим локальный драфт и оставим ту же ячейку открытой
          setDraft({ ...current, [field]: current[field] })
          setEditing({ id: current.id, field })
        } else {
          cancelEdit()
        }
      } else {
        console.error("Ошибка сохранения:", err)
        message.error(err?.response?.data?.message || "Не удалось сохранить")
        cancelEdit()
      }
    }
  }

  // УДАЛЕНИЕ — вынесено ВЫШЕ columns (иначе TDZ при useMemo)
  const deleteSupplier = async (supplier) => {
    const { confirmed } = await confirmAction("Удалить поставщика?")
    if (!confirmed) return
    try {
      await axios.delete(`/part-suppliers/${supplier.id}`)
      message.success("Поставщик удалён")
      await onReload?.()
    } catch (err) {
      console.error("Ошибка при удалении поставщика:", err)
      message.error("Не удалось удалить поставщика")
    }
  }

  // редакторы
  const renderTextInput = (record, field) => (
    <Input
      value={draft?.[field] ?? ""}
      onChange={(e) => setDraft((p) => ({ ...p, [field]: e.target.value }))}
      onPressEnter={(e) => saveCell(record, field, e.currentTarget.value)}
      onBlur={(e) => saveCell(record, field, e.currentTarget.value)}
      onKeyDown={(e) => e.key === "Escape" && cancelEdit()}
      autoFocus
      size="small"
      type={field === "email" ? "email" : "text"}
    />
  )

  const renderCountrySelect = (record) => (
    <CountrySelect
      value={draft?.country ?? record.country}
      onChange={(val) => saveCell(record, "country", val)}
      TextFieldProps={{ size: "small" }}
    />
  )

  const renderCurrencySelect = (record) => (
    <CurrencySelect
      value={draft?.preferred_currency ?? record.preferred_currency}
      onChange={(val) => saveCell(record, "preferred_currency", val)}
      TextFieldProps={{ size: "small" }}
    />
  )

  // колонки верхнего уровня
  const columns = useMemo(() => [
    {
      title: "Компания",
      dataIndex: "name",
      onCell: (record) => ({ onDoubleClick: () => startEditCell(record, "name") }),
      render: (_, record) =>
        isEditingCell(record, "name")
          ? renderTextInput(record, "name")
          : <ValueDisplay value={record.name} />
    },
    {
      title: "VAT / ИНН",
      dataIndex: "vat_number",
      width: 140,
      onCell: (record) => ({ onDoubleClick: () => startEditCell(record, "vat_number") }),
      render: (_, record) =>
        isEditingCell(record, "vat_number")
          ? renderTextInput(record, "vat_number")
          : <ValueDisplay value={record.vat_number} />
    },
    {
      title: "Страна",
      dataIndex: "country",
      width: 100,
      onCell: (record) => ({ onDoubleClick: () => startEditCell(record, "country") }),
      render: (_, record) =>
        isEditingCell(record, "country")
          ? renderCountrySelect(record)
          : <ValueDisplay value={record.country} />
    },
    {
      title: "Контакт",
      dataIndex: "contact_person",
      onCell: (record) => ({ onDoubleClick: () => startEditCell(record, "contact_person") }),
      render: (_, record) =>
        isEditingCell(record, "contact_person")
          ? renderTextInput(record, "contact_person")
          : <ValueDisplay value={record.contact_person} />
    },
    {
      title: "Телефон",
      dataIndex: "phone",
      onCell: (record) => ({ onDoubleClick: () => startEditCell(record, "phone") }),
      render: (_, record) =>
        isEditingCell(record, "phone")
          ? renderTextInput(record, "phone")
          : <ValueDisplay value={record.phone} />
    },
    {
      title: "Email",
      dataIndex: "email",
      onCell: (record) => ({ onDoubleClick: () => startEditCell(record, "email") }),
      render: (_, record) =>
        isEditingCell(record, "email")
          ? renderTextInput(record, "email")
          : <ValueDisplay value={record.email} type="email" />
    },
    {
      title: "Сайт",
      dataIndex: "website",
      onCell: (record) => ({ onDoubleClick: () => startEditCell(record, "website") }),
      render: (_, record) =>
        isEditingCell(record, "website")
          ? renderTextInput(record, "website")
          : <ValueDisplay value={record.website} type="link" />
    },
    {
      title: "Валюта",
      dataIndex: "preferred_currency",
      width: 120,
      onCell: (record) => ({ onDoubleClick: () => startEditCell(record, "preferred_currency") }),
      render: (_, record) =>
        isEditingCell(record, "preferred_currency")
          ? renderCurrencySelect(record)
          : <ValueDisplay value={record.preferred_currency} />
    },
    {
      title: "Действия",
      key: "actions",
      width: 120,
      render: (_, record) => (
        <ActionButtons
          onHistory={() => setHistoryForId(record.id)}
          onDelete={() => deleteSupplier(record)}
          size="small"
        />
      )
    }
  ], [editing, draft]) // eslint-disable-line react-hooks/exhaustive-deps

  // --------- вкладка «Профиль» (остальные поля мастера) ----------
  const ProfileTab = ({ supplier }) => {
    const [form] = Form.useForm()
    const [submitting, setSubmitting] = useState(false)

    const initial = useMemo(() => ({
      address: supplier.address ?? "",
      payment_terms: supplier.payment_terms ?? "",
      preferred_currency: supplier.preferred_currency ?? "",
      incoterms: supplier.incoterms ?? "",
      default_lead_time_days: supplier.default_lead_time_days ?? null,
      notes: supplier.notes ?? "",
    }), [supplier])

    const handleSave = async () => {
      const vals = await form.validateFields().catch(() => null)
      if (!vals) return
      setSubmitting(true)
      try {
        const payload = {
          address: vals.address ?? null,
          payment_terms: vals.payment_terms ? String(vals.payment_terms).trim().toUpperCase() : null,
          preferred_currency: vals.preferred_currency ? String(vals.preferred_currency).trim().toUpperCase().slice(0,3) : null,
          incoterms: vals.incoterms ? String(vals.incoterms).trim().toUpperCase() : null,
          default_lead_time_days: vals.default_lead_time_days ?? null,
          notes: vals.notes ?? null,
          version: supplier.version
        }
        await axios.put(`/part-suppliers/${supplier.id}`, payload)
        message.success("Профиль сохранён")
        await onChildChanged?.()
      } catch (err) {
        if (err?.response?.status === 409) {
          const current = err.response.data?.current
          const { confirmed } = await confirmAction({
            title: "Появились новые изменения",
            text: "Принять серверную версию формы и продолжить?",
            icon: "warning",
            confirmLabel: "Принять",
            cancelLabel: "Отмена"
          })
          if (confirmed && current) {
            form.setFieldsValue({
              address: current.address ?? "",
              payment_terms: current.payment_terms ?? "",
              preferred_currency: current.preferred_currency ?? "",
              incoterms: current.incoterms ?? "",
              default_lead_time_days: current.default_lead_time_days ?? null,
              notes: current.notes ?? ""
            })
          }
        } else {
          console.error(err)
          message.error("Не удалось сохранить профиль")
        }
      } finally {
        setSubmitting(false)
      }
    }

    return (
      <Form form={form} layout="vertical" initialValues={initial}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Form.Item label="Адрес (строкой)" name="address">
            <Input.TextArea rows={3} placeholder="Адрес поставщика" />
          </Form.Item>
          <Form.Item label="Условия оплаты" name="payment_terms">
            <Input placeholder="например, NET 30" />
          </Form.Item>
          <Form.Item label="Валюта (ISO3)" name="preferred_currency">
            <CurrencySelect
              value={form.getFieldValue("preferred_currency")}
              onChange={(v) => form.setFieldsValue({ preferred_currency: v })}
              TextFieldProps={{ size: "small" }}
            />
          </Form.Item>
          <Form.Item label="Incoterms 2020" name="incoterms">
            <IncotermsSelect
              value={form.getFieldValue("incoterms")}
              onChange={(v) => form.setFieldsValue({ incoterms: v })}
              TextFieldProps={{ size: "small" }}
            />
          </Form.Item>
          <Form.Item label="Срок поставки, дни" name="default_lead_time_days">
            <InputNumber min={0} style={{ width: "100%" }} placeholder="например, 14" />
          </Form.Item>
          <Form.Item label="Примечания" name="notes">
            <Input.TextArea rows={3} placeholder="Комментарии" />
          </Form.Item>
        </div>

        <Space style={{ marginTop: 8 }}>
          <Button type="primary" onClick={handleSave} loading={submitting}>
            Сохранить
          </Button>
        </Space>
      </Form>
    )
  }

  const expandedRowRender = (supplier) => {
    if (!supplier?.id) return null
    return (
      <div style={{ paddingInline: 0 }}>
        <Tabs
          defaultActiveKey="profile"
          destroyInactiveTabPane
          items={[
            {
              key: "profile",
              label: "Профиль",
              children: <ProfileTab supplier={supplier} />
            },
            {
              key: "addresses",
              label: "Адреса",
              children: (
                <SupplierAddressesMain
                  supplierId={supplier.id}
                  onChanged={onChildChanged}
                />
              )
            },
            {
              key: "contacts",
              label: "Контакты",
              children: (
                <SupplierContactsMain
                  supplierId={supplier.id}
                  onChanged={onChildChanged}
                />
              )
            },
            {
              key: "bank",
              label: "Банковские реквизиты",
              children: (
                <SupplierBankDetailsMain
                  supplierId={supplier.id}
                  onChanged={onChildChanged}
                />
              )
            }
          ]}
        />
      </div>
    )
  }

  return (
    <>
      <Table
        rowKey="id"
        dataSource={data}
        columns={columns}
        loading={loading}
        expandable={{
          expandedRowRender,
          expandedRowKeys: expandedSupplierId ? [expandedSupplierId] : [],
          onExpand: (expanded, record) =>
            setExpandedSupplierId(expanded ? record.id : null)
        }}
        pagination={{ pageSize: 10 }}
        size="middle"
      />

      {historyForId && (
        <FullHistoryDialog
          entityType="part_suppliers"  // ✅ приводим к типу логов на бэкенде
          entityId={historyForId}
          onClose={() => setHistoryForId(null)}
        />
      )}
    </>
  )
}

// src/components/suppliers/SuppliersTable.jsx
import React, { useMemo, useState } from "react"
import { Table, Input, InputNumber, Tabs, Form, Button, message, Space, Select } from "antd"
import SupplierAddressesMain from "./SupplierAddressesMain"
import SupplierBankDetailsMain from "./SupplierBankDetailsMain"
import SupplierContactsMain from "./SupplierContactsMain"
import ValueDisplay from "@/components/common/ValueDisplay"
import ActionButtons from "@/components/common/ActionButtons"
import FullHistoryDialog from "@/components/common/FullHistoryDialog"
import confirmAction from "@/utils/confirmAction"
import VersionConflictModal from "@/components/common/VersionConflictModal"

const INCOTERMS = ["EXW","FCA","FAS","FOB","CFR","CIF","CPT","CIP","DAP","DPU","DDP"]
const CURRENCIES = ["USD","EUR","RUB","CNY","GBP","JPY","KZT","TRY","INR","AED","CHF","SEK","NOK","PLN"]

export default function SuppliersTable({
  data,
  loading,
  expandedSupplierId,
  setExpandedSupplierId,
  onReload,
  onChildChanged,

  onUpdate,
  onDelete,
  onReplaceRow,
}) {
  const [editing, setEditing] = useState(null) // { id, field } | null
  const [draft, setDraft] = useState(null)
  const [historyForId, setHistoryForId] = useState(null)

  const [conflict, setConflict] = useState({ open: false, current: null, draft: null, id: null })

  const isEditingCell = (record, field) =>
    editing && editing.id === record.id && editing.field === field

  const startEditCell = (record, field) => {
    setEditing({ id: record.id, field })
    setDraft({ ...record })
  }

  const cancelEdit = () => { setEditing(null); setDraft(null) }

  const norm = (field, value) => {
    if (value === "" || value === undefined) return null
    if (field === "country") return String(value).trim().toUpperCase().slice(0, 2)
    if (field === "preferred_currency") return String(value).trim().toUpperCase().slice(0, 3)
    return typeof value === "string" ? value.trim() : value
  }

  const saveCell = async (record, field, rawValue) => {
    const value = norm(field, rawValue)
    const payload = { [field]: value, version: record.version }
    try {
      await onUpdate?.(record.id, payload)
      message.success("Сохранено")
      cancelEdit()
      if (expandedSupplierId === record.id) setExpandedSupplierId(record.id)
    } catch (err) {
      if (err?.isDuplicateKey) {
        message.error("Поставщик с таким VAT уже существует")
        cancelEdit()
        return
      }
      if (err?.isVersionConflict) {
        setConflict({
          open: true,
          current: err.currentRecord || null,
          draft: { ...record, ...payload },
          id: record.id,
        })
        return
      }
      console.error("Ошибка сохранения:", err)
      message.error("Не удалось сохранить")
      cancelEdit()
    }
  }

  const deleteSupplier = async (supplier) => {
    const { confirmed } = await confirmAction("Удалить поставщика?")
    if (!confirmed) return
    try {
      await onDelete?.(supplier)
    } catch (err) {
      if (err?.isVersionConflict) {
        if (err.currentRecord && typeof onReplaceRow === "function") onReplaceRow(err.currentRecord)
        await onReload?.()
        message.warning("Запись изменилась и не была удалена. Данные обновлены.")
        return
      }
      console.error("Ошибка при удалении поставщика:", err)
      message.error("Не удалось удалить поставщика")
    }
  }

  // ====== редакторы клеток ======
  const renderTextInput = (record, field, type = "text") => (
    <Input
      value={draft?.[field] ?? ""}
      onChange={(e) => setDraft((p) => ({ ...p, [field]: e.target.value }))}
      onPressEnter={(e) => saveCell(record, field, e.currentTarget.value)}
      onBlur={(e) => saveCell(record, field, e.currentTarget.value)}
      onKeyDown={(e) => e.key === "Escape" && cancelEdit()}
      autoFocus
      size="small"
      type={type}
    />
  )

  const renderCountryInput = (record) => (
    <Input
      placeholder="ISO2"
      value={draft?.country ?? record.country ?? ""}
      onChange={(e) => {
        const v = e.target.value.toUpperCase().slice(0, 2)
        setDraft((p) => ({ ...p, country: v }))
      }}
      onPressEnter={(e) => saveCell(record, "country", e.currentTarget.value)}
      onBlur={(e) => saveCell(record, "country", e.currentTarget.value)}
      onKeyDown={(e) => e.key === "Escape" && cancelEdit()}
      autoFocus
      size="small"
    />
  )

  const renderCurrencyInput = (record) => (
    <Input
      placeholder="ISO3"
      value={draft?.preferred_currency ?? record.preferred_currency ?? ""}
      onChange={(e) => {
        const v = e.target.value.toUpperCase().slice(0, 3)
        setDraft((p) => ({ ...p, preferred_currency: v }))
      }}
      onPressEnter={(e) => saveCell(record, "preferred_currency", e.currentTarget.value)}
      onBlur={(e) => saveCell(record, "preferred_currency", e.currentTarget.value)}
      onKeyDown={(e) => e.key === "Escape" && cancelEdit()}
      autoFocus
      size="small"
    />
  )

  /* eslint-disable react-hooks/exhaustive-deps */
  const columns = useMemo(
    () => [
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
            ? renderCountryInput(record)
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
            ? renderTextInput(record, "email", "email")
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
            ? renderCurrencyInput(record)
            : <ValueDisplay value={record.preferred_currency} />
      },
      {
        title: "Действия",
        key: "actions",
        width: 140,
        render: (_, record) => (
          <ActionButtons
            onHistory={() => setHistoryForId(record.id)}
            onDelete={() => deleteSupplier(record)}
            size="small"
          />
        )
      }
    ],
    [editing, draft]
  )
  /* eslint-enable react-hooks/exhaustive-deps */

  // ===== вкладка «Профиль» (остальные поля мастера) =====
  // ВАЖНО: function-declaration (хоистится), чтобы не ловить ReferenceError
  function ProfileTab({ supplier }) {
    const [form] = Form.useForm()
    const [submitting, setSubmitting] = useState(false)

    const initial = useMemo(
      () => ({
        payment_terms: supplier.payment_terms ?? "",
        preferred_currency: supplier.preferred_currency ?? "",
        incoterms: supplier.incoterms ?? "",
        default_lead_time_days: supplier.default_lead_time_days ?? null,
        notes: supplier.notes ?? ""
      }),
      [supplier]
    )

    const handleSave = async () => {
      const vals = await form.validateFields().catch(() => null)
      if (!vals) return
      setSubmitting(true)
      try {
        const payload = {
          payment_terms: vals.payment_terms ? String(vals.payment_terms).trim().toUpperCase() : null,
          preferred_currency: vals.preferred_currency ? String(vals.preferred_currency).trim().toUpperCase().slice(0, 3) : null,
          incoterms: vals.incoterms ? String(vals.incoterms).trim().toUpperCase() : null,
          default_lead_time_days: vals.default_lead_time_days ?? null,
          notes: vals.notes ?? null,
          version: supplier.version
        }
        await onUpdate?.(supplier.id, payload)
        message.success("Профиль сохранён")
      } catch (err) {
        if (err?.isVersionConflict) {
          setConflict({
            open: true,
            current: err.currentRecord || null,
            draft: { ...supplier, ...form.getFieldsValue(), ...{ version: supplier.version } },
            id: supplier.id,
          })
        } else if (err?.isDuplicateKey) {
          message.error("Конфликт уникальности (VAT)")
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
          <Form.Item label="Условия оплаты" name="payment_terms">
            <Input placeholder="например, NET 30" />
          </Form.Item>

          <Form.Item label="Валюта (ISO3)" name="preferred_currency">
            <Select
              allowClear
              showSearch
              placeholder="Выберите валюту"
              options={CURRENCIES.map((c) => ({ value: c, label: c }))}
              value={form.getFieldValue("preferred_currency") || undefined}
              onChange={(v) => form.setFieldsValue({ preferred_currency: v || "" })}
              getPopupContainer={(t) => t?.closest(".parts-subtable") || document.body}
            />
          </Form.Item>

          <Form.Item label="Incoterms 2020" name="incoterms">
            <Select
              allowClear
              showSearch
              placeholder="Выберите Incoterms"
              options={INCOTERMS.map((c) => ({ value: c, label: c }))}
              value={form.getFieldValue("incoterms") || undefined}
              onChange={(v) => form.setFieldsValue({ incoterms: v || "" })}
              getPopupContainer={(t) => t?.closest(".parts-subtable") || document.body}
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

  // ===== раскрытая строка с индетом под «+» =====
  const EXPAND_COL_W = 48
  const expandedRowRender = (supplier) => {
    if (!supplier?.id) return null
    return (
      <div className="parts-table-wrap parts-subtable subtable-inset">
        <Tabs
          defaultActiveKey="profile"
          destroyInactiveTabPane
          items={[
            { key: "profile",   label: "Профиль",              children: <ProfileTab supplier={supplier} /> },
            { key: "addresses", label: "Адреса",                children: <SupplierAddressesMain supplierId={supplier.id} onChanged={onChildChanged} /> },
            { key: "contacts",  label: "Контакты",              children: <SupplierContactsMain  supplierId={supplier.id} onChanged={onChildChanged} /> },
            { key: "bank",      label: "Банковские реквизиты",  children: <SupplierBankDetailsMain supplierId={supplier.id} onChanged={onChildChanged} /> }
          ]}
        />
      </div>
    )
  }

  return (
    <>
      <Table
        className="op-table parts-table"
        rowKey="id"
        dataSource={data}
        columns={columns}
        loading={loading}
        expandable={{
          expandedRowRender,
          expandedRowKeys: expandedSupplierId ? [expandedSupplierId] : [],
          onExpand: (expanded, record) => setExpandedSupplierId(expanded ? record.id : null),
          columnWidth: EXPAND_COL_W,
        }}
        pagination={{ pageSize: 10 }}
        size="middle"
        style={{ "--op-expand-w": `${EXPAND_COL_W}px` }}
      />

      {historyForId && (
        <FullHistoryDialog
          entityType="suppliers"
          entityId={historyForId}
          onClose={() => setHistoryForId(null)}
        />
      )}

      <VersionConflictModal
        open={conflict.open}
        draft={conflict.draft}
        current={conflict.current}
        fields={[
          { key: "name", title: "Компания" },
          { key: "vat_number", title: "VAT / ИНН" },
          { key: "country", title: "Страна" },
          { key: "contact_person", title: "Контакт" },
          { key: "phone", title: "Телефон" },
          { key: "email", title: "Email" },
          { key: "website", title: "Сайт" },
          { key: "payment_terms", title: "Условия оплаты" },
          { key: "preferred_currency", title: "Валюта (ISO3)" },
          { key: "incoterms", title: "Incoterms" },
          { key: "default_lead_time_days", title: "Срок поставки, дни" },
          { key: "notes", title: "Примечания" },
        ]}
        onReload={async () => {
          if (conflict.current && typeof onReplaceRow === "function") onReplaceRow(conflict.current)
          await onReload?.()
          setConflict({ open: false, current: null, draft: null, id: null })
          cancelEdit()
        }}
        onManualMerge={() => {
          const base  = conflict.current || {}
          const dr    = conflict.draft   || {}
          const merged = {
            ...base,
            name: dr.name ?? base.name,
            vat_number: dr.vat_number ?? base.vat_number,
            country: dr.country ?? base.country,
            contact_person: dr.contact_person ?? base.contact_person,
            phone: dr.phone ?? base.phone,
            email: dr.email ?? base.email,
            website: dr.website ?? base.website,
            payment_terms: dr.payment_terms ?? base.payment_terms,
            preferred_currency: dr.preferred_currency ?? base.preferred_currency,
            incoterms: dr.incoterms ?? base.incoterms,
            default_lead_time_days: dr.default_lead_time_days ?? base.default_lead_time_days,
            notes: dr.notes ?? base.notes,
          }
          if (merged.id) {
            const field = editing?.field || "name"
            setEditing({ id: merged.id, field })
            setDraft(merged)
          }
          setConflict({ open: false, current: null, draft: null, id: null })
        }}
        onCancel={() => setConflict({ open: false, current: null, draft: null, id: null })}
      />
    </>
  )
}

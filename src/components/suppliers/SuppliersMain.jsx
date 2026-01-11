// src/components/suppliers/SuppliersMain.jsx
import React, { useEffect, useMemo, useState } from "react"
import { Card, Space, Form, Input, Button, message } from "antd"
import axios from "@/api/axiosInstance"
import SuppliersTable from "./SuppliersTable"
import TableToolbar from "@/components/common/TableToolbar"
import ImportModal from "@/components/common/ImportModal"
import FullHistoryDialog from "@/components/common/FullHistoryDialog"
import { isSameByFields } from "@/utils/versionConflict"

const SUPPLIERS_TEMPLATE_URL =
  "https://storage.googleapis.com/shared-parts-bucket/templates/suppliers_template.xlsx"

const trim = (v) => (typeof v === "string" ? v.trim() : v ?? "")

export default function SuppliersMain() {
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [showDeleted, setShowDeleted] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

  const [form] = Form.useForm()

  // ============================
  // Загрузка поставщиков
  // ============================
  const fetchSuppliers = async () => {
    setLoading(true)
    try {
      const res = await axios.get("/suppliers")
      setSuppliers(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      console.error("Ошибка при загрузке поставщиков:", err)
      message.error("Не удалось загрузить поставщиков")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSuppliers()
  }, [])

  // ============================
  // CRUD операции
  // ============================

  const replaceRow = (fresh) =>
    setSuppliers((prev) => prev.map((r) => (r.id === fresh.id ? fresh : r)))

  const removeRow = (id) =>
    setSuppliers((prev) => prev.filter((r) => r.id !== id))

  const handleCreate = async (values) => {
    const payload = {
      name: trim(values.name),
      vat_number: trim(values.vat_number) || null,
      website: trim(values.website) || null,
      payment_terms: trim(values.payment_terms) || null,
      preferred_currency: trim(values.preferred_currency) || null,
      incoterms: trim(values.incoterms) || null,
      default_lead_time_days: values.default_lead_time_days ?? null,
      notes: trim(values.notes) || null,
      public_code: trim(values.public_code) || null,
    }

    if (!payload.name) {
      message.warning("Название поставщика обязательно")
      return
    }
    if (!payload.public_code) {
      message.warning("Код поставщика обязателен")
      return
    }

    try {
      const { data: created } = await axios.post("/suppliers", payload)
      setSuppliers((prev) => [created, ...prev])
      form.resetFields()
      message.success("Поставщик создан")
    } catch (err) {
      console.error("Ошибка при создании поставщика:", err)
      const msg =
        err?.response?.data?.message || "Не удалось создать поставщика"
      message.error(msg)
    }
  }

  const handleUpdate = async (id, row) => {
    const payload = { ...row, name: trim(row.name) }
    try {
      const { data: fresh } = await axios.put(`/suppliers/${id}`, payload)
      replaceRow(fresh)
      return fresh
    } catch (err) {
      // конфликт версий (optimistic locking)
      if (err?.response?.status === 409 && err?.response?.data?.current) {
        const current = err.response.data.current
        const fields = [
          "name",
          "vat_number",
          "website",
          "payment_terms",
          "preferred_currency",
          "incoterms",
          "default_lead_time_days",
          "notes",
          "public_code",
        ]
        const same = current && isSameByFields(current, payload, fields)
        if (same) {
          replaceRow(current)
          return current
        }
        const e = new Error("Version conflict")
        e.isVersionConflict = true
        e.currentRecord = current
        throw e
      }

      // дубликаты ключей (VAT / public_code)
      if (err?.response?.status === 409) {
        const { type, field } = err.response.data || {}
        if (type === "duplicate_vat" || field === "vat_number") {
          const e = new Error("Duplicate VAT")
          e.isDuplicateKey = true
          e.duplicateField = "vat_number"
          throw e
        }
        if (type === "duplicate_public_code" || field === "public_code") {
          const e = new Error("Duplicate public code")
          e.isDuplicateKey = true
          e.duplicateField = "public_code"
          throw e
        }
      }

      console.error("Ошибка при обновлении поставщика:", err)
      message.error("Не удалось сохранить изменения по поставщику")
      throw err
    }
  }

  const handleDelete = async (supplier) => {
    try {
      await axios.delete(`/suppliers/${supplier.id}`, {
        params: { version: supplier.version },
      })
      removeRow(supplier.id)
      message.success("Поставщик удален")
    } catch (err) {
      console.error("Ошибка при удалении поставщика:", err)
      const msg =
        err?.response?.data?.message || "Не удалось удалить поставщика"
      message.error(msg)
    }
  }

  // ============================
  // Фильтрация
  // ============================
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return suppliers
    return suppliers.filter((s) => {
      return (
        String(s.name || "").toLowerCase().includes(q) ||
        String(s.vat_number || "").toLowerCase().includes(q) ||
        String(s.public_code || "").toLowerCase().includes(q) ||
        String(s.country || "").toLowerCase().includes(q) ||
        String(s.contact_person || "").toLowerCase().includes(q) ||
        String(s.notes || "").toLowerCase().includes(q)
      )
    })
  }, [suppliers, search])

  // ============================
  // Render
  // ============================
  return (
    <Space direction="vertical" style={{ width: "100%" }} size={16}>
      <Card size="small">
        <TableToolbar
          search={search}
          onSearch={setSearch}
          placeholder="Поиск по поставщикам..."
          onShowDeleted={() => setShowDeleted(true)}
          onImport={() => setImportOpen(true)}
        />

        {/* Форма создания */}
        <Form
          form={form}
          layout="inline"
          onFinish={handleCreate}
          style={{ marginBottom: 12, flexWrap: "wrap", rowGap: 8 }}
        >
          <Form.Item
            label="Название"
            name="name"
            rules={[{ required: true, message: "Введите название поставщика" }]}
          >
            <Input placeholder="Название поставщика" />
          </Form.Item>

          <Form.Item
            label="Код"
            name="public_code"
            rules={[{ required: true, message: "Введите код" }]}
          >
            <Input placeholder="S001" style={{ width: 100 }} />
          </Form.Item>

          <Form.Item label="VAT" name="vat_number">
            <Input placeholder="FI1234567" style={{ width: 140 }} />
          </Form.Item>

          <Form.Item label="Примечание" name="notes">
            <Input style={{ width: 200 }} />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit">
              Добавить
            </Button>
          </Form.Item>
        </Form>

        <div className="parts-table-wrap table-section">
          <SuppliersTable
            data={filtered}
            loading={loading}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
          />
        </div>
      </Card>

      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        type="suppliers"
        templateUrl={SUPPLIERS_TEMPLATE_URL}
        onImported={fetchSuppliers}
      />

      {showDeleted && (
        <FullHistoryDialog
          onlyDeleted
          entityType="suppliers"
          onClose={() => setShowDeleted(false)}
        />
      )}
    </Space>
  )
}

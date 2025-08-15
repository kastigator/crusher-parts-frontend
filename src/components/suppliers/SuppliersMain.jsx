// src/components/suppliers/SuppliersMain.jsx
import React, { useEffect, useMemo, useState, useRef } from "react"
import { Card, Space, Form, Input, Button, message } from "antd"
import axios from "@/api/axiosInstance"
import SuppliersTable from "./SuppliersTable"
import TableToolbar from "@/components/common/TableToolbar"
import ImportModal from "@/components/common/ImportModal"
import FullHistoryDialog from "@/components/common/FullHistoryDialog"

export default function SuppliersMain() {
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [expandedSupplierId, setExpandedSupplierId] = useState(null)

  const [importOpen, setImportOpen] = useState(false)
  const [showDeleted, setShowDeleted] = useState(false)

  const nameInputRef = useRef(null)

  const [newSupplier, setNewSupplier] = useState({
    name: "",
    contact_person: "",
    phone: "",
    email: "",
  })

  const fetchSuppliers = async () => {
    setLoading(true)
    try {
      const res = await axios.get("/part-suppliers")
      setSuppliers(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      console.error("Ошибка загрузки поставщиков:", err)
      message.error("Не удалось загрузить поставщиков")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSuppliers()
  }, [])

  const handleAdd = async () => {
    const payload = {
      name: newSupplier.name.trim(),
      contact_person: newSupplier.contact_person?.trim() || null,
      phone: newSupplier.phone?.trim() || null,
      email: newSupplier.email?.trim() || null,
      // ⛔ никаких active / is_oem / quality_certified / address
    }

    if (!payload.name) {
      message.warning("Название компании обязательно")
      nameInputRef.current?.focus()
      return
    }

    try {
      const res = await axios.post("/part-suppliers", payload)
      message.success("Поставщик добавлен")
      // добавляем свежую запись в начало без полного рефетча
      setSuppliers((prev) => [res.data, ...prev])
      setNewSupplier({ name: "", contact_person: "", phone: "", email: "" })
      nameInputRef.current?.focus()
    } catch (err) {
      console.error("Ошибка при добавлении поставщика:", err)
      const msg = err?.response?.data?.message || "Не удалось добавить поставщика"
      message.error(msg)
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return suppliers
    return suppliers.filter((r) =>
      [
        r.name,
        r.contact_person,
        r.phone,
        r.email,
        r.vat_number,
        r.country,
        r.preferred_currency,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    )
  }, [suppliers, search])

  const handleChildChanged = async () => {
    await fetchSuppliers()
  }

  const handleImportComplete = (result) => {
    const ins = result?.inserted?.length || 0
    const upd = result?.updated?.length || 0
    const err = result?.errors?.length || 0
    if (ins || upd) message.success(`Импорт: добавлено ${ins}, обновлено ${upd}`)
    if (err) message.warning(`Импорт: ошибок ${err}`)
    setImportOpen(false)
    fetchSuppliers()
  }

  return (
    <Space direction="vertical" style={{ width: "100%" }} size={16}>
      <Card title="Поставщики" bodyStyle={{ paddingTop: 0 }}>
        <TableToolbar
          search={search}
          onSearch={setSearch}
          onImport={() => setImportOpen(true)}
          onShowDeleted={() => setShowDeleted(true)}
        />

        {/* Форма добавления */}
        <Form layout="inline" style={{ marginBottom: 16 }} onFinish={handleAdd}>
          <Form.Item label="Компания" required>
            <Input
              ref={nameInputRef}
              value={newSupplier.name}
              onChange={(e) =>
                setNewSupplier((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="Название"
              allowClear
              style={{ minWidth: 220 }}
            />
          </Form.Item>

          <Form.Item label="Контакт">
            <Input
              value={newSupplier.contact_person}
              onChange={(e) =>
                setNewSupplier((prev) => ({
                  ...prev,
                  contact_person: e.target.value,
                }))
              }
              placeholder="ФИО"
              allowClear
              style={{ minWidth: 180 }}
            />
          </Form.Item>

          <Form.Item label="Телефон">
            <Input
              value={newSupplier.phone}
              onChange={(e) =>
                setNewSupplier((prev) => ({ ...prev, phone: e.target.value }))
              }
              placeholder="+358..."
              allowClear
              style={{ minWidth: 160 }}
            />
          </Form.Item>

          <Form.Item label="Email">
            <Input
              value={newSupplier.email}
              onChange={(e) =>
                setNewSupplier((prev) => ({ ...prev, email: e.target.value }))
              }
              placeholder="example@mail.com"
              allowClear
              style={{ minWidth: 220 }}
              type="email"
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit">
              Добавить
            </Button>
          </Form.Item>
        </Form>

        <SuppliersTable
          data={filtered}
          loading={loading}
          expandedSupplierId={expandedSupplierId}
          setExpandedSupplierId={setExpandedSupplierId}
          onReload={fetchSuppliers}
          onChildChanged={handleChildChanged}
        />
      </Card>

      {/* Импорт */}
      <ImportModal
        open={importOpen}
        type="part_suppliers"
        onClose={() => setImportOpen(false)}
        onComplete={handleImportComplete}
      />

      {/* Удалённые (история) */}
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

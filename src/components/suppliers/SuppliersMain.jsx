// src/components/suppliers/SuppliersMain.jsx
import React, { useEffect, useMemo, useRef, useState } from "react"
import { Card, Space, Form, Input, Button, message } from "antd"
import axios from "@/api/axiosInstance"
import SuppliersTable from "./SuppliersTable"
import TableToolbar from "@/components/common/TableToolbar"
import ImportModal from "@/components/common/ImportModal"
import FullHistoryDialog from "@/components/common/FullHistoryDialog"

const SUPPLIERS_TEMPLATE_URL =
  "https://storage.googleapis.com/shared-parts-bucket/templates/suppliers_template.xlsx"

export default function SuppliersMain() {
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [expandedSupplierId, setExpandedSupplierId] = useState(null)

  const [importOpen, setImportOpen] = useState(false)
  const [showDeleted, setShowDeleted] = useState(false)

  // баннер новых изменений
  const [hasNew, setHasNew] = useState(false)
  const baselinesRef = useRef(new Map())
  const lastBaselineSetAtRef = useRef(0)

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

  useEffect(() => { fetchSuppliers() }, [])

  const handleAdd = async () => {
    const payload = {
      name: newSupplier.name.trim(),
      contact_person: newSupplier.contact_person?.trim() || null,
      phone: newSupplier.phone?.trim() || null,
      email: newSupplier.email?.trim() || null,
    }
    if (!payload.name) {
      message.warning("Название компании обязательно")
      nameInputRef.current?.focus()
      return
    }
    try {
      const { data: created } = await axios.post("/part-suppliers", payload)
      setSuppliers((prev) => [created, ...prev])
      message.success("Поставщик добавлен")
      setNewSupplier({ name: "", contact_person: "", phone: "", email: "" })
      nameInputRef.current?.focus()
      await refreshAllAndResetBaseline()
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
      [r.name, r.contact_person, r.phone, r.email, r.vat_number, r.country, r.preferred_currency]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    )
  }, [suppliers, search])

  // ===== ETag / baseline tracking =====
  const fetchSuppliersEtag = async () => {
    const { data } = await axios.get("/part-suppliers/etag")
    return data?.etag || ""
  }
  const fetchChildEtags = async (supplierId) => {
    if (!supplierId) return ""
    try {
      const [addr, bank, contacts] = await Promise.all([
        axios.get("/supplier-addresses/etag", { params: { supplier_id: supplierId } }),
        axios.get("/supplier-bank-details/etag", { params: { supplier_id: supplierId } }),
        axios.get("/supplier-contacts/etag", { params: { supplier_id: supplierId } }),
      ])
      return [
        addr.data?.etag || "0:0",
        bank.data?.etag || "0:0",
        contacts.data?.etag || "0:0",
      ].join("|")
    } catch { return "" }
  }
  const getKey = (id) => (id ? `supplier:${id}` : "global")
  const buildCompositeTag = async (id) => {
    const [sTag, child] = await Promise.all([
      fetchSuppliersEtag(),
      id ? fetchChildEtags(id) : Promise.resolve(""),
    ])
    return `${sTag}__${id || "-"}__${child}`
  }
  const setBaselineFor = async (id) => {
    try {
      const key = getKey(id)
      const tag = await buildCompositeTag(id)
      baselinesRef.current.set(key, tag)
      lastBaselineSetAtRef.current = Date.now()
      setHasNew(false)
    } catch {}
  }
  const refreshAllAndResetBaseline = async () => {
    await fetchSuppliers()
    await setBaselineFor(expandedSupplierId)
  }
  useEffect(() => { if (!loading) setBaselineFor(expandedSupplierId) }, [loading])
  useEffect(() => {
    let t0, timer
    const check = async () => {
      if (document.hidden) return
      try {
        const key = getKey(expandedSupplierId)
        const current = await buildCompositeTag(expandedSupplierId)
        const baseline = baselinesRef.current.get(key)
        if (!baseline) return
        if (Date.now() - lastBaselineSetAtRef.current < 2000) return
        if (baseline !== current) setHasNew(true)
      } catch {}
    }
    t0 = setTimeout(check, 10000)
    timer = setInterval(check, 30000)
    const onVis = () => check()
    document.addEventListener("visibilitychange", onVis)
    return () => { clearTimeout(t0); clearInterval(timer); document.removeEventListener("visibilitychange", onVis) }
  }, [expandedSupplierId])

  const handleChildChanged = async () => { await setBaselineFor(expandedSupplierId) }

  const replaceRow = (fresh) =>
    setSuppliers((prev) => prev.map((r) => (r.id === fresh.id ? fresh : r)))

  const onUpdate = async (id, row) => {
    try {
      const { data: fresh } = await axios.put(`/part-suppliers/${id}`, row)
      replaceRow(fresh)
      message.success("Изменения сохранены")
      await setBaselineFor(expandedSupplierId)
      return fresh
    } catch (err) {
      if (err?.response?.data?.type === "duplicate_key") {
        const e = new Error("Duplicate key"); e.isDuplicateKey = true; throw e
      }
      if (err?.response?.status === 409 && err?.response?.data?.type === "version_conflict") {
        const e = new Error("Version conflict"); e.isVersionConflict = true; e.currentRecord = err.response.data.current; throw e
      }
      throw err
    }
  }

  const onDelete = async (record) => {
    try {
      await axios.delete(`/part-suppliers/${record.id}`, { params: { version: record.version } })
      setSuppliers((prev) => prev.filter((r) => r.id !== record.id))
      message.success("Поставщик удалён")
      await setBaselineFor(expandedSupplierId)
    } catch (err) {
      if (err?.response?.status === 409 && err?.response?.data?.type === "version_conflict") {
        const e = new Error("Version conflict"); e.isVersionConflict = true; e.currentRecord = err.response.data.current; throw e
      }
      throw err
    }
  }

  return (
    <Space direction="vertical" style={{ width: "100%" }} size={16}>
      <Card title="Поставщики" bodyStyle={{ paddingTop: 0 }}>
        {hasNew && (
          <div style={{ margin: "8px 0" }}>
            <Button type="primary" onClick={async () => { await refreshAllAndResetBaseline(); message.success("Список и связанные данные обновлены") }}>
              Появились новые изменения — Обновить
            </Button>
          </div>
        )}

        <TableToolbar
          search={search}
          onSearch={setSearch}
          onImport={() => setImportOpen(true)}
          onShowDeleted={() => setShowDeleted(true)}
        />

        <Form layout="inline" style={{ marginBottom: 16 }} onFinish={handleAdd}>
          <Form.Item label="Компания" required>
            <Input
              ref={nameInputRef}
              value={newSupplier.name}
              onChange={(e) => setNewSupplier((p) => ({ ...p, name: e.target.value }))}
              placeholder="Название"
              allowClear
              style={{ minWidth: 220 }}
            />
          </Form.Item>
          <Form.Item label="Контакт">
            <Input value={newSupplier.contact_person} onChange={(e) => setNewSupplier((p) => ({ ...p, contact_person: e.target.value }))} placeholder="ФИО" allowClear style={{ minWidth: 180 }}/>
          </Form.Item>
          <Form.Item label="Телефон">
            <Input value={newSupplier.phone} onChange={(e) => setNewSupplier((p) => ({ ...p, phone: e.target.value }))} placeholder="+358..." allowClear style={{ minWidth: 160 }}/>
          </Form.Item>
          <Form.Item label="Email">
            <Input value={newSupplier.email} onChange={(e) => setNewSupplier((p) => ({ ...p, email: e.target.value }))} placeholder="example@mail.com" allowClear style={{ minWidth: 220 }} type="email"/>
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">Добавить</Button>
          </Form.Item>
        </Form>

        <SuppliersTable
          data={filtered}
          loading={loading}
          expandedSupplierId={expandedSupplierId}
          setExpandedSupplierId={async (val) => { setExpandedSupplierId(val); await setBaselineFor(val) }}
          onReload={refreshAllAndResetBaseline}
          onChildChanged={handleChildChanged}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onReplaceRow={replaceRow}
        />
      </Card>

      <ImportModal
        open={importOpen}
        type="part_suppliers"
        onClose={() => setImportOpen(false)}
        templateUrl={SUPPLIERS_TEMPLATE_URL}
        onSuccess={() => { setImportOpen(false); fetchSuppliers(); message.success("Импорт выполнен") }}
      />

      {showDeleted && (
        <FullHistoryDialog
          onlyDeleted
          endpoint="/part-suppliers/logs/deleted"
          onClose={() => setShowDeleted(false)}
        />
      )}
    </Space>
  )
}

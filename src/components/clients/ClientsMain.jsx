// src/components/clients/ClientsMain.jsx
import React, { useEffect, useMemo, useRef, useState } from "react"
import { Card, Space, Form, Input, Button, message } from "antd"
import axios from "@/api/axiosInstance"
import ClientsTable from "./ClientsTable"
import TableToolbar from "@/components/common/TableToolbar"
import FullHistoryDialog from "@/components/common/FullHistoryDialog"

export default function ClientsMain() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [expandedClientId, setExpandedClientId] = useState(null)
  const [showDeletedModal, setShowDeletedModal] = useState(false)
  const [hasNew, setHasNew] = useState(false)

  // 🔑 ключ для форс-перемонтирования дочерних вкладок (billing/shipping/bank)
  const [reloadKey, setReloadKey] = useState(0)

  // baseline по «ключу состояния» (global / client:<id>)
  const baselinesRef = useRef(new Map())
  const lastBaselineSetAtRef = useRef(0)

  const [newClient, setNewClient] = useState({
    company_name: "",
    contact_person: "",
    phone: "",
    email: "",
    registration_number: "",
    tax_id: "",
    website: "",
    notes: "",
  })

  // ===== CRUD клиентов (родитель даёт их в таблицу) =====
  const replaceRow = (fresh) =>
    setClients((prev) => prev.map((r) => (r.id === fresh.id ? fresh : r)))

  const onUpdate = async (id, row) => {
    const trim = (v) => (typeof v === "string" ? v.trim() : v)
    const payload = {
      company_name: trim(row.company_name) || null,
      contact_person: trim(row.contact_person) || null,
      phone: trim(row.phone) || null,
      email: trim(row.email) || null,
      version: row.version,
    }
    try {
      const { data: fresh } = await axios.put(`/clients/${id}`, payload)
      replaceRow(fresh)
      message.success("Изменения сохранены")
    } catch (err) {
      if (err?.response?.status === 409 && err?.response?.data?.current) {
        const e = new Error("Version conflict")
        e.isVersionConflict = true
        e.currentRecord = err.response.data.current
        throw e
      }
      if (err?.response?.status === 409 && err?.response?.data?.code === "duplicate") {
        const e = new Error("Duplicate")
        e.isDuplicateKey = true
        throw e
      }
      throw err
    }
  }

  const onDelete = async (client) => {
    try {
      await axios.delete(`/clients/${client.id}`, { params: { version: client.version } })
      message.success("Клиент удалён")
    } catch (err) {
      if (err?.response?.status === 409 && err?.response?.data?.current) {
        const e = new Error("Version conflict")
        e.isVersionConflict = true
        e.currentRecord = err.response.data.current
        throw e
      }
      throw err
    }
  }
  // ======================================================

  const fetchClients = async () => {
    setLoading(true)
    try {
      const res = await axios.get("/clients")
      setClients(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      console.error("Ошибка загрузки клиентов:", err)
      message.error("Не удалось загрузить клиентов")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchClients() }, [])

  const handleAdd = async () => {
    const payload = {
      company_name: newClient.company_name.trim(),
      contact_person: newClient.contact_person?.trim() || "",
      phone: newClient.phone?.trim() || "",
      email: newClient.email?.trim() || "",
      registration_number: newClient.registration_number?.trim() || "",
      tax_id: newClient.tax_id?.trim() || "",
      website: newClient.website?.trim() || "",
      notes: newClient.notes?.trim() || "",
    }
    if (!payload.company_name) {
      message.warning("Название компании обязательно")
      return
    }
    try {
      await axios.post("/clients", payload)
      message.success("Клиент добавлен")
      setNewClient({
        company_name: "",
        contact_person: "",
        phone: "",
        email: "",
        registration_number: "",
        tax_id: "",
        website: "",
        notes: "",
      })
      await refreshAllAndResetBaseline()
    } catch (err) {
      console.error("Ошибка при добавлении клиента:", err)
      message.error("Не удалось добавить клиента")
    }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return clients.filter(
      (r) =>
        r.company_name?.toLowerCase().includes(q) ||
        r.contact_person?.toLowerCase().includes(q)
    )
  }, [clients, search])

  // --- etag helpers (баннер "Появились новые изменения") ---
  const fetchClientsEtag = async () => {
    const { data } = await axios.get("/clients/etag")
    return data?.etag || ""
  }

  const fetchChildEtags = async (clientId) => {
    if (!clientId) return ""
    try {
      const [billing, shipping, bank] = await Promise.all([
        axios.get("/client-billing-addresses/etag",  { params: { client_id: clientId } }),
        axios.get("/client-shipping-addresses/etag", { params: { client_id: clientId } }),
        axios.get("/client-bank-details/etag",      { params: { client_id: clientId } }),
      ])
      return [
        billing.data?.etag || "0:0",
        shipping.data?.etag || "0:0",
        bank.data?.etag || "0:0",
      ].join("|")
    } catch {
      return ""
    }
  }

  const getKey = (id) => (id ? `client:${id}` : "global")

  const buildCompositeTag = async (id) => {
    const [cTag, child] = await Promise.all([
      fetchClientsEtag(),
      id ? fetchChildEtags(id) : Promise.resolve(""),
    ])
    return `${cTag}__${id || "-"}__${child}`
  }

  const setBaselineFor = async (id) => {
    try {
      const key = getKey(id)
      const tag = await buildCompositeTag(id)
      baselinesRef.current.set(key, tag)
      lastBaselineSetAtRef.current = Date.now()
      setHasNew(false)
    } catch { /* noop */ }
  }

  const refreshAllAndResetBaseline = async () => {
    await fetchClients()
    setReloadKey((k) => k + 1)           // форсим перемонтирование дочерних вкладок
    await setBaselineFor(expandedClientId)
  }

  useEffect(() => {
    if (!loading) setBaselineFor(expandedClientId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading])

  useEffect(() => {
    let t0, timer
    const check = async () => {
      if (document.hidden) return
      const key = getKey(expandedClientId)
      try {
        const current = await buildCompositeTag(expandedClientId)
        const baseline = baselinesRef.current.get(key)
        if (!baseline) return
        if (Date.now() - lastBaselineSetAtRef.current < 2000) return
        if (baseline !== current) setHasNew(true)
      } catch { /* noop */ }
    }
    t0 = setTimeout(check, 10000)
    timer = setInterval(check, 30000)
    const onVis = () => check()
    document.addEventListener("visibilitychange", onVis)
    return () => {
      clearTimeout(t0)
      clearInterval(timer)
      document.removeEventListener("visibilitychange", onVis)
    }
  }, [expandedClientId])

  const handleChildChanged = async () => {
    await setBaselineFor(expandedClientId)
  }

  return (
    <Space direction="vertical" style={{ width: "100%" }} size={16}>
      <Card title="Клиенты" bodyStyle={{ paddingTop: 0 }}>
        {hasNew && (
          <div style={{ margin: "8px 0" }}>
            <Button
              type="primary"
              onClick={async () => {
                await refreshAllAndResetBaseline()
                message.success("Список и связанные данные обновлены")
              }}
            >
              Появились новые изменения — Обновить
            </Button>
          </div>
        )}

        {/* 🔹 тулбар всегда с единым отступом */}
        <TableToolbar
          className="table-section"
          search={search}
          onSearch={setSearch}
          onShowDeleted={() => setShowDeletedModal(true)}
        />

        {/* 🔹 форма добавления клиента также с единым отступом */}
        <Form
          layout="inline"
          className="table-section"
          onFinish={handleAdd}
        >
          <Form.Item label="Компания">
            <Input
              value={newClient.company_name}
              onChange={(e) => setNewClient((prev) => ({ ...prev, company_name: e.target.value }))}
              placeholder="Название"
            />
          </Form.Item>

          <Form.Item label="Контактное лицо">
            <Input
              value={newClient.contact_person}
              onChange={(e) => setNewClient((prev) => ({ ...prev, contact_person: e.target.value }))}
              placeholder="ФИО"
            />
          </Form.Item>

          <Form.Item label="Телефон">
            <Input
              value={newClient.phone}
              onChange={(e) => setNewClient((prev) => ({ ...prev, phone: e.target.value }))}
              placeholder="+7..."
            />
          </Form.Item>

          <Form.Item label="Email">
            <Input
              value={newClient.email}
              onChange={(e) => setNewClient((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="example@mail.com"
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit">Добавить</Button>
          </Form.Item>
        </Form>

        {/* Якорь для всех вложенных выпадашек/календарей + правильная ширина */}
        <div className="parts-table-wrap">
          <ClientsTable
            data={filtered}
            loading={loading}
            expandedClientId={expandedClientId}
            setExpandedClientId={async (val) => {
              setExpandedClientId(val)
              await setBaselineFor(val)
            }}
            onReload={refreshAllAndResetBaseline}
            onChildChanged={handleChildChanged}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onReplaceRow={replaceRow}
            reloadKey={reloadKey}
          />
        </div>
      </Card>

      {showDeletedModal && (
        <FullHistoryDialog
          onlyDeleted
          endpoint="/clients/logs/deleted"
          onClose={() => setShowDeletedModal(false)}
        />
      )}
    </Space>
  )
}

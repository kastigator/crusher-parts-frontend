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

  const baselineTagRef = useRef(null)

  const [newClient, setNewClient] = useState({
    company_name: "",
    contact_person: "",
    phone: "",
    email: "",
    registration_number: "",
    tax_id: "",
    website: "",
    notes: ""
  })

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

  useEffect(() => {
    fetchClients()
  }, [])

  const handleAdd = async () => {
    const payload = {
      company_name: newClient.company_name.trim(),
      contact_person: newClient.contact_person?.trim() || "",
      phone: newClient.phone?.trim() || "",
      email: newClient.email?.trim() || "",
      registration_number: newClient.registration_number?.trim() || "",
      tax_id: newClient.tax_id?.trim() || "",
      website: newClient.website?.trim() || "",
      notes: newClient.notes?.trim() || ""
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
        notes: ""
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

  const fetchClientsEtag = async () => {
    const { data } = await axios.get("/clients/etag")
    return data?.etag || ""
  }

  const fetchChildEtags = async (clientId) => {
    if (!clientId) return ""
    try {
      const [billing, shipping, bank] = await Promise.all([
        axios.get("/client-billing-addresses/etag", { params: { client_id: clientId } }),
        axios.get("/client-shipping-addresses/etag", { params: { client_id: clientId } }),
        axios.get("/client-bank-details/etag", { params: { client_id: clientId } }),
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

  const getCompositeTag = async (activeId = expandedClientId) => {
    const [cTag, child] = await Promise.all([
      fetchClientsEtag(),
      activeId ? fetchChildEtags(activeId) : Promise.resolve(""),
    ])
    return `${cTag}__${activeId || "-"}__${child}`
  }

  const setBaselineFromServer = async () => {
    try {
      const tag = await getCompositeTag()
      baselineTagRef.current = tag
      setHasNew(false)
    } catch {}
  }

  useEffect(() => {
    if (!loading) {
      setBaselineFromServer()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, expandedClientId])

  useEffect(() => {
    let t0
    let timer

    const check = async () => {
      if (document.hidden) return
      try {
        const current = await getCompositeTag()
        const baseline = baselineTagRef.current
        if (baseline && baseline !== current) {
          setHasNew(true)
        }
      } catch {}
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

  const refreshAllAndResetBaseline = async () => {
    await fetchClients()
    await setBaselineFromServer()
  }

  // <<< НОВОЕ: колбэк, который будем отдавать детям >>>
  const handleChildChanged = async () => {
    // можно без перезагрузки списка — просто обновим baseline
    await setBaselineFromServer()
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

        <TableToolbar
          search={search}
          onSearch={setSearch}
          onShowDeleted={() => setShowDeletedModal(true)}
        />

        <Form layout="inline" style={{ marginBottom: 16 }} onFinish={handleAdd}>
          <Form.Item label="Компания">
            <Input
              value={newClient.company_name}
              onChange={(e) =>
                setNewClient((prev) => ({ ...prev, company_name: e.target.value }))
              }
              placeholder="Название"
            />
          </Form.Item>

          <Form.Item label="Контактное лицо">
            <Input
              value={newClient.contact_person}
              onChange={(e) =>
                setNewClient((prev) => ({ ...prev, contact_person: e.target.value }))
              }
              placeholder="ФИО"
            />
          </Form.Item>

          <Form.Item label="Телефон">
            <Input
              value={newClient.phone}
              onChange={(e) =>
                setNewClient((prev) => ({ ...prev, phone: e.target.value }))
              }
              placeholder="+7..."
            />
          </Form.Item>

          <Form.Item label="Email">
            <Input
              value={newClient.email}
              onChange={(e) =>
                setNewClient((prev) => ({ ...prev, email: e.target.value }))
              }
              placeholder="example@mail.com"
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit">
              Добавить
            </Button>
          </Form.Item>
        </Form>

        <ClientsTable
          data={filtered}
          loading={loading}
          expandedClientId={expandedClientId}
          setExpandedClientId={async (val) => {
            setExpandedClientId(val)
            setTimeout(setBaselineFromServer, 0)
          }}
          onReload={refreshAllAndResetBaseline}
          onChildChanged={handleChildChanged}   // <<< ВАЖНО
        />
      </Card>

      {showDeletedModal && (
        <FullHistoryDialog
          entityType="clients-combined"
          entityId={null}
          onlyDeleted={true}
          onClose={() => setShowDeletedModal(false)}
        />
      )}
    </Space>
  )
}

import React, { useCallback, useEffect, useState } from "react"
import { Card, Button, Input, Row, Col, Checkbox, message } from "antd"
import axios from "@/api/axiosInstance"

import ClientContactsTable from "./ClientContactsTable"
import VersionConflictModal from "@/components/common/VersionConflictModal"
import { isSameByFields } from "@/utils/versionConflict"

const trimOrNull = (v) => {
  if (v === undefined || v === null) return null
  const s = String(v).trim()
  return s === "" ? null : s
}

export default function ClientContactsMain({ clientId, onChanged }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [conflict, setConflict] = useState(null)

  const [newContact, setNewContact] = useState({
    name: "",
    role: "",
    email: "",
    phone: "",
    is_primary: false,
    notes: "",
  })

  const fetchData = useCallback(async () => {
    if (!clientId) return
    setLoading(true)
    try {
      const { data: list } = await axios.get("/client-contacts", {
        params: { client_id: clientId },
      })
      setData(Array.isArray(list) ? list : [])
    } catch (e) {
      console.error("Ошибка при загрузке контактов клиента:", e)
      message.error("Не удалось загрузить контакты клиента")
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    if (!clientId) return
    fetchData()
  }, [clientId, fetchData])

  const handleAdd = async () => {
    if (!clientId) return

    const payload = {
      client_id: clientId,
      name: newContact.name?.trim(),
      role: trimOrNull(newContact.role),
      email: trimOrNull(newContact.email),
      phone: trimOrNull(newContact.phone),
      is_primary: newContact.is_primary ? 1 : 0,
      notes: trimOrNull(newContact.notes),
    }

    if (!payload.name) {
      message.warning("Имя контакта обязательно")
      return
    }

    try {
      const { data: created } = await axios.post("/client-contacts", payload)
      setData((prev) => [created, ...prev])
      setNewContact({
        name: "",
        role: "",
        email: "",
        phone: "",
        is_primary: false,
        notes: "",
      })
      message.success("Контакт добавлен")
      onChanged?.()
    } catch (e) {
      console.error("Ошибка при создании контакта:", e)
      message.error(e?.response?.data?.message || "Не удалось создать контакт")
    }
  }

  const replaceRow = (fresh) =>
    setData((prev) => prev.map((r) => (r.id === fresh.id ? fresh : r)))

  const removeRow = (id) => setData((prev) => prev.filter((r) => r.id !== id))

  const handleUpdate = async (id, values) => {
    const payload = { ...values, version: values?.version }
    try {
      const { data: fresh } = await axios.put(`/client-contacts/${id}`, payload)
      replaceRow(fresh)
      onChanged?.()
    } catch (e) {
      if (e?.response?.status === 409) {
        const current =
          e.response.data?.current ||
          e.response.data?.currentRecord ||
          e.currentRecord
        if (
          current &&
          isSameByFields(current, payload, [
            "name",
            "role",
            "email",
            "phone",
            "is_primary",
            "notes",
          ])
        ) {
          replaceRow(current)
          onChanged?.()
          message.success("Контакт обновлен")
          return
        }
        setConflict({
          id,
          current,
          draft: { id, ...payload },
        })
        return
      }
      console.error("Ошибка при обновлении контакта:", e)
      message.error("Не удалось обновить контакт")
    }
  }

  const handleDelete = async (record) => {
    try {
      await axios.delete(`/client-contacts/${record.id}`, {
        params: { version: record.version },
      })
      removeRow(record.id)
      onChanged?.()
    } catch (e) {
      if (e?.response?.status === 409) {
        const current =
          e.response.data?.current ||
          e.response.data?.currentRecord ||
          e.currentRecord
        setConflict({
          id: record.id,
          current,
          draft: record,
        })
        return
      }
      console.error("Ошибка при удалении контакта:", e)
      message.error("Не удалось удалить контакт")
    }
  }

  if (!clientId) return null

  return (
    <div className="parts-table-wrap">
      <Card size="small" className="table-section">
        <Row gutter={8} className="table-section">
          <Col span={6}>
            <Input
              size="small"
              placeholder="Имя контакта"
              value={newContact.name}
              onChange={(e) =>
                setNewContact((prev) => ({ ...prev, name: e.target.value }))
              }
            />
          </Col>

          <Col span={4}>
            <Input
              size="small"
              placeholder="Роль / должность"
              value={newContact.role}
              onChange={(e) =>
                setNewContact((prev) => ({ ...prev, role: e.target.value }))
              }
            />
          </Col>

          <Col span={4}>
            <Input
              size="small"
              placeholder="E-mail"
              value={newContact.email}
              onChange={(e) =>
                setNewContact((prev) => ({ ...prev, email: e.target.value }))
              }
            />
          </Col>

          <Col span={4}>
            <Input
              size="small"
              placeholder="Телефон"
              value={newContact.phone}
              onChange={(e) =>
                setNewContact((prev) => ({ ...prev, phone: e.target.value }))
              }
            />
          </Col>

          <Col span={6}>
            <Checkbox
              checked={newContact.is_primary}
              onChange={(e) =>
                setNewContact((prev) => ({
                  ...prev,
                  is_primary: e.target.checked,
                }))
              }
            >
              Основной контакт
            </Checkbox>
          </Col>
        </Row>

        <Row gutter={8} className="table-section">
          <Col span={18}>
            <Input
              size="small"
              placeholder="Примечание"
              value={newContact.notes}
              onChange={(e) =>
                setNewContact((prev) => ({ ...prev, notes: e.target.value }))
              }
            />
          </Col>
          <Col span={6} style={{ textAlign: "right" }}>
            <Button
              type="primary"
              size="small"
              onClick={handleAdd}
              disabled={!String(newContact.name ?? "").trim()}
            >
              Добавить контакт
            </Button>
          </Col>
        </Row>
      </Card>

      <ClientContactsTable
        data={data}
        loading={loading}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
      />

      <VersionConflictModal
        conflict={conflict}
        entityLabel="контакт"
        fields={[
          { key: "name", title: "Имя" },
          { key: "role", title: "Должность" },
          { key: "phone", title: "Телефон" },
          { key: "email", title: "E-mail" },
          { key: "is_primary", title: "Основной" },
          { key: "notes", title: "Комментарий" },
        ]}
        onCancel={() => setConflict(null)}
        onReload={async () => {
          setConflict(null)
          await fetchData()
        }}
      />
    </div>
  )
}

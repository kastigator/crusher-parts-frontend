// src/components/suppliers/SupplierContactsMain.jsx
import React, { useEffect, useState } from "react"
import { Card, Button, Input, Row, Col, Checkbox, message } from "antd"
import axios from "@/api/axiosInstance"

import TableToolbar from "@/components/common/TableToolbar"
import SupplierContactsTable from "./SupplierContactsTable"
import VersionConflictModal from "@/components/common/VersionConflictModal"

const trimOrNull = (v) => {
  if (v === undefined || v === null) return null
  const s = String(v).trim()
  return s === "" ? null : s
}

export default function SupplierContactsMain({ supplierId, onChanged }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [conflict, setConflict] = useState(null)

  const [newContact, setNewContact] = useState({
    name: "",
    role: "",
    email: "",
    phone: "",
    is_primary: false,
    notes: "",
  })

  const fetchData = async () => {
    if (!supplierId) return
    setLoading(true)
    try {
      const { data: list } = await axios.get("/part-suppliers/contacts", {
        params: { supplier_id: supplierId },
      })
      setData(Array.isArray(list) ? list : [])
    } catch (e) {
      console.error("Ошибка загрузки контактов поставщика:", e)
      message.error("Не удалось загрузить контакты поставщика")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!supplierId) return
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplierId])

  const handleAdd = async () => {
    if (!supplierId) return

    const payload = {
      supplier_id: supplierId,
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
      const { data: created } = await axios.post(
        "/part-suppliers/contacts",
        payload
      )
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
      console.error("Ошибка добавления контакта:", e)
      message.error(e?.response?.data?.message || "Не удалось добавить контакт")
    }
  }

  const replaceRow = (fresh) =>
    setData((prev) => prev.map((r) => (r.id === fresh.id ? fresh : r)))

  const removeRow = (id) =>
    setData((prev) => prev.filter((r) => r.id !== id))

  const handleUpdate = async (id, values) => {
    try {
      const { data: fresh } = await axios.put(
        `/part-suppliers/contacts/${id}`,
        values
      )
      replaceRow(fresh)
      onChanged?.()
    } catch (e) {
      if (e?.response?.status === 409) {
        const current = e.response.data?.currentRecord
        setConflict({
          id,
          current,
          draft: { id, ...values },
        })
        return
      }
      console.error("Ошибка обновления контакта:", e)
      message.error("Не удалось обновить контакт")
    }
  }

  const handleDelete = async (record) => {
    try {
      await axios.delete(`/part-suppliers/contacts/${record.id}`, {
        params: { version: record.version },
      })
      removeRow(record.id)
      onChanged?.()
    } catch (e) {
      if (e?.response?.status === 409) {
        const current = e.response.data?.currentRecord
        setConflict({
          id: record.id,
          current,
          draft: record,
        })
        return
      }
      console.error("Ошибка удаления контакта:", e)
      message.error("Не удалось удалить контакт")
    }
  }

  const filtered = data.filter((r) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return (
      String(r.name || "").toLowerCase().includes(q) ||
      String(r.role || "").toLowerCase().includes(q) ||
      String(r.email || "").toLowerCase().includes(q) ||
      String(r.phone || "").toLowerCase().includes(q)
    )
  })

  if (!supplierId) {
    return (
      <Card size="small">
        Выберите поставщика, чтобы видеть его контакты.
      </Card>
    )
  }

  return (
    <>
      <Card size="small" style={{ marginBottom: 12 }}>
        <Row gutter={8} style={{ marginBottom: 8 }}>
          <Col span={6}>
            <Input
              size="small"
              placeholder="Имя контакта"
              value={newContact.name}
              onChange={(e) =>
                setNewContact((prev) => ({
                  ...prev,
                  name: e.target.value,
                }))
              }
            />
          </Col>
          <Col span={4}>
            <Input
              size="small"
              placeholder="Роль / должность"
              value={newContact.role}
              onChange={(e) =>
                setNewContact((prev) => ({
                  ...prev,
                  role: e.target.value,
                }))
              }
            />
          </Col>
          <Col span={4}>
            <Input
              size="small"
              placeholder="Email"
              value={newContact.email}
              onChange={(e) =>
                setNewContact((prev) => ({
                  ...prev,
                  email: e.target.value,
                }))
              }
            />
          </Col>
          <Col span={4}>
            <Input
              size="small"
              placeholder="Телефон"
              value={newContact.phone}
              onChange={(e) =>
                setNewContact((prev) => ({
                  ...prev,
                  phone: e.target.value,
                }))
              }
            />
          </Col>
          <Col span={4}>
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
          <Col span={10} style={{ marginTop: 8 }}>
            <Input
              size="small"
              placeholder="Примечание"
              value={newContact.notes}
              onChange={(e) =>
                setNewContact((prev) => ({
                  ...prev,
                  notes: e.target.value,
                }))
              }
            />
          </Col>
        </Row>

        <Button
          type="primary"
          size="small"
          onClick={handleAdd}
          disabled={!newContact.name.trim()}
        >
          Добавить контакт
        </Button>
      </Card>

      <Card size="small">
        <TableToolbar
          search={search}
          onSearch={setSearch}
          placeholder="Поиск по контактам поставщика..."
        />
        <SupplierContactsTable
          data={filtered}
          loading={loading}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      </Card>

      <VersionConflictModal
        conflict={conflict}
        onCancel={() => setConflict(null)}
        onReload={async () => {
          setConflict(null)
          await fetchData()
        }}
      />
    </>
  )
}

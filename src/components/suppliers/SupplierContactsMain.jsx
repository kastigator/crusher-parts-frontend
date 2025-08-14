import React, { useEffect, useState } from "react"
import { Card, Button, Input, Row, Col, Checkbox, message } from "antd"
import axios from "@/api/axiosInstance"
import SupplierContactsTable from "./SupplierContactsTable"
import TableToolbar from "@/components/common/TableToolbar"

export default function SupplierContactsMain({ supplierId, onChanged }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")

  const [newContact, setNewContact] = useState({
    name: "",
    role: "",
    email: "",
    phone: "",
    is_primary: false,
    notes: ""
  })

  const fetchData = async () => {
    if (!supplierId) return
    setLoading(true)
    try {
      const res = await axios.get("/supplier-contacts", { params: { supplier_id: supplierId } })
      setData(Array.isArray(res.data) ? res.data : [])
    } catch (e) {
      console.error("Ошибка загрузки контактов:", e)
      message.error("Не удалось загрузить контакты")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplierId])

  const handleAdd = async () => {
    if (!supplierId) return
    const payload = {
      supplier_id: supplierId,
      name: newContact.name?.trim(),
      role: newContact.role?.trim() || null,
      email: newContact.email?.trim() || null,
      phone: newContact.phone?.trim() || null,
      is_primary: newContact.is_primary ? 1 : 0,
      notes: newContact.notes?.trim() || null
    }
    if (!payload.name) {
      message.warning("Имя контакта обязательно")
      return
    }

    try {
      const { data: created } = await axios.post("/supplier-contacts", payload)
      setData(prev => [created, ...prev])
      setNewContact({ name: "", role: "", email: "", phone: "", is_primary: false, notes: "" })
      message.success("Контакт добавлен")
      onChanged?.()
    } catch (e) {
      console.error("Ошибка добавления контакта:", e)
      message.error("Не удалось добавить контакт")
    }
  }

  const filtered = search
    ? data.filter(c =>
        [c.name, c.role, c.email, c.phone, c.notes]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase())
      )
    : data

  if (!supplierId) return null

  return (
    <>
      <Card size="small" style={{ marginBottom: 12 }}>
        <Row gutter={12}>
          <Col span={6}>
            <Input
              placeholder="Имя*"
              value={newContact.name}
              onChange={(e) => setNewContact(p => ({ ...p, name: e.target.value }))}
              onPressEnter={handleAdd}
            />
          </Col>
          <Col span={5}>
            <Input
              placeholder="Роль"
              value={newContact.role}
              onChange={(e) => setNewContact(p => ({ ...p, role: e.target.value }))}
              onPressEnter={handleAdd}
            />
          </Col>
          <Col span={5}>
            <Input
              placeholder="Email"
              value={newContact.email}
              onChange={(e) => setNewContact(p => ({ ...p, email: e.target.value }))}
              onPressEnter={handleAdd}
              type="email"
            />
          </Col>
          <Col span={4}>
            <Input
              placeholder="Телефон"
              value={newContact.phone}
              onChange={(e) => setNewContact(p => ({ ...p, phone: e.target.value }))}
              onPressEnter={handleAdd}
            />
          </Col>
          <Col span={4} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Checkbox
              checked={newContact.is_primary}
              onChange={(e) => setNewContact(p => ({ ...p, is_primary: e.target.checked }))}
            >
              Основной
            </Checkbox>
            <Button type="primary" onClick={handleAdd}>Добавить</Button>
          </Col>
        </Row>

        <Row style={{ marginTop: 8 }}>
          <Col span={24}>
            <Input.TextArea
              placeholder="Заметки"
              autoSize={{ minRows: 1, maxRows: 4 }}
              value={newContact.notes}
              onChange={(e) => setNewContact(p => ({ ...p, notes: e.target.value }))}
              onPressEnter={handleAdd}
            />
          </Col>
        </Row>
      </Card>

      <TableToolbar filterValue={search} onFilterChange={setSearch} />

      <SupplierContactsTable
        data={filtered}
        loading={loading}
        supplierId={supplierId}
        setData={setData}
        onChanged={onChanged}
      />
    </>
  )
}

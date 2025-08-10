import React, { useState, useEffect } from "react"
import { Card, Button, message, Input, Row, Col } from "antd"
import axios from "@/api/axiosInstance"
import PlaceAddressInput from "@/components/inputs/PlaceAddressInput"
import BillingAddressesTable from "./BillingAddressesTable"
import TableToolbar from "@/components/common/TableToolbar"

export default function BillingAddressesMain({ clientId, onChanged }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [resetCounter, setResetCounter] = useState(0)
  const [search, setSearch] = useState("")

  const [newAddress, setNewAddress] = useState({
    formatted_address: "",
    place_id: null,
    lat: null,
    lng: null,
    postal_code: "",
    country: "",
    region: "",
    city: "",
    street: "",
    house: "",
    building: "",
    entrance: "",
    comment: ""
  })

  const fetchData = async () => {
    if (!clientId) return
    setLoading(true)
    try {
      const res = await axios.get("/client-billing-addresses", {
        params: { client_id: clientId }
      })
      setData(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      console.error("Ошибка при загрузке адресов:", err)
      message.error("Не удалось загрузить адреса")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId])

  const handleAdd = async () => {
    if (!newAddress.formatted_address?.trim()) {
      message.warning("Поле адреса обязательно")
      return
    }

    const payload = {
      client_id: clientId,
      formatted_address: newAddress.formatted_address.trim(),
      place_id: newAddress.place_id || null,
      lat: newAddress.lat ?? null,
      lng: newAddress.lng ?? null,
      postal_code: newAddress.postal_code || null,
      country: newAddress.country || null,
      region: newAddress.region || null,
      city: newAddress.city || null,
      street: newAddress.street || null,
      house: newAddress.house || null,
      building: newAddress.building || null,
      entrance: newAddress.entrance || null,
      comment: newAddress.comment?.trim() || null
    }

    try {
      const res = await axios.post("/client-billing-addresses", payload)
      // мгновенно добавляем в таблицу
      setData(prev => [res.data, ...prev])

      // сброс формы
      setNewAddress({
        formatted_address: "",
        place_id: null,
        lat: null,
        lng: null,
        postal_code: "",
        country: "",
        region: "",
        city: "",
        street: "",
        house: "",
        building: "",
        entrance: "",
        comment: ""
      })
      setResetCounter(prev => prev + 1)
      message.success("Адрес добавлен")

      onChanged?.() // оповещаем родителя (для глобального слежения, если нужно)
    } catch (err) {
      console.error("Ошибка при добавлении адреса:", err)
      message.error("Не удалось добавить адрес")
    }
  }

  const filteredData = search
    ? data.filter(addr =>
        (addr.formatted_address || "")
          .toLowerCase()
          .includes(search.toLowerCase())
      )
    : data

  if (!clientId) return null

  return (
    <>
      <Card size="small">
        <PlaceAddressInput
          debugId="billing-main-form"
          resetTrigger={resetCounter}
          value={{
            address_line: newAddress.formatted_address,
            lat: newAddress.lat,
            lng: newAddress.lng,
            place_id: newAddress.place_id,
            postal_code: newAddress.postal_code
          }}
          onChange={(value) =>
            setNewAddress((prev) => ({
              ...prev,
              formatted_address: value.address_line,
              place_id: value.place_id,
              lat: value.lat,
              lng: value.lng,
              postal_code: value.postal_code,
              country: value.country,
              region: value.region,
              city: value.city,
              street: value.street,
              house: value.house,
              building: value.building,
              entrance: value.entrance
            }))
          }
        />

        {/* Поля адреса */}
        <Row gutter={12} style={{ marginTop: 8 }}>
          <Col span={6}><Input placeholder="Страна" value={newAddress.country} onChange={(e) => setNewAddress(prev => ({ ...prev, country: e.target.value }))} /></Col>
          <Col span={6}><Input placeholder="Регион" value={newAddress.region} onChange={(e) => setNewAddress(prev => ({ ...prev, region: e.target.value }))} /></Col>
          <Col span={6}><Input placeholder="Город" value={newAddress.city} onChange={(e) => setNewAddress(prev => ({ ...prev, city: e.target.value }))} /></Col>
          <Col span={6}><Input placeholder="Индекс" value={newAddress.postal_code} onChange={(e) => setNewAddress(prev => ({ ...prev, postal_code: e.target.value }))} /></Col>
        </Row>

        <Row gutter={12} style={{ marginTop: 8 }}>
          <Col span={12}><Input placeholder="Улица" value={newAddress.street} onChange={(e) => setNewAddress(prev => ({ ...prev, street: e.target.value }))} /></Col>
          <Col span={4}><Input placeholder="Дом" value={newAddress.house} onChange={(e) => setNewAddress(prev => ({ ...prev, house: e.target.value }))} /></Col>
          <Col span={4}><Input placeholder="Строение" value={newAddress.building} onChange={(e) => setNewAddress(prev => ({ ...prev, building: e.target.value }))} /></Col>
          <Col span={4}><Input placeholder="Подъезд" value={newAddress.entrance} onChange={(e) => setNewAddress(prev => ({ ...prev, entrance: e.target.value }))} /></Col>
        </Row>

        <Row gutter={12} style={{ marginTop: 8 }}>
          <Col flex="auto">
            <Input
              placeholder="Комментарий"
              value={newAddress.comment}
              onChange={(e) => setNewAddress(prev => ({ ...prev, comment: e.target.value }))}
            />
          </Col>
          <Col><Button type="primary" onClick={handleAdd}>Добавить адрес</Button></Col>
        </Row>
      </Card>

      <TableToolbar filterValue={search} onFilterChange={setSearch} />

      <BillingAddressesTable
        data={filteredData}
        loading={loading}
        clientId={clientId}
        setData={setData}
        onChanged={onChanged}
      />
    </>
  )
}

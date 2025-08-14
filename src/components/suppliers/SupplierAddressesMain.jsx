import React, { useState, useEffect } from "react"
import { Card, Button, message, Input, Row, Col, Checkbox } from "antd"
import axios from "@/api/axiosInstance"
import PlaceAddressInput from "@/components/inputs/PlaceAddressInput"
import SupplierAddressesTable from "./SupplierAddressesTable"
import TableToolbar from "@/components/common/TableToolbar"

export default function SupplierAddressesMain({ supplierId, onChanged }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [resetCounter, setResetCounter] = useState(0)
  const [search, setSearch] = useState("")

  const [newAddress, setNewAddress] = useState({
    // общие поля адреса
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
    comment: "",
    // специфичное для поставщиков
    label: "",
    type: "",
    is_primary: false,
  })

  const fetchData = async () => {
    if (!supplierId) return
    setLoading(true)
    try {
      const res = await axios.get("/supplier-addresses", {
        params: { supplier_id: supplierId }
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
  }, [supplierId])

  const handleAdd = async () => {
    if (!supplierId) return
    if (!newAddress.formatted_address?.trim()) {
      message.warning("Поле адреса обязательно")
      return
    }

    const payload = {
      supplier_id: supplierId,
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
      comment: newAddress.comment?.trim() || null,
      // специфично
      label: newAddress.label?.trim() || null,
      type: newAddress.type?.trim() || null,
      is_primary: newAddress.is_primary ? 1 : 0,
    }

    try {
      const res = await axios.post("/supplier-addresses", payload)
      // мгновенно в таблицу
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
        comment: "",
        label: "",
        type: "",
        is_primary: false,
      })
      setResetCounter(prev => prev + 1)
      message.success("Адрес добавлен")
      onChanged?.()
    } catch (err) {
      console.error("Ошибка при добавлении адреса:", err)
      message.error("Не удалось добавить адрес")
    }
  }

  const filteredData = search
    ? data.filter(addr =>
        [
          addr.formatted_address,
          addr.label,
          addr.city,
          addr.street,
          addr.postal_code,
          addr.country,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase())
      )
    : data

  if (!supplierId) return null

  return (
    <>
      <Card size="small">
        <PlaceAddressInput
          debugId="supplier-addresses-main-form"
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

        {/* Специфичные для поставщиков поля */}
        <Row gutter={12} style={{ marginTop: 8 }}>
          <Col span={8}>
            <Input
              placeholder="Метка (label)"
              value={newAddress.label}
              onChange={(e) => setNewAddress(prev => ({ ...prev, label: e.target.value }))}
            />
          </Col>
          <Col span={8}>
            <Input
              placeholder="Тип (напр., warehouse/billing)"
              value={newAddress.type}
              onChange={(e) => setNewAddress(prev => ({ ...prev, type: e.target.value }))}
            />
          </Col>
          <Col span={8} style={{ display: "flex", alignItems: "center" }}>
            <Checkbox
              checked={newAddress.is_primary}
              onChange={(e) => setNewAddress(prev => ({ ...prev, is_primary: e.target.checked }))}
            >
              Основной адрес
            </Checkbox>
          </Col>
        </Row>

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
          <Col>
            <Button type="primary" onClick={handleAdd}>Добавить адрес</Button>
          </Col>
        </Row>
      </Card>

      {/* ✅ TableToolbar с корректными пропсами */}
      <TableToolbar search={search} onSearch={setSearch} />

      <SupplierAddressesTable
        data={filteredData}
        loading={loading}
        supplierId={supplierId}
        setData={setData}
        onChanged={onChanged}
      />
    </>
  )
}

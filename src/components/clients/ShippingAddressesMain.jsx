import React, { useEffect, useState } from "react"
import { Card, Button, message, Input, Row, Col } from "antd"
import axios from "@/api/axiosInstance"
import PlaceAddressInput from "@/components/inputs/PlaceAddressInput"
import ShippingAddressesTable from "./ShippingAddressesTable"
import TableToolbar from "@/components/common/TableToolbar"
import VersionConflictModal from "@/components/common/VersionConflictModal"

export default function ShippingAddressesMain({ clientId, onChanged }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [resetCounter, setResetCounter] = useState(0)
  const [search, setSearch] = useState("")
  const [conflict, setConflict] = useState(null)

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
    comment: "",
    type: null,
    is_precise_location: null,
  })

  const fetchData = async () => {
    if (!clientId) return
    setLoading(true)
    try {
      const res = await axios.get("/client-shipping-addresses", {
        params: { client_id: clientId },
      })
      setData(Array.isArray(res.data) ? res.data : [])
    } catch (e) {
      console.error(e)
      message.error("Не удалось загрузить адреса доставки")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [clientId])

  const handleAdd = async () => {
    if (!newAddress.formatted_address?.trim()) {
      return message.warning("Поле адреса обязательно")
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
      comment: newAddress.comment?.trim() || null,
      type: null,
      is_precise_location: newAddress.is_precise_location ?? null,
    }
    try {
      const { data: created } = await axios.post("/client-shipping-addresses", payload)
      setData((prev) => [created, ...prev])
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
        type: null,
        is_precise_location: null,
      })
      setResetCounter((v) => v + 1)
      message.success("Адрес доставки добавлен")
      onChanged?.()
    } catch (e) {
      console.error(e)
      message.error("Не удалось добавить адрес")
    }
  }

  const handleUpdate = async (id, values) => {
    try {
      const { data: fresh } = await axios.put(`/client-shipping-addresses/${id}`, {
        ...values,
        type: values.type ?? null,
        is_precise_location: values.is_precise_location ?? null,
      })
      setData((prev) => prev.map((r) => (r.id === id ? fresh : r)))
      message.success("Адрес доставки обновлён")
      onChanged?.()
    } catch (err) {
      if (err?.response?.status === 409 && err.response.data?.current) {
        setConflict({ id, current: err.response.data.current, draft: values })
      } else {
        console.error(err)
        message.error("Не удалось сохранить адрес")
      }
    }
  }

  const handleDelete = async (record) => {
    try {
      await axios.delete(`/client-shipping-addresses/${record.id}`, {
        params: { version: record.version },
      })
      setData((prev) => prev.filter((r) => r.id !== record.id))
      message.success("Адрес доставки удалён")
      onChanged?.()
    } catch (err) {
      if (err?.response?.status === 409 && err.response.data?.current) {
        setConflict({ id: record.id, current: err.response.data.current, draft: record })
      } else {
        console.error(err)
        message.error("Не удалось удалить адрес")
      }
    }
  }

  const filteredData = search
    ? data.filter((a) => a.formatted_address?.toLowerCase().includes(search.toLowerCase()))
    : data

  if (!clientId) return null

  return (
    <div className="parts-table-wrap">
      <Card size="small" className="table-section">
        <PlaceAddressInput
          debugId="shipping-form"
          resetTrigger={resetCounter}
          value={{
            address_line: newAddress.formatted_address,
            lat: newAddress.lat,
            lng: newAddress.lng,
            place_id: newAddress.place_id,
            postal_code: newAddress.postal_code,
          }}
          onChange={(v) =>
            setNewAddress((p) => ({
              ...p,
              formatted_address: v.address_line,
              place_id: v.place_id,
              lat: v.lat,
              lng: v.lng,
              postal_code: v.postal_code,
              country: v.country,
              region: v.region,
              city: v.city,
              street: v.street,
              house: v.house,
              building: v.building,
              entrance: v.entrance,
              is_precise_location: v.is_precise_location ?? null,
            }))
          }
        />

        {/* поля ввода — синхронно с billing */}
        <Row gutter={12} className="table-section">
          <Col span={6}><Input placeholder="Страна" value={newAddress.country}
            onChange={(e) => setNewAddress((p) => ({ ...p, country: e.target.value }))} /></Col>
          <Col span={6}><Input placeholder="Регион" value={newAddress.region}
            onChange={(e) => setNewAddress((p) => ({ ...p, region: e.target.value }))} /></Col>
          <Col span={6}><Input placeholder="Город" value={newAddress.city}
            onChange={(e) => setNewAddress((p) => ({ ...p, city: e.target.value }))} /></Col>
          <Col span={6}><Input placeholder="Индекс" value={newAddress.postal_code}
            onChange={(e) => setNewAddress((p) => ({ ...p, postal_code: e.target.value }))} /></Col>
        </Row>

        <Row gutter={12} className="table-section">
          <Col span={12}><Input placeholder="Улица" value={newAddress.street}
            onChange={(e) => setNewAddress((p) => ({ ...p, street: e.target.value }))} /></Col>
          <Col span={4}><Input placeholder="Дом" value={newAddress.house}
            onChange={(e) => setNewAddress((p) => ({ ...p, house: e.target.value }))} /></Col>
          <Col span={4}><Input placeholder="Строение" value={newAddress.building}
            onChange={(e) => setNewAddress((p) => ({ ...p, building: e.target.value }))} /></Col>
          <Col span={4}><Input placeholder="Подъезд" value={newAddress.entrance}
            onChange={(e) => setNewAddress((p) => ({ ...p, entrance: e.target.value }))} /></Col>
        </Row>

        <Row gutter={12} className="table-section">
          <Col flex="auto"><Input placeholder="Комментарий" value={newAddress.comment}
            onChange={(e) => setNewAddress((p) => ({ ...p, comment: e.target.value }))} /></Col>
          <Col><Button type="primary" onClick={handleAdd}>Добавить адрес</Button></Col>
        </Row>
      </Card>

      <TableToolbar className="table-section" search={search} onSearch={setSearch} />

      <ShippingAddressesTable
        data={filteredData}
        loading={loading}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
      />

      {conflict && (
        <VersionConflictModal
          open={!!conflict}
          draft={conflict.draft}
          current={conflict.current}
          fields={[
            { key: "formatted_address", title: "Адрес" },
            { key: "country", title: "Страна" },
            { key: "region", title: "Регион" },
            { key: "city", title: "Город" },
            { key: "street", title: "Улица" },
            { key: "house", title: "Дом" },
            { key: "building", title: "Строение" },
            { key: "entrance", title: "Подъезд" },
            { key: "postal_code", title: "Индекс" },
            { key: "comment", title: "Комментарий" },
          ]}
          onReload={async () => { await fetchData(); setConflict(null); }}
          onManualMerge={async () => {
            const base = conflict.current || {}
            const draft = conflict.draft || {}
            const merged = {
              ...base,
              formatted_address: draft.formatted_address ?? base.formatted_address,
              country: draft.country ?? base.country,
              region:  draft.region  ?? base.region,
              city:    draft.city    ?? base.city,
              street:  draft.street  ?? base.street,
              house:   draft.house   ?? base.house,
              building:draft.building?? base.building,
              entrance:draft.entrance?? base.entrance,
              postal_code: draft.postal_code ?? base.postal_code,
              comment: draft.comment ?? base.comment,
              type: draft.type ?? base.type ?? null,
              is_precise_location: draft.is_precise_location ?? base.is_precise_location ?? null,
              version: base.version,
            }
            await handleUpdate(conflict.id, merged)
            setConflict(null)
          }}
          onCancel={() => setConflict(null)}
        />
      )}
    </div>
  )
}

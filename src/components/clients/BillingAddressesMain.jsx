// src/components/clients/BillingAddressesMain.jsx
import React, { useEffect, useState } from "react"
import { Card, Button, message, Input, Row, Col } from "antd"
import axios from "@/api/axiosInstance"
import PlaceAddressInput from "@/components/inputs/PlaceAddressInput"
import BillingAddressesTable from "./BillingAddressesTable"
import TableToolbar from "@/components/common/TableToolbar"
import VersionConflictModal from "@/components/common/VersionConflictModal"

export default function BillingAddressesMain({ clientId, onChanged }) {
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
  })

  const fetchData = async () => {
    if (!clientId) return
    setLoading(true)
    try {
      const res = await axios.get("/client-billing-addresses", { params: { client_id: clientId } })
      setData(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      console.error("Ошибка при загрузке адресов:", err)
      message.error("Не удалось загрузить адреса")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!clientId) return
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId])

  const handleAdd = async () => {
    if (!clientId) return
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
      comment: newAddress.comment?.trim() || null,
    }

    try {
      const res = await axios.post("/client-billing-addresses", payload)
      setData((prev) => [res.data, ...prev])
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
      })
      setResetCounter((prev) => prev + 1)
      message.success("Адрес добавлен")
      onChanged?.()
    } catch (err) {
      console.error("Ошибка при добавлении адреса:", err)
      message.error("Не удалось добавить адрес")
    }
  }

  // --- optimistic update/delete ---
  const replaceRow = (fresh) => setData((prev) => prev.map((r) => (r.id === fresh.id ? fresh : r)))
  const removeRow = (id) => setData((prev) => prev.filter((r) => r.id !== id))

  const onUpdate = async (id, row) => {
    try {
      const { data: fresh } = await axios.put(`/client-billing-addresses/${id}`, {
        ...row,
        version: row.version,
      })
      replaceRow(fresh)
      message.success("Изменения сохранены")
      onChanged?.()
    } catch (err) {
      if (err?.response?.status === 409 && err?.response?.data?.current) {
        setConflict({ id, current: err.response.data.current, draft: row })
        return
      }
      console.error("Ошибка при обновлении адреса:", err)
      message.error("Не удалось сохранить адрес")
    }
  }

  const onDelete = async (record) => {
    try {
      await axios.delete(`/client-billing-addresses/${record.id}`, {
        params: { version: record.version },
      })
      removeRow(record.id)
      message.success("Адрес удалён")
      onChanged?.()
    } catch (err) {
      if (err?.response?.status === 409 && err?.response?.data?.current) {
        const current = err.response.data.current
        if (current) replaceRow(current)
        setConflict({ id: record.id, current, draft: record })
        return
      }
      console.error("Ошибка при удалении адреса:", err)
      message.error("Не удалось удалить адрес")
    }
  }
  // ---

  const filteredData = search
    ? data.filter((addr) => (addr.formatted_address || "").toLowerCase().includes(search.toLowerCase()))
    : data

  if (!clientId) return null

  return (
    // якорь для выпадающих (поля адреса, подсказки и т.п.)
    <div className="parts-table-wrap">
      <Card size="small" className="table-section">
        <PlaceAddressInput
          debugId="billing-main-form"
          resetTrigger={resetCounter}
          value={{
            address_line: newAddress.formatted_address,
            lat: newAddress.lat,
            lng: newAddress.lng,
            place_id: newAddress.place_id,
            postal_code: newAddress.postal_code,
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
              entrance: value.entrance,
            }))
          }
        />

        {/* поля ввода */}
        <Row gutter={12} className="table-section">
          <Col span={6}>
            <Input
              placeholder="Страна"
              value={newAddress.country}
              onChange={(e) => setNewAddress((prev) => ({ ...prev, country: e.target.value }))}
            />
          </Col>
          <Col span={6}>
            <Input
              placeholder="Регион"
              value={newAddress.region}
              onChange={(e) => setNewAddress((prev) => ({ ...prev, region: e.target.value }))}
            />
          </Col>
          <Col span={6}>
            <Input
              placeholder="Город"
              value={newAddress.city}
              onChange={(e) => setNewAddress((prev) => ({ ...prev, city: e.target.value }))}
            />
          </Col>
          <Col span={6}>
            <Input
              placeholder="Индекс"
              value={newAddress.postal_code}
              onChange={(e) => setNewAddress((prev) => ({ ...prev, postal_code: e.target.value }))}
            />
          </Col>
        </Row>

        <Row gutter={12} className="table-section">
          <Col span={12}>
            <Input
              placeholder="Улица"
              value={newAddress.street}
              onChange={(e) => setNewAddress((prev) => ({ ...prev, street: e.target.value }))}
            />
          </Col>
          <Col span={4}>
            <Input
              placeholder="Дом"
              value={newAddress.house}
              onChange={(e) => setNewAddress((prev) => ({ ...prev, house: e.target.value }))}
            />
          </Col>
          <Col span={4}>
            <Input
              placeholder="Строение"
              value={newAddress.building}
              onChange={(e) => setNewAddress((prev) => ({ ...prev, building: e.target.value }))}
            />
          </Col>
          <Col span={4}>
            <Input
              placeholder="Подъезд"
              value={newAddress.entrance}
              onChange={(e) => setNewAddress((prev) => ({ ...prev, entrance: e.target.value }))}
            />
          </Col>
        </Row>

        <Row gutter={12} className="table-section">
          <Col flex="auto">
            <Input
              placeholder="Комментарий"
              value={newAddress.comment}
              onChange={(e) => setNewAddress((prev) => ({ ...prev, comment: e.target.value }))}
            />
          </Col>
          <Col>
            <Button type="primary" onClick={handleAdd}>
              Добавить адрес
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Единый тулбар фильтра */}
      <TableToolbar className="table-section" search={search} onSearch={setSearch} />

      <BillingAddressesTable
        data={filteredData}
        loading={loading}
        clientId={clientId}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onReplaceRow={replaceRow}
        onRefresh={fetchData}
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
          onReload={async () => {
            await fetchData()
            setConflict(null)
          }}
          onManualMerge={async () => {
            const base = conflict.current || {}
            const draft = conflict.draft || {}
            const merged = {
              ...base,
              formatted_address: draft.formatted_address ?? base.formatted_address,
              country: draft.country ?? base.country,
              region: draft.region ?? base.region,
              city: draft.city ?? base.city,
              street: draft.street ?? base.street,
              house: draft.house ?? base.house,
              building: draft.building ?? base.building,
              entrance: draft.entrance ?? base.entrance,
              postal_code: draft.postal_code ?? base.postal_code,
              comment: draft.comment ?? base.comment,
              version: base.version,
            }
            await onUpdate(conflict.id, merged)
            setConflict(null)
          }}
          onCancel={() => setConflict(null)}
        />
      )}
    </div>
  )
}

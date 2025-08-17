// src/components/suppliers/SupplierAddressesMain.jsx
import React, { useEffect, useState } from "react"
import { Card, Button, message, Input, Row, Col } from "antd"
import axios from "@/api/axiosInstance"
import PlaceAddressInput from "@/components/inputs/PlaceAddressInput"
import SupplierAddressesTable from "./SupplierAddressesTable"
import TableToolbar from "@/components/common/TableToolbar"
import VersionConflictModal from "@/components/common/VersionConflictModal"

export default function SupplierAddressesMain({ supplierId, onChanged }) {
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
    label: "",
    type: "",
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
  }, [supplierId])

  const trimOrNull = (v) =>
    typeof v === "string" ? (v.trim() || null) : (v ?? null)

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
      postal_code: trimOrNull(newAddress.postal_code),
      country: trimOrNull(newAddress.country),
      region: trimOrNull(newAddress.region),
      city: trimOrNull(newAddress.city),
      street: trimOrNull(newAddress.street),
      house: trimOrNull(newAddress.house),
      building: trimOrNull(newAddress.building),
      entrance: trimOrNull(newAddress.entrance),
      comment: trimOrNull(newAddress.comment),
      label: trimOrNull(newAddress.label),
      type: trimOrNull(newAddress.type),
    }

    try {
      const res = await axios.post("/supplier-addresses", payload)
      setData((prev) => [res.data, ...prev])

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
      })
      setResetCounter((prev) => prev + 1)
      message.success("Адрес добавлен")
      onChanged?.()
    } catch (err) {
      console.error("Ошибка при добавлении адреса:", err)
      message.error("Не удалось добавить адрес")
    }
  }

  // локальные апдейтеры для оптимистичного обновления списка
  const replaceRow = (fresh) =>
    setData((prev) => prev.map((r) => (r.id === fresh.id ? fresh : r)))
  const removeRow = (id) =>
    setData((prev) => prev.filter((r) => r.id !== id))

  // ==== Update / Delete для таблицы ====
  const handleUpdate = async (id, values) => {
    try {
      const { data: fresh } = await axios.put(`/supplier-addresses/${id}`, values)
      replaceRow(fresh)
      message.success("Адрес обновлён")
      onChanged?.()
    } catch (err) {
      if (err?.response?.status === 409 && err.response.data?.current) {
        setConflict({
          entityLabel: "Адрес поставщика",
          current: err.response.data.current,
          draft: { id, ...values },
          id
        })
      } else {
        console.error("Ошибка при обновлении адреса:", err)
        message.error("Не удалось сохранить адрес")
      }
    }
  }

  const handleDelete = async (record) => {
    try {
      await axios.delete(`/supplier-addresses/${record.id}`, {
        params: { version: record.version }
      })
      removeRow(record.id)
      message.success("Адрес удалён")
      onChanged?.()
    } catch (err) {
      if (err?.response?.status === 409 && err.response.data?.current) {
        setConflict({
          entityLabel: "Адрес поставщика",
          current: err.response.data.current,
          draft: record,
          id: record.id
        })
      } else {
        console.error("Ошибка при удалении адреса:", err)
        message.error("Не удалось удалить адрес")
      }
    }
  }

  const filteredData = search
    ? data.filter((addr) =>
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
              onChange={(e) => setNewAddress((prev) => ({ ...prev, label: e.target.value }))}
              allowClear
            />
          </Col>
          <Col span={8}>
            <Input
              placeholder="Тип (напр., warehouse/billing)"
              value={newAddress.type}
              onChange={(e) => setNewAddress((prev) => ({ ...prev, type: e.target.value }))}
              allowClear
            />
          </Col>
        </Row>

        {/* Поля адреса */}
        <Row gutter={12} style={{ marginTop: 8 }}>
          <Col span={6}>
            <Input
              placeholder="Страна"
              value={newAddress.country}
              onChange={(e) => setNewAddress((prev) => ({ ...prev, country: e.target.value }))}
              allowClear
            />
          </Col>
          <Col span={6}>
            <Input
              placeholder="Регион"
              value={newAddress.region}
              onChange={(e) => setNewAddress((prev) => ({ ...prev, region: e.target.value }))}
              allowClear
            />
          </Col>
          <Col span={6}>
            <Input
              placeholder="Город"
              value={newAddress.city}
              onChange={(e) => setNewAddress((prev) => ({ ...prev, city: e.target.value }))}
              allowClear
            />
          </Col>
          <Col span={6}>
            <Input
              placeholder="Индекс"
              value={newAddress.postal_code}
              onChange={(e) => setNewAddress((prev) => ({ ...prev, postal_code: e.target.value }))}
              allowClear
            />
          </Col>
        </Row>

        <Row gutter={12} style={{ marginTop: 8 }}>
          <Col span={12}>
            <Input
              placeholder="Улица"
              value={newAddress.street}
              onChange={(e) => setNewAddress((prev) => ({ ...prev, street: e.target.value }))}
              allowClear
            />
          </Col>
          <Col span={4}>
            <Input
              placeholder="Дом"
              value={newAddress.house}
              onChange={(e) => setNewAddress((prev) => ({ ...prev, house: e.target.value }))}
              allowClear
            />
          </Col>
          <Col span={4}>
            <Input
              placeholder="Строение"
              value={newAddress.building}
              onChange={(e) => setNewAddress((prev) => ({ ...prev, building: e.target.value }))}
              allowClear
            />
          </Col>
          <Col span={4}>
            <Input
              placeholder="Подъезд"
              value={newAddress.entrance}
              onChange={(e) => setNewAddress((prev) => ({ ...prev, entrance: e.target.value }))}
              allowClear
            />
          </Col>
        </Row>

        <Row gutter={12} style={{ marginTop: 8 }}>
          <Col flex="auto">
            <Input
              placeholder="Комментарий"
              value={newAddress.comment}
              onChange={(e) => setNewAddress((prev) => ({ ...prev, comment: e.target.value }))}
              allowClear
            />
          </Col>
          <Col>
            <Button type="primary" onClick={handleAdd}>Добавить адрес</Button>
          </Col>
        </Row>
      </Card>

      <TableToolbar search={search} onSearch={setSearch} />

      <SupplierAddressesTable
        data={filteredData}
        loading={loading}
        supplierId={supplierId}
        // новый паттерн взаимодействия:
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onReplaceRow={replaceRow}
        onRefresh={fetchData}
      />

      {/* модалка конфликта версий */}
      {conflict && (
        <VersionConflictModal
          open={!!conflict}
          entityLabel={conflict.entityLabel || "Адрес"}
          current={conflict.current}
          draft={conflict.draft}
          fields={[
            { key: "formatted_address", title: "Адрес" },
            { key: "label", title: "Метка" },
            { key: "type", title: "Тип" },
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
          onResolve={async (choice) => {
            if (choice === "overwrite" && conflict?.current && conflict?.draft) {
              await handleUpdate(conflict.id, {
                ...conflict.draft,
                version: conflict.current.version
              })
            }
            setConflict(null)
          }}
          onReload={async () => {
            if (conflict?.current) replaceRow(conflict.current)
            await fetchData()
            setConflict(null)
          }}
          onCancel={() => setConflict(null)}
        />
      )}
    </>
  )
}

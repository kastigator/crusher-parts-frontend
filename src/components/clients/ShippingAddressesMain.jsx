// src/components/clients/ShippingAddressesMain.jsx
import React, { useEffect, useState } from "react"
import { Card, Button, message, Input, Row, Col } from "antd"
import axios from "@/api/axiosInstance"

import ShippingAddressesTable from "./ShippingAddressesTable"
import VersionConflictModal from "@/components/common/VersionConflictModal"
import PlaceAddressInput from "@/components/inputs/PlaceAddressInput"
import { isSameByFields, mergeConflictDraft } from "@/utils/versionConflict"

export default function ShippingAddressesMain({ clientId, onChanged }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)

  const [resetCounter, setResetCounter] = useState(0)
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

  // ---------------------------
  // load
  // ---------------------------
  const fetchData = async () => {
    if (!clientId) return
    setLoading(true)
    try {
      const { data: list } = await axios.get("/client-shipping-addresses", {
        params: { client_id: clientId, limit: 200, offset: 0 },
      })
      setData(Array.isArray(list) ? list : [])
    } catch (err) {
      console.error("Ошибка загрузки адресов доставки:", err)
      message.error("Не удалось загрузить адреса доставки")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!clientId) return
    fetchData()
  }, [clientId])

  // helpers
  const replaceRow = (fresh) =>
    setData((prev) => prev.map((r) => (r.id === fresh.id ? fresh : r)))

  const removeRow = (id) =>
    setData((prev) => prev.filter((r) => r.id !== id))

  // ---------------------------
  // create
  // ---------------------------
  const handleAdd = async () => {
    if (!clientId) return
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
      is_precise_location: 1,
    }

    try {
      const res = await axios.post("/client-shipping-addresses", payload)
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
      })
      setResetCounter((c) => c + 1)

      message.success("Адрес доставки добавлен")
      onChanged?.()
    } catch (err) {
      console.error("Ошибка добавления адреса доставки:", err)
      message.error("Не удалось добавить адрес доставки")
    }
  }

  // ---------------------------
  // update
  // ---------------------------
  const handleUpdate = async (id, row) => {
    try {
      const { data: fresh } = await axios.put(
        `/client-shipping-addresses/${id}`,
        { ...row, version: row.version }
      )

      replaceRow(fresh)
      message.success("Изменения сохранены")
      onChanged?.()
    } catch (err) {
      const res = err?.response
      if (res?.status === 409) {
        const current =
          res?.data?.current || res?.data?.currentRecord || err.currentRecord
        if (
          current &&
          isSameByFields(current, row, [
            "formatted_address",
            "country",
            "region",
            "city",
            "street",
            "house",
            "building",
            "entrance",
            "postal_code",
            "comment",
          ])
        ) {
          replaceRow(current)
          onChanged?.()
          message.success("Изменения сохранены")
          return
        }
        setConflict({
          id,
          current,
          draft: row,
        })
        return
      }
      console.error("Ошибка обновления адреса доставки:", err)
      message.error("Не удалось сохранить адрес доставки")
    }
  }

  // ---------------------------
  // delete
  // ---------------------------
  const handleDelete = async (row) => {
    try {
      await axios.delete(`/client-shipping-addresses/${row.id}`, {
        params: { version: row.version },
      })

      removeRow(row.id)
      message.success("Адрес доставки удалён")
      onChanged?.()
    } catch (err) {
      const res = err?.response
      if (res?.status === 409 && res?.data?.current) {
        const current = res.data.current
        if (current) replaceRow(current)
        setConflict({
          id: row.id,
          current,
          draft: row,
        })
        return
      }
      console.error("Ошибка удаления адреса доставки:", err)
      message.error("Не удалось удалить адрес доставки")
    }
  }

  if (!clientId) return null

  return (
    <div className="parts-table-wrap">
      <Card size="small" className="table-section">
        {/* Поле выбора адреса (с картой) */}
        <PlaceAddressInput
          debugId="shipping-main-form"
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

        {/* Поля (верхний ряд) */}
        <Row gutter={12} className="table-section">
          <Col span={6}>
            <Input
              placeholder="Страна"
              value={newAddress.country}
              onChange={(e) =>
                setNewAddress((p) => ({ ...p, country: e.target.value }))
              }
            />
          </Col>
          <Col span={6}>
            <Input
              placeholder="Регион"
              value={newAddress.region}
              onChange={(e) =>
                setNewAddress((p) => ({ ...p, region: e.target.value }))
              }
            />
          </Col>
          <Col span={6}>
            <Input
              placeholder="Город"
              value={newAddress.city}
              onChange={(e) =>
                setNewAddress((p) => ({ ...p, city: e.target.value }))
              }
            />
          </Col>
          <Col span={6}>
            <Input
              placeholder="Индекс"
              value={newAddress.postal_code}
              onChange={(e) =>
                setNewAddress((p) => ({ ...p, postal_code: e.target.value }))
              }
            />
          </Col>
        </Row>

        {/* Поля (нижний ряд) */}
        <Row gutter={12} className="table-section">
          <Col span={12}>
            <Input
              placeholder="Улица"
              value={newAddress.street}
              onChange={(e) =>
                setNewAddress((p) => ({ ...p, street: e.target.value }))
              }
            />
          </Col>
          <Col span={4}>
            <Input
              placeholder="Дом"
              value={newAddress.house}
              onChange={(e) =>
                setNewAddress((p) => ({ ...p, house: e.target.value }))
              }
            />
          </Col>
          <Col span={4}>
            <Input
              placeholder="Строение"
              value={newAddress.building}
              onChange={(e) =>
                setNewAddress((p) => ({ ...p, building: e.target.value }))
              }
            />
          </Col>
          <Col span={4}>
            <Input
              placeholder="Подъезд"
              value={newAddress.entrance}
              onChange={(e) =>
                setNewAddress((p) => ({ ...p, entrance: e.target.value }))
              }
            />
          </Col>
        </Row>

        {/* Комментарий + кнопка */}
        <Row gutter={12} className="table-section">
          <Col flex="auto">
            <Input
              placeholder="Комментарий"
              value={newAddress.comment}
              onChange={(e) =>
                setNewAddress((p) => ({ ...p, comment: e.target.value }))
              }
            />
          </Col>
          <Col>
            <Button type="primary" onClick={handleAdd}>
              Добавить адрес доставки
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Таблица (без строки поиска) */}
      <ShippingAddressesTable
        data={data}
        loading={loading}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
      />

      {/* Конфликт версий */}
      {conflict && (
        <VersionConflictModal
          open={!!conflict}
          draft={conflict.draft}
          current={conflict.current}
          fields={[
            { key: "formatted_address", title: "Адрес доставки" },
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
            const base = conflict?.current || {}
            const draft = conflict?.draft || {}
            const merged = mergeConflictDraft(base, {
              ...draft,
              formatted_address:
                draft.formatted_address ?? base.formatted_address,
              country: draft.country ?? base.country,
              region: draft.region ?? base.region,
              city: draft.city ?? base.city,
              street: draft.street ?? base.street,
              house: draft.house ?? base.house,
              building: draft.building ?? base.building,
              entrance: draft.entrance ?? base.entrance,
              postal_code: draft.postal_code ?? base.postal_code,
              comment: draft.comment ?? base.comment,
            })
            if (conflict?.id) await handleUpdate(conflict.id, merged)
            setConflict(null)
          }}
          onCancel={() => setConflict(null)}
        />
      )}
    </div>
  )
}

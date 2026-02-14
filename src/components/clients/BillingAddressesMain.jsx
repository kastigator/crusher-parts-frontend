// src/components/clients/BillingAddressesMain.jsx
import React, { useCallback, useEffect, useState } from "react"
import { Card, Button, message, Input, Row, Col } from "antd"
import axios from "@/api/axiosInstance"
import PlaceAddressInput from "@/components/inputs/PlaceAddressInput"
import BillingAddressesTable from "./BillingAddressesTable"
import VersionConflictModal from "@/components/common/VersionConflictModal"
import { isSameByFields, mergeConflictDraft } from "@/utils/versionConflict"

export default function BillingAddressesMain({ clientId, onChanged }) {
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

  // ==========================
  // Load
  // ==========================
  const fetchData = useCallback(async () => {
    if (!clientId) return
    setLoading(true)
    try {
      const res = await axios.get("/client-billing-addresses", {
        params: { client_id: clientId },
      })
      setData(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      console.error("Ошибка при загрузке адресов:", err)
      message.error("Не удалось загрузить адреса")
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    if (clientId) fetchData()
  }, [clientId, fetchData])

  // ==========================
  // Add
  // ==========================
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
      setResetCounter((p) => p + 1)

      message.success("Адрес добавлен")
      onChanged?.()
    } catch (err) {
      console.error("Ошибка при добавлении адреса:", err)
      message.error("Не удалось добавить адрес")
    }
  }

  // ==========================
  // Edit / Delete (optimistic)
  // ==========================
  const replaceRow = (fresh) =>
    setData((prev) => prev.map((r) => (r.id === fresh.id ? fresh : r)))

  const removeRow = (id) =>
    setData((prev) => prev.filter((r) => r.id !== id))

  const onUpdate = async (id, row) => {
    try {
      const { data: fresh } = await axios.put(
        `/client-billing-addresses/${id}`,
        { ...row, version: row.version }
      )
      replaceRow(fresh)
      onChanged?.()
      message.success("Изменения сохранены")
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
      onChanged?.()
      message.success("Адрес удалён")
    } catch (err) {
      const res = err?.response
      if (res?.status === 409 && res?.data?.current) {
        replaceRow(res.data.current)
        setConflict({
          id: record.id,
          current: res.data.current,
          draft: record,
        })
        return
      }
      console.error("Ошибка при удалении адреса:", err)
      message.error("Не удалось удалить адрес")
    }
  }

  if (!clientId) return null

  return (
    <div className="parts-table-wrap">
      {/* Форма добавления адреса */}
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

        {/* Поля адреса (верхний ряд) */}
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

        {/* Поля адреса (нижний ряд) */}
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
              Добавить адрес
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Таблица адресов (без строки поиска) */}
      <BillingAddressesTable
        data={data}
        loading={loading}
        clientId={clientId}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onReplaceRow={replaceRow}
        onRefresh={fetchData}
      />

      {/* Конфликт версий */}
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

            if (conflict?.id) await onUpdate(conflict.id, merged)
            setConflict(null)
          }}
          onCancel={() => setConflict(null)}
        />
      )}
    </div>
  )
}

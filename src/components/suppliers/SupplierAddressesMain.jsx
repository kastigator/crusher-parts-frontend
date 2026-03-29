import React, { useEffect, useState } from "react"
import { Card, Button, message, Input, Row, Col, Checkbox } from "antd"
import axios from "@/api/axiosInstance"
import PlaceAddressInput from "@/components/inputs/PlaceAddressInput"
import SupplierAddressesTable from "./SupplierAddressesTable"
import VersionConflictModal from "@/components/common/VersionConflictModal"
import { isSameByFields } from "@/utils/versionConflict"
import { runTrashDeleteFlow } from "@/utils/trashUi"

export default function SupplierAddressesMain({ supplierId, onChanged }) {
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
    label: "",
    type: "",
    is_primary: false,
  })

  const trimToNull = (v) => {
    if (v === undefined || v === null) return null
    const s = String(v).trim()
    return s === "" ? null : s
  }

  const fetchData = async () => {
    if (!supplierId) return
    setLoading(true)
    try {
      const res = await axios.get("/supplier-addresses", {
        params: { supplier_id: supplierId },
      })
      setData(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      console.error("Ошибка при загрузке адресов поставщика:", err)
      message.error(
        err?.response?.data?.message ||
          "Не удалось загрузить адреса поставщика",
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!supplierId) return
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplierId])

  const replaceRow = (fresh) => {
    if (!fresh?.id) return
    setData((prev) => prev.map((r) => (r.id === fresh.id ? fresh : r)))
  }

  const removeRow = (id) => {
    setData((prev) => prev.filter((r) => r.id !== id))
  }

  const handleAdd = async () => {
    if (!supplierId) return
    if (!newAddress.formatted_address?.trim()) {
      message.warning("Адрес обязателен")
      return
    }

    const payload = {
      supplier_id: supplierId,
      formatted_address: String(newAddress.formatted_address ?? "").trim(),
      place_id: newAddress.place_id || null,
      lat: newAddress.lat ?? null,
      lng: newAddress.lng ?? null,
      postal_code: trimToNull(newAddress.postal_code),
      country: trimToNull(newAddress.country),
      region: trimToNull(newAddress.region),
      city: trimToNull(newAddress.city),
      street: trimToNull(newAddress.street),
      house: trimToNull(newAddress.house),
      building: trimToNull(newAddress.building),
      entrance: trimToNull(newAddress.entrance),
      comment: trimToNull(newAddress.comment),
      label: trimToNull(newAddress.label),
      type: trimToNull(newAddress.type),
      is_primary: newAddress.is_primary ? 1 : 0,
    }

    try {
      const res = await axios.post("/supplier-addresses", payload)
      setData((prev) => {
        if (res.data?.is_primary) {
          return [res.data, ...prev.map((r) => ({ ...r, is_primary: 0 }))]
        }
        return [res.data, ...prev]
      })
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
      setResetCounter((prev) => prev + 1)
      onChanged?.()
    } catch (err) {
      console.error("Ошибка при создании адреса поставщика:", err)
      message.error(
        err?.response?.data?.message || "Не удалось создать адрес поставщика",
      )
    }
  }

  const handleUpdate = async (id, row) => {
    try {
      const { data: fresh } = await axios.put(`/supplier-addresses/${id}`, {
        ...row,
        version: row.version,
      })
      if (fresh?.is_primary) {
        setData((prev) =>
          prev.map((r) =>
            r.id === fresh.id ? fresh : { ...r, is_primary: 0 },
          ),
        )
      } else {
        replaceRow(fresh)
      }
      message.success("Адрес поставщика обновлен")
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
            "label",
            "type",
            "is_primary",
          ])
        ) {
          replaceRow(current)
          onChanged?.()
          message.success("Адрес поставщика обновлен")
          return
        }
        setConflict({
          id,
          draft: row,
          current,
          entityLabel: "Адрес поставщика",
        })
        return
      }
      console.error("Ошибка при обновлении адреса поставщика:", err)
      message.error("Не удалось обновить адрес поставщика")
      throw err
    }
  }

  const handleDelete = async (record) => {
    try {
      const result = await runTrashDeleteFlow({
        entityType: "supplier_addresses",
        entityId: record.id,
        deleteUrl: `/supplier-addresses/${record.id}`,
        deleteParams: { version: record.version },
        successMessage: "Адрес поставщика перемещён в корзину",
      })
      if (result?.deleted) {
        removeRow(record.id)
        onChanged?.()
      }
    } catch (err) {
      const res = err?.response
      if (res?.status === 409 && res?.data?.current) {
        setConflict({
          id: record.id,
          draft: record,
          current: res.data.current,
          entityLabel: "Адрес поставщика",
        })
        return
      }
      console.error("Ошибка при удалении адреса поставщика:", err)
      message.error("Не удалось удалить адрес поставщика")
      throw err
    }
  }

  if (!supplierId) return null

  return (
    <div className="parts-table-wrap">
      {/* Форма с Яндекс-картой */}
      <Card size="small" className="table-section">
        <PlaceAddressInput
          debugId="supplier-addresses-main"
          resetTrigger={resetCounter}
          value={{
            address_line: newAddress.formatted_address,
            lat: newAddress.lat,
            lng: newAddress.lng,
            place_id: newAddress.place_id,
            postal_code: newAddress.postal_code,
            country: newAddress.country,
            region: newAddress.region,
            city: newAddress.city,
            street: newAddress.street,
            house: newAddress.house,
            building: newAddress.building,
            entrance: newAddress.entrance,
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

        {/* Страна, регион, город, индекс */}
        <Row gutter={8} style={{ marginTop: 8 }}>
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

        <Row gutter={8} style={{ marginTop: 8 }}>
          <Col span={10}>
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
          <Col span={6}>
            <Input
              placeholder="Подъезд / вход"
              value={newAddress.entrance}
              onChange={(e) =>
                setNewAddress((p) => ({ ...p, entrance: e.target.value }))
              }
            />
          </Col>
        </Row>

        <Row gutter={8} style={{ marginTop: 8 }}>
          <Col span={4}>
            <Input
              placeholder="Метка (склад, офис...)"
              value={newAddress.label}
              onChange={(e) =>
                setNewAddress((p) => ({ ...p, label: e.target.value }))
              }
            />
          </Col>
          <Col span={4}>
            <Input
              placeholder="Тип (юр., склад и т.п.)"
              value={newAddress.type}
              onChange={(e) =>
                setNewAddress((p) => ({ ...p, type: e.target.value }))
              }
            />
          </Col>
          <Col span={8}>
            <Input
              placeholder="Комментарий"
              value={newAddress.comment}
              onChange={(e) =>
                setNewAddress((p) => ({ ...p, comment: e.target.value }))
              }
            />
          </Col>
          <Col span={4}>
            <Checkbox
              checked={newAddress.is_primary}
              onChange={(e) =>
                setNewAddress((p) => ({
                  ...p,
                  is_primary: e.target.checked,
                }))
              }
            >
              Основной
            </Checkbox>
          </Col>
          <Col span={4} style={{ textAlign: "right" }}>
            <Button type="primary" onClick={handleAdd}>
              Добавить адрес
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Таблица адресов */}
      <SupplierAddressesTable
        data={data}
        loading={loading}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
      />

      {conflict && (
        <VersionConflictModal
          open={!!conflict}
          draft={conflict.draft}
          current={conflict.current}
          entityLabel={conflict.entityLabel}
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
          onClose={() => setConflict(null)}
          onReload={async () => {
            if (conflict?.current) replaceRow(conflict.current)
            await fetchData()
            setConflict(null)
          }}
          onCancel={() => setConflict(null)}
        />
      )}
    </div>
  )
}

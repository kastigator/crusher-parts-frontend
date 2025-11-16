// src/components/suppliers/SupplierAddressesMain.jsx
import React, { useEffect, useState } from "react"
import { Card, Button, message, Input, Row, Col } from "antd"
import axios from "@/api/axiosInstance"

import TableToolbar from "@/components/common/TableToolbar"
import SupplierAddressesTable from "./SupplierAddressesTable"
import VersionConflictModal from "@/components/common/VersionConflictModal"
import PlaceAddressInput from "@/components/inputs/PlaceAddressInput"

const createEmptyAddress = () => ({
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

const trimOrNull = (v) => {
  if (v === undefined || v === null) return null
  const s = String(v).trim()
  return s === "" ? null : s
}

export default function SupplierAddressesMain({ supplierId, onChanged }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)

  const [search, setSearch] = useState("")
  const [resetCounter, setResetCounter] = useState(0)
  const [adding, setAdding] = useState(false)
  const [conflict, setConflict] = useState(null)

  const [newAddress, setNewAddress] = useState(() => createEmptyAddress())

  const resetNewAddress = () => setNewAddress(createEmptyAddress())

  const fetchData = async () => {
    if (!supplierId) return
    setLoading(true)
    try {
      const res = await axios.get("/part-suppliers/addresses", {
        params: { supplier_id: supplierId },
      })
      setData(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      console.error("Ошибка при загрузке адресов:", err)
      const msg =
        err?.response?.data?.message || "Не удалось загрузить адреса поставщика"
      message.error(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!supplierId) return
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplierId])

  const replaceRow = (fresh) =>
    setData((prev) => prev.map((r) => (r.id === fresh.id ? fresh : r)))

  const removeRow = (id) =>
    setData((prev) => prev.filter((r) => r.id !== id))

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

    setAdding(true)
    try {
      const res = await axios.post("/part-suppliers/addresses", payload)
      setData((prev) => [res.data, ...prev])
      resetNewAddress()
      setResetCounter((c) => c + 1)
      message.success("Адрес поставщика добавлен")
      onChanged?.()
    } catch (err) {
      console.error("Ошибка при добавлении адреса поставщика:", err)
      message.error(
        err?.response?.data?.message || "Не удалось добавить адрес поставщика"
      )
    } finally {
      setAdding(false)
    }
  }

  const handleUpdate = async (id, values) => {
    try {
      const { data: fresh } = await axios.put(
        `/part-suppliers/addresses/${id}`,
        values
      )
      replaceRow(fresh)
      message.success("Адрес обновлён")
      onChanged?.()
    } catch (err) {
      if (err?.response?.status === 409) {
        const current = err.response.data?.currentRecord
        setConflict({
          id,
          current,
          draft: { id, ...values },
          entityLabel: "Адрес поставщика",
        })
        return
      }
      console.error("Ошибка при обновлении адреса поставщика:", err)
      message.error("Не удалось обновить адрес поставщика")
    }
  }

  const handleDelete = async (row) => {
    try {
      await axios.delete(`/part-suppliers/addresses/${row.id}`, {
        params: { version: row.version },
      })
      removeRow(row.id)
      message.success("Адрес удалён")
      onChanged?.()
    } catch (err) {
      if (err?.response?.status === 409) {
        const current = err.response.data?.currentRecord
        setConflict({
          id: row.id,
          current,
          draft: row,
          entityLabel: "Адрес поставщика",
        })
        return
      }
      console.error("Ошибка при удалении адреса поставщика:", err)
      message.error("Не удалось удалить адрес поставщика")
    }
  }

  const filtered = data.filter((r) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return (
      String(r.formatted_address || "").toLowerCase().includes(q) ||
      String(r.city || "").toLowerCase().includes(q) ||
      String(r.label || "").toLowerCase().includes(q) ||
      String(r.type || "").toLowerCase().includes(q)
    )
  })

  if (!supplierId) {
    return (
      <Card size="small">
        Выберите поставщика, чтобы видеть его адреса.
      </Card>
    )
  }

  return (
    <>
      <Card size="small" style={{ marginBottom: 12 }}>
        <Row gutter={8} style={{ marginBottom: 8 }}>
          <Col span={24}>
            <PlaceAddressInput
              label="Адрес поставщика"
              value={newAddress}
              resetCounter={resetCounter}
              onChange={(value) => {
                setNewAddress((prev) => ({
                  ...prev,
                  ...value,
                }))
              }}
            />
          </Col>
        </Row>

        <Row gutter={8} style={{ marginBottom: 8 }}>
          <Col span={4}>
            <Input
              size="small"
              placeholder="Метка (например, склад)"
              value={newAddress.label}
              onChange={(e) =>
                setNewAddress((prev) => ({
                  ...prev,
                  label: e.target.value,
                }))
              }
            />
          </Col>
          <Col span={4}>
            <Input
              size="small"
              placeholder="Тип (юр., склад...)"
              value={newAddress.type}
              onChange={(e) =>
                setNewAddress((prev) => ({
                  ...prev,
                  type: e.target.value,
                }))
              }
            />
          </Col>
          <Col span={4}>
            <Input
              size="small"
              placeholder="Индекс"
              value={newAddress.postal_code}
              onChange={(e) =>
                setNewAddress((prev) => ({
                  ...prev,
                  postal_code: e.target.value,
                }))
              }
            />
          </Col>
          <Col span={4}>
            <Input
              size="small"
              placeholder="Страна"
              value={newAddress.country}
              onChange={(e) =>
                setNewAddress((prev) => ({
                  ...prev,
                  country: e.target.value,
                }))
              }
            />
          </Col>
          <Col span={4}>
            <Input
              size="small"
              placeholder="Регион"
              value={newAddress.region}
              onChange={(e) =>
                setNewAddress((prev) => ({
                  ...prev,
                  region: e.target.value,
                }))
              }
            />
          </Col>
          <Col span={4}>
            <Input
              size="small"
              placeholder="Город"
              value={newAddress.city}
              onChange={(e) =>
                setNewAddress((prev) => ({
                  ...prev,
                  city: e.target.value,
                }))
              }
            />
          </Col>
        </Row>

        <Row gutter={8} style={{ marginBottom: 8 }}>
          <Col span={4}>
            <Input
              size="small"
              placeholder="Улица"
              value={newAddress.street}
              onChange={(e) =>
                setNewAddress((prev) => ({
                  ...prev,
                  street: e.target.value,
                }))
              }
            />
          </Col>
          <Col span={4}>
            <Input
              size="small"
              placeholder="Дом"
              value={newAddress.house}
              onChange={(e) =>
                setNewAddress((prev) => ({
                  ...prev,
                  house: e.target.value,
                }))
              }
            />
          </Col>
          <Col span={4}>
            <Input
              size="small"
              placeholder="Строение"
              value={newAddress.building}
              onChange={(e) =>
                setNewAddress((prev) => ({
                  ...prev,
                  building: e.target.value,
                }))
              }
            />
          </Col>
          <Col span={4}>
            <Input
              size="small"
              placeholder="Подъезд"
              value={newAddress.entrance}
              onChange={(e) =>
                setNewAddress((prev) => ({
                  ...prev,
                  entrance: e.target.value,
                }))
              }
            />
          </Col>
          <Col span={8}>
            <Input
              size="small"
              placeholder="Комментарий"
              value={newAddress.comment}
              onChange={(e) =>
                setNewAddress((prev) => ({
                  ...prev,
                  comment: e.target.value,
                }))
              }
            />
          </Col>
        </Row>

        <Button
          type="primary"
          size="small"
          onClick={handleAdd}
          loading={adding}
          disabled={!newAddress.formatted_address?.trim()}
        >
          Добавить адрес
        </Button>
      </Card>

      <Card size="small">
        <TableToolbar
          search={search}
          onSearch={setSearch}
          placeholder="Поиск по адресам поставщика..."
        />
        <SupplierAddressesTable
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

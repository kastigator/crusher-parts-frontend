// src/components/clients/ShippingAddressesMain.jsx

import React, { useState, useEffect } from "react"
import { Card, Space, Button, message, Input, Row, Col } from "antd"
import axios from "@/api/axiosInstance"
import PlaceAddressInput from "@/components/inputs/PlaceAddressInput"
import ShippingAddressesTable from "./ShippingAddressesTable"

export default function ShippingAddressesMain({ clientId }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [newAddress, setNewAddress] = useState({
    formatted_address: "",
    place_id: null,
    lat: null,
    lng: null,
    postal_code: null,
    comment: ""
  })

  const fetchData = async () => {
    if (!clientId) return
    setLoading(true)
    try {
      const res = await axios.get("/client-shipping-addresses", {
        params: { client_id: clientId }
      })
      setData(res.data)
    } catch (err) {
      console.error("Ошибка при загрузке адресов доставки:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
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
      lat: newAddress.lat || null,
      lng: newAddress.lng || null,
      postal_code: newAddress.postal_code || null,
      comment: newAddress.comment?.trim() || null
    }

    try {
      await axios.post("/client-shipping-addresses", payload)
      message.success("Адрес добавлен")
      setNewAddress({
        formatted_address: "",
        place_id: null,
        lat: null,
        lng: null,
        postal_code: null,
        comment: ""
      })
      fetchData()
    } catch (err) {
      console.error("Ошибка при добавлении адреса доставки:", err)
      message.error("Не удалось добавить адрес")
    }
  }

  return (
    <Card title="Адреса доставки" size="small">
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <PlaceAddressInput
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
              postal_code: value.postal_code
            }))
          }
        />

        <Row gutter={12}>
          <Col flex="auto">
            <Input
              placeholder="Комментарий"
              value={newAddress.comment}
              onChange={(e) =>
                setNewAddress((prev) => ({ ...prev, comment: e.target.value }))
              }
            />
          </Col>
          <Col>
            <Button type="primary" onClick={handleAdd}>
              Добавить адрес
            </Button>
          </Col>
        </Row>

        <ShippingAddressesTable
          data={data}
          loading={loading}
          clientId={clientId}
          reloadData={fetchData}
        />
      </Space>
    </Card>
  )
}

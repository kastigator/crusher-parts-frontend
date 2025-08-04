// src/components/fields/FormAddressFields.jsx

import React, { useState, useEffect } from "react"
import PlaceAddressInput from "@/components/inputs/PlaceAddressInput"
import { Input, Form } from "antd"

export default function FormAddressFields({
  initialValues = {},
  onChange,
  namePrefix = ""
}) {
  const [address, setAddress] = useState(initialValues || {})

  useEffect(() => {
    onChange?.(address)
  }, [address])

  const handleAddressChange = (val) => {
    setAddress((prev) => ({ ...prev, ...val }))
  }

  const getFieldName = (field) => (namePrefix ? `${namePrefix}.${field}` : field)

  return (
    <>
      <PlaceAddressInput
        label="Адрес (поиск)"
        required
        value={address.formatted_address || ""}
        onChange={handleAddressChange}
      />

      <Form.Item label="Комментарий" name={getFieldName("comment")}>
        <Input
          value={address.comment}
          onChange={(e) => setAddress((prev) => ({ ...prev, comment: e.target.value }))}
        />
      </Form.Item>
    </>
  )
}

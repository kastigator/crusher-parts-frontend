import React, { useEffect, useState } from "react"
import { InputNumber } from "antd"

const toPositiveInt = (value) => {
  if (value === "" || value === null || value === undefined) return null
  const n = Number(value)
  return Number.isInteger(n) && n > 0 ? n : null
}

export default function BomQuantityInput({ value, size, onCommit }) {
  const normalizedValue = toPositiveInt(value) || 1
  const [draft, setDraft] = useState(normalizedValue)

  useEffect(() => {
    setDraft(normalizedValue)
  }, [normalizedValue])

  const commit = (nextValue = draft) => {
    const nextQty = toPositiveInt(nextValue)
    if (!nextQty || nextQty === normalizedValue) {
      setDraft(normalizedValue)
      return
    }
    onCommit?.(nextQty)
  }

  return (
    <InputNumber
      min={1}
      step={1}
      precision={0}
      size={size}
      value={draft}
      style={{ width: 120 }}
      onChange={(nextValue) => setDraft(nextValue)}
      onStep={(nextValue) => commit(nextValue)}
      onPressEnter={() => commit()}
      onBlur={() => commit()}
    />
  )
}

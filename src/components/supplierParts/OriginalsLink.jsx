// src/components/supplierParts/OriginalsLink.jsx
import React from "react"
import { Empty, Tag } from "antd"

export default function OriginalsLink({ supplierPart }) {
  if (!supplierPart) return <Empty />
  const cats = String(supplierPart.original_cat_numbers || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean)

  return (
    <div>
      {cats.length === 0 ? (
        <Empty description="Пока нет привязанных оригинальных номеров" />
      ) : (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {cats.map((c) => <Tag key={c}>{c}</Tag>)}
        </div>
      )}
      {/* позже сюда добавим кнопки привязать/отвязать, поиск оригиналов и т.п. */}
    </div>
  )
}

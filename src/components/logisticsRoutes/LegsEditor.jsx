// src/components/logisticsRoutes/LegsEditor.jsx
import React from "react"
import { Button, Card, Input, InputNumber, Select, Space, Tooltip } from "antd"
import CountrySelect from "@/components/inputs/CountrySelect"
import CurrencySelect from "@/components/inputs/CurrencySelect"
import IncotermsSelect from "@/components/inputs/IncotermsSelect"
import { ROUTE_TYPE_OPTIONS } from "./logisticsRouteOptions"
import { ArrowUpOutlined, ArrowDownOutlined, DeleteOutlined, PlusOutlined } from "@ant-design/icons"
import { formatPriceWithCurrency } from "@/utils/priceFormat"

const emptyLeg = (seq) => ({
  seq,
  name: "",
  type: null,
  from_country: null,
  to_country: null,
  incoterms: null,
  eta_days: null,
  cost: null,
  currency: null,
  surcharge_pct: null,
  surcharge_abs: null,
  comment: "",
})

export default function LegsEditor({ legs, setLegs, compact = false }) {
  const move = (index, dir) => {
    const next = [...legs]
    const target = index + dir
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    setLegs(next.map((l, i) => ({ ...l, seq: i + 1 })))
  }

  const remove = (index) => {
    const next = legs.filter((_, i) => i !== index)
    setLegs(next.map((l, i) => ({ ...l, seq: i + 1 })))
  }

  const addLeg = () => {
    setLegs([...(legs || []), emptyLeg((legs?.length || 0) + 1)])
  }

  const updateField = (index, field, value) => {
    const next = legs.map((l, i) => (i === index ? { ...l, [field]: value } : l))
    setLegs(next)
  }

  const totalEta = legs.reduce(
    (sum, l) => sum + (Number.isFinite(Number(l.eta_days)) ? Number(l.eta_days) : 0),
    0
  )
  const totalCost = legs.reduce(
    (sum, l) => sum + (Number.isFinite(Number(l.cost)) ? Number(l.cost) : 0),
    0
  )
  const totalCostText = formatPriceWithCurrency(totalCost, legs[0]?.currency || "", { empty: "0.00" })

  return (
    <Card
      size={compact ? "small" : "default"}
      title="Звенья маршрута (A → B → C)"
      extra={
        <Space size={8}>
          <span style={{ color: "#6b7280" }}>
            Σ ETA: {totalEta || 0} дн. · Σ Cost: {totalCostText}
          </span>
          <Button icon={<PlusOutlined />} onClick={addLeg} size="small" type="dashed">
            Добавить звено
          </Button>
        </Space>
      }
      bodyStyle={{ padding: compact ? 12 : 16 }}
      style={{ marginTop: compact ? 8 : 12 }}
    >
      <Space direction="vertical" style={{ width: "100%" }} size={8}>
        {legs.map((leg, idx) => (
          <Card key={idx} size="small" bodyStyle={{ padding: 12 }}>
            <Space
              align="start"
              style={{ width: "100%", flexWrap: "wrap", gap: 8 }}
            >
              <div style={{ width: 50, textAlign: "center", fontWeight: 600 }}>
                #{idx + 1}
              </div>

              <Input
                placeholder="Название звена"
                value={leg.name || ""}
                onChange={(e) => updateField(idx, "name", e.target.value)}
                style={{ width: 170 }}
              />

              <Select
                allowClear
                placeholder="Тип"
                options={ROUTE_TYPE_OPTIONS}
                value={leg.type || undefined}
                onChange={(v) => updateField(idx, "type", v || null)}
                style={{ width: 120 }}
                size="middle"
              />

              <CountrySelect
                value={leg.from_country}
                onChange={(v) => updateField(idx, "from_country", v || null)}
                style={{ minWidth: 140 }}
              />

              <CountrySelect
                value={leg.to_country}
                onChange={(v) => updateField(idx, "to_country", v || null)}
                style={{ minWidth: 140 }}
              />

              <IncotermsSelect
                value={leg.incoterms}
                onChange={(v) => updateField(idx, "incoterms", v || null)}
                style={{ minWidth: 160 }}
              />

              <InputNumber
                placeholder="ETA, дн."
                min={0}
                value={leg.eta_days}
                onChange={(v) => updateField(idx, "eta_days", v ?? null)}
                style={{ width: 110 }}
              />

              <InputNumber
                placeholder="Стоимость"
                min={0}
                value={leg.cost}
                onChange={(v) => updateField(idx, "cost", v ?? null)}
                style={{ width: 130 }}
              />

              <CurrencySelect
                value={leg.currency}
                onChange={(v) => updateField(idx, "currency", v || null)}
                style={{ minWidth: 120 }}
              />

              <InputNumber
                placeholder="Наценка, %"
                min={0}
                value={leg.surcharge_pct}
                onChange={(v) => updateField(idx, "surcharge_pct", v ?? null)}
                style={{ width: 120 }}
              />

              <InputNumber
                placeholder="Фикс."
                min={0}
                value={leg.surcharge_abs}
                onChange={(v) => updateField(idx, "surcharge_abs", v ?? null)}
                style={{ width: 110 }}
              />

              <Input
                placeholder="Комментарий"
                value={leg.comment || ""}
                onChange={(e) => updateField(idx, "comment", e.target.value)}
                style={{ width: 200 }}
              />

              <Space>
                <Tooltip title="Вверх">
                  <Button
                    icon={<ArrowUpOutlined />}
                    size="small"
                    disabled={idx === 0}
                    onClick={() => move(idx, -1)}
                  />
                </Tooltip>
                <Tooltip title="Вниз">
                  <Button
                    icon={<ArrowDownOutlined />}
                    size="small"
                    disabled={idx === legs.length - 1}
                    onClick={() => move(idx, 1)}
                  />
                </Tooltip>
                <Tooltip title="Удалить">
                  <Button
                    icon={<DeleteOutlined />}
                    size="small"
                    danger
                    onClick={() => remove(idx)}
                  />
                </Tooltip>
              </Space>
            </Space>
          </Card>
        ))}

        {legs.length === 0 && (
          <div style={{ color: "#9ca3af" }}>Добавьте звено, чтобы описать цепочку.</div>
        )}
      </Space>
    </Card>
  )
}

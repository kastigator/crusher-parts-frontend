import React, { useMemo, useState } from "react"
import { Select, Space, Table, Tag } from "antd"
import { formatPriceWithCurrency } from "@/utils/priceFormat"

const selectionStatusLabel = (status) => {
  const key = String(status || "").toLowerCase()
  if (key === "approved") return { label: "Утверждено", color: "green" }
  if (key === "draft") return { label: "Черновик", color: "default" }
  if (key === "review") return { label: "На согласовании", color: "gold" }
  return { label: status || "—", color: "default" }
}

const offerTypeLabel = (value) => {
  const key = String(value || "").toUpperCase()
  if (key === "OEM") return "OEM"
  if (key === "ANALOG") return "Аналог"
  return value || "—"
}

export default function SelectionTabContent({ selections, selectionLines, formatDate }) {
  const [supplierFilter, setSupplierFilter] = useState(null)
  const [onlyPriced, setOnlyPriced] = useState(false)

  const lines = Array.isArray(selectionLines) ? selectionLines : []

  const supplierOptions = useMemo(() => {
    const seen = new Set()
    const options = []
    lines.forEach((line) => {
      const supplier = String(line?.supplier_name || "").trim()
      if (!supplier || seen.has(supplier)) return
      seen.add(supplier)
      options.push({ value: supplier, label: supplier })
    })
    return options.sort((a, b) => a.label.localeCompare(b.label))
  }, [lines])

  const filteredLines = useMemo(
    () =>
      lines
        .filter((line) => {
          if (supplierFilter && String(line?.supplier_name || "") !== supplierFilter) return false
          if (onlyPriced && !(line?.price != null)) return false
          return true
        })
        .sort((a, b) => {
          const la = Number(a?.rfq_line_number || a?.line_number || 0)
          const lb = Number(b?.rfq_line_number || b?.line_number || 0)
          if (la && lb && la !== lb) return la - lb
          return String(a?.supplier_name || "").localeCompare(String(b?.supplier_name || ""))
        }),
    [lines, supplierFilter, onlyPriced]
  )

  const stats = useMemo(() => {
    const total = lines.length
    const priced = lines.filter((line) => line?.price != null).length
    const suppliers = new Set(lines.map((line) => line?.supplier_name).filter(Boolean)).size
    const totalAmount = lines.reduce((sum, line) => {
      const price = Number(line?.price)
      const qty = Number(line?.qty || 1)
      if (!Number.isFinite(price)) return sum
      return sum + price * (Number.isFinite(qty) && qty > 0 ? qty : 1)
    }, 0)
    return { total, priced, suppliers, totalAmount }
  }, [lines])

  return (
    <Space direction="vertical" style={{ width: "100%" }} size={12}>
      <Space wrap>
        <Tag color="blue">Сценариев: {(Array.isArray(selections) ? selections : []).length}</Tag>
        <Tag color="green">Выбранных строк: {stats.total}</Tag>
        <Tag color={stats.priced ? "geekblue" : "default"}>С ценой: {stats.priced}</Tag>
        <Tag>Поставщиков: {stats.suppliers}</Tag>
      </Space>

      <Table
        rowKey="id"
        dataSource={Array.isArray(selections) ? selections : []}
        pagination={false}
        columns={[
          {
            title: "Статус",
            dataIndex: "status",
            width: 140,
            render: (value) => {
              const meta = selectionStatusLabel(value)
              return <Tag color={meta.color}>{meta.label}</Tag>
            },
          },
          { title: "Комментарий", dataIndex: "note" },
          { title: "Создано", dataIndex: "created_at", width: 140, render: formatDate },
        ]}
      />

      <Space wrap>
        <Select
          allowClear
          style={{ minWidth: 260 }}
          placeholder="Фильтр по поставщику"
          value={supplierFilter}
          onChange={(value) => setSupplierFilter(value || null)}
          options={supplierOptions}
          showSearch
          optionFilterProp="label"
        />
        <Select
          style={{ minWidth: 180 }}
          value={onlyPriced ? "priced" : "all"}
          onChange={(value) => setOnlyPriced(value === "priced")}
          options={[
            { value: "all", label: "Все строки" },
            { value: "priced", label: "Только с ценой" },
          ]}
        />
      </Space>

      <Table
        rowKey="id"
        dataSource={filteredLines}
        pagination={{ pageSize: 50 }}
        scroll={{ x: "max-content" }}
        columns={[
          {
            title: "Строка RFQ",
            dataIndex: "rfq_item_id",
            width: 110,
            render: (_, record) => record.rfq_line_number || record.line_number || "—",
          },
          { title: "Компонент", dataIndex: "component_cat_number", width: 170, render: (value) => value || "—" },
          { title: "Поставщик", dataIndex: "supplier_name", width: 220, render: (value) => value || "—" },
          { title: "Предложение", dataIndex: "supplier_part_number", width: 180, render: (value) => value || "—" },
          { title: "Тип", dataIndex: "offer_type", width: 110, render: (value) => offerTypeLabel(value) },
          {
            title: "Цена/итог",
            dataIndex: "price",
            width: 140,
            render: (value, record) => (value != null ? formatPriceWithCurrency(value, record.currency) : "—"),
          },
          { title: "Кол-во", dataIndex: "qty", width: 90, render: (value) => value ?? "—" },
          { title: "Комментарий решения", dataIndex: "decision_note", ellipsis: true },
        ]}
      />
    </Space>
  )
}

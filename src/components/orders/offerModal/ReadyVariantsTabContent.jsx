import React from "react"
import { Button, Checkbox, Divider, InputNumber, Select, Space, Table, Tag, Tooltip, Typography } from "antd"
import { InfoCircleOutlined } from "@ant-design/icons"
import { fmtMoney } from "@/components/orders/offerModal/offerModalUtils"

const { Text } = Typography

export default function ReadyVariantsTabContent({
  routes,
  readyRouteId,
  setReadyRouteId,
  readyMarkupPct,
  setReadyMarkupPct,
  readyMarkupAbs,
  setReadyMarkupAbs,
  computeReadyCalcs,
  readyCalcLoading,
  clientVisibleOnAdd,
  setClientVisibleOnAdd,
  canSelect,
  readyCalcs,
  readyRouteByKey,
  setReadyRouteByKey,
  bundles,
  suggestionRows,
  bundlesLoading,
  suggestionsLoading,
  renderSupplier,
  selectedVariantKeys,
  setSelectedVariantKeys,
  selectedVariants,
  setSelectedVariants,
  setSelectedSuggestions,
  onAddSelected,
  editingDisabled,
}) {
  const dataSource = [
    ...bundles.map((b) => ({
      key: `bundle-${b.id}`,
      type: "bundle",
      title: b.title || `Комплект #${b.id}`,
      price:
        Array.isArray(b.totals) && b.totals[0]
          ? fmtMoney(b.totals[0].total_price, b.totals[0].currency_iso3 || "")
          : "",
      defaults: Array.isArray(b.options) ? b.options.filter((o) => o.is_default) : [],
      supplier_name: (() => {
        const d = Array.isArray(b.options) ? b.options.find((o) => o.is_default) : null
        return d?.supplier_name || null
      })(),
      supplier_public_code: (() => {
        const d = Array.isArray(b.options) ? b.options.find((o) => o.is_default) : null
        return d?.supplier_public_code || null
      })(),
      supplier_part_number: (() => {
        const d = Array.isArray(b.options) ? b.options.find((o) => o.is_default) : null
        return d?.supplier_part_number || null
      })(),
      supplier_description: (() => {
        const d = Array.isArray(b.options) ? b.options.find((o) => o.is_default) : null
        return d?.role_label || null
      })(),
      raw: b,
    })),
    ...suggestionRows.map((s) => ({
      ...s,
      price: s.latest_price != null ? fmtMoney(s.latest_price, s.latest_price_currency || "") : "",
      raw: s.raw,
    })),
  ]

  const columns = [
    {
      title: "Тип",
      dataIndex: "type",
      width: 110,
      render: (v) =>
        v === "bundle" ? <Tag color="geekblue">Комплект</Tag> : <Tag>Деталь</Tag>,
    },
    {
      title: "Поставщик / роль",
      dataIndex: "supplier",
      width: 220,
      render: (_, r) => (
        <Space direction="vertical" size={2}>
          {renderSupplier(r)}
          {r.role_label && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              Роль: {r.role_label}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: "Материал",
      dataIndex: "material_label",
      width: 160,
      ellipsis: true,
      render: (v) => v || "—",
    },
    {
      title: "Cat# пост.",
      dataIndex: "supplier_part_number",
      width: 140,
      ellipsis: true,
    },
    {
      title: "Маршрут",
      dataIndex: "route",
      width: 190,
      render: (_, r) => (
        <Select
          allowClear
          placeholder="Маршрут"
          value={readyRouteByKey[r.key] ?? readyRouteId}
          style={{ width: 180 }}
          onChange={(v) =>
            setReadyRouteByKey((prev) => ({
              ...prev,
              [r.key]: v || null,
            }))
          }
          options={routes.map((rt) => ({
            value: rt.id,
            label: rt.name || `Маршрут #${rt.id}`,
          }))}
        />
      ),
    },
    {
      title: "Деталь / Комплектация",
      dataIndex: "part",
      ellipsis: true,
      render: (_, r) =>
        r.type === "bundle" ? (
          <Space direction="vertical" size={2}>
            <Text strong>{r.title}</Text>
            {(r.defaults || []).map((d) => (
              <Text key={`${d.role_label}-${d.supplier_part_number}`} type="secondary" style={{ fontSize: 12 }}>
                {d.role_label || "деталь"}: {d.supplier_part_number} · {d.supplier_name || d.supplier_public_code || ""}
                {d.last_price != null && ` · ${fmtMoney(d.last_price, d.last_currency || "")}`}
              </Text>
            ))}
          </Space>
        ) : (
          <span>{r.supplier_description || "—"}</span>
        ),
    },
    {
      title: "Цена",
      dataIndex: "price",
      width: 130,
      render: (v) => (v ? v : "—"),
    },
    {
      title: "Цена клиенту",
      dataIndex: "client_price",
      width: 150,
      render: (_, r) => {
        const calcRow = readyCalcs[r.key]
        return calcRow?.client_price != null
          ? `${calcRow.client_price.toFixed(2)} ${calcRow.currency || ""}`
          : "—"
      },
    },
    {
      title: "ETA",
      dataIndex: "eta",
      width: 90,
      render: (_, r) => {
        const calcRow = readyCalcs[r.key]
        return calcRow?.eta != null ? `${calcRow.eta} дн.` : "—"
      },
    },
    {
      title: "Приоритет",
      dataIndex: "priority",
      width: 120,
      render: (_, r) => {
        const calcRow = readyCalcs[r.key]
        if (!calcRow || calcRow.client_price == null) return null
        const prices = Object.values(readyCalcs)
          .map((c) => c.client_price)
          .filter((v) => v != null)
        const etas = Object.values(readyCalcs)
          .map((c) => c.eta)
          .filter((v) => v != null)
        const minPrice = prices.length ? Math.min(...prices) : null
        const minEta = etas.length ? Math.min(...etas) : null
        const tags = []
        if (minPrice != null && calcRow.client_price === minPrice) {
          tags.push(<Tag color="green" key="best-price">Лучшая цена</Tag>)
        }
        if (minEta != null && calcRow.eta === minEta) {
          tags.push(<Tag color="blue" key="best-eta">Быстрее</Tag>)
        }
        return tags.length ? <Space size={[4, 4]} wrap>{tags}</Space> : null
      },
    },
  ]

  return (
    <>
      <Divider orientation="left" style={{ margin: "4px 0" }}>
        Варианты для добавления (чекбоксами можно выбрать несколько)
      </Divider>
      <Space wrap align="center" style={{ marginBottom: 8 }}>
        <Select
          placeholder="Маршрут для быстрых добавлений"
          allowClear
          style={{ minWidth: 220 }}
          value={readyRouteId}
          onChange={setReadyRouteId}
          options={routes.map((r) => ({ value: r.id, label: r.name || `Маршрут #${r.id}` }))}
        />
        <InputNumber
          placeholder="Маржа, %"
          value={readyMarkupPct}
          onChange={setReadyMarkupPct}
          addonAfter={
            <Tooltip title="Процент наценки от себестоимости (цена пост. + логистика + пошлина)">
              <InfoCircleOutlined />
            </Tooltip>
          }
        />
        <InputNumber
          placeholder="Маржа, ед."
          value={readyMarkupAbs}
          onChange={setReadyMarkupAbs}
          addonAfter={
            <Tooltip title="Фиксированная наценка в валюте заказа, прибавляется после процента">
              <InfoCircleOutlined />
            </Tooltip>
          }
        />
        <Button size="small" type="primary" onClick={computeReadyCalcs} loading={readyCalcLoading}>
          Пересчитать варианты
        </Button>
        <Checkbox
          checked={clientVisibleOnAdd}
          onChange={(e) => setClientVisibleOnAdd(e.target.checked)}
          disabled={!canSelect}
        >
          Сразу показывать клиенту (статус «Предложен»)
        </Checkbox>
        <Text type="secondary">Применится ко всем выбранным быстрым офферам.</Text>
      </Space>
      <div
        style={{
          overflowX: "auto",
          border: "1px solid #f0f0f0",
          borderRadius: 8,
          padding: 12,
          background: "#fff",
        }}
      >
        <Table
          rowKey="key"
          size="small"
          className="op-table"
          columns={columns}
          dataSource={dataSource}
          pagination={false}
          loading={bundlesLoading || suggestionsLoading}
          locale={{ emptyText: "Готовых вариантов нет" }}
          rowSelection={{
            selectedRowKeys: selectedVariantKeys,
            onChange: (_, rows) => {
              setSelectedVariantKeys(rows.map((r) => r.key))
              setSelectedVariants(rows)
              setSelectedSuggestions(rows)
            },
          }}
        />
        <div style={{ marginTop: 8, display: "flex", gap: 12, alignItems: "center" }}>
          <Button
            type="primary"
            size="small"
            onClick={onAddSelected}
            disabled={editingDisabled}
          >
            Добавить выбранные ({selectedVariants.length})
          </Button>
          <Text type="secondary">
            Комплект добавляется целиком (по вариантам по умолчанию), деталь — как отдельный оффер.
          </Text>
        </div>
      </div>
    </>
  )
}

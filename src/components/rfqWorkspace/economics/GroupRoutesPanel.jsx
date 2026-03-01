import React from "react"
import { Alert, Button, Card, Divider, Select, Space, Switch, Table, Tag, Typography } from "antd"
import { formatPriceWithCurrency } from "@/utils/priceFormat"

const { Text } = Typography

export default function GroupRoutesPanel({
  groupRoutesError,
  groupRoutes,
  groupRoutesLoading,
  loadCatalogs,
  catalogsLoading,
  loadGroupRoutes,
  handleRecalculateScenario,
  recalcScenarioLoading,
  dutyBasis,
  setDutyBasis,
  routeTemplateOptions,
  assignRouteTemplate,
  openAdhocModal,
  toggleGroupSelected,
  targetCurrency,
  catalogsEmpty,
  catalogsError,
  safeNum,
  pricingModelLabel,
}) {
  const formatUnitCost = (total, divisor, currency) => {
    const totalNum = safeNum(total)
    const divisorNum = safeNum(divisor)
    if (totalNum === null || divisorNum === null || divisorNum <= 0) return "—"
    return formatPriceWithCurrency(totalNum / divisorNum, currency)
  }

  return (
    <Card
      size="small"
      title="Маршруты групп"
      extra={
        <Space wrap>
          <Button size="small" onClick={loadCatalogs} loading={catalogsLoading}>
            Каталоги
          </Button>
          <Button size="small" onClick={() => loadGroupRoutes()} loading={groupRoutesLoading}>
            Обновить
          </Button>
          <Button
            type="primary"
            size="small"
            onClick={handleRecalculateScenario}
            loading={recalcScenarioLoading}
          >
            Пересчитать сценарий
          </Button>
          <Select
            size="small"
            style={{ width: 260 }}
            value={dutyBasis}
            onChange={setDutyBasis}
            options={[
              { value: "GOODS_ONLY", label: "Пошлина: от товара" },
              { value: "CUSTOMS_VALUE", label: "Пошлина: товар + логистика" },
            ]}
          />
        </Space>
      }
    >
      {groupRoutesError ? (
        <Alert type="error" showIcon message={groupRoutesError} />
      ) : !groupRoutes.length ? (
        <Alert type="info" showIcon message="Нет строк маршрутов для сценария" />
      ) : (
        <Table
          rowKey={(r) => `group-route:${r.id}`}
          dataSource={groupRoutes}
          loading={groupRoutesLoading}
          pagination={{ pageSize: 8 }}
          locale={{ emptyText: "Маршруты групп не найдены" }}
          columns={[
            {
              title: "Группа",
              dataIndex: "shipment_group_name",
              render: (v, r) => (
                <Space direction="vertical" size={0}>
                  <Text strong>{v || "—"}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {r.shipment_group_code ? `Код: ${r.shipment_group_code}` : ""}
                  </Text>
                </Space>
              ),
            },
            { title: "Откуда", dataIndex: "from_country", width: 80, render: (v) => v || "—" },
            { title: "Куда", dataIndex: "to_country", width: 80, render: (v) => v || "—" },
            {
              title: "Вес/Объем",
              key: "wv",
              width: 140,
              render: (_, r) => (
                <Space direction="vertical" size={0}>
                  <Text>{safeNum(r.weight_kg) === null ? "Вес: —" : `Вес: ${Number(r.weight_kg)} кг`}</Text>
                  <Text>{safeNum(r.volume_cbm) === null ? "Объем: —" : `Объем: ${Number(r.volume_cbm)} м³`}</Text>
                </Space>
              ),
            },
            {
              title: "Коридор",
              key: "corridor",
              width: 190,
              render: (_, r) => {
                const name = r.corridor_name || "—"
                const mode = r.transport_mode ? String(r.transport_mode) : null
                return (
                  <Space direction="vertical" size={0}>
                    <Text>{name}</Text>
                    {mode ? (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {mode}
                      </Text>
                    ) : null}
                  </Space>
                )
              },
            },
            {
              title: "Маршрут",
              key: "route",
              width: 200,
              render: (_, r) => (
                <Space direction="vertical" size={0}>
                  <Text>{r.route_name_snapshot || r.route_template_name || "—"}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {r.route_source_type === "adhoc" ? "Ad-hoc" : "Шаблон"}
                  </Text>
                </Space>
              ),
            },
            {
              title: "Тариф",
              key: "tariff",
              width: 140,
              render: (_, r) => (
                <Space direction="vertical" size={0}>
                  <Text>{pricingModelLabel(r.pricing_model_snapshot || r.template_pricing_model)}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {r.currency_snapshot || r.template_currency || "—"}
                  </Text>
                </Space>
              ),
            },
            {
              title: "Логистика",
              dataIndex: "logistics_amount_calc",
              width: 130,
              render: (v, r) => formatPriceWithCurrency(v, r.currency_snapshot || r.template_currency || targetCurrency),
            },
            {
              title: "Удельная",
              key: "unit_costs",
              width: 180,
              render: (_, r) => {
                const ccy = r.currency_snapshot || r.template_currency || targetCurrency
                const perKg = formatUnitCost(r.logistics_amount_calc, r.weight_kg, ccy)
                const perCbm = formatUnitCost(r.logistics_amount_calc, r.volume_cbm, ccy)
                return (
                  <Space direction="vertical" size={0}>
                    <Text>{`1 кг: ${perKg === "—" ? "—" : `${perKg}`}`}</Text>
                    <Text type="secondary">{`1 м³: ${perCbm === "—" ? "—" : `${perCbm}`}`}</Text>
                  </Space>
                )
              },
            },
            {
              title: "ETA",
              key: "eta",
              width: 120,
              render: (_, r) => {
                const min = safeNum(r.eta_min_days_calc)
                const max = safeNum(r.eta_max_days_calc)
                if (min === null && max === null) return "—"
                if (min !== null && max !== null && min !== max) return `${min}-${max} дн`
                return `${min ?? max} дн`
              },
            },
            {
              title: "Статус",
              dataIndex: "calc_status",
              width: 110,
              render: (v) => {
                const raw = String(v || "")
                if (raw === "ok") return <Tag color="green">ok</Tag>
                if (raw === "warning") return <Tag color="orange">warning</Tag>
                if (raw === "error") return <Tag color="red">error</Tag>
                if (raw === "draft") return <Tag>draft</Tag>
                return raw || "—"
              },
            },
            {
              title: "В сценарий",
              key: "selected",
              width: 105,
              render: (_, r) => {
                const disabled =
                  (String(r?.route_source_type) === "template" && !r?.route_template_id) ||
                  (String(r?.route_source_type) === "adhoc" &&
                    !Number((r?.route_payload_json || {})?.corridor_id || r?.corridor_id || 0))
                return (
                  <Switch
                    size="small"
                    checked={Number(r?.selected_for_scenario || 0) ? true : false}
                    onChange={(checked) => toggleGroupSelected(r, checked)}
                    disabled={disabled}
                  />
                )
              },
            },
            {
              title: "Действия",
              key: "actions",
              width: 320,
              render: (_, r) => (
                <Space wrap>
                  <Select
                    showSearch
                    optionFilterProp="label"
                    style={{ width: 210 }}
                    placeholder="Назначить шаблон маршрута"
                    options={routeTemplateOptions}
                    value={Number(r?.route_template_id || 0) || undefined}
                    onChange={(val) => assignRouteTemplate(r, val)}
                  />
                  <Button size="small" onClick={() => openAdhocModal(r)}>
                    Ad-hoc
                  </Button>
                </Space>
              ),
            },
          ]}
        />
      )}

      {catalogsEmpty ? (
        <>
          <Divider />
          <Alert
            type="info"
            showIcon
            message="Каталоги маршрутов пока пустые"
            description="Создайте хотя бы один коридор и один шаблон маршрута в каталогах, затем нажмите «Каталоги»."
          />
        </>
      ) : null}

      {catalogsError ? <Divider /> : null}
      {catalogsError ? <Alert type="warning" showIcon message={catalogsError} /> : null}
    </Card>
  )
}

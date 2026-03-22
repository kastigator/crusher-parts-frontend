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
  createDraftRoute,
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

  const groupedRoutes = Array.from(
    groupRoutes.reduce((acc, row) => {
      const key = Number(row?.shipment_group_id || 0)
      if (!acc.has(key)) {
        acc.set(key, {
          shipmentGroupId: key,
          shipmentGroupName: row?.shipment_group_name || "Группа",
          shipmentGroupCode: row?.shipment_group_code || "",
          fromCountry: row?.from_country || null,
          toCountry: row?.to_country || null,
          weightKg: row?.weight_kg,
          volumeCbm: row?.volume_cbm,
          rows: [],
        })
      }
      acc.get(key).rows.push(row)
      return acc
    }, new Map()).values(),
  )

  const routeColumns = [
    {
      title: "Вариант доставки",
      key: "route",
      width: 220,
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Text>{r.route_name_snapshot || r.route_template_name || "—"}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {r.route_source_type === "adhoc" ? "Ручной вариант" : "Из шаблона доставки"}
          </Text>
        </Space>
      ),
    },
    {
      title: "Направление",
      key: "direction",
      width: 190,
      render: (_, r) => {
        const from = r.corridor_origin_country || r.from_country || null
        const to = r.corridor_destination_country || r.to_country || null
        const name = from && to ? `${from} → ${to}` : "—"
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
        if (raw === "ok") return <Tag color="green">OK</Tag>
        if (raw === "warning") return <Tag color="orange">Предупреждение</Tag>
        if (raw === "error") return <Tag color="red">Ошибка</Tag>
        if (raw === "draft") return <Tag>Черновик</Tag>
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
            !String((r?.route_payload_json || {})?.transport_mode || r?.transport_mode || "").trim())
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
      width: 420,
      render: (_, r) => (
        <Space wrap>
          <Select
            showSearch
            optionFilterProp="label"
            style={{ width: 210 }}
            placeholder="Назначить шаблон доставки"
            options={routeTemplateOptions}
            value={Number(r?.route_template_id || 0) || undefined}
            onChange={(val) => assignRouteTemplate(r, val)}
          />
          <Button size="small" onClick={() => openAdhocModal(r)}>
            Ручной вариант
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <Card
      size="small"
      title="Варианты доставки"
      extra={
        <Space wrap>
          <Button size="small" onClick={loadCatalogs} loading={catalogsLoading}>
            Шаблоны доставки
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
        <Alert type="info" showIcon message="Нет вариантов доставки для сценария" />
      ) : (
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Alert
            type="info"
            showIcon
            message="Сначала формируются группы отгрузки, затем для каждой группы можно завести несколько вариантов доставки и выбрать один для расчета сценария."
          />
          {groupedRoutes.map((group) => (
            <Card
              key={`shipment-group:${group.shipmentGroupId}`}
              size="small"
              type="inner"
              title={group.shipmentGroupName}
              extra={
                <Space wrap>
                  {group.shipmentGroupCode ? <Tag>{`Код: ${group.shipmentGroupCode}`}</Tag> : null}
                  <Tag>{`Откуда: ${group.fromCountry || "не указано"}`}</Tag>
                  <Tag>{`Куда: ${group.toCountry || "не указано"}`}</Tag>
                  <Tag>{safeNum(group.weightKg) === null ? "Вес: —" : `Вес: ${Number(group.weightKg)} кг`}</Tag>
                  <Tag>{safeNum(group.volumeCbm) === null ? "Объем: —" : `Объем: ${Number(group.volumeCbm)} м³`}</Tag>
                  <Button size="small" onClick={() => createDraftRoute(group.rows[0])}>
                    Новый вариант доставки
                  </Button>
                </Space>
              }
            >
              <Table
                rowKey={(r) => `group-route:${r.id}`}
                dataSource={group.rows}
                pagination={false}
                size="small"
                scroll={{ x: 1450 }}
                locale={{ emptyText: "Варианты доставки для группы не найдены" }}
                columns={routeColumns}
              />
            </Card>
          ))}
        </Space>
      )}

      {catalogsEmpty ? (
        <>
          <Divider />
          <Alert
            type="info"
            showIcon
            message="Шаблоны доставки пока не подготовлены"
            description="Создайте хотя бы один шаблон доставки в каталогах, затем вернитесь и выберите его для группы."
          />
        </>
      ) : null}

      {catalogsError ? <Divider /> : null}
      {catalogsError ? <Alert type="warning" showIcon message={catalogsError} /> : null}
    </Card>
  )
}

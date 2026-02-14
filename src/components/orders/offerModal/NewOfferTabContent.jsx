import React from "react"
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Descriptions,
  Input,
  InputNumber,
  Select,
  Space,
  Tooltip,
  Typography,
} from "antd"
import { InfoCircleOutlined } from "@ant-design/icons"
import CurrencySelect from "@/components/inputs/CurrencySelect"
import {
  fmtMoney,
  normalizeOfferStatus,
  OFFER_STATUS_META,
  statusMakesVisible,
} from "@/components/orders/offerModal/offerModalUtils"

const { Text } = Typography

export default function NewOfferTabContent({
  canEditOffers,
  formValues,
  setFormValues,
  editingDisabled,
  setSupplierPartPickerOpen,
  materialsLoading,
  materials,
  routes,
  linkWhenAdding,
  setLinkWhenAdding,
  handleAdd,
  adding,
  calc,
  calcLoading,
  handleCalculate,
  item,
}) {
  if (!canEditOffers) {
    return <Alert type="warning" message="Добавление офферов недоступно для вашей роли" />
  }

  return (
    <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
      <Space direction="vertical" style={{ flex: 1, minWidth: 620 }} size="middle">
        <Space wrap>
          <Input
            placeholder="Деталь поставщика (выберите через поиск)"
            value={
              formValues.supplier_part_id
                ? `Выбрана деталь: ${formValues.supplier_part_number || formValues.supplier_part_id}${
                    formValues.supplier_part_description
                      ? ` — ${formValues.supplier_part_description}`
                      : ""
                  }`
                : ""
            }
            readOnly
            style={{ width: 320 }}
          />
          <Button onClick={() => setSupplierPartPickerOpen(true)} disabled={editingDisabled}>
            Найти деталь поставщика
          </Button>
          <InputNumber
            placeholder="Цена пост."
            value={formValues.supplier_price}
            onChange={(v) => setFormValues((prev) => ({ ...prev, supplier_price: v }))}
          />
          <CurrencySelect
            value={formValues.supplier_currency}
            onChange={(v) =>
              setFormValues((prev) => ({
                ...prev,
                supplier_currency: v || null,
              }))
            }
            style={{ minWidth: 120 }}
          />
          <InputNumber
            placeholder="Срок, дн."
            value={formValues.lead_time_days}
            onChange={(v) => setFormValues((prev) => ({ ...prev, lead_time_days: v }))}
          />
          <InputNumber
            placeholder="MOQ"
            value={formValues.moq}
            onChange={(v) => setFormValues((prev) => ({ ...prev, moq: v }))}
          />
        </Space>
        <Space wrap>
          <Input
            placeholder="Упаковка"
            style={{ width: 200 }}
            value={formValues.packaging}
            onChange={(e) => setFormValues((prev) => ({ ...prev, packaging: e.target.value }))}
          />
          <Select
            placeholder="Материал"
            allowClear
            loading={materialsLoading}
            style={{ minWidth: 200 }}
            value={formValues.material_id || undefined}
            onChange={(v) =>
              setFormValues((prev) => ({
                ...prev,
                material_id: v || null,
              }))
            }
            options={materials.map((m) => ({
              value: m.material_id,
              label: m.material_name || m.material_code || m.material_id,
            }))}
          />
          <InputNumber
            placeholder="Маржа, %"
            value={formValues.markup_pct}
            onChange={(v) => setFormValues((prev) => ({ ...prev, markup_pct: v }))}
            addonAfter={
              <Tooltip title="Процент наценки от себестоимости (цена пост. + логистика + пошлина)">
                <InfoCircleOutlined />
              </Tooltip>
            }
            style={{ minWidth: 180 }}
          />
          <InputNumber
            placeholder="Маржа, ед."
            value={formValues.markup_abs}
            onChange={(v) => setFormValues((prev) => ({ ...prev, markup_abs: v }))}
            addonAfter={
              <Tooltip title="Фиксированная наценка в валюте заказа, прибавляется после процента">
                <InfoCircleOutlined />
              </Tooltip>
            }
            style={{ minWidth: 180 }}
          />
          <Select
            placeholder="Маршрут"
            allowClear
            style={{ width: 200 }}
            value={formValues.logistics_route_id}
            onChange={(v) => setFormValues((prev) => ({ ...prev, logistics_route_id: v }))}
            options={routes.map((r) => ({
              value: r.id,
              label: r.name || `Маршрут #${r.id}`,
            }))}
            suffixIcon={
              <Tooltip title="Тариф/стоимость и надбавки маршрута попадут в логистику и ETA">
                <InfoCircleOutlined />
              </Tooltip>
            }
          />
          <InputNumber
            placeholder="Логистика"
            value={formValues.logistics_cost}
            onChange={(v) => setFormValues((prev) => ({ ...prev, logistics_cost: v }))}
          />
          <CurrencySelect
            value={formValues.logistics_currency}
            onChange={(v) =>
              setFormValues((prev) => ({
                ...prev,
                logistics_currency: v || null,
              }))
            }
            style={{ minWidth: 140 }}
          />
          <CurrencySelect
            value={formValues.client_currency}
            onChange={(v) =>
              setFormValues((prev) => ({
                ...prev,
                client_currency: v || null,
              }))
            }
            style={{ minWidth: 140 }}
            placeholder="Валюта клиента"
          />
          <Select
            value={formValues.status}
            style={{ width: 180 }}
            onChange={(v) => {
              const nextStatus = normalizeOfferStatus(v)
              setFormValues((prev) => ({
                ...prev,
                status: nextStatus,
                client_visible: statusMakesVisible(nextStatus),
              }))
            }}
            options={Object.entries(OFFER_STATUS_META).map(([value, m]) => ({
              value,
              label: m.label,
            }))}
          />
          <Checkbox checked={linkWhenAdding} onChange={(e) => setLinkWhenAdding(e.target.checked)}>
            Привязать к оригиналу
          </Checkbox>
          <Checkbox
            checked={!!formValues.client_visible}
            onChange={(e) => {
              const visible = e.target.checked
              setFormValues((prev) => {
                const currentStatus = normalizeOfferStatus(prev.status)
                const nextStatus = visible
                  ? currentStatus === "approved"
                    ? "approved"
                    : "proposed"
                  : currentStatus === "approved"
                    ? "approved"
                    : "draft"
                return {
                  ...prev,
                  status: nextStatus,
                  client_visible: visible,
                }
              })
            }}
          >
            Показать клиенту (статус «Предложен»)
          </Checkbox>
          <Button
            type="primary"
            onClick={handleAdd}
            loading={adding}
            disabled={!formValues.supplier_part_id || editingDisabled}
          >
            Добавить оффер
          </Button>
        </Space>
        <Input.TextArea
          rows={2}
          placeholder="Внутренний комментарий"
          value={formValues.comment_internal}
          onChange={(e) =>
            setFormValues((prev) => ({ ...prev, comment_internal: e.target.value }))
          }
        />
        <Input.TextArea
          rows={2}
          placeholder="Комментарий для клиента"
          value={formValues.comment_client}
          onChange={(e) =>
            setFormValues((prev) => ({ ...prev, comment_client: e.target.value }))
          }
        />
      </Space>
      <Card
        size="small"
        title="Калькулятор цены"
        style={{ minWidth: 300, maxWidth: 360 }}
        extra={
          <Button size="small" type="primary" onClick={handleCalculate} loading={calcLoading}>
            Пересчитать
          </Button>
        }
      >
        <Space direction="vertical" size={8} style={{ width: "100%" }}>
          <Text type="secondary">
            Использует цену пост., логистику, маршрут (наценка), ТН ВЭД: {item?.tnved_code_value || "—"}.
            Маржа % от себестоимости (пост.+логистика+пошлина), маржа ед. добавляется сверху.
          </Text>
          {calc ? (
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="Целевая валюта">
                {calc.target_currency || item?.order_currency || "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Пост. в целевой">
                {fmtMoney(calc.supplier.converted, calc.target_currency)}
                {calc.supplier.fx_rate ? ` (FX ${calc.supplier.fx_rate})` : ""}
              </Descriptions.Item>
              <Descriptions.Item label="Логистика (с надб.)">
                {fmtMoney(calc.logistics.converted, calc.target_currency)}
              </Descriptions.Item>
              <Descriptions.Item label="Пошлина">
                {calc.duty_amount != null
                  ? `${fmtMoney(calc.duty_amount, calc.target_currency)} (${calc.duty_rate || 0}%)`
                  : "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Себестоимость">
                {fmtMoney(calc.landed_cost, calc.target_currency)}
              </Descriptions.Item>
              <Descriptions.Item label="Маржа">
                {calc.markup_pct != null ? `${calc.markup_pct || 0}%` : ""}{" "}
                {calc.markup_abs != null && `+ ${fmtMoney(calc.markup_abs, calc.target_currency)}`}
              </Descriptions.Item>
              <Descriptions.Item label="Цена клиенту">
                {fmtMoney(calc.client_price, calc.target_currency)}
              </Descriptions.Item>
              <Descriptions.Item label="ETA">
                {calc.eta != null ? `${calc.eta} дн.` : "—"}
              </Descriptions.Item>
            </Descriptions>
          ) : (
            <Text type="secondary">
              Заполните цену, логистику и нажмите «Пересчитать», чтобы увидеть цепочку.
            </Text>
          )}
        </Space>
      </Card>
    </div>
  )
}

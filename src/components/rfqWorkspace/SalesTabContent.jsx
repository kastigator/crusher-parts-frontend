import React, { useMemo, useState } from "react"
import { Alert, Button, Card, Drawer, Form, Select, Space, Table, Tag, Typography, message } from "antd"
import axios from "@/api/axiosInstance"
import { formatPriceWithCurrency } from "@/utils/priceFormat"

const { Text } = Typography

const quoteStatusOptions = [
  { value: "draft", label: "Черновик" },
  { value: "internal_review", label: "Внутреннее согласование" },
  { value: "sent_to_client", label: "Отправлено клиенту" },
  { value: "client_approved", label: "Согласовано клиентом" },
  { value: "contract_signed", label: "Контракт подписан" },
]

const quoteStatusLabel = (value) =>
  ({
    draft: "Черновик",
    internal_review: "Внутреннее согласование",
    sent_to_client: "Отправлено клиенту",
    client_approved: "Согласовано клиентом",
    contract_signed: "Контракт подписан",
  }[String(value || "").trim()] || value || "—")

export default function SalesTabContent({
  activeRfq,
  selections,
  salesQuotes,
  formatDate,
  onCommercialUpdated,
}) {
  const [creating, setCreating] = useState(false)
  const [updatingQuoteId, setUpdatingQuoteId] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerQuote, setDrawerQuote] = useState(null)
  const [revisions, setRevisions] = useState([])
  const [selectedRevisionId, setSelectedRevisionId] = useState(null)
  const [revisionLines, setRevisionLines] = useState([])
  const [loadingRevisions, setLoadingRevisions] = useState(false)
  const [loadingLines, setLoadingLines] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [form] = Form.useForm()

  const selectionOptions = useMemo(
    () =>
      (Array.isArray(selections) ? selections : []).map((row) => ({
        value: Number(row.id),
        label: `Выбор #${row.id} · ${row.status || "draft"} · ${formatPriceWithCurrency(
          row.landed_total,
          row.calc_currency || "USD"
        )}`,
      })),
    [selections]
  )

  const handleCreateQuote = async (values) => {
    const revisionId = Number(activeRfq?.client_request_revision_id || 0) || null
    if (!revisionId) {
      message.warning("У RFQ нет привязанной ревизии заявки клиента")
      return
    }
    setCreating(true)
    try {
      await axios.post("/sales-quotes", {
        client_request_revision_id: revisionId,
        selection_id: values.selection_id,
        status: values.status || "draft",
        currency: values.currency || "USD",
        auto_create_revision: true,
        autofill_from_selection: true,
      })
      message.success("КП создано и передано на сторону продавца")
      form.resetFields()
      if (typeof onCommercialUpdated === "function") {
        await onCommercialUpdated()
      }
    } catch (e) {
      message.error(e?.response?.data?.message || "Не удалось создать КП")
    } finally {
      setCreating(false)
    }
  }

  const updateQuoteStatus = async (quoteId, status) => {
    setUpdatingQuoteId(Number(quoteId))
    try {
      await axios.patch(`/sales-quotes/${quoteId}`, { status })
      message.success("Статус КП обновлён")
      if (typeof onCommercialUpdated === "function") {
        await onCommercialUpdated()
      }
    } catch (e) {
      message.error(e?.response?.data?.message || "Не удалось обновить статус КП")
    } finally {
      setUpdatingQuoteId(null)
    }
  }

  const loadRevisionLines = async (revisionIdOverride) => {
    const revisionId = Number(revisionIdOverride || selectedRevisionId || 0) || null
    if (!revisionId) {
      setRevisionLines([])
      return
    }
    setLoadingLines(true)
    try {
      const { data } = await axios.get(`/sales-quotes/revisions/${revisionId}/lines`)
      setRevisionLines(Array.isArray(data) ? data : [])
    } catch (e) {
      setRevisionLines([])
      message.error(e?.response?.data?.message || "Не удалось загрузить строки ревизии КП")
    } finally {
      setLoadingLines(false)
    }
  }

  const openQuoteDrawer = async (quote) => {
    const quoteId = Number(quote?.id || 0) || null
    if (!quoteId) return
    setDrawerQuote(quote)
    setDrawerOpen(true)
    setLoadingRevisions(true)
    try {
      const { data } = await axios.get(`/sales-quotes/${quoteId}/revisions`)
      const rows = Array.isArray(data) ? data : []
      setRevisions(rows)
      const latestRevisionId = Number(rows?.[0]?.id || 0) || null
      setSelectedRevisionId(latestRevisionId)
      await loadRevisionLines(latestRevisionId)
    } catch (e) {
      setRevisions([])
      setSelectedRevisionId(null)
      setRevisionLines([])
      message.error(e?.response?.data?.message || "Не удалось загрузить ревизии КП")
    } finally {
      setLoadingRevisions(false)
    }
  }

  const selectedRevision = useMemo(
    () => revisions.find((row) => Number(row?.id || 0) === Number(selectedRevisionId || 0)) || null,
    [revisions, selectedRevisionId]
  )

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <Alert
        type="info"
        showIcon
        message="КП создаётся из утверждённого выбора закупки и уходит продавцу"
        description="Закупщик передаёт продавцу базовую закупочную модель из выбора закупки. Дальше продавец должен работать через коммерческие rev КП: маржа, уступки клиенту и переговоры уже не меняют сам выбор закупки."
      />

      <Card
        size="small"
        title="Создать черновик КП из выбора закупки"
        extra={
          <Button size="small" onClick={() => setHelpOpen(true)}>
            Справка
          </Button>
        }
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ status: "draft", currency: "USD" }}
          onFinish={handleCreateQuote}
        >
          <Space wrap align="start">
            <Form.Item
              name="selection_id"
              label="Выбор закупки"
              rules={[{ required: true, message: "Выберите выбор закупки" }]}
            >
              <Select style={{ width: 420 }} options={selectionOptions} />
            </Form.Item>
            <Form.Item name="status" label="Статус КП">
              <Select style={{ width: 180 }} options={quoteStatusOptions} />
            </Form.Item>
            <Form.Item name="currency" label="Валюта">
              <Select
                style={{ width: 120 }}
                options={[
                  { value: "USD", label: "USD" },
                  { value: "EUR", label: "EUR" },
                  { value: "RUB", label: "RUB" },
                ]}
              />
            </Form.Item>
          </Space>
          <Button type="primary" htmlType="submit" loading={creating}>
            Создать КП и передать продавцу
          </Button>
        </Form>
      </Card>

      <Card
        size="small"
        title="Что получает продавец"
        extra={<span style={{ color: "#666", fontSize: 12 }}>Переход из закупки в коммерческий контур</span>}
      >
        <Space direction="vertical" size={6} style={{ width: "100%" }}>
          <span>1. Утверждённый выбор закупки как базовая закупочная модель.</span>
          <span>2. Базовая себестоимость по строкам и по заказу.</span>
          <span>3. Публичные коды поставщиков вместо внутренних названий.</span>
          <span>4. Дальше уже коммерческие rev КП: цена продажи, маржа, уступки клиенту.</span>
        </Space>
      </Card>

      <Card
        size="small"
        title="Коммерческие предложения по RFQ"
        extra={
          <Button size="small" onClick={onCommercialUpdated}>
            Обновить
          </Button>
        }
        >
          <Table
          rowKey="id"
          dataSource={salesQuotes}
          pagination={{ pageSize: 10, hideOnSinglePage: true }}
          columns={[
            { title: "КП", width: 90, render: (_, row) => `#${row.id}` },
            { title: "Выбор", dataIndex: "selection_id", width: 100, render: (value) => value || "—" },
            {
              title: "База",
              width: 160,
              render: (_, row) => (
                <Tag color="blue">
                  {row.selection_id ? `из выбора #${row.selection_id}` : "ручное КП"}
                </Tag>
              ),
            },
            {
              title: "Статус",
              width: 220,
              render: (_, row) => (
                <Select
                  size="small"
                  style={{ width: 180 }}
                  value={row.status || "draft"}
                  options={quoteStatusOptions}
                  loading={updatingQuoteId === Number(row.id)}
                  onChange={(value) => updateQuoteStatus(row.id, value)}
                />
              ),
            },
            { title: "Последняя rev", dataIndex: "latest_revision_number", width: 110, render: (value) => value || "—" },
            {
              title: "Себестоимость",
              width: 140,
              render: (_, row) => formatPriceWithCurrency(row.total_cost, row.currency || "USD"),
            },
            {
              title: "Продажа",
              width: 140,
              render: (_, row) => formatPriceWithCurrency(row.total_sell, row.currency || "USD"),
            },
            {
              title: "Маржа",
              width: 100,
              render: (_, row) => `${Number(row.margin_pct_avg || 0).toFixed(1)}%`,
            },
            {
              title: "Создано",
              dataIndex: "created_at",
              width: 120,
              render: formatDate,
            },
            {
              title: "Этап",
              width: 150,
              render: (_, row) => (
                <Tag color={row.status === "sent_to_client" ? "green" : "blue"}>
                  {row.status === "sent_to_client" ? "У клиента" : "У продавца"}
                </Tag>
              ),
            },
            {
              title: "Детали",
              width: 120,
              render: (_, row) => (
                <Button size="small" onClick={() => openQuoteDrawer(row)}>
                  Открыть
                </Button>
              ),
            },
          ]}
        />
      </Card>

      <Drawer
        title={drawerQuote ? `КП #${drawerQuote.id}` : "Коммерческое предложение"}
        placement="right"
        width={980}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          {drawerQuote ? (
            <Space wrap>
              <Tag>Выбор: {drawerQuote.selection_id || "—"}</Tag>
              <Tag color="blue">Себестоимость: {formatPriceWithCurrency(drawerQuote.total_cost, drawerQuote.currency || "USD")}</Tag>
              <Tag color="green">Продажа: {formatPriceWithCurrency(drawerQuote.total_sell, drawerQuote.currency || "USD")}</Tag>
              <Tag color="gold">Маржа: {Number(drawerQuote.margin_pct_avg || 0).toFixed(1)}%</Tag>
              <Tag>{quoteStatusLabel(drawerQuote.status)}</Tag>
            </Space>
          ) : null}

          <Card size="small" title="Ревизии КП">
            <Table
              size="small"
              rowKey="id"
              loading={loadingRevisions}
              dataSource={revisions}
              pagination={false}
              columns={[
                { title: "Rev", dataIndex: "rev_number", width: 80 },
                { title: "Создано", dataIndex: "created_at", width: 120, render: formatDate },
                { title: "Себестоимость", width: 140, render: (_, row) => formatPriceWithCurrency(row.total_cost, drawerQuote?.currency || "USD") },
                { title: "Продажа", width: 140, render: (_, row) => formatPriceWithCurrency(row.total_sell, drawerQuote?.currency || "USD") },
                { title: "Маржа", width: 100, render: (_, row) => `${Number(row.margin_pct_avg || 0).toFixed(1)}%` },
                { title: "Комментарий", dataIndex: "note" },
                {
                  title: "Открыть",
                  width: 100,
                  render: (_, row) => (
                    <Button
                      size="small"
                      type={Number(selectedRevisionId || 0) === Number(row.id) ? "primary" : "default"}
                      onClick={() => {
                        setSelectedRevisionId(Number(row.id))
                        loadRevisionLines(Number(row.id))
                      }}
                    >
                      Выбрать
                    </Button>
                  ),
                },
              ]}
            />
          </Card>

          <Card
            size="small"
            title={selectedRevision ? `Строки rev ${selectedRevision.rev_number}` : "Строки ревизии"}
            extra={<Text type="secondary">Продавец должен видеть коды поставщиков, базовую себестоимость и цену продажи.</Text>}
          >
            <Table
              size="small"
              rowKey="id"
              loading={loadingLines}
              dataSource={revisionLines}
              pagination={{ pageSize: 10, hideOnSinglePage: true }}
              columns={[
                {
                  title: "Строка клиента",
                  render: (_, row) => (
                    <Space direction="vertical" size={0}>
                      <span>{row.original_cat_number || row.client_part_number || `Строка #${row.client_request_revision_item_id}`}</span>
                      {row.client_description ? <span style={{ color: "#666", fontSize: 12 }}>{row.client_description}</span> : null}
                    </Space>
                  ),
                },
                {
                  title: "Коды поставщиков",
                  width: 180,
                  render: (_, row) => row.supplier_public_codes ? <Tag color="blue">{row.supplier_public_codes}</Tag> : "—",
                },
                { title: "Кол-во", dataIndex: "qty", width: 80 },
                { title: "Себестоимость", width: 120, render: (_, row) => formatPriceWithCurrency(row.cost, row.currency || drawerQuote?.currency || "USD") },
                { title: "Продажа", width: 120, render: (_, row) => formatPriceWithCurrency(row.sell_price, row.currency || drawerQuote?.currency || "USD") },
                { title: "Маржа %", width: 100, render: (_, row) => row.margin_pct ?? "—" },
                {
                  title: "Прайсинг",
                  width: 120,
                  render: (_, row) => <Tag>{row.pricing_status || "—"}</Tag>,
                },
              ]}
            />
          </Card>
        </Space>
      </Drawer>

      <Drawer
        title="Справка по вкладке «Коммерческие предложения»"
        placement="right"
        width={440}
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
      >
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Typography.Paragraph>
            Эта вкладка завершает закупочный контур и передает продавцу базовую закупочную модель из утвержденного выбора
            закупки.
          </Typography.Paragraph>
          <Typography.Paragraph>
            Продавец видит коды поставщиков, себестоимость и коммерческие rev КП, но не должен менять сам
            закупочный baseline через этот экран.
          </Typography.Paragraph>
          <Typography.Paragraph style={{ marginBottom: 0 }}>
            После торга с клиентом именно коммерческая ревизия и ее контракт определяют, что дальше пойдет
            в PO поставщику.
          </Typography.Paragraph>
        </Space>
      </Drawer>
    </Space>
  )
}

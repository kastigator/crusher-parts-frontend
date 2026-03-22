import React, { useEffect, useMemo, useState } from "react"
import { Alert, Button, Card, Drawer, Form, Select, Space, Table, Tag, Typography, message } from "antd"
import axios from "@/api/axiosInstance"
import { formatPriceWithCurrency } from "@/utils/priceFormat"
import CompanyLegalSummary from "@/components/common/CompanyLegalSummary"
import useCapabilities from "@/hooks/useCapabilities"

const formatDate = (value) => {
  if (!value) return "—"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("ru-RU")
}

const parseSnapshot = (value) => {
  if (!value) return null
  if (typeof value === "object") return value
  try {
    return JSON.parse(value)
  } catch (_e) {
    return null
  }
}

export default function RequestQuoteTabContent({ requestId, activeRevisionId }) {
  const { can } = useCapabilities()
  const canManageSalesQuotes = can("workflow.sales_quotes.manage")
  const [quotes, setQuotes] = useState([])
  const [selections, setSelections] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [creatingRevision, setCreatingRevision] = useState(false)
  const [updatingQuoteId, setUpdatingQuoteId] = useState(null)
  const [selectedQuoteId, setSelectedQuoteId] = useState(null)
  const [quoteRevisions, setQuoteRevisions] = useState([])
  const [helpOpen, setHelpOpen] = useState(false)
  const [form] = Form.useForm()
  const quoteStatusLabel = (value) =>
    ({
      draft: "Черновик",
      internal_review: "Внутреннее согласование",
      sent_to_client: "Отправлено клиенту",
      client_approved: "Согласовано клиентом",
      contract_signed: "Контракт подписан",
    }[String(value || "").trim()] || value || "—")
  const quoteStatusOptions = [
    { value: "draft", label: "Черновик" },
    { value: "internal_review", label: "Внутреннее согласование" },
    { value: "sent_to_client", label: "Отправлено клиенту" },
    { value: "client_approved", label: "Согласовано клиентом" },
    { value: "contract_signed", label: "Контракт подписан" },
  ]

  const loadData = async () => {
    if (!requestId) return
    setLoading(true)
    try {
      const [{ data: quotesData }, { data: selectionsData }] = await Promise.all([
        axios.get("/sales-quotes", { params: { request_id: requestId } }),
        axios.get("/selection", { params: { request_id: requestId } }),
      ])
      const quoteRows = Array.isArray(quotesData) ? quotesData : []
      const selectionRows = Array.isArray(selectionsData) ? selectionsData : []
      setQuotes(quoteRows)
      setSelections(selectionRows)
      setSelectedQuoteId((prev) => prev || Number(quoteRows?.[0]?.id || 0) || null)
    } catch (e) {
      message.error(e?.response?.data?.message || "Не удалось загрузить данные по КП")
      setQuotes([])
      setSelections([])
    } finally {
      setLoading(false)
    }
  }

  const loadRevisions = async (quoteIdOverride) => {
    const quoteId = Number(quoteIdOverride || selectedQuoteId || 0) || null
    if (!quoteId) {
      setQuoteRevisions([])
      return
    }
    try {
      const { data } = await axios.get(`/sales-quotes/${quoteId}/revisions`)
      setQuoteRevisions(Array.isArray(data) ? data : [])
    } catch (e) {
      setQuoteRevisions([])
      message.error(e?.response?.data?.message || "Не удалось загрузить ревизии КП")
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId])

  useEffect(() => {
    loadRevisions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedQuoteId])

  const selectionOptions = useMemo(
    () =>
      selections.map((row) => ({
        value: Number(row.id),
        label: `Выбор #${row.id} · ${formatDate(row.selected_at || row.created_at)} · ${formatPriceWithCurrency(
          row.landed_total,
          row.calc_currency || "USD"
        )}`,
      })),
    [selections]
  )
  const selectedQuote = useMemo(
    () => quotes.find((row) => Number(row.id) === Number(selectedQuoteId || 0)) || null,
    [quotes, selectedQuoteId]
  )
  const selectedQuoteProfile = parseSnapshot(selectedQuote?.company_legal_snapshot_json)

  const handleCreateQuote = async (values) => {
    if (!requestId || !activeRevisionId) {
      message.warning("Сначала выберите актуальную ревизию заявки")
      return
    }
    setSaving(true)
    try {
      const { data } = await axios.post("/sales-quotes", {
        client_request_revision_id: activeRevisionId,
        selection_id: values.selection_id,
        status: values.status || "draft",
        currency: values.currency || "USD",
        auto_create_revision: true,
        autofill_from_selection: true,
      })
      message.success(data?.message || "КП создано")
      form.resetFields()
      await loadData()
    } catch (e) {
      message.error(e?.response?.data?.message || "Не удалось создать КП")
    } finally {
      setSaving(false)
    }
  }

  const handleCreateRevision = async () => {
    const quoteId = Number(selectedQuoteId || 0) || null
    if (!quoteId) return
    setCreatingRevision(true)
    try {
      const { data } = await axios.post(`/sales-quotes/${quoteId}/revisions`, {
        note: "Новая коммерческая ревизия",
        copy_previous: true,
      })
      message.success(data?.message || "Ревизия КП создана")
      await loadRevisions(quoteId)
    } catch (e) {
      message.error(e?.response?.data?.message || "Не удалось создать ревизию КП")
    } finally {
      setCreatingRevision(false)
    }
  }

  const handleUpdateQuoteStatus = async (quoteId, status) => {
    setUpdatingQuoteId(Number(quoteId))
    try {
      await axios.patch(`/sales-quotes/${quoteId}`, { status })
      message.success("Статус КП обновлён")
      await loadData()
      await loadRevisions(quoteId)
    } catch (e) {
      message.error(e?.response?.data?.message || "Не удалось обновить статус КП")
    } finally {
      setUpdatingQuoteId(null)
    }
  }

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <CompanyLegalSummary
        profile={selectedQuoteProfile}
        title={selectedQuoteProfile ? "Реквизиты, зафиксированные в выбранном КП" : "Реквизиты нашего юрлица"}
        description={
          selectedQuoteProfile
            ? `В КП #${selectedQuote?.id} зафиксирована версия реквизитов с ${selectedQuoteProfile.effective_from}.`
            : undefined
        }
      />

      <Alert
        type="info"
        showIcon
        message="КП строится от утвержденного выбора закупки"
        description="После утверждения закупочного выбора продавец создает черновик КП по текущей ревизии заявки и дальше ведет коммерческие ревизии уже в коммерческом контуре."
      />

      <Card
        size="small"
        title="Создать КП из выбора закупки"
        extra={
          <Button size="small" onClick={() => setHelpOpen(true)}>
            Справка
          </Button>
        }
      >
        <Form form={form} layout="vertical" onFinish={handleCreateQuote} initialValues={{ status: "draft", currency: "USD" }}>
          <Space wrap align="start">
            <Form.Item name="selection_id" label="Выбор закупки" rules={[{ required: true }]}>
              <Select style={{ width: 420 }} options={selectionOptions} />
            </Form.Item>
            <Form.Item name="status" label="Статус">
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
          <Button type="primary" htmlType="submit" loading={saving} disabled={!activeRevisionId || !canManageSalesQuotes}>
            Создать черновик КП
          </Button>
        </Form>
      </Card>

      <Card
        size="small"
        title="КП по заявке"
        extra={
          <Space>
            <Select
              allowClear
              style={{ width: 280 }}
              placeholder="Выберите КП"
              value={selectedQuoteId || undefined}
              onChange={(value) => setSelectedQuoteId(Number(value || 0) || null)}
              options={quotes.map((row) => ({
                value: Number(row.id),
                label: `КП #${row.id} · ревизия заявки ${row.rev_number ?? "?"} · ${quoteStatusLabel(row.status)}`,
              }))}
            />
            <Button onClick={handleCreateRevision} loading={creatingRevision} disabled={!selectedQuoteId || !canManageSalesQuotes}>
              Новая ревизия КП
            </Button>
          </Space>
        }
      >
        <Table
          rowKey="id"
          loading={loading}
          dataSource={quotes}
          pagination={false}
          columns={[
            { title: "КП", width: 90, render: (_, row) => `#${row.id}` },
            {
              title: "Статус",
              width: 200,
              render: (_, row) => (
                <Select
                  size="small"
                  style={{ width: 180 }}
                  value={row.status || "draft"}
                  loading={updatingQuoteId === Number(row.id)}
                  disabled={!canManageSalesQuotes}
                  onChange={(value) => handleUpdateQuoteStatus(row.id, value)}
                  options={quoteStatusOptions}
                />
              ),
            },
            { title: "Ревизия заявки", dataIndex: "rev_number", width: 120 },
            {
              title: "Последняя ревизия КП",
              dataIndex: "latest_revision_number",
              width: 150,
              render: (value) => value || "—",
            },
            { title: "Себестоимость", width: 140, render: (_, row) => formatPriceWithCurrency(row.total_cost, row.currency || "USD") },
            { title: "Продажа", width: 140, render: (_, row) => formatPriceWithCurrency(row.total_sell, row.currency || "USD") },
            { title: "Маржа", width: 100, render: (_, row) => `${Number(row.margin_pct_avg || 0).toFixed(1)}%` },
            { title: "Создано", dataIndex: "created_at", width: 120, render: formatDate },
          ]}
        />

        {selectedQuoteId ? (
          <div style={{ marginTop: 12 }}>
            <strong>Ревизии выбранного КП</strong>
            <Table
              size="small"
              style={{ marginTop: 8 }}
              rowKey="id"
              dataSource={quoteRevisions}
              pagination={false}
              columns={[
                { title: "Ревизия", dataIndex: "rev_number", width: 90 },
                { title: "Себестоимость", width: 140, render: (_, row) => formatPriceWithCurrency(row.total_cost, selectedQuote?.currency || "USD") },
                { title: "Продажа", width: 140, render: (_, row) => formatPriceWithCurrency(row.total_sell, selectedQuote?.currency || "USD") },
                { title: "Маржа", width: 100, render: (_, row) => `${Number(row.margin_pct_avg || 0).toFixed(1)}%` },
                {
                  title: "Срез",
                  width: 110,
                  render: (_, row) => (
                    <Tag color={row.rev_number === selectedQuote?.latest_revision_number ? "green" : "default"}>
                      {row.rev_number === selectedQuote?.latest_revision_number ? "актуальная" : "архив"}
                    </Tag>
                  ),
                },
                { title: "Создано", dataIndex: "created_at", width: 120, render: formatDate },
                { title: "Комментарий", dataIndex: "note" },
              ]}
            />
          </div>
        ) : null}
      </Card>

      <Drawer
        title="Справка по вкладке «КП»"
        placement="right"
        width={440}
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
      >
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Typography.Paragraph>
            Здесь продавец получает базовую закупочную модель и создает коммерческое предложение клиенту по
            текущей ревизии заявки.
          </Typography.Paragraph>
          <Typography.Paragraph>
            Новые ревизии КП нужны для торга: можно пересматривать цену, состав и условия, не меняя исходный
            закупочный выбор.
          </Typography.Paragraph>
          <Typography.Paragraph style={{ marginBottom: 0 }}>
            После согласования клиента процесс переходит во вкладку контрактов, где фиксируется уже
            конкретная коммерческая ревизия.
          </Typography.Paragraph>
        </Space>
      </Drawer>
    </Space>
  )
}

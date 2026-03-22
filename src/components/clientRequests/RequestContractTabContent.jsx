import React, { useEffect, useMemo, useState } from "react"
import { Alert, Button, Card, DatePicker, Drawer, Form, Input, InputNumber, Select, Space, Table, Typography, message } from "antd"
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

const CONTRACT_STATUS_META = {
  draft: { label: "Черновик", next: ["sent_to_client", "signed"] },
  sent_to_client: { label: "Отправлен клиенту", next: ["draft", "signed"] },
  signed: { label: "Подписан", next: ["in_execution"] },
  in_execution: { label: "В исполнении", next: ["completed", "closed_with_issues"] },
  completed: { label: "Исполнен", next: [] },
  closed_with_issues: { label: "Закрыт с проблемами", next: [] },
}

export default function RequestContractTabContent({ requestId }) {
  const { can } = useCapabilities()
  const canManageContracts = can("workflow.contracts.manage")
  const [quotes, setQuotes] = useState([])
  const [quoteRevisions, setQuoteRevisions] = useState([])
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [generatingContractId, setGeneratingContractId] = useState(null)
  const [updatingContractId, setUpdatingContractId] = useState(null)
  const [helpOpen, setHelpOpen] = useState(false)
  const [form] = Form.useForm()
  const selectedQuoteId = Form.useWatch("sales_quote_id", form)
  const createContractStatusOptions = [
    { value: "draft", label: "Черновик" },
    { value: "sent_to_client", label: "Отправлен клиенту" },
    { value: "signed", label: "Подписан" },
  ]
  const quoteStatusLabel = (value) =>
    ({
      draft: "Черновик",
      internal_review: "Внутреннее согласование",
      sent_to_client: "Отправлено клиенту",
      client_approved: "Согласовано клиентом",
      contract_signed: "Контракт подписан",
    }[String(value || "").trim()] || value || "—")

  const loadData = async () => {
    if (!requestId) return
    setLoading(true)
    try {
      const [{ data: quotesData }, { data: contractsData }] = await Promise.all([
        axios.get("/sales-quotes", { params: { request_id: requestId } }),
        axios.get("/contracts", { params: { request_id: requestId } }),
      ])
      setQuotes(Array.isArray(quotesData) ? quotesData : [])
      setContracts(Array.isArray(contractsData) ? contractsData : [])
    } catch (e) {
      message.error(e?.response?.data?.message || "Не удалось загрузить контракты")
      setQuotes([])
      setContracts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId])

  const quoteOptions = useMemo(
    () =>
      quotes.map((row) => ({
        value: Number(row.id),
        label: `КП #${row.id} · ${quoteStatusLabel(row.status)} · ${formatPriceWithCurrency(row.total_sell, row.currency || "USD")}`,
      })),
    [quotes]
  )
  const latestContractProfile = useMemo(
    () => parseSnapshot(contracts?.[0]?.company_legal_snapshot_json),
    [contracts]
  )
  const selectedQuoteMap = useMemo(
    () => new Map(quotes.map((row) => [Number(row.id), row])),
    [quotes]
  )
  const getContractStatusOptions = (status) => {
    const normalized = String(status || "draft").trim().toLowerCase()
    const meta = CONTRACT_STATUS_META[normalized] || CONTRACT_STATUS_META.draft
    return [
      { value: normalized, label: meta.label },
      ...meta.next.map((value) => ({
        value,
        label: CONTRACT_STATUS_META[value]?.label || value,
      })),
    ]
  }

  useEffect(() => {
    const quoteId = Number(selectedQuoteId || 0) || null
    if (!quoteId) {
      setQuoteRevisions([])
      form.setFieldsValue({ sales_quote_revision_id: undefined })
      return
    }
    let cancelled = false
    const loadQuoteRevisions = async () => {
      try {
        const { data } = await axios.get(`/sales-quotes/${quoteId}/revisions`)
        if (cancelled) return
        const rows = Array.isArray(data) ? data : []
        setQuoteRevisions(rows)
        form.setFieldsValue({
          sales_quote_revision_id: Number(rows?.[0]?.id || 0) || selectedQuoteMap.get(quoteId)?.latest_revision_id || undefined,
        })
      } catch (e) {
        if (cancelled) return
        setQuoteRevisions([])
        message.error(e?.response?.data?.message || "Не удалось загрузить ревизии КП")
      }
    }
    loadQuoteRevisions()
    return () => {
      cancelled = true
    }
  }, [form, selectedQuoteId, selectedQuoteMap])

  const handleCreateContract = async (values) => {
    setSaving(true)
    try {
      await axios.post("/contracts", {
        sales_quote_id: values.sales_quote_id,
        sales_quote_revision_id: values.sales_quote_revision_id || selectedQuoteMap.get(Number(values.sales_quote_id || 0))?.latest_revision_id || null,
        contract_number: values.contract_number,
        contract_date: values.contract_date?.format("YYYY-MM-DD"),
        amount: values.amount,
        currency: values.currency,
        status: values.status,
        note: values.note,
      })
      message.success("Контракт создан")
      form.resetFields()
      await loadData()
    } catch (e) {
      message.error(e?.response?.data?.message || "Не удалось создать контракт")
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateContractStatus = async (contractId, status) => {
    setUpdatingContractId(Number(contractId))
    try {
      await axios.patch(`/contracts/${contractId}`, { status })
      message.success("Статус контракта обновлён")
      await loadData()
    } catch (e) {
      message.error(e?.response?.data?.message || "Не удалось обновить статус контракта")
    } finally {
      setUpdatingContractId(null)
    }
  }

  const handleGenerateContractPdf = async (contractId) => {
    setGeneratingContractId(Number(contractId))
    try {
      await axios.post(`/contracts/${contractId}/generate`)
      message.success("DOCX контракта сформирован")
      await loadData()
    } catch (e) {
      message.error(e?.response?.data?.message || "Не удалось сформировать DOCX контракта")
    } finally {
      setGeneratingContractId(null)
    }
  }

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <CompanyLegalSummary
        profile={latestContractProfile}
        title={latestContractProfile ? "Реквизиты, зафиксированные в контракте" : "Реквизиты нашего юрлица"}
        description={
          latestContractProfile
            ? `В последнем контракте зафиксирована версия реквизитов с ${latestContractProfile.effective_from}.`
            : undefined
        }
      />

      <Alert
        type="info"
        showIcon
        message="Контракт закрывает коммерческий цикл и открывает PO"
        description="Контракт должен фиксировать конкретную коммерческую ревизию КП. После статуса «Подписан» закупщик получает право оформлять PO по утвержденной ревизии, первый PO переводит контракт в «В исполнении», а «Исполнен» возможен только после подтвержденных PO и без открытых событий качества."
      />

      <Card
        size="small"
        title="Новый контракт"
        extra={
          <Button size="small" onClick={() => setHelpOpen(true)}>
            Справка
          </Button>
        }
      >
        <Form form={form} layout="vertical" onFinish={handleCreateContract} initialValues={{ status: "draft", currency: "USD" }}>
          <Space wrap align="start">
            <Form.Item name="sales_quote_id" label="КП" rules={[{ required: true }]}>
              <Select style={{ width: 360 }} options={quoteOptions} />
            </Form.Item>
            <Form.Item name="sales_quote_revision_id" label="Ревизия КП">
              <Select
                style={{ width: 200 }}
                allowClear
                disabled={!selectedQuoteId}
                options={quoteRevisions.map((row) => ({
                  value: Number(row.id),
                  label: `Ревизия ${row.rev_number} · ${formatPriceWithCurrency(row.total_sell, selectedQuoteMap.get(Number(selectedQuoteId || 0))?.currency || "USD")}`,
                }))}
              />
            </Form.Item>
            <Form.Item name="contract_number" label="Номер" rules={[{ required: true }]}>
              <Input style={{ width: 180 }} />
            </Form.Item>
            <Form.Item name="contract_date" label="Дата" rules={[{ required: true }]}>
              <DatePicker style={{ width: 160 }} format="DD.MM.YYYY" />
            </Form.Item>
            <Form.Item name="amount" label="Сумма">
              <InputNumber style={{ width: 160 }} min={0} />
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
            <Form.Item name="status" label="Статус">
              <Select
                style={{ width: 160 }}
                options={createContractStatusOptions}
              />
            </Form.Item>
          </Space>
          <Form.Item name="note" label="Комментарий">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={saving} disabled={!canManageContracts}>
            Создать контракт
          </Button>
        </Form>
      </Card>

      <Card size="small" title="Контракты по заявке">
        <Table
          rowKey="id"
          loading={loading}
          dataSource={contracts}
          pagination={false}
          columns={[
            { title: "Номер", dataIndex: "contract_number", width: 160 },
            {
              title: "Статус",
              width: 180,
              render: (_, row) => (
                <Select
                  size="small"
                  style={{ width: 190 }}
                  value={row.status || "draft"}
                  loading={updatingContractId === Number(row.id)}
                  disabled={!canManageContracts}
                  onChange={(value) => handleUpdateContractStatus(row.id, value)}
                  options={getContractStatusOptions(row.status)}
                />
              ),
            },
            { title: "Дата", dataIndex: "contract_date", width: 120, render: formatDate },
            { title: "Сумма", width: 140, render: (_, row) => formatPriceWithCurrency(row.amount, row.currency || "USD") },
            { title: "КП", width: 90, render: (_, row) => `#${row.sales_quote_id}` },
            {
              title: "Ревизия КП",
              width: 120,
              render: (_, row) =>
                row.sales_quote_revision_number ? `Ревизия ${row.sales_quote_revision_number}` : "актуальная",
            },
            { title: "Заказы пост.", width: 110, render: (_, row) => `${Number(row.po_confirmed || 0)}/${Number(row.po_total || 0)}` },
            {
              title: "Отклонения",
              width: 110,
              render: (_, row) => (Number(row.open_quality_events || 0) > 0 ? Number(row.open_quality_events || 0) : "—"),
            },
            {
              title: "Документ",
              width: 340,
              render: (_, row) => (
                <Space>
                  <Button
                    size="small"
                    onClick={() => window.open(`/contracts/${row.id}/preview`, "_blank", "noopener")}
                  >
                    Открыть документ
                  </Button>
                  {row.file_url ? (
                    <Button
                      size="small"
                      onClick={() => window.open(row.file_url, "_blank", "noopener")}
                    >
                      Скачать DOCX
                    </Button>
                  ) : null}
                  <Button
                    size="small"
                    loading={generatingContractId === Number(row.id)}
                    onClick={() => handleGenerateContractPdf(row.id)}
                    disabled={!canManageContracts}
                  >
                    Пересобрать DOCX
                  </Button>
                </Space>
              ),
            },
            { title: "Комментарий", dataIndex: "note" },
          ]}
        />
      </Card>

      <Drawer
        title="Справка по вкладке «Контракты»"
        placement="right"
        width={440}
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
      >
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Typography.Paragraph>
            Контракт должен ссылаться на конкретную ревизию КП, а не просто на коммерческое предложение в
            целом. Это фиксирует именно тот состав, который клиент согласовал.
          </Typography.Paragraph>
          <Typography.Paragraph>
            После статуса <strong>«Подписан»</strong> закупщик получает право выпускать заказы поставщикам уже по
            этой коммерческой ревизии. Первый PO переводит контракт в статус <strong>«В исполнении»</strong>.
          </Typography.Paragraph>
          <Typography.Paragraph style={{ marginBottom: 0 }}>
            Контракт можно перевести в <strong>«Исполнен»</strong> только когда все заказы поставщикам подтверждены и нет
            открытых событий качества. Если исполнение завершилось, но остались претензии или отклонения, используется
            статус <strong>«Закрыт с проблемами»</strong>.
          </Typography.Paragraph>
        </Space>
      </Drawer>
    </Space>
  )
}

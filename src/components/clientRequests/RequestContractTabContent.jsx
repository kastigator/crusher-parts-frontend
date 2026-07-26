import React, { useEffect, useMemo, useState } from "react"
import { Alert, Button, Card, DatePicker, Drawer, Form, Input, Select, Space, Table, Tag, Typography, message } from "antd"
import axios from "@/api/axiosInstance"
import { formatPriceWithCurrency } from "@/utils/priceFormat"
import { resolveAppHref } from "@/utils/resolveAppHref"
import CompanyLegalSummary from "@/components/common/CompanyLegalSummary"
import useCapabilities from "@/hooks/useCapabilities"
import { formatIncotermsWithPlace } from "@/components/rfqWorkspace/rfqWorkspaceUtils"
import {
  formatDate,
  formatSalesQuoteLabel,
  isSalesQuoteCommerciallyReady,
} from "@/components/clientRequests/salesQuoteDisplay"

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

const CONTRACT_STATUS_COLORS = {
  draft: "default",
  sent_to_client: "gold",
  signed: "green",
  in_execution: "blue",
  completed: "success",
  closed_with_issues: "red",
}

export default function RequestContractTabContent({ requestId, activeRevisionId }) {
  const { can } = useCapabilities()
  const canManageContracts = can("workflow.contracts.manage")
  const [quotes, setQuotes] = useState([])
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [generatingContractId, setGeneratingContractId] = useState(null)
  const [updatingContractId, setUpdatingContractId] = useState(null)
  const [helpOpen, setHelpOpen] = useState(false)
  const [form] = Form.useForm()
  const contractStatusLabel = (value) =>
    CONTRACT_STATUS_META[String(value || "draft").trim().toLowerCase()]?.label || value || "—"

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
      quotes
        .filter(
          (row) =>
            Number(row.client_request_revision_id || 0) === Number(activeRevisionId || 0) &&
            String(row.status || "").trim().toLowerCase() === "client_approved" &&
            isSalesQuoteCommerciallyReady(row)
        )
        .map((row) => ({
        value: Number(row.id),
        label: formatSalesQuoteLabel(row),
      })),
    [quotes, activeRevisionId]
  )
  const hasClientApprovedQuotes = useMemo(
    () =>
      quotes.some(
        (row) =>
          Number(row.client_request_revision_id || 0) === Number(activeRevisionId || 0) &&
          String(row.status || "").trim().toLowerCase() === "client_approved"
      ),
    [quotes, activeRevisionId]
  )
  const hasBlockedApprovedQuotes = useMemo(
    () =>
      quotes.some(
        (row) =>
          String(row.status || "").trim().toLowerCase() === "client_approved" &&
          !isSalesQuoteCommerciallyReady(row)
      ),
    [quotes]
  )
  const latestContractProfile = useMemo(
    () => parseSnapshot(contracts?.[0]?.company_legal_snapshot_json),
    [contracts]
  )
  const selectedCreateQuoteId = Form.useWatch("sales_quote_id", form)
  const selectedQuoteMap = useMemo(
    () => new Map(quotes.map((row) => [Number(row.id), row])),
    [quotes]
  )
  const selectedCreateQuote = useMemo(
    () => selectedQuoteMap.get(Number(selectedCreateQuoteId || 0)) || null,
    [selectedCreateQuoteId, selectedQuoteMap]
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

  const handleCreateContract = async (values) => {
    setSaving(true)
    try {
      await axios.post("/contracts", {
        sales_quote_id: values.sales_quote_id,
        sales_quote_revision_id: selectedQuoteMap.get(Number(values.sales_quote_id || 0))?.latest_revision_id || null,
        contract_number: values.contract_number,
        contract_date: values.contract_date?.format("YYYY-MM-DD"),
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
        message="Контракт закрывает коммерческий цикл и открывает заказы поставщикам"
        description="Контракт можно создать только из согласованного КП текущей ревизии заявки. После статуса «Подписан» номер, дата, сумма, валюта и ревизия КП фиксируются, а закупщик получает право оформлять заказы поставщикам по утвержденной коммерческой ревизии."
      />

      {hasBlockedApprovedQuotes ? (
        <Alert
          type="warning"
          showIcon
          message="Есть согласованное КП без полной продажной цены"
          description="Такое КП не попадёт в список для нового контракта. Верните его в работу, заполните продажу на этапе «Расчет» и заново согласуйте с клиентом."
        />
      ) : null}

      {!quoteOptions.length ? (
        <Alert
          type="warning"
          showIcon
          message="Нет КП, из которого можно создать контракт"
          description={
            hasClientApprovedQuotes
              ? "Есть согласованное КП, но в нём не заполнена продажная цена по всем активным строкам. Верните КП в работу, заполните продажу на этапе «Расчет» и заново согласуйте с клиентом."
              : "Сначала заполните продажные цены, отправьте КП клиенту и переведите его в статус «Согласовано клиентом». После этого КП появится в списке для создания контракта."
          }
        />
      ) : null}

      <Card
        size="small"
        title="Новый контракт и документ"
        extra={
          <Button size="small" onClick={() => setHelpOpen(true)}>
            Справка
          </Button>
        }
      >
        <Form form={form} layout="vertical" onFinish={handleCreateContract}>
          <Space wrap align="start">
            <Form.Item name="sales_quote_id" label="Коммерческое предложение" rules={[{ required: true }]}>
              <Select style={{ width: 360 }} options={quoteOptions} />
            </Form.Item>
            <Form.Item name="contract_number" label="Номер" rules={[{ required: true }]}>
              <Input style={{ width: 180 }} />
            </Form.Item>
            <Form.Item name="contract_date" label="Дата" rules={[{ required: true }]}>
              <DatePicker style={{ width: 160 }} format="DD.MM.YYYY" />
            </Form.Item>
          </Space>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
            При создании контракт автоматически получает статус «Черновик» и фиксирует последнюю согласованную ревизию выбранного коммерческого предложения.
            DOCX документа формируется автоматически сразу после создания контракта и будет доступен в таблице ниже.
            Сумма берётся из продажной суммы КП
            {selectedCreateQuote ? `: ${formatPriceWithCurrency(selectedCreateQuote.total_sell, selectedCreateQuote.currency || "USD")}.` : "."}
            Валюта наследуется от выбранного коммерческого предложения
            {selectedCreateQuote?.currency ? `: ${selectedCreateQuote.currency}.` : "."}
          </Typography.Paragraph>
          {selectedCreateQuote ? (
            <Space wrap size={[8, 8]} style={{ marginBottom: 12 }}>
              <Tag color="green">
                Сумма из КП: {formatPriceWithCurrency(selectedCreateQuote.total_sell, selectedCreateQuote.currency || "USD")}
              </Tag>
              <Tag color={selectedCreateQuote.mixed_incoterms || selectedCreateQuote.mixed_incoterms_places ? "orange" : "blue"}>
                Incoterms: {formatIncotermsWithPlace(selectedCreateQuote.incoterms, selectedCreateQuote.incoterms_place) || "смешанные по строкам"}
              </Tag>
            </Space>
          ) : null}
          <Form.Item name="note" label="Комментарий">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={saving} disabled={!canManageContracts}>
            Создать контракт и документ
          </Button>
        </Form>
      </Card>

      <Card size="small" title="Контракты по заявке">
        <Table
          rowKey="id"
          loading={loading}
          dataSource={contracts}
          locale={{
            emptyText:
              "Контрактов пока нет. Создайте контракт из согласованного КП выше; DOCX документа сформируется автоматически.",
          }}
          pagination={false}
          columns={[
            { title: "Номер", dataIndex: "contract_number", width: 160 },
            {
              title: "Статус",
              width: 180,
              render: (_, row) => (
                <Space wrap>
                  <Tag color={CONTRACT_STATUS_COLORS[String(row.status || "draft").trim().toLowerCase()] || "default"}>
                    {contractStatusLabel(row.status)}
                  </Tag>
                  {getContractStatusOptions(row.status)
                    .filter((option) => option.value !== String(row.status || "draft").trim().toLowerCase())
                    .map((option) => (
                      <Button
                        key={option.value}
                        size="small"
                        loading={updatingContractId === Number(row.id)}
                        disabled={!canManageContracts}
                        onClick={() => handleUpdateContractStatus(row.id, option.value)}
                      >
                        {option.label}
                      </Button>
                    ))}
                </Space>
              ),
            },
            { title: "Дата", dataIndex: "contract_date", width: 120, render: formatDate },
            { title: "Сумма", width: 140, render: (_, row) => formatPriceWithCurrency(row.amount, row.currency || "USD") },
            {
              title: "Incoterms",
              width: 160,
              render: (_, row) =>
                row.mixed_incoterms || row.mixed_incoterms_places
                  ? "по спецификации"
                  : formatIncotermsWithPlace(row.incoterms, row.incoterms_place) || "—",
            },
            {
              title: "Предложение",
              width: 260,
              render: (_, row) => {
                const quote = selectedQuoteMap.get(Number(row.sales_quote_id || 0))
                return quote ? formatSalesQuoteLabel(quote, { includeStatus: false }) : "КП из архива"
              },
            },
            {
              title: "Ревизия предложения",
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
                    onClick={() => window.open(resolveAppHref(`/contracts/${row.id}/preview`), "_blank", "noopener")}
                  >
                    Предпросмотр
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
                    Сформировать DOCX заново
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
            Контракт должен ссылаться на конкретную ревизию коммерческого предложения, а не просто на предложение в
            целом. Это фиксирует именно тот состав, который клиент согласовал в текущей ревизии заявки.
          </Typography.Paragraph>
          <Typography.Paragraph>
            После статуса <strong>«Подписан»</strong> закупщик получает право выпускать заказы поставщикам уже по
            этой коммерческой ревизии. Первый заказ поставщику переводит контракт в статус <strong>«В исполнении»</strong>.
          </Typography.Paragraph>
          <Typography.Paragraph style={{ marginBottom: 0 }}>
            Если клиент меняет состав после подписания, не редактируйте подписанный контракт задним числом: создайте
            новую ревизию заявки и проведите новый цикл. Контракт можно перевести в <strong>«Исполнен»</strong> только когда все заказы поставщикам подтверждены и нет
            открытых событий качества. Если исполнение завершилось, но остались претензии или отклонения, используется
            статус <strong>«Закрыт с проблемами»</strong>.
          </Typography.Paragraph>
        </Space>
      </Drawer>
    </Space>
  )
}

import React, { useEffect, useMemo, useState } from "react"
import { Alert, Button, Card, Drawer, Form, Select, Space, Table, Tag, Typography, message } from "antd"
import axios from "@/api/axiosInstance"
import { formatPriceWithCurrency } from "@/utils/priceFormat"
import CompanyLegalSummary from "@/components/common/CompanyLegalSummary"
import useCapabilities from "@/hooks/useCapabilities"
import {
  canonicalQuoteStatus,
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
  const quoteStatusMeta = {
    draft: { color: "default", label: "Черновик" },
    internal_review: { color: "blue", label: "Внутреннее согласование" },
    sent_to_client: { color: "gold", label: "Отправлено клиенту" },
    client_approved: { color: "green", label: "Согласовано клиентом" },
    contract_signed: { color: "success", label: "Контракт подписан" },
  }
  const quoteStatusActions = (value) => {
    const status = canonicalQuoteStatus(value)
    if (status === "internal_review") {
      return [{ key: "sent_to_client", label: "Отправить клиенту", type: "primary" }]
    }
    if (status === "sent_to_client") {
      return [
        { key: "internal_review", label: "Вернуть в работу" },
        { key: "client_approved", label: "Клиент согласовал", type: "primary" },
      ]
    }
    if (status === "client_approved") {
      return [{ key: "internal_review", label: "Вернуть в работу" }]
    }
    return []
  }

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
      message.error(e?.response?.data?.message || "Не удалось загрузить данные по коммерческим предложениям")
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
      message.error(e?.response?.data?.message || "Не удалось загрузить ревизии коммерческого предложения")
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

  const activeRevisionSelections = useMemo(
    () =>
      selections.filter(
        (row) =>
          Number(row.client_request_revision_id || 0) === Number(activeRevisionId || 0) &&
          String(row.status || "").toLowerCase() === "approved",
      ),
    [selections, activeRevisionId],
  )

  const selectionOptions = useMemo(
    () =>
      activeRevisionSelections.map((row) => ({
        value: Number(row.id),
        label: `Rev ${row.client_request_rev_number || "?"} · Выбор от ${formatDate(row.selected_at || row.created_at)} · ${row.status || "утверждён"} · ${formatPriceWithCurrency(
          row.landed_total,
          row.calc_currency || "USD"
        )}`,
      })),
    [activeRevisionSelections]
  )
  const selectedQuote = useMemo(
    () => quotes.find((row) => Number(row.id) === Number(selectedQuoteId || 0)) || null,
    [quotes, selectedQuoteId]
  )
  const commercialCycleClosed = useMemo(
    () =>
      quotes.some(
        (row) =>
          Number(row.client_request_revision_id || 0) === Number(activeRevisionId || 0) &&
          canonicalQuoteStatus(row.status) === "contract_signed",
      ),
    [quotes, activeRevisionId]
  )
  const selectedQuoteActions = useMemo(
    () => quoteStatusActions(selectedQuote?.status),
    [selectedQuote]
  )
  const selectedQuoteReady = useMemo(
    () => isSalesQuoteCommerciallyReady(selectedQuote),
    [selectedQuote]
  )
  const selectedCreateSelectionId = Form.useWatch("selection_id", form)
  const selectedCreateSelection = useMemo(
    () => selections.find((row) => Number(row.id) === Number(selectedCreateSelectionId || 0)) || null,
    [selections, selectedCreateSelectionId]
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
        auto_create_revision: true,
        autofill_from_selection: true,
      })
      message.success(data?.message || "Коммерческое предложение создано и передано в работу продавцу")
      form.resetFields()
      await loadData()
    } catch (e) {
      message.error(e?.response?.data?.message || "Не удалось создать коммерческое предложение")
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
      message.success(data?.message || "Ревизия коммерческого предложения создана")
      await loadRevisions(quoteId)
    } catch (e) {
      message.error(e?.response?.data?.message || "Не удалось создать ревизию коммерческого предложения")
    } finally {
      setCreatingRevision(false)
    }
  }

  const handleUpdateQuoteStatus = async (quoteId, status) => {
    setUpdatingQuoteId(Number(quoteId))
    try {
      await axios.patch(`/sales-quotes/${quoteId}`, { status })
      message.success("Статус коммерческого предложения обновлён")
      await loadData()
      await loadRevisions(quoteId)
    } catch (e) {
      message.error(e?.response?.data?.message || "Не удалось обновить статус коммерческого предложения")
    } finally {
      setUpdatingQuoteId(null)
    }
  }

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <CompanyLegalSummary
        profile={selectedQuoteProfile}
        title={selectedQuoteProfile ? "Реквизиты, зафиксированные в выбранном коммерческом предложении" : "Реквизиты нашего юрлица"}
        description={
          selectedQuoteProfile
            ? `В выбранном коммерческом предложении зафиксирована версия реквизитов с ${selectedQuoteProfile.effective_from}.`
            : undefined
        }
      />

      <Alert
        type="info"
        showIcon
        message="Коммерческое предложение строится от утвержденного выбора закупки"
        description="После утверждения закупочного выбора продавец создает предложение по текущей ревизии заявки. Если клиент меняет состав или количество, создайте новую ревизию заявки, синхронизируйте RFQ и утвердите новый выбор закупки."
      />

      {commercialCycleClosed ? (
        <Alert
          type="warning"
          showIcon
          message="По этой ревизии уже есть подписанный контракт"
          description="Новые КП и возврат старых КП в работу заблокированы. Для нового торга нужна новая ревизия заявки и новый закупочный выбор."
        />
      ) : null}

      {activeRevisionId && !activeRevisionSelections.length && !commercialCycleClosed ? (
        <Alert
          type="warning"
          showIcon
          message="Для активной ревизии ещё нет утвержденного выбора закупки"
          description="Если заявка изменилась, сначала синхронизируйте RFQ по новой ревизии и утвердите новый выбор закупки. Старые выборы остаются в истории, но не используются для нового КП."
        />
      ) : null}

      {selectedQuote && !selectedQuoteReady && canonicalQuoteStatus(selectedQuote.status) !== "contract_signed" ? (
        <Alert
          type="warning"
          showIcon
          message="КП ещё нельзя отправлять клиенту"
          description="Заполните продажную цену по всем активным строкам на вкладке «Маржа/Экономика». Пустая продажа больше не считается нулевой ценой."
        />
      ) : null}

      <Card
        size="small"
        title="Создать коммерческое предложение из выбора закупки"
        extra={
          <Button size="small" onClick={() => setHelpOpen(true)}>
            Справка
          </Button>
        }
      >
        <Form form={form} layout="vertical" onFinish={handleCreateQuote}>
          <Space wrap align="start" style={{ width: "100%" }}>
            <Form.Item name="selection_id" label="Выбор закупки" rules={[{ required: true }]}>
              <Select style={{ width: 520, maxWidth: "100%" }} options={selectionOptions} />
            </Form.Item>
          </Space>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
            После создания коммерческое предложение автоматически получает статус «Внутреннее согласование».
            Валюта наследуется от утверждённого выбора закупки
            {selectedCreateSelection?.calc_currency ? `: ${selectedCreateSelection.calc_currency}.` : "."}
          </Typography.Paragraph>
          <Button
            type="primary"
            htmlType="submit"
            loading={saving}
            disabled={!activeRevisionId || !canManageSalesQuotes || commercialCycleClosed || !activeRevisionSelections.length}
          >
            Создать коммерческое предложение
          </Button>
        </Form>
      </Card>

      <Card
        size="small"
        title="Коммерческие предложения по заявке"
        extra={
          <Space wrap>
            {selectedQuote ? (
              <Typography.Text type="secondary">
                {`Выбрано: ${formatSalesQuoteLabel(selectedQuote)}`}
              </Typography.Text>
            ) : null}
            {selectedQuoteActions.map((action) => (
              <Button
                key={action.key}
                size="small"
                type={action.type || "default"}
                loading={updatingQuoteId === Number(selectedQuote?.id)}
                disabled={
                  !selectedQuoteId ||
                  !canManageSalesQuotes ||
                  commercialCycleClosed ||
                  (["sent_to_client", "client_approved"].includes(action.key) && !selectedQuoteReady)
                }
                onClick={() => handleUpdateQuoteStatus(selectedQuote.id, action.key)}
              >
                {action.label}
              </Button>
            ))}
            <Button
              onClick={handleCreateRevision}
              loading={creatingRevision}
              disabled={!selectedQuoteId || !canManageSalesQuotes || commercialCycleClosed || canonicalQuoteStatus(selectedQuote?.status) === "contract_signed"}
            >
              Новая ревизия предложения
            </Button>
          </Space>
        }
      >
        <Table
          size="small"
          rowKey="id"
          loading={loading}
          dataSource={quotes}
          pagination={false}
          onRow={(row) => ({
            onClick: () => setSelectedQuoteId(Number(row.id) || null),
            style: { cursor: "pointer" },
          })}
          rowClassName={(row) => (Number(row.id) === Number(selectedQuoteId || 0) ? "workspace-selector-row-active" : "")}
          tableLayout="auto"
          scroll={{ x: "max-content" }}
          columns={[
            {
              title: "Предложение",
              width: 260,
              render: (_, row) => (
                <Space direction="vertical" size={0}>
                  <span>{formatSalesQuoteLabel(row, { includeStatus: false, includeAmount: false })}</span>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {`Ревизия заявки ${row.rev_number ?? "?"}`}
                  </Typography.Text>
                  {!isSalesQuoteCommerciallyReady(row) ? (
                    <Tag color="orange" style={{ width: "fit-content", marginTop: 4 }}>
                      Заполнить продажу
                    </Tag>
                  ) : null}
                </Space>
              ),
            },
            {
              title: "Статус",
              width: 180,
              render: (_, row) => (
                <Tag color={(quoteStatusMeta[canonicalQuoteStatus(row.status)] || quoteStatusMeta.internal_review).color}>
                  {(quoteStatusMeta[canonicalQuoteStatus(row.status)] || quoteStatusMeta.internal_review).label}
                </Tag>
              ),
            },
            {
              title: "Последняя ревизия",
              width: 130,
              render: (_, row) => row.latest_revision_number || row.rev_number || "—",
            },
            { title: "Себестоимость", width: 130, render: (_, row) => formatPriceWithCurrency(row.total_cost, row.currency || "USD") },
            { title: "Продажа", width: 130, render: (_, row) => formatPriceWithCurrency(row.total_sell, row.currency || "USD") },
            { title: "Маржа", width: 90, render: (_, row) => `${Number(row.margin_pct_avg || 0).toFixed(1)}%` },
            { title: "Создано", dataIndex: "created_at", width: 120, render: formatDate },
          ]}
        />

        {selectedQuoteId ? (
          <div style={{ marginTop: 12 }}>
            <strong>Ревизии выбранного коммерческого предложения</strong>
            <Table
              size="small"
              style={{ marginTop: 8 }}
              rowKey="id"
              dataSource={quoteRevisions}
              pagination={false}
              tableLayout="auto"
              scroll={{ x: "max-content" }}
              columns={[
                { title: "Ревизия", dataIndex: "rev_number", width: 90 },
                { title: "Себестоимость", width: 130, render: (_, row) => formatPriceWithCurrency(row.total_cost, selectedQuote?.currency || "USD") },
                { title: "Продажа", width: 130, render: (_, row) => formatPriceWithCurrency(row.total_sell, selectedQuote?.currency || "USD") },
                { title: "Маржа", width: 90, render: (_, row) => `${Number(row.margin_pct_avg || 0).toFixed(1)}%` },
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
        title="Справка по вкладке «Коммерческое предложение»"
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
            Ревизии коммерческого предложения нужны для торга по цене и условиям внутри той же ревизии заявки.
            Они не заменяют новую ревизию заявки, если клиент меняет состав, количество или сам предмет запроса.
          </Typography.Paragraph>
          <Typography.Paragraph style={{ marginBottom: 0 }}>
            После согласования клиента процесс переходит во вкладку контрактов, где фиксируется конкретная
            коммерческая ревизия. Архивные ревизии заявки нельзя продолжать задним числом.
          </Typography.Paragraph>
        </Space>
      </Drawer>
    </Space>
  )
}

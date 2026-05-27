import React, { useEffect, useMemo, useState } from "react"
import { Alert, Button, Card, Drawer, Form, Select, Space, Table, Tag, Typography, message } from "antd"
import { useNavigate } from "react-router-dom"
import axios from "@/api/axiosInstance"
import { formatPriceWithCurrency } from "@/utils/priceFormat"
import useCapabilities from "@/hooks/useCapabilities"
import { getClientFacingDescription, getClientFacingPartNumber } from "@/components/rfqWorkspace/partDisplay"

const { Text } = Typography

const quoteStatusLabel = (value) =>
  ({
    draft: "Черновик",
    internal_review: "Внутреннее согласование",
    sent_to_client: "Отправлено клиенту",
    client_approved: "Согласовано клиентом",
    contract_signed: "Контракт подписан",
  }[String(value || "").trim()] || value || "—")

const quoteStatusColor = (value) =>
  ({
    draft: "default",
    internal_review: "blue",
    sent_to_client: "gold",
    client_approved: "green",
    contract_signed: "success",
  }[String(value || "").trim()] || "default")

const buildSelectionLabel = (selection, formatDate) => {
  if (!selection) return "выбора закупки"
  const date = formatDate?.(selection.created_at)
  const parts = [date && date !== "—" ? `выбора от ${date}` : "выбора закупки"]
  parts.push(quoteStatusLabel(selection.status))
  const total = formatPriceWithCurrency(selection.landed_total, selection.calc_currency || "USD")
  if (total && total !== "—") parts.push(total)
  return parts.join(" · ")
}

const buildQuoteLabel = (quote, formatDate) => {
  if (!quote) return "Коммерческое предложение"
  const date = formatDate?.(quote.created_at)
  return date && date !== "—" ? `КП от ${date}` : "Коммерческое предложение"
}

export default function SalesTabContent({
  activeRfq,
  selections,
  salesQuotes,
  formatDate,
  onCommercialUpdated,
}) {
  const navigate = useNavigate()
  const { can } = useCapabilities()
  const canManageSalesQuotes = can("workflow.sales_quotes.manage")
  const [creating, setCreating] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerQuote, setDrawerQuote] = useState(null)
  const [revisions, setRevisions] = useState([])
  const [selectedRevisionId, setSelectedRevisionId] = useState(null)
  const [revisionLines, setRevisionLines] = useState([])
  const [loadingRevisions, setLoadingRevisions] = useState(false)
  const [loadingLines, setLoadingLines] = useState(false)
  const [updatingLineId, setUpdatingLineId] = useState(null)
  const [helpOpen, setHelpOpen] = useState(false)
  const [form] = Form.useForm()
  const selectedCreateSelectionId = Form.useWatch("selection_id", form)

  const openClientCommercialTab = (tabKey) => {
    const requestId = Number(activeRfq?.client_request_id || 0) || null
    if (!requestId) {
      message.warning("У RFQ нет привязанной заявки клиента")
      return
    }
    navigate(`/client-request-workspace?request_id=${requestId}&tab=${tabKey}`)
  }

  const selectionOptions = useMemo(
    () =>
      (Array.isArray(selections) ? selections : []).map((row) => ({
        value: Number(row.id),
        label: buildSelectionLabel(row, formatDate),
      })),
    [selections, formatDate]
  )
  const selectionById = useMemo(() => {
    const map = new Map()
    ;(Array.isArray(selections) ? selections : []).forEach((row) => {
      map.set(Number(row.id), row)
    })
    return map
  }, [selections])
  const selectedCreateSelection = useMemo(
    () => (Array.isArray(selections) ? selections : []).find((row) => Number(row.id) === Number(selectedCreateSelectionId || 0)) || null,
    [selections, selectedCreateSelectionId]
  )
  const defaultSelectionId = useMemo(() => {
    const approved = (Array.isArray(selections) ? selections : [])
      .filter((row) => String(row?.status || "").toLowerCase() === "approved")
      .sort((a, b) => new Date(b?.selected_at || b?.created_at || 0) - new Date(a?.selected_at || a?.created_at || 0))
    return Number(approved?.[0]?.id || selections?.[0]?.id || 0) || null
  }, [selections])

  useEffect(() => {
    if (!defaultSelectionId || selectedCreateSelectionId) return
    form.setFieldsValue({ selection_id: defaultSelectionId })
  }, [defaultSelectionId, selectedCreateSelectionId, form])

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
        status: "internal_review",
        auto_create_revision: true,
        autofill_from_selection: true,
      })
      message.success("Коммерческое предложение создано и передано продавцу")
      form.resetFields()
      if (typeof onCommercialUpdated === "function") {
        await onCommercialUpdated()
      }
    } catch (e) {
      message.error(e?.response?.data?.message || "Не удалось создать коммерческое предложение")
    } finally {
      setCreating(false)
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
      message.error(e?.response?.data?.message || "Не удалось загрузить строки ревизии коммерческого предложения")
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
      message.error(e?.response?.data?.message || "Не удалось загрузить ревизии коммерческого предложения")
    } finally {
      setLoadingRevisions(false)
    }
  }

  const selectedRevision = useMemo(
    () => revisions.find((row) => Number(row?.id || 0) === Number(selectedRevisionId || 0)) || null,
    [revisions, selectedRevisionId]
  )

  const resolveClientPresentationMode = (row) => {
    const currentPart = String(row?.client_display_part_number || "").trim()
    const currentDescription = String(row?.client_display_description || "").trim()
    const clientPart = String(row?.client_part_number || "").trim()
    const clientDescription = String(row?.client_description || "").trim()
    const oemPart = String(row?.original_cat_number || "").trim()
    const oemDescription = String(row?.original_description_ru || row?.client_description || "").trim()
    const procurementPart = String(row?.procurement_display_part_number || "").trim()
    const procurementDescription = String(row?.procurement_display_description || "").trim()

    if (procurementPart && currentPart === procurementPart && (!procurementDescription || currentDescription === procurementDescription)) {
      return "procurement"
    }
    if (oemPart && currentPart === oemPart && (!oemDescription || currentDescription === oemDescription)) {
      return "oem"
    }
    if (clientPart && currentPart === clientPart && (!clientDescription || currentDescription === clientDescription)) {
      return "client"
    }
    return "client"
  }

  const updateQuoteLinePresentation = async (row, mode) => {
    const presentationMap = {
      client: {
        partNumber: row?.client_part_number || row?.original_cat_number || null,
        description: row?.client_description || null,
      },
      oem: {
        partNumber: row?.original_cat_number || row?.client_part_number || null,
        description: row?.original_description_ru || row?.client_description || null,
      },
      procurement: {
        partNumber: row?.procurement_display_part_number || row?.client_part_number || row?.original_cat_number || null,
        description: row?.procurement_display_description || row?.client_description || null,
      },
    }
    const target = presentationMap[mode]
    if (!target) return
    setUpdatingLineId(Number(row.id))
    try {
      await axios.patch(`/sales-quotes/lines/${row.id}`, {
        client_display_part_number_snapshot: target.partNumber,
        client_display_description_snapshot: target.description,
      })
      message.success("Представление строки для клиента обновлено")
      await loadRevisionLines(selectedRevisionId)
      if (typeof onCommercialUpdated === "function") {
        await onCommercialUpdated()
      }
    } catch (e) {
      message.error(e?.response?.data?.message || "Не удалось обновить представление строки")
    } finally {
      setUpdatingLineId(null)
    }
  }

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <Alert
        type="info"
        showIcon
        message="Коммерческое предложение создаётся из утверждённого выбора закупки и уходит продавцу"
        description="Закупщик передаёт продавцу базовую закупочную модель из выбора закупки активной ревизии заявки. Если клиент меняет состав или количество, нужна новая ревизия заявки, синхронизация RFQ и новый выбор закупки."
      />

      <Card
        size="small"
        title="Создать коммерческое предложение из выбора закупки"
        extra={
          <Button size="small" onClick={() => setHelpOpen(true)}>
            Справка
          </Button>
        }
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateQuote}
        >
          <Space wrap align="start">
            <Form.Item
              name="selection_id"
              label="Выбор закупки"
              rules={[{ required: true, message: "Выберите выбор закупки" }]}
            >
              <Select
                style={{ width: 420 }}
                options={selectionOptions}
                placeholder="Выберите утверждённый выбор закупки"
              />
            </Form.Item>
          </Space>
          <Text type="secondary" style={{ display: "block", marginBottom: 12 }}>
            После создания коммерческое предложение автоматически получает статус «Внутреннее согласование» и
            передаётся продавцу. Валюта наследуется от утверждённого выбора закупки
            {selectedCreateSelection?.calc_currency ? `: ${selectedCreateSelection.calc_currency}.` : "."}
          </Text>
          <Button
            type="primary"
            htmlType="submit"
            loading={creating}
            disabled={!canManageSalesQuotes || !selectedCreateSelectionId}
          >
            Создать коммерческое предложение и передать продавцу
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
          <span>4. Дальше уже ревизии коммерческого предложения: цена продажи, маржа, уступки клиенту.</span>
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
          {Array.isArray(salesQuotes) && salesQuotes.length ? (
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 12 }}
              message="Продажная цена и отправка клиенту выполняются в заявке клиента"
              description="RFQ зафиксировал закупочную базу и передал КП продавцу. Укажите цену продажи или маржу в «Маржа/Экономика», затем отправьте готовое КП во вкладке «КП»."
              action={
                <Space direction="vertical" size={8}>
                  <Button type="primary" onClick={() => openClientCommercialTab("margin")}>
                    Указать продажу и маржу
                  </Button>
                  <Button onClick={() => openClientCommercialTab("quote")}>
                    Открыть отправку КП
                  </Button>
                </Space>
              }
            />
          ) : null}
          <Table
          rowKey="id"
          dataSource={salesQuotes}
          pagination={{ pageSize: 10, hideOnSinglePage: true }}
          columns={[
            { title: "Предложение", width: 150, render: (_, row) => buildQuoteLabel(row, formatDate) },
            {
              title: "Выбор",
              dataIndex: "selection_id",
              width: 220,
              render: (value) => (value ? buildSelectionLabel(selectionById.get(Number(value)), formatDate) : "—"),
            },
            {
              title: "База",
              width: 160,
              render: (_, row) => (
                <Tag color="blue">
                  {row.selection_id ? "из утверждённого выбора" : "ручное предложение"}
                </Tag>
              ),
            },
            {
              title: "Статус",
              width: 220,
              render: (_, row) => (
                <Tag color={quoteStatusColor(row.status)}>{quoteStatusLabel(row.status)}</Tag>
              ),
            },
            {
              title: "Последняя ревизия",
              dataIndex: "latest_revision_number",
              width: 130,
              render: (value) => value || "—",
            },
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
        title={drawerQuote ? buildQuoteLabel(drawerQuote, formatDate) : "Коммерческое предложение"}
        placement="right"
        width={980}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          {drawerQuote ? (
            <Space wrap>
              <Tag>
                Выбор: {drawerQuote.selection_id ? buildSelectionLabel(selectionById.get(Number(drawerQuote.selection_id)), formatDate) : "—"}
              </Tag>
              <Tag color="blue">Себестоимость: {formatPriceWithCurrency(drawerQuote.total_cost, drawerQuote.currency || "USD")}</Tag>
              <Tag color="green">Продажа: {formatPriceWithCurrency(drawerQuote.total_sell, drawerQuote.currency || "USD")}</Tag>
              <Tag color="gold">Маржа: {Number(drawerQuote.margin_pct_avg || 0).toFixed(1)}%</Tag>
              <Tag>{quoteStatusLabel(drawerQuote.status)}</Tag>
            </Space>
          ) : null}

          <Card size="small" title="Ревизии коммерческого предложения">
            <Table
              size="small"
              rowKey="id"
              loading={loadingRevisions}
              dataSource={revisions}
              pagination={false}
              columns={[
                { title: "Ревизия", dataIndex: "rev_number", width: 90 },
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
            title={selectedRevision ? `Строки ревизии ${selectedRevision.rev_number}` : "Строки ревизии"}
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
                      <Space size={6} wrap>
                        <span>{getClientFacingPartNumber(row, `Строка #${row.client_request_revision_item_id}`)}</span>
                        {row.has_procurement_substitution ? <Tag color="orange">Подмена в закупке</Tag> : null}
                      </Space>
                      {getClientFacingDescription(row) ? <span style={{ color: "#666", fontSize: 12 }}>{getClientFacingDescription(row)}</span> : null}
                      {row.has_procurement_substitution && row.procurement_display_part_number ? (
                        <span style={{ color: "#ad6800", fontSize: 12 }}>
                          Закупка велась по: {row.procurement_display_part_number}
                        </span>
                      ) : null}
                    </Space>
                  ),
                },
                {
                  title: "Что показать клиенту",
                  width: 220,
                  render: (_, row) => {
                    const options = [
                      {
                        value: "client",
                        label: `Клиентский: ${row.client_part_number || row.original_cat_number || "—"}`,
                      },
                    ]
                    if (row.original_cat_number) {
                      options.push({
                        value: "oem",
                        label: `OEM: ${row.original_cat_number}`,
                      })
                    }
                    if (row.procurement_display_part_number && row.has_procurement_substitution) {
                      options.push({
                        value: "procurement",
                        label: `Наш номер: ${row.procurement_display_part_number}`,
                      })
                    }
                    return (
                      <Select
                        size="small"
                        style={{ width: 210 }}
                        value={resolveClientPresentationMode(row)}
                        options={options}
                        loading={updatingLineId === Number(row.id)}
                        onChange={(value) => updateQuoteLinePresentation(row, value)}
                      />
                    )
                  },
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
            закупки текущей ревизии заявки.
          </Typography.Paragraph>
          <Typography.Paragraph>
            Продавец видит коды поставщиков, себестоимость и ревизии коммерческого предложения, но не должен менять сам
            утвержденный закупочный набор через этот экран. Изменение состава или количества всегда начинается с новой
            ревизии заявки.
          </Typography.Paragraph>
          <Typography.Paragraph style={{ marginBottom: 0 }}>
            После торга с клиентом именно коммерческая ревизия и ее контракт определяют, что дальше пойдет
            в заказ поставщику.
          </Typography.Paragraph>
        </Space>
      </Drawer>
    </Space>
  )
}

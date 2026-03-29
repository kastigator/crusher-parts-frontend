import React, { useEffect, useMemo, useState } from "react"
import {
  Alert,
  Button,
  Card,
  Drawer,
  Space,
  Table,
  Typography,
  message,
  Tag,
} from "antd"
import { useNavigate } from "react-router-dom"
import PageWrapper from "@/components/common/PageWrapper"
import axios from "@/api/axiosInstance"
import { formatPriceWithCurrency } from "@/utils/priceFormat"
import { formatIncotermsWithPlace } from "@/components/rfqWorkspace/rfqWorkspaceUtils"
import SupplierQualityEventModal from "@/components/suppliers/SupplierQualityEventModal"
import { resolveAppHref } from "@/utils/resolveAppHref"

export default function PurchaseOrdersPage() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(false)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [qualityModalOpen, setQualityModalOpen] = useState(false)
  const [activeOrder, setActiveOrder] = useState(null)
  const [lines, setLines] = useState([])
  const { Text } = Typography

  const qualitySummary = useMemo(
    () => ({
      total: Number(activeOrder?.open_quality_events || 0),
    }),
    [activeOrder]
  )

  const loadOrders = async () => {
    setLoading(true)
    try {
      const { data } = await axios.get("/purchase-orders")
      setOrders(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
      message.error("Не удалось загрузить заказы")
    } finally {
      setLoading(false)
    }
  }

  const loadLines = async (orderId) => {
    try {
      const { data } = await axios.get(`/purchase-orders/${orderId}/lines`)
      setLines(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
      message.error("Не удалось загрузить строки")
    }
  }

  useEffect(() => {
    loadOrders()
  }, [])

  const handleGenerate = async (order) => {
    try {
      const { data } = await axios.post(`/purchase-orders/${order.id}/generate`)
      await loadOrders()
      if (data?.url) window.open(data.url, "_blank", "noopener")
      message.success("DOCX заказа поставщику сформирован")
    } catch (e) {
      console.error(e)
      message.error(e?.response?.data?.message || "Не удалось сформировать DOCX")
    }
  }

  return (
    <PageWrapper
      title="Заказы поставщикам"
      subtitle="Обзор существующих заказов поставщикам, документов и событий качества."
      helpSummary="Основной сценарий создания новых заказов вынесен в RFQ Workspace. Здесь остаются обзор, DOCX и события качества."
    >
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Alert
          type="warning"
          showIcon
          message="Создание и изменение заказов поставщикам перенесено в RFQ Workspace"
          description="Эта страница нужна для обзора, контроля документа, просмотра строк и регистрации событий качества."
        />
        <Card title="Где работать с заказами" size="small">
          <Space direction="vertical" size={8} style={{ width: "100%" }}>
            <Text type="secondary">
              Создание заказа, выбор поставщика, группы поставки и состава строк выполняются внутри RFQ Workspace после утвержденного выбора и контракта.
            </Text>
            <Space wrap>
              <Button type="primary" onClick={() => navigate("/rfq-workspace")}>
                Открыть RFQ Workspace
              </Button>
            </Space>
          </Space>
        </Card>

        <Card title="Список заказов" size="small">
          <Table
            rowKey="id"
            dataSource={orders}
            loading={loading}
            pagination={{ pageSize: 20 }}
            onRow={(record) => ({
              onClick: async () => {
                setActiveOrder(record)
                setDrawerOpen(true)
                await loadLines(record.id)
                await loadResponseLines(record.supplier_id)
              },
            })}
            columns={[
              {
                title: "Заказ",
                width: 280,
                render: (_, row) => (
                  <Space direction="vertical" size={2}>
                    <span>{row.supplier_name || "Поставщик не указан"}</span>
                    <span style={{ color: "#8c8c8c" }}>
                      {row.supplier_reference || row.shipment_group_name || "Без референса"}
                    </span>
                  </Space>
                ),
              },
              { title: "Статус", dataIndex: "status", width: 120 },
              {
                title: "Поставка",
                width: 240,
                render: (_, row) => (
                  <Space direction="vertical" size={2}>
                    <span>{row.shipment_group_name || (row.shipment_group_id ? `Группа #${row.shipment_group_id}` : "—")}</span>
                    <span style={{ color: "#8c8c8c" }}>
                      {formatIncotermsWithPlace(row?.incoterms, row?.incoterms_place)}
                    </span>
                  </Space>
                ),
              },
              {
                title: "Качество",
                width: 170,
                render: (_, row) => (
                  <Space direction="vertical" size={2}>
                    <span>
                      {Number(row.open_quality_events || 0) > 0
                        ? `Открыто событий: ${Number(row.open_quality_events || 0)}`
                        : "Открытых событий нет"}
                    </span>
                    <Button
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation()
                        setActiveOrder(row)
                        setQualityModalOpen(true)
                      }}
                    >
                      Добавить событие
                    </Button>
                  </Space>
                ),
              },
              {
                title: "Документы",
                width: 320,
                render: (_, row) => (
                  <Space wrap>
                    <Button
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation()
                        window.open(resolveAppHref(`/purchase-orders/${row.id}/preview`), "_blank", "noopener")
                      }}
                    >
                      Открыть документ
                    </Button>
                    {row.file_url ? (
                      <Button
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation()
                          window.open(row.file_url, "_blank", "noopener")
                        }}
                      >
                        Скачать DOCX
                      </Button>
                    ) : null}
                    <Button
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleGenerate(row)
                      }}
                    >
                      Пересобрать DOCX
                    </Button>
                  </Space>
                ),
              },
            ]}
          />
        </Card>
      </Space>

      <Drawer
        width={720}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={
          <Space>
            <span>Заказ поставщику</span>
            {activeOrder?.status ? <Tag>{activeOrder.status}</Tag> : null}
          </Space>
        }
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <Card size="small" title="Сводка по заказу">
            <Space direction="vertical" size={8} style={{ width: "100%" }}>
              <Text type="secondary">
                Добавление и изменение строк заказа выполняются в RFQ Workspace. Здесь доступен обзор состава, документа и качества.
              </Text>
              <Space wrap>
                <Button type="primary" onClick={() => navigate("/rfq-workspace")}>
                  Открыть RFQ Workspace
                </Button>
                <Button
                  onClick={() => window.open(resolveAppHref(`/purchase-orders/${activeOrder?.id}/preview`), "_blank", "noopener")}
                  disabled={!activeOrder?.id}
                >
                  Открыть документ
                </Button>
                <Button
                  onClick={() => activeOrder && handleGenerate(activeOrder)}
                  disabled={!activeOrder?.id}
                >
                  Пересобрать DOCX
                </Button>
              </Space>
              <Space wrap size={[16, 8]}>
                <Text type="secondary">Поставщик: {activeOrder?.supplier_name || "—"}</Text>
                <Text type="secondary">Поставка: {activeOrder?.shipment_group_name || "—"}</Text>
                <Text type="secondary">
                  Incoterms: {formatIncotermsWithPlace(activeOrder?.incoterms, activeOrder?.incoterms_place) || "—"}
                </Text>
                <Text type="secondary">
                  Качество: {qualitySummary.total > 0 ? `${qualitySummary.total} открыто` : "открытых событий нет"}
                </Text>
              </Space>
            </Space>
          </Card>

          <Table
            rowKey="id"
            dataSource={lines}
            pagination={false}
            columns={[
              {
                title: "Строка заказа",
                width: 260,
                render: (_, row) => (
                  <Space direction="vertical" size={2}>
                    <span>{row.supplier_part_number || row.original_cat_number || `Строка #${row.id}`}</span>
                    <span style={{ color: "#8c8c8c" }}>{row.note || "Без комментария"}</span>
                  </Space>
                ),
              },
              { title: "Кол-во", dataIndex: "qty", width: 90 },
              {
                title: "Цена",
                dataIndex: "price",
                width: 140,
                render: (v, r) => formatPriceWithCurrency(v, r?.currency),
              },
              { title: "Валюта", dataIndex: "currency", width: 90 },
              { title: "Срок, дней", dataIndex: "lead_time_days", width: 110 },
              {
                title: "Качество",
                width: 150,
                render: () => (
                  <Button
                    size="small"
                    onClick={() => {
                      setQualityModalOpen(true)
                    }}
                  >
                    Событие качества
                  </Button>
                ),
              },
            ]}
          />
        </Space>
      </Drawer>

      <SupplierQualityEventModal
        open={qualityModalOpen}
        supplierId={activeOrder?.supplier_id || null}
        purchaseOrder={activeOrder}
        onClose={() => setQualityModalOpen(false)}
      />
    </PageWrapper>
  )
}

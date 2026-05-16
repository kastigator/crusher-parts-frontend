import React, { useCallback, useEffect, useMemo, useState } from "react"
import { Alert, Button, Card, Col, Row, Space, Statistic, Table, Tag, Typography, message } from "antd"
import { Link } from "react-router-dom"
import PageWrapper from "@/components/common/PageWrapper"
import axios from "@/api/axiosInstance"

const { Paragraph, Text } = Typography

const catalogLinks = [
  { path: "/clients", label: "Клиенты" },
  { path: "/suppliers", label: "Поставщики" },
  { path: "/supplier-parts", label: "Детали поставщиков" },
  { path: "/original-parts", label: "OEM детали" },
  { path: "/standard-parts", label: "Стандартные детали" },
  { path: "/equipment-classifier", label: "Классификатор оборудования" },
  { path: "/materials", label: "Материалы" },
  { path: "/tnved-codes", label: "Коды ТН ВЭД" },
  { path: "/logistics-route-templates", label: "Шаблоны доставки" },
]

const countMeta = [
  {
    key: "equipment_models_without_classifier",
    title: "Модели без классификатора",
    tone: "red",
    description: "Модель есть, но не лежит в дереве оборудования.",
  },
  {
    key: "oem_without_standard_link",
    title: "OEM без standard-link",
    tone: "orange",
    description: "OEM детали не связаны с центральным стандартным изделием.",
  },
  {
    key: "supplier_parts_without_standard_link",
    title: "Supplier parts без standard-link",
    tone: "orange",
    description: "Поставщицкие позиции не связаны со standard part.",
  },
  {
    key: "oem_missing_logistics",
    title: "OEM без веса/габаритов",
    tone: "gold",
    description: "Нет полного логистического набора по fitment.",
  },
  {
    key: "supplier_parts_missing_logistics",
    title: "Supplier parts без веса/габаритов",
    tone: "gold",
    description: "Нет веса или одной из габаритных величин.",
  },
  {
    key: "standard_classes_without_fields",
    title: "Классы без полей",
    tone: "blue",
    description: "Класс создан, но форма standard part еще не описана.",
  },
  {
    key: "standard_parts_without_links",
    title: "Standard parts без связей",
    tone: "cyan",
    description: "Стандартная деталь пока не связана ни с OEM, ни с поставщиком.",
  },
]

const toneToColor = {
  red: "#cf1322",
  orange: "#d46b08",
  gold: "#d48806",
  blue: "#1677ff",
  cyan: "#08979c",
}

export default function CatalogsPage() {
  const [health, setHealth] = useState(null)
  const [loadingHealth, setLoadingHealth] = useState(false)

  const loadHealth = useCallback(async () => {
    setLoadingHealth(true)
    try {
      const { data } = await axios.get("/catalog-health/summary", { params: { limit: 12 } })
      setHealth(data || null)
    } catch (err) {
      console.error("GET /catalog-health/summary error:", err)
      message.error(err?.response?.data?.message || "Не удалось загрузить качество каталогов")
    } finally {
      setLoadingHealth(false)
    }
  }, [])

  useEffect(() => {
    loadHealth()
  }, [loadHealth])

  const counts = health?.counts || {}
  const queues = health?.queues || {}
  const totalIssues = useMemo(
    () => countMeta.reduce((sum, item) => sum + Number(counts[item.key] || 0), 0),
    [counts],
  )

  const modelColumns = [
    {
      title: "Модель",
      render: (_, row) => (
        <Space direction="vertical" size={0}>
          <Text strong>{row.manufacturer_name} / {row.model_name}</Text>
          <Text type="secondary">{row.model_code || "—"}</Text>
        </Space>
      ),
    },
    { title: "OEM", dataIndex: "oem_parts_count", width: 90, align: "center" },
    { title: "Машин", dataIndex: "client_units_count", width: 90, align: "center" },
  ]

  const oemColumns = [
    {
      title: "OEM деталь",
      render: (_, row) => (
        <Space direction="vertical" size={0}>
          <Link to={`/original-parts/${row.id}`}>{row.part_number || `#${row.id}`}</Link>
          <Text type="secondary">{row.description_ru || row.description_en || "—"}</Text>
        </Space>
      ),
    },
    { title: "Производитель", dataIndex: "manufacturer_name", width: 170 },
    { title: "Поставщики", dataIndex: "supplier_links_count", width: 110, align: "center" },
  ]

  const supplierColumns = [
    {
      title: "Деталь поставщика",
      render: (_, row) => (
        <Space direction="vertical" size={0}>
          <Link to={`/supplier-parts/${row.id}`}>{row.supplier_part_number || `#${row.id}`}</Link>
          <Text type="secondary">{row.description_ru || row.description_en || "—"}</Text>
        </Space>
      ),
    },
    { title: "Поставщик", dataIndex: "supplier_name", width: 180 },
    {
      title: "Логистика",
      dataIndex: "missing_logistics",
      width: 110,
      render: (value) => value ? <Tag color="gold">неполная</Tag> : <Tag color="green">есть</Tag>,
    },
  ]

  const classColumns = [
    {
      title: "Класс",
      render: (_, row) => (
        <Space direction="vertical" size={0}>
          <Text strong>{row.name}</Text>
          <Text type="secondary">{row.parent_name || "Корневой класс"} · {row.code}</Text>
        </Space>
      ),
    },
    { title: "Деталей", dataIndex: "parts_count", width: 100, align: "center" },
  ]

  return (
    <PageWrapper
      title="Каталоги"
      helpText="Каталоги, справочники и контроль качества связей."
    >
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Card>
          <Space align="start" style={{ width: "100%", justifyContent: "space-between" }}>
            <div>
              <Typography.Title level={4} style={{ marginTop: 0 }}>
                Качество каталогов
              </Typography.Title>
              <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                Контрольный слой показывает, где центральная логика еще не собрана:
                классификатор оборудования, связи OEM/supplier с standard parts и логистика.
              </Paragraph>
            </div>
            <Button onClick={loadHealth} loading={loadingHealth}>
              Обновить
            </Button>
          </Space>
          <Alert
            style={{ marginTop: 16 }}
            type={totalIssues > 0 ? "warning" : "success"}
            showIcon
            message={
              totalIssues > 0
                ? `Найдено ${totalIssues} задач качества каталогов`
                : "Критичные очереди качества каталогов пустые"
            }
            description="Это не ошибки выполнения процесса, а очередь нормализации master data."
          />
          <Row gutter={[12, 12]} style={{ marginTop: 16 }}>
            {countMeta.map((item) => (
              <Col key={item.key} xs={24} sm={12} lg={8} xl={6}>
                <Card size="small" style={{ height: "100%" }}>
                  <Statistic
                    title={item.title}
                    value={Number(counts[item.key] || 0)}
                    valueStyle={{ color: toneToColor[item.tone] || undefined }}
                  />
                  <Text type="secondary">{item.description}</Text>
                </Card>
              </Col>
            ))}
          </Row>
        </Card>

        <Row gutter={[16, 16]}>
          <Col xs={24} xl={12}>
            <Card title="Модели без классификатора" loading={loadingHealth}>
              <Table
                size="small"
                rowKey="id"
                columns={modelColumns}
                dataSource={queues.equipment_models_without_classifier || []}
                pagination={false}
              />
            </Card>
          </Col>
          <Col xs={24} xl={12}>
            <Card title="Классы standard parts без полей" loading={loadingHealth}>
              <Table
                size="small"
                rowKey="id"
                columns={classColumns}
                dataSource={queues.standard_classes_without_fields || []}
                pagination={false}
              />
            </Card>
          </Col>
          <Col xs={24} xl={12}>
            <Card title="OEM детали без связи со standard part" loading={loadingHealth}>
              <Table
                size="small"
                rowKey="id"
                columns={oemColumns}
                dataSource={queues.oem_without_standard_link || []}
                pagination={false}
              />
            </Card>
          </Col>
          <Col xs={24} xl={12}>
            <Card title="Детали поставщиков без связи со standard part" loading={loadingHealth}>
              <Table
                size="small"
                rowKey="id"
                columns={supplierColumns}
                dataSource={queues.supplier_parts_without_standard_link || []}
                pagination={false}
              />
            </Card>
          </Col>
        </Row>

        <Card title="Разделы каталогов">
          <Paragraph style={{ marginBottom: 16 }}>
            Выберите раздел каталога для работы с данными.
          </Paragraph>
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            {catalogLinks.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  display: "block",
                  padding: "10px 12px",
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  color: "#111827",
                  textDecoration: "none",
                }}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </Card>
      </Space>
    </PageWrapper>
  )
}

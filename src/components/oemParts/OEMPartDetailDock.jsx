import React from "react"
import { Button, Card, Descriptions, Empty, Space, Statistic, Table, Tabs, Tag, Typography } from "antd"
import { resolveAppHref } from "@/utils/resolveAppHref"

const textOrDash = (value) => {
  const v = String(value || "").trim()
  return v || "—"
}

export default function OEMPartDetailDock({ part, onCreateRequestForUnit }) {
  const fitments = Array.isArray(part?.fitments) ? part.fitments : []
  const standardParts = Array.isArray(part?.standard_parts) ? part.standard_parts : []
  const clientUsage = Array.isArray(part?.client_usage) ? part.client_usage : []
  const stats = part?.stats || {}
  const primaryStandardPart =
    standardParts.find((row) => Number(row.is_primary || 0) > 0) || standardParts[0] || null

  if (!part?.id) {
    return (
      <Card>
        <Empty description="OEM деталь не найдена" />
      </Card>
    )
  }

  return (
    <Tabs
      defaultActiveKey="overview"
      items={[
        {
          key: "overview",
          label: "Основное",
          children: (
            <Card>
              <Space direction="vertical" size={16} style={{ width: "100%" }}>
                <Space wrap>
                  <Tag color="geekblue">{textOrDash(part.manufacturer_name)}</Tag>
                  <Tag color="blue">{textOrDash(part.part_number)}</Tag>
                  <Tag>{textOrDash(part.uom)}</Tag>
                  <Tag>{part.has_drawing ? "Есть чертёж" : "Без чертежа"}</Tag>
                </Space>

                <Descriptions column={2} bordered size="small">
                  <Descriptions.Item label="Описание RU">
                    {textOrDash(part.description_ru)}
                  </Descriptions.Item>
                  <Descriptions.Item label="Описание EN">
                    {textOrDash(part.description_en)}
                  </Descriptions.Item>
                  <Descriptions.Item label="Группа">
                    {textOrDash(part.group_name)}
                  </Descriptions.Item>
                  <Descriptions.Item label="Код ТН ВЭД">
                    {textOrDash(part.tnved_code)}
                  </Descriptions.Item>
                  <Descriptions.Item label="Тех. описание" span={2}>
                    {textOrDash(part.tech_description)}
                  </Descriptions.Item>
                  <Descriptions.Item label="Каноническая стандартная деталь" span={2}>
                    {primaryStandardPart ? (
                      <Space wrap size={8}>
                        <Tag color="green">{textOrDash(primaryStandardPart.class_name)}</Tag>
                        <Typography.Text strong>
                          {textOrDash(primaryStandardPart.display_name)}
                        </Typography.Text>
                        {primaryStandardPart.designation ? (
                          <Tag>{primaryStandardPart.designation}</Tag>
                        ) : null}
                        <Typography.Link
                          href={resolveAppHref("/standard-parts")}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Открыть каталог стандартных деталей
                        </Typography.Link>
                      </Space>
                    ) : (
                      <Space wrap size={8}>
                        <Typography.Text type="secondary">
                          Стандартная деталь не назначена
                        </Typography.Text>
                        <Typography.Link
                          href={resolveAppHref("/standard-parts")}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Открыть каталог стандартных деталей
                        </Typography.Link>
                      </Space>
                    )}
                  </Descriptions.Item>
                </Descriptions>

                <Space wrap size={24}>
                  <Statistic title="Дочерние BOM" value={Number(stats.bom_children_count) || 0} />
                  <Statistic title="Где используется" value={Number(stats.where_used_count) || 0} />
                  <Statistic title="Документы" value={Number(stats.documents_count) || 0} />
                  <Statistic title="Материалы" value={Number(stats.materials_count) || 0} />
                  <Statistic title="Комплекты" value={Number(stats.bundles_count) || 0} />
                  <Statistic title="Техника клиентов" value={Number(stats.client_usage_count) || 0} />
                </Space>
              </Space>
            </Card>
          ),
        },
        {
          key: "fitments",
          label: `Применяемость (${fitments.length})`,
          children: (
            <Card>
              <Table
                rowKey={(row) => `${row.oem_part_id}:${row.equipment_model_id}`}
                dataSource={fitments}
                pagination={false}
                locale={{ emptyText: "Нет связанных моделей" }}
                columns={[
                  {
                    title: "Производитель",
                    dataIndex: "manufacturer_name",
                    render: textOrDash,
                  },
                  {
                    title: "Модель",
                    dataIndex: "model_name",
                    render: textOrDash,
                  },
                  {
                    title: "Код модели",
                    dataIndex: "model_code",
                    render: textOrDash,
                  },
                  {
                    title: "Классификатор",
                    dataIndex: "classifier_node_name",
                    render: textOrDash,
                  },
                ]}
              />
            </Card>
          ),
        },
        {
          key: "client-usage",
          label: `У клиентов (${clientUsage.length})`,
          children: (
            <Card>
              <Table
                rowKey={(row) => row.id}
                dataSource={clientUsage}
                pagination={false}
                locale={{ emptyText: "Эта OEM деталь пока не связана с техникой клиентов через применяемость" }}
                columns={[
                  {
                    title: "Клиент",
                    dataIndex: "client_name",
                    render: (value) => <Typography.Text strong>{textOrDash(value)}</Typography.Text>,
                  },
                  {
                    title: "Производитель",
                    dataIndex: "manufacturer_name",
                    render: textOrDash,
                  },
                  {
                    title: "Модель",
                    render: (_, row) => (
                      <Space direction="vertical" size={0}>
                        <span>{textOrDash(row.model_name)}</span>
                        {row.model_code ? (
                          <Typography.Text type="secondary">{row.model_code}</Typography.Text>
                        ) : null}
                      </Space>
                    ),
                  },
                  {
                    title: "Серийный номер",
                    dataIndex: "serial_number",
                    render: textOrDash,
                  },
                  {
                    title: "Внутреннее имя",
                    dataIndex: "internal_name",
                    render: textOrDash,
                  },
                  {
                    title: "Площадка",
                    dataIndex: "site_name",
                    render: textOrDash,
                  },
                  {
                    title: "Статус",
                    dataIndex: "status",
                    render: (value) => {
                      if (value === "active") return <Tag color="green">Активна</Tag>
                      if (value === "inactive") return <Tag color="orange">Неактивна</Tag>
                      return <Tag>Архив</Tag>
                    },
                  },
                  {
                    title: "",
                    key: "actions",
                    width: 160,
                    render: (_, row) =>
                      onCreateRequestForUnit ? (
                        <Button size="small" type="primary" ghost onClick={() => onCreateRequestForUnit(row)}>
                          Создать заявку
                        </Button>
                      ) : null,
                  },
                ]}
              />
            </Card>
          ),
        },
      ]}
    />
  )
}

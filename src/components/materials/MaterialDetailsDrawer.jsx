import React, { useEffect, useState } from "react"
import {
  Drawer,
  Descriptions,
  Space,
  Tag,
  Table,
  Typography,
  Divider,
  Collapse,
  Empty,
  Spin,
} from "antd"
import {
  DatabaseOutlined,
  CodeOutlined,
  FileOutlined,
  DotChartOutlined,
} from "@ant-design/icons"
import axios from "@/api/axiosInstance"
import "@/styles/tableStyles.css"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
} from "recharts"

const { Text } = Typography

export default function MaterialDetailsDrawer({ open, onClose, material }) {
  const [loading, setLoading] = useState(false)
  const [details, setDetails] = useState(null)

  useEffect(() => {
    if (!open || !material?.id) return

    const fetchDetails = async () => {
      setLoading(true)
      try {
        const { data } = await axios.get(`/materials/${material.id}`)
        setDetails(data)
      } catch (e) {
        console.error("Ошибка загрузки материала", e)
      } finally {
        setLoading(false)
      }
    }

    fetchDetails()
  }, [open, material?.id])

  const propertiesColumns = [
    {
      title: "Код",
      dataIndex: "code",
      key: "code",
      width: 100,
      render: (v) => <Tag color="blue">{v}</Tag>,
    },
    {
      title: "Название",
      dataIndex: "display_name",
      key: "display_name",
      width: 200,
      render: (v) => v || <span style={{ color: "#9ca3af" }}>—</span>,
    },
    {
      title: "Значение",
      dataIndex: "value_num",
      key: "value_num",
      render: (_, record) => {
        if (record.use_curve) {
          return <Tag color="purple">Кривая</Tag>
        }
        if (record.value_num !== null && record.value_num !== undefined) {
          return (
            <span>
              {record.value_num}
              {record.unit ? ` ${record.unit}` : ""}
            </span>
          )
        }
        if (record.value_text) return record.value_text
        return <span style={{ color: "#9ca3af" }}>—</span>
      },
    },
  ]

  const renderCurveChart = (record) => {
    const pts = Array.isArray(record?.points) ? record.points : []
    const data = pts
      .map((p) => ({ x: Number(p.x), y: Number(p.y) }))
      .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y))
      .sort((a, b) => a.x - b.x)

    if (!data.length) {
      return <Text type="secondary">Нет точек</Text>
    }

    return (
      <div style={{ width: "100%", height: 220 }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="x" />
            <YAxis />
            <ReTooltip formatter={(val, name) => [val, name === "y" ? "Y" : name]} />
            <Line type="linear" dataKey="y" stroke="#3b82f6" dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    )
  }

  return (
    <Drawer
      title={
        <Space align="center">
          <DatabaseOutlined />
          <span>{material?.name || "Материал"}</span>
          {material?.code && <Tag>{material.code}</Tag>}
        </Space>
      }
      placement="right"
      width={520}
      open={open}
      onClose={onClose}
      destroyOnClose
      styles={{ body: { paddingTop: 8 } }}
    >
      {loading ? (
        <Spin />
      ) : !details ? (
        <Empty description="Нет данных" />
      ) : (
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="Категория">
              {details.category_name || "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Стандарт">
              {details.standard || "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Описание">
              {details.description || "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Алиасы">
              {details.aliases?.length ? (
                <Space wrap>
                  {details.aliases.map((a) => (
                    <Tag key={a.id} color="default">
                      {a.alias}
                    </Tag>
                  ))}
                </Space>
              ) : (
                "—"
              )}
            </Descriptions.Item>
          </Descriptions>

          <Divider style={{ margin: "8px 0" }} />

          <Collapse defaultActiveKey={["props"]} size="small">
            <Collapse.Panel
              header={
                <Space>
                  <CodeOutlined />
                  <span>Свойства ({details.properties?.length || 0})</span>
                </Space>
              }
              key="props"
            >
              <Table
                className="op-table"
                size="small"
                rowKey={(r) => `${r.code}-${r.display_name}`}
                columns={propertiesColumns}
                dataSource={details.properties || []}
                pagination={false}
              />
            </Collapse.Panel>

            <Collapse.Panel
              header={
                <Space>
                  <DotChartOutlined />
                  <span>Кривые ({details.curves?.length || 0})</span>
                </Space>
              }
              key="curves"
            >
              {Array.isArray(details.curves) && details.curves.length ? (
                <Collapse
                  size="small"
                  items={details.curves.map((curve, idx) => {
                    const key = String(curve.curve_id || idx)
                    const pts = Array.isArray(curve.points) ? curve.points : []
                    return {
                      key,
                      label: (
                        <Space wrap>
                          <Tag>{curve.curve_id || "—"}</Tag>
                          <span>{curve.name || "Без названия"}</span>
                          {curve.type ? <Tag color="blue">{curve.type}</Tag> : null}
                          <Text type="secondary">Точек: {pts.length}</Text>
                        </Space>
                      ),
                      children: (
                        <div className="op-expanded-content">
                          {pts.length ? (
                            <>
                              <div style={{ marginBottom: 8, fontSize: 12, color: "#4b5563" }}>
                                {pts.map((p, i) => (
                                  <div key={i}>
                                    x: {p.x}; y: {p.y}
                                  </div>
                                ))}
                              </div>
                              {renderCurveChart(curve)}
                            </>
                          ) : (
                            <Text type="secondary">Нет точек</Text>
                          )}
                        </div>
                      ),
                    }
                  })}
                />
              ) : (
                <Text type="secondary">Нет кривых</Text>
              )}
            </Collapse.Panel>
          </Collapse>
        </Space>
      )}
    </Drawer>
  )
}

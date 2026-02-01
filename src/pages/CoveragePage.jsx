import React, { useEffect, useMemo, useState } from "react"
import { Button, Card, Drawer, Empty, Select, Space, Table, Tag, Typography, message } from "antd"
import PageWrapper from "@/components/common/PageWrapper"
import axios from "@/api/axiosInstance"

const { Text } = Typography

export default function CoveragePage() {
  const [rfqs, setRfqs] = useState([])
  const [rfqId, setRfqId] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [detailsRecord, setDetailsRecord] = useState(null)

  const loadRfqs = async () => {
    try {
      const { data } = await axios.get("/rfqs")
      setRfqs(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
    }
  }

  const loadCoverage = async (id) => {
    if (!id) {
      setItems([])
      return
    }
    setLoading(true)
    try {
      const { data } = await axios.get("/coverage", {
        params: { rfq_id: id, include_responses: 1 },
      })
      setItems(Array.isArray(data?.items) ? data.items : [])
    } catch (e) {
      console.error(e)
      message.error("Не удалось загрузить покрытие")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRfqs()
  }, [])

  useEffect(() => {
    loadCoverage(rfqId)
  }, [rfqId])

  const rfqOptions = useMemo(
    () => rfqs.map((r) => ({ value: r.id, label: r.rfq_number || `RFQ-${r.id}` })),
    [rfqs],
  )

  const supplierTags = (suppliers) => {
    if (!suppliers || !suppliers.length) return "—"
    return suppliers.map((s) => (
      <Tag key={`${s.supplier_id}`} color="blue">
        {s.supplier_name || `#${s.supplier_id}`} ({s.parts_count})
      </Tag>
    ))
  }

  const responseTags = (responses) => {
    if (!responses || !responses.length) return "—"
    const map = new Map()
    responses.forEach((r) => {
      const key = r.supplier_id || r.supplier_name || "supplier"
      const entry = map.get(key) || {
        supplier_name: r.supplier_name || `#${r.supplier_id || ""}`,
        count: 0,
      }
      entry.count += 1
      map.set(key, entry)
    })
    return Array.from(map.values()).map((entry) => (
      <Tag key={entry.supplier_name} color="green">
        {entry.supplier_name} ({entry.count})
      </Tag>
    ))
  }

  return (
    <PageWrapper
      title="Покрытие"
      helpText="Матрица покрытия по RFQ: BOM, комплекты и связки с поставщиками."
    >
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Card size="small">
          <Space wrap align="center">
            <Text type="secondary">RFQ</Text>
            <Select
              style={{ minWidth: 200 }}
              value={rfqId}
              options={rfqOptions}
              placeholder="Выберите RFQ"
              onChange={setRfqId}
              allowClear
            />
          </Space>
        </Card>

        {!rfqId ? (
          <Empty description="Выберите RFQ, чтобы увидеть покрытие" />
        ) : (
          <Table
            rowKey={(r) => String(r.rfq_item_id)}
            dataSource={items}
            loading={loading}
            className="op-table"
            pagination={false}
            onRow={(record) => ({
              onClick: () => {
                setDetailsRecord(record)
                setDetailsOpen(true)
              },
              style: { cursor: "pointer" },
            })}
            columns={[
              { title: "№", dataIndex: "line_number", width: 80 },
              {
                title: "Кат. номер",
                dataIndex: "original_cat_number",
                width: 180,
                render: (v, r) => v || r.client_part_number || "—",
              },
              {
                title: "Описание",
                dataIndex: "description",
                render: (v, r) => v || r.client_description || "—",
              },
              { title: "Кол-во", dataIndex: "requested_qty", width: 100 },
              { title: "Ед.", dataIndex: "uom", width: 80 },
              {
                title: "BOM",
                dataIndex: "has_bom",
                width: 80,
                render: (v) => (v ? <Tag color="green">да</Tag> : "—"),
              },
              {
                title: "Комплекты",
                dataIndex: "bundle_count",
                width: 110,
                render: (v) => (v ? <Tag>{v}</Tag> : "—"),
              },
              {
                title: "Детали",
                key: "details",
                width: 110,
                render: (_v, r) => (
                  <Button
                    size="small"
                    type="link"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setDetailsRecord(r)
                      setDetailsOpen(true)
                    }}
                  >
                    Открыть
                  </Button>
                ),
              },
            ]}
          />
        )}
      </Space>

      <Drawer
        open={detailsOpen}
        onClose={() => {
          setDetailsOpen(false)
          setDetailsRecord(null)
        }}
        width={980}
        title={
          detailsRecord
            ? `Покрытие: ${detailsRecord.original_cat_number || detailsRecord.client_part_number || "позиция"}`
            : "Покрытие"
        }
      >
        {!detailsRecord?.components?.length ? (
          <Text type="secondary">Компоненты не определены</Text>
        ) : (
          <Table
            rowKey={(r) => String(r.original_part_id)}
            className="op-table"
            size="small"
            pagination={false}
            dataSource={detailsRecord.components}
            columns={[
              {
                title: "Компонент",
                dataIndex: "cat_number",
                render: (v, r) => (
                  <div>
                    <div>{v || "—"}</div>
                    <Text type="secondary">{r.description || "—"}</Text>
                  </div>
                ),
              },
              {
                title: "Кол-во",
                dataIndex: "component_qty",
                width: 120,
                align: "right",
              },
              {
                title: "Требуется",
                dataIndex: "required_qty",
                width: 140,
                align: "right",
              },
              {
                title: "Поставщики",
                dataIndex: "suppliers",
                render: (v) => supplierTags(v),
              },
              {
                title: "Ответы",
                dataIndex: "responses",
                render: (v) => responseTags(v),
              },
              {
                title: "Комплекты",
                dataIndex: "bundle_count",
                width: 120,
                render: (v) => (v ? <Tag>{v}</Tag> : "—"),
              },
            ]}
          />
        )}
      </Drawer>
    </PageWrapper>
  )
}

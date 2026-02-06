import React, { useEffect, useMemo, useState } from "react"
import {
  Card,
  Space,
  Table,
  Form,
  Input,
  InputNumber,
  Select,
  Button,
  message,
} from "antd"
import PageWrapper from "@/components/common/PageWrapper"
import axios from "@/api/axiosInstance"
import { formatPriceWithCurrency } from "@/utils/priceFormat"

const TRANSPORT_OPTIONS = [
  { value: "SEA", label: "Море" },
  { value: "RAIL", label: "Ж/Д" },
  { value: "AIR", label: "Авиа" },
  { value: "ROAD", label: "Авто" },
  { value: "UNKNOWN", label: "Другое" },
]

export default function EconomicsPage() {
  const [rfqs, setRfqs] = useState([])
  const [groups, setGroups] = useState([])
  const [scenarios, setScenarios] = useState([])
  const [landedCosts, setLandedCosts] = useState([])

  const [groupForm] = Form.useForm()
  const [scenarioForm] = Form.useForm()
  const [landedForm] = Form.useForm()

  const rfqMap = useMemo(() => {
    const map = new Map()
    rfqs.forEach((r) => {
      map.set(r.id, `${r.client_name || "Клиент"} · Rev ${r.rev_number || ""}`.trim())
    })
    return map
  }, [rfqs])

  const groupMap = useMemo(() => {
    const map = new Map()
    groups.forEach((g) => {
      map.set(g.id, g.name)
    })
    return map
  }, [groups])

  const loadRfqs = async () => {
    try {
      const { data } = await axios.get("/rfqs")
      setRfqs(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
    }
  }

  const loadGroups = async () => {
    try {
      const { data } = await axios.get("/economics/shipment-groups")
      setGroups(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
      message.error("Не удалось загрузить группы")
    }
  }

  const loadScenarios = async () => {
    try {
      const { data } = await axios.get("/economics/scenarios")
      setScenarios(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
      message.error("Не удалось загрузить сценарии")
    }
  }

  const loadLandedCosts = async () => {
    try {
      const { data } = await axios.get("/economics/landed-costs")
      setLandedCosts(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
      message.error("Не удалось загрузить расчеты")
    }
  }

  useEffect(() => {
    loadRfqs()
    loadGroups()
    loadScenarios()
    loadLandedCosts()
  }, [])

  const rfqOptions = useMemo(
    () => rfqs.map((r) => ({ value: r.id, label: `RFQ #${r.id}` })),
    [rfqs],
  )

  const groupOptions = useMemo(
    () => groups.map((g) => ({ value: g.id, label: g.name })),
    [groups],
  )

  const handleCreateGroup = async (values) => {
    try {
      await axios.post("/economics/shipment-groups", {
        rfq_id: values.rfq_id,
        name: values.name,
        origin_country: values.origin_country || null,
        origin_location: values.origin_location || null,
        destination_country: values.destination_country || null,
        destination_location: values.destination_location || null,
        transport_mode: values.transport_mode || "UNKNOWN",
        note: values.note || null,
      })
      groupForm.resetFields()
      await loadGroups()
      message.success("Группа создана")
    } catch (e) {
      console.error(e)
      message.error("Не удалось создать группу")
    }
  }

  const handleCreateScenario = async (values) => {
    try {
      await axios.post("/economics/scenarios", {
        shipment_group_id: values.shipment_group_id,
        name: values.name,
        transport_mode: values.transport_mode,
        eta_days: values.eta_days ?? null,
        cost: values.cost ?? null,
        currency: values.currency || null,
        notes: values.notes || null,
      })
      scenarioForm.resetFields()
      await loadScenarios()
      message.success("Сценарий создан")
    } catch (e) {
      console.error(e)
      message.error("Не удалось создать сценарий")
    }
  }

  const handleCreateLanded = async (values) => {
    try {
      await axios.post("/economics/landed-costs", {
        rfq_id: values.rfq_id,
        name: values.name,
        goods_total: values.goods_total ?? null,
        logistics_total: values.logistics_total ?? null,
        duty_total: values.duty_total ?? null,
        warehouse_total: values.warehouse_total ?? null,
        landed_total: values.landed_total ?? null,
        currency: values.currency || null,
        eta_days: values.eta_days ?? null,
        note: values.note || null,
      })
      landedForm.resetFields()
      await loadLandedCosts()
      message.success("Снимок создан")
    } catch (e) {
      console.error(e)
      message.error("Не удалось создать расчет")
    }
  }

  return (
    <PageWrapper
      title="Экономика поставки"
      helpText="Группируйте поставки, создавайте сценарии доставки и фиксируйте landed cost."
    >
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Card title="Группы поставок" size="small">
          <Form form={groupForm} layout="vertical" onFinish={handleCreateGroup}>
            <Space wrap align="start">
              <Form.Item
                label="RFQ"
                name="rfq_id"
                rules={[{ required: true, message: "Выберите RFQ" }]}
              >
                <Select style={{ width: 160 }} options={rfqOptions} />
              </Form.Item>
              <Form.Item
                label="Название группы"
                name="name"
                rules={[{ required: true, message: "Укажите название" }]}
              >
                <Input style={{ width: 220 }} />
              </Form.Item>
              <Form.Item label="Страна отправки" name="origin_country">
                <Input style={{ width: 140 }} placeholder="CN" />
              </Form.Item>
              <Form.Item label="Город/порт" name="origin_location">
                <Input style={{ width: 180 }} />
              </Form.Item>
              <Form.Item label="Страна назначения" name="destination_country">
                <Input style={{ width: 140 }} placeholder="RU" />
              </Form.Item>
              <Form.Item label="Точка назначения" name="destination_location">
                <Input style={{ width: 180 }} />
              </Form.Item>
              <Form.Item label="Транспорт" name="transport_mode" initialValue="UNKNOWN">
                <Select style={{ width: 140 }} options={TRANSPORT_OPTIONS} />
              </Form.Item>
              <Form.Item label="Комментарий" name="note">
                <Input style={{ width: 220 }} />
              </Form.Item>
              <Form.Item style={{ marginTop: 30 }}>
                <Button type="primary" htmlType="submit">
                  Создать группу
                </Button>
              </Form.Item>
            </Space>
          </Form>

          <Table
            rowKey="id"
            dataSource={groups}
            pagination={{ pageSize: 10 }}
            columns={[
              {
                title: "RFQ",
                dataIndex: "rfq_id",
                width: 200,
                render: (v) => rfqMap.get(v) || "—",
              },
              { title: "Название", dataIndex: "name" },
              { title: "Транспорт", dataIndex: "transport_mode", width: 120 },
              { title: "Откуда", dataIndex: "origin_location" },
              { title: "Куда", dataIndex: "destination_location" },
            ]}
          />
        </Card>

        <Card title="Сценарии доставки" size="small">
          <Form form={scenarioForm} layout="vertical" onFinish={handleCreateScenario}>
            <Space wrap align="start">
              <Form.Item
                label="Группа"
                name="shipment_group_id"
                rules={[{ required: true, message: "Выберите группу" }]}
              >
                <Select style={{ width: 220 }} options={groupOptions} />
              </Form.Item>
              <Form.Item
                label="Название"
                name="name"
                rules={[{ required: true, message: "Укажите название" }]}
              >
                <Input style={{ width: 200 }} />
              </Form.Item>
              <Form.Item
                label="Транспорт"
                name="transport_mode"
                rules={[{ required: true, message: "Укажите транспорт" }]}
              >
                <Select style={{ width: 140 }} options={TRANSPORT_OPTIONS} />
              </Form.Item>
              <Form.Item label="ETA, дни" name="eta_days">
                <InputNumber style={{ width: 120 }} min={0} />
              </Form.Item>
              <Form.Item label="Стоимость" name="cost">
                <InputNumber style={{ width: 140 }} min={0} />
              </Form.Item>
              <Form.Item label="Валюта" name="currency">
                <Input style={{ width: 100 }} />
              </Form.Item>
              <Form.Item label="Заметки" name="notes">
                <Input style={{ width: 220 }} />
              </Form.Item>
              <Form.Item style={{ marginTop: 30 }}>
                <Button type="primary" htmlType="submit">
                  Создать сценарий
                </Button>
              </Form.Item>
            </Space>
          </Form>

          <Table
            rowKey="id"
            dataSource={scenarios}
            pagination={{ pageSize: 10 }}
            columns={[
              {
                title: "Группа",
                dataIndex: "shipment_group_id",
                width: 180,
                render: (v) => groupMap.get(v) || "—",
              },
              { title: "Название", dataIndex: "name" },
              { title: "Транспорт", dataIndex: "transport_mode", width: 120 },
              { title: "ETA", dataIndex: "eta_days", width: 90 },
              {
                title: "Стоимость",
                dataIndex: "cost",
                width: 150,
                render: (v, r) => formatPriceWithCurrency(v, r?.currency),
              },
            ]}
          />
        </Card>

        <Card title="Landed cost" size="small">
          <Form form={landedForm} layout="vertical" onFinish={handleCreateLanded}>
            <Space wrap align="start">
              <Form.Item
                label="RFQ"
                name="rfq_id"
                rules={[{ required: true, message: "Выберите RFQ" }]}
              >
                <Select style={{ width: 160 }} options={rfqOptions} />
              </Form.Item>
              <Form.Item
                label="Название"
                name="name"
                rules={[{ required: true, message: "Укажите название" }]}
              >
                <Input style={{ width: 200 }} />
              </Form.Item>
              <Form.Item label="Товары" name="goods_total">
                <InputNumber style={{ width: 120 }} min={0} />
              </Form.Item>
              <Form.Item label="Логистика" name="logistics_total">
                <InputNumber style={{ width: 120 }} min={0} />
              </Form.Item>
              <Form.Item label="Пошлины" name="duty_total">
                <InputNumber style={{ width: 120 }} min={0} />
              </Form.Item>
              <Form.Item label="Склад" name="warehouse_total">
                <InputNumber style={{ width: 120 }} min={0} />
              </Form.Item>
              <Form.Item label="Итого" name="landed_total">
                <InputNumber style={{ width: 120 }} min={0} />
              </Form.Item>
              <Form.Item label="Валюта" name="currency">
                <Input style={{ width: 90 }} />
              </Form.Item>
              <Form.Item label="ETA" name="eta_days">
                <InputNumber style={{ width: 100 }} min={0} />
              </Form.Item>
              <Form.Item label="Заметка" name="note">
                <Input style={{ width: 200 }} />
              </Form.Item>
              <Form.Item style={{ marginTop: 30 }}>
                <Button type="primary" htmlType="submit">
                  Создать снимок
                </Button>
              </Form.Item>
            </Space>
          </Form>

          <Table
            rowKey="id"
            dataSource={landedCosts}
            pagination={{ pageSize: 10 }}
            columns={[
              {
                title: "RFQ",
                dataIndex: "rfq_id",
                width: 200,
                render: (v) => rfqMap.get(v) || "—",
              },
              { title: "Название", dataIndex: "name" },
              {
                title: "Итого",
                dataIndex: "landed_total",
                width: 150,
                render: (v, r) => formatPriceWithCurrency(v, r?.currency),
              },
              { title: "Валюта", dataIndex: "currency", width: 90 },
              { title: "ETA", dataIndex: "eta_days", width: 90 },
            ]}
          />
        </Card>
      </Space>
    </PageWrapper>
  )
}

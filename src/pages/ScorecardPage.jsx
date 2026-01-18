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
  Checkbox,
  message,
  Tag,
} from "antd"
import PageWrapper from "@/components/common/PageWrapper"
import axios from "@/api/axiosInstance"

export default function ScorecardPage() {
  const [templates, setTemplates] = useState([])
  const [activeTemplate, setActiveTemplate] = useState(null)
  const [criteria, setCriteria] = useState([])
  const [loading, setLoading] = useState(false)

  const [templateForm] = Form.useForm()
  const [criteriaForm] = Form.useForm()

  const loadTemplates = async () => {
    setLoading(true)
    try {
      const { data } = await axios.get("/scorecard/templates")
      setTemplates(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
      message.error("Не удалось загрузить шаблоны")
    } finally {
      setLoading(false)
    }
  }

  const loadCriteria = async (templateId) => {
    if (!templateId) {
      setCriteria([])
      return
    }
    try {
      const { data } = await axios.get(`/scorecard/templates/${templateId}/criteria`)
      setCriteria(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
      message.error("Не удалось загрузить критерии")
    }
  }

  useEffect(() => {
    loadTemplates()
  }, [])

  const handleCreateTemplate = async (values) => {
    try {
      await axios.post("/scorecard/templates", {
        name: values.name,
        scope: values.scope || "SUPPLIER",
        is_active: values.is_active ? 1 : 0,
      })
      templateForm.resetFields()
      await loadTemplates()
      message.success("Шаблон создан")
    } catch (e) {
      console.error(e)
      message.error("Не удалось создать шаблон")
    }
  }

  const handleCreateCriteria = async (values) => {
    if (!activeTemplate?.id) return
    try {
      await axios.post(`/scorecard/templates/${activeTemplate.id}/criteria`, {
        code: values.code,
        name: values.name,
        weight: values.weight ?? 0,
      })
      criteriaForm.resetFields()
      await loadCriteria(activeTemplate.id)
      message.success("Критерий добавлен")
    } catch (e) {
      console.error(e)
      message.error("Не удалось добавить критерий")
    }
  }

  const scopeOptions = useMemo(
    () => [
      { value: "SUPPLIER", label: "Поставщик" },
      { value: "RFQ", label: "RFQ" },
    ],
    [],
  )

  return (
    <PageWrapper
      title="Оценка поставщиков"
      helpText="Создавайте шаблоны и критерии для scorecard."
    >
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Card title="Новый шаблон" size="small">
          <Form form={templateForm} layout="vertical" onFinish={handleCreateTemplate}>
            <Space wrap align="start">
              <Form.Item
                label="Название"
                name="name"
                rules={[{ required: true, message: "Укажите название" }]}
              >
                <Input style={{ width: 240 }} />
              </Form.Item>
              <Form.Item label="Область" name="scope" initialValue="SUPPLIER">
                <Select style={{ width: 160 }} options={scopeOptions} />
              </Form.Item>
              <Form.Item name="is_active" valuePropName="checked">
                <Checkbox>Активный</Checkbox>
              </Form.Item>
              <Form.Item style={{ marginTop: 30 }}>
                <Button type="primary" htmlType="submit">
                  Создать
                </Button>
              </Form.Item>
            </Space>
          </Form>
        </Card>

        <Card title="Шаблоны" size="small">
          <Table
            rowKey="id"
            dataSource={templates}
            loading={loading}
            pagination={{ pageSize: 10 }}
            onRow={(record) => ({
              onClick: async () => {
                setActiveTemplate(record)
                await loadCriteria(record.id)
              },
            })}
            columns={[
              { title: "Название", dataIndex: "name" },
              { title: "Область", dataIndex: "scope", width: 120 },
              {
                title: "Статус",
                dataIndex: "is_active",
                width: 120,
                render: (v) => (v ? <Tag color="green">Активен</Tag> : "—"),
              },
            ]}
          />
        </Card>

        <Card
          title={`Критерии${activeTemplate ? `: ${activeTemplate.name}` : ""}`}
          size="small"
        >
          <Form form={criteriaForm} layout="vertical" onFinish={handleCreateCriteria}>
            <Space wrap align="start">
              <Form.Item
                label="Код"
                name="code"
                rules={[{ required: true, message: "Код обязателен" }]}
              >
                <Input style={{ width: 140 }} />
              </Form.Item>
              <Form.Item
                label="Название"
                name="name"
                rules={[{ required: true, message: "Название обязательно" }]}
              >
                <Input style={{ width: 240 }} />
              </Form.Item>
              <Form.Item label="Вес" name="weight">
                <InputNumber style={{ width: 120 }} min={0} step={0.1} />
              </Form.Item>
              <Form.Item style={{ marginTop: 30 }}>
                <Button type="primary" htmlType="submit" disabled={!activeTemplate}>
                  Добавить
                </Button>
              </Form.Item>
            </Space>
          </Form>

          <Table
            rowKey="id"
            dataSource={criteria}
            pagination={false}
            columns={[
              { title: "Код", dataIndex: "code", width: 120 },
              { title: "Название", dataIndex: "name" },
              { title: "Вес", dataIndex: "weight", width: 120 },
            ]}
          />
        </Card>
      </Space>
    </PageWrapper>
  )
}

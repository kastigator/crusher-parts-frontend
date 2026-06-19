import React, { useCallback, useEffect, useState } from "react"
import {
  Button,
  Card,
  Col,
  Empty,
  Form,
  Input,
  Modal,
  Row,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd"
import axios from "@/api/axiosInstance"

export default function GlossaryPage() {
  const [terms, setTerms] = useState([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTerm, setEditingTerm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()

  const loadTerms = useCallback(async (q = "") => {
    setLoading(true)
    try {
      const { data } = await axios.get("/glossary-terms", {
        params: { q: q || undefined },
      })
      setTerms(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("GET /glossary-terms error:", err)
      message.error(err?.response?.data?.message || "Не удалось загрузить глоссарий")
      setTerms([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTerms()
  }, [loadTerms])

  const openCreate = () => {
    setEditingTerm(null)
    form.resetFields()
    setModalOpen(true)
  }

  const openEdit = (row) => {
    setEditingTerm(row)
    form.setFieldsValue({
      term: row.term || "",
      aliases: Array.isArray(row.aliases) ? row.aliases.join(", ") : "",
      definition: row.definition || "",
      canonical_entity: row.canonical_entity || "",
      scope: row.scope || "",
      notes: row.notes || "",
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      const payload = {
        ...values,
        aliases: String(values.aliases || "")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      }
      setSaving(true)
      if (editingTerm?.id) {
        await axios.put(`/glossary-terms/${editingTerm.id}`, payload)
      } else {
        await axios.post("/glossary-terms", payload)
      }
      message.success(editingTerm?.id ? "Термин обновлен" : "Термин добавлен")
      setModalOpen(false)
      setEditingTerm(null)
      await loadTerms(query)
    } catch (err) {
      if (err?.errorFields) return
      console.error("save glossary term error:", err)
      message.error(err?.response?.data?.message || "Не удалось сохранить термин")
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    {
      title: "Термин",
      width: 260,
      render: (_, row) => (
        <Space direction="vertical" size={2}>
          <Typography.Text strong>{row.term || "—"}</Typography.Text>
          {Array.isArray(row.aliases) && row.aliases.length ? (
            <Typography.Text type="secondary">{row.aliases.join(", ")}</Typography.Text>
          ) : null}
        </Space>
      ),
    },
    {
      title: "Определение",
      dataIndex: "definition",
      render: (value) => value || "—",
    },
    {
      title: "Область",
      width: 180,
      render: (_, row) => (
        <Space wrap size={4}>
          {row.scope ? <Tag>{row.scope}</Tag> : null}
          {row.canonical_entity ? <Tag color="blue">{row.canonical_entity}</Tag> : null}
        </Space>
      ),
    },
    {
      title: "",
      width: 110,
      render: (_, row) => (
        <Button size="small" onClick={() => openEdit(row)}>
          Изменить
        </Button>
      ),
    },
  ]

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <Card
        title="Глоссарий"
        extra={
          <Button type="primary" onClick={openCreate}>
            Добавить термин
          </Button>
        }
      >
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
            Общий словарь терминов для классификатора, BOM, карточек товара, клиентов и поставщиков.
          </Typography.Paragraph>
          <Input.Search
            allowClear
            enterButton="Найти"
            placeholder="Термин, синоним, определение или сущность"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onSearch={loadTerms}
            loading={loading}
          />
          <Table
            size="small"
            rowKey="id"
            columns={columns}
            dataSource={terms}
            loading={loading}
            pagination={{ pageSize: 20, showSizeChanger: false }}
            locale={{ emptyText: <Empty description="Термины не найдены" /> }}
          />
        </Space>
      </Card>

      <Modal
        open={modalOpen}
        title={editingTerm ? "Изменить термин" : "Добавить термин"}
        okText="Сохранить"
        cancelText="Отмена"
        confirmLoading={saving}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
      >
        <Form form={form} layout="vertical">
          <Form.Item label="Термин" name="term" rules={[{ required: true, message: "Укажите термин" }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Синонимы" name="aliases">
            <Input placeholder="Через запятую" />
          </Form.Item>
          <Form.Item label="Определение" name="definition" rules={[{ required: true, message: "Укажите определение" }]}>
            <Input.TextArea rows={4} />
          </Form.Item>
          <Row gutter={12}>
            <Col xs={24} md={12}>
              <Form.Item label="Сущность" name="canonical_entity">
                <Input placeholder="catalog_position" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Область" name="scope">
                <Input placeholder="Классификатор/BOM" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Заметки" name="notes">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  )
}

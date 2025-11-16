// src/components/suppliers/SuppliersMain.jsx
import React, { useEffect, useMemo, useRef, useState } from "react"
import { Card, Row, Col, Button, Form, Input, Space, message, Tag } from "antd"
import {
  PlusOutlined,
  ReloadOutlined,
  ImportOutlined,
  TeamOutlined,
} from "@ant-design/icons"
import axios from "@/api/axiosInstance"

import TableToolbar from "@/components/common/TableToolbar"
import SuppliersTable from "./SuppliersTable"
import ImportModal from "@/components/common/ImportModal"
import FullHistoryDialog from "@/components/common/FullHistoryDialog"

const SUPPLIERS_TEMPLATE_URL =
  "https://storage.googleapis.com/shared-parts-bucket/templates/suppliers_template.xlsx"

export default function SuppliersMain() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [importOpen, setImportOpen] = useState(false)
  const [logsOpen, setLogsOpen] = useState(false)

  const [editingSupplier, setEditingSupplier] = useState(null) // {mode: 'create'|'edit', record?}

  // ETag/баннер изменений по поставщикам
  const [etagInfo, setEtagInfo] = useState(null)
  const baselineRef = useRef(null)

  const loadSuppliers = async () => {
    setLoading(true)
    try {
      const { data: list } = await axios.get("/part-suppliers", {
        params: { limit: 500, offset: 0 },
      })
      setData(Array.isArray(list) ? list : [])
    } catch (e) {
      console.error("Ошибка загрузки поставщиков:", e)
      message.error("Не удалось загрузить поставщиков")
    } finally {
      setLoading(false)
    }
  }

  const loadEtag = async () => {
    try {
      const { data } = await axios.get("/part-suppliers/etag")
      setEtagInfo(data)
    } catch (e) {
      console.error("Ошибка получения etag поставщиков:", e)
    }
  }

  useEffect(() => {
    loadSuppliers()
    loadEtag()
  }, [])

  const refreshAll = async () => {
    await loadSuppliers()
    await loadEtag()
  }

  const handleSupplierCreated = (created) => {
    setData((prev) => [created, ...prev])
  }

  const handleSupplierUpdated = (fresh) => {
    setData((prev) => prev.map((r) => (r.id === fresh.id ? fresh : r)))
  }

  const handleSupplierDeleted = (id) => {
    setData((prev) => prev.filter((r) => r.id !== id))
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return data
    return data.filter((s) => {
      return (
        String(s.company_name || "").toLowerCase().includes(q) ||
        String(s.country || "").toLowerCase().includes(q) ||
        String(s.city || "").toLowerCase().includes(q) ||
        String(s.notes || "").toLowerCase().includes(q)
      )
    })
  }, [data, search])

  const startCreate = () => {
    setEditingSupplier({ mode: "create" })
  }

  const startEdit = (record) => {
    setEditingSupplier({ mode: "edit", record })
  }

  const closeDrawer = () => setEditingSupplier(null)

  const [form] = Form.useForm()

  useEffect(() => {
    if (editingSupplier?.mode === "edit" && editingSupplier.record) {
      form.setFieldsValue(editingSupplier.record)
    } else if (editingSupplier?.mode === "create") {
      form.resetFields()
    }
  }, [editingSupplier, form])

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      if (editingSupplier.mode === "create") {
        const { data: created } = await axios.post("/part-suppliers", values)
        handleSupplierCreated(created)
        message.success("Поставщик создан")
      } else {
        const id = editingSupplier.record.id
        const { data: fresh } = await axios.put(`/part-suppliers/${id}`, values)
        handleSupplierUpdated(fresh)
        message.success("Поставщик обновлён")
      }
      closeDrawer()
    } catch (e) {
      if (e?.errorFields) return
      console.error("Ошибка сохранения поставщика:", e)
      message.error("Не удалось сохранить поставщика")
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card
        size="small"
        title={
          <Space>
            <TeamOutlined />
            <span>Поставщики</span>
            {etagInfo && (
              <Tag>
                {etagInfo.cnt} записей / sum_ver {etagInfo.sum_ver}
              </Tag>
            )}
          </Space>
        }
        extra={
          <Space>
            <Button
              icon={<ReloadOutlined />}
              size="small"
              onClick={refreshAll}
            >
              Обновить
            </Button>
            <Button
              icon={<ImportOutlined />}
              size="small"
              onClick={() => setImportOpen(true)}
            >
              Импорт
            </Button>
          </Space>
        }
      >
        <TableToolbar
          search={search}
          onSearch={setSearch}
          placeholder="Поиск по поставщикам..."
          onAdd={startCreate}
          onShowDeleted={() => setLogsOpen(true)}
        />

        <SuppliersTable
          data={filtered}
          loading={loading}
          onUpdated={handleSupplierUpdated}
          onDeleted={handleSupplierDeleted}
          onChanged={refreshAll}
          onEdit={startEdit}
        />
      </Card>

      {/* Форма создания/редактирования поставщика */}
      {editingSupplier && (
        <Card
          size="small"
          title={
            editingSupplier.mode === "create"
              ? "Новый поставщик"
              : "Редактирование поставщика"
          }
          style={{ marginTop: 8 }}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            autoComplete="off"
          >
            <Row gutter={12}>
              <Col span={8}>
                <Form.Item
                  label="Название компании"
                  name="company_name"
                  rules={[
                    { required: true, message: "Укажите название компании" },
                  ]}
                >
                  <Input />
                </Form.Item>
              </Col>
              <Col span={4}>
                <Form.Item label="Страна" name="country">
                  <Input />
                </Form.Item>
              </Col>
              <Col span={4}>
                <Form.Item label="Город" name="city">
                  <Input />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="Примечание" name="notes">
                  <Input.TextArea rows={2} />
                </Form.Item>
              </Col>
            </Row>
            <Space>
              <Button onClick={closeDrawer}>Отмена</Button>
              <Button type="primary" htmlType="submit">
                Сохранить
              </Button>
            </Space>
          </Form>
        </Card>
      )}

      {/* Импорт поставщиков */}
      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        type="suppliers"
        templateUrl={SUPPLIERS_TEMPLATE_URL}
        onImported={refreshAll}
      />

      {/* Просмотр удалённых поставщиков / логов */}
      {logsOpen && (
        <FullHistoryDialog
          open={logsOpen}
          entityType="suppliers"
          onlyDeleted
          onClose={() => setLogsOpen(false)}
        />
      )}
    </div>
  )
}

import React, { useEffect, useMemo, useState } from "react"
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  message,
} from "antd"
import axios from "@/api/axiosInstance"
import PageWrapper from "@/components/common/PageWrapper"
import CountrySelect from "@/components/inputs/CountrySelect"

const RISK_OPTIONS = [
  { value: "low", label: "Низкий" },
  { value: "medium", label: "Средний" },
  { value: "high", label: "Высокий" },
  { value: "critical", label: "Критический" },
]
const SANCTION_OPTIONS = [
  { value: "none", label: "Нет" },
  { value: "watch", label: "Под наблюдением" },
  { value: "restricted", label: "Ограничения" },
  { value: "blocked", label: "Блокировано" },
]
const RISK_COLOR = {
  low: "green",
  medium: "gold",
  high: "orange",
  critical: "red",
}

export default function CountryRiskProfilesPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form] = Form.useForm()

  const fetchRows = async () => {
    setLoading(true)
    try {
      const { data } = await axios.get("/country-risk-profiles")
      setRows(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
      message.error("Не удалось загрузить риск-профили")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRows()
  }, [])

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({
      risk_level: "medium",
      sanctions_status: "none",
      logistics_risk_factor: 1,
      customs_delay_days: 0,
    })
    setModalOpen(true)
  }

  const openEdit = (record) => {
    setEditing(record)
    form.setFieldsValue({
      country_code: record.country_code || undefined,
      risk_level: record.risk_level || "medium",
      risk_score: record.risk_score,
      sanctions_status: record.sanctions_status || "none",
      logistics_risk_factor: record.logistics_risk_factor,
      customs_delay_days: record.customs_delay_days,
      payment_risk_days: record.payment_risk_days,
      notes: record.notes || "",
    })
    setModalOpen(true)
  }

  const save = async () => {
    try {
      const values = await form.validateFields()
      const code = String(values.country_code || "").trim().toUpperCase()
      if (!code) {
        message.warning("Укажите страну")
        return
      }
      const payload = {
        country_code: code,
        risk_level: values.risk_level || "medium",
        risk_score: values.risk_score ?? null,
        sanctions_status: values.sanctions_status || "none",
        logistics_risk_factor: values.logistics_risk_factor ?? 1,
        customs_delay_days: values.customs_delay_days ?? 0,
        payment_risk_days: values.payment_risk_days ?? null,
        notes: values.notes || null,
      }
      setSaving(true)
      if (editing?.country_code) {
        await axios.put(`/country-risk-profiles/${editing.country_code}`, payload)
        message.success("Профиль обновлен")
      } else {
        await axios.post("/country-risk-profiles", payload)
        message.success("Профиль добавлен")
      }
      setModalOpen(false)
      setEditing(null)
      form.resetFields()
      await fetchRows()
    } catch (e) {
      if (e?.errorFields) return
      console.error(e)
      message.error(e?.response?.data?.message || "Не удалось сохранить профиль")
    } finally {
      setSaving(false)
    }
  }

  const remove = async (record) => {
    try {
      await axios.delete(`/country-risk-profiles/${record.country_code}`)
      message.success("Профиль удален")
      await fetchRows()
    } catch (e) {
      console.error(e)
      message.error(e?.response?.data?.message || "Не удалось удалить профиль")
    }
  }

  const stats = useMemo(() => {
    const total = rows.length
    const high = rows.filter((r) => ["high", "critical"].includes(String(r.risk_level))).length
    const sanctions = rows.filter((r) => String(r.sanctions_status || "none") !== "none").length
    return { total, high, sanctions }
  }, [rows])

  return (
    <PageWrapper
      title="Риски стран"
      helpText="Справочник страновых рисков для расчета поставки и приоритизации поставщиков."
    >
      <Space direction="vertical" size={12} style={{ width: "100%" }}>
        <Card size="small">
          <Space wrap style={{ justifyContent: "space-between", width: "100%" }}>
            <Space wrap>
              <Tag color="blue">Стран: {stats.total}</Tag>
              <Tag color={stats.high ? "orange" : "default"}>Высокий риск: {stats.high}</Tag>
              <Tag color={stats.sanctions ? "red" : "default"}>С санкциями: {stats.sanctions}</Tag>
            </Space>
            <Space>
              <Button onClick={fetchRows}>Обновить</Button>
              <Button type="primary" onClick={openCreate}>
                Добавить страну
              </Button>
            </Space>
          </Space>
        </Card>

        <Table
          rowKey="country_code"
          dataSource={rows}
          loading={loading}
          pagination={{ pageSize: 20 }}
          columns={[
            { title: "Страна", dataIndex: "country_code", width: 100 },
            {
              title: "Риск",
              dataIndex: "risk_level",
              width: 130,
              render: (v) => (
                <Tag color={RISK_COLOR[v] || "default"}>
                  {RISK_OPTIONS.find((x) => x.value === v)?.label || v || "—"}
                </Tag>
              ),
            },
            { title: "Оценка риска", dataIndex: "risk_score", width: 120, render: (v) => v ?? "—" },
            {
              title: "Санкции",
              dataIndex: "sanctions_status",
              width: 170,
              render: (v) => SANCTION_OPTIONS.find((x) => x.value === v)?.label || v || "—",
            },
            { title: "Коэфф. логистики", dataIndex: "logistics_risk_factor", width: 130, render: (v) => v ?? "—" },
            { title: "Задержка таможни, дн", dataIndex: "customs_delay_days", width: 150, render: (v) => v ?? "—" },
            { title: "Риск оплаты, дн", dataIndex: "payment_risk_days", width: 130, render: (v) => v ?? "—" },
            { title: "Примечание", dataIndex: "notes", ellipsis: true },
            {
              title: "Действия",
              width: 150,
              render: (_, record) => (
                <Space size={8}>
                  <Button size="small" onClick={() => openEdit(record)}>
                    Изменить
                  </Button>
                  <Popconfirm
                    title={`Удалить профиль ${record.country_code}?`}
                    okText="Удалить"
                    cancelText="Отмена"
                    onConfirm={() => remove(record)}
                  >
                    <Button size="small" danger>
                      Удалить
                    </Button>
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />

        <Modal
          open={modalOpen}
          onCancel={() => setModalOpen(false)}
          onOk={save}
          confirmLoading={saving}
          okText="Сохранить"
          title={editing ? "Изменить профиль страны" : "Новый профиль страны"}
          width={760}
        >
          <Form form={form} layout="vertical">
            <Space style={{ width: "100%" }} align="start" wrap>
              <Form.Item
                label="Страна"
                name="country_code"
                rules={[{ required: true, message: "Выберите страну" }]}
                style={{ minWidth: 180 }}
              >
                <CountrySelect disabled={Boolean(editing)} />
              </Form.Item>
              <Form.Item label="Уровень риска" name="risk_level" style={{ minWidth: 170 }}>
                <Select options={RISK_OPTIONS} />
              </Form.Item>
              <Form.Item label="Санкции" name="sanctions_status" style={{ minWidth: 190 }}>
                <Select options={SANCTION_OPTIONS} />
              </Form.Item>
              <Form.Item label="Оценка риска" name="risk_score" style={{ minWidth: 130 }}>
                <InputNumber min={0} max={100} style={{ width: "100%" }} />
              </Form.Item>
            </Space>
            <Space style={{ width: "100%" }} align="start" wrap>
              <Form.Item label="Коэфф. логистики" name="logistics_risk_factor" style={{ minWidth: 160 }}>
                <InputNumber min={0} step={0.001} style={{ width: "100%" }} />
              </Form.Item>
              <Form.Item label="Задержка таможни, дн" name="customs_delay_days" style={{ minWidth: 160 }}>
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>
              <Form.Item label="Риск оплаты, дн" name="payment_risk_days" style={{ minWidth: 150 }}>
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>
            </Space>
            <Form.Item label="Примечание" name="notes">
              <Input.TextArea rows={3} />
            </Form.Item>
          </Form>
        </Modal>
      </Space>
    </PageWrapper>
  )
}

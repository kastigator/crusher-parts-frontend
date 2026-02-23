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
  Switch,
  Table,
  Tag,
  message,
} from "antd"
import axios from "@/api/axiosInstance"
import PageWrapper from "@/components/common/PageWrapper"
import CountrySelect from "@/components/inputs/CountrySelect"

const RESTRICTION_OPTIONS = [
  { value: "none", label: "Нет" },
  { value: "watch", label: "Под наблюдением" },
  { value: "restricted", label: "Ограничено" },
  { value: "blocked", label: "Заблокировано" },
]

const RESTRICTION_COLOR = {
  none: "green",
  watch: "gold",
  restricted: "orange",
  blocked: "red",
}

export default function TnvedOriginRulesPage() {
  const [rows, setRows] = useState([])
  const [tnvedOptions, setTnvedOptions] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(null)
  const [searchText, setSearchText] = useState("")
  const [countryFilter, setCountryFilter] = useState(null)
  const [onlyActive, setOnlyActive] = useState(true)
  const [form] = Form.useForm()

  const fetchTnvedCodes = async () => {
    try {
      const { data } = await axios.get("/tnved-codes")
      const list = Array.isArray(data) ? data : []
      setTnvedOptions(
        list.map((row) => ({
          value: row.id,
          label: `${row.code || ""}${row.description ? ` — ${row.description}` : ""}`,
          code: row.code,
          description: row.description,
        }))
      )
    } catch (e) {
      console.error(e)
      message.error("Не удалось загрузить коды ТН ВЭД")
    }
  }

  const fetchRows = async () => {
    setLoading(true)
    try {
      const params = {}
      if (onlyActive) params.only_active = 1
      if (countryFilter) params.country = countryFilter
      if (searchText.trim()) params.q = searchText.trim()
      const { data } = await axios.get("/tnved-origin-rules", { params })
      setRows(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
      message.error("Не удалось загрузить правила")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTnvedCodes()
  }, [])

  useEffect(() => {
    fetchRows()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlyActive, countryFilter])

  const stats = useMemo(() => {
    const total = rows.length
    const blocked = rows.filter((r) => String(r.restriction_level) === "blocked").length
    const restricted = rows.filter((r) => ["restricted", "blocked"].includes(String(r.restriction_level))).length
    return { total, blocked, restricted }
  }, [rows])

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({
      restriction_level: "none",
      is_active: true,
    })
    setModalOpen(true)
  }

  const openEdit = (record) => {
    setEditing(record)
    form.setFieldsValue({
      tnved_code_id: record.tnved_code_id,
      origin_country: record.origin_country || undefined,
      duty_rate: record.duty_rate,
      vat_rate: record.vat_rate,
      restriction_level: record.restriction_level || "none",
      restriction_note: record.restriction_note || "",
      required_docs: record.required_docs ? JSON.stringify(record.required_docs, null, 2) : "",
      effective_from: record.effective_from || null,
      effective_to: record.effective_to || null,
      is_active: Number(record.is_active) === 1,
    })
    setModalOpen(true)
  }

  const save = async () => {
    try {
      const values = await form.validateFields()
      const payload = {
        tnved_code_id: values.tnved_code_id,
        origin_country: values.origin_country || null,
        duty_rate: values.duty_rate ?? null,
        vat_rate: values.vat_rate ?? null,
        restriction_level: values.restriction_level || "none",
        restriction_note: values.restriction_note || null,
        required_docs: values.required_docs || null,
        effective_from: values.effective_from || null,
        effective_to: values.effective_to || null,
        is_active: values.is_active ? 1 : 0,
      }

      setSaving(true)
      if (editing?.id) {
        await axios.put(`/tnved-origin-rules/${editing.id}`, payload)
        message.success("Правило обновлено")
      } else {
        await axios.post("/tnved-origin-rules", payload)
        message.success("Правило добавлено")
      }
      setModalOpen(false)
      setEditing(null)
      form.resetFields()
      await fetchRows()
    } catch (e) {
      if (e?.errorFields) return
      console.error(e)
      message.error(e?.response?.data?.message || "Не удалось сохранить правило")
    } finally {
      setSaving(false)
    }
  }

  const remove = async (record) => {
    try {
      await axios.delete(`/tnved-origin-rules/${record.id}`)
      message.success("Правило удалено")
      await fetchRows()
    } catch (e) {
      console.error(e)
      message.error(e?.response?.data?.message || "Не удалось удалить правило")
    }
  }

  return (
    <PageWrapper
      title="Правила ТН ВЭД + страна происхождения"
      helpText="Отдельный справочник исключений и специальных условий. Базовый код и описание остаются в каталоге «Коды ТН ВЭД»."
    >
      <Space direction="vertical" size={12} style={{ width: "100%" }}>
        <Card size="small">
          <Space wrap style={{ justifyContent: "space-between", width: "100%" }}>
            <Space wrap>
              <Tag color="blue">Правил: {stats.total}</Tag>
              <Tag color={stats.restricted ? "orange" : "default"}>С ограничениями: {stats.restricted}</Tag>
              <Tag color={stats.blocked ? "red" : "default"}>Заблокировано: {stats.blocked}</Tag>
            </Space>
            <Space>
              <Input
                allowClear
                placeholder="Поиск по коду/описанию"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onPressEnter={fetchRows}
                style={{ width: 240 }}
              />
              <CountrySelect
                allowClear
                value={countryFilter}
                onChange={(v) => setCountryFilter(v || null)}
                style={{ width: 150 }}
                placeholder="Страна"
              />
              <Space size={6}>
                <span>Только активные</span>
                <Switch checked={onlyActive} onChange={setOnlyActive} />
              </Space>
              <Button onClick={fetchRows}>Обновить</Button>
              <Button type="primary" onClick={openCreate}>
                Добавить правило
              </Button>
            </Space>
          </Space>
        </Card>

        <Table
          rowKey="id"
          loading={loading}
          dataSource={rows}
          pagination={{ pageSize: 20 }}
          columns={[
            {
              title: "Код ТН ВЭД",
              dataIndex: "tnved_code",
              width: 150,
              render: (_, r) => r.tnved_code || "—",
            },
            {
              title: "Описание",
              dataIndex: "tnved_description",
              ellipsis: true,
              render: (v) => v || "—",
            },
            {
              title: "Страна происх.",
              dataIndex: "origin_country",
              width: 120,
              render: (v) => v || "—",
            },
            {
              title: "Пошлина, %",
              dataIndex: "duty_rate",
              width: 110,
              render: (v) => (v == null ? "—" : Number(v).toFixed(2)),
            },
            {
              title: "НДС, %",
              dataIndex: "vat_rate",
              width: 90,
              render: (v) => (v == null ? "—" : Number(v).toFixed(2)),
            },
            {
              title: "Ограничения",
              dataIndex: "restriction_level",
              width: 140,
              render: (v) => (
                <Tag color={RESTRICTION_COLOR[v] || "default"}>
                  {RESTRICTION_OPTIONS.find((x) => x.value === v)?.label || v || "—"}
                </Tag>
              ),
            },
            {
              title: "Действует",
              width: 170,
              render: (_, r) => {
                const from = r.effective_from || "—"
                const to = r.effective_to || "—"
                return `${from} .. ${to}`
              },
            },
            {
              title: "Активно",
              dataIndex: "is_active",
              width: 90,
              render: (v) => (Number(v) === 1 ? <Tag color="green">Да</Tag> : <Tag>Нет</Tag>),
            },
            {
              title: "Действия",
              width: 150,
              render: (_, record) => (
                <Space size={8}>
                  <Button size="small" onClick={() => openEdit(record)}>
                    Изменить
                  </Button>
                  <Popconfirm
                    title="Удалить правило?"
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
          title={editing ? "Изменить правило" : "Новое правило"}
          width={860}
        >
          <Form form={form} layout="vertical">
            <Space align="start" wrap style={{ width: "100%" }}>
              <Form.Item
                label="Код ТН ВЭД"
                name="tnved_code_id"
                rules={[{ required: true, message: "Выберите код ТН ВЭД" }]}
                style={{ minWidth: 340, flex: 1 }}
              >
                <Select
                  showSearch
                  optionFilterProp="label"
                  options={tnvedOptions}
                  placeholder="Выберите код"
                />
              </Form.Item>
              <Form.Item
                label="Страна происхождения"
                name="origin_country"
                rules={[{ required: true, message: "Выберите страну" }]}
                style={{ minWidth: 180 }}
              >
                <CountrySelect />
              </Form.Item>
              <Form.Item label="Активно" name="is_active" valuePropName="checked" style={{ minWidth: 110 }}>
                <Switch />
              </Form.Item>
            </Space>

            <Space align="start" wrap style={{ width: "100%" }}>
              <Form.Item label="Пошлина, %" name="duty_rate" style={{ minWidth: 150 }}>
                <InputNumber min={0} max={100} step={0.01} style={{ width: "100%" }} />
              </Form.Item>
              <Form.Item label="НДС, %" name="vat_rate" style={{ minWidth: 150 }}>
                <InputNumber min={0} max={100} step={0.01} style={{ width: "100%" }} />
              </Form.Item>
              <Form.Item label="Уровень ограничений" name="restriction_level" style={{ minWidth: 200 }}>
                <Select options={RESTRICTION_OPTIONS} />
              </Form.Item>
              <Form.Item label="Действует с" name="effective_from" style={{ minWidth: 150 }}>
                <Input placeholder="YYYY-MM-DD" />
              </Form.Item>
              <Form.Item label="Действует по" name="effective_to" style={{ minWidth: 150 }}>
                <Input placeholder="YYYY-MM-DD" />
              </Form.Item>
            </Space>

            <Form.Item label="Комментарий по ограничению" name="restriction_note">
              <Input.TextArea rows={2} placeholder="Например: требуется лицензия/сертификат" />
            </Form.Item>

            <Form.Item label="Требуемые документы (JSON или текст)" name="required_docs">
              <Input.TextArea rows={3} placeholder='["сертификат происхождения", "инвойс"]' />
            </Form.Item>
          </Form>
        </Modal>
      </Space>
    </PageWrapper>
  )
}

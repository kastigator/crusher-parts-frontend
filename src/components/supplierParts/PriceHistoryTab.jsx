// src/components/supplierParts/PriceHistoryTab.jsx
import React, {
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
} from "react"
import {
  Table,
  Form,
  InputNumber,
  DatePicker,
  Button,
  Input,
  Select,
  Space,
  message,
} from "antd"
import dayjs from "dayjs"
import axios from "@/api/axiosInstance"
import cc from "currency-codes"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ResponsiveContainer,
} from "recharts"
import ActionButtons from "@/components/common/ActionButtons"

const { RangePicker } = DatePicker

const CURRENCY_OPTIONS = cc.codes().map((code) => {
  const info = cc.code(code)
  return { value: code, label: `${code} — ${info?.currency || code}` }
})

// helpers для min/max, чтобы не зависеть от dayjs.min/max
const minDay = (dates) =>
  dates.reduce((min, d) => (!min || d.isBefore(min) ? d : min), null)
const maxDay = (dates) =>
  dates.reduce((max, d) => (!max || d.isAfter(max) ? d : max), null)

export default function PriceHistoryTab({ supplierPartId, onChanged = () => {} }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState(false)
  const [form] = Form.useForm()
  const abortRef = useRef(null)

  // inline-edit
  const [editingId, setEditingId] = useState(null)
  const [editingDraft, setEditingDraft] = useState(null)

  // фильтр для графика
  const [periodPreset, setPeriodPreset] = useState("all") // all | 3m | 1y | custom
  const [customRange, setCustomRange] = useState([null, null])

  const popupContainer = (trigger) =>
    trigger?.closest(".dock-shell") ||
    trigger?.closest(".parts-table-wrap") ||
    document.body

  // ----- загрузка -----
  const load = useCallback(
    async (silent = false) => {
      if (!supplierPartId) {
        setRows([])
        return
      }
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      setLoading(true)
      try {
        const { data } = await axios.get("/supplier-part-prices", {
          params: { supplier_part_id: supplierPartId },
          signal: controller.signal,
        })
        const arr = Array.isArray(data) ? data : []
        // сразу отсортируем по дате (новые сверху)
        arr.sort(
          (a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf()
        )
        setRows(arr)
      } catch (e) {
        if (e?.name === "AbortError" || e?.code === "ERR_CANCELED") return
        console.error(e)
        if (!silent) message.error("Не удалось загрузить историю цен")
      } finally {
        setLoading(false)
      }
    },
    [supplierPartId]
  )

  useEffect(() => {
    const t = setTimeout(() => load(true), 120)
    return () => {
      clearTimeout(t)
      abortRef.current?.abort()
    }
  }, [load, supplierPartId])

  // ----- добавление -----
  const addPrice = async () => {
    try {
      const v = await form.validateFields()
      if (!supplierPartId) {
        message.warning("Сначала выберите деталь поставщика")
        return
      }
      setAdding(true)
      await axios.post("/supplier-part-prices", {
        supplier_part_id: supplierPartId,
        price: v.price,
        currency: v.currency || null,
        date: v.date ? v.date.startOf("day").toDate() : new Date(),
        comment: v.comment || null,
      })
      message.success("Цена добавлена")
      form.resetFields()
      await load(true)
      onChanged()
    } catch (e) {
      if (e?.errorFields) return
      console.error(e)
      message.error(
        e?.response?.data?.message || "Не удалось добавить цену"
      )
    } finally {
      setAdding(false)
    }
  }

  // ----- удаление -----
  const handleDelete = async (row) => {
    try {
      await axios.delete(`/supplier-part-prices/${row.id}`)
      message.success("Запись удалена")
      await load(true)
      onChanged()
    } catch (e) {
      console.error(e)
      message.error(
        e?.response?.data?.message || "Не удалось удалить запись"
      )
    }
  }

  // ----- редактирование -----
  const startEdit = (row) => {
    setEditingId(row.id)
    setEditingDraft({
      price: row.price,
      currency: row.currency || null,
      date: row.date ? dayjs(row.date) : null,
      comment: row.comment || "",
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingDraft(null)
  }

  const saveEdit = async () => {
    if (!editingId || !editingDraft) return
    try {
      const payload = {
        price: editingDraft.price,
        currency: editingDraft.currency || null,
        date: editingDraft.date
          ? editingDraft.date.startOf("day").toDate()
          : null,
        comment: editingDraft.comment || null,
      }
      await axios.put(`/supplier-part-prices/${editingId}`, payload)
      message.success("Запись обновлена")
      cancelEdit()
      await load(true)
      onChanged()
    } catch (e) {
      console.error(e)
      message.error(
        e?.response?.data?.message || "Не удалось обновить запись"
      )
    }
  }

  const onEditKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault()
      saveEdit()
    } else if (e.key === "Escape") {
      e.preventDefault()
      cancelEdit()
    }
  }

  // ----- данные для графика -----
  const { chartData, fullMin, fullMax } = useMemo(() => {
    if (!rows.length) {
      return { chartData: [], fullMin: null, fullMax: null }
    }

    const sortedAsc = [...rows].sort(
      (a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf()
    )
    const dates = sortedAsc.map((r) => dayjs(r.date).startOf("day"))
    const minD = minDay(dates)
    const maxD = maxDay(dates)

    let from = null
    let to = null

    const today = dayjs().startOf("day")

    if (periodPreset === "3m") {
      from = today.subtract(3, "month")
      to = today
    } else if (periodPreset === "1y") {
      from = today.subtract(1, "year")
      to = today
    } else if (periodPreset === "custom") {
      if (customRange[0]) from = customRange[0].startOf("day")
      if (customRange[1]) to = customRange[1].startOf("day")
    } else {
      // all
      from = minD
      to = maxD
    }

    const filtered = sortedAsc.filter((r) => {
      const d = dayjs(r.date).startOf("day")
      if (from && d.isBefore(from, "day")) return false
      if (to && d.isAfter(to, "day")) return false
      return true
    })

    const data = filtered.map((r) => ({
      date: dayjs(r.date).format("YYYY-MM-DD"),
      price: Number(r.price),
      currency: r.currency,
      comment: r.comment,
    }))

    return { chartData: data, fullMin: minD, fullMax: maxD }
  }, [rows, periodPreset, customRange])

  const handlePresetClick = (preset) => {
    setPeriodPreset(preset)
    if (preset !== "custom") {
      setCustomRange([null, null])
    }
  }

  const onCustomRangeChange = (values) => {
    setPeriodPreset("custom")
    setCustomRange(values || [null, null])
  }

  // ----- колонки таблицы -----
  const columns = [
    {
      title: "Дата",
      dataIndex: "date",
      width: 140,
      sorter: (a, b) =>
        dayjs(a.date).valueOf() - dayjs(b.date).valueOf(),
      defaultSortOrder: "descend",
      render: (v, row) => {
        if (editingId === row.id) {
          return (
            <DatePicker
              value={editingDraft?.date || null}
              onChange={(val) =>
                setEditingDraft((d) => ({ ...d, date: val }))
              }
              format="DD.MM.YYYY"
              style={{ width: 130 }}
              getPopupContainer={popupContainer}
              onKeyDown={onEditKeyDown}
            />
          )
        }
        return v ? dayjs(v).format("DD.MM.YYYY") : "—"
      },
    },
    {
      title: "Цена",
      dataIndex: "price",
      width: 110,
      render: (v, row) =>
        editingId === row.id ? (
          <InputNumber
            min={0}
            step={0.01}
            value={editingDraft?.price}
            onChange={(val) =>
              setEditingDraft((d) => ({ ...d, price: val ?? 0 }))
            }
            style={{ width: 100 }}
            onKeyDown={onEditKeyDown}
          />
        ) : (
          Number(v).toFixed(2)
        ),
    },
    {
      title: "Валюта",
      dataIndex: "currency",
      width: 120,
      render: (v, row) =>
        editingId === row.id ? (
          <Select
            allowClear
            showSearch
            options={CURRENCY_OPTIONS}
            optionFilterProp="label"
            placeholder="Валюта"
            value={editingDraft?.currency || undefined}
            onChange={(val) =>
              setEditingDraft((d) => ({ ...d, currency: val || null }))
            }
            style={{ width: 200 }}
            dropdownMatchSelectWidth={false}
            getPopupContainer={popupContainer}
            onKeyDown={onEditKeyDown}
          />
        ) : (
          v || "—"
        ),
    },
    {
      title: "Комментарий",
      dataIndex: "comment",
      render: (v, row) =>
        editingId === row.id ? (
          <Input
            value={editingDraft?.comment}
            onChange={(e) =>
              setEditingDraft((d) => ({ ...d, comment: e.target.value }))
            }
            onKeyDown={onEditKeyDown}
          />
        ) : (
          v || ""
        ),
    },
    {
      title: "Действия",
      key: "actions",
      width: 90,
      align: "right",
      render: (_, row) => (
        <ActionButtons
          size="small"
          onDelete={() => handleDelete(row)}
          titles={{ delete: "Удалить запись" }}
        />
      ),
    },
  ]

  return (
    <div className="parts-table-wrap subtable-shell dock-shell">
      {/* форма добавления */}
      <Form
        form={form}
        layout="inline"
        className="table-section"
        style={{ flexWrap: "wrap", rowGap: 8 }}
      >
        <Form.Item
          name="price"
          label="Цена"
          rules={[{ required: true, message: "Укажите цену" }]}
        >
          <InputNumber min={0} step={0.01} style={{ width: 140 }} />
        </Form.Item>

        <Form.Item name="currency" label="Валюта (ISO3)">
          <Select
            allowClear
            showSearch
            options={CURRENCY_OPTIONS}
            optionFilterProp="label"
            placeholder="Выберите валюту"
            style={{ width: 220 }}
            dropdownMatchSelectWidth={false}
            getPopupContainer={popupContainer}
          />
        </Form.Item>

        <Form.Item name="date" label="Дата">
          <DatePicker
            allowClear
            format="DD.MM.YYYY"
            style={{ width: 150 }}
            getPopupContainer={popupContainer}
          />
        </Form.Item>

        <Form.Item name="comment" label="Комментарий" style={{ flex: 1 }}>
          <Input placeholder="По прайсу №…" style={{ minWidth: 220 }} />
        </Form.Item>

        <Form.Item>
          <Button type="primary" onClick={addPrice} loading={adding}>
            Добавить
          </Button>
        </Form.Item>
      </Form>

      {/* сетка: таблица + график справа */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 60%) minmax(0, 40%)",
          gap: 16,
          alignItems: "stretch",
        }}
      >
        <Table
          rowKey="id"
          className="op-table parts-table"
          dataSource={rows}
          columns={columns}
          loading={loading}
          size="small"
          pagination={{ pageSize: 10 }}
          onRow={(row) => ({
            onDoubleClick: () => startEdit(row),
          })}
        />

        <div
          style={{
            border: "1px solid #f0f0f0",
            borderRadius: 8,
            padding: 12,
            minHeight: 260,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 8,
              gap: 8,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontWeight: 500 }}>График изменений цены</span>

            <Space size={8} wrap>
              <span>Период:</span>
              <RangePicker
                allowEmpty={[true, true]}
                format="DD.MM.YYYY"
                value={customRange}
                onChange={onCustomRangeChange}
                size="small"
                getPopupContainer={popupContainer}
              />
              <Button
                size="small"
                type={periodPreset === "all" ? "primary" : "default"}
                onClick={() => handlePresetClick("all")}
              >
                Всё время
              </Button>
              <Button
                size="small"
                type={periodPreset === "3m" ? "primary" : "default"}
                onClick={() => handlePresetClick("3m")}
              >
                3 мес.
              </Button>
              <Button
                size="small"
                type={periodPreset === "1y" ? "primary" : "default"}
                onClick={() => handlePresetClick("1y")}
              >
                1 год
              </Button>
            </Space>
          </div>

          <div style={{ width: "100%", height: 220 }}>
            {chartData.length === 0 ? (
              <div
                style={{
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#999",
                  fontSize: 12,
                }}
              >
                Нет данных для графика
              </div>
            ) : (
              <ResponsiveContainer>
                <LineChart data={chartData} margin={{ top: 10, right: 10, bottom: 20, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v) => dayjs(v).format("DD.MM.YYYY")}
                    minTickGap={20}
                  />
                  <YAxis />
                  <ReTooltip
                    formatter={(value, name, props) => [
                      Number(value).toFixed(2),
                      "Цена",
                    ]}
                    labelFormatter={(label) =>
                      dayjs(label).format("DD.MM.YYYY")
                    }
                  />
                  <Line
                    type="linear"
                    dataKey="price"
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {fullMin && fullMax && (
            <div style={{ marginTop: 4, fontSize: 11, color: "#999" }}>
              Период данных:{" "}
              {fullMin.format("DD.MM.YYYY")} —{" "}
              {fullMax.format("DD.MM.YYYY")}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

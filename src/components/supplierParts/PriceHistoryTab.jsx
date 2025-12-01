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
import SupplierPartMaterialsTab from "./SupplierPartMaterialsTab"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  Legend,
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

const COLORS = [
  "#4f46e5",
  "#22c55e",
  "#eab308",
  "#ec4899",
  "#06b6d4",
  "#a855f7",
  "#f97316",
  "#0ea5e9",
]

export default function PriceHistoryTab({ supplierPartId, onChanged = () => {} }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState(false)
  const [form] = Form.useForm()
  const abortRef = useRef(null)

  const [materials, setMaterials] = useState([])
  const [materialFilter, setMaterialFilter] = useState(null)

  // inline-edit
  const [editingId, setEditingId] = useState(null)
  const [editingDraft, setEditingDraft] = useState(null)

  // фильтр для графика
  const [periodPreset, setPeriodPreset] = useState("all") // all | 3m | 1y | custom
  const [customRange, setCustomRange] = useState([null, null])

  // конвертация валют для графика
  const [baseCurrency, setBaseCurrency] = useState("raw") // raw | ISO3
  const [fxRates, setFxRates] = useState({})
  const [fxProblem, setFxProblem] = useState(null)

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
      // загрузим допустимые материалы для детали
      try {
        const { data } = await axios.get(`/supplier-part-materials/${supplierPartId}`)
        setMaterials(Array.isArray(data) ? data : [])
      } catch (e) {
        console.warn("Не удалось загрузить материалы детали", e)
      }
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      setLoading(true)
      try {
        const { data } = await axios.get("/supplier-part-prices", {
          params: {
            supplier_part_id: supplierPartId,
            material_id: materialFilter || undefined,
          },
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
    [supplierPartId, materialFilter]
  )

  useEffect(() => {
    const t = setTimeout(() => load(true), 120)
    return () => {
      clearTimeout(t)
      abortRef.current?.abort()
    }
  }, [load, supplierPartId, materialFilter])

  const availableCurrencies = useMemo(() => {
    const set = new Set(
      rows.map((r) => r.currency).filter((c) => typeof c === "string" && c)
    )
    return Array.from(set)
  }, [rows])

  useEffect(() => {
    const loadFx = async () => {
      if (baseCurrency === "raw") {
        setFxRates({})
        setFxProblem(null)
        return
      }
      const symbols = availableCurrencies.filter((c) => c !== baseCurrency)
      if (!symbols.length) {
        setFxRates({})
        setFxProblem(null)
        return
      }
      try {
        const { data } = await axios.get("/fx/rates", {
          params: { base: baseCurrency, symbols: symbols.join(",") },
        })
        const rates = {}
        Object.entries(data?.rates || {}).forEach(([code, val]) => {
          if (val && Number.isFinite(val.rate)) rates[code] = Number(val.rate)
        })
        const missing = symbols.filter((s) => rates[s] === undefined)
        if (missing.length) {
          setFxProblem(
            `Не удалось получить курсы: ${missing.join(", ")}. Показаны без конвертации для этих валют.`
          )
        } else {
          setFxProblem(null)
        }
        setFxRates(rates)
      } catch (e) {
        console.error(e)
        setFxProblem("Не удалось загрузить курсы валют — показано без конвертации.")
        setFxRates({})
      }
    }
    loadFx()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseCurrency, availableCurrencies.join(",")])

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
        material_id: v.material_id || null,
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
      material_id: row.material_id || null,
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
        material_id: editingDraft.material_id || null,
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
  const convertPrice = useCallback(
    (price, currency) => {
      if (price == null) return null
      const cur = currency || ""
      if (baseCurrency === "raw" || !baseCurrency) {
        return { value: Number(price), currency: cur }
      }
      if (!cur) {
        return { value: Number(price), currency: "" }
      }
      if (cur === baseCurrency) {
        return { value: Number(price), currency: baseCurrency }
      }
      const rate = fxRates?.[cur]
      if (!rate || !Number.isFinite(rate)) {
        // нет курса — показываем сырые данные, чтобы точка не пропадала
        return { value: Number(price), currency: cur, sourceCurrency: cur, noRate: true }
      }
      return {
        value: Number(price) / Number(rate),
        currency: baseCurrency,
        sourceCurrency: cur,
      }
    },
    [baseCurrency, fxRates]
  )

  const { chartData, fullMin, fullMax, chartSeries } = useMemo(() => {
    if (!rows.length) {
      return { chartData: [], fullMin: null, fullMax: null, chartSeries: [] }
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

    const materialInfo = {}
    materials.forEach((m) => {
      materialInfo[m.material_id || 0] = {
        name: m.material_name,
        standard: m.material_standard,
      }
    })
    filtered.forEach((r) => {
      if (!materialInfo[r.material_id || 0]) {
        materialInfo[r.material_id || 0] = {
          name: r.material_name || "Без материала",
          standard: r.material_standard || "",
        }
      }
    })

    const pointsMap = new Map()
    filtered.forEach((r) => {
      const dateKey = dayjs(r.date).format("YYYY-MM-DD")
      const converted = convertPrice(r.price, r.currency)
      if (!converted) return
      const matId = r.material_id || 0
      const seriesKey = `m_${matId}`
      if (!pointsMap.has(dateKey)) pointsMap.set(dateKey, { date: dateKey })
      const obj = pointsMap.get(dateKey)
      obj[seriesKey] = converted.value
      obj[`${seriesKey}__currency`] =
        converted.currency || converted.sourceCurrency || r.currency || ""
      obj[`${seriesKey}__source`] = r.currency || ""
    })

    const data = Array.from(pointsMap.values()).sort(
      (a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf()
    )

    const series = Object.entries(materialInfo)
      .map(([id, meta]) => {
        const key = `m_${id}`
        const hasData = data.some((row) => row[key] != null)
        return hasData
          ? {
              key,
              materialId: Number(id),
              name: meta.standard
                ? `${meta.name} (${meta.standard})`
                : meta.name,
            }
          : null
      })
      .filter(Boolean)

    return { chartData: data, fullMin: minD, fullMax: maxD, chartSeries: series }
  }, [rows, periodPreset, customRange, materials, convertPrice])

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
      title: "Материал",
      dataIndex: "material_name",
      width: 200,
      render: (v, row) =>
        editingId === row.id ? (
          <Select
            allowClear
            size="small"
            style={{ width: 200 }}
            value={editingDraft?.material_id || null}
            onChange={(val) =>
              setEditingDraft((d) => ({ ...d, material_id: val || null }))
            }
            options={materials.map((m) => ({
              value: m.material_id,
              label: `${m.material_name}${m.material_standard ? " · " + m.material_standard : ""}`,
            }))}
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
      {/* фильтр по материалу */}
      <Space style={{ marginBottom: 8 }} wrap>
        <span style={{ fontSize: 12, color: "#6b7280" }}>Фильтр по материалу:</span>
        <Select
          allowClear
          size="small"
          style={{ width: 240 }}
          placeholder="Все материалы"
          value={materialFilter}
          onChange={(v) => setMaterialFilter(v || null)}
          options={materials.map((m) => ({
            value: m.material_id,
            label: `${m.material_name}${m.material_standard ? " · " + m.material_standard : ""}`,
          }))}
        />
      </Space>

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
        <Form.Item name="material_id" label="Материал">
          <Select
            allowClear
            placeholder="Не выбран"
            style={{ width: 220 }}
            options={materials.map((m) => ({
              value: m.material_id,
              label: `${m.material_name}${m.material_standard ? " · " + m.material_standard : ""}`,
            }))}
          />
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
              <span style={{ fontSize: 12, color: "#6b7280" }}>
                Валюта для графика:
              </span>
              <Select
                size="small"
                style={{ width: 200 }}
                value={baseCurrency}
                onChange={(v) => setBaseCurrency(v)}
                options={[
                  { value: "raw", label: "Без конвертации" },
                  ...availableCurrencies.map((c) => ({
                    value: c,
                    label: `В ${c}`,
                  })),
                ]}
              />
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
                <LineChart
                  data={chartData}
                  margin={{ top: 10, right: 10, bottom: 20, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v) => dayjs(v).format("DD.MM.YYYY")}
                    minTickGap={20}
                  />
                  <YAxis
                    label={
                      baseCurrency !== "raw"
                        ? { value: baseCurrency, position: "insideTopRight", offset: 8 }
                        : undefined
                    }
                  />
                  <ReTooltip
                    content={({ label, payload }) => {
                      if (!payload || !payload.length) return null
                      return (
                        <div
                          style={{
                            background: "#fff",
                            border: "1px solid #e5e7eb",
                            padding: 8,
                            borderRadius: 6,
                          }}
                        >
                          <div style={{ marginBottom: 4, fontWeight: 600 }}>
                            {dayjs(label).format("DD.MM.YYYY")}
                          </div>
                          {payload.map((p) => {
                            const currency =
                              p.payload?.[`${p.dataKey}__currency`] || ""
                            const sourceCur =
                              p.payload?.[`${p.dataKey}__source`] || currency
                            return (
                              <div
                                key={p.dataKey}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 8,
                                  marginBottom: 2,
                                }}
                              >
                                <span
                                  style={{
                                    width: 10,
                                    height: 10,
                                    background: p.color,
                                    display: "inline-block",
                                    borderRadius: 2,
                                  }}
                                />
                                <span style={{ flex: 1 }}>{p.name}:</span>
                                <span>
                                  {Number(p.value).toFixed(2)} {currency}
                                  {baseCurrency !== "raw" && sourceCur
                                    ? ` (из ${sourceCur})`
                                    : ""}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      )
                    }}
                  />
                  <Legend />
                  {chartSeries.map((s, idx) => (
                    <Line
                      key={s.key}
                      name={s.name}
                      type="linear"
                      dataKey={s.key}
                      stroke={COLORS[idx % COLORS.length]}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                      connectNulls
                    />
                  ))}
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
          {fxProblem && (
            <div style={{ marginTop: 4, fontSize: 11, color: "#d97706" }}>
              {fxProblem}
            </div>
          )}
          {availableCurrencies.length > 1 && baseCurrency === "raw" && (
            <div style={{ marginTop: 4, fontSize: 11, color: "#999" }}>
              В данных несколько валют. Выберите конвертацию, чтобы корректно сравнить линии.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

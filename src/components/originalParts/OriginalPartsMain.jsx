import React, { useEffect, useState, useRef, useCallback } from "react"
import {
  Card,
  Space,
  Row,
  Col,
  Checkbox,
  message,
  Button,
  Form,
  Input,
  InputNumber,
  Tag,
  Empty,
  Select,
} from "antd"
import {
  ApartmentOutlined,
  ReloadOutlined,
  SettingOutlined,
} from "@ant-design/icons"
import { useSearchParams } from "react-router-dom"
import axios from "@/api/axiosInstance"
import TableToolbar from "@/components/common/TableToolbar"
import ImportModal from "@/components/common/ImportModal"
import OriginalPartsTable from "./OriginalPartsTable"
import ManufacturerModelPicker from "@/components/originalParts/ManufacturerModelPicker"
import TnvedPicker from "@/components/fields/TnvedPicker"
import OriginalPartGroupsManager from "@/components/originalParts/OriginalPartGroupsManager"

const TEMPLATE_URL =
  "https://storage.googleapis.com/shared-parts-bucket/templates/original_parts_template.xlsx"

const UOM_OPTIONS = [
  { value: "pcs", label: "шт" },
  { value: "kg", label: "кг" },
  { value: "set", label: "компл." },
]

export default function OriginalPartsMain() {
  const [manufacturer, setManufacturer] = useState(null)
  const [model, setModel] = useState(null)

  const [search, setSearch] = useState("")
  const [onlyAssemblies, setOnlyAssemblies] = useState(false)
  const [onlyParts, setOnlyParts] = useState(false)

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)

  const [importOpen, setImportOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [addForm] = Form.useForm()

  const [expandedId, setExpandedId] = useState(null)

  const partsAbortRef = useRef(null)

  // 🔹 режим "Показать все детали"
  const [showAll, setShowAll] = useState(false)

  // группы — для формы добавления и менеджера групп
  const [groups, setGroups] = useState([])
  const [groupsLoading, setGroupsLoading] = useState(false)
  const [groupManagerOpen, setGroupManagerOpen] = useState(false)

  // deep-link ?focus=<id>
  const [params] = useSearchParams()
  const focusParam = params.get("focus")
  const focusId = focusParam ? Number(focusParam) || null : null
  const [pendingFocusId, setPendingFocusId] = useState(null)

  /* ---------------------- загрузка групп ---------------------- */
  const loadGroups = useCallback(async () => {
    setGroupsLoading(true)
    try {
      const { data } = await axios.get("/original-part-groups")
      setGroups(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error("Не удалось загрузить группы оригинальных деталей", e)
      message.error("Не удалось загрузить группы деталей")
    } finally {
      setGroupsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadGroups()
  }, [loadGroups])

  /* ---------------------- загрузка деталей --------------------- */
  const fetchParts = useCallback(async () => {
    const modelId = model?.id

    // если ни модель не выбрана, ни режим "показать все" не включен —
    // просто очищаем таблицу
    if (!modelId && !showAll) {
      setRows([])
      setExpandedId(null)
      return
    }

    try {
      partsAbortRef.current?.abort()
    } catch {}
    const controller = new AbortController()
    partsAbortRef.current = controller

    setLoading(true)
    try {
      const params = {}

      // в обычном режиме фильтруем по модели
      if (!showAll && modelId) {
        params.equipment_model_id = modelId
      }

      if (search?.trim()) params.q = search.trim()
      if (onlyAssemblies) params.only_assemblies = 1
      if (onlyParts) params.only_parts = 1

      // можно передавать флажок для ясности (backend он не нужен, но не мешает)
      if (showAll) params.all = 1

      const { data } = await axios.get("/original-parts", {
        params,
        signal: controller.signal,
      })
      setRows(Array.isArray(data) ? data : [])
    } catch (e) {
      if (
        e?.name === "AbortError" ||
        e?.name === "CanceledError" ||
        e?.code === "ERR_CANCELED"
      ) {
        return
      }
      console.error(e)
      message.error("Не удалось загрузить детали")
    } finally {
      setLoading(false)
    }
  }, [model?.id, search, onlyAssemblies, onlyParts, showAll])

  useEffect(() => {
    const t = setTimeout(fetchParts, 300)
    return () => {
      clearTimeout(t)
      try {
        partsAbortRef.current?.abort()
      } catch {}
    }
  }, [fetchParts])

  /* ------------- синхронизация выбранной детали --------------- */
  useEffect(() => {
    if (!expandedId) return
    const fresh = rows.find((r) => r.id === expandedId)
    if (!fresh) {
      setExpandedId(null)
    }
  }, [rows, expandedId])

  /* ------------- обработка pendingFocusId ---------------------- */
  useEffect(() => {
    if (!pendingFocusId) return
    const focusRow = rows.find((r) => r.id === pendingFocusId)
    if (!focusRow) return

    setExpandedId(focusRow.id)

    requestAnimationFrame(() => {
      const rowEl = document.querySelector(
        `[data-row-key="${pendingFocusId}"]`,
      )
      if (rowEl) {
        rowEl.scrollIntoView({ block: "center", behavior: "smooth" })
      }
    })
    setPendingFocusId(null)
  }, [rows, pendingFocusId])

  /* ----------------------- создание детали -------------------- */
  const submitAddPart = async (values) => {
    if (!model?.id) {
      message.warning("Сначала выберите производителя и модель")
      return
    }
    try {
      const payload = {
        equipment_model_id: model.id,
        cat_number: values.cat_number,
        description_ru: values.description_ru || null,
        description_en: values.description_en || null,
        tech_description: values.tech_description || null,
        weight_kg: values.weight_kg ?? null,
        uom: values.uom || "pcs",
        tnved_code_id: values.tnved?.id ?? null,
        is_assembly: values.is_assembly ? 1 : 0,
        group_id: values.group_id ?? null,
        length_cm: values.length_cm ?? null,
        width_cm: values.width_cm ?? null,
        height_cm: values.height_cm ?? null,
        is_overweight: values.is_overweight ? 1 : 0,
        is_oversize: values.is_oversize ? 1 : 0,
        has_drawing: values.has_drawing ? 1 : 0,
      }
      const { data } = await axios.post("/original-parts", payload)
      message.success(`Деталь ${data.cat_number} создана`)
      addForm.resetFields()
      fetchParts()
    } catch (e) {
      if (e?.response?.status === 409)
        message.error("Дубликат Part number для этой модели")
      else if (e?.response?.data?.message) message.error(e.response.data.message)
      else {
        console.error(e)
        message.error("Не удалось создать деталь")
      }
    }
  }

  const clearSelection = () => {
    setManufacturer(null)
    setModel(null)
    setRows([])
    setExpandedId(null)
    setPendingFocusId(null)
    setShowAll(false) // при сбросе также выключаем режим "все"
  }

  useEffect(() => {
    setExpandedId(null)
    setPendingFocusId(null)
  }, [model?.id])

  /* -------------------- deep-link ?focus=ID -------------------- */
  useEffect(() => {
    const id = focusId && Number(focusId)
    if (!id) return

    let cancelled = false

    const initFromFocus = async () => {
      try {
        const { data } = await axios.get(`/original-parts/${id}/full`)
        if (cancelled || !data) return

        const mf = {
          id: data.manufacturer_id,
          name: data.manufacturer_name,
        }
        const md = {
          id: data.equipment_model_id,
          model_name: data.model_name,
        }

        setManufacturer(mf)
        setModel(md)
        setPendingFocusId(id)
      } catch (e) {
        console.error("Не удалось открыть деталь по focus", e)
        message.error("Не удалось открыть указанную деталь")
      }
    }

    initFromFocus()

    return () => {
      cancelled = true
    }
  }, [focusId])

  /* -------------------------- рендер --------------------------- */
  return (
    <Space
      direction="vertical"
      style={{ width: "100%", minHeight: "calc(100vh - 180px)" }}
      size={16}
    >
      <Card bodyStyle={{ paddingTop: 8 }} style={{ width: "100%", minHeight: 400 }}>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} md={12}>
            <Space wrap>
              <Button
                icon={<ApartmentOutlined />}
                onClick={() => setPickerOpen(true)}
              >
                {manufacturer && model
                  ? "Изменить производителя/модель"
                  : "Выбрать производителя и модель"}
              </Button>

              {manufacturer && (
                <Tag color="geekblue">
                  Производитель: {manufacturer.name}
                </Tag>
              )}
              {model && <Tag color="blue">Модель: {model.model_name}</Tag>}

              {(manufacturer || model || showAll) && (
                <Button
                  size="small"
                  onClick={clearSelection}
                  icon={<ReloadOutlined />}
                >
                  Сбросить
                </Button>
              )}
            </Space>
          </Col>

          <Col
            xs={24}
            md={6}
            style={{ display: "flex", alignItems: "center", gap: 12 }}
          >
            <Checkbox
              checked={onlyAssemblies}
              onChange={(e) => {
                setOnlyAssemblies(e.target.checked)
                if (e.target.checked) setOnlyParts(false)
              }}
              disabled={!model && !showAll}
            >
              Только сборки
            </Checkbox>
            <Checkbox
              checked={onlyParts}
              onChange={(e) => {
                setOnlyParts(e.target.checked)
                if (e.target.checked) setOnlyAssemblies(false)
              }}
              disabled={!model && !showAll}
            >
              Только детали
            </Checkbox>
          </Col>

          <Col
            xs={24}
            md={6}
            style={{
              display: "flex",
              gap: 8,
              justifyContent: "flex-end",
              alignItems: "center",
            }}
          >
            <Checkbox
              checked={showAll}
              onChange={(e) => {
                setShowAll(e.target.checked)
                setExpandedId(null)
              }}
            >
              Показать все детали
            </Checkbox>

            <Button
              onClick={() => {
                if (!model?.id) {
                  message.warning("Выберите модель для импорта каталога")
                  return
                }
                setImportOpen(true)
              }}
              disabled={!model}
            >
              Импорт
            </Button>
          </Col>
        </Row>

        {/* Поиск (фильтры по группе / ТН ВЭД переехали в колонки таблицы) */}
        <div className="table-section">
          <TableToolbar
            search={search}
            onSearch={(val) => {
              setSearch(val)
              setExpandedId(null)
            }}
            disabled={!model && !showAll}
          />
        </div>

        {/* Форма добавления детали — по-прежнему только для выбранной модели */}
        <Form
          form={addForm}
          layout="inline"
          onFinish={submitAddPart}
          disabled={!model}
          initialValues={{ uom: "pcs" }}
          className="table-section"
          style={{
            marginTop: 8,
            marginBottom: 8,
            flexWrap: "wrap",
            rowGap: 8,
            columnGap: 12,
          }}
        >
          <Form.Item
            name="cat_number"
            label="Кат. номер"
            rules={[{ required: true, message: "Укажите каталожный номер" }]}
          >
            <Input placeholder="например, 711-22-12340" allowClear />
          </Form.Item>
          <Form.Item name="description_ru" label="RU">
            <Input placeholder="Описание (RU)" allowClear />
          </Form.Item>
          <Form.Item name="description_en" label="EN">
            <Input placeholder="Description (EN)" allowClear />
          </Form.Item>
          <Form.Item name="tech_description" label="Тех. опис.">
            <Input.TextArea
              placeholder="Коротко о тех.описании"
              autoSize={{ minRows: 1, maxRows: 4 }}
              style={{ width: 280 }}
              allowClear
            />
          </Form.Item>
          <Form.Item name="weight_kg" label="Вес, кг">
            <InputNumber style={{ width: 120 }} min={0} step={0.001} />
          </Form.Item>
          <Form.Item name="uom" label="Ед. изм.">
            <Select style={{ width: 120 }} options={UOM_OPTIONS} />
          </Form.Item>
          <Form.Item name="tnved" label="ТН ВЭД">
            <TnvedPicker style={{ width: 240 }} allowClear />
          </Form.Item>

          <Form.Item label="Группа">
            <Input.Group compact>
              <Form.Item name="group_id" noStyle>
                <Select
                  style={{ width: 220 }}
                  placeholder="Не выбрано"
                  loading={groupsLoading}
                  allowClear
                  options={groups.map((g) => ({
                    value: g.id,
                    label: g.name,
                  }))}
                />
              </Form.Item>
              <Button
                type="text"
                icon={<SettingOutlined />}
                onClick={() => setGroupManagerOpen(true)}
                style={{ height: "100%", borderRadius: 0 }}
              />
            </Input.Group>
          </Form.Item>

          <Form.Item name="length_cm" label="Дл., см">
            <InputNumber style={{ width: 100 }} min={0} step={0.1} />
          </Form.Item>
          <Form.Item name="width_cm" label="Шир., см">
            <InputNumber style={{ width: 100 }} min={0} step={0.1} />
          </Form.Item>
          <Form.Item name="height_cm" label="Выс., см">
            <InputNumber style={{ width: 100 }} min={0} step={0.1} />
          </Form.Item>

          <Form.Item name="has_drawing" valuePropName="checked">
            <Checkbox>Есть КД</Checkbox>
          </Form.Item>
          <Form.Item name="is_overweight" valuePropName="checked">
            <Checkbox>Тяжелая</Checkbox>
          </Form.Item>
          <Form.Item name="is_oversize" valuePropName="checked">
            <Checkbox>Негабарит</Checkbox>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit">
              Добавить
            </Button>
          </Form.Item>
        </Form>

        <div className="parts-table-wrap" style={{ minHeight: 240 }}>
          {model || showAll ? (
            <OriginalPartsTable
              data={rows}
              loading={loading}
              modelId={model?.id || null}
              showAll={showAll}
              onReload={fetchParts}
              onRemove={(id) => {
                setRows((prev) => prev.filter((r) => r.id !== id))
                if (expandedId === id) setExpandedId(null)
              }}
              expandedId={expandedId}
              onExpandChange={setExpandedId}
            />
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="Выберите производителя и модель или включите режим «Показать все детали»"
              style={{ padding: "48px 0" }}
            />
          )}
        </div>
      </Card>

      <ImportModal
        open={importOpen}
        type="original_parts"
        templateUrl={TEMPLATE_URL}
        extraParams={{ equipment_model_id: model?.id }}
        onClose={() => setImportOpen(false)}
        onSuccess={() => {
          setImportOpen(false)
          fetchParts()
          message.success("Импорт выполнен")
        }}
      />

      <ManufacturerModelPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        initialManufacturerId={manufacturer?.id ?? null}
        initialModelId={model?.id ?? null}
        onPick={(mf, md) => {
          setManufacturer(mf)
          setModel(md)
        }}
      />

      <OriginalPartGroupsManager
        open={groupManagerOpen}
        onClose={() => setGroupManagerOpen(false)}
        onChanged={() => {
          loadGroups()
          fetchParts()
        }}
      />
    </Space>
  )
}

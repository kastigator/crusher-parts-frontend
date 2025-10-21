import React, { useEffect, useState, useRef, useCallback } from "react"
import {
  Card, Space, Row, Col, Checkbox, message, Button, Form,
  Input, InputNumber, Tag, Empty
} from "antd"
import { ApartmentOutlined, ReloadOutlined } from "@ant-design/icons"
import axios from "@/api/axiosInstance"
import TableToolbar from "@/components/common/TableToolbar"
import ImportModal from "@/components/common/ImportModal"
import OriginalPartsTable from "./OriginalPartsTable"
import ManufacturerModelPicker from "@/components/originalParts/ManufacturerModelPicker"
import TnvedPicker from "@/components/fields/TnvedPicker"

const TEMPLATE_URL =
  "https://storage.googleapis.com/shared-parts-bucket/templates/original_parts_template.xlsx"

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

  const partsAbortRef = useRef(null)

  const fetchParts = useCallback(async () => {
    const modelId = model?.id
    if (!modelId) {
      setRows([])
      return
    }

    partsAbortRef.current?.abort()
    const controller = new AbortController()
    partsAbortRef.current = controller

    setLoading(true)
    try {
      const params = { equipment_model_id: modelId }
      if (search?.trim()) params.q = search.trim()
      if (onlyAssemblies) params.only_assemblies = 1
      if (onlyParts) params.only_parts = 1

      const { data } = await axios.get("/original-parts", {
        params,
        signal: controller.signal
      })
      setRows(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
      message.error("Не удалось загрузить детали")
    } finally {
      setLoading(false)
    }
  }, [model?.id, search, onlyAssemblies, onlyParts])

  useEffect(() => {
    const t = setTimeout(fetchParts, 300)
    return () => {
      clearTimeout(t)
      partsAbortRef.current?.abort()
    }
  }, [fetchParts])

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
        tnved_code_id: values.tnved?.id ?? null,
        is_assembly: values.is_assembly ? 1 : 0
      }
      const { data } = await axios.post("/original-parts", payload)
      message.success(`Деталь ${data.cat_number} создана`)
      addForm.resetFields()
      fetchParts()
    } catch (e) {
      if (e?.response?.status === 409)
        message.error("Дубликат Part number для этой модели")
      else if (e?.response?.data?.message)
        message.error(e.response.data.message)
      else {
        console.error(e)
        message.error("Не удалось создать деталь")
      }
    }
  }

  const removeRowLocal = useCallback((id) => {
    setRows(prev => prev.filter(r => r.id !== id))
  }, [])

  const clearSelection = () => {
    setManufacturer(null)
    setModel(null)
    setRows([])
  }

  return (
    <Space
      direction="vertical"
      style={{
        width: "100%",
        minHeight: "calc(100vh - 180px)", // ✅ удерживает стабильную высоту страницы
      }}
      size={16}
    >
      <Card
        title="Оригинальные детали"
        bodyStyle={{ paddingTop: 8 }}
        style={{ width: "100%", minHeight: 400 }} // ✅ предотвращает прыжки
      >
        {/* === Выбор производителя и модели === */}
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
                <Tag color="geekblue">Производитель: {manufacturer.name}</Tag>
              )}
              {model && <Tag color="blue">Модель: {model.model_name}</Tag>}

              {(manufacturer || model) && (
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
              disabled={!model}
            >
              Только сборки
            </Checkbox>
            <Checkbox
              checked={onlyParts}
              onChange={(e) => {
                setOnlyParts(e.target.checked)
                if (e.target.checked) setOnlyAssemblies(false)
              }}
              disabled={!model}
            >
              Только детали
            </Checkbox>
          </Col>

          <Col
            xs={24}
            md={6}
            style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}
          >
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

        {/* === Поиск === */}
        <TableToolbar
          className="table-section"
          search={search}
          onSearch={setSearch}
          disabled={!model}
        />

        {/* === Форма добавления детали === */}
        <Form
          form={addForm}
          layout="inline"
          onFinish={submitAddPart}
          disabled={!model}
          className="table-section"
        >
          <Form.Item
            name="cat_number"
            label="Part number"
            rules={[{ required: true, message: "Укажите Part number" }]}
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
          <Form.Item name="tnved" label="ТН ВЭД">
            <TnvedPicker style={{ width: 240 }} allowClear />
          </Form.Item>
          <Form.Item name="is_assembly" valuePropName="checked">
            <Checkbox>Это сборка</Checkbox>
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">
              Добавить
            </Button>
          </Form.Item>
        </Form>

        {/* === Основная таблица или пустое состояние === */}
        <div className="parts-table-wrap" style={{ minHeight: 240 }}>
          {model ? (
            <OriginalPartsTable
              data={rows}
              loading={loading}
              modelId={model?.id || null}
              onReload={fetchParts}
              onRemove={removeRowLocal}
            />
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="Выберите производителя и модель, чтобы отобразить детали"
              style={{ padding: "48px 0" }}
            />
          )}
        </div>
      </Card>

      {/* === Модалки === */}
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
    </Space>
  )
}

// src/components/originalParts/OriginalPartsMain.jsx
import React, { useEffect, useMemo, useState } from "react"
import { Card, Space, Row, Col, Checkbox, message, Button, Modal, Form, Input, InputNumber } from "antd"
import axios from "@/api/axiosInstance"
import TableToolbar from "@/components/common/TableToolbar"
import ImportModal from "@/components/common/ImportModal"
import OriginalPartsTable from "./OriginalPartsTable"

// MUI для стабильных выпадающих списков
import { Autocomplete, TextField, IconButton, Tooltip as MuiTooltip } from "@mui/material"
import AddIcon from "@mui/icons-material/Add"

const TEMPLATE_URL = "https://storage.googleapis.com/shared-parts-bucket/templates/original_parts_template.xlsx"

export default function OriginalPartsMain() {
  // справочники
  const [manufacturers, setManufacturers] = useState([])
  const [models, setModels] = useState([])

  // фильтры
  const [manufacturerId, setManufacturerId] = useState(null)
  const [modelId, setModelId] = useState(null)
  const [search, setSearch] = useState("")
  const [onlyAssemblies, setOnlyAssemblies] = useState(false)
  const [onlyParts, setOnlyParts] = useState(false)

  // данные
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)

  // модалки
  const [importOpen, setImportOpen] = useState(false)
  const [mfModalOpen, setMfModalOpen] = useState(false)
  const [mdModalOpen, setMdModalOpen] = useState(false)
  const [mfName, setMfName] = useState("")
  const [mdName, setMdName] = useState("")
  const [addOpen, setAddOpen] = useState(false)
  const [addForm] = Form.useForm()

  // загрузка справочников
  const loadRefs = async () => {
    try {
      const [mf, md] = await Promise.all([
        axios.get("/equipment-manufacturers"),
        axios.get("/equipment-models"),
      ])
      setManufacturers(Array.isArray(mf.data) ? mf.data : [])
      setModels(Array.isArray(md.data) ? md.data : [])
    } catch (e) {
      console.error(e); message.error("Не удалось загрузить справочники")
    }
  }

  useEffect(() => { loadRefs() }, [])

  // модели по производителю
  const filteredModels = useMemo(() => {
    if (!manufacturerId) return models
    return models.filter(m => m.manufacturer_id === manufacturerId)
  }, [models, manufacturerId])

  // загрузка деталей (строго по выбранной модели)
  const fetchParts = async () => {
    if (!modelId) { setRows([]); return }
    setLoading(true)
    try {
      const params = { equipment_model_id: modelId }
      if (search?.trim()) params.q = search.trim()
      if (onlyAssemblies) params.only_assemblies = 1
      if (onlyParts) params.only_parts = 1
      const { data } = await axios.get("/original-parts", { params })
      setRows(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e); message.error("Не удалось загрузить детали")
    } finally {
      setLoading(false)
    }
  }

  // лёгкий дебаунс
  useEffect(() => {
    const t = setTimeout(fetchParts, 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelId, search, onlyAssemblies, onlyParts])

  // создание производителя
  const handleCreateManufacturer = async () => {
    const name = mfName.trim()
    if (!name) return
    try {
      const { data } = await axios.post("/equipment-manufacturers", { name })
      message.success("Производитель создан")
      setManufacturers(prev => [data, ...prev])
      setManufacturerId(data.id)
      setModelId(null)
      setMfModalOpen(false); setMfName("")
    } catch (e) {
      console.error(e); message.error("Не удалось создать производителя")
    }
  }

  // создание модели
  const handleCreateModel = async () => {
    if (!manufacturerId) { message.warning("Сначала выберите производителя"); return }
    const model_name = mdName.trim()
    if (!model_name) return
    try {
      const { data } = await axios.post("/equipment-models", { manufacturer_id: manufacturerId, model_name })
      message.success("Модель создана")
      setModels(prev => [data, ...prev])
      setModelId(data.id)
      setMdModalOpen(false); setMdName("")
    } catch (e) {
      console.error(e); message.error("Не удалось создать модель")
    }
  }

  // ручное добавление детали
  const openAddPart = () => {
    if (!modelId) { message.warning("Выберите модель"); return }
    addForm.resetFields()
    setAddOpen(true)
  }

  const submitAddPart = async () => {
    try {
      const v = await addForm.validateFields()
      const payload = {
        equipment_model_id: modelId,
        cat_number: v.cat_number,
        description_ru: v.description_ru || null,
        description_en: v.description_en || null,
        tech_description: v.tech_description || null,
        weight_kg: v.weight_kg ?? null,
        tnved_code: v.tnved_code || null, // бэк сам резолвит код в id, если указан :contentReference[oaicite:1]{index=1}
      }
      const { data } = await axios.post("/original-parts", payload) // требует model_id и cat_number :contentReference[oaicite:2]{index=2}
      message.success(`Деталь ${data.cat_number} создана`)
      setAddOpen(false)
      fetchParts()
    } catch (e) {
      if (e?.errorFields) return
      if (e?.response?.status === 409) {
        message.error("Дубликат cat_number для этой модели")
      } else if (e?.response?.data?.message) {
        message.error(e.response.data.message)
      } else {
        console.error(e); message.error("Не удалось создать деталь")
      }
    }
  }

  return (
    <Space direction="vertical" style={{ width: "100%" }} size={16}>
      <Card title="Оригинальные детали" bodyStyle={{ paddingTop: 8 }}>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} sm={12} md={8}>
            <div style={{ display: "flex", gap: 8, width: "100%", alignItems: "center" }}>
              <Autocomplete
                disableClearable={false}
                options={manufacturers}
                value={manufacturers.find(m => m.id === manufacturerId) || null}
                onChange={(_, v) => { setManufacturerId(v?.id ?? null); setModelId(null) }}
                getOptionLabel={(o) => o?.name || ""}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                renderInput={(params) => <TextField {...params} size="small" label="Производитель" />}
                sx={{ flex: 1 }}
              />
              <MuiTooltip title="Создать производителя">
                <IconButton onClick={() => setMfModalOpen(true)} size="small">
                  <AddIcon fontSize="small" />
                </IconButton>
              </MuiTooltip>
            </div>
          </Col>

          <Col xs={24} sm={12} md={8}>
            <div style={{ display: "flex", gap: 8, width: "100%", alignItems: "center" }}>
              <Autocomplete
                disableClearable={false}
                options={filteredModels}
                value={filteredModels.find(m => m.id === modelId) || null}
                onChange={(_, v) => setModelId(v?.id ?? null)}
                getOptionLabel={(o) => o?.model_name || ""}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                renderInput={(params) => <TextField {...params} size="small" label="Модель" />}
                sx={{ flex: 1 }}
                disabled={!manufacturerId}
              />
              <MuiTooltip title="Создать модель">
                <IconButton
                  onClick={() => {
                    if (!manufacturerId) { message.warning("Сначала выберите производителя"); return }
                    setMdModalOpen(true)
                  }}
                  size="small"
                >
                  <AddIcon fontSize="small" />
                </IconButton>
              </MuiTooltip>
            </div>
          </Col>

          <Col xs={24} sm={12} md={4} style={{ display: "flex", alignItems: "center" }}>
            <Checkbox
              checked={onlyAssemblies}
              onChange={(e) => { setOnlyAssemblies(e.target.checked); if (e.target.checked) setOnlyParts(false) }}
            >
              Только сборки
            </Checkbox>
          </Col>
          <Col xs={24} sm={12} md={4} style={{ display: "flex", alignItems: "center" }}>
            <Checkbox
              checked={onlyParts}
              onChange={(e) => { setOnlyParts(e.target.checked); if (e.target.checked) setOnlyAssemblies(false) }}
            >
              Только детали
            </Checkbox>
          </Col>
        </Row>

        <TableToolbar
          search={search}
          onSearch={setSearch}
          onImport={() => {
            if (!modelId) { message.warning("Выберите модель для импорта каталога"); return }
            setImportOpen(true)
          }}
          rightExtra={
            <Space>
              <Button type="primary" onClick={openAddPart}>Добавить деталь</Button>
              <Button onClick={() => window.open(TEMPLATE_URL, "_blank")}>Скачать шаблон</Button>
            </Space>
          }
        />

        <OriginalPartsTable
          data={rows}
          loading={loading}
          modelId={modelId}
          onReload={fetchParts}
        />
      </Card>

      {/* Импорт каталога деталей по выбранной модели */}
      <ImportModal
        open={importOpen}
        type="original_parts"
        templateUrl={TEMPLATE_URL}
        extraParams={{ equipment_model_id: modelId }}
        onClose={() => setImportOpen(false)}
        onSuccess={() => { setImportOpen(false); fetchParts(); message.success("Импорт выполнен") }}
      />

      {/* Модалка: новый производитель */}
      <Modal
        open={mfModalOpen}
        title="Новый производитель"
        onOk={handleCreateManufacturer}
        onCancel={() => setMfModalOpen(false)}
        okText="Создать"
        cancelText="Отмена"
      >
        <Input
          autoFocus
          placeholder="Название производителя"
          value={mfName}
          onChange={(e) => setMfName(e.target.value)}
          onPressEnter={handleCreateManufacturer}
        />
      </Modal>

      {/* Модалка: новая модель */}
      <Modal
        open={mdModalOpen}
        title="Новая модель"
        onOk={handleCreateModel}
        onCancel={() => setMdModalOpen(false)}
        okText="Создать"
        cancelText="Отмена"
      >
        <Input
          autoFocus
          placeholder="Название модели"
          value={mdName}
          onChange={(e) => setMdName(e.target.value)}
          onPressEnter={handleCreateModel}
        />
      </Modal>

      {/* Модалка: добавить деталь вручную */}
      <Modal
        open={addOpen}
        title="Добавить деталь"
        onOk={submitAddPart}
        onCancel={() => setAddOpen(false)}
        okText="Создать"
        cancelText="Отмена"
        destroyOnClose
      >
        <Form form={addForm} layout="vertical">
          <Form.Item
            name="cat_number"
            label="Cat number"
            rules={[{ required: true, message: "Укажите Cat number" }]}
          >
            <Input autoFocus placeholder="например, 711-22-12340" />
          </Form.Item>
          <Form.Item name="description_ru" label="Описание (RU)">
            <Input placeholder="Ступица ведущая" />
          </Form.Item>
          <Form.Item name="description_en" label="Description (EN)">
            <Input placeholder="Hub, drive" />
          </Form.Item>
          <Form.Item name="tech_description" label="Тех. описание">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="weight_kg" label="Вес, кг">
            <InputNumber style={{ width: "100%" }} min={0} step={0.001} />
          </Form.Item>
          <Form.Item name="tnved_code" label="Код ТН ВЭД (опционально)">
            <Input placeholder="10 знаков, если знаете" />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  )
}

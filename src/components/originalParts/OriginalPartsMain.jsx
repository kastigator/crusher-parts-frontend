// src/components/originalParts/OriginalPartsMain.jsx
import React, { useEffect, useMemo, useRef, useState } from "react"
import { Card, Space, Row, Col, Checkbox, message, Button, Input, Popover } from "antd"
import { PlusOutlined } from "@ant-design/icons"
import axios from "@/api/axiosInstance"
import TableToolbar from "@/components/common/TableToolbar"
import ImportModal from "@/components/common/ImportModal"
import OriginalPartsTable from "./OriginalPartsTable"

import { Autocomplete, TextField, CircularProgress } from "@mui/material"

const TEMPLATE_URL = "https://storage.googleapis.com/shared-parts-bucket/templates/original_parts_template.xlsx"

export default function OriginalPartsMain() {
  // --- справочники
  const [manufacturers, setManufacturers] = useState([])
  const [models, setModels] = useState([])

  // --- выбор
  const [manufacturerId, setManufacturerId] = useState(null)
  const [modelId, setModelId] = useState(null)

  // --- ввод в выпадашках (контролируем)
  const [mfInput, setMfInput] = useState("")
  const [mdInput, setMdInput] = useState("")

  // --- поповеры для создания (fallback, когда поле пустое)
  const [mfPopoverOpen, setMfPopoverOpen] = useState(false)
  const [mdPopoverOpen, setMdPopoverOpen] = useState(false)
  const [mfNewName, setMfNewName] = useState("")
  const [mdNewName, setMdNewName] = useState("")

  // --- флаги создания, чтобы не отправлять повторно
  const [mfCreating, setMfCreating] = useState(false)
  const [mdCreating, setMdCreating] = useState(false)

  // --- фильтры списка деталей
  const [search, setSearch] = useState("")
  const [onlyAssemblies, setOnlyAssemblies] = useState(false)
  const [onlyParts, setOnlyParts] = useState(false)

  // --- данные деталей
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)

  // --- импорт
  const [importOpen, setImportOpen] = useState(false)

  // --- inline добавление детали
  const [newCat, setNewCat] = useState("")
  const [newDescRu, setNewDescRu] = useState("")
  const [tnvedOptions, setTnvedOptions] = useState([])
  const [tnvedLoading, setTnvedLoading] = useState(false)
  const [tnvedSelected, setTnvedSelected] = useState(null)

  // ===== справочники
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

  // модели выбранного производителя
  const filteredModels = useMemo(() => {
    if (!manufacturerId) return []
    return models.filter(m => m.manufacturer_id === manufacturerId)
  }, [models, manufacturerId])

  // ===== загрузка деталей (только после выбора модели)
  const abortRef = useRef(null)
  const fetchParts = async () => {
    if (!modelId) { setRows([]); setLoading(false); return }
    abortRef.current?.abort()
    abortRef.current = new AbortController()
    setLoading(true)
    try {
      const params = { equipment_model_id: modelId }
      if (search?.trim()) params.q = search.trim()
      if (onlyAssemblies) params.only_assemblies = 1
      if (onlyParts) params.only_parts = 1
      const { data } = await axios.get("/original-parts", { params, signal: abortRef.current.signal })
      setRows(Array.isArray(data) ? data : [])
    } catch (e) {
      const name = e?.name || e?.code
      if (name !== "CanceledError" && name !== "AbortError") {
        console.error(e); message.error("Не удалось загрузить детали")
      }
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    if (!modelId) { setRows([]); setLoading(false); return }
    const t = setTimeout(fetchParts, 250)
    return () => { clearTimeout(t); abortRef.current?.abort() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelId, search, onlyAssemblies, onlyParts])

  // ===== создание производителя
  const doCreateManufacturer = async (nameRaw) => {
    const name = String(nameRaw || "").trim()
    if (!name) return
    const dup = manufacturers.find(m => (m.name || "").toLowerCase() === name.toLowerCase())
    if (dup) {
      setManufacturerId(dup.id); setModelId(null)
      setMfInput(""); setMfNewName(""); setMfPopoverOpen(false)
      message.info("Такой производитель уже есть")
      return
    }
    try {
      setMfCreating(true)
      const { data } = await axios.post("/equipment-manufacturers", { name })
      setManufacturers(prev => [data, ...prev])
      setManufacturerId(data.id)
      setModelId(null)
      message.success("Производитель создан")
    } catch (e) {
      console.error(e); message.error("Не удалось создать производителя")
    } finally {
      setMfCreating(false)
      setMfInput(""); setMfNewName(""); setMfPopoverOpen(false)
    }
  }

  // быстрый плюс у производителя
  const handleMfPlus = () => {
    const txt = (mfInput || "").trim()
    if (txt) doCreateManufacturer(txt)
    else setMfPopoverOpen(true)
  }

  // ===== создание модели
  const doCreateModel = async (modelRaw) => {
    if (!manufacturerId) { message.warning("Сначала выберите производителя"); return }
    const model_name = String(modelRaw || "").trim()
    if (!model_name) return
    const dup = filteredModels.find(m => (m.model_name || "").toLowerCase() === model_name.toLowerCase())
    if (dup) {
      setModelId(dup.id)
      setMdInput(""); setMdNewName(""); setMdPopoverOpen(false)
      message.info("Такая модель уже есть")
      return
    }
    try {
      setMdCreating(true)
      const { data } = await axios.post("/equipment-models", { manufacturer_id: manufacturerId, model_name })
      setModels(prev => [data, ...prev])
      setModelId(data.id)
      message.success("Модель создана")
    } catch (e) {
      console.error(e); message.error("Не удалось создать модель")
    } finally {
      setMdCreating(false)
      setMdInput(""); setMdNewName(""); setMdPopoverOpen(false)
    }
  }

  // быстрый плюс у модели
  const handleMdPlus = () => {
    if (!manufacturerId) { message.warning("Сначала выберите производителя"); return }
    const txt = (mdInput || "").trim()
    if (txt) doCreateModel(txt)
    else setMdPopoverOpen(true)
  }

  // ===== ТН ВЭД
  const tnvedAbortRef = useRef(null)
  const fetchTnved = async (q) => {
    tnvedAbortRef.current?.abort()
    tnvedAbortRef.current = new AbortController()
    setTnvedLoading(true)
    try {
      const { data } = await axios.get("/tnved-codes", {
        params: q?.trim() ? { q: q.trim() } : {},
        signal: tnvedAbortRef.current.signal
      })
      setTnvedOptions(Array.isArray(data) ? data : [])
    } catch (e) {
      const name = e?.name || e?.code
      if (name !== "CanceledError" && name !== "AbortError") {
        console.error(e); message.error("Не удалось загрузить коды ТН ВЭД")
      }
      setTnvedOptions([])
    } finally {
      setTnvedLoading(false)
    }
  }
  useEffect(() => { fetchTnved("") }, [])

  // ===== добавление детали
  const addPartInline = async () => {
    if (!modelId) { message.warning("Сначала выберите модель"); return }
    const cat = (newCat || "").trim()
    if (!cat) { message.warning("Укажите Cat #"); return }
    try {
      const payload = {
        equipment_model_id: modelId,
        cat_number: cat,
        description_ru: newDescRu || null,
        tnved_code: tnvedSelected?.code || null,
      }
      const { data } = await axios.post("/original-parts", payload)
      message.success(`Деталь ${data.cat_number} создана`)
      setNewCat(""); setNewDescRu(""); setTnvedSelected(null)
      fetchParts()
    } catch (e) {
      if (e?.response?.status === 409) message.error("Такая деталь уже есть для этой модели")
      else if (e?.response?.data?.message) message.error(e.response.data.message)
      else { console.error(e); message.error("Не удалось создать деталь") }
    }
  }

  return (
    <Space direction="vertical" style={{ width: "100%" }} size={16}>
      <Card title="Оригинальные детали" styles={{ body: { paddingTop: 8 } }}>
        {/* Ряд 1: производитель, модель, фильтры, импорт */}
        <Row gutter={[12, 12]} align="middle">
          {/* Производитель */}
          <Col xs={24} md={8}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <Autocomplete
                disablePortal
                options={manufacturers}
                value={manufacturers.find(m => m.id === manufacturerId) ?? null}
                inputValue={mfInput}
                onInputChange={(_, v) => setMfInput(v || "")}
                onChange={(_, v) => {
                  setManufacturerId(v?.id ?? null)
                  setModelId(null)     // сброс модели
                  setMdInput("")       // очистка поля модели
                }}
                getOptionLabel={(o) => (o?.name ?? "")}
                isOptionEqualToValue={(a, b) => (a?.id ?? null) === (b?.id ?? null)}
                renderInput={(p) => <TextField {...p} size="small" label="Производитель" />}
                sx={{ flex: 1 }}
              />
              <Popover
                title="Новый производитель"
                open={mfPopoverOpen}
                onOpenChange={setMfPopoverOpen}
                trigger="click"
                content={
                  <Space.Compact style={{ width: 260 }}>
                    <Input
                      placeholder="Название"
                      value={mfNewName || mfInput}
                      onChange={(e) => setMfNewName(e.target.value)}
                      onPressEnter={doCreateManufacturer}
                      autoFocus
                    />
                    <Button type="primary" loading={mfCreating} onClick={() => doCreateManufacturer(mfNewName || mfInput)}>
                      Создать
                    </Button>
                  </Space.Compact>
                }
              >
                <Button icon={<PlusOutlined />} loading={mfCreating} onClick={handleMfPlus} />
              </Popover>
            </div>
          </Col>

          {/* Модель */}
          <Col xs={24} md={8}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <Autocomplete
                key={`model-${manufacturerId || 0}`}     // принудительный ремоунт при смене производителя
                disablePortal
                options={filteredModels}
                value={filteredModels.find(m => m.id === modelId) ?? null}
                inputValue={mdInput}
                onInputChange={(_, v) => setMdInput(v || "")}
                onChange={(_, v) => { setModelId(v?.id ?? null); setMdInput("") }}
                getOptionLabel={(o) => (o?.model_name ?? "")}
                isOptionEqualToValue={(a, b) => (a?.id ?? null) === (b?.id ?? null)}
                renderInput={(p) => <TextField {...p} size="small" label="Модель" />}
                disabled={!manufacturerId}
                sx={{ flex: 1 }}
              />
              <Popover
                title="Новая модель"
                open={mdPopoverOpen}
                onOpenChange={setMdPopoverOpen}
                trigger="click"
                content={
                  <Space direction="vertical" style={{ width: 300 }}>
                    <div style={{ fontSize: 12, color: "#888" }}>
                      Производитель: <b>{manufacturers.find(m => m.id === manufacturerId)?.name || "—"}</b>
                    </div>
                    <Space.Compact>
                      <Input
                        placeholder="Название модели"
                        value={mdNewName || mdInput}
                        onChange={(e) => setMdNewName(e.target.value)}
                        onPressEnter={doCreateModel}
                        disabled={!manufacturerId}
                        autoFocus
                      />
                      <Button type="primary" loading={mdCreating} onClick={() => doCreateModel(mdNewName || mdInput)} disabled={!manufacturerId}>
                        Создать
                      </Button>
                    </Space.Compact>
                  </Space>
                }
              >
                <Button icon={<PlusOutlined />} loading={mdCreating} disabled={!manufacturerId} onClick={handleMdPlus} />
              </Popover>
            </div>
          </Col>

          {/* Фильтры + импорт */}
          <Col xs={24} md={4} style={{ display: "flex", alignItems: "center" }}>
            <Checkbox
              checked={onlyAssemblies}
              onChange={(e) => { setOnlyAssemblies(e.target.checked); if (e.target.checked) setOnlyParts(false) }}
              disabled={!modelId}
            >
              Только сборки
            </Checkbox>
          </Col>
          <Col xs={24} md={4} style={{ display: "flex", gap: 8, justifyContent: "flex-end", alignItems: "center" }}>
            <Checkbox
              checked={onlyParts}
              onChange={(e) => { setOnlyParts(e.target.checked); if (e.target.checked) setOnlyAssemblies(false) }}
              disabled={!modelId}
            >
              Только детали
            </Checkbox>
            <Button onClick={() => setImportOpen(true)} disabled={!modelId}>Импорт</Button>
            <Button onClick={() => window.open(TEMPLATE_URL, "_blank")}>Шаблон</Button>
          </Col>
        </Row>

        {/* Поиск */}
        <TableToolbar search={search} onSearch={setSearch} disabled={!modelId} />

        {/* Ряд 2: Новая деталь */}
        <Row gutter={[8, 8]} align="middle" style={{ marginTop: 4 }}>
          <Col xs={24} md={6}>
            <Input
              placeholder="Cat # (обязательно)"
              value={newCat}
              onChange={(e) => setNewCat(e.target.value)}
              onPressEnter={addPartInline}
              disabled={!modelId}
            />
          </Col>
          <Col xs={24} md={8}>
            <Input
              placeholder="Описание (RU)"
              value={newDescRu}
              onChange={(e) => setNewDescRu(e.target.value)}
              onPressEnter={addPartInline}
              disabled={!modelId}
            />
          </Col>
          <Col xs={24} md={6}>
            <Autocomplete
              disablePortal
              options={tnvedOptions}
              loading={tnvedLoading}
              value={tnvedSelected}
              onChange={(_, v) => setTnvedSelected(v)}
              onInputChange={(_, v) => { if (modelId) fetchTnved(v) }}
              getOptionLabel={(o) => (o?.code ? `${o.code} — ${o.description || ""}` : "")}
              isOptionEqualToValue={(a, b) => (a?.code ?? null) === (b?.code ?? null)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="ТН ВЭД (из БД)"
                  size="small"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {tnvedLoading ? <CircularProgress size={16} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
              disabled={!modelId}
            />
          </Col>
          <Col xs={24} md={4} style={{ display: "flex", justifyContent: "flex-end" }}>
            <Button type="primary" onClick={addPartInline} disabled={!modelId}>Добавить</Button>
          </Col>
        </Row>

        {/* Таблица */}
        {modelId ? (
          <OriginalPartsTable
            data={rows}
            loading={loading}
            modelId={modelId}
            onReload={fetchParts}
          />
        ) : (
          <div style={{ padding: "24px 0", color: "#999" }}>Выберите производителя и модель</div>
        )}
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
    </Space>
  )
}

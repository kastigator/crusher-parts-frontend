// src/components/originalParts/OriginalPartsMain.jsx
import React, { useEffect, useMemo, useRef, useState } from "react"
import { Card, Space, Row, Col, Checkbox, message, Button, Input, Popover } from "antd"
import { PlusOutlined } from "@ant-design/icons"
import axios from "@/api/axiosInstance"
import TableToolbar from "@/components/common/TableToolbar"
import ImportModal from "@/components/common/ImportModal"
import OriginalPartsTable from "./OriginalPartsTable"

import { Autocomplete, TextField, CircularProgress } from "@mui/material"
import { createFilterOptions } from "@mui/material/Autocomplete"

const TEMPLATE_URL = "https://storage.googleapis.com/shared-parts-bucket/templates/original_parts_template.xlsx"
const mfFilter = createFilterOptions()
const mdFilter = createFilterOptions()

export default function OriginalPartsMain() {
  // ---- справочники
  const [manufacturers, setManufacturers] = useState([])
  const [models, setModels] = useState([])

  // ---- фильтры
  const [manufacturerId, setManufacturerId] = useState(null)
  const [modelId, setModelId] = useState(null)
  const [search, setSearch] = useState("")
  const [onlyAssemblies, setOnlyAssemblies] = useState(false)
  const [onlyParts, setOnlyParts] = useState(false)

  // ---- данные
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)

  // ---- импорт
  const [importOpen, setImportOpen] = useState(false)

  // ---- inline форма новой детали
  const [newCat, setNewCat] = useState("")
  const [newDescRu, setNewDescRu] = useState("")

  // ТН ВЭД — асинхронный автокомплит
  const [tnvedOptions, setTnvedOptions] = useState([])
  const [tnvedLoading, setTnvedLoading] = useState(false)
  const [tnvedSelected, setTnvedSelected] = useState(null)

  // Popover «создать производителя/модель»
  const [mfPopoverOpen, setMfPopoverOpen] = useState(false)
  const [mdPopoverOpen, setMdPopoverOpen] = useState(false)
  const [mfNewName, setMfNewName] = useState("")
  const [mdNewName, setMdNewName] = useState("")
  // контролируемый ввод в автокомплитах
  const [mfInput, setMfInput] = useState("")
  const [mdInput, setMdInput] = useState("")

  // =========================
  // загрузка справочников
  // =========================
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

  const filteredModels = useMemo(() => {
    if (!manufacturerId) return models
    return models.filter(m => m.manufacturer_id === manufacturerId)
  }, [models, manufacturerId])

  // =========================
  // загрузка списка деталей (с отменой гонок)
  // =========================
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

      const { data } = await axios.get("/original-parts", {
        params,
        signal: abortRef.current.signal,
      })
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

  // =========================
  // создание производителя/модели
  // =========================
  const doCreateManufacturer = async (nm) => {
    const name = String(nm || "").trim()
    if (!name) return
    const exists = (manufacturers || []).find(m => (m.name || "").toLowerCase() === name.toLowerCase())
    if (exists) {
      setManufacturerId(exists.id); setModelId(null); setMfInput("")
      message.info("Такой производитель уже есть")
      return
    }
    try {
      const { data } = await axios.post("/equipment-manufacturers", { name })
      setManufacturers(prev => [data, ...prev])
      setManufacturerId(data.id)
      setModelId(null)
      setMfInput("")       // СБРАСЫВАЕМ ВВОД
      message.success("Производитель создан")
    } catch (e) {
      console.error(e); message.error("Не удалось создать производителя")
    }
  }

  const doCreateModel = async (nm) => {
    if (!manufacturerId) { message.warning("Сначала выберите производителя"); return }
    const model_name = String(nm || "").trim()
    if (!model_name) return
    const exists = (filteredModels || []).find(m => (m.model_name || "").toLowerCase() === model_name.toLowerCase())
    if (exists) {
      setModelId(exists.id); setMdInput("")
      message.info("Такая модель уже есть")
      return
    }
    try {
      const { data } = await axios.post("/equipment-models", { manufacturer_id: manufacturerId, model_name })
      setModels(prev => [data, ...prev])
      setModelId(data.id)
      setMdInput("")       // СБРАСЫВАЕМ ВВОД
      message.success("Модель создана")
    } catch (e) {
      console.error(e); message.error("Не удалось создать модель")
    }
  }

  // =========================
  // ТН ВЭД — асинхронный поиск
  // =========================
  const tnvedAbortRef = useRef(null)
  const fetchTnved = async (q) => {
    tnvedAbortRef.current?.abort()
    tnvedAbortRef.current = new AbortController()
    setTnvedLoading(true)
    try {
      const { data } = await axios.get("/tnved-codes", {
        params: q?.trim() ? { q: q.trim() } : {},
        signal: tnvedAbortRef.current.signal,
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

  // =========================
  // добавление детали из шапки
  // =========================
  const addPartInline = async () => {
    if (!modelId) { message.warning("Сначала выберите модель"); return }
    const cat = String(newCat || "").trim()
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
      if (e?.response?.status === 409) {
        message.error("Такая деталь уже есть для этой модели")
      } else if (e?.response?.data?.message) {
        message.error(e.response.data.message)
      } else {
        console.error(e); message.error("Не удалось создать деталь")
      }
    }
  }

  // открыть поповеры с текущим вводом
  const openMfPopover = () => { setMfNewName(mfInput || ""); setMfPopoverOpen(true) }
  const openMdPopover = () => { setMdNewName(mdInput || ""); setMdPopoverOpen(true) }

  return (
    <Space direction="vertical" style={{ width: "100%" }} size={16}>
      <Card title="Оригинальные детали" styles={{ body: { paddingTop: 8 } }}>
        {/* Ряд 1: производитель, модель, фильтры, импорт/шаблон */}
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} md={8}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <Autocomplete
                options={manufacturers || []}
                value={(manufacturers || []).find(m => m.id === manufacturerId) ?? null}
                inputValue={mfInput}                       // КОНТРОЛИРУЕМ ВВОД
                onInputChange={(_, v) => setMfInput(v || "")}
                onChange={(_, v) => {
                  if (v?.__create) doCreateManufacturer(v.inputValue)
                  else { setManufacturerId(v?.id ?? null); setModelId(null) }
                }}
                filterOptions={(options, params) => {
                  const filtered = mfFilter(options, { ...params, getOptionLabel: (o) => o?.name || "" })
                  const { inputValue } = params
                  const exists = options.some(o => (o?.name || "").toLowerCase() === (inputValue || "").toLowerCase())
                  if (inputValue && !exists) filtered.push({ inputValue, name: `Добавить "${inputValue}"`, __create: true })
                  return filtered
                }}
                getOptionLabel={(o) => (o?.__create ? o.name : (o?.name || ""))}
                isOptionEqualToValue={(a, b) => (a?.id ?? null) === (b?.id ?? null)}
                renderInput={(params) => <TextField {...params} size="small" label="Производитель" />}
                disablePortal
                sx={{ flex: 1 }}
              />
              <Popover
                title="Новый производитель"
                open={mfPopoverOpen}
                onOpenChange={setMfPopoverOpen}
                content={
                  <Space.Compact style={{ width: 260 }}>
                    <Input
                      placeholder="Название"
                      value={mfNewName}
                      onChange={(e) => setMfNewName(e.target.value)}
                      onPressEnter={() => { doCreateManufacturer(mfNewName); setMfPopoverOpen(false) }}
                      autoFocus
                    />
                    <Button type="primary" onClick={() => { doCreateManufacturer(mfNewName); setMfPopoverOpen(false) }}>
                      Создать
                    </Button>
                  </Space.Compact>
                }
                trigger="click"
              >
                <Button icon={<PlusOutlined />} onClick={openMfPopover} />
              </Popover>
            </div>
          </Col>

          <Col xs={24} md={8}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <Autocomplete
                options={filteredModels || []}
                value={(filteredModels || []).find(m => m.id === modelId) ?? null}
                inputValue={mdInput}                       // КОНТРОЛИРУЕМ ВВОД
                onInputChange={(_, v) => setMdInput(v || "")}
                onChange={(_, v) => {
                  if (v?.__create) doCreateModel(v.inputValue)
                  else setModelId(v?.id ?? null)
                }}
                filterOptions={(options, params) => {
                  const filtered = mdFilter(options, { ...params, getOptionLabel: (o) => o?.model_name || "" })
                  const { inputValue } = params
                  const exists = options.some(o => (o?.model_name || "").toLowerCase() === (inputValue || "").toLowerCase())
                  if (inputValue && !exists) filtered.push({ inputValue, model_name: `Добавить "${inputValue}"`, __create: true })
                  return filtered
                }}
                getOptionLabel={(o) => (o?.__create ? o.model_name : (o?.model_name || ""))}
                isOptionEqualToValue={(a, b) => (a?.id ?? null) === (b?.id ?? null)}
                renderInput={(params) => <TextField {...params} size="small" label="Модель" />}
                disablePortal
                sx={{ flex: 1 }}
                disabled={!manufacturerId}
              />
              <Popover
                title="Новая модель"
                open={mdPopoverOpen}
                onOpenChange={setMdPopoverOpen}
                content={
                  <Space direction="vertical" style={{ width: 300 }}>
                    <div style={{ fontSize: 12, color: "#888" }}>
                      Производитель: <b>{manufacturers.find(m => m.id === manufacturerId)?.name || "—"}</b>
                    </div>
                    <Space.Compact>
                      <Input
                        placeholder="Название модели"
                        value={mdNewName}
                        onChange={(e) => setMdNewName(e.target.value)}
                        onPressEnter={() => { doCreateModel(mdNewName); setMdPopoverOpen(false) }}
                        disabled={!manufacturerId}
                        autoFocus
                      />
                      <Button type="primary" onClick={() => { doCreateModel(mdNewName); setMdPopoverOpen(false) }} disabled={!manufacturerId}>
                        Создать
                      </Button>
                    </Space.Compact>
                  </Space>
                }
                trigger="click"
              >
                <Button icon={<PlusOutlined />} disabled={!manufacturerId} onClick={openMdPopover} />
              </Popover>
            </div>
          </Col>

          <Col xs={24} md={4} style={{ display: "flex", alignItems: "center" }}>
            <Checkbox
              checked={onlyAssemblies}
              onChange={(e) => { setOnlyAssemblies(e.target.checked); if (e.target.checked) setOnlyParts(false) }}
            >
              Только сборки
            </Checkbox>
          </Col>
          <Col xs={24} md={4} style={{ display: "flex", gap: 8, justifyContent: "flex-end", alignItems: "center" }}>
            <Checkbox
              checked={onlyParts}
              onChange={(e) => { setOnlyParts(e.target.checked); if (e.target.checked) setOnlyAssemblies(false) }}
            >
              Только детали
            </Checkbox>
            <Button
              onClick={() => {
                if (!modelId) { message.warning("Выберите модель для импорта каталога"); return }
                setImportOpen(true)
              }}
            >
              Импорт
            </Button>
            <Button onClick={() => window.open(TEMPLATE_URL, "_blank")}>Шаблон</Button>
          </Col>
        </Row>

        {/* Поиск */}
        <TableToolbar search={search} onSearch={setSearch} />

        {/* Ряд 2: Новая деталь (inline) */}
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
              options={tnvedOptions}
              loading={tnvedLoading}
              value={tnvedSelected}
              onChange={(_, v) => setTnvedSelected(v)}
              onInputChange={(_, v) => { fetchTnved(v) }}
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
              disablePortal
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

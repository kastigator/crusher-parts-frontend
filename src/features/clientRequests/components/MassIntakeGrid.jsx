import React, { useEffect, useMemo, useState } from "react"
import { Button, DatePicker, Input, InputNumber, Modal, Select, Space, Table, Tag, Tooltip, Typography, Upload, message } from "antd"
import { CopyOutlined, DeleteOutlined, FileExcelOutlined, PlusOutlined } from "@ant-design/icons"
import dayjs from "dayjs"
import * as XLSX from "xlsx"
import { createEmptyRow } from "./intakeRows"

const { Text } = Typography

const FIELDS = [
  ["client_description", "Описание клиента"],
  ["client_catalog_number", "Каталожный номер"],
  ["client_manufacturer_text", "Производитель"],
  ["client_equipment_model_text", "Оборудование / модель"],
  ["requested_qty", "Количество"],
  ["uom", "Единица"],
  ["required_date", "Требуемая дата"],
  ["client_comment", "Комментарий"],
]

const HEADER_ALIASES = {
  client_description: ["описание", "наименование", "description", "name"],
  client_catalog_number: ["каталожный номер", "номер", "артикул", "part number", "catalog number", "sku"],
  client_manufacturer_text: ["производитель", "manufacturer", "brand"],
  client_equipment_model_text: ["оборудование", "модель", "equipment", "model"],
  requested_qty: ["количество", "кол-во", "qty", "quantity"],
  uom: ["единица", "ед.", "uom", "unit"],
  required_date: ["дата", "срок", "required date", "need date"],
  client_comment: ["комментарий", "comment", "note"],
}

const normalizeHeader = (value) => String(value || "").trim().toLowerCase()
const autoMapping = (headers) => Object.fromEntries(FIELDS.map(([field]) => {
  const index = headers.findIndex((header) => HEADER_ALIASES[field].some((alias) => normalizeHeader(header).includes(alias)))
  return [field, index >= 0 ? index : undefined]
}))

function BulkImportModal({ open, onClose, onApply, defaultUom }) {
  const [matrix, setMatrix] = useState([])
  const [mapping, setMapping] = useState({})
  const [paste, setPaste] = useState("")
  const [sourceMetadata, setSourceMetadata] = useState({ source_type: "clipboard", file_name: null })
  const headers = matrix[0] || []
  const sourceRows = matrix.slice(1).filter((row) => row.some((value) => String(value ?? "").trim()))

  const loadMatrix = (next, metadata) => {
    const clean = next.filter((row) => Array.isArray(row) && row.some((value) => String(value ?? "").trim()))
    setMatrix(clean)
    setMapping(autoMapping(clean[0] || []))
    setSourceMetadata(metadata)
  }
  const parsePaste = () => {
    const lines = paste.split(/\r?\n/).filter((line) => line.trim())
    const separator = lines.some((line) => line.includes("\t")) ? "\t" : ";"
    loadMatrix(lines.map((line) => line.split(separator).map((cell) => cell.trim())), { source_type: "clipboard", file_name: null })
  }
  const beforeUpload = async (file) => {
    try {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: "array", cellDates: false })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      loadMatrix(XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: false }), { source_type: "file", file_name: file.name, sheet_name: workbook.SheetNames[0] })
    } catch { message.error("Не удалось прочитать файл") }
    return false
  }
  const apply = () => {
    if (!sourceRows.length) return message.warning("Добавьте строки из таблицы")
    const rows = sourceRows.map((source, index) => {
      const values = Object.fromEntries(FIELDS.map(([field]) => [field, mapping[field] === undefined ? "" : source[mapping[field]]]))
      const originalUom = String(values.uom || "").trim() || null
      return createEmptyRow({
        ...values,
        requested_qty: Number(String(values.requested_qty || 1).replace(",", ".")) || 1,
        source_uom: originalUom,
        uom: originalUom || defaultUom || null,
        source_metadata: {
          ...sourceMetadata,
          original_row_number: index + 2,
          original_order: index + 1,
          original_values: Object.fromEntries(headers.map((header, column) => [header || `column_${column + 1}`, source[column] ?? ""])),
        },
      })
    })
    onApply(rows)
    onClose()
  }
  return <Modal
    width={940}
    open={open}
    onCancel={onClose}
    onOk={apply}
    okText={`Добавить ${sourceRows.length || 0} строк`}
    title="Импорт из Excel, CSV или буфера"
    styles={{ body: { maxHeight: "calc(100vh - 230px)", overflowY: "auto" } }}
  >
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Text type="secondary">Вставьте таблицу с заголовками или выберите Excel/CSV. Проверьте соответствие колонок до добавления.</Text>
      <Input.TextArea rows={5} value={paste} onChange={(event) => setPaste(event.target.value)} placeholder={"Описание\tКаталожный номер\tПроизводитель\tКоличество\tЕдиница"} />
      <Space><Button onClick={parsePaste}>Разобрать вставленные строки</Button><Upload accept=".xlsx,.xls,.csv" beforeUpload={beforeUpload} showUploadList={false}><Button icon={<FileExcelOutlined />}>Выбрать Excel/CSV</Button></Upload></Space>
      {!!headers.length && <>
        <div className="cr-column-mapping">{FIELDS.map(([field, label]) => <label key={field}><span>{label}</span><Select allowClear placeholder="Не импортировать" value={mapping[field]} onChange={(value) => setMapping((current) => ({ ...current, [field]: value }))} options={headers.map((header, index) => ({ value: index, label: header || `Колонка ${index + 1}` }))} /></label>)}</div>
        <Table size="small" scroll={{ x: 900, y: 220 }} pagination={false} rowKey={(_, index) => index} dataSource={sourceRows.slice(0, 100).map((row, index) => ({ row, index }))} columns={headers.map((header, index) => ({ title: header || `Колонка ${index + 1}`, render: (_, record) => String(record.row[index] ?? "") }))} />
      </>}
    </Space>
  </Modal>
}

const MATCH_LABELS = {
  exact_unique: ["green", "Точное совпадение"],
  probable: ["gold", "Нужна проверка"],
  ambiguous: ["orange", "Неоднозначное совпадение"],
  no_match: ["blue", "Будет задача"],
  duplicate: ["red", "Дубликат"],
  malformed: ["red", "Ошибка"],
  already_resolved: ["green", "Выбрано вручную"],
}

export default function MassIntakeGrid({
  rows,
  onChange,
  previewRows = [],
  onSelectCandidate,
  uomOptions = [],
  uomLoading = false,
  defaultUom = null,
  exactConfirmed = false,
}) {
  const [importOpen, setImportOpen] = useState(false)
  const [defaults, setDefaults] = useState({ uom: defaultUom, client_manufacturer_text: "", client_equipment_model_text: "", required_date: null })
  useEffect(() => {
    if (defaultUom) setDefaults((current) => ({ ...current, uom: current.uom || defaultUom }))
  }, [defaultUom])
  const previewByKey = useMemo(() => new Map(previewRows.map((row) => [row.row_key, row])), [previewRows])
  const update = (index, field, value) => onChange(rows.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row))
  const add = (after = rows.length - 1) => onChange([...rows.slice(0, after + 1), createEmptyRow(defaults), ...rows.slice(after + 1)])
  const applyDefaults = () => onChange(rows.map((row) => ({
    ...row,
    uom: row.uom || defaults.uom,
    client_manufacturer_text: row.client_manufacturer_text || defaults.client_manufacturer_text,
    client_equipment_model_text: row.client_equipment_model_text || defaults.client_equipment_model_text,
    required_date: row.required_date || defaults.required_date,
  })))
  const cellKeyDown = (event, rowIndex, columnIndex) => {
    if (event.key !== "Enter" || event.shiftKey) return
    event.preventDefault()
    const next = document.querySelector(`[data-intake-cell="${rowIndex + 1}:${columnIndex}"]`) || document.querySelector(`[data-intake-cell="${rowIndex}:${columnIndex + 1}"]`)
    if (next) next.focus()
    else if (rowIndex === rows.length - 1) add(rowIndex)
  }
  const input = (row, index, field, column, placeholder) => <Input size="small" data-intake-cell={`${index}:${column}`} value={row[field]} placeholder={placeholder} onChange={(event) => update(index, field, event.target.value)} onKeyDown={(event) => cellKeyDown(event, index, column)} />
  const uomSelect = (row, index) => {
    const preview = previewByKey.get(row.row_key)
    const value = preview?.uom || row.uom || undefined
    return <Space direction="vertical" size={1}>
      <Select
        size="small"
        showSearch
        optionFilterProp="label"
        loading={uomLoading}
        data-intake-cell={`${index}:5`}
        value={value}
        onChange={(next) => update(index, "uom", next)}
        onInputKeyDown={(event) => cellKeyDown(event, index, 5)}
        options={uomOptions}
        style={{ width: 150 }}
      />
      {preview?.source_uom && preview.source_uom !== preview.uom && <Text type="secondary">Исходно: {preview.source_uom} → {preview.uom || "ошибка"}</Text>}
    </Space>
  }
  const columns = [
    { title: "№", width: 52, fixed: "left", render: (_, __, index) => index + 1 },
    { title: "Описание клиента", width: 270, render: (_, row, index) => input(row, index, "client_description", 0, "Исходное наименование") },
    { title: "Каталожный номер", width: 170, render: (_, row, index) => input(row, index, "client_catalog_number", 1, "Если указан") },
    { title: "Производитель", width: 160, render: (_, row, index) => input(row, index, "client_manufacturer_text", 2) },
    { title: "Оборудование / модель", width: 190, render: (_, row, index) => input(row, index, "client_equipment_model_text", 3) },
    { title: "Кол-во", width: 105, render: (_, row, index) => <InputNumber size="small" min={0.001} data-intake-cell={`${index}:4`} value={row.requested_qty} onChange={(value) => update(index, "requested_qty", value)} onKeyDown={(event) => cellKeyDown(event, index, 4)} /> },
    { title: "Единица", width: 170, render: (_, row, index) => uomSelect(row, index) },
    { title: "Требуемая дата", width: 145, render: (_, row, index) => <DatePicker size="small" format="DD.MM.YYYY" value={row.required_date ? dayjs(row.required_date) : null} onChange={(value) => update(index, "required_date", value?.format("YYYY-MM-DD") || null)} /> },
    { title: "Допустимость замены", width: 210, render: (_, row, index) => <Select size="small" value={row.substitution_policy} onChange={(value) => update(index, "substitution_policy", value)} options={[{value:"unspecified",label:"Уточнить позже"},{value:"exact_only",label:"Только точное соответствие"},{value:"equivalent_requires_approval",label:"Аналог после согласования"},{value:"equivalent_allowed",label:"Аналоги разрешены"}]} /> },
    { title: "Результат проверки", width: 280, render: (_, row) => { const preview = previewByKey.get(row.row_key); if (!preview) return <Text type="secondary">Не проверено</Text>; const [color, label] = MATCH_LABELS[preview.match_status] || ["default", preview.match_status]; const needsCandidateReview = ["probable", "ambiguous"].includes(preview.match_status); return <Space direction="vertical" size={3}><Tag color={color}>{label}</Tag>{preview.match_status === "exact_unique" && <Text type={exactConfirmed ? "success" : "warning"}>{exactConfirmed ? "Будет подтверждено явным групповым действием" : "Предложение системы — ещё не подтверждено"}</Text>}{needsCandidateReview && <Select size="small" style={{ width: 255 }} placeholder="Выбрать позицию или оставить задачу" onChange={(value) => onSelectCandidate?.(row.row_key, value)} options={(preview.candidates || []).map((candidate) => ({ value: candidate.catalog_position_id, label: [candidate.manufacturer_name, candidate.manufacturer_part_number || candidate.position_code, candidate.name].filter(Boolean).join(" · ") }))} />}{(preview.candidates?.[0]?.reasons || []).map((reason) => <Text type="secondary" key={reason}>{reason}</Text>)}{preview.warnings?.map((warning) => <Text type="warning" key={warning.code}>{warning.message}</Text>)}{preview.errors?.map((error) => <Text type="danger" key={error.code}>{error.message}</Text>)}</Space> } },
    { title: "", width: 82, fixed: "right", render: (_, __, index) => <Space size={0}><Tooltip title="Дублировать"><Button type="text" size="small" icon={<CopyOutlined />} onClick={() => onChange([...rows.slice(0,index+1), createEmptyRow({ ...rows[index] }), ...rows.slice(index+1)])} /></Tooltip><Tooltip title="Удалить"><Button type="text" danger size="small" icon={<DeleteOutlined />} disabled={rows.length === 1} onClick={() => onChange(rows.filter((_, rowIndex) => rowIndex !== index))} /></Tooltip></Space> },
  ]
  return <Space direction="vertical" size={12} style={{ width: "100%" }}>
    <div className="cr-grid-toolbar">
      <Space wrap><Button icon={<PlusOutlined />} onClick={() => add()}>Добавить строку</Button><Button icon={<FileExcelOutlined />} onClick={() => setImportOpen(true)}>Вставить или импортировать</Button><Text type="secondary">{rows.length} строк · Enter/Tab — переход по ячейкам</Text></Space>
      <Space wrap><Select size="small" showSearch optionFilterProp="label" loading={uomLoading} style={{width:190}} value={defaults.uom || undefined} onChange={(value)=>setDefaults((current)=>({...current,uom:value}))} options={uomOptions} placeholder="Единица по умолчанию"/><Input size="small" style={{width:150}} value={defaults.client_manufacturer_text} onChange={(event)=>setDefaults((current)=>({...current,client_manufacturer_text:event.target.value}))} placeholder="Производитель"/><Button onClick={applyDefaults}>Заполнить пустые</Button></Space>
    </div>
    <Table className="cr-intake-grid" size="small" rowKey="row_key" pagination={false} scroll={{ x: 1700, y: 410 }} dataSource={rows} columns={columns} />
    <BulkImportModal open={importOpen} onClose={() => setImportOpen(false)} defaultUom={defaultUom} onApply={(imported) => onChange(rows.length === 1 && !rows[0].client_description && !rows[0].client_catalog_number ? imported : [...rows, ...imported])} />
  </Space>
}

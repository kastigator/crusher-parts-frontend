// src/components/originalParts/OriginalPartsMain.jsx
import React, { useEffect, useMemo, useRef, useState } from "react"
import {
  Card, Space, Row, Col, Checkbox, message, Button, Input, Modal, Table, Drawer
} from "antd"
import { SearchOutlined, PlusOutlined } from "@ant-design/icons"
import axios from "@/api/axiosInstance"
import TableToolbar from "@/components/common/TableToolbar"
import ImportModal from "@/components/common/ImportModal"
import OriginalPartsTable from "./OriginalPartsTable"

const TEMPLATE_URL =
  "https://storage.googleapis.com/shared-parts-bucket/templates/original_parts_template.xlsx"

// ───────────────────────────────────────────────────────────────────────────────
// Вспомогательные модалки выбора/создания
// ───────────────────────────────────────────────────────────────────────────────

function ManufacturerPickerModal({ open, onClose, onPicked }) {
  const [search, setSearch] = useState("")
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [newName, setNewName] = useState("")
  const debounceRef = useRef(null)

  const fetchList = async (q = "") => {
    setLoading(true)
    try {
      const { data } = await axios.get("/equipment-manufacturers", {
        params: q.trim() ? { q: q.trim() } : {},
      })
      setRows(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
      message.error("Не удалось загрузить производителей")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (open) fetchList("") }, [open])

  // дебаунс поиска
  useEffect(() => {
    if (!open) return
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchList(search), 250)
    return () => clearTimeout(debounceRef.current)
  }, [search, open]) // eslint-disable-line

  const create = async () => {
    const name = (newName || "").trim()
    if (!name) return message.warning("Введите название производителя")
    try {
      const { data } = await axios.post("/equipment-manufacturers", { name })
      message.success("Производитель создан")
      onPicked?.(data) // сразу выбрать созданного
      onClose?.()
    } catch (e) {
      console.error(e)
      message.error(e?.response?.data?.message || "Не удалось создать производителя")
    }
  }

  return (
    <Modal
      open={open}
      title="Производитель"
      onCancel={onClose}
      footer={null}
      destroyOnClose
    >
      <Space direction="vertical" style={{ width: "100%" }} size={12}>
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="Поиск производителя"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <Table
          rowKey="id"
          size="small"
          loading={loading}
          dataSource={rows}
          pagination={{ pageSize: 8 }}
          columns={[
            { title: "Название", dataIndex: "name" },
            {
              title: "", width: 120,
              render: (_, r) => (
                <Button type="primary" onClick={() => { onPicked?.(r); onClose?.() }}>
                  Выбрать
                </Button>
              )
            }
          ]}
        />

        <Space.Compact style={{ width: "100%" }}>
          <Input
            placeholder="Новый производитель"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onPressEnter={create}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={create}>
            Создать
          </Button>
        </Space.Compact>
      </Space>
    </Modal>
  )
}

function ModelPickerModal({ open, manufacturer, onClose, onPicked }) {
  const [search, setSearch] = useState("")
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [newName, setNewName] = useState("")
  const debounceRef = useRef(null)

  const fetchList = async (q = "") => {
    if (!manufacturer?.id) return
    setLoading(true)
    try {
      const params = { manufacturer_id: Number(manufacturer.id) }
      if (q.trim()) params.q = q.trim()
      const { data } = await axios.get("/equipment-models", { params })
      setRows(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
      message.error("Не удалось загрузить модели")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (open) fetchList("") }, [open]) // eslint-disable-line

  useEffect(() => {
    if (!open) return
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchList(search), 250)
    return () => clearTimeout(debounceRef.current)
  }, [search, open]) // eslint-disable-line

  const create = async () => {
    const model_name = (newName || "").trim()
    if (!manufacturer?.id) return message.warning("Сначала выберите производителя")
    if (!model_name) return message.warning("Введите название модели")
    try {
      const { data } = await axios.post("/equipment-models", {
        manufacturer_id: Number(manufacturer.id),
        model_name
      })
      message.success("Модель создана")
      onPicked?.(data) // сразу выбрать созданную
      onClose?.()
    } catch (e) {
      console.error(e)
      message.error(e?.response?.data?.message || "Не удалось создать модель")
    }
  }

  return (
    <Modal
      open={open}
      title={`Модель (${manufacturer?.name || "—"})`}
      onCancel={onClose}
      footer={null}
      destroyOnClose
    >
      <Space direction="vertical" style={{ width: "100%" }} size={12}>
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="Поиск модели"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <Table
          rowKey="id"
          size="small"
          loading={loading}
          dataSource={rows}
          pagination={{ pageSize: 8 }}
          columns={[
            { title: "Модель", dataIndex: "model_name" },
            {
              title: "", width: 120,
              render: (_, r) => (
                <Button type="primary" onClick={() => { onPicked?.(r); onClose?.() }}>
                  Выбрать
                </Button>
              )
            }
          ]}
        />

        <Space.Compact style={{ width: "100%" }}>
          <Input
            placeholder="Новая модель"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onPressEnter={create}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={create}>
            Создать
          </Button>
        </Space.Compact>
      </Space>
    </Modal>
  )
}

// ───────────────────────────────────────────────────────────────────────────────
// Основной компонент
// ───────────────────────────────────────────────────────────────────────────────

export default function OriginalPartsMain() {
  // выбранные сущности
  const [manufacturer, setManufacturer] = useState(null) // {id, name}
  const [model, setModel] = useState(null) // {id, model_name}

  // фильтры
  const [search, setSearch] = useState("")
  const [onlyAssemblies, setOnlyAssemblies] = useState(false)
  const [onlyParts, setOnlyParts] = useState(false)

  // данные таблицы деталей
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)

  // модалки выбора
  const [mfOpen, setMfOpen] = useState(false)
  const [mdOpen, setMdOpen] = useState(false)

  // импорт
  const [importOpen, setImportOpen] = useState(false)

  // инлайн добавление детали
  const [newCat, setNewCat] = useState("")
  const [newDescRu, setNewDescRu] = useState("")
  const [tnvedDrawer, setTnvedDrawer] = useState(false)
  const [tnvedSearch, setTnvedSearch] = useState("")
  const [tnvedLoading, setTnvedLoading] = useState(false)
  const [tnvedRows, setTnvedRows] = useState([])
  const [tnvedPicked, setTnvedPicked] = useState(null)

  // ─── загрузка деталей
  const abortRef = useRef(null)
  const fetchParts = async () => {
    if (!model?.id) { setRows([]); setLoading(false); return }
    abortRef.current?.abort()
    abortRef.current = new AbortController()
    setLoading(true)
    try {
      const params = { equipment_model_id: Number(model.id) }
      if (search.trim()) params.q = search.trim()
      if (onlyAssemblies) params.only_assemblies = 1
      if (onlyParts) params.only_parts = 1
      const { data } = await axios.get("/original-parts", { params, signal: abortRef.current.signal })
      setRows(Array.isArray(data) ? data : [])
    } catch (e) {
      const name = e?.name || e?.code
      if (name !== "CanceledError" && name !== "AbortError") {
        console.error(e)
        message.error("Не удалось загрузить детали")
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!model?.id) { setRows([]); return }
    const t = setTimeout(fetchParts, 250)
    return () => { clearTimeout(t); abortRef.current?.abort() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model?.id, search, onlyAssemblies, onlyParts])

  // при смене производителя — сбросить модель/данные
  useEffect(() => {
    setModel(null)
    setRows([])
  }, [manufacturer?.id])

  // ─── ТН ВЭД
  const fetchTnved = async () => {
    setTnvedLoading(true)
    try {
      const params = tnvedSearch.trim() ? { q: tnvedSearch.trim() } : {}
      const { data } = await axios.get("/tnved-codes", { params })
      setTnvedRows(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
      message.error("Не удалось загрузить коды ТН ВЭД")
      setTnvedRows([])
    } finally {
      setTnvedLoading(false)
    }
  }

  // ─── добавить деталь
  const addPartInline = async () => {
    if (!model?.id) { message.warning("Сначала выберите модель"); return }
    const cat = (newCat || "").trim()
    if (!cat) { message.warning("Укажите Cat #"); return }
    try {
      const payload = {
        equipment_model_id: Number(model.id),
        cat_number: cat,
        description_ru: newDescRu || null,
        tnved_code: tnvedPicked?.code || null,
      }
      const { data } = await axios.post("/original-parts", payload)
      message.success(`Деталь ${data.cat_number} создана`)
      setNewCat(""); setNewDescRu(""); setTnvedPicked(null)
      fetchParts()
    } catch (e) {
      if (e?.response?.status === 409) message.error("Такая деталь уже есть для этой модели")
      else if (e?.response?.data?.message) message.error(e.response.data.message)
      else { console.error(e); message.error("Не удалось создать деталь") }
    }
  }

  // ─── представление производителя/модели в кнопках
  const mfTitle = manufacturer?.name || "—"
  const mdTitle = model?.model_name || "—"

  return (
    <Space direction="vertical" style={{ width: "100%" }} size={16}>
      <Card title="Оригинальные детали" styles={{ body: { paddingTop: 8 } }}>
        <Row gutter={[12, 12]} align="middle">
          {/* Выбор производителя и модели через модалки */}
          <Col xs={24} md={8}>
            <Space.Compact style={{ width: "100%" }}>
              <Input
                value={`Производитель: ${mfTitle}`}
                readOnly
              />
              <Button onClick={() => setMfOpen(true)}>Выбрать</Button>
            </Space.Compact>
          </Col>

          <Col xs={24} md={8}>
            <Space.Compact style={{ width: "100%" }}>
              <Input
                value={`Модель: ${mdTitle}`}
                readOnly
              />
              <Button disabled={!manufacturer?.id} onClick={() => setMdOpen(true)}>Выбрать</Button>
            </Space.Compact>
          </Col>

          <Col xs={24} md={4} style={{ display: "flex", alignItems: "center" }}>
            <Checkbox
              checked={onlyAssemblies}
              onChange={(e) => { setOnlyAssemblies(e.target.checked); if (e.target.checked) setOnlyParts(false) }}
              disabled={!model?.id}
            >
              Только сборки
            </Checkbox>
          </Col>

          <Col xs={24} md={4} style={{ display: "flex", gap: 8, justifyContent: "flex-end", alignItems: "center" }}>
            <Checkbox
              checked={onlyParts}
              onChange={(e) => { setOnlyParts(e.target.checked); if (e.target.checked) setOnlyAssemblies(false) }}
              disabled={!model?.id}
            >
              Только детали
            </Checkbox>
            <Button onClick={() => setImportOpen(true)} disabled={!model?.id}>Импорт</Button>
            <Button onClick={() => window.open(TEMPLATE_URL, "_blank")}>Шаблон</Button>
          </Col>
        </Row>

        {/* Поиск по каталогу */}
        <TableToolbar search={search} onSearch={setSearch} disabled={!model?.id} />

        {/* Добавление детали */}
        <Row gutter={[8, 8]} align="middle" style={{ marginTop: 4 }}>
          <Col xs={24} md={6}>
            <Input
              placeholder="Cat # (обязательно)"
              value={newCat}
              onChange={(e) => setNewCat(e.target.value)}
              onPressEnter={addPartInline}
              disabled={!model?.id}
            />
          </Col>
          <Col xs={24} md={8}>
            <Input
              placeholder="Описание (RU)"
              value={newDescRu}
              onChange={(e) => setNewDescRu(e.target.value)}
              onPressEnter={addPartInline}
              disabled={!model?.id}
            />
          </Col>
          <Col xs={24} md={6}>
            <Space.Compact style={{ width: "100%" }}>
              <Input
                readOnly
                placeholder="ТН ВЭД (из БД)"
                value={tnvedPicked ? `${tnvedPicked.code} — ${tnvedPicked.description || ""}` : ""}
              />
              <Button disabled={!model?.id} onClick={() => { setTnvedDrawer(true); fetchTnved() }}>
                ТН ВЭД
              </Button>
            </Space.Compact>
          </Col>
          <Col xs={24} md={4} style={{ display: "flex", justifyContent: "flex-end" }}>
            <Button type="primary" onClick={addPartInline} disabled={!model?.id}>Добавить</Button>
          </Col>
        </Row>

        {/* Таблица каталога */}
        {model?.id ? (
          <OriginalPartsTable
            data={rows}
            loading={loading}
            modelId={Number(model.id)}
            onReload={fetchParts}
          />
        ) : (
          <div style={{ padding: "24px 0", color: "#999" }}>Выберите производителя и модель</div>
        )}
      </Card>

      {/* Модалка выбора производителя */}
      <ManufacturerPickerModal
        open={mfOpen}
        onClose={() => setMfOpen(false)}
        onPicked={(mf) => { setManufacturer({ id: mf.id, name: mf.name }); setMfOpen(false) }}
      />

      {/* Модалка выбора модели (зависит от производителя) */}
      <ModelPickerModal
        open={mdOpen}
        manufacturer={manufacturer}
        onClose={() => setMdOpen(false)}
        onPicked={(md) => { setModel({ id: md.id, model_name: md.model_name }); setMdOpen(false) }}
      />

      {/* Импорт каталога по выбранной модели */}
      <ImportModal
        open={importOpen}
        type="original_parts"
        templateUrl={TEMPLATE_URL}
        extraParams={{ equipment_model_id: model?.id ? Number(model.id) : undefined }}
        onClose={() => setImportOpen(false)}
        onSuccess={() => { setImportOpen(false); fetchParts(); message.success("Импорт выполнен") }}
      />

      {/* Drawer выбора ТН ВЭД */}
      <Drawer
        open={tnvedDrawer}
        title="Коды ТН ВЭД"
        width={760}
        destroyOnClose
        onClose={() => setTnvedDrawer(false)}
        extra={(
          <Space>
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="Поиск по коду / описанию"
              value={tnvedSearch}
              onChange={(e) => setTnvedSearch(e.target.value)}
              onPressEnter={fetchTnved}
              style={{ width: 280 }}
            />
            <Button onClick={fetchTnved}>Искать</Button>
          </Space>
        )}
      >
        <Table
          rowKey="id"
          size="small"
          loading={tnvedLoading}
          dataSource={tnvedRows}
          pagination={{ pageSize: 10 }}
          columns={[
            { title: "Код", dataIndex: "code", width: 140 },
            { title: "Описание", dataIndex: "description", ellipsis: true },
            { title: "Пошлина (%)", dataIndex: "duty_rate", width: 120 },
            {
              title: "", width: 120,
              render: (_, r) => (
                <Button type="link" onClick={() => { setTnvedPicked(r); setTnvedDrawer(false) }}>
                  Выбрать
                </Button>
              )
            },
          ]}
        />
      </Drawer>
    </Space>
  )
}

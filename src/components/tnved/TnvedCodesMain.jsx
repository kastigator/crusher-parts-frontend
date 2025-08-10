// src/components/tnved/TnvedCodesMain.jsx
import React, { useState, useEffect } from "react"
import { Card, Space, message, Button, Input, Form } from "antd"
import axios from "@/api/axiosInstance"
import TnvedCodesTable from "./TnvedCodesTable"
import ImportModal from "@/components/common/ImportModal"
import TableToolbar from "@/components/common/TableToolbar"
import FullHistoryDialog from "@/components/common/FullHistoryDialog"

const { TextArea } = Input

export default function TnvedCodesMain() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [importVisible, setImportVisible] = useState(false)
  const [search, setSearch] = useState("")
  const [newRecord, setNewRecord] = useState(null)
  const [logId, setLogId] = useState(null)

  // баннер «появились изменения»
  const [hasNew, setHasNew] = useState(false)
  // маркер состояния таблицы (COUNT:SUM(version))
  const [etag, setEtag] = useState(null)

  // ---------- helpers ----------
  const toNull = (v) => (v === "" || v === undefined ? null : v)
  const toNumberOrNull = (v) => {
    if (v === "" || v === null || v === undefined) return null
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }

  const replaceRow = (fresh) => {
    setData((prev) => prev.map((r) => (r.id === fresh.id ? fresh : r)))
  }
  const removeRow = (id) => setData((prev) => prev.filter((r) => r.id !== id))

  // ---------- API ----------
  const fetchEtag = async () => {
    try {
      const { data: e } = await axios.get("/tnved-codes/etag")
      return e?.etag || null
    } catch {
      return null
    }
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await axios.get("/tnved-codes")
      setData(res.data || [])
      // подтянем свежий маркер состояния и погасим баннер
      const freshEtag = await fetchEtag()
      setEtag(freshEtag)
      setHasNew(false)
    } catch (err) {
      console.error("Ошибка загрузки данных:", err)
      message.error("Не удалось загрузить коды ТН ВЭД")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // ---------- поллинг по ETag (ловим add/edit/delete в других окнах) ----------
  useEffect(() => {
    let timer
    const checkChanged = async () => {
      if (document.hidden || loading) return
      const next = await fetchEtag()
      if (etag && next && next !== etag) {
        setHasNew(true)
      }
    }

    const t0 = setTimeout(checkChanged, 10000) // первый через 10с
    timer = setInterval(checkChanged, 30000)   // далее каждые 30с
    const vis = () => checkChanged()
    document.addEventListener("visibilitychange", vis)

    return () => {
      clearTimeout(t0)
      clearInterval(timer)
      document.removeEventListener("visibilitychange", vis)
    }
  }, [etag, loading])

  // ---------- create ----------
  const handleAdd = async () => {
    if (!newRecord?.code?.trim()) {
      message.warning("Поле 'Код' обязательно для заполнения")
      return
    }

    const payload = {
      code: newRecord.code.trim(),
      description: toNull(newRecord?.description?.trim?.()),
      duty_rate: toNumberOrNull(newRecord?.duty_rate),
      notes: toNull(newRecord?.notes?.trim?.()),
    }

    try {
      const { data: created } = await axios.post("/tnved-codes", payload)
      // локально добавим запись в начало — быстрее, чем полный refetch
      setData((prev) => [created, ...prev])
      setNewRecord(null)
      setHasNew(false)
      // обновим локальный etag, чтобы поллинг не мигал
      const freshEtag = await fetchEtag()
      setEtag(freshEtag)
      message.success("Запись добавлена")
    } catch (err) {
      console.error("Ошибка при добавлении:", err)
      const t = err?.response?.data?.type
      if (t === "duplicate_key") message.error("Код уже существует")
      else message.error(err?.response?.data?.message || "Не удалось добавить запись")
    }
  }

  // ---------- update (optimistic locking) ----------
  const handleUpdate = async (id, updated) => {
    try {
      const { data: fresh } = await axios.put(`/tnved-codes/${id}`, {
        code: updated.code?.trim(),
        description: toNull(updated?.description?.trim?.()),
        duty_rate: toNumberOrNull(updated?.duty_rate),
        notes: toNull(updated?.notes?.trim?.()),
        version: updated.version,
      })
      replaceRow(fresh)
      // подтянем etag (изменился version)
      const freshEtag = await fetchEtag()
      setEtag(freshEtag)
      message.success("Изменения сохранены")
    } catch (err) {
      // пробрасываем — таблица покажет модалку конфликта
      throw err
    }
  }

  // ---------- delete (с ?version=) ----------
  const handleDelete = async (record) => {
    try {
      await axios.delete(`/tnved-codes/${record.id}`, { params: { version: record.version } })
      removeRow(record.id)
      const freshEtag = await fetchEtag()
      setEtag(freshEtag)
      message.success("Код удалён")
    } catch (err) {
      if (err?.isVersionConflict) {
        if (err.currentRecord) replaceRow(err.currentRecord)
        message.warning("Запись изменилась и не была удалена. Обновили строку.")
        return
      }
      console.error("Ошибка удаления:", err)
      message.error("Ошибка при удалении кода")
    }
  }

  // ---------- фильтр ----------
  const filteredData = data.filter(
    (item) =>
      item.code?.toLowerCase().includes(search.toLowerCase()) ||
      item.description?.toLowerCase().includes(search.toLowerCase()) ||
      item.notes?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Space direction="vertical" style={{ width: "100%", maxWidth: "100%" }} size={16}>
      <Card
        title="Коды ТН ВЭД"
        bodyStyle={{ paddingTop: 0 }}
        style={{ width: "100%", boxSizing: "border-box" }}
        extra={
          <Space>
            <Button size="small" type="link" href="https://www.alta.ru/tnved/" target="_blank" rel="noopener noreferrer">
              Коды ТН ВЭД РФ
            </Button>
            <Button
              size="small"
              type="link"
              href="https://ec.europa.eu/taxation_customs/dds2/taric/taric_consultation.jsp?Lang=en"
              target="_blank"
              rel="noopener noreferrer"
            >
              EU HS Code
            </Button>
          </Space>
        }
      >
        {/* подсказка по управлению */}
        <div style={{ fontSize: 12, color: '#6b7280', margin: '8px 0' }}>
          Двойной клик — редактирование; Enter — сохранить; Esc — отменить.
        </div>

        {/* баннер «есть изменения» */}
        {hasNew && (
          <div style={{ margin: '8px 0' }}>
            <Button
              type="primary"
              onClick={async () => {
                await fetchData()
                message.success("Список обновлён")
              }}
            >
              Появились изменения — Обновить
            </Button>
          </div>
        )}

        <TableToolbar
          search={search}
          onSearch={setSearch}
          onImport={() => setImportVisible(true)}
          onShowDeleted={() => setLogId("deleted")}
        />

        {/* форма быстрого добавления */}
        <Form layout="inline" style={{ marginBottom: 16 }} onFinish={handleAdd}>
          <Form.Item label="Код">
            <Input
              value={newRecord?.code || ""}
              onChange={(e) => setNewRecord((prev) => ({ ...prev, code: e.target.value }))}
              placeholder="Введите код"
            />
          </Form.Item>

          <Form.Item label="Описание">
            <TextArea
              rows={1}
              value={newRecord?.description || ""}
              onChange={(e) => setNewRecord((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Описание"
              style={{ width: 300 }}
            />
          </Form.Item>

          <Form.Item label="Пошлина">
            <Input
              type="number"
              value={newRecord?.duty_rate ?? ""}
              onChange={(e) => setNewRecord((prev) => ({ ...prev, duty_rate: e.target.value }))}
              placeholder="%"
              style={{ width: 100 }}
            />
          </Form.Item>

          <Form.Item label="Примечания">
            <TextArea
              rows={1}
              value={newRecord?.notes || ""}
              onChange={(e) => setNewRecord((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Примечания"
              style={{ width: 200 }}
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit">
              Добавить
            </Button>
          </Form.Item>
        </Form>

        <TnvedCodesTable
          data={filteredData}
          loading={loading}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onReplaceRow={replaceRow}
          onRefresh={fetchData}
        />
      </Card>

      <ImportModal
        open={importVisible}
        onClose={() => setImportVisible(false)}
        onSuccess={fetchData}
        type="tnved_code"
        templateUrl="https://storage.googleapis.com/shared-parts-bucket/templates/tnved_codes_template.xlsx"
      />

      {logId === "deleted" && (
        <FullHistoryDialog onlyDeleted entityType="tnved_code" onClose={() => setLogId(null)} />
      )}
    </Space>
  )
}

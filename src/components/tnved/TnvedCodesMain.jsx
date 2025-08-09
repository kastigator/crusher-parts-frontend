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

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await axios.get("/tnved-codes")
      setData(res.data || [])
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

  // ---- helpers -------------------------------------------------
  const replaceRow = (fresh) => {
    setData((prev) => prev.map((r) => (r.id === fresh.id ? fresh : r)))
  }

  const removeRow = (id) => {
    setData((prev) => prev.filter((r) => r.id !== id))
  }

  // ---- create --------------------------------------------------
  const handleAdd = async () => {
    if (!newRecord?.code?.trim()) {
      message.warning("Поле 'Код' обязательно для заполнения")
      return
    }

    const payload = {
      code: newRecord.code.trim(),
      description: newRecord.description ?? "",
      duty_rate: newRecord.duty_rate ?? "",
      notes: newRecord.notes ?? "",
    }

    try {
      const res = await axios.post("/tnved-codes", payload)
      const inserted = res?.data?.inserted || []
      const errors = res?.data?.errors || []

      if (inserted.length) {
        // свежие записи добавим в начало
        setData((prev) => [...inserted, ...prev])
        setNewRecord(null)
        message.success(`Добавлено: ${inserted.length}`)
      }

      if (errors.length) {
        // покажем кратко первую ошибку
        message.warning(errors[0] || "Некоторые строки не добавлены")
      }
    } catch (err) {
      console.error("Ошибка при добавлении:", err)
      if (err?.isDuplicateKey) {
        message.error("Код уже существует")
      } else {
        message.error("Не удалось добавить запись")
      }
    }
  }

  // ---- update (с version) -------------------------------------
  const handleUpdate = async (id, updated) => {
    // updated должен содержать актуальный updated.version
    try {
      const { data: fresh } = await axios.put(`/tnved-codes/${id}`, {
        code: updated.code?.trim(),
        description: updated.description ?? null,
        duty_rate: updated.duty_rate ?? null,
        notes: updated.notes ?? null,
        version: updated.version, // ВАЖНО
      })
      replaceRow(fresh) // сервер вернёт запись с version+1
      message.success("Изменения сохранены")
    } catch (err) {
      // Пробрасываем дальше, чтобы таблица показала модалку/сообщение
      throw err
    }
  }

  // ---- delete (с ?version=) -----------------------------------
  const handleDelete = async (record) => {
    try {
      await axios.delete(`/tnved-codes/${record.id}`, {
        params: { version: record.version }, // защита от гонок удаления
      })
      removeRow(record.id)
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
            <Button
              size="small"
              type="link"
              href="https://www.alta.ru/tnved/"
              target="_blank"
              rel="noopener noreferrer"
            >
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
        <TableToolbar
          search={search}
          onSearch={setSearch}
          onImport={() => setImportVisible(true)}
          onShowDeleted={() => setLogId("deleted")}
        />

        <Form layout="inline" style={{ marginBottom: 16 }} onFinish={handleAdd}>
          <Form.Item label="Код">
            <Input
              value={newRecord?.code || ""}
              onChange={(e) =>
                setNewRecord((prev) => ({ ...prev, code: e.target.value }))
              }
              placeholder="Введите код"
            />
          </Form.Item>

          <Form.Item label="Описание">
            <TextArea
              rows={1}
              value={newRecord?.description || ""}
              onChange={(e) =>
                setNewRecord((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="Описание"
              style={{ width: 300 }}
            />
          </Form.Item>

          <Form.Item label="Пошлина">
            <Input
              type="number"
              value={newRecord?.duty_rate || ""}
              onChange={(e) =>
                setNewRecord((prev) => ({ ...prev, duty_rate: e.target.value }))
              }
              placeholder="%"
              style={{ width: 100 }}
            />
          </Form.Item>

          <Form.Item label="Примечания">
            <TextArea
              rows={1}
              value={newRecord?.notes || ""}
              onChange={(e) =>
                setNewRecord((prev) => ({ ...prev, notes: e.target.value }))
              }
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
          onReplaceRow={replaceRow} // для модалки конфликта
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
        <FullHistoryDialog
          onlyDeleted
          entityType="tnved_code"
          onClose={() => setLogId(null)}
        />
      )}
    </Space>
  )
}

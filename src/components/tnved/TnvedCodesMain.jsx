// src/components/tnved/TnvedCodesMain.jsx

import React, { useState, useEffect } from "react"
import { Card, Space, message, Button, Input, Form } from "antd"
import axios from "@/api/axiosInstance"
import TnvedCodesTable from "./TnvedCodesTable"
import ImportModal from "@/components/common/ImportModal"
import TableToolbar from "@/components/common/TableToolbar"
import logActivity from "@/utils/logActivity"

const { TextArea } = Input

export default function TnvedCodesMain() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [importVisible, setImportVisible] = useState(false)
  const [search, setSearch] = useState("")
  const [newRecord, setNewRecord] = useState(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await axios.get("/tnved-codes")
      setData(res.data)
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

  const handleAdd = async () => {
    if (!newRecord?.code) {
      message.warning("Поле 'Код' обязательно для заполнения")
      return
    }

    const sanitized = Object.fromEntries(
      Object.entries(newRecord).map(([k, v]) => [k, v ?? ""])
    )

    try {
      const res = await axios.post("/tnved-codes", sanitized)
      logActivity("tnved_code", res.data.id, "create", sanitized)
      message.success("Запись добавлена")
      setNewRecord(null)
      fetchData()
    } catch (err) {
      console.error("Ошибка при добавлении:", err)
      message.error("Не удалось добавить запись")
    }
  }

  const handleUpdate = async (id, updated) => {
    try {
      await axios.put(`/tnved-codes/${id}`, updated)
      logActivity("tnved_code", id, "update", updated)
      message.success("Изменения сохранены")
      fetchData()
    } catch (err) {
      console.error("Ошибка при обновлении:", err)
      message.error("Ошибка при сохранении изменений")
    }
  }

  const handleDelete = async (record) => {
    try {
      await axios.delete(`/tnved-codes/${record.id}`)
      logActivity("tnved_code", record.id, "delete", record)
      message.success("Код удалён")
      fetchData()
    } catch (err) {
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
          filterValue={search}
          onFilterChange={setSearch}
          onImportClick={() => setImportVisible(true)}
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
        />
      </Card>

      <ImportModal
        open={importVisible}
        onClose={() => setImportVisible(false)}
        onSuccess={fetchData}
        type="tnved_code"
        templateUrl="https://storage.googleapis.com/shared-parts-bucket/templates/tnved_codes_template.xlsx" // ✅
      />
    </Space>
  )
}

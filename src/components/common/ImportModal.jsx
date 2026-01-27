// src/components/common/ImportModal.jsx
import React, { useState } from "react"
import { Modal, Button, Alert, Upload, Typography, Spin, Space } from "antd"
import { UploadOutlined, FileExcelOutlined } from "@ant-design/icons"
import axios from "@/api/axiosInstance"

const { Text } = Typography

export default function ImportModal({
  open,
  onClose,
  type,                 // имя сущности из /import/schema/:type и /import/:type
  onSuccess,
  templateUrl,          // ссылка на XLSX-шаблон
  extraParams = {},     // 👈 ВАЖНО: сюда прокидываем { equipment_model_id: ... } и т.п.
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [errors, setErrors] = useState([])
  const [imported, setImported] = useState(0)

  const handleUpload = async ({ file, onSuccess: markOk, onError: markErr }) => {
    if (!file || !type) return

    try {
      setLoading(true)
      setError("")
      setErrors([])
      setImported(0)

      // 1) тянем схему
      const { data: schema } = await axios.get(`/import/schema/${type}`)
      if (!schema) throw new Error("Схема импорта не найдена")

      const {
        requiredFields = [],
        headerMap = {},
        transform,          // может прийти как строка функции
        uniqueField,
      } = schema

      // 2) читаем файл (подгружаем парсер только когда реально нужен)
      const { default: readXlsxFile } = await import("read-excel-file")
      const rows = await readXlsxFile(file)
      if (!rows?.length) throw new Error("Файл пустой или не распознан")

      const headerRow = rows[0].map((h) => String(h ?? "").trim())
      const dataRows = rows.slice(1)

      // 3) проверяем наличие обязательных ЗАГОЛОВКОВ (показываем человеку понятные имена)
      const present = new Set(headerRow)
      const techToHuman = (tech) =>
        Object.entries(headerMap).find(([, k]) => k === tech)?.[0] || tech

      const missingHuman = requiredFields
        .map(techToHuman)
        .filter((label) => !present.has(label))

      if (missingHuman.length) {
        setError(`Отсутствуют обязательные поля: ${missingHuman.join(", ")}`)
        markErr?.("missing headers")
        return
      }

      // 4) маппим строки -> объект по headerMap
      const clientErrors = []
      const seenKeys = new Set()

      const transformedData = dataRows.map((row, idx) => {
        const obj = {}
        headerRow.forEach((label, colIdx) => {
          const key = headerMap[label]
          if (key) obj[key] = row[colIdx]
        })

        // локальная валидация обязательных полей по содержимому
        requiredFields.forEach((field) => {
          const v = obj[field]
          if (v === undefined || v === null || String(v).trim() === "") {
            clientErrors.push(
              `Строка ${idx + 2}: поле "${techToHuman(field)}" обязательно`
            )
          }
        })

        // проверка дубликатов по uniqueField (внутри файла)
        if (uniqueField) {
          const keyVal = (obj[uniqueField] ?? "").toString().trim()
          if (keyVal) {
            if (seenKeys.has(keyVal)) {
              clientErrors.push(
                `Строка ${idx + 2}: дубликат "${keyVal}" в поле "${techToHuman(uniqueField)}"`
              )
            } else {
              seenKeys.add(keyVal)
            }
          }
        }

        // 5) применяем schema.transform, если backend прислал её как строку
        try {
          if (typeof transform === "string" && transform.trim()) {
            const fn = new Function("row", `return (${transform})(row)`)
            const extra = fn(obj) || {}
            Object.assign(obj, extra)
          }
        } catch (e) {
          // не падаем — просто лог
          console.warn("Ошибка в transform:", e)
        }

        return obj
      })

      if (clientErrors.length) {
        setErrors(clientErrors)
        markErr?.("client validation")
        return
      }

      // 6) отправляем на сервер
      //    👇 КЛЮЧЕВОЕ: прокидываем контекст как query-параметры (например, equipment_model_id)
      const res = await axios.post(`/import/${type}`, transformedData, {
        params: extraParams,
      })

      setImported(res.data?.inserted?.length || 0)
      setErrors(res.data?.errors || [])
      if (res.data?.inserted?.length && typeof onSuccess === "function") onSuccess()
      markOk?.("ok")
    } catch (e) {
      // покажем текст от сервера, если есть
      const serverMsg = e?.response?.data?.message
      setError(serverMsg || "Ошибка при импорте файла")
      markErr?.(serverMsg || e?.message || "import error")
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setError("")
    setErrors([])
    setImported(0)
    onClose()
  }

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      title="Импорт из Excel"
      footer={[
        <Button key="close" onClick={handleClose}>Закрыть</Button>
      ]}
      width={600}
    >
      <Space direction="vertical" style={{ width: "100%" }} size="middle">
        {loading && <Spin tip="Загрузка..." />}

        <Space>
          {templateUrl && (
            <Button
              icon={<FileExcelOutlined />}
              href={templateUrl}
              target="_blank"
              rel="noopener noreferrer"
              download
            >
              Скачать шаблон Excel
            </Button>
          )}

          <Upload
            accept=".xlsx"
            showUploadList={false}
            customRequest={handleUpload}
            disabled={loading}
          >
            <Button icon={<UploadOutlined />} disabled={loading}>
              Загрузить Excel файл
            </Button>
          </Upload>
        </Space>

        {error && <Alert type="error" message={error} />}
        {errors.length > 0 && (
          <Alert
            type="error"
            message={
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            }
          />
        )}
        {imported > 0 && (
          <Alert type="success" message={`Импортировано записей: ${imported}`} />
        )}
      </Space>
    </Modal>
  )
}

import React, { useState } from "react"
import {
  Modal,
  Button,
  Alert,
  Upload,
  Typography,
  Spin,
  Space
} from "antd"
import {
  UploadOutlined,
  FileExcelOutlined
} from "@ant-design/icons"
import readXlsxFile from "read-excel-file"
import axios from "@/api/axiosInstance"

const { Text } = Typography

export default function ImportModal({ open, onClose, type, onSuccess, templateUrl }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [errors, setErrors] = useState([])
  const [imported, setImported] = useState(0)

  const handleUpload = async ({ file }) => {
    if (!file || !type) return

    try {
      setLoading(true)
      setError("")
      setErrors([])
      setImported(0)

      const schemaRes = await axios.get(`/import/schema/${type}`)
      const schema = schemaRes.data
      if (!schema) throw new Error("Схема импорта не найдена")

      const rows = await readXlsxFile(file)
      const header = rows[0]
      const dataRows = rows.slice(1)

      const { requiredFields = [], headerMap = {}, transform, uniqueField } = schema

      const presentHeaders = new Set(header)
      const missing = requiredFields.filter((techField) => {
        const humanHeader = Object.keys(headerMap).find(
          (label) => headerMap[label] === techField
        )
        return humanHeader && !presentHeaders.has(humanHeader)
      })

      if (missing.length) {
        setError(`Отсутствуют обязательные поля: ${missing.join(", ")}`)
        return
      }

      const seenKeys = new Set()
      const clientErrors = []

      const transformedData = dataRows.map((row, idx) => {
        const mappedRow = {}
        header.forEach((label, index) => {
          const key = headerMap[label]
          if (key) mappedRow[key] = row[index]
        })

        if (transform) {
          try {
            const fn = new Function("row", `return (${transform})(row)`)
            Object.assign(mappedRow, fn(mappedRow))
          } catch (e) {
            console.warn("Ошибка в transform функции:", e)
          }
        }

        requiredFields.forEach((field) => {
          if (!mappedRow[field]) {
            clientErrors.push(`Строка ${idx + 2}: поле "${field}" обязательно`)
          }
        })

        if (uniqueField) {
          const key = mappedRow[uniqueField]?.toString().trim()
          if (key) {
            if (seenKeys.has(key)) {
              clientErrors.push(`Строка ${idx + 2}: дубликат значения "${key}" в поле "${uniqueField}"`)
            } else {
              seenKeys.add(key)
            }
          }
        }

        return mappedRow
      })

      if (clientErrors.length > 0) {
        setErrors(clientErrors)
        return
      }

      const res = await axios.post(`/import/${type}`, transformedData)
      setImported(res.data.inserted?.length || 0)
      setErrors(res.data.errors || [])

      if (res.data.inserted?.length && typeof onSuccess === "function") {
        onSuccess()
      }
    } catch (e) {
      console.error("Импорт не удался:", e)
      setError("Ошибка при импорте файла")
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
        <Button key="close" onClick={handleClose}>
          Закрыть
        </Button>
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
                {errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
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

import React, { useEffect, useMemo, useState } from "react"
import { Alert, Button, Modal, Space, Statistic, Table, Tag, Typography, Upload, message } from "antd"
import { DownloadOutlined, InboxOutlined } from "@ant-design/icons"
import axios from "@/api/axiosInstance"

const ENTITY_LABELS = {
  equipment_model: "моделей оборудования",
  catalog_position: "карточек номенклатуры",
}

const ACTION_META = {
  create: { label: "Создать", color: "green" },
  update: { label: "Обновить", color: "blue" },
  skip: { label: "Без изменений", color: "default" },
  error: { label: "Ошибка", color: "red" },
}

const fileNameFromHeaders = (headers, fallback) => {
  const disposition = headers?.["content-disposition"] || ""
  const utfMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i)
  if (utfMatch?.[1]) return decodeURIComponent(utfMatch[1])
  const plainMatch = disposition.match(/filename="?([^";]+)"?/i)
  return plainMatch?.[1] || fallback
}

const saveBlob = (blob, fileName) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export default function ClassifierExcelImportModal({ open, node, entityType, onClose, onCommitted }) {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [templateLoading, setTemplateLoading] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [commitLoading, setCommitLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setFile(null)
    setPreview(null)
  }, [open, node?.id, entityType])

  const entityLabel = ENTITY_LABELS[entityType] || "данных"
  const rows = Array.isArray(preview?.rows) ? preview.rows : []
  const counts = preview?.counts || {}

  const columns = useMemo(() => [
    { title: "Строка", dataIndex: "row_number", width: 76 },
    {
      title: entityType === "equipment_model" ? "Модель" : "Позиция",
      key: "entity",
      render: (_, row) => (
        <Space direction="vertical" size={0}>
          <Typography.Text>{row.model_name || row.display_name || "—"}</Typography.Text>
          <Typography.Text type="secondary">
            {[row.manufacturer_name, row.position_code || row.manufacturer_part_number].filter(Boolean).join(" · ")}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: "Результат",
      dataIndex: "action",
      width: 130,
      render: (value) => {
        const meta = ACTION_META[value] || ACTION_META.error
        return <Tag color={meta.color}>{meta.label}</Tag>
      },
    },
    {
      title: "Пояснение",
      key: "details",
      width: 360,
      render: (_, row) => (
        <Space direction="vertical" size={2}>
          {(row.errors || []).map((error) => <Typography.Text key={error} type="danger">{error}</Typography.Text>)}
          {(row.warnings || []).map((warning) => <Typography.Text key={warning} type="warning">{warning}</Typography.Text>)}
          {!row.errors?.length && !row.warnings?.length ? <Typography.Text type="secondary">Проверено</Typography.Text> : null}
        </Space>
      ),
    },
  ], [entityType])

  const downloadTemplate = async () => {
    if (!node?.id || !entityType) return
    setTemplateLoading(true)
    try {
      const response = await axios.get("/classifier-imports/template", {
        params: { node_id: node.id, entity_type: entityType },
        responseType: "blob",
      })
      saveBlob(response.data, fileNameFromHeaders(response.headers, `classifier_${node.id}.xlsx`))
    } catch (error) {
      console.error("GET /classifier-imports/template error:", error)
      message.error(error?.response?.data?.message || "Не удалось скачать шаблон")
    } finally {
      setTemplateLoading(false)
    }
  }

  const checkFile = async () => {
    if (!file || !node?.id || !entityType) return
    const formData = new FormData()
    formData.append("file", file)
    formData.append("node_id", String(node.id))
    formData.append("entity_type", entityType)
    setPreviewLoading(true)
    try {
      const { data } = await axios.post("/classifier-imports/preview", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      setPreview(data)
      if (data?.can_commit) message.success("Файл проверен. Можно выполнить импорт.")
    } catch (error) {
      console.error("POST /classifier-imports/preview error:", error)
      setPreview(null)
      message.error(error?.response?.data?.message || "Не удалось проверить файл")
    } finally {
      setPreviewLoading(false)
    }
  }

  const commitImport = async () => {
    if (!preview?.batch_id || !preview?.can_commit) return
    setCommitLoading(true)
    try {
      const { data } = await axios.post(`/classifier-imports/${preview.batch_id}/commit`)
      message.success(`Импорт завершён: создано ${data.created || 0}, обновлено ${data.updated || 0}`)
      onCommitted?.(data)
      onClose?.()
    } catch (error) {
      console.error("POST /classifier-imports/:id/commit error:", error)
      message.error(error?.response?.data?.message || "Не удалось выполнить импорт")
    } finally {
      setCommitLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      title={`Импорт ${entityLabel} · ${node?.name || "раздел"}`}
      width={980}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>Закрыть</Button>,
        <Button
          key="commit"
          type="primary"
          loading={commitLoading}
          disabled={!preview?.can_commit}
          onClick={commitImport}
        >
          Выполнить импорт
        </Button>,
      ]}
      destroyOnHidden
    >
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Alert
          type="info"
          showIcon
          message="Сначала скачайте шаблон этого раздела"
          description="Его колонки сформированы из текущих характеристик. Загрузка только проверяет файл — записи появятся после отдельного подтверждения."
          action={(
            <Button icon={<DownloadOutlined />} loading={templateLoading} onClick={downloadTemplate}>
              Скачать шаблон
            </Button>
          )}
        />

        <Upload.Dragger
          accept=".xlsx"
          maxCount={1}
          fileList={file ? [{ uid: "classifier-import", name: file.name, status: "done" }] : []}
          beforeUpload={(nextFile) => {
            setFile(nextFile)
            setPreview(null)
            return false
          }}
          onRemove={() => {
            setFile(null)
            setPreview(null)
          }}
        >
          <p className="ant-upload-drag-icon"><InboxOutlined /></p>
          <p className="ant-upload-text">Перетащите заполненный XLSX или выберите файл</p>
          <p className="ant-upload-hint">Не переименовывайте листы и заголовки шаблона.</p>
        </Upload.Dragger>

        <Button type="primary" disabled={!file} loading={previewLoading} onClick={checkFile}>
          Проверить файл
        </Button>

        {preview ? (
          <>
            <Space wrap>
              <Statistic title="Создать" value={counts.create || 0} />
              <Statistic title="Обновить" value={counts.update || 0} />
              <Statistic title="Без изменений" value={counts.skip || 0} />
              <Statistic title="Ошибки" value={counts.error || 0} valueStyle={counts.error ? { color: "#cf1322" } : undefined} />
            </Space>
            {preview.can_commit ? (
              <Alert type="success" showIcon message="Проверка завершена. До нажатия «Выполнить импорт» база не изменена." />
            ) : (
              <Alert type="error" showIcon message="Исправьте ошибки в Excel и загрузите файл заново." />
            )}
            <Table
              size="small"
              rowKey="row_number"
              columns={columns}
              dataSource={rows}
              pagination={{ pageSize: 20, showSizeChanger: false }}
              scroll={{ x: 860, y: 360 }}
            />
          </>
        ) : null}
      </Space>
    </Modal>
  )
}

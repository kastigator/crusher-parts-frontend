import React, { useCallback, useEffect, useState } from "react"
import {
  Table,
  Upload,
  Button,
  Space,
  message,
  Popconfirm,
  Input,
} from "antd"
import { UploadOutlined } from "@ant-design/icons"
import axios from "@/api/axiosInstance"
import ActionButtons from "@/components/common/ActionButtons"
import confirmAction from "@/utils/confirmAction"

const bytesToSize = (bytes) => {
  if (!bytes && bytes !== 0) return ""
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
}

export default function OriginalPartDocumentsTab({ partId, onChanged }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)

  const [editingId, setEditingId] = useState(null)
  const [editingDescription, setEditingDescription] = useState("")

  const load = useCallback(async () => {
    if (!partId) {
      setRows([])
      return
    }
    setLoading(true)
    try {
      const { data } = await axios.get(`/original-parts/${partId}/documents`)
      setRows(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
      message.error("Не удалось загрузить документы")
    } finally {
      setLoading(false)
    }
  }, [partId])

  useEffect(() => {
    load()
    setEditingId(null)
    setEditingDescription("")
  }, [partId, load])

  const handleUpload = async ({ file }) => {
    if (!partId) {
      message.warning("Сначала выберите деталь")
      return
    }
    const rawFile = file?.originFileObj || file
    if (!rawFile) {
      message.error("Не удалось прочитать файл")
      return
    }

    const formData = new FormData()
    formData.append("file", rawFile, rawFile.name || file?.name || "document")
    formData.append("file_name", rawFile.name || file?.name || rawFile.type || "document")

    setUploading(true)
    try {
      await axios.post(`/original-parts/${partId}/documents`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      message.success("Файл загружен")
      await load()
      if (typeof onChanged === "function") onChanged()
    } catch (e) {
      console.error(e)
      if (e?.response?.data?.message) {
        message.error(e.response.data.message)
      } else {
        message.error("Ошибка загрузки файла")
      }
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id) => {
    const { confirmed } = await confirmAction("Удалить документ?")
    if (!confirmed) return
    try {
      await axios.delete(`/original-parts/documents/${id}`)
      message.success("Документ удалён")
      setRows((prev) => prev.filter((r) => r.id !== id))
      if (editingId === id) {
        setEditingId(null)
        setEditingDescription("")
      }
      if (typeof onChanged === "function") onChanged()
    } catch (e) {
      console.error(e)
      if (e?.response?.data?.message) {
        message.error(e.response.data.message)
      } else {
        message.error("Не удалось удалить документ")
      }
    }
  }

  const startEdit = (record) => {
    if (editingId && editingId !== record.id) {
      message.warning("Сначала сохраните или отмените текущие изменения")
      return
    }
    setEditingId(record.id)
    setEditingDescription(record.description || "")
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingDescription("")
  }

  const saveEdit = async (id) => {
    const desc = (editingDescription || "").trim()

    try {
      await axios.put(`/original-parts/documents/${id}`, {
        description: desc || null,
      })
      message.success("Описание обновлено")

      setRows((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, description: desc || null } : r,
        ),
      )
      cancelEdit()
    } catch (e) {
      console.error(e)
      if (e?.response?.data?.message) {
        message.error(e.response.data.message)
      } else {
        message.error("Не удалось сохранить описание")
      }
    }
  }

  const makeKeyHandler = (id) => (e) => {
    if (e.key === "Escape") {
      e.stopPropagation()
      cancelEdit()
    } else if (e.key === "Enter") {
      e.preventDefault()
      e.stopPropagation()
      saveEdit(id)
    }
  }

  const columns = [
    {
      title: "Файл",
      dataIndex: "file_name",
      ellipsis: true,
      width: 220,
      render: (text, record) => {
        let decodedName = text || ""
        try {
          decodedName = decodeURIComponent(decodedName)
        } catch {
          /* ignore */
        }

        return record.file_url ? (
          <a href={record.file_url} target="_blank" rel="noreferrer">
            {decodedName}
          </a>
        ) : (
          decodedName
        )
      },
    },
    {
      title: "Тип",
      dataIndex: "file_type",
      width: 120,
    },
    {
      title: "Размер",
      dataIndex: "file_size",
      width: 110,
      render: (v) => bytesToSize(v),
    },
    {
      title: "Описание",
      dataIndex: "description",
      ellipsis: true,
      width: 220,
      render: (text, record) => {
        if (record.id !== editingId) return text || ""
        return (
          <Input
            autoFocus
            value={editingDescription}
            onChange={(e) => setEditingDescription(e.target.value)}
            onKeyDown={makeKeyHandler(record.id)}
          />
        )
      },
    },
    {
      title: "Загружено",
      dataIndex: "uploaded_at",
      width: 160,
      render: (v) => (v ? new Date(v).toLocaleString() : ""),
    },
    {
      title: "Действия",
      width: 170,
      render: (_, record) => {
        const editing = record.id === editingId
        return (
          <ActionButtons
            size="small"
            onEdit={!editing ? () => startEdit(record) : undefined}
            onSave={editing ? () => saveEdit(record.id) : undefined}
            onCancel={editing ? cancelEdit : undefined}
            onDelete={!editing ? () => handleDelete(record.id) : undefined}
            disabledEdit={!!editingId && !editing}
            disabledDelete={!!editingId && !editing}
            confirmDelete={false}
            titles={{
              delete: "Удалить документ",
              edit: "Редактировать описание",
              save: "Сохранить описание",
              cancel: "Отмена",
            }}
          />
        )
      },
    },
  ]

  return (
    <Space direction="vertical" style={{ width: "100%" }} size={12}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <Upload
          multiple={false}
          accept=".pdf,.png,.jpg,.jpeg,.svg,.dwg,.dxf"
          customRequest={handleUpload}
          showUploadList={false}
        >
          <Button
            icon={<UploadOutlined />}
            type="primary"
            disabled={!partId}
            loading={uploading}
          >
            Загрузить файл
          </Button>
        </Upload>

        <span style={{ color: "#8c8c8c", fontSize: 12 }}>
          Кнопка карандаш — редактирование описания.
        </span>
      </div>

      <div className="parts-table-wrap table-section" style={{ marginTop: 0 }}>
        <Table
          className="op-table"
          rowKey="id"
          size="small"
          columns={columns}
          dataSource={rows}
          loading={loading}
          pagination={false}
          tableLayout="fixed"
        />
      </div>
    </Space>
  )
}

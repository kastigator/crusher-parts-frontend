import React, { useEffect, useState } from "react"
import {
  Modal,
  Table,
  Form,
  Input,
  Space,
  Button,
  message,
} from "antd"
import { DeleteOutlined } from "@ant-design/icons"
import axios from "@/api/axiosInstance"
import confirmAction from "@/utils/confirmAction"
import ActionButtons from "@/components/common/ActionButtons"

export default function OriginalPartGroupsManager({ open, onClose, onChanged }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)

  const [createForm] = Form.useForm()

  // inline-редактирование
  const [editingId, setEditingId] = useState(null)
  const [editingValues, setEditingValues] = useState({ name: "", description: "" })
  const [savingEdit, setSavingEdit] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await axios.get("/original-part-groups")
      setRows(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
      message.error("Не удалось загрузить группы деталей")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      load()
      setEditingId(null)
    }
  }, [open])

  const handleCreate = async (values) => {
    try {
      const payload = {
        name: values.name,
        description: values.description || null,
      }
      const { data } = await axios.post("/original-part-groups", payload)
      message.success(`Группа "${data.name}" создана`)
      createForm.resetFields()
      await load()
      if (typeof onChanged === "function") onChanged()
    } catch (e) {
      console.error(e)
      message.error("Не удалось создать группу")
    }
  }

  const startEdit = (record) => {
    if (editingId && editingId !== record.id) {
      message.warning("Сначала сохраните или отмените текущие изменения")
      return
    }
    setEditingId(record.id)
    setEditingValues({
      name: record.name || "",
      description: record.description || "",
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingValues({ name: "", description: "" })
  }

  const saveEdit = async (id) => {
    if (!id) return
    setSavingEdit(true)
    try {
      const payload = {
        name: editingValues.name?.trim() || "",
        description: editingValues.description?.trim() || null,
      }
      const { data } = await axios.put(`/original-part-groups/${id}`, payload)
      message.success(`Группа "${data.name}" обновлена`)
      setEditingId(null)
      await load()
      if (typeof onChanged === "function") onChanged()
    } catch (e) {
      console.error(e)
      message.error("Не удалось сохранить изменения")
    } finally {
      setSavingEdit(false)
    }
  }

  const handleDelete = async (record) => {
    const { confirmed } = await confirmAction(
      `Удалить группу "${record.name}"?`,
    )
    if (!confirmed) return
    try {
      await axios.delete(`/original-part-groups/${record.id}`)
      message.success("Группа удалена")
      await load()
      if (typeof onChanged === "function") onChanged()
    } catch (e) {
      console.error(e)
      if (e?.response?.data?.message) {
        message.error(e.response.data.message)
      } else {
        message.error("Не удалось удалить группу")
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
      title: "Название",
      dataIndex: "name",
      width: 260,
      render: (_, record) => {
        if (record.id !== editingId) return record.name
        return (
          <Input
            autoFocus
            value={editingValues.name}
            onChange={(e) =>
              setEditingValues((prev) => ({
                ...prev,
                name: e.target.value,
              }))
            }
            onKeyDown={makeKeyHandler(record.id)}
          />
        )
      },
    },
    {
      title: "Описание",
      dataIndex: "description",
      ellipsis: true,
      render: (_, record) => {
        if (record.id !== editingId) return record.description
        return (
          <Input
            value={editingValues.description}
            onChange={(e) =>
              setEditingValues((prev) => ({
                ...prev,
                description: e.target.value,
              }))
            }
            onKeyDown={makeKeyHandler(record.id)}
          />
        )
      },
    },
    {
      title: "Действия",
      width: 170,
      align: "center",
      render: (_, record) => {
        const editing = record.id === editingId
        return (
          <ActionButtons
            size="small"
            onEdit={!editing ? () => startEdit(record) : undefined}
            onSave={editing ? () => saveEdit(record.id) : undefined}
            onCancel={editing ? cancelEdit : undefined}
            onDelete={!editing ? () => handleDelete(record) : undefined}
            disabledEdit={!!editingId && !editing}
            disabledDelete={!!editingId && !editing}
            titles={{ delete: "Удалить группу" }}
          />
        )
      },
    },
  ]

  return (
    <Modal
      open={open}
      onCancel={() => {
        cancelEdit()
        onClose?.()
      }}
      title="Группы оригинальных деталей"
      footer={null}
      width={800}
      destroyOnClose
    >
      <Space direction="vertical" style={{ width: "100%" }} size={16}>
        {/* Форма создания группы */}
        <Form
          form={createForm}
          layout="inline"
          onFinish={handleCreate}
          style={{ marginBottom: 8, flexWrap: "wrap" }}
        >
          <Form.Item
            name="name"
            label="Название"
            rules={[{ required: true, message: "Укажите название группы" }]}
          >
            <Input placeholder="Например: Подшипники" allowClear />
          </Form.Item>
          <Form.Item name="description" label="Описание">
            <Input
              placeholder="Доп. описание"
              allowClear
              style={{ width: 260 }}
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">
              Добавить
            </Button>
          </Form.Item>
        </Form>

        {/* Таблица групп */}
        <Table
          size="middle"
          rowKey="id"
          columns={columns}
          dataSource={rows}
          loading={loading || savingEdit}
          pagination={{ pageSize: 50 }}
        />
      </Space>
    </Modal>
  )
}

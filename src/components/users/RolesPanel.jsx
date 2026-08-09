import React, { useCallback, useEffect, useState } from "react"
import { Button, Form, Input, Modal, Space, Table, Tag, message } from "antd"
import { PlusOutlined } from "@ant-design/icons"
import axios from "@/api/axiosInstance"
import useCapabilities from "@/hooks/useCapabilities"

export default function RolesPanel({ revision = 0, selectedRoleSlug, onSelectRole, onChanged }) {
  const { can, isSuperAdmin } = useCapabilities()
  const canManage = isSuperAdmin || can("administration.roles.manage")
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(false)
  const [editingRole, setEditingRole] = useState(null)
  const [creating, setCreating] = useState(false)
  const [form] = Form.useForm()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await axios.get("/roles")
      setRoles(data || [])
      if (!selectedRoleSlug && data?.length) onSelectRole?.(data[0].slug)
    } catch (error) {
      message.error(error?.response?.data?.message || "Не удалось загрузить роли")
    } finally {
      setLoading(false)
    }
  }, [onSelectRole, selectedRoleSlug])

  useEffect(() => { load() }, [load, revision])

  const openCreate = () => {
    setCreating(true)
    form.setFieldsValue({ name: "", description: "" })
  }

  const openEdit = (role) => {
    setEditingRole(role)
    form.setFieldsValue({ name: role.name, description: role.description || "" })
  }

  const save = async () => {
    const values = await form.validateFields()
    try {
      if (editingRole) await axios.put(`/roles/${editingRole.id}`, values)
      else await axios.post("/roles", values)
      setCreating(false)
      setEditingRole(null)
      onChanged?.()
      await load()
      message.success("Роль сохранена")
    } catch (error) {
      message.error(error?.response?.data?.message || "Не удалось сохранить роль")
    }
  }

  const columns = [
    {
      title: "Роль",
      dataIndex: "name",
      render: (name, role) => (
        <Space>
          <Button type="link" onClick={() => onSelectRole?.(role.slug)}>{name}</Button>
          {role.is_super_admin ? <Tag color="red">Суперадминистратор</Tag> : null}
          {role.is_system && !role.is_super_admin ? <Tag>Системная</Tag> : null}
          {role.slug === selectedRoleSlug ? <Tag color="blue">Выбрана</Tag> : null}
        </Space>
      ),
    },
    { title: "Бизнес-описание", dataIndex: "description" },
    { title: "Пользователи", dataIndex: "user_count", width: 120 },
    {
      title: "",
      width: 110,
      render: (_, role) => (
        <Button size="small" disabled={!canManage || !!role.is_system} onClick={() => openEdit(role)}>
          Изменить
        </Button>
      ),
    },
  ]

  return (
    <>
      <Space style={{ width: "100%", justifyContent: "space-between", marginBottom: 12 }}>
        <span>Роль — это коллекция бизнес-полномочий; пользователю можно назначить несколько ролей.</span>
        <Button type="primary" icon={<PlusOutlined />} disabled={!canManage} onClick={openCreate}>
          Создать роль
        </Button>
      </Space>
      <Table rowKey="id" columns={columns} dataSource={roles} loading={loading} pagination={false} />
      <Modal
        open={creating || !!editingRole}
        title={editingRole ? `Изменить роль: ${editingRole.name}` : "Новая роль"}
        onCancel={() => { setCreating(false); setEditingRole(null) }}
        onOk={save}
        okText="Сохранить"
        cancelText="Отмена"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Название" rules={[{ required: true, message: "Укажите название" }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Бизнес-ответственность">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

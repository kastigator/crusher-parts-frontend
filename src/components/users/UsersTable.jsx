import React, { useEffect, useMemo, useState } from "react"
import { Button, Form, Input, Modal, Select, Space, Table, Tag, message } from "antd"
import { KeyOutlined, PlusOutlined, UserOutlined } from "@ant-design/icons"
import axios from "@/api/axiosInstance"
import ValueDisplay from "@/components/common/ValueDisplay"
import ActionButtons from "@/components/common/ActionButtons"
import useCapabilities from "@/hooks/useCapabilities"
import { runTrashDeleteFlow } from "@/utils/trashUi"
import { useAuth } from "@/auth/AuthContext"

function UserFormModal({
  open,
  title,
  roles,
  initialValues,
  requirePassword = false,
  submitLabel = "Сохранить",
  onCancel,
  onSubmit,
}) {
  const [form] = Form.useForm()

  useEffect(() => {
    if (!open) return
    form.setFieldsValue({
      username: initialValues?.username || "",
      password: "",
      full_name: initialValues?.full_name || "",
      email: initialValues?.email || "",
      phone: initialValues?.phone || "",
      role_id: initialValues?.role_id || undefined,
    })
  }, [form, initialValues, open])

  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      await onSubmit(values)
      form.resetFields()
    } catch (_) {
      // validation errors are shown by antd form
    }
  }

  return (
    <Modal
      open={open}
      title={title}
      onCancel={onCancel}
      onOk={handleOk}
      okText={submitLabel}
      cancelText="Отмена"
      destroyOnHidden
    >
      <Form form={form} layout="vertical">
        <Form.Item
          label="Логин"
          name="username"
          rules={[{ required: true, message: "Укажите логин" }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          label="Имя"
          name="full_name"
        >
          <Input />
        </Form.Item>
        <Form.Item
          label="E-mail"
          name="email"
          rules={[{ type: "email", message: "Неверный формат e-mail" }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          label="Телефон"
          name="phone"
        >
          <Input />
        </Form.Item>
        <Form.Item
          label={requirePassword ? "Пароль" : "Новый пароль"}
          name="password"
          rules={requirePassword ? [{ required: true, message: "Укажите пароль" }] : []}
        >
          <Input.Password placeholder={requirePassword ? "" : "Оставьте пустым, если менять не нужно"} />
        </Form.Item>
        <Form.Item
          label="Роль"
          name="role_id"
          rules={[{ required: true, message: "Выберите роль" }]}
        >
          <Select
            options={roles.map((role) => ({ value: role.id, label: role.name }))}
            placeholder="Выберите роль"
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default function UsersTable({ rolesRevision = 0 }) {
  const { user: currentUser } = useAuth()
  const { can, isAdmin } = useCapabilities()
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const canManageUsersRoles = isAdmin || can("admin.users_roles.manage")

  useEffect(() => {
    fetchData()
  }, [rolesRevision])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [usersRes, rolesRes] = await Promise.all([
        axios.get("/users"),
        axios.get("/roles"),
      ])
      setUsers(usersRes.data || [])
      setRoles(rolesRes.data || [])
    } catch (err) {
      message.error("Ошибка загрузки данных")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const rolesById = useMemo(() => {
    const map = new Map()
    for (const role of roles) map.set(role.id, role)
    return map
  }, [roles])

  const handleCreate = async (values) => {
    try {
      const role = rolesById.get(values.role_id)
      await axios.post("/users", {
        ...values,
        role_slug: role?.slug,
      })
      setCreateOpen(false)
      await fetchData()
      message.success("Пользователь создан")
    } catch (err) {
      console.error(err)
      message.error(err?.response?.data?.message || "Ошибка при создании пользователя")
    }
  }

  const handleEditSave = async (values) => {
    if (!editingUser) return
    try {
      const role = rolesById.get(values.role_id)
      const payload = {
        username: values.username,
        full_name: values.full_name,
        email: values.email,
        phone: values.phone,
        role_id: values.role_id,
        role_slug: role?.slug,
      }
      if (values.password) payload.password = values.password

      await axios.put(`/users/${editingUser.id}`, payload)
      setEditingUser(null)
      await fetchData()
      message.success("Изменения сохранены")
    } catch (err) {
      console.error(err)
      message.error(err?.response?.data?.message || "Ошибка при сохранении")
    }
  }

  const deleteUser = async (user) => {
    try {
      const result = await runTrashDeleteFlow({
        entityType: "users",
        entityId: user.id,
        deleteUrl: `/users/${user.id}`,
        previewParams: { current_user_id: currentUser?.id },
        successMessage: "Пользователь перемещён в корзину",
      })
      if (!result?.deleted) return
      await fetchData()
    } catch (err) {
      message.error("Ошибка при удалении")
      console.error(err)
    }
  }

  const handlePasswordReset = async (id) => {
    try {
      const res = await axios.post(`/users/${id}/reset-password`)
      message.success(`Новый пароль: ${res.data.newPassword}`)
    } catch (_err) {
      message.error("Ошибка при сбросе пароля")
    }
  }

  const columns = [
    {
      title: "Логин",
      dataIndex: "username",
      width: 140,
      ellipsis: true,
      render: (text) => <ValueDisplay value={text} />,
    },
    {
      title: "Имя",
      dataIndex: "full_name",
      width: 180,
      ellipsis: true,
      render: (text) => <ValueDisplay value={text} />,
    },
    {
      title: "E-mail",
      dataIndex: "email",
      width: 220,
      ellipsis: true,
      render: (text) => <ValueDisplay value={text} type="email" />,
    },
    {
      title: "Телефон",
      dataIndex: "phone",
      width: 170,
      ellipsis: true,
      render: (text) => <ValueDisplay value={text} type="phone" />,
    },
    {
      title: "Пароль",
      key: "password",
      width: 140,
      render: (_, record) => (
        <Button
          icon={<KeyOutlined />}
          onClick={() => handlePasswordReset(record.id)}
          disabled={!canManageUsersRoles}
        >
          Сбросить
        </Button>
      ),
    },
    {
      title: "Роль",
      dataIndex: "role_id",
      width: 220,
      render: (value) => {
        const roleName = rolesById.get(value)?.name || "Не выбрана"
        return (
          <Tag icon={<UserOutlined />} style={{ paddingInline: 10, lineHeight: "28px" }}>
            {roleName}
          </Tag>
        )
      },
    },
    {
      title: "",
      key: "actions",
      width: 90,
      render: (_, record) => (
        <ActionButtons
          onEdit={canManageUsersRoles ? () => setEditingUser(record) : null}
          onDelete={canManageUsersRoles ? () => deleteUser(record) : null}
          size="small"
        />
      ),
    },
  ]

  return (
    <>
      <Space style={{ marginBottom: 12, width: "100%", justifyContent: "space-between" }}>
        <div />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)} disabled={!canManageUsersRoles}>
          Создать пользователя
        </Button>
      </Space>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={users}
        pagination={false}
        loading={loading}
        size="middle"
        scroll={{ x: 1120 }}
      />

      <UserFormModal
        open={createOpen}
        title="Новый пользователь"
        roles={roles}
        initialValues={null}
        requirePassword
        submitLabel="Создать"
        onCancel={() => setCreateOpen(false)}
        onSubmit={handleCreate}
      />

      <UserFormModal
        open={!!editingUser}
        title={editingUser ? `Редактирование: ${editingUser.username}` : "Редактирование пользователя"}
        roles={roles}
        initialValues={editingUser}
        submitLabel="Сохранить"
        onCancel={() => setEditingUser(null)}
        onSubmit={handleEditSave}
      />
    </>
  )
}

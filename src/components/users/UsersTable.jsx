import React, { useCallback, useEffect, useState } from "react"
import { Alert, Button, Descriptions, Form, Input, Modal, Select, Space, Table, Tag, message } from "antd"
import { KeyOutlined, PlusOutlined, SafetyCertificateOutlined, UserOutlined } from "@ant-design/icons"
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
      role_ids: initialValues?.role_ids || (initialValues?.role_id ? [initialValues.role_id] : []),
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
          label="Роли"
          name="role_ids"
          rules={[{ required: true, message: "Выберите хотя бы одну роль" }]}
        >
          <Select
            mode="multiple"
            options={roles.map((role) => ({ value: role.id, label: role.name }))}
            placeholder="Выберите роли"
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default function UsersTable({ rolesRevision = 0, onUsersLoaded = null }) {
  const { user: currentUser } = useAuth()
  const { can, isAdmin } = useCapabilities()
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [effectiveAccess, setEffectiveAccess] = useState(null)
  const [effectiveAccessLoading, setEffectiveAccessLoading] = useState(false)
  const canManageUsersRoles = isAdmin || can("administration.users.manage")

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [usersRes, rolesRes] = await Promise.all([
        axios.get("/users"),
        axios.get("/roles"),
      ])
      setUsers(usersRes.data || [])
      if (typeof onUsersLoaded === "function") {
        onUsersLoaded(usersRes.data || [])
      }
      setRoles(rolesRes.data || [])
    } catch (err) {
      message.error("Ошибка загрузки данных")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [onUsersLoaded])

  useEffect(() => {
    fetchData()
  }, [fetchData, rolesRevision])

  const handleCreate = async (values) => {
    try {
      await axios.post("/users", {
        ...values,
        primary_role_id: values.role_ids?.[0],
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
      const payload = {
        username: values.username,
        full_name: values.full_name,
        email: values.email,
        phone: values.phone,
        role_ids: values.role_ids,
        primary_role_id: values.role_ids?.[0],
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
      Modal.info({
        title: "Временный пароль",
        content: res.data.temporary_password,
        okText: "Закрыть",
      })
    } catch (_err) {
      message.error("Ошибка при сбросе пароля")
    }
  }

  const showEffectiveAccess = async (user) => {
    setEffectiveAccessLoading(true)
    try {
      const { data } = await axios.get(`/users/${user.id}/effective-access`)
      setEffectiveAccess(data)
    } catch (_error) {
      message.error("Не удалось рассчитать эффективный доступ")
    } finally {
      setEffectiveAccessLoading(false)
    }
  }

  const toggleUserStatus = async (user) => {
    try {
      await axios.patch(`/users/${user.id}/status`, { is_active: !user.is_active })
      await fetchData()
      message.success(user.is_active ? "Учетная запись отключена" : "Учетная запись включена")
    } catch (error) {
      message.error(error?.response?.data?.message || "Не удалось изменить статус")
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
      title: "Роли",
      dataIndex: "roles",
      width: 280,
      render: (assignedRoles = []) => (
        <Space size={[4, 4]} wrap>
          {assignedRoles.map((role) => (
            <Tag key={role.id} icon={<UserOutlined />} color={role.is_super_admin ? "red" : undefined}>
              {role.name}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: "Статус",
      dataIndex: "is_active",
      width: 130,
      render: (active, record) => (
        <Button
          size="small"
          danger={active}
          disabled={!canManageUsersRoles || record.id === currentUser?.id}
          onClick={() => toggleUserStatus(record)}
        >
          {active ? "Отключить" : "Включить"}
        </Button>
      ),
    },
    {
      title: "",
      key: "actions",
      width: 190,
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<SafetyCertificateOutlined />}
            loading={effectiveAccessLoading}
            onClick={() => showEffectiveAccess(record)}
          >
            Доступ
          </Button>
          <ActionButtons
            onEdit={canManageUsersRoles ? () => setEditingUser(record) : null}
            onDelete={canManageUsersRoles ? () => deleteUser(record) : null}
            size="small"
          />
        </Space>
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
        scroll={{ x: 1360 }}
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

      <Modal
        open={!!effectiveAccess}
        title={effectiveAccess ? `Эффективный доступ: ${effectiveAccess.username}` : "Эффективный доступ"}
        onCancel={() => setEffectiveAccess(null)}
        footer={null}
        width={760}
      >
        {effectiveAccess ? (
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            {effectiveAccess.is_super_admin ? (
              <Alert type="warning" showIcon message="Суперадминистратор — глобальное системное исключение" />
            ) : null}
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="Источник">{effectiveAccess.authorization_source}</Descriptions.Item>
              <Descriptions.Item label="Роли">
                <Space wrap>{effectiveAccess.roles.map((role) => <Tag key={role.id}>{role.name}</Tag>)}</Space>
              </Descriptions.Item>
              <Descriptions.Item label="Полномочия">
                <Space wrap>{effectiveAccess.capabilities.map((key) => <Tag key={key} color="blue">{key}</Tag>)}</Space>
              </Descriptions.Item>
              <Descriptions.Item label="Идентификаторы вкладок устаревшего контура">
                {effectiveAccess.permissions.length ? effectiveAccess.permissions.join(", ") : "Не используются / глобальный доступ"}
              </Descriptions.Item>
            </Descriptions>
          </Space>
        ) : null}
      </Modal>

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

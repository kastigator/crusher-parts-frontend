import React, { useEffect, useState } from "react"
import { Table, Input, Button, Modal, message } from "antd"
import { PlusOutlined, UserOutlined, KeyOutlined } from "@ant-design/icons"
import axios from "@/api/axiosInstance"
import confirmAction from "@/utils/confirmAction"
import ValueDisplay from "@/components/common/ValueDisplay"
import ActionButtons from "@/components/common/ActionButtons"

export default function UsersTable({ rolesRevision = 0 }) {
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(false)

  // данные для новой строки (создание)
  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    full_name: "",
    email: "",
    phone: "",
    role_id: null
  })

  // состояния редактирования
  const [editingId, setEditingId] = useState(null)
  const [formState, setFormState] = useState({})

  // модалка выбора роли
  const [roleModalOpen, setRoleModalOpen] = useState(false)
  const [roleTarget, setRoleTarget] = useState(null) // "new" или id пользователя

  useEffect(() => {
    fetchData()
  }, [rolesRevision])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [usersRes, rolesRes] = await Promise.all([
        axios.get("/users"),
        axios.get("/roles")
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

  // ===== Создание =====
  const handleCreate = async () => {
    const { username, password, role_id } = newUser
    if (!username || !password || !role_id) {
      message.error("Заполните логин, пароль и роль")
      return
    }
    try {
      await axios.post("/users", {
        ...newUser,
        role_slug: roles.find(r => r.id === role_id)?.slug
      })
      setNewUser({
        username: "",
        password: "",
        full_name: "",
        email: "",
        phone: "",
        role_id: null
      })
      fetchData()
      message.success("Пользователь создан")
    } catch (err) {
      message.error("Ошибка при создании")
      console.error(err)
    }
  }

  const startEdit = (id) => {
    if (editingId && editingId !== id) {
      message.warning("Сначала сохраните или отмените текущие изменения")
      return false
    }
    setEditingId(id)
    return true
  }

  // ===== Редактирование =====
  const handleEdit = (id, key, value) => {
    setFormState(prev => ({
      ...prev,
      [id]: { ...prev[id], [key]: value }
    }))
  }

  const handleSave = async (id) => {
    try {
      const user = users.find(u => u.id === id)
      if (!user) {
        message.error("Пользователь не найден")
        return
      }

      const changes = formState[id] || {}

      // собираем полный объект: базовый пользователь + изменения
      const merged = {
        username: changes.username ?? user.username,
        full_name: changes.full_name ?? user.full_name,
        email: changes.email ?? user.email,
        phone: changes.phone ?? user.phone,
        role_id: changes.role_id ?? user.role_id
      }

      const role = roles.find(r => r.id === merged.role_id)

      const payload = {
        ...merged,
        // backend, судя по POST /users, понимает role_slug
        role_slug: role?.slug
      }

      await axios.put(`/users/${id}`, payload)

      setEditingId(null)
      setFormState(prev => ({ ...prev, [id]: {} }))
      fetchData()
      message.success("Изменения сохранены")
    } catch (err) {
      console.error("Ошибка при сохранении:", err)
      message.error("Ошибка при сохранении")
    }
  }

  // ===== Удаление =====
  const deleteUser = async (user) => {
    const { confirmed } = await confirmAction(`Удалить пользователя "${user.username}"?`)
    if (!confirmed) return
    try {
      await axios.delete(`/users/${user.id}`)
      fetchData()
      message.success("Пользователь удалён")
    } catch (err) {
      message.error("Ошибка при удалении")
      console.error(err)
    }
  }

  // ===== Сброс пароля =====
  const handlePasswordReset = async (id) => {
    try {
      const res = await axios.post(`/users/${id}/reset-password`)
      message.success(`Новый пароль: ${res.data.newPassword}`)
    } catch (_err) {
      message.error("Ошибка при сбросе пароля")
    }
  }

  // ===== Выбор роли (через модалку) =====
  const openRoleModal = (targetId) => {
    if (targetId !== "new") {
      const ok = startEdit(targetId)
      if (!ok) return
    }
    setRoleTarget(targetId)

    setRoleModalOpen(true)
  }

  const selectRole = (roleId) => {
    if (roleTarget === "new") {
      // новая строка — просто записываем роль в newUser
      setNewUser(prev => ({ ...prev, role_id: roleId }))
    } else {
      // существующий пользователь — меняем role_id в formState
      handleEdit(roleTarget, "role_id", roleId)
    }
    setRoleModalOpen(false)
  }

  // ===== Колонки =====
  const columns = [
    {
      title: "Логин",
      dataIndex: "username",
      render: (text, record) =>
        record.id === "__new__"
          ? (
              <Input
                value={newUser.username}
                onChange={e => setNewUser({ ...newUser, username: e.target.value })}
              />
            )
          : editingId === record.id
            ? (
                <Input
                  value={formState[record.id]?.username ?? text}
                  onChange={e => handleEdit(record.id, "username", e.target.value)}
                />
              )
            : (
                <ValueDisplay value={text} />
              )
    },
    {
      title: "Имя",
      dataIndex: "full_name",
      render: (text, record) =>
        record.id === "__new__"
          ? (
              <Input
                value={newUser.full_name}
                onChange={e => setNewUser({ ...newUser, full_name: e.target.value })}
              />
            )
          : editingId === record.id
            ? (
                <Input
                  value={formState[record.id]?.full_name ?? text}
                  onChange={e => handleEdit(record.id, "full_name", e.target.value)}
                />
              )
            : (
                <ValueDisplay value={text} />
              )
    },
    {
      title: "E-mail",
      dataIndex: "email",
      render: (text, record) =>
        record.id === "__new__"
          ? (
              <Input
                value={newUser.email}
                onChange={e => setNewUser({ ...newUser, email: e.target.value })}
              />
            )
          : editingId === record.id
            ? (
                <Input
                  value={formState[record.id]?.email ?? text}
                  onChange={e => handleEdit(record.id, "email", e.target.value)}
                />
              )
            : (
                <ValueDisplay value={text} type="email" />
              )
    },
    {
      title: "Телефон",
      dataIndex: "phone",
      render: (text, record) =>
        record.id === "__new__"
          ? (
              <Input
                value={newUser.phone}
                onChange={e => setNewUser({ ...newUser, phone: e.target.value })}
              />
            )
          : editingId === record.id
            ? (
                <Input
                  value={formState[record.id]?.phone ?? text}
                  onChange={e => handleEdit(record.id, "phone", e.target.value)}
                />
              )
            : (
                <ValueDisplay value={text} type="phone" />
              )
    },
    {
      title: "Пароль",
      dataIndex: "password",
      render: (_, record) =>
        record.id === "__new__"
          ? (
              <Input.Password
                value={newUser.password}
                onChange={e => setNewUser({ ...newUser, password: e.target.value })}
              />
            )
          : (
              <Button
                icon={<KeyOutlined />}
                onClick={() => handlePasswordReset(record.id)}
              >
                Сбросить
              </Button>
            )
    },
    {
      title: "Роль",
      dataIndex: "role_id",
      render: (value, record) => {
        const roleName = roles.find(r => r.id === value)?.name || "Выбрать"
        return (
          <Button
            icon={<UserOutlined />}
            onClick={() =>
              openRoleModal(record.id === "__new__" ? "new" : record.id)
            }
          >
            {roleName}
          </Button>
        )
      }
    },
    {
      title: "",
      key: "actions",
      render: (_, record) => {
        if (record.id === "__new__") {
          return (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreate}
            >
              Создать
            </Button>
          )
        }
        const editing = editingId === record.id
        return (
          <ActionButtons
            onEdit={!editing ? () => startEdit(record.id) : undefined}
            onSave={editing ? () => handleSave(record.id) : undefined}
            onCancel={editing ? () => setEditingId(null) : undefined}
            onDelete={!editing ? () => deleteUser(record) : undefined}
            disabledEdit={!!editingId && !editing}
            disabledDelete={!!editingId && !editing}
            size="small"
          />
        )
      }
    }
  ]

  const dataWithNew = [{ ...newUser, id: "__new__" }, ...users]

  return (
    <>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={dataWithNew}
        pagination={false}
        loading={loading}
        size="middle"
      />

      <Modal
        open={roleModalOpen}
        title="Выберите роль"
        onCancel={() => setRoleModalOpen(false)}
        footer={null}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          {roles.map(role => (
            <Button key={role.id} onClick={() => selectRole(role.id)}>
              {role.name}
            </Button>
          ))}
        </div>
      </Modal>
    </>
  )
}

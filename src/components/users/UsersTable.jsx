import React, { useEffect, useState } from 'react'
import {
  Table,
  Input,
  Button,
  Space,
  Tooltip,
  Modal,
  message
} from 'antd'
import {
  DeleteOutlined,
  PlusOutlined,
  SaveOutlined,
  UserOutlined,
  KeyOutlined
} from '@ant-design/icons'
import axios from '@/api/axiosInstance'
import confirmAction from '@/utils/confirmAction'
import ValueDisplay from '@/components/common/ValueDisplay'

export default function UsersTable() {
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    full_name: '',
    email: '',
    phone: '',
    role_id: null
  })
  const [editingId, setEditingId] = useState(null)
  const [formState, setFormState] = useState({})
  const [loading, setLoading] = useState(false)
  const [roleModalOpen, setRoleModalOpen] = useState(false)
  const [roleTarget, setRoleTarget] = useState(null)
  const [resetPasswordUserId, setResetPasswordUserId] = useState(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [usersRes, rolesRes] = await Promise.all([
        axios.get('/users'),
        axios.get('/roles')
      ])
      setUsers(usersRes.data)
      setRoles(rolesRes.data || [])
    } catch (err) {
      message.error('Ошибка загрузки данных')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    const { username, password, full_name, email, phone, role_id } = newUser
    if (!username || !password || !role_id) {
      message.error('Заполните логин, пароль и роль')
      return
    }
    try {
      await axios.post('/users', {
        username,
        password,
        full_name,
        email,
        phone,
        role_slug: roles.find(r => r.id === role_id)?.slug
      })
      setNewUser({
        username: '',
        password: '',
        full_name: '',
        email: '',
        phone: '',
        role_id: null
      })
      fetchData()
      message.success('Пользователь создан')
    } catch (err) {
      message.error('Ошибка при создании')
      console.error(err)
    }
  }

  const handleEdit = (id, key, value) => {
    setFormState(prev => ({
      ...prev,
      [id]: { ...prev[id], [key]: value }
    }))
  }

  const handleSave = async (id) => {
    try {
      const payload = {
        ...formState[id],
        role_slug: roles.find(r => r.id === formState[id]?.role_id)?.slug
      }
      delete payload.password // не передаём пароль здесь

      await axios.put(`/users/${id}`, payload)
      setEditingId(null)
      setFormState(prev => ({ ...prev, [id]: {} }))
      fetchData()
      message.success('Изменения сохранены')
    } catch (err) {
      message.error('Ошибка при сохранении')
      console.error(err)
    }
  }

  const handleDelete = async (user) => {
    const { confirmed } = await confirmAction(`Удалить пользователя "${user.full_name}"?`)
    if (!confirmed) return
    try {
      await axios.delete(`/users/${user.id}`)
      fetchData()
      message.success('Пользователь удалён')
    } catch (err) {
      message.error('Ошибка при удалении')
      console.error(err)
    }
  }

  const handlePasswordReset = async (id) => {
    const { confirmed } = await confirmAction('Сбросить пароль для этого пользователя?')
    if (!confirmed) return
    try {
      const res = await axios.post(`/users/${id}/reset-password`)
      message.success(`Новый пароль: ${res.data.newPassword}`)
    } catch (err) {
      message.error('Ошибка при сбросе пароля')
    }
  }

  const openRoleModal = (targetId) => {
    setRoleTarget(targetId)
    setRoleModalOpen(true)
  }

  const selectRole = (roleId) => {
    if (roleTarget === 'new') {
      setNewUser(prev => ({ ...prev, role_id: roleId }))
    } else {
      handleEdit(roleTarget, 'role_id', roleId)
    }
    setRoleModalOpen(false)
  }

  const columns = [
    {
      title: 'Логин',
      dataIndex: 'username',
      render: (text, record) => record.id === '__new__'
        ? <Input value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })} />
        : editingId === record.id
          ? <Input value={formState[record.id]?.username ?? text} onChange={e => handleEdit(record.id, 'username', e.target.value)} />
          : <ValueDisplay value={text} onDoubleClick={() => setEditingId(record.id)} />
    },
    {
      title: 'Имя',
      dataIndex: 'full_name',
      render: (text, record) => record.id === '__new__'
        ? <Input value={newUser.full_name} onChange={e => setNewUser({ ...newUser, full_name: e.target.value })} />
        : editingId === record.id
          ? <Input value={formState[record.id]?.full_name ?? text} onChange={e => handleEdit(record.id, 'full_name', e.target.value)} />
          : <ValueDisplay value={text} onDoubleClick={() => setEditingId(record.id)} />
    },
    {
      title: 'Email',
      dataIndex: 'email',
      render: (text, record) => record.id === '__new__'
        ? <Input value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} />
        : editingId === record.id
          ? <Input value={formState[record.id]?.email ?? text} onChange={e => handleEdit(record.id, 'email', e.target.value)} />
          : <ValueDisplay value={text} type="email" onDoubleClick={() => setEditingId(record.id)} />
    },
    {
      title: 'Телефон',
      dataIndex: 'phone',
      render: (text, record) => record.id === '__new__'
        ? <Input value={newUser.phone} onChange={e => setNewUser({ ...newUser, phone: e.target.value })} />
        : editingId === record.id
          ? <Input value={formState[record.id]?.phone ?? text} onChange={e => handleEdit(record.id, 'phone', e.target.value)} />
          : <ValueDisplay value={text} type="phone" onDoubleClick={() => setEditingId(record.id)} />
    },
    {
      title: 'Пароль',
      dataIndex: 'password',
      render: (_, record) =>
        record.id === '__new__'
          ? <Input.Password value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} />
          : <Button icon={<KeyOutlined />} onClick={() => handlePasswordReset(record.id)}>Сбросить</Button>
    },
    {
      title: 'Роль',
      dataIndex: 'role_id',
      render: (value, record) => {
        const roleName = roles.find(r => r.id === value)?.name || 'Выбрать'
        return (
          <Button icon={<UserOutlined />} onClick={() => openRoleModal(record.id === '__new__' ? 'new' : record.id)}>
            {roleName}
          </Button>
        )
      }
    },
    {
      title: '',
      key: 'actions',
      render: (_, record) => record.id === '__new__'
        ? <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>Создать</Button>
        : editingId === record.id
          ? <Button icon={<SaveOutlined />} onClick={() => handleSave(record.id)} />
          : <Tooltip title="Удалить">
              <Button icon={<DeleteOutlined />} danger onClick={() => handleDelete(record)} />
            </Tooltip>
    }
  ]

  const dataWithNew = [{ ...newUser, id: '__new__' }, ...users]

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
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
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

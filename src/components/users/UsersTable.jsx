import React, { useEffect, useState } from 'react'
import axios from '@/api/axiosInstance'
import Swal from 'sweetalert2'
import BaseTable from '@/components/common/BaseTable'
import { usersTableColumns } from '@/components/common/tableDefinitions'
import PhoneField from '@/components/common/PhoneField'
import EmailField from '@/components/common/EmailField'

export default function UsersTable() {
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [newRow, setNewRow] = useState({})

  useEffect(() => {
    loadUsers()
    loadRoles()
  }, [])

  const loadUsers = async () => {
    const res = await axios.get('/users')
    setUsers(res.data)
  }

  const loadRoles = async () => {
    const res = await axios.get('/roles')
    setRoles(res.data)
  }

  const handleAdd = async () => {
    try {
      const allowedFields = [
        'username', 'password', 'full_name', 'email',
        'phone', 'position', 'role_id'
      ]

      const cleanedRow = Object.fromEntries(
        Object.entries(newRow)
          .filter(([key]) => allowedFields.includes(key))
          .map(([key, value]) => [
            key,
            key === 'role_id' ? Number(value) : (value === undefined ? null : value)
          ])
      )

      await axios.post('/users', cleanedRow)
      setNewRow({})
      loadUsers()

      await Swal.fire({
        icon: 'success',
        title: 'Пользователь создан',
        html: `
          <p>Пароль для <b>${cleanedRow.username}</b>:</p>
          <code id="password" style="font-size: 16px; user-select: all;">${cleanedRow.password}</code>
          <button id="copyBtn" style="margin-top:10px;">Скопировать</button>
        `,
        didOpen: () => {
          const copyBtn = Swal.getPopup().querySelector('#copyBtn')
          copyBtn.addEventListener('click', () => {
            const passwordText = Swal.getPopup().querySelector('#password').textContent
            navigator.clipboard.writeText(passwordText)
            Swal.showValidationMessage('Скопировано!')
          })
        },
        confirmButtonText: 'ОК'
      })
    } catch (err) {
      console.error('Ошибка при добавлении:', err)
      Swal.fire({
        icon: 'error',
        title: 'Ошибка',
        text: 'Не удалось добавить пользователя'
      })
    }
  }

  const handleSave = async (row) => {
    try {
      await axios.put(`/users/${row.id}`, row)
      loadUsers()

      if (row.password && row.password.trim() !== '') {
        await Swal.fire({
          icon: 'success',
          title: 'Изменения сохранены',
          html: `
            <p>Новый пароль для <b>${row.username}</b>:</p>
            <code id="password" style="font-size: 16px; user-select: all;">${row.password}</code>
            <button id="copyBtn" style="margin-top:10px;">Скопировать</button>
          `,
          didOpen: () => {
            const copyBtn = Swal.getPopup().querySelector('#copyBtn')
            copyBtn.addEventListener('click', () => {
              const passwordText = Swal.getPopup().querySelector('#password').textContent
              navigator.clipboard.writeText(passwordText)
              Swal.showValidationMessage('Скопировано!')
            })
          },
          confirmButtonText: 'ОК'
        })
      } else {
        await Swal.fire({
          icon: 'success',
          title: 'Изменения сохранены',
          text: `Пользователь ${row.username} успешно обновлён.`,
          confirmButtonText: 'ОК'
        })
      }
    } catch (err) {
      console.error('Ошибка при сохранении:', err)
      Swal.fire({
        icon: 'error',
        title: 'Ошибка',
        text: 'Не удалось сохранить изменения'
      })
    }
  }

  const handleDelete = async (row) => {
    try {
      await axios.delete(`/users/${row.id}`)
      loadUsers()
    } catch (err) {
      console.error('Ошибка при удалении:', err)
      Swal.fire({
        icon: 'error',
        title: 'Ошибка',
        text: 'Не удалось удалить пользователя'
      })
    }
  }

  const finalColumns = usersTableColumns.map(col => {
    if (col.field === 'role_id') {
      return {
        ...col,
        required: true,
        editorProps: {
          ...col.editorProps,
          options: roles,
          getOptionLabel: r => r?.name ?? '',
          getOptionValue: r => r?.id ?? null
        },
        display: (value, row) =>
          row?.role?.name || roles.find(r => r.id === value)?.name || value
      }
    }

    if (col.field === 'phone') {
      return {
        ...col,
        display: val => <PhoneField value={val} readOnly />
      }
    }

    if (col.field === 'email') {
      return {
        ...col,
        display: val => <EmailField value={val} readOnly />
      }
    }

    return col
  })

  return (
    <BaseTable
      data={users}
      columns={finalColumns}
      newRow={newRow}
      setNewRow={setNewRow}
      onAdd={handleAdd}
      onSave={handleSave}
      onDelete={handleDelete}
    />
  )
}

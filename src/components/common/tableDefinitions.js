// src/components/common/tableDefinitions.js


export const usersTableColumns = [
  { field: 'username', title: 'Логин', type: 'text', required: true },
  { field: 'password', title: 'Пароль', type: 'text', inputType: 'password', required: true },
  { field: 'full_name', title: 'ФИО', type: 'text' },
  { field: 'email', title: 'Email', type: 'text', inputType: 'email', width: 240 },
  { field: 'phone', title: 'Телефон', type: 'text', width: 180 },
  { field: 'position', title: 'Должность', type: 'text' },
  {
    field: 'role_id',
    title: 'Роль',
    type: 'enum',
    editorProps: {
      options: [], // подставляется в UsersTable
      getOptionLabel: (r) => r?.name ?? '',
      getOptionValue: (r) => r?.id ?? null
    },
    display: (value, row) => {
      return row?.role?.name || value // показывать роль, если она есть
    }
  }
]


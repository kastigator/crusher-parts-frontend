// src/components/common/tableDefinitions.js

export const usersTableColumns = [
  { field: 'username', title: 'Логин', type: 'text', required: true },
  { field: 'password', title: 'Пароль', type: 'text', inputType: 'password', required: true },
  { field: 'full_name', title: 'ФИО', type: 'text' },
  { field: 'email', title: 'Email', type: 'text', inputType: 'email' },
  { field: 'phone', title: 'Телефон', type: 'text' },
  { field: 'position', title: 'Должность', type: 'text' },
  {
    field: 'role_id',
    title: 'Роль',
    type: 'enum',
    editorProps: {
      options: [], // сюда мы позже подставим список ролей
      getOptionLabel: (r) => r?.name ?? '',
      getOptionValue: (r) => r?.id ?? null
    }
  }
]

export const tabsTableColumns = [
  { field: 'name', title: 'Название', type: 'text' },
  { field: 'tab_name', title: 'tab_name', type: 'text' },
  { field: 'path', title: 'Путь', type: 'text' },
  {
    field: 'icon',
    title: 'Иконка',
    type: 'autocomplete',
    editorProps: {
      options: ['User', 'Settings', 'Table', 'Chart', 'Home']
    }
  },
  {
    field: 'type',
    title: 'Тип',
    type: 'autocomplete',
    editorProps: {
      options: ['component', 'table', 'markdown', 'iframe']
    }
  },
  { field: 'config', title: 'Конфиг', type: 'text' }
]

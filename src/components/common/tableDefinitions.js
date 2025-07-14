export const usersTable = [
  { field: 'username', title: 'Логин', editorType: 'text', required: true },
  { field: 'password', title: 'Пароль', editorType: 'text', inputType: 'password', required: true },
  { field: 'full_name', title: 'ФИО', editorType: 'text' },
  { field: 'email', title: 'Email', editorType: 'text', inputType: 'email' },
  { field: 'phone', title: 'Телефон', editorType: 'text' },
  { field: 'position', title: 'Должность', editorType: 'text' },
  {
    field: 'role_id',
    title: 'Роль',
    editorType: 'enum',
    editorProps: {
      options: [], // передаётся извне
      getOptionLabel: (r) => r.name,
      getOptionValue: (r) => r.id
    }
  }
]

export const tabsTable = [
  { field: 'name', title: 'Название', editorType: 'text' },
  { field: 'tab_name', title: 'tab_name', editorType: 'text' },
  { field: 'path', title: 'Путь', editorType: 'text' },
  {
    field: 'icon',
    title: 'Иконка',
    editorType: 'autocomplete',
    editorProps: {
      options: [], // подставляются MuiIcons
    }
  },
  {
    field: 'type',
    title: 'Тип',
    editorType: 'autocomplete',
    editorProps: {
      options: ['component', 'table', 'markdown', 'iframe']
    }
  },
  { field: 'config', title: 'Конфиг', editorType: 'text' }
]

// Матрица разрешений: роли × вкладки — нет стандартных колонок
// Но если понадобится рендерить в колонках, можно описать
export const rolePermissionsMatrix = {
  rows: { label: 'Вкладки', field: 'tab.name' },
  columns: { label: 'Роли', field: 'role.name' },
  valueField: 'can_view',
  editorType: 'checkbox'
}

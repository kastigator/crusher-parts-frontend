export const usersTableColumns = [
  {
    field: 'username',
    title: 'Логин',
    type: 'text',
    required: true,
    width: 160,
    minWidth: 120
  },
  {
    field: 'password',
    title: 'Пароль',
    type: 'text',
    required: true,
    width: 160,
    minWidth: 120
  },
  {
    field: 'full_name',
    title: 'ФИО',
    type: 'text',
    required: true,
    width: 240,
    minWidth: 180
  },
  {
    field: 'email',
    title: 'Email',
    type: 'text',
    width: 220,
    minWidth: 180
  },
  {
    field: 'phone',
    title: 'Телефон',
    type: 'text',
    width: 160,
    minWidth: 120
  },
  {
    field: 'position',
    title: 'Должность',
    type: 'text',
    width: 200,
    minWidth: 150
  },
  {
    field: 'role_id',
    title: 'Роль',
    type: 'enum',
    required: true,
    editorProps: {
      options: []
    },
    width: 180,
    minWidth: 150
  }
]

export const tnvedTableColumns = [
  {
    field: 'code',
    title: 'Код',
    type: 'text',
    required: true,
    width: 160,
    minWidth: 120
  },
  {
    field: 'description',
    title: 'Описание',
    type: 'text',
    width: 300,
    minWidth: 200
  },
  {
  field: 'duty_rate',
  title: 'Пошлина (%)',
  type: 'autocomplete',
  editorProps: {
    options: [], // будет передано позже из TnvedCodesTable
    freeSolo: true
  },
  width: 160,
  minWidth: 120
  },
  {
    field: 'notes',
    title: 'Примечания',
    type: 'text',
    width: 300,
    minWidth: 200
  }
]

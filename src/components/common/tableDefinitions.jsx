import * as MuiIcons from '@mui/icons-material'

export const usersTableColumns = [
  {
    field: 'username',
    title: 'Логин',
    type: 'text',
    required: true
  },
  {
    field: 'password',
    title: 'Пароль',
    type: 'text',
    inputType: 'password',
    required: true
  },
  {
    field: 'full_name',
    title: 'ФИО',
    type: 'text'
  },
  {
    field: 'email',
    title: 'Email',
    type: 'text',
    inputType: 'email',
    width: 240
  },
  {
    field: 'phone',
    title: 'Телефон',
    type: 'text',
    width: 180
  },
  {
    field: 'position',
    title: 'Должность',
    type: 'text'
  },
  {
    field: 'role_id',
    title: 'Роль',
    type: 'enum',
    editorProps: {
      options: [], // подставляется динамически в UsersTable
      getOptionLabel: (r) => r?.name ?? '',
      getOptionValue: (r) => r?.id ?? null
    },
    display: (value, row) => {
      return row?.role?.name || value
    }
  }
]



export const tabsTableColumns = [
  {
    field: 'name',
    title: 'Название',
    type: 'text',
    required: true
  },
  {
    field: 'tab_name',
    title: 'Кодовое имя',
    type: 'text'
  },
  {
    field: 'path',
    title: 'Путь (URL)',
    type: 'text'
  },
  {
    field: 'icon',
    title: 'Иконка',
    type: 'autocomplete',
    editorProps: {
      options: Object.keys(MuiIcons),
      renderOption: (props, option) => {
        const Icon = MuiIcons[option]
        const { key, ...rest } = props
        return (
          <li key={key} {...rest} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon fontSize="small" />
            {option}
          </li>
        )
      }
    },
    display: (value) => {
      const Icon = MuiIcons[value]
      return Icon ? <Icon fontSize="small" /> : value
    }
  }
]

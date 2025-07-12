const tableDefinitions = {
  tnved_codes: {
    title: 'Коды ТН ВЭД',
    endpoint: 'tnved-codes',
    idField: 'id',
    rowTemplate: { code: '', description: '', duty_rate: '', notes: '' },

    columns: [
      { field: 'code', label: 'Код', required: true, width: 120, tooltip: 'Код ТН ВЭД (10 знаков)' },
      { field: 'description', label: 'Описание', width: 300 },
      { field: 'duty_rate', label: 'Пошлина (%)', type: 'number', width: 120 },
      { field: 'notes', label: 'Примечания', width: 200 },
    ],

    filters: [
      { field: 'search', label: 'Поиск по коду или описанию', type: 'text' },
      { field: 'duty_rate_min', label: 'Пошлина от (%)', type: 'number' },
      { field: 'duty_rate_max', label: 'до (%)', type: 'number' },
    ],

    import: {
      templateUrl: '/static/tnved_codes_template.xlsx',
      fields: ['Код', 'Описание', 'Ставка пошлины (%)', 'Примечания'],
    },

    features: {
      enableAdd: true,
      enableDelete: true,
      enableHistory: true,
    }
  },

  users: {
    title: 'Пользователи',
    endpoint: 'users',
    idField: 'id',
    rowTemplate: {
      username: '', password: '', full_name: '', email: '',
      phone: '', position: '', role_id: ''
    },

    columns: [
      { field: 'username', label: 'Логин', required: true },
      { field: 'password', label: 'Пароль', type: 'password' },
      { field: 'full_name', label: 'ФИО' },
      { field: 'email', label: 'Email' },
      { field: 'phone', label: 'Телефон' },
      { field: 'position', label: 'Должность' },
      { field: 'role_id', label: 'Роль' }, // пока строкой, можно улучшить
    ],

    features: {
      enableAdd: true,
      enableDelete: true,
      enableHistory: false,
    }
  },

  clients: {
    title: 'Клиенты',
    endpoint: 'clients/with-addresses', // готовим этот endpoint
    idField: 'id',
    rowTemplate: { name: '', email: '', delivery_address: '', billing_address: '' },

    columns: [
      { field: 'name', label: 'Название', required: true, width: 250 },
      { field: 'email', label: 'Email', width: 200 },
      { field: 'delivery_address', label: 'Адрес доставки', width: 300 },
      { field: 'billing_address', label: 'Адрес оплаты', width: 300 },
    ],

    filters: [
      { field: 'search', label: 'Поиск по названию или email', type: 'text' },
    ],

    features: {
      enableAdd: false, // пока нельзя добавлять клиентов тут
      enableDelete: false,
      enableHistory: false,
    }
  },
}

export default tableDefinitions

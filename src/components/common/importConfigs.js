const BASE_URL = import.meta.env.VITE_API_URL

export const importConfigs = {
  tnved_codes: {
    endpoint: `${BASE_URL}/api/tnved-codes`,
    fields: [
      { label: 'Код', field: 'code', required: true, uniqueFields: ['Код'] },
      { label: 'Описание', field: 'description' },
      { label: 'Ставка пошлины (%)', field: 'duty_rate' },
      { label: 'Примечания', field: 'notes' }
    ]
  }
}

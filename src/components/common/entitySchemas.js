export const entitySchemas = {
  tnved_codes: {
    import: {
      fields: ['Код', 'Описание', 'Ставка пошлины (%)', 'Примечания'],
      requiredFields: ['Код'],
      templateUrl: 'https://storage.googleapis.com/shared-parts-bucket/templates/tnved_codes_template.xlsx',
      displayNames: {
        code: 'Код',
        description: 'Описание',
        duty_rate: 'Ставка пошлины (%)',
        notes: 'Примечания'
      }
    },

    validateImportRow: (row) => {
      if (!row['Код'] || String(row['Код']).trim() === '') {
        return 'Поле "Код" обязательно'
      }
      return null
    },

    transformBeforeUpload: (row) => ({
      code: String(row['Код']).trim(),
      description: row['Описание']?.trim() || null,
      duty_rate: row['Ставка пошлины (%)'] || null,
      notes: row['Примечания']?.trim() || null
    }),

    endpoint: '/tnved-codes/import' // 👈 axiosInstance добавит baseURL автоматически
  }

  // Добавляй другие схемы по аналогии
}

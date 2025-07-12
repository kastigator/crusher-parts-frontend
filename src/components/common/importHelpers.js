import axios from '../../api/axiosInstance'
import { importConfigs } from './importConfigs'

export async function validateRows(rows, type) {
  const config = importConfigs[type]
  const errors = []
  const validRows = []

  const uniqueField = config?.uniqueFields?.[0] // например, "Код"

  let existingValues = []
  if (uniqueField) {
    try {
      const res = await axios.get(config.endpoint.replace('/import', ''))
      existingValues = res.data.map(item => String(item.code).trim().toLowerCase())
    } catch (e) {
      console.warn('Не удалось получить существующие записи для проверки уникальности')
    }
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowErrors = []

    // Проверка обязательных полей
    if (config.requiredFields) {
      for (const field of config.requiredFields) {
        if (!row[field] || row[field].toString().trim() === '') {
          rowErrors.push(`Строка ${i + 2}: поле "${field}" обязательно`)
        }
      }
    }

    // Проверка уникальности
    if (uniqueField && row[uniqueField]) {
      const value = String(row[uniqueField]).trim().toLowerCase()
      if (existingValues.includes(value)) {
        rowErrors.push(`Строка ${i + 2}: значение "${row[uniqueField]}" уже существует`)
      }
    }

    if (rowErrors.length > 0) {
      errors.push(...rowErrors)
    } else {
      validRows.push(row)
    }
  }

  return { rows: validRows, errors }
}

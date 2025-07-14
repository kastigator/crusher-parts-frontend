export function validateRowAgainstSchema(row, columns) {
  for (const col of columns) {
    const value = row[col.field]

    // Проверка на обязательность
    if (col.required && (value === undefined || value === null || value === '')) {
      return `Поле "${col.title}" обязательно`
    }

    if (!value) continue // не проверяем пустое, если не required

    // Валидация по типу
    switch (col.editorType) {
      case 'number':
      case 'percent':
      case 'currency':
        if (isNaN(Number(value))) {
          return `Поле "${col.title}" должно быть числом`
        }
        break

      case 'boolean':
        if (!['0', '1', 0, 1, true, false, 'true', 'false'].includes(value)) {
          return `Поле "${col.title}" должно быть 0 или 1`
        }
        break

      case 'enum':
      case 'select':
      case 'autocomplete':
        const options = col.editorProps?.options || []
        if (options.length && !options.includes(value)) {
          return `Поле "${col.title}" содержит недопустимое значение: ${value}`
        }
        break

      case 'date':
      case 'datetime':
        if (isNaN(Date.parse(value))) {
          return `Поле "${col.title}" должно быть датой`
        }
        break

      default:
        // text, link, array и т.п. — пока без проверки
        break
    }
  }

  return null // если всё прошло
}

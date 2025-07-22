export default function sanitizePayload(row, columns) {
  const clean = {}

  columns.forEach(col => {
    const field = col.field
    if (field && field !== 'actions') {
      clean[field] = row[field] ?? null
    }
  })

  // Явно преобразуем id
  if (row.id) clean.id = +row.id

  return clean
}

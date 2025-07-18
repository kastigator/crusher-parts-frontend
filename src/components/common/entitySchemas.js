import { validateRowAgainstSchema } from './importHelpers'
import { tnvedTableColumns } from './tableDefinitions'

export const entitySchemas = {
  tnved_codes: {
    import: {
      fields: tnvedTableColumns.map((col) => col.field),
      requiredFields: tnvedTableColumns.filter((col) => col.required).map((col) => col.field),
      templateUrl: '/static/tnved_codes_template.xlsx'
    },
    validateImportRow: (row) => validateRowAgainstSchema(row, tnvedTableColumns),
    endpoint: '/tnved-codes/import'
  }
}

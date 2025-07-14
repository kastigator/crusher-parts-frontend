import { validateRowAgainstSchema } from './importHelpers'
import { tnvedCodesTable } from './tableDefinitions'

export const entitySchemas = {
  tnved_codes: {
    import: {
      fields: tnvedCodesTable.map((col) => col.field),
      requiredFields: tnvedCodesTable.filter((col) => col.required).map((col) => col.field),
      templateUrl: '/static/tnved_codes_template.xlsx'
    },
    validateImportRow: (row) => validateRowAgainstSchema(row, tnvedCodesTable),
    endpoint: '/tnved-codes/import'
  }
}

// src/components/common/fieldSchemas.js

export const fieldSchemas = {
  tnved_code: {
    columns: [
      {
        field: "code",
        title: "Код",
        required: true,
        editable: true,
        width: 140,
      },
      {
        field: "description",
        title: "Описание",
        editable: true,
        width: 360,
      },
      {
        field: "duty_rate",
        title: "Ставка пошлины (%)",
        type: "number",
        editable: true,
        width: 160,
      },
      {
        field: "notes",
        title: "Примечания",
        editable: true,
        width: 280,
      },
      {
        field: "actions",
        type: "actions",
        width: 100
      }
    ],

    import: {
      requiredFields: ["code"],
      fields: ["code", "description", "duty_rate", "notes"],
      endpoint: "/import/tnved_code",
      templateUrl: "https://storage.googleapis.com/shared-parts-bucket/templates/tnved_codes_template.xlsx",
      transform: `(row) => ({
        code: String(row.code).trim(),
        description: row.description?.trim(),
        duty_rate: row.duty_rate ? parseFloat(row.duty_rate) : null,
        notes: row.notes?.trim()
      })`
    }
  }
}

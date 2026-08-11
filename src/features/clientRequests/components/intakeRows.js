export const createEmptyRow = (overrides = {}) => ({
  row_key: globalThis.crypto?.randomUUID?.() || `row-${Date.now()}-${Math.random()}`,
  client_description: "",
  client_catalog_number: "",
  client_manufacturer_text: "",
  client_equipment_model_text: "",
  requested_qty: 1,
  uom: "шт",
  required_date: null,
  substitution_policy: "unspecified",
  client_comment: "",
  ...overrides,
})

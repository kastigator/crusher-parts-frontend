const clean = (value) => {
  const text = String(value || "").trim()
  return text || null
}

export const getClientFacingPartNumber = (row, fallback = "—") =>
  clean(row?.client_display_part_number) ||
  clean(row?.client_part_number) ||
  clean(row?.catalog_position_manufacturer_part_number) ||
  clean(row?.manufacturer_part_number) ||
  clean(row?.catalog_position_code) ||
  clean(row?.position_code) ||
  clean(row?.original_cat_number) ||
  fallback

export const getClientFacingDescription = (row, fallback = "") =>
  clean(row?.client_display_description) ||
  clean(row?.client_description) ||
  clean(row?.catalog_position_name_ru) ||
  clean(row?.catalog_position_name_en) ||
  clean(row?.catalog_position_name) ||
  clean(row?.note) ||
  fallback

export const getSupplierFacingPartNumber = (row, fallback = "—") =>
  clean(row?.supplier_display_part_number) ||
  clean(row?.supplier_part_number) ||
  clean(row?.supplier_visible_part_number) ||
  clean(row?.internal_part_number) ||
  clean(row?.catalog_position_manufacturer_part_number) ||
  clean(row?.manufacturer_part_number) ||
  clean(row?.catalog_position_code) ||
  clean(row?.position_code) ||
  clean(row?.original_cat_number) ||
  fallback

export const getSupplierFacingDescription = (row, fallback = "") =>
  clean(row?.supplier_display_description) ||
  clean(row?.supplier_visible_description) ||
  clean(row?.catalog_position_name_ru) ||
  clean(row?.catalog_position_name_en) ||
  clean(row?.catalog_position_name) ||
  clean(row?.client_description) ||
  clean(row?.note) ||
  fallback

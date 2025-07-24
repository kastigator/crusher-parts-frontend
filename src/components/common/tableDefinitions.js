// src/components/common/tableDefinitions.js
// Column definitions for client-related tables and roles.

export const rolesTableColumns = [
  { field: "name", title: "Название роли", editable: true }
]

export const clientsTableColumns = [
  { field: "company_name", title: "Компания", editable: true },
  { field: "contact_person", title: "Контактное лицо", editable: true },
  { field: "email", title: "Email", editable: true },
  { field: "phone", title: "Телефон", editable: true },
  { field: "inn", title: "ИНН", editable: true },
  { field: "kpp", title: "КПП", editable: true }
]

export const clientBillingAddressesColumns = [
  { field: "address", title: "Адрес", editable: true },
  { field: "city", title: "Город", editable: true },
  { field: "zip_code", title: "Индекс", editable: true },
  { field: "country", title: "Страна", editable: true }
]

export const clientShippingAddressesColumns = [
  { field: "address", title: "Адрес", editable: true },
  { field: "city", title: "Город", editable: true },
  { field: "zip_code", title: "Индекс", editable: true },
  { field: "country", title: "Страна", editable: true }
]

export const clientBankDetailsColumns = [
  { field: "bic", title: "БИК", editable: true },
  { field: "bank_name", title: "Банк", editable: true },
  { field: "account_number", title: "Р/С", editable: true }
]

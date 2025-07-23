// src/components/common/tableDefinitions.js

import { fieldSchemas } from "./fieldSchemas"

// 🔹 Пользователи (с динамической загрузкой ролей)
export const usersTableColumns = (roleOptions = []) => [
  { field: "username", ...fieldSchemas.username },
  { field: "email", ...fieldSchemas.email },
  { field: "phone", ...fieldSchemas.phone },
  { field: "position", ...fieldSchemas.position },
  {
    field: "role_id",
    ...fieldSchemas.role_id,
    editorProps: {
      ...fieldSchemas.role_id.editorProps,
      fetchOptions: async () => roleOptions,
      options: roleOptions
    }
  },
  { field: "actions", type: "actions" }
]

// 🔹 Роли
export const rolesTableColumns = [
  { field: "name", ...fieldSchemas.name },
  { field: "actions", type: "actions" }
]

// 🔹 Коды ТН ВЭД
export const tnvedCodesColumns = [
  { field: "code", ...fieldSchemas.code },
  { field: "description", ...fieldSchemas.description },
  { field: "duty_rate", ...fieldSchemas.duty_rate },
  { field: "notes", ...fieldSchemas.notes },
  { field: "actions", type: "actions" }
]

// 🔹 Клиенты
export const clientsTableColumns = [
  { field: "company_name", ...fieldSchemas.company_name },
  { field: "contact_person", ...fieldSchemas.contact_person },
  { field: "email", ...fieldSchemas.email },
  { field: "phone", ...fieldSchemas.phone },
  { field: "inn", ...fieldSchemas.inn },
  { field: "kpp", ...fieldSchemas.kpp },
  { field: "actions", type: "actions" }
]

// 🔹 Юридические адреса
export const clientBillingAddressesColumns = [
  { field: "address", ...fieldSchemas.address },
  { field: "city", ...fieldSchemas.city },
  { field: "zip_code", ...fieldSchemas.zip_code },
  { field: "country", ...fieldSchemas.country },
  { field: "actions", type: "actions" }
]

// 🔹 Адреса доставки
export const clientShippingAddressesColumns = [
  { field: "address", ...fieldSchemas.address },
  { field: "city", ...fieldSchemas.city },
  { field: "zip_code", ...fieldSchemas.zip_code },
  { field: "country", ...fieldSchemas.country },
  { field: "actions", type: "actions" }
]

// 🔹 Банковские реквизиты
export const clientBankDetailsColumns = [
  { field: "bic", ...fieldSchemas.bic },
  { field: "bank_name", ...fieldSchemas.bank_name },
  { field: "account_number", ...fieldSchemas.account_number },
  { field: "actions", type: "actions" }
]

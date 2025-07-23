// src/components/common/fieldSchemas.js

export const fieldSchemas = {
  // Users
  username: { title: "Имя пользователя", type: "text", required: true },
  email: { title: "Email", type: "text" },
  phone: { title: "Телефон", type: "text" },
  position: { title: "Должность", type: "text" },
  role_id: {
    title: "Роль",
    type: "autocomplete",
    required: true,
    editorProps: {
      lazyOptions: true,
      fetchOptions: async () => [],
      getOptionLabel: (option) => option?.label || ""
    },
    display: (value, row) => row?.role_name || value
  },

  // Roles
  name: { title: "Название роли", type: "text", required: true },

  // TNVED
  code: { title: "Код ТН ВЭД", type: "text", required: true },
  description: { title: "Описание", type: "text" },
  duty_rate: { title: "Ставка пошлины", type: "text" },
  notes: { title: "Примечание", type: "text" },

  // Clients
  company_name: { title: "Компания", type: "text", required: true },
  contact_person: { title: "Контактное лицо", type: "text" },
  inn: { title: "ИНН", type: "text" },
  kpp: { title: "КПП", type: "text" },

  // Общие поля
  address: { title: "Адрес", type: "text", required: true },
  city: { title: "Город", type: "text" },
  zip_code: { title: "Индекс", type: "text" },
  country: { title: "Страна", type: "text" },

  bic: { title: "БИК", type: "text", required: true },
  bank_name: { title: "Банк", type: "text" },
  account_number: { title: "Р/С", type: "text", required: true }
}

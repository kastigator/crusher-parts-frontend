// src/utils/logSchemas.js

export const logSchemas = {
  tnved_code: {
    fields: {
      code: "Код",
      description: "Описание",
      duty_rate: "Пошлина (%)",
      notes: "Примечания"
    },
    excludeFields: ["created_at", "updated_at", "id"]
  },

  clients: {
    fields: {
      company_name: "Компания",
      contact_person: "Контактное лицо",
      phone: "Телефон",
      email: "Email"
    },
    excludeFields: ["created_at", "updated_at", "id"]
  },

  client_billing_addresses: {
    fields: {
      formatted_address: "Адрес",
      label: "Метка",
      country: "Страна",
      region: "Регион",
      city: "Город",
      street: "Улица",
      house: "Дом",
      building: "Корпус",
      entrance: "Подъезд",
      postal_code: "Индекс",
      comment: "Комментарий"
    },
    excludeFields: ["id", "client_id", "created_at", "updated_at"]
  },

  client_shipping_addresses: {
    fields: {
      formatted_address: "Адрес",
      label: "Метка",
      country: "Страна",
      region: "Регион",
      city: "Город",
      street: "Улица",
      house: "Дом",
      building: "Корпус",
      entrance: "Подъезд",
      postal_code: "Индекс",
      comment: "Комментарий"
    },
    excludeFields: ["id", "client_id", "created_at", "updated_at"]
  },

  client_bank_details: {
    fields: {
      bank_name: "Банк",
      bic: "БИК",
      correspondent_account: "Кор. счёт",
      account_number: "Расч. счёт",
      currency: "Валюта"
    },
    excludeFields: ["id", "client_id", "created_at", "updated_at"]
  }
}

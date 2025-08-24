// src/utils/logSchemas.js

export const logSchemas = {
  tnved_codes: {
    fields: {
      code: "Код",
      description: "Описание",
      duty_rate: "Пошлина (%)",
      notes: "Примечания",
    },
    excludeFields: ["created_at", "updated_at", "id"],
  },

  // === Оригинальные детали ===
  original_parts: {
    fields: {
      cat_number: "Part number",
      description_ru: "Описание (RU)",
      description_en: "Description (EN)",
      tech_description: "Тех. описание",
      weight_kg: "Вес, кг",
      tnved_code_id: "ТН ВЭД",
      equipment_model_id: "Модель оборудования",
    },
    excludeFields: [
      "id",
      "created_at",
      "updated_at",
      "version",
      // оставляем tnved_code_id видимым — по нему и строим подсказку
    ],
    // Подсказки по значениям (универсальный механизм для тултипов в истории)
    valueHints: {
      // Для ТН ВЭД: если значение выглядит как сам код (>=4 цифр),
      // подтягиваем его описание из справочника через /tnved-codes/search?q=<code>
      tnved_code_id: {
        endpoint: "/tnved-codes/search",
        param: "q",
        // под «код» понимаем строку из ≥4 цифр (старые короткие числовые id не трогаем)
        match: (v) => /^\d{4,}$/.test(String(v || "").trim()),
        // из ответа берём элемент с точным совпадением кода и собираем подпись
        pick: (data, value) => {
          const arr = Array.isArray(data) ? data : []
          const hit = arr.find((x) => String(x.code) === String(value))
          return hit ? `${hit.code}${hit.description ? " — " + hit.description : ""}` : null
        },
      },
    },
  },

  clients: {
    fields: {
      company_name: "Компания",
      contact_person: "Контактное лицо",
      phone: "Телефон",
      email: "Email",
    },
    excludeFields: ["created_at", "updated_at", "id"],
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
      comment: "Комментарий",
    },
    excludeFields: ["id", "client_id", "created_at", "updated_at"],
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
      comment: "Комментарий",
    },
    excludeFields: ["id", "client_id", "created_at", "updated_at"],
  },

  client_bank_details: {
    fields: {
      bank_name: "Банк",
      bic: "БИК",
      correspondent_account: "Кор. счёт",
      account_number: "Расч. счёт",
      currency: "Валюта",
    },
    excludeFields: ["id", "client_id", "created_at", "updated_at"],
  },

  // === Поставщики (агрегированная история) ===
  suppliers: {
    fields: {
      // мастер (part_suppliers)
      name: "Название / Имя",
      vat_number: "VAT/ИНН",
      country: "Страна (ISO2)",
      website: "Сайт",
      contact_person: "Контактное лицо",
      email: "Email",
      phone: "Телефон",
      payment_terms: "Условия оплаты",
      preferred_currency: "Валюта (ISO3)",
      incoterms: "Инкотермс",
      default_lead_time_days: "Срок поставки, дни",
      notes: "Примечания",

      // адреса (supplier_addresses)
      label: "Метка",
      type: "Тип адреса",
      formatted_address: "Адрес",
      region: "Регион",
      city: "Город",
      street: "Улица",
      house: "Дом",
      building: "Строение",
      entrance: "Подъезд",
      postal_code: "Индекс",
      is_precise_location: "Точная локация",
      place_id: "Place ID",
      lat: "Широта",
      lng: "Долгота",
      is_primary: "Основной",
      comment: "Комментарий",

      // контакты (supplier_contacts)
      role: "Роль",
      is_primary_contact: "Основной контакт",

      // банки (supplier_bank_details)
      bank_name: "Банк",
      account_number: "Расч. счёт",
      iban: "IBAN",
      bic: "BIC",
      currency: "Валюта (ISO3)",
      correspondent_account: "Корр. счёт",
      bank_address: "Адрес банка",
      additional_info: "Доп. информация",
      is_primary_for_currency: "Основной для валюты",
    },
    excludeFields: ["id", "supplier_id", "version", "created_at", "updated_at"],
  },
}

// ---- Алиасы для совместимости старых логов ----
logSchemas.tnved_code = logSchemas.tnved_codes   // старые записи с singular
logSchemas.part_suppliers = logSchemas.suppliers // старые записи с part_suppliers

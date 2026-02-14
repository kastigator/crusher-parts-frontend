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
      uom: "Ед. изм.",
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
        match: (v) => /^\d{4,}$/.test(String(v || "").trim()),
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
      country: "Страна",
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
      is_primary: "Основной", // адрес

      comment: "Комментарий",

      // контакты (supplier_contacts)
      role: "Роль",
      is_primary_contact: "Основной контакт", // на случай старых логов

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

  // === Детали поставщиков ===
  supplier_parts: {
    fields: {
      supplier_part_number: "Номер у поставщика",
      description_ru: "Описание (RU)",
      description_en: "Description (EN)",
      description: "Описание",
      currency: "Валюта (ISO3)",
      lead_time_days: "Срок поставки, дни",
      min_order_qty: "Мин. партия",
      packaging: "Упаковка",
      active: "Активна",
      original_part_cat_number: "Ориг. номер (текст)",

      // события/служебные поля для истории (из роутов цен/связей)
      latest_price: "Последняя цена",
      original_link_added: "Добавлена привязка к оригиналу",
      original_link_removed: "Удалена привязка к оригиналу",
      price_entry: "Запись цены",
      price_entry_updated: "Запись цены (изменена)",
      price_entry_removed: "Запись цены (удалена)",
      // supplier_id не показываем — он в exclude
    },
    excludeFields: ["id", "supplier_id", "created_at", "updated_at"],
  },

  // === История цен деталей поставщиков ===
  supplier_part_prices: {
    fields: {
      supplier_part_id: "Деталь поставщика",
      price: "Цена",
      currency: "Валюта (ISO3)",
      date: "Дата",
      comment: "Комментарий",
    },
    excludeFields: ["id"],
  },

  // === Заказы клиентов ===
  client_orders: {
    fields: {
      order_number: "Номер заказа",
      status: "Статус",
      contact_name: "Контакт",
      contact_phone: "Телефон",
      contact_email: "Email",
      billing_address_id: "Юридический адрес",
      shipping_address_id: "Адрес доставки",
      comment_internal: "Комментарий (внутр.)",
      comment_client: "Комментарий (клиент)",
      requested_delivery_date: "Желаемая дата",
      responsible_user_id: "Ответственный",
      currency: "Валюта",
      incoterms: "Инкотермс",
      payment_terms: "Условия оплаты",
      client_po_number: "Номер заказа клиента",
    },
    excludeFields: [
      "id",
      "client_id",
      "created_at",
      "updated_at",
      "version",
      "assigned_to_user_id",
      "approved_at",
      "approved_by_user_id",
      "proposal_version",
      "proposal_file_url",
      "proposal_generated_at",
      "proposal_generated_by",
    ],
  },

  // === Позиции заказа клиента ===
  client_order_items: {
    fields: {
      original_part_id: "Оригинальная деталь",
      equipment_model_id: "Модель оборудования",
      client_part_number: "Номер клиента",
      client_description: "Описание клиента",
      client_line_text: "Строка клиента",
      requested_qty: "Количество",
      uom: "Ед. изм.",
      required_date: "Требуемая дата",
      priority: "Приоритет",
      status: "Статус строки",
      internal_comment: "Комментарий (внутр.)",
      client_comment: "Комментарий (клиент)",
    },
    excludeFields: [
      "id",
      "order_id",
      "line_number",
      "decision_offer_id",
      "created_at",
      "updated_at",
      "version",
    ],
  },

  // === Связи «деталь поставщика ↔ оригинальная деталь» ===
  supplier_part_originals: {
    fields: {
      supplier_part_id: "Деталь поставщика",
      original_part_id: "Оригинальная деталь",
    },
    excludeFields: [],
  },
}

// ---- Алиасы для совместимости старых логов ----
logSchemas.tnved_code     = logSchemas.tnved_codes;      // старые записи с singular
logSchemas.part_suppliers = logSchemas.suppliers;        // старые записи с part_suppliers
logSchemas.supplier_part  = logSchemas.supplier_parts;   // единичная форма

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
  }

  // Добавляй сюда другие сущности (clients, suppliers и т.п.) по мере необходимости.
}

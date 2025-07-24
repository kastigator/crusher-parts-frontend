// src/components/common/fieldSchemas.js

export const fieldSchemas = {
  tnved_code: {
    columns: [
      {
        field: "code",
        title: "Код",
        required: true,
        editable: true,
        width: 140
      },
      {
        field: "description",
        title: "Описание",
        editable: true,
        width: 360
      },
      {
        field: "duty_rate",
        title: "Ставка пошлины (%)",
        type: "number",
        editable: true,
        width: 160
      },
      {
        field: "notes",
        title: "Примечания",
        editable: true,
        width: 280
      }
          ]
  }

  // В будущем сюда можно добавлять другие таблицы (пример):
  // client: {
  //   columns: [...]
  // }
}

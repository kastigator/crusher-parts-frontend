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

  // Roles (для RolePermissionsMatrix)
  name: { title: "Название роли", type: "text", required: true }
}

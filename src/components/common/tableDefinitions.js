// src/components/common/tableDefinitions.js

import { fieldSchemas } from "./fieldSchemas.js"

// 🔹 Пользователи (c динамической загрузкой ролей)
export const usersTableColumns = (roleOptions = []) => [
  { field: "username", ...fieldSchemas.username, width: 160 },
  { field: "password", ...fieldSchemas.password, width: 160 },
  { field: "email", ...fieldSchemas.email, width: 220 },
  { field: "phone", ...fieldSchemas.phone, width: 140 },
  { field: "position", ...fieldSchemas.position, width: 180 },
  {
    field: "role_id",
    ...fieldSchemas.role_id,
    width: 160,
    editorProps: {
      ...fieldSchemas.role_id.editorProps,
      fetchOptions: async () => roleOptions,
      options: roleOptions
    }
  },
  { field: "actions", type: "actions", width: 100 }
]

// 🔹 Роли (для RolePermissionsMatrix)
export const rolesTableColumns = [
  { field: "name", ...fieldSchemas.name, width: 240 },
  { field: "actions", type: "actions", width: 100 }
]

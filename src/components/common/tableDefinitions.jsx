import fetchBankByBic from "@/utils/fetchBankByBic"
import { TextField, MenuItem } from "@mui/material"
import fieldRenderers from "./fieldRenderers"
import ActionIcons from "./ActionIcons"

// ------------------ USERS ------------------

export const usersTableColumns = [
  { field: 'username', title: 'Логин', type: 'text', required: true, width: 160, minWidth: 120 },
  { field: 'password', title: 'Пароль', type: 'text', required: true, width: 160, minWidth: 120 },
  { field: 'full_name', title: 'ФИО', type: 'text', required: true, width: 240, minWidth: 180 },
  {
    field: 'email',
    title: 'Email',
    type: 'custom',
    display: fieldRenderers.email.display,
    editor: fieldRenderers.email.editor,
    width: 220, minWidth: 180
  },
  {
    field: 'phone',
    title: 'Телефон',
    type: 'custom',
    display: fieldRenderers.phone.display,
    editor: fieldRenderers.phone.editor,
    width: 160, minWidth: 120
  },
  { field: 'position', title: 'Должность', type: 'text', width: 200, minWidth: 150 },
  {
    field: 'role_id',
    title: 'Роль',
    type: 'custom',
    required: true,
    display: (value, row, column) => {
      const options = column?.editorProps?.options || []
      const found = options.find(opt => opt.value === value)
      return found?.label || value
    },
    editor: (value, onChange, error, required, column) => {
      const options = column?.editorProps?.options || []
      return (
        <TextField
          select
          fullWidth
          size="small"
          value={value ?? ''}
          onChange={(e) => onChange(column.field, e.target.value)}
          error={error}
          required={required}
        >
          {options.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </TextField>
      )
    },
    editorProps: { options: [] },
    width: 180,
    minWidth: 150
  },
  {
    field: 'actions',
    title: '',
    width: 140,
    minWidth: 140,
    renderCell: ActionIcons
  }
]

// ------------------ TNVED ------------------

export const tnvedTableColumns = [
  { field: 'code', title: 'Код', type: 'custom', required: true, width: 160, minWidth: 120, display: fieldRenderers.tnved.display },
  { field: 'description', title: 'Описание', type: 'text', width: 300, minWidth: 200 },
  {
    field: 'duty_rate',
    title: 'Пошлина (%)',
    type: 'autocomplete',
    editorProps: { options: [], freeSolo: true },
    width: 160,
    minWidth: 120
  },
  { field: 'notes', title: 'Примечания', type: 'text', width: 300, minWidth: 200 }
]

// ------------------ CLIENTS ------------------

export const clientsTableColumns = [
  { field: "company_name", title: "Компания", type: "text", required: true, minWidth: 200 },
  { field: "registration_number", title: "ОГРН / Рег. номер", type: "text", minWidth: 180 },
  { field: "tax_id", title: "ИНН", type: "text", minWidth: 160 },
  { field: "contact_person", title: "Контактное лицо", type: "text", minWidth: 180 },
  {
    field: "phone",
    title: "Телефон",
    type: "custom",
    display: fieldRenderers.phone.display,
    editor: fieldRenderers.phone.editor,
    width: 160,
    minWidth: 160
  },
  {
    field: "email",
    title: "Email",
    type: "custom",
    display: fieldRenderers.email.display,
    editor: fieldRenderers.email.editor,
    width: 220,
    minWidth: 220
  },
  { field: "website", title: "Сайт", type: "text", minWidth: 180 },
  { field: "notes", title: "Заметки", type: "text", minWidth: 220 },
  {
    field: 'actions',
    title: '',
    width: 140,
    minWidth: 140,
    renderCell: ActionIcons
  }
]

// ------------------ BILLING ADDRESSES ------------------

export const clientBillingAddressesColumns = [
  { field: "label", title: "Метка", type: "text", minWidth: 160 },
  {
    field: "formatted_address",
    title: "Юридический адрес",
    type: "custom",
    required: true,
    display: fieldRenderers.address.display,
    editor: fieldRenderers.address.editor,
    width: 400,
    minWidth: 400
  },
  { field: "postal_code", title: "Индекс", type: "text", minWidth: 100 },
  { field: "comment", title: "Комментарий", type: "text", minWidth: 200 },
  {
    field: 'actions',
    title: '',
    width: 140,
    minWidth: 140,
    renderCell: ActionIcons
  }
]

// ------------------ SHIPPING ADDRESSES ------------------

export const clientShippingAddressesColumns = [
  { field: "label", title: "Метка", type: "text", minWidth: 160 },
  {
    field: "formatted_address",
    title: "Адрес доставки",
    type: "custom",
    required: true,
    display: fieldRenderers.address.display,
    editor: fieldRenderers.address.editor,
    width: 400,
    minWidth: 400
  },
  { field: "postal_code", title: "Индекс", type: "text", minWidth: 100 },
  { field: "comment", title: "Комментарий", type: "text", minWidth: 200 },
  {
    field: 'actions',
    title: '',
    width: 140,
    minWidth: 140,
    renderCell: ActionIcons
  }
]

// ------------------ BANK DETAILS ------------------

export const clientBankDetailsColumns = [
  { field: "bank_name", title: "Банк", type: "text", required: true, minWidth: 200 },
  { field: "account_number", title: "Расчётный счёт", type: "text", required: true, minWidth: 200 },
  { field: "iban", title: "IBAN", type: "text", minWidth: 200 },
  {
    field: "bic",
    title: "БИК",
    type: "text",
    required: true,
    width: 120,
    minWidth: 120,
    editor: (value = "", onChange) => (
      <TextField
        value={value}
        onChange={async (e) => {
          const bic = e.target.value
          onChange("bic", bic)
          if (bic.length >= 6) {
            const data = await fetchBankByBic(bic)
            if (data) {
              onChange("bank_name", data.name || "")
              onChange("correspondent_account", data.corr_account || "")
              onChange("bank_address", data.address || "")
            }
          }
        }}
        fullWidth
        size="small"
        placeholder="Введите БИК"
      />
    )
  },
  {
    field: "currency",
    title: "Валюта",
    type: "custom",
    display: fieldRenderers.currency.display,
    editor: fieldRenderers.currency.editor,
    minWidth: 100
  },
  { field: "correspondent_account", title: "Корр. счёт", type: "text", minWidth: 200 },
  { field: "bank_address", title: "Адрес банка", type: "text", minWidth: 240 },
  { field: "additional_info", title: "Дополнительно", type: "text", minWidth: 240 },
  {
    field: 'actions',
    title: '',
    width: 140,
    minWidth: 140,
    renderCell: ActionIcons
  }
]

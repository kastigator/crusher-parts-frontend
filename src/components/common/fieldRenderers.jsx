// src/components/common/fieldRenderers.jsx

import React from "react"
import FullAddressField from "@/components/fields/FullAddressField"
import PlaceAddressInput from "@/components/inputs/PlaceAddressInput"
import { TextField, MenuItem } from "@mui/material"

export const fieldRenderers = {
  email: {
    display: (value) => value || "—",
    editor: (value = "", onChange, error, required, column) => (
      <TextField
        value={value}
        onChange={(e) => onChange(column.field, e.target.value)}
        error={error}
        required={required}
        size="small"
        fullWidth
        type="email"
        placeholder="Email"
      />
    )
  },

  phone: {
    display: (value) => value || "—",
    editor: (value = "", onChange, error, required, column) => (
      <TextField
        value={value}
        onChange={(e) => onChange(column.field, e.target.value)}
        error={error}
        required={required}
        size="small"
        fullWidth
        placeholder="Телефон"
      />
    )
  },

  currency: {
    display: (value) => value || "—",
    editor: (value = "", onChange, error, required, column) => (
      <TextField
        select
        value={value}
        onChange={(e) => onChange(column.field, e.target.value)}
        error={error}
        required={required}
        size="small"
        fullWidth
        placeholder="Валюта"
      >
        <MenuItem value="RUB">₽ RUB</MenuItem>
        <MenuItem value="USD">$ USD</MenuItem>
        <MenuItem value="EUR">€ EUR</MenuItem>
        <MenuItem value="CNY">¥ CNY</MenuItem>
      </TextField>
    )
  },

  address: {
    display: (value) => <FullAddressField address={value} />,
    editor: (value = "", onChange, error, required, column) => (
      <PlaceAddressInput
        value={value}
        onChange={onChange}
        error={error}
        required={required}
        field={column?.field}
      />
    )
  },

  tnved: {
    display: (value) => value || "—"
  }
}

export default fieldRenderers

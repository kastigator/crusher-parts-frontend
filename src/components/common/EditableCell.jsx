import React from 'react'
import {
  TextField,
  Checkbox,
  Select,
  MenuItem,
  Autocomplete,
  FormControlLabel
} from '@mui/material'
import { fieldRenderers } from './fieldRenderers'

// словарь компонентов по имени
const EDITOR_COMPONENTS = {
  TextField,
  Checkbox,
  Autocomplete,
  Select,
  DatePicker: () => <div>🗓 DatePicker не реализован</div>,
  DateTimePicker: () => <div>🕓 DateTimePicker не реализован</div>
}

export default function EditableCell({
  value,
  isEditing = false,
  onChange,
  editorType = 'text',     // можно не передавать — будет text
  editorProps = {}
}) {
  const config = fieldRenderers[editorType] || fieldRenderers.text
  const Editor = EDITOR_COMPONENTS[config.editor] || TextField
  const mergedProps = { ...config.editorProps, ...editorProps }

  if (!isEditing) {
    // Простое отображение без ValueDisplay (или можно вставить)
    if (editorType === 'boolean' || editorType === 'checkbox') {
      return value ? '✔️' : '—'
    }
    return value ?? '—'
  }

  // Обработка специальных компонентов
  if (config.editor === 'Checkbox') {
    return (
      <FormControlLabel
        control={
          <Checkbox
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
            {...mergedProps}
          />
        }
        label=""
      />
    )
  }

  if (config.editor === 'Select') {
    return (
      <Select
        size="small"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        {...mergedProps}
      >
        {(mergedProps.options || []).map((opt) => (
          <MenuItem key={opt} value={opt}>{opt}</MenuItem>
        ))}
      </Select>
    )
  }

  if (config.editor === 'Autocomplete') {
    return (
      <Autocomplete
        options={mergedProps.options || []}
        value={value || null}
        onChange={(_, newVal) => onChange(newVal)}
        renderInput={(params) => (
          <TextField {...params} size="small" />
        )}
        isOptionEqualToValue={(a, b) => a === b}
        {...mergedProps}
      />
    )
  }

  // По умолчанию — текстовое поле
  return (
    <Editor
      size="small"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      {...mergedProps}
    />
  )
}

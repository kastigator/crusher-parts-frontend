// src/components/common/EditableCell.jsx

import React from 'react'
import {
  TextField,
  Checkbox,
  MenuItem,
  Autocomplete
} from '@mui/material'

export default function EditableCell({
  column,
  value,
  onChange,
  isEditing
}) {
  const { type = 'text', inputType = 'text', editorProps = {} } = column

  if (!isEditing) {
    // Отображение значения в режиме просмотра
    if (type === 'enum') {
      const option = editorProps.options?.find(opt =>
        editorProps.getOptionValue?.(opt) === value
      )
      return <>{editorProps.getOptionLabel?.(option) || value}</>
    }

    if (type === 'checkbox') {
      return <Checkbox checked={!!value} disabled />
    }

    return <>{value}</>
  }

  // Режим редактирования
  switch (type) {
    case 'text':
      return (
        <TextField
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          type={inputType || 'text'}
          fullWidth
          size="small"
        />
      )

    case 'enum':
      return (
        <Autocomplete
          value={editorProps.options?.find(opt =>
            editorProps.getOptionValue(opt) === value
          ) || null}
          options={editorProps.options || []}
          getOptionLabel={editorProps.getOptionLabel || (opt => opt?.label || '')}
          onChange={(e, newValue) =>
            onChange(editorProps.getOptionValue?.(newValue))
          }
          renderInput={(params) => (
            <TextField {...params} variant="outlined" size="small" />
          )}
        />
      )

    case 'checkbox':
      return (
        <Checkbox
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
        />
      )

    case 'autocomplete':
      return (
        <TextField
          select
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          fullWidth
          size="small"
        >
          {(editorProps.options || []).map((option, idx) => (
            <MenuItem key={idx} value={option}>
              {option}
            </MenuItem>
          ))}
        </TextField>
      )

    default:
      return <>{value}</>
  }
}

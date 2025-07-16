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
  const { type = 'text', inputType = 'text', editorProps = {}, width } = column

  if (!isEditing) {
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

  switch (type) {
    case 'text':
      return (
        <TextField
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          type={inputType || 'text'}
          fullWidth
          size="small"
          sx={{
            backgroundColor: '#fffde7',
            width: column.width,
            '& .MuiOutlinedInput-root.Mui-focused': {
              boxShadow: '0 0 0 2px #fbc02d',
            }
          }}
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
            <TextField
              {...params}
              variant="outlined"
              size="small"
              sx={{
                backgroundColor: '#fffde7',
                width: column.width,
                '& .MuiOutlinedInput-root.Mui-focused': {
                  boxShadow: '0 0 0 2px #fbc02d',
                }
              }}
            />
          )}
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
          sx={{ width: column.width }}
        >
          {(editorProps.options || []).map((option, idx) => (
            <MenuItem key={idx} value={option}>
              {option}
            </MenuItem>
          ))}
        </TextField>
      )

    case 'checkbox':
      return (
        <Checkbox
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
        />
      )

    default:
      return <>{value}</>
  }
}

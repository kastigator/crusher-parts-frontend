import React from 'react'
import {
  TextField,
  Checkbox,
  Autocomplete,
  Tooltip
} from '@mui/material'

export default function EditableCell({
  column,
  value,
  onChange,
  isEditing
}) {
  const { type = 'text', inputType = 'text', editorProps = {}, width } = column

  if (!isEditing) {
    // 👇 Вывод через display() если задан
    const displayValue = column.display
      ? column.display(value)
      : value

    const isString = typeof displayValue === 'string' || typeof displayValue === 'number'

    return isString ? (
      <Tooltip title={String(displayValue)}>
        <span
          style={{
            display: 'inline-block',
            maxWidth: width || 150,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            verticalAlign: 'middle'
          }}
        >
          {displayValue}
        </span>
      </Tooltip>
    ) : (
      displayValue
    )
  }

  // ✅ Поддержка пользовательского редактора
  if (typeof column.editor === 'function') {
    return column.editor(value, onChange)
  }

  // ▼ Стандартные типы редакторов
  switch (type) {
    case 'text':
      return (
        <TextField
          value={value || ''}
          type={inputType}
          required={column.required}
          error={column.required && !value}
          onChange={e => {
            const val = e.target.value
            onChange(column.field, val)
          }}
          sx={{ width }}
        />
      )

    case 'enum':
      return (
        <Autocomplete
          value={editorProps.options?.find(opt =>
            editorProps.getOptionValue?.(opt) === value
          ) || null}
          options={editorProps.options || []}
          getOptionLabel={editorProps.getOptionLabel || (opt => opt?.label || '')}
          onChange={(e, newValue) =>
            onChange(column.field, editorProps.getOptionValue?.(newValue))
          }
          renderInput={(params) => (
            <TextField
              {...params}
              required={column.required}
              error={column.required && !value}
              variant="outlined"
              size="small"
              sx={{
                backgroundColor: '#fffde7',
                width,
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
        <Autocomplete
          value={value || ''}
          onChange={(e, newValue) => onChange(column.field, newValue)}
          options={editorProps.options || []}
          freeSolo={editorProps.freeSolo || false}
          renderOption={editorProps.renderOption}
          renderInput={(params) => (
            <TextField
              {...params}
              required={column.required}
              error={column.required && !value}
              variant="outlined"
              size="small"
              sx={{
                backgroundColor: '#fffde7',
                width,
                '& .MuiOutlinedInput-root.Mui-focused': {
                  boxShadow: '0 0 0 2px #fbc02d',
                }
              }}
            />
          )}
        />
      )

    case 'checkbox':
      return (
        <Checkbox
          checked={!!value}
          onChange={(e) => onChange(column.field, e.target.checked)}
        />
      )

    default:
      return <>{value}</>
  }
}

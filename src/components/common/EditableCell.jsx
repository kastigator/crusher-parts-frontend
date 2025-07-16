import React from 'react'
import {
  TextField,
  Checkbox,
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
          type={inputType}
          onChange={e => {
            const val = e.target.value
            onChange(column.field, val)

            // Автоотключение автозаполнения tab_name и path
            if (['tab_name', 'path'].includes(column.field)) {
              onChange('_auto', false)
            }
          }}
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
          getOptionLabel={editorProps.getOptionLabel || (opt =>
            typeof opt === 'string' ? opt : opt?.label || ''
          )}
          renderOption={editorProps.renderOption}
          renderInput={(params) => (
            <TextField
              {...params}
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

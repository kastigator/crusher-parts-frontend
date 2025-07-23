import React, { useEffect, useState } from "react"
import { TextField, Checkbox, Autocomplete, Tooltip } from "@mui/material"
import { fieldRenderers } from "./fieldRenderers"

export default function EditableCell({
  column,
  value,
  onChange,
  isEditing,
  row,
  disabled: rowDisabled = false // 👈 из EditableRow
}) {
  const {
    field,
    type = "text",
    inputType = "text",
    editorProps = {},
    width,
    minWidth,
    required,
    disabled = false,
    helperText
  } = column

  const effectiveWidth = width || minWidth || 150
  const isDisabled = rowDisabled || disabled
  const safeValue = value ?? ""

  // 🔹 Если НЕ редактируем — отобразить display-значение
  if (!isEditing) {
    const renderer = fieldRenderers[type] || {}
    const displayFn = column.display || renderer.display
    const displayValue = displayFn ? displayFn(safeValue, row) : safeValue
    const isString = typeof displayValue === "string" || typeof displayValue === "number"

    return isString ? (
      <Tooltip title={String(displayValue)}>
        <span
          style={{
            display: "inline-block",
            maxWidth: effectiveWidth,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            verticalAlign: "middle"
          }}
        >
          {displayValue}
        </span>
      </Tooltip>
    ) : (
      displayValue
    )
  }

  // 🔹 Если есть кастомный editor — используем его
  const renderer = fieldRenderers[type] || {}
  const editorFn = column.editor || renderer.editor
  if (typeof editorFn === "function") {
    return editorFn(safeValue, (f, v) => onChange(f, v), required, !safeValue, column)
  }

  // 🔹 Autocomplete с lazy-загрузкой
  if (type === "autocomplete") {
    const [options, setOptions] = useState([])
    const [loaded, setLoaded] = useState(false)

    useEffect(() => {
      if (editorProps.lazyOptions && !loaded && typeof editorProps.fetchOptions === "function") {
        editorProps.fetchOptions().then(setOptions)
        setLoaded(true)
      }
    }, [editorProps, loaded])

    const effectiveOptions = editorProps.lazyOptions ? options : editorProps.options || []
    const selected = effectiveOptions.find(opt => opt.value === value) || null

    return (
      <Autocomplete
        value={selected}
        onChange={(e, newValue) => {
          onChange(field, newValue?.value || "")
        }}
        options={effectiveOptions}
        getOptionLabel={editorProps.getOptionLabel || (opt => opt?.label || "")}
        renderOption={editorProps.renderOption}
        disabled={isDisabled}
        renderInput={(params) => (
          <TextField
            {...params}
            required={required}
            error={required && !value}
            helperText={helperText}
            variant="outlined"
            size="small"
            sx={{
              backgroundColor: isDisabled ? "#f5f5f5" : "#fffde7",
              width: effectiveWidth,
              "& .MuiOutlinedInput-root.Mui-focused": {
                boxShadow: "0 0 0 2px #fbc02d"
              }
            }}
          />
        )}
      />
    )
  }

  // 🔹 Текстовое поле (text, password, email)
  if (["text", "password", "email"].includes(type)) {
    return (
      <TextField
        value={safeValue}
        type={inputType}
        required={required}
        error={required && !safeValue}
        onChange={e => onChange(field, e.target.value)}
        helperText={helperText}
        size="small"
        disabled={isDisabled}
        sx={{ width: effectiveWidth }}
      />
    )
  }

  // 🔹 Чекбокс
  if (type === "checkbox") {
    return (
      <Checkbox
        checked={!!value}
        onChange={e => onChange(field, e.target.checked)}
        disabled={isDisabled}
      />
    )
  }

  // 🔹 По умолчанию — отобразить как есть
  return <>{safeValue}</>
}

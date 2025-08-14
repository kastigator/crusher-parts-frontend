import * as React from "react"
import Autocomplete from "@mui/material/Autocomplete"
import TextField from "@mui/material/TextField"
import { FixedSizeList } from "react-window"

const LISTBOX_PADDING = 8 // px
function renderRow(props) {
  const { data, index, style } = props
  const option = data[index]
  return React.cloneElement(option, {
    style: {
      ...style,
      top: (style.top ?? 0) + LISTBOX_PADDING,
    },
  })
}

const ListboxComponent = React.forwardRef(function ListboxComponent(props, ref) {
  const { children, ...other } = props
  const itemData = React.Children.toArray(children)
  const itemCount = itemData.length
  const itemSize = 40

  return (
    <div ref={ref} {...other}>
      <FixedSizeList
        height={Math.min(8, itemCount) * itemSize + 2 * LISTBOX_PADDING}
        width="100%"
        itemSize={itemSize}
        itemCount={itemCount}
        itemData={itemData}
        overscanCount={5}
      >
        {renderRow}
      </FixedSizeList>
    </div>
  )
})

export default function VirtualizedAutocomplete({
  options,
  value,
  onChange,
  getOptionLabel,
  isOptionEqualToValue,
  placeholder,
  size = "small",
  disabled = false,
  TextFieldProps = {},
  ...rest
}) {
  return (
    <Autocomplete
      disablePortal // важно при Ant Table
      ListboxComponent={ListboxComponent}
      options={options}
      value={value}
      onChange={(_, v) => onChange?.(v)}
      getOptionLabel={getOptionLabel}
      isOptionEqualToValue={isOptionEqualToValue}
      size={size}
      disabled={disabled}
      renderInput={(params) => (
        <TextField {...params} placeholder={placeholder} {...TextFieldProps} />
      )}
      {...rest}
    />
  )
}

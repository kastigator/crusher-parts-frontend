import { useEffect, useRef } from "react"
import { TextField, FormHelperText } from "@mui/material"

export default function PlaceAddressInput({
  value = "",
  onChange,
  error,
  required,
  field = "formatted_address" // 👈 передаётся из fieldRenderers
}) {
  const inputRef = useRef(null)
  const autocompleteRef = useRef(null)

  useEffect(() => {
    if (!window.google || !window.google.maps || !inputRef.current) return

    if (!autocompleteRef.current) {
      autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
        fields: ["formatted_address", "address_components"],
        types: ["address"],
        componentRestrictions: { country: "ru" },
      })

      autocompleteRef.current.addListener("place_changed", () => {
        const place = autocompleteRef.current.getPlace()

        if (place?.formatted_address) {
          onChange(field, place.formatted_address)
        }

        const postal = place.address_components?.find((c) =>
          c.types.includes("postal_code")
        )
        if (postal) {
          onChange("postal_code", postal.long_name)
        }
      })
    }

    // Очистка на размонтирование
    return () => {
      if (autocompleteRef.current) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current)
        autocompleteRef.current = null
      }
    }
  }, [field, onChange])

  return (
    <>
      <TextField
        inputRef={inputRef}
        value={value}
        onChange={(e) => onChange(field, e.target.value)}
        onBlur={(e) => {
          if (!e.target.value) {
            onChange(field, "")
          }
        }}
        error={!!error}
        required={required}
        fullWidth
        placeholder="Введите адрес"
        size="small"
        sx={{ width: 300 }}
      />
      {error && required && (
        <FormHelperText error>Введите или выберите адрес</FormHelperText>
      )}
    </>
  )
}

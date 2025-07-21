import { useEffect, useRef } from "react"
import { TextField, FormHelperText } from "@mui/material"

export default function PlaceAddressInput({ value = "", onChange, error, required }) {
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
          onChange("formatted_address", place.formatted_address)
        }

        const postal = place.address_components?.find((c) =>
          c.types.includes("postal_code")
        )
        if (postal) {
          onChange("postal_code", postal.long_name)
        }
      })
    }
  }, [])

  return (
    <>
      <TextField
        inputRef={inputRef}
        value={value}
        onChange={(e) => onChange("formatted_address", e.target.value)}
        onBlur={(e) => {
          // Вручную вызвать изменение, если не выбрано из подсказки
          if (!e.target.value) {
            onChange("formatted_address", "")
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

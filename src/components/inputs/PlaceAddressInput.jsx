import React, { useEffect, useRef } from "react"
import { TextField, FormHelperText } from "@mui/material"

export default function PlaceAddressInput({
  value = "",
  onChange,
  onKeyDown,
  error,
  required,
  label,
  field = "formatted_address"
}) {
  const inputRef = useRef(null)
  const autocompleteRef = useRef(null)

  useEffect(() => {
    if (!window.google || !window.google.maps || !inputRef.current) return

    if (!autocompleteRef.current) {
      autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
        fields: ["formatted_address", "address_components", "place_id", "geometry"],
        types: ["address"],
        componentRestrictions: { country: "ru" }
      })

      autocompleteRef.current.addListener("place_changed", () => {
        const place = autocompleteRef.current.getPlace()
        if (!place || !place.formatted_address) return

        const location = place.geometry?.location
        const lat = location?.lat?.()
        const lng = location?.lng?.()

        const addressComponents = place.address_components || []
        const postalComponent = addressComponents.find(c => c.types.includes("postal_code"))

        const result = {
          formatted_address: place.formatted_address,
          place_id: place.place_id || null,
          lat: lat || null,
          lng: lng || null,
          postal_code: postalComponent?.short_name || null
        }

        onChange(result)
      })
    }
  }, [])

  return (
    <>
      <TextField
        inputRef={inputRef}
        value={value}
        onChange={(e) => onChange({ [field]: e.target.value })}
        onKeyDown={onKeyDown}
        error={!!error}
        required={required}
        fullWidth
        label={label}
        size="small"
      />
      {error && <FormHelperText error>{error}</FormHelperText>}
    </>
  )
}

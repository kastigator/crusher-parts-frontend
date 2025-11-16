import React, { useEffect, useRef, useState } from "react"
import { Input, Button, Space, message } from "antd"
import Autocomplete from "@mui/material/Autocomplete"
import TextField from "@mui/material/TextField"
import Box from "@mui/material/Box"

export default function PlaceAddressInput({
  value = {},
  onChange,
  debugId = "?",
  resetTrigger
}) {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const [query, setQuery] = useState(value?.address_line || "")
  const [loading, setLoading] = useState(false)
  const [options, setOptions] = useState([])
  const [geoObjects, setGeoObjects] = useState(null)
  const [open, setOpen] = useState(false)

  // сброс при смене resetTrigger
  useEffect(() => {
    setQuery("")
    setOptions([])
    setOpen(false)
  }, [resetTrigger])

  // инициализация карты
  useEffect(() => {
    if (mapInstance.current || !mapRef.current) return

    if (typeof window.ymaps === "undefined") {
      console.error("❌ Yandex Maps API не загружен")
      message.error("Не удалось загрузить Яндекс.Карты")
      return
    }

    window.ymaps.ready(() => {
      const ymaps = window.ymaps
      const { lat, lng } = value || {}
      const center =
        lat != null && lng != null
          ? [Number(lat), Number(lng)]
          : [55.751574, 37.573856]

      const map = new ymaps.Map(mapRef.current, {
        center,
        zoom: 10,
        controls: ["zoomControl"]
      })
      mapInstance.current = map

      if (lat != null && lng != null) {
        const marker = new ymaps.Placemark(center, {}, { draggable: false })
        map.geoObjects.add(marker)
      }

      map.events.add("click", (e) => {
        const coords = e.get("coords")
        map.geoObjects.removeAll()
        const marker = new ymaps.Placemark(coords, {}, { draggable: false })
        map.geoObjects.add(marker)

        ymaps.geocode(coords).then((res) => {
          const first = res.geoObjects.get(0)
          if (!first)
            return message.warning("Не удалось определить адрес по координатам")

          const meta = first.properties.get(
            "metaDataProperty.GeocoderMetaData"
          )
          const addressLine = first.getAddressLine()
          const postalCode = meta.Address.postal_code || ""

          const components = meta.Address.Components || []

          const country =
            components.find((c) => c.kind === "country")?.name || ""
          const province =
            components.find((c) => c.kind === "province")?.name || ""
          const area = components.find((c) => c.kind === "area")?.name || ""
          const locality =
            components.find((c) => c.kind === "locality")?.name || ""
          const street =
            components.find((c) => c.kind === "street")?.name || ""
          const house =
            components.find((c) => c.kind === "house")?.name || ""
          const building =
            components.find((c) => c.kind === "building")?.name || ""
          const entrance =
            components.find((c) => c.kind === "entrance")?.name || ""

          setQuery(addressLine)
          setOpen(false)
          onChange?.({
            address_line: addressLine,
            place_id: meta.id,
            lat: coords[0],
            lng: coords[1],
            postal_code: postalCode,
            country,
            region: province,
            area,
            city: locality,
            street,
            house,
            building,
            entrance
          })
        })
      })
    })

    return () => {
      if (mapInstance.current?.destroy) {
        mapInstance.current.destroy()
        mapInstance.current = null
      }
    }
  }, [value])

  const handleSearch = () => {
    const ymaps = window.ymaps
    if (!query || !ymaps || !mapInstance.current) return

    setLoading(true)
    ymaps
      .geocode(query)
      .then((res) => {
        const geoList = res.geoObjects
        const found = geoList.getLength()

        if (found === 0) {
          message.warning("Адрес не найден")
          setLoading(false)
          return
        }

        const choices = []
        for (let i = 0; i < found; i++) {
          const obj = geoList.get(i)
          const meta = obj.properties.get(
            "metaDataProperty.GeocoderMetaData"
          )
          const components = meta.Address.Components || []

          const parts = [
            components.find((c) => c.kind === "postal_code")?.name,
            components.find((c) => c.kind === "province")?.name,
            components.find((c) => c.kind === "area")?.name,
            components.find((c) => c.kind === "locality")?.name,
            components.find((c) => c.kind === "street")?.name,
            components.find((c) => c.kind === "house")?.name,
            components.find((c) => c.kind === "building")?.name,
            components.find((c) => c.kind === "entrance")?.name
          ].filter(Boolean)

          const fullLabel = parts.join(", ")

          choices.push({
            label: fullLabel || obj.getAddressLine(),
            addressLine: obj.getAddressLine(),
            index: i
          })
        }

        setOptions(choices)
        setGeoObjects(geoList)
        setOpen(true)
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        message.error("Ошибка геокодирования")
        setLoading(false)
      })
  }

  const handleSelect = (_, option) => {
    if (!option || !geoObjects) return
    const selected = geoObjects.get(option.index)
    if (!selected) return

    const coords = selected.geometry.getCoordinates()
    const meta = selected.properties.get("metaDataProperty.GeocoderMetaData")
    const addressLine = option.addressLine || selected.getAddressLine()
    const postalCode = meta.Address.postal_code || ""
    const components = meta.Address.Components || []

    const country = components.find((c) => c.kind === "country")?.name || ""
    const province =
      components.find((c) => c.kind === "province")?.name || ""
    const area = components.find((c) => c.kind === "area")?.name || ""
    const locality =
      components.find((c) => c.kind === "locality")?.name || ""
    const street = components.find((c) => c.kind === "street")?.name || ""
    const house = components.find((c) => c.kind === "house")?.name || ""
    const building =
      components.find((c) => c.kind === "building")?.name || ""
    const entrance =
      components.find((c) => c.kind === "entrance")?.name || ""

    mapInstance.current.setCenter(coords, 14)
    mapInstance.current.geoObjects.removeAll()
    const marker = new ymaps.Placemark(coords, {}, { draggable: false })
    mapInstance.current.geoObjects.add(marker)

    setQuery(addressLine)
    setOpen(false)

    onChange?.({
      address_line: addressLine,
      place_id: meta.id,
      lat: coords[0],
      lng: coords[1],
      postal_code: postalCode,
      country,
      region: province,
      area,
      city: locality,
      street,
      house,
      building,
      entrance
    })
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Space.Compact style={{ width: "100%" }}>
        <Input
          placeholder="Введите адрес"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onPressEnter={handleSearch}
        />
        <Button type="primary" onClick={handleSearch} loading={loading}>
          Найти
        </Button>
      </Space.Compact>

      {open && (
        <Autocomplete
          options={options}
          open={open}
          onClose={() => setOpen(false)}
          onOpen={() => setOpen(true)}
          getOptionLabel={(option) => option?.label || ""}
          isOptionEqualToValue={(option, value) => option.index === value.index}
          onChange={handleSelect}
          renderInput={(params) => (
            <TextField {...params} label="Выберите адрес" size="small" />
          )}
        />
      )}

      <Box
        ref={mapRef}
        sx={{
          width: "100%",
          height: 300,
          borderRadius: 1,
          border: "1px solid #ccc"
        }}
      />
    </div>
  )
}

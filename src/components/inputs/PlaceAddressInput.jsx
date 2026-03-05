import React, { useEffect, useRef, useState } from "react"
import { Input, Button, Space, message, AutoComplete, Segmented } from "antd"

const GEO_LANG_STORAGE_KEY = "address_geocoder_lang_v1"
const DEFAULT_GEO_LANG = "ru_RU"

export default function PlaceAddressInput({
  value = {},
  onChange,
  resetTrigger,
}) {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const placemarkRef = useRef(null)

  const [query, setQuery] = useState(value?.address_line || "")
  const [loading, setLoading] = useState(false)
  const [options, setOptions] = useState([])
  const [open, setOpen] = useState(false)
  const [geoLang, setGeoLang] = useState(() => {
    try {
      const saved = window.localStorage.getItem(GEO_LANG_STORAGE_KEY)
      return saved === "en_US" ? "en_US" : DEFAULT_GEO_LANG
    } catch {
      return DEFAULT_GEO_LANG
    }
  })
  const valueRef = useRef(value)
  const onChangeRef = useRef(onChange)
  const geoLangRef = useRef(DEFAULT_GEO_LANG)

  const getAddressComponent = (components, kind) =>
    (components || []).find((c) => c.kind === kind)?.name || ""

  const emitManualAddress = (addressLine) => {
    const prev = valueRef.current || {}
    onChangeRef.current?.({
      address_line: addressLine,
      place_id: null,
      lat: null,
      lng: null,
      postal_code: prev.postal_code || "",
      country: prev.country || "",
      region: prev.region || "",
      area: prev.area || "",
      city: prev.city || "",
      street: prev.street || "",
      house: prev.house || "",
      building: prev.building || "",
      entrance: prev.entrance || "",
    })
  }

  const normalizeGeoObject = (geoObject, fallbackAddressLine = "") => {
    if (!geoObject) return null
    const meta = geoObject.properties?.get?.("metaDataProperty.GeocoderMetaData") || {}
    const coords = geoObject.geometry?.getCoordinates?.() || []
    const components = meta?.Address?.Components || []
    const addressLine =
      fallbackAddressLine ||
      geoObject.getAddressLine?.() ||
      meta?.text ||
      meta?.Address?.formatted ||
      ""

    return {
      label: meta?.Address?.formatted || addressLine,
      payload: {
        address_line: addressLine,
        place_id: meta?.id || null,
        lat: Number.isFinite(Number(coords?.[0])) ? Number(coords[0]) : null,
        lng: Number.isFinite(Number(coords?.[1])) ? Number(coords[1]) : null,
        postal_code: meta?.Address?.postal_code || "",
        country: getAddressComponent(components, "country"),
        region: getAddressComponent(components, "province"),
        area: getAddressComponent(components, "area"),
        city: getAddressComponent(components, "locality"),
        street: getAddressComponent(components, "street"),
        house: getAddressComponent(components, "house"),
        building: getAddressComponent(components, "building"),
        entrance: getAddressComponent(components, "entrance"),
      },
    }
  }

  const geocodeByHttp = async ({ queryValue, coords = null, lang = "ru_RU" }) => {
    const apiKey = import.meta.env.VITE_YANDEX_MAPS_API_KEY
    if (!apiKey) return []

    const geocodeParam =
      coords && Number.isFinite(Number(coords[0])) && Number.isFinite(Number(coords[1]))
        ? `${coords[1]},${coords[0]}`
        : queryValue
    if (!geocodeParam) return []

    const url = `https://geocode-maps.yandex.ru/1.x/?apikey=${encodeURIComponent(
      apiKey
    )}&format=json&lang=${encodeURIComponent(lang)}&results=10&geocode=${encodeURIComponent(
      geocodeParam
    )}`
    const res = await fetch(url)
    if (!res.ok) throw new Error("HTTP geocoder request failed")
    const json = await res.json()
    const members = json?.response?.GeoObjectCollection?.featureMember || []

    return members
      .map((m) => {
        const obj = m?.GeoObject
        if (!obj) return null
        const pos = String(obj?.Point?.pos || "")
          .trim()
          .split(/\s+/)
        const lon = Number(pos[0])
        const lat = Number(pos[1])
        const meta = obj?.metaDataProperty?.GeocoderMetaData || {}
        const components = meta?.Address?.Components || []
        const addressLine = meta?.text || meta?.Address?.formatted || ""

        return {
          label: meta?.Address?.formatted || addressLine,
          payload: {
            address_line: addressLine,
            place_id: meta?.id || null,
            lat: Number.isFinite(lat) ? lat : null,
            lng: Number.isFinite(lon) ? lon : null,
            postal_code: meta?.Address?.postal_code || "",
            country: getAddressComponent(components, "country"),
            region: getAddressComponent(components, "province"),
            area: getAddressComponent(components, "area"),
            city: getAddressComponent(components, "locality"),
            street: getAddressComponent(components, "street"),
            house: getAddressComponent(components, "house"),
            building: getAddressComponent(components, "building"),
            entrance: getAddressComponent(components, "entrance"),
          },
        }
      })
      .filter(Boolean)
  }

  useEffect(() => {
    valueRef.current = value
  }, [value])

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    geoLangRef.current = geoLang
    try {
      window.localStorage.setItem(GEO_LANG_STORAGE_KEY, geoLang)
    } catch {
      // ignore localStorage failures
    }
  }, [geoLang])

  useEffect(() => {
    setQuery("")
    setOptions([])
    setOpen(false)
  }, [resetTrigger])

  useEffect(() => {
    if (!mapRef.current) return
    const mapNode = mapRef.current
    if (typeof window.ymaps === "undefined") {
      console.error("❌ Yandex Maps API не загружен")
      message.error("Не удалось загрузить Яндекс.Карты")
      return
    }

    let cancelled = false

    const initMap = () => {
      if (cancelled || !mapNode) return

      try {
        mapInstance.current?.destroy?.()
      } catch {
        // ignore map destroy errors during re-init
      }
      mapInstance.current = null
      mapNode.innerHTML = ""

      const ymaps = window.ymaps
      const { lat, lng } = valueRef.current || {}
      const center =
        lat != null && lng != null ? [Number(lat), Number(lng)] : [55.751574, 37.573856]

      const map = new ymaps.Map(mapNode, {
        center,
        zoom: 10,
        controls: ["zoomControl"],
      })
      mapInstance.current = map

      if (lat != null && lng != null) {
        placemarkRef.current = new ymaps.Placemark(center, {}, { draggable: false })
        map.geoObjects.add(placemarkRef.current)
      }

      map.events.add("click", (e) => {
        const coords = e.get("coords")
        map.geoObjects.removeAll()
        placemarkRef.current = new ymaps.Placemark(coords, {}, { draggable: false })
        map.geoObjects.add(placemarkRef.current)

        const activeLang = geoLangRef.current || "ru_RU"
        if (activeLang === "en_US") {
          geocodeByHttp({ coords, lang: activeLang })
            .then((list) => {
              const first = list?.[0]?.payload
              if (!first) return message.warning("Не удалось определить адрес по координатам")
              setQuery(first.address_line || "")
              setOpen(false)
              onChangeRef.current?.(first)
            })
            .catch((err) => {
              console.error(err)
              message.warning("Не удалось определить адрес по координатам")
            })
          return
        }

        ymaps.geocode(coords).then((res) => {
          const firstObj = res.geoObjects.get(0)
          const first = normalizeGeoObject(firstObj)
          if (!first?.payload) return message.warning("Не удалось определить адрес по координатам")
          setQuery(first.payload.address_line || "")
          setOpen(false)
          onChangeRef.current?.(first.payload)
        })
      })
    }

    window.ymaps.ready(initMap)

    return () => {
      cancelled = true
      try {
        mapInstance.current?.destroy?.()
      } catch {
        // ignore map destroy errors during cleanup
      }
      mapInstance.current = null
      placemarkRef.current = null
      if (mapNode) mapNode.innerHTML = ""
    }
  }, [resetTrigger])

  const handleSearch = () => {
    const ymaps = window.ymaps
    if (!query || !ymaps || !mapInstance.current) return

    setLoading(true)
    if (geoLang === "en_US") {
      geocodeByHttp({ queryValue: query, lang: geoLang })
        .then((list) => {
          if (!list.length) {
            message.warning("Адрес не найден")
            return
          }
          setOptions(list)
          setOpen(true)
        })
        .catch((err) => {
          console.error(err)
          message.error("Ошибка геокодирования")
        })
        .finally(() => setLoading(false))
      return
    }

    ymaps
      .geocode(query)
      .then((res) => {
        const geoList = res.geoObjects
        const found = geoList.getLength()
        if (found === 0) {
          message.warning("Адрес не найден")
          return
        }

        const choices = []
        for (let i = 0; i < found; i += 1) {
          const obj = geoList.get(i)
          const normalized = normalizeGeoObject(obj)
          if (normalized) choices.push(normalized)
        }

        setOptions(choices)
        setOpen(true)
      })
      .catch((err) => {
        console.error(err)
        message.error("Ошибка геокодирования")
      })
      .finally(() => setLoading(false))
  }

  const handleSelect = (option) => {
    if (!option?.payload) return
    const ymaps = window.ymaps
    const next = option.payload

    if (
      mapInstance.current &&
      ymaps &&
      Number.isFinite(Number(next.lat)) &&
      Number.isFinite(Number(next.lng))
    ) {
      const coords = [Number(next.lat), Number(next.lng)]
      mapInstance.current.setCenter(coords, 14)
      mapInstance.current.geoObjects.removeAll()
      const marker = new ymaps.Placemark(coords, {}, { draggable: false })
      mapInstance.current.geoObjects.add(marker)
    }

    setQuery(next.address_line || "")
    setOpen(false)
    onChangeRef.current?.(next)
  }

  const autoOptions = options.map((o, idx) => ({
    value: String(o.payload?.place_id || `${o.payload?.address_line || "addr"}-${idx}`),
    label: o.label,
    payload: o.payload,
  }))

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Segmented
          size="small"
          value={geoLang}
          options={[
            { label: "RU", value: "ru_RU" },
            { label: "EN", value: "en_US" },
          ]}
          onChange={(v) => setGeoLang(String(v || DEFAULT_GEO_LANG))}
        />
      </div>

      <Space.Compact style={{ width: "100%" }}>
        <Input
          placeholder="Введите адрес (поиск необязателен)"
          value={query}
          onChange={(e) => {
            const next = e.target.value
            setQuery(next)
            setOpen(false)
            emitManualAddress(next)
          }}
          onPressEnter={handleSearch}
        />
        <Button type="primary" onClick={handleSearch} loading={loading}>
          Найти
        </Button>
      </Space.Compact>

      {open && (
        <AutoComplete
          style={{ width: "100%" }}
          options={autoOptions}
          open={open}
          onDropdownVisibleChange={(v) => setOpen(v)}
          onSelect={(_, option) => handleSelect(option)}
          onBlur={() => setOpen(false)}
        >
          <Input placeholder="Выберите адрес" size="small" />
        </AutoComplete>
      )}

      <div
        ref={mapRef}
        style={{
          width: "100%",
          height: 300,
          borderRadius: 4,
          border: "1px solid #ccc",
        }}
      />
    </div>
  )
}

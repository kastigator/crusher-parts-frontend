// src/components/inputs/PlaceAddressInput.jsx
import React, { useEffect, useRef, useState } from 'react'
import { Input, Button, Space, Spin, message } from 'antd'
import loadYandexMaps from '@/utils/loadYandexMaps'

export default function PlaceAddressInput({ value = {}, onChange }) {
  const mapRef = useRef(null)
  const [ymaps, setYmaps] = useState(null)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [mapInstance, setMapInstance] = useState(null)

  useEffect(() => {
    loadYandexMaps()
      .then((ymapsInstance) => {
        setYmaps(ymapsInstance)

        const center = value?.lat && value?.lng ? [value.lat, value.lng] : [55.751574, 37.573856]
        const map = new ymapsInstance.Map(mapRef.current, {
          center,
          zoom: 10,
          controls: ['zoomControl'],
        })
        setMapInstance(map)

        if (value.lat && value.lng) {
          const marker = new ymapsInstance.Placemark(center, {}, { draggable: false })
          map.geoObjects.add(marker)
        }

        // 👇 Добавим клик по карте
        map.events.add('click', (e) => {
          const coords = e.get('coords')
          map.geoObjects.removeAll()
          const marker = new ymapsInstance.Placemark(coords, {}, { draggable: false })
          map.geoObjects.add(marker)

          ymapsInstance.geocode(coords).then((res) => {
            const first = res.geoObjects.get(0)
            if (!first) {
              message.warning('Не удалось определить адрес по координатам')
              return
            }

            const addressLine = first.getAddressLine()
            const placeId = first.properties.get('metaDataProperty.GeocoderMetaData.id')
            const postalCode = first.properties.get('metaDataProperty.GeocoderMetaData.Address.postal_code') || ''

            console.log('📍 Клик по карте', { coords, addressLine, placeId, postalCode })

            onChange?.({
              address_line: addressLine,
              place_id: placeId,
              lat: coords[0],
              lng: coords[1],
              postal_code: postalCode,
            })
          })
        })
      })
      .catch((err) => {
        console.error(err)
        message.error('Ошибка загрузки Яндекс.Карт')
      })
  }, [])

  const handleSearch = () => {
    if (!query || !ymaps || !mapInstance) return

    setLoading(true)
    ymaps.geocode(query)
      .then((res) => {
        const firstResult = res.geoObjects.get(0)
        if (!firstResult) {
          message.warning('Адрес не найден')
          setLoading(false)
          return
        }

        const coords = firstResult.geometry.getCoordinates()
        const addressLine = firstResult.getAddressLine()
        const placeId = firstResult.properties.get('metaDataProperty.GeocoderMetaData.id')
        const postalCode = firstResult.properties.get('metaDataProperty.GeocoderMetaData.Address.postal_code') || ''

        console.log('🔍 Поиск по строке', { coords, addressLine, placeId, postalCode })

        mapInstance.setCenter(coords, 14)
        mapInstance.geoObjects.removeAll()
        const marker = new ymaps.Placemark(coords, {}, { draggable: false })
        mapInstance.geoObjects.add(marker)

        onChange?.({
          address_line: addressLine,
          place_id: placeId,
          lat: coords[0],
          lng: coords[1],
          postal_code: postalCode,
        })

        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        message.error('Ошибка геокодирования')
        setLoading(false)
      })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <Space.Compact style={{ width: '100%' }}>
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

      <div
        ref={mapRef}
        style={{
          width: '100%',
          height: 250,
          borderRadius: 6,
          border: '1px solid #ddd',
        }}
      />
    </div>
  )
}

import React, { useEffect, useRef } from "react"

export default function MapPreview({ address, onSelect, height = 240 }) {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const markerRef = useRef(null)

  useEffect(() => {
    if (!window.ymaps || !mapRef.current) return

    window.ymaps.ready(() => {
      mapInstance.current = new window.ymaps.Map(mapRef.current, {
        center: [55.751574, 37.573856],
        zoom: 9,
        controls: ["zoomControl"]
      })

      markerRef.current = new window.ymaps.Placemark(
        mapInstance.current.getCenter(),
        {},
        { draggable: false }
      )
      mapInstance.current.geoObjects.add(markerRef.current)

      mapInstance.current.events.add("click", (e) => {
        const coords = e.get("coords")
        markerRef.current.geometry.setCoordinates(coords)

        if (onSelect) {
          onSelect({ lat: coords[0], lng: coords[1] })
        }
      })

      if (address) {
        window.ymaps.geocode(address).then((res) => {
          const firstGeo = res.geoObjects.get(0)
          if (firstGeo) {
            const coords = firstGeo.geometry.getCoordinates()
            mapInstance.current.setCenter(coords, 14)
            markerRef.current.geometry.setCoordinates(coords)
          }
        })
      }
    })
  }, [address])

  return (
    <div
      ref={mapRef}
      style={{
        width: "100%",
        height,
        borderRadius: 8,
        overflow: "hidden",
        border: "1px solid #eee"
      }}
    />
  )
}

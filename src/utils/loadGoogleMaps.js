export default function loadGoogleMaps() {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.maps) {
      resolve()
      return
    }

    const script = document.createElement("script")
    script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places&v=weekly&region=RU`
    script.async = true
    script.defer = true

    script.onload = () => {
      console.log("✅ Google Maps API загружен")
      resolve()
    }

    script.onerror = (err) => {
      console.error("❌ Ошибка загрузки Maps API", err)
      reject(err)
    }

    document.head.appendChild(script)
  })
}

// src/utils/loadYandexMaps.js

export default function loadYandexMaps() {
  return new Promise((resolve, reject) => {
    if (typeof window.ymaps !== 'undefined' && typeof window.ymaps.Map === 'function') {
      resolve(window.ymaps)
      return
    }

    const apiKey = import.meta.env.VITE_YANDEX_MAPS_API_KEY
    if (!apiKey) {
      reject(new Error('❌ VITE_YANDEX_MAPS_API_KEY не задан в .env'))
      return
    }

    const script = document.createElement('script')
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${apiKey}&lang=ru_RU`
    script.type = 'text/javascript'
    script.onload = () => {
      if (typeof window.ymaps !== 'undefined' && typeof window.ymaps.Map === 'function') {
        console.log('✅ Yandex Maps API загружен')
        resolve(window.ymaps)
      } else {
        reject(new Error('❌ ymaps загружен, но Map не доступен'))
      }
    }
    script.onerror = () => {
      reject(new Error('❌ Ошибка загрузки скрипта Yandex Maps'))
    }
    document.head.appendChild(script)
  })
}

export default function loadYandexMaps() {
  return new Promise((resolve, reject) => {
    const ymapsIsAvailable = typeof window.ymaps !== 'undefined'

    if (ymapsIsAvailable) {
      console.log('ℹ️ Yandex Maps API уже загружен')
      window.ymaps.ready(() => {
        console.log('✅ Yandex Maps API готов к использованию')
        resolve(window.ymaps)
      })
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
      if (typeof window.ymaps !== 'undefined') {
        window.ymaps.ready(() => {
          console.log('✅ Yandex Maps API загружен и готов к использованию')
          resolve(window.ymaps)
        })
      } else {
        reject(new Error('❌ Скрипт загружен, но объект ymaps не определён'))
      }
    }

    script.onerror = () => {
      reject(new Error('❌ Ошибка загрузки скрипта Yandex Maps'))
    }

    document.head.appendChild(script)
  })
}

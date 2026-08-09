import { getBrowserIntegration } from '../config/runtimeConfig.js'

export default function loadYandexMaps({ windowRef = globalThis.window, documentRef = globalThis.document } = {}) {
  return new Promise((resolve, reject) => {
    const integration = getBrowserIntegration('yandexMaps')
    if (integration.mode === 'disabled') {
      resolve(null)
      return
    }

    const ymapsIsAvailable = typeof windowRef?.ymaps !== 'undefined'

    if (ymapsIsAvailable) {
      console.log('ℹ️ Yandex Maps API уже загружен')
      windowRef.ymaps.ready(() => {
        console.log('✅ Yandex Maps API готов к использованию')
        resolve(windowRef.ymaps)
      })
      return
    }

    const apiKey = integration.apiKey
    if (!documentRef?.head) {
      reject(new Error('Yandex Maps requires a browser document'))
      return
    }

    const script = documentRef.createElement('script')
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${apiKey}&lang=ru_RU`
    script.type = 'text/javascript'

    script.onload = () => {
      if (typeof windowRef?.ymaps !== 'undefined') {
        windowRef.ymaps.ready(() => {
          console.log('✅ Yandex Maps API загружен и готов к использованию')
          resolve(windowRef.ymaps)
        })
      } else {
        reject(new Error('❌ Скрипт загружен, но объект ymaps не определён'))
      }
    }

    script.onerror = () => {
      reject(new Error('❌ Ошибка загрузки скрипта Yandex Maps'))
    }

    documentRef.head.appendChild(script)
  })
}

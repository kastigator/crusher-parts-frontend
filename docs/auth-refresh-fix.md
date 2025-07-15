# ♻️ Auth Refresh Fix — правильный logout и refresh (июль 2025)

Этот документ описывает архитектурное обновление авторизации: как мы избавились от `window.location.href = '/login'` и внедрили правильную обработку 401 + logout через контекст.

---

## 📌 Проблема

При истечении JWT или ошибке refresh-токена в `axiosInstance.js` происходил жёсткий редирект:

```js
window.location.href = '/login'
```

Это вызывало:

* бесконечный цикл при сбое refresh
* потерю React-контекста
* перезапуск SPA

---

## ✅ Решение

Мы внедрили глобальный обработчик `logout()` через `authService`, который можно вызывать из любого модуля.

---

## 📁 Файлы и правки

### 1. `src/auth/authService.js`

```js
let logoutCallback = null

export function setLogoutHandler(callback) {
  logoutCallback = callback
}

export function logout() {
  if (logoutCallback) {
    logoutCallback()
  } else {
    console.warn('🚫 Logout called before handler was set')
  }
}
```

### 2. `src/auth/AuthContext.jsx`

Добавлено:

```js
import { setLogoutHandler } from './authService'
```

И в `useEffect`:

```js
useEffect(() => {
  setLogoutHandler(logout)
}, [])
```

### 3. `src/api/axiosInstance.js`

Заменили:

```js
window.location.href = '/login'
```

на:

```js
import { logout } from '../auth/authService'
logout()
```

---

## ✅ Результат

* Токен сбрасывается корректно
* Пользователь уходит в `/login` через `PrivateRoute`
* Никаких перезагрузок
* Поведение SPA не ломается

---

*Фикс реализован 15 июля 2025 на обеих средах (macOS + Windows).*

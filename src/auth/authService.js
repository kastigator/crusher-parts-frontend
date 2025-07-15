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

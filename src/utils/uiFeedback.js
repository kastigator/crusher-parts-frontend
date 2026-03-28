import { message as staticMessage, notification as staticNotification } from "antd"

let currentMessageApi = staticMessage
let currentNotificationApi = staticNotification

export function setUiFeedbackApi({ messageApi, notificationApi }) {
  if (messageApi) currentMessageApi = messageApi
  if (notificationApi) currentNotificationApi = notificationApi
}

export const appMessage = {
  open: (...args) => currentMessageApi.open(...args),
  success: (...args) => currentMessageApi.success(...args),
  error: (...args) => currentMessageApi.error(...args),
  warning: (...args) => currentMessageApi.warning(...args),
  info: (...args) => currentMessageApi.info(...args),
  loading: (...args) => currentMessageApi.loading(...args),
  destroy: (...args) => currentMessageApi.destroy(...args),
}

export const appNotification = {
  open: (...args) => currentNotificationApi.open(...args),
  success: (...args) => currentNotificationApi.success(...args),
  error: (...args) => currentNotificationApi.error(...args),
  warning: (...args) => currentNotificationApi.warning(...args),
  info: (...args) => currentNotificationApi.info(...args),
  destroy: (...args) => currentNotificationApi.destroy(...args),
}

import { useEffect } from "react"
import { App } from "antd"
import { setUiFeedbackApi } from "@/utils/uiFeedback"

export default function AntdAppBridge() {
  const { message, notification } = App.useApp()

  useEffect(() => {
    setUiFeedbackApi({
      messageApi: message,
      notificationApi: notification,
    })
  }, [message, notification])

  return null
}

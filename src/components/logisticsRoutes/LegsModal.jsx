// src/components/logisticsRoutes/LegsModal.jsx
import React, { useEffect, useState } from "react"
import { Modal, message } from "antd"
import LegsEditor from "./LegsEditor"
import axios from "@/api/axiosInstance"

export default function LegsModal({ open, onClose, route }) {
  const [legs, setLegs] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (route) {
      setLegs(
        Array.isArray(route.legs)
          ? route.legs.map((l, idx) => ({ ...l, seq: idx + 1 }))
          : []
      )
    } else {
      setLegs([])
    }
  }, [route])

  const handleSave = async () => {
    if (!route?.id) {
      return onClose?.()
    }
    setSaving(true)
    try {
      const payload = {
        ...route,
        legs,
      }
      const { data } = await axios.put(`/logistics-routes/${route.id}`, payload)
      message.success("Звенья сохранены")
      onClose?.(data)
    } catch (err) {
      console.error("Ошибка сохранения звеньев:", err)
      message.error("Не удалось сохранить звенья")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onCancel={() => onClose?.()}
      onOk={handleSave}
      confirmLoading={saving}
      width={1100}
      title={route ? `Звенья маршрута: ${route.name || route.id}` : "Звенья маршрута"}
      okText="Сохранить"
      cancelText="Отмена"
      destroyOnClose
    >
      <LegsEditor legs={legs} setLegs={setLegs} />
    </Modal>
  )
}

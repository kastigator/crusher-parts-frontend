import React, { useEffect, useState } from "react"
import { Alert, Descriptions, Space, Tag } from "antd"
import axios from "@/api/axiosInstance"

export default function CompanyLegalSummary({ profile: profileProp = null, title = "Реквизиты нашего юрлица", description = null }) {
  const [profile, setProfile] = useState(profileProp)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (profileProp) {
      setProfile(profileProp)
      setError(null)
      return undefined
    }
    let cancelled = false
    const load = async () => {
      try {
        const { data } = await axios.get("/company-profile/current")
        if (!cancelled) {
          setProfile(data || null)
          setError(null)
        }
      } catch (e) {
        if (!cancelled) {
          setProfile(null)
          setError(e?.response?.data?.message || "Не удалось загрузить реквизиты компании")
        }
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [profileProp])

  if (error) {
    return <Alert type="warning" showIcon message={error} />
  }

  if (!profile) {
    return null
  }

  return (
    <Space direction="vertical" size={8} style={{ width: "100%" }}>
      <Alert
        type="info"
        showIcon
        message={title}
        description={
          description ||
          `Версия реквизитов действует с ${profile.effective_from}. Именно эти реквизиты должны использоваться в КП, договорах и печатных формах.`
        }
      />
      <Descriptions size="small" bordered column={1}>
        <Descriptions.Item label="Наименование">
          <div>{profile.short_name_ru}</div>
          <div style={{ color: "#666" }}>{profile.full_name_ru}</div>
        </Descriptions.Item>
        <Descriptions.Item label="Наименование на английском">
          {profile.full_name_en || "—"}
        </Descriptions.Item>
        <Descriptions.Item label="ИНН / КПП / ОГРН">
          <Space wrap>
            <Tag>ИНН {profile.inn}</Tag>
            <Tag>КПП {profile.kpp}</Tag>
            <Tag>ОГРН {profile.ogrn}</Tag>
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label="Подписант">
          {profile.signer?.title_ru} {profile.signer?.full_name}
        </Descriptions.Item>
        <Descriptions.Item label="Банк">
          <div>{profile.bank?.bank_name}</div>
          <div style={{ color: "#666" }}>
            р/с {profile.bank?.account_number}, БИК {profile.bank?.bic}, к/с {profile.bank?.correspondent_account}
          </div>
        </Descriptions.Item>
      </Descriptions>
    </Space>
  )
}

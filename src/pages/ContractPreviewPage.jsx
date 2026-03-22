import React, { useEffect, useState } from "react"
import { Alert, Spin } from "antd"
import { useParams } from "react-router-dom"
import axios from "@/api/axiosInstance"

export default function ContractPreviewPage() {
  const { id } = useParams()
  const [html, setHtml] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError("")
      try {
        const { data } = await axios.get(`/contracts/${id}/preview`, {
          responseType: "text",
          transformResponse: [(value) => value],
        })
        if (!cancelled) setHtml(typeof data === "string" ? data : "")
      } catch (e) {
        if (!cancelled) setError(e?.response?.data?.message || "Не удалось открыть предпросмотр контракта")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [id])

  if (loading) {
    return (
      <div style={{ padding: 32, display: "flex", justifyContent: "center" }}>
        <Spin size="large" />
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <Alert type="error" showIcon message="Предпросмотр недоступен" description={error} />
      </div>
    )
  }

  return (
    <iframe
      title={`contract-preview-${id}`}
      srcDoc={html}
      style={{ width: "100%", minHeight: "100vh", border: "none", background: "#fff" }}
    />
  )
}

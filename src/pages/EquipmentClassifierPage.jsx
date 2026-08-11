import React from "react"
import { Segmented, Space, Typography } from "antd"
import { useSearchParams } from "react-router-dom"
import PageWrapper from "@/components/common/PageWrapper"
import EquipmentClassifierMain from "@/components/equipmentClassifier/EquipmentClassifierMain"
import TechnicalIdentificationWorkspace from "@/features/technicalIdentification/components/TechnicalIdentificationWorkspace"
import useCapabilities from "@/hooks/useCapabilities"

export default function EquipmentClassifierPage() {
  const { can } = useCapabilities()
  const [searchParams, setSearchParams] = useSearchParams()
  const mode = (searchParams.get("mode") === "identification" || searchParams.has("task")) && can("technical_identification.access")
    ? "identification"
    : "classifier"
  const setMode = (value) => {
    const next = new URLSearchParams(searchParams)
    if (value === "identification") next.set("mode", "identification")
    else { next.delete("mode"); next.delete("task") }
    setSearchParams(next)
  }
  return (
    <PageWrapper padding="10px 12px 12px">
      <Space direction="vertical" size={14} style={{ width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
          <Typography.Text strong>Classifier & Engineering</Typography.Text>
          {can("technical_identification.access") && <Segmented value={mode} onChange={setMode} options={[{value:"classifier",label:"Технический классификатор"},{value:"identification",label:"Требует идентификации"}]}/>}
        </div>
        {mode === "identification" ? <TechnicalIdentificationWorkspace /> : <EquipmentClassifierMain />}
      </Space>
    </PageWrapper>
  )
}

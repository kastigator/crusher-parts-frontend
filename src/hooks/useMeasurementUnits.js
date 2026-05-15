import { useEffect, useMemo, useState } from "react"
import axios from "@/api/axiosInstance"

const FALLBACK_UNITS = [
  { code: "pcs", symbol: "шт", name_ru: "Штука", dimension_type: "quantity" },
  { code: "kg", symbol: "кг", name_ru: "Килограмм", dimension_type: "mass" },
  { code: "set", symbol: "компл.", name_ru: "Комплект", dimension_type: "quantity" },
]

const buildLabel = (unit) => {
  const symbol = unit.symbol || unit.code
  const name = unit.name_ru || unit.name_en || unit.code
  return `${symbol} · ${name}`
}

export default function useMeasurementUnits({ active = true, dimensionType = null } = {}) {
  const [units, setUnits] = useState(FALLBACK_UNITS)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let alive = true
    const load = async () => {
      setLoading(true)
      try {
        const { data } = await axios.get("/measurement-units", {
          params: {
            active: active ? 1 : undefined,
            dimension_type: dimensionType || undefined,
          },
        })
        if (!alive) return
        const rows = Array.isArray(data) ? data : data?.rows
        setUnits(Array.isArray(rows) && rows.length ? rows : FALLBACK_UNITS)
      } catch (err) {
        console.error("GET /measurement-units error:", err)
        if (alive) setUnits(FALLBACK_UNITS)
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => {
      alive = false
    }
  }, [active, dimensionType])

  const options = useMemo(
    () =>
      units.map((unit) => ({
        value: unit.code,
        label: buildLabel(unit),
      })),
    [units]
  )

  return { units, options, loading }
}

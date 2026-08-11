import { useEffect, useMemo, useState } from "react"
import axios from "@/api/axiosInstance"

const buildLabel = (unit) => {
  const symbol = unit.symbol || unit.code
  const name = unit.name_ru || unit.name_en || unit.code
  return `${symbol} · ${name}`
}

export default function useMeasurementUnits({ active = true, dimensionType = null } = {}) {
  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let alive = true
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const { data } = await axios.get("/measurement-units", {
          params: {
            active: active ? 1 : undefined,
            dimension_type: dimensionType || undefined,
          },
        })
        if (!alive) return
        const rows = Array.isArray(data) ? data : data?.rows
        setUnits(Array.isArray(rows) ? rows : [])
      } catch (err) {
        console.error("GET /measurement-units error:", err)
        if (alive) {
          setUnits([])
          setError(err)
        }
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

  return { units, options, loading, error }
}

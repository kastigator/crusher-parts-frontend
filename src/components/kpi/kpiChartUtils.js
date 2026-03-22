import dayjs from "dayjs"

export const KPI_AGGREGATION_OPTIONS = [
  { value: "day", label: "По дням" },
  { value: "week", label: "По неделям" },
  { value: "month", label: "По месяцам" },
]

export const KPI_CHART_MODE_OPTIONS = [
  { value: "fact", label: "Только факт" },
  { value: "fact_plan", label: "Факт и план" },
]

const resolveBucket = (parsed, mode) => {
  if (mode === "month") {
    const start = parsed.startOf("month")
    return {
      key: start.format("YYYY-MM"),
      sortKey: start.valueOf(),
      label: start.format("MM.YYYY"),
    }
  }

  if (mode === "week") {
    const start = parsed.startOf("week")
    const end = start.endOf("week")
    return {
      key: start.format("YYYY-MM-DD"),
      sortKey: start.valueOf(),
      label: `${start.format("DD.MM")} – ${end.format("DD.MM")}`,
    }
  }

  return {
    key: parsed.format("YYYY-MM-DD"),
    sortKey: parsed.valueOf(),
    label: parsed.format("DD.MM"),
  }
}

export const aggregateKpiSeries = (rows, mode, sumKeys) => {
  if (!Array.isArray(rows) || !rows.length) return []

  const grouped = new Map()

  for (const row of rows) {
    const parsed = dayjs(row?.day)
    if (!parsed.isValid()) continue

    const bucket = resolveBucket(parsed, mode)
    const current =
      grouped.get(bucket.key) || {
        period_label: bucket.label,
        sort_key: bucket.sortKey,
      }

    for (const key of sumKeys) {
      current[key] = Number(current[key] || 0) + Number(row?.[key] || 0)
    }

    grouped.set(bucket.key, current)
  }

  return [...grouped.values()].sort((a, b) => a.sort_key - b.sort_key)
}

export const getAggregationTitle = (mode) => {
  if (mode === "month") return "Динамика по месяцам"
  if (mode === "week") return "Динамика по неделям"
  return "Динамика по дням"
}

export const getTooltipLabelPrefix = (mode) => {
  if (mode === "month") return "Месяц"
  if (mode === "week") return "Неделя"
  return "Дата"
}

export const pickApplicableTarget = ({
  targets,
  userId,
  range,
  userField,
}) => {
  if (!userId || !Array.isArray(targets) || !targets.length || !Array.isArray(range)) {
    return null
  }

  const [start, end] = range
  if (!start || !end) return null

  const rangeStart = start.format("YYYY-MM-DD")
  const rangeEnd = end.format("YYYY-MM-DD")

  const candidates = targets
    .filter((row) => Number(row?.[userField]) === Number(userId))
    .filter((row) => String(row?.period_end || "") >= rangeStart)
    .filter((row) => String(row?.period_start || "") <= rangeEnd)
    .sort((a, b) => {
      const aExact =
        String(a?.period_start || "") === rangeStart &&
        String(a?.period_end || "") === rangeEnd
      const bExact =
        String(b?.period_start || "") === rangeStart &&
        String(b?.period_end || "") === rangeEnd
      if (aExact !== bExact) return aExact ? -1 : 1

      const aContains =
        String(a?.period_start || "") <= rangeStart &&
        String(a?.period_end || "") >= rangeEnd
      const bContains =
        String(b?.period_start || "") <= rangeStart &&
        String(b?.period_end || "") >= rangeEnd
      if (aContains !== bContains) return aContains ? -1 : 1

      const aSpan =
        Math.abs(new Date(a?.period_end || rangeEnd) - new Date(a?.period_start || rangeStart))
      const bSpan =
        Math.abs(new Date(b?.period_end || rangeEnd) - new Date(b?.period_start || rangeStart))
      return aSpan - bSpan
    })

  return candidates[0] || null
}

export const addPlanSeriesToChart = ({
  rows,
  visibleSeries,
  target,
  mapping,
}) => {
  if (!Array.isArray(rows) || !rows.length || !target) return rows

  const bucketCount = rows.length || 1
  return rows.map((row) => {
    const next = { ...row }
    for (const key of visibleSeries) {
      const targetField = mapping[key]
      if (!targetField) continue
      const totalTarget = Number(target?.[targetField])
      next[`plan_${key}`] = Number.isFinite(totalTarget)
        ? totalTarget / bucketCount
        : null
    }
    return next
  })
}

export { formatQtyWithUomLabel, formatUomLabel } from "@/utils/uom"

export const COVERAGE_KIND_LABELS = {
  WHOLE: "Узел целиком",
  BOM: "По составу",
  KIT: "Комплект",
  MIXED: "Смешанный",
  MANUAL: "Ручной вариант",
}

export const COVERAGE_LINE_ROLE_LABELS = {
  MANUAL: "Свободная строка",
  WHOLE: "Узел целиком",
  COMPONENT: "Компонент",
  KIT_ROLE: "Роль комплекта",
}

export const TRASH_ENTITY_LABELS = {
  clients: "Клиент",
  client_contacts: "Контакт клиента",
  client_billing_addresses: "Юридический адрес клиента",
  client_shipping_addresses: "Адрес доставки клиента",
  client_bank_details: "Банковские реквизиты клиента",
  client_equipment_units: "Единица оборудования клиента",
  client_request_revision_items: "Позиция заявки",
  client_request_revision_item_components: "Компонент позиции заявки",
  client_request_revision_item_strategies: "Стратегия позиции заявки",
  client_parts: "Деталь клиента",
  client_part_applications: "Применяемость детали клиента",
  client_part_documents: "Документ детали клиента",

  part_suppliers: "Поставщик",
  supplier_contacts: "Контакт поставщика",
  supplier_addresses: "Адрес поставщика",
  supplier_bank_details: "Банковские реквизиты поставщика",
  supplier_parts: "Деталь поставщика",
  supplier_part_materials: "Материал детали поставщика",
  supplier_part_oem_parts: "Связь детали поставщика с OEM-деталью",
  supplier_part_standard_parts: "Связь детали поставщика со стандартной деталью",
  supplier_part_prices: "Запись цены детали поставщика",
  supplier_price_lists: "Прайс-лист поставщика",
  supplier_price_list_lines: "Строка прайс-листа поставщика",
  supplier_bundles: "Комплект поставщика",
  supplier_bundle_items: "Роль в комплекте поставщика",
  supplier_bundle_item_links: "Связь роли комплекта",

  oem_parts: "OEM-деталь",
  original_part_groups: "Группа OEM-деталей",
  oem_part_model_fitments: "Привязка OEM-детали к модели",
  oem_part_model_bom: "Строка структуры узла",
  oem_part_materials: "Материал OEM-детали",
  oem_part_material_specs: "Спецификация материала OEM-детали",
  oem_part_alt_groups: "Группа альтернатив OEM-детали",
  oem_part_alt_items: "Альтернативная OEM-деталь",
  oem_part_documents: "Документ OEM-детали",
  oem_part_presentation_profiles: "Профиль отображения OEM-детали",
  oem_part_standard_parts: "Связь OEM-детали со стандартной деталью",
  oem_part_unit_overrides: "Индивидуальная настройка OEM-детали",
  client_equipment_unit_bom_overrides: "Индивидуальное отличие BOM машины",
  oem_part_unit_material_overrides: "Индивидуальный материал OEM-детали",
  oem_part_unit_material_specs: "Индивидуальная спецификация материала",

  standard_parts: "Стандартная деталь",
  standard_part_values: "Значение атрибута стандартной детали",
  standard_part_classes: "Класс стандартных деталей",
  standard_part_class_fields: "Поле класса стандартных деталей",
  standard_part_field_options: "Опция поля стандартных деталей",

  materials: "Материал",
  material_properties: "Свойство материала",
  material_property_curves: "Кривая свойства материала",
  material_aliases: "Алиас материала",

  tnved_codes: "Код ТН ВЭД",
  logistics_route_templates: "Шаблон доставки",

  equipment_manufacturers: "Производитель оборудования",
  equipment_models: "Модель оборудования",
  equipment_classifier_nodes: "Узел классификатора оборудования",

  client_requests: "Заявка клиента",
  rfqs: "RFQ",
  rfq_item_components: "Компонент RFQ",
  rfq_scenarios: "Сценарий RFQ",
  rfq_scenario_lines: "Строка сценария RFQ",

  procurement_kpi_targets: "Цель закупочного KPI",
  sales_kpi_targets: "Цель KPI продаж",

  users: "Пользователь",
  roles: "Роль",
  tabs: "Вкладка",
  role_permissions: "Право роли",
  role_capabilities: "Возможность роли",

  active_sessions: "Активная сессия",
  selections_active: "Активный выбор",
  rfqs_active: "Активный RFQ",
  purchase_orders_active: "Активный заказ",
  quality_events_open: "Открытый инцидент качества",
}

export function getTrashEntityLabel(value) {
  if (!value) return "—"
  return TRASH_ENTITY_LABELS[value] || value
}

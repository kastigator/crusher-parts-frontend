import React, { useMemo } from "react"
import { Button, Card, List, Space, Tag, Typography } from "antd"

const { Paragraph, Text } = Typography

export const ROLE_GUIDE = [
  {
    key: "prodavec",
    slug: "prodavec",
    title: "Продавец",
    badge: "Коммерческий контур",
    description:
      "Ведет клиента от заявки до коммерческого предложения и контракта. Не управляет закупкой и заказами поставщикам.",
    responsibilities: [
      "Оформляет и ведет заявку клиента",
      "Готовит и обновляет коммерческое предложение",
      "Согласует и сопровождает контракт с клиентом",
      "При необходимости дополняет клиентские данные из рабочего процесса",
    ],
  },
  {
    key: "zakupshchik",
    slug: "zakupshchik",
    title: "Закупщик",
    badge: "Закупочный контур",
    description:
      "Работает внутри RFQ: поставщики, ответы, покрытие, сценарии, логистика, экономика и заказы поставщикам.",
    responsibilities: [
      "Собирает и ведет RFQ",
      "Обрабатывает ответы поставщиков",
      "Формирует покрытие, сценарии, логистику и экономику",
      "Утверждает выбор и размещает заказы поставщикам",
      "Может дополнять мастер-данные по поставщикам и деталям прямо из RFQ",
    ],
  },
  {
    key: "nachalnik-otdela-zakupok",
    slug: "nachalnik-otdela-zakupok",
    title: "Начальник отдела закупок",
    badge: "Контроль и утверждение",
    description:
      "Видит оба рабочих контура, контролирует каталоги и настройки, принимает управленческие решения.",
    responsibilities: [
      "Контролирует коммерческий и закупочный контур",
      "Проверяет и утверждает спорные решения",
      "Следит за качеством данных в каталогах",
      "Может управлять пользователями, ролями и правами",
    ],
  },
  {
    key: "specialist-po-katalogam",
    slug: "specialist-po-katalogam",
    title: "Специалист по каталогам",
    badge: "Справочники и мастер-данные",
    description:
      "Поддерживает справочники клиентов, поставщиков, деталей и кодов. Обычно не ведет RFQ и клиентский процесс как исполнитель.",
    responsibilities: [
      "Следит за качеством и полнотой каталогов",
      "Создает и правит справочники клиентов, поставщиков и деталей",
      "Поддерживает ТН ВЭД, шаблоны доставки и другие нормативные данные",
    ],
  },
  {
    key: "nablyudatel",
    slug: "nablyudatel",
    title: "Наблюдатель",
    badge: "Просмотр без изменений",
    description:
      "Видит оба рабочих контура и может контролировать ситуацию, но не должен менять ключевые данные и запускать исполнение.",
    responsibilities: [
      "Просматривает заявки, RFQ, логистику и экономику",
      "Следит за статусами процесса и отчетностью",
      "Не создает КП, контракты, PO и не редактирует каталоги",
    ],
  },
  {
    key: "admin",
    slug: "admin",
    title: "Администратор",
    badge: "Системное администрирование",
    description:
      "Отвечает за пользователей, роли, права и техническую работоспособность системы. Не обязательно участвует в бизнес-процессе ежедневно.",
    responsibilities: [
      "Создает и отключает пользователей",
      "Настраивает роли, зоны доступа и действия",
      "Поддерживает целостность системы и справочников прав",
    ],
  },
]

export default function RoleResponsibilityGuide({ selectedRoleSlug, onSelectRole }) {
  const selectedRole = useMemo(
    () => ROLE_GUIDE.find((role) => role.slug === selectedRoleSlug) || ROLE_GUIDE[0],
    [selectedRoleSlug],
  )

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <Space wrap size={[8, 8]}>
        {ROLE_GUIDE.map((role) => (
          <Button
            key={role.key}
            type={selectedRole?.slug === role.slug ? "primary" : "default"}
            onClick={() => onSelectRole?.(role.slug)}
          >
            {role.title}
          </Button>
        ))}
      </Space>

      <Card title={selectedRole.title} extra={<Tag color="blue">{selectedRole.badge}</Tag>}>
        <Paragraph style={{ marginBottom: 12 }}>
          {selectedRole.description}
        </Paragraph>
        <Text strong>За что отвечает:</Text>
        <List
          size="small"
          dataSource={selectedRole.responsibilities}
          renderItem={(item) => <List.Item>{item}</List.Item>}
          style={{ marginTop: 8 }}
        />
      </Card>
    </Space>
  )
}

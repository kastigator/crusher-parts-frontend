import React, { useEffect, useMemo, useState } from 'react'
import {
  Typography,
  Card,
  Row,
  Col,
  Statistic,
  Space,
  Button,
  Tag,
  Table,
  Alert,
  Empty,
} from 'antd'
import { useNavigate } from 'react-router-dom'
import {
  ReloadOutlined,
  PlusOutlined,
  FileTextOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons'
import axios from '../api/axiosInstance'
import { useAuth } from '../auth/AuthContext'

const { Title, Text } = Typography

const ORDER_STATUS_META = {
  draft: { color: 'default', label: 'Черновик' },
  new: { color: 'blue', label: 'Новый' },
  submitted: { color: 'processing', label: 'Отправлен' },
  confirmed: { color: 'success', label: 'Подтверждён' },
  rework: { color: 'orange', label: 'Доработка' },
  cancelled: { color: 'error', label: 'Отменён' },
}

const CONTRACT_STATUS_META = {
  draft: { color: 'default', label: 'Черновик' },
  sent: { color: 'processing', label: 'Отправлен' },
  signed: { color: 'success', label: 'Подписан' },
  cancelled: { color: 'error', label: 'Отменён' },
}

const ATTENTION_LABELS = {
  no_offers: 'Нет офферов',
  awaiting_decision: 'На согласовании',
}

const POLL_INTERVAL_MS = 60000

const HomePage = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchSummary = async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await axios.get('/dashboard/summary')
      setSummary(data)
    } catch (e) {
      console.error('dashboard summary error', e)
      setError('Не удалось загрузить сводку. Проверьте доступ к API.')
    } finally {
      setLoading(false)
    }
  }

  const openOrders = () => {
    navigate('/client-orders')
  }

  const openOrderById = (orderId) => {
    if (!orderId) return
    navigate(`/client-orders?orderId=${encodeURIComponent(orderId)}`)
  }

  useEffect(() => {
    fetchSummary()
  }, [])

  useEffect(() => {
    const summaryTimer = setInterval(fetchSummary, POLL_INTERVAL_MS)
    return () => {
      clearInterval(summaryTimer)
    }
  }, [])

  const stats = summary?.stats || {}
  const scopeLabel = summary?.scope === 'all' ? 'Все заказы' : 'Мои заказы'

  const cards = useMemo(() => {
    const base = [
      {
        key: 'active',
        title: `${scopeLabel} в работе`,
        value: stats.orders_active || 0,
        suffix: 'шт',
      },
      {
        key: 'new',
        title: 'Новые заказы',
        value: stats.orders_new || 0,
        suffix: 'шт',
      },
      {
        key: 'noOffers',
        title: 'Позиции без оффера',
        value: stats.items_without_offers || 0,
        suffix: 'шт',
      },
      {
        key: 'awaiting',
        title: 'На согласовании',
        value: stats.items_awaiting_decision || 0,
        suffix: 'шт',
      },
      {
        key: 'contracts',
        title: 'Контракты в работе',
        value: stats.contracts_in_work || 0,
        suffix: 'шт',
      },
      {
        key: 'contractsNoFile',
        title: 'Контракты без файла',
        value: stats.contracts_no_file || 0,
        suffix: 'шт',
      },
    ]
    if (summary?.is_admin) {
      base.push({
        key: 'unassigned',
        title: 'Заказы без ответственного',
        value: stats.orders_unassigned || 0,
        suffix: 'шт',
      })
    }
    return base
  }, [stats, scopeLabel, summary?.is_admin])

  const attentionData = summary?.attention || []
  const recentOrders = summary?.recent_orders || []
  const recentContracts = summary?.recent_contracts || []

  const openContracts = () => {
    navigate('/client-orders')
  }

  return (
    <div style={{ padding: 24 }}>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Space
          align="center"
          style={{ width: '100%', justifyContent: 'space-between' }}
          wrap
        >
          <div>
            <Title level={3} style={{ marginBottom: 0 }}>
              {user?.full_name || 'Пользователь'}
            </Title>
            <Text type="secondary">Краткая сводка задач и активности</Text>
          </div>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchSummary} loading={loading}>
              Обновить
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/client-orders')}
            >
              Новый заказ
            </Button>
          </Space>
        </Space>

        {error && <Alert type="error" message={error} showIcon />}

        <Row gutter={[16, 16]}>
          {cards.map((card) => (
            <Col key={card.key} xs={24} sm={12} md={8} lg={6}>
              <Card size="small">
                <Statistic title={card.title} value={card.value} suffix={card.suffix} />
              </Card>
            </Col>
          ))}
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={16}>
            <Card
              title="Требуют действий"
              extra={
                <Button size="small" icon={<FileTextOutlined />} onClick={() => openOrders()}>
                  Перейти к заказам
                </Button>
              }
            >
              {attentionData.length ? (
                <Table
                  size="small"
                  rowKey={(row) => `${row.type}-${row.order_id}`}
                  dataSource={attentionData}
                  pagination={false}
                  columns={[
                    {
                      title: 'Заказ',
                      dataIndex: 'order_number',
                      render: (v) => v || '—',
                    },
                    {
                      title: 'Клиент',
                      dataIndex: 'client_company_name',
                      ellipsis: true,
                      render: (v) => v || '—',
                    },
                    {
                      title: 'Причина',
                      dataIndex: 'type',
                      width: 160,
                      render: (v) => (
                        <Tag color={v === 'no_offers' ? 'volcano' : 'orange'}>
                          {ATTENTION_LABELS[v] || v}
                        </Tag>
                      ),
                    },
                    {
                      title: 'Позиции',
                      dataIndex: 'items_count',
                      width: 110,
                      render: (v) => v || 0,
                    },
                    {
                      title: '',
                      key: 'actions',
                      width: 120,
                      render: (_, row) => (
                        <Button size="small" onClick={() => openOrderById(row.order_id)}>
                          Открыть
                        </Button>
                      ),
                    },
                  ]}
                />
              ) : (
                <Empty
                  description="Нет срочных задач"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              )}
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card
              title="Контракты в работе"
              extra={
                <Button size="small" onClick={openContracts}>
                  Все контракты
                </Button>
              }
            >
              {recentContracts.length ? (
                <Table
                  size="small"
                  rowKey="id"
                  dataSource={recentContracts}
                  pagination={false}
                  columns={[
                    {
                      title: 'Контракт',
                      dataIndex: 'contract_number',
                      render: (v) => v || '—',
                    },
                    {
                      title: 'Статус',
                      dataIndex: 'status',
                      width: 110,
                      render: (v) => {
                        const meta = CONTRACT_STATUS_META[v] || { color: 'default', label: v || '—' }
                        return <Tag color={meta.color}>{meta.label}</Tag>
                      },
                    },
                    {
                      title: '',
                      key: 'file',
                      width: 80,
                      render: (_, row) =>
                        row.file_url ? (
                          <Button size="small" onClick={() => window.open(row.file_url, '_blank', 'noopener')}>
                            Файл
                          </Button>
                        ) : (
                          <Tag color="warning">Нет</Tag>
                        ),
                    },
                  ]}
                />
              ) : (
                <Empty description="Контрактов нет" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </Card>
          </Col>
        </Row>

        <Card
          title="Последние заказы"
          extra={
            <Button size="small" icon={<ExclamationCircleOutlined />} onClick={() => openOrders()}>
              Все заказы
            </Button>
          }
        >
          {recentOrders.length ? (
            <Table
              size="small"
              rowKey="id"
              dataSource={recentOrders}
              pagination={false}
              columns={[
                {
                  title: '№',
                  dataIndex: 'order_number',
                  width: 140,
                },
                {
                  title: 'Клиент',
                  dataIndex: 'client_company_name',
                  ellipsis: true,
                  render: (v) => v || '—',
                },
                {
                  title: 'Статус',
                  dataIndex: 'status',
                  width: 140,
                  render: (v) => {
                    const meta = ORDER_STATUS_META[v] || { color: 'default', label: v || '—' }
                    return <Tag color={meta.color}>{meta.label}</Tag>
                  },
                },
                {
                  title: 'Ответственный',
                  dataIndex: 'responsible_name',
                  width: 180,
                  render: (v) => v || <Tag color="warning">Не назначен</Tag>,
                },
                {
                  title: '',
                  key: 'action',
                  width: 110,
                  render: (_, row) => (
                    <Button size="small" onClick={() => openOrderById(row.id)}>
                      Открыть
                    </Button>
                  ),
                },
              ]}
            />
          ) : (
            <Empty description="Заказов нет" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </Card>
      </Space>
    </div>
  )
}

export default HomePage

import React from 'react'
import { Tooltip } from 'antd'
import * as AntIcons from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTabs } from '@/context/TabsContext'

const Sidebar = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { tabs = [], permissions = [], loading } = useTabs()

  const visibleTabs = tabs
    .filter(tab => permissions.includes(tab.id))
    .sort((a, b) => a.sort_order - b.sort_order)

  return (
    <div
      style={{
        width: 64,
        minWidth: 64,       // ✅ фиксированная минимальная ширина
        flexShrink: 0,       // ✅ запрещаем сжатие
        height: '100%',
        backgroundColor: '#f5f5f5',
        borderRight: '1px solid #ddd',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: 8,
        position: 'relative',
        overflow: 'visible'
      }}
    >
      {loading ? (
        <div style={{ fontSize: 12, color: '#aaa' }}>Загрузка...</div>
      ) : visibleTabs.length === 0 ? (
        <Tooltip title="Нет доступных вкладок" placement="right">
          <div style={{ fontSize: 10, color: '#999', textAlign: 'center', padding: 8 }}>
            Нет вкладок
          </div>
        </Tooltip>
      ) : (
        visibleTabs.map(tab => {
          const IconComponent = AntIcons[tab.icon] || AntIcons.QuestionOutlined
          const selected = location.pathname === tab.path || location.pathname === `/${tab.path}`

          return (
            <Tooltip
              key={tab.id}
              title={tab.name || 'Вкладка'}
              placement="right"
              mouseEnterDelay={0.3}
              styles={{ root: { zIndex: 9999 } }}
            >
              <div
                onClick={() => navigate(tab.path.startsWith('/') ? tab.path : `/${tab.path}`)}
                style={{
                  padding: '12px 0',
                  width: '100%',
                  color: selected ? '#2563eb' : '#444',
                  backgroundColor: selected ? '#e0e0e0' : 'transparent',
                  display: 'flex',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <IconComponent style={{ fontSize: 20 }} />
              </div>
            </Tooltip>
          )
        })
      )}
    </div>
  )
}

export default Sidebar

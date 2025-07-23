import { useEffect, useState } from 'react'
import axios from '@/api/axiosInstance'

export default function useRoles() {
  const [roles, setRoles] = useState([])

  useEffect(() => {
    let cancelled = false

    const fetchRoles = async () => {
      try {
        const res = await axios.get('/roles')
        if (!cancelled && Array.isArray(res.data)) {
          const options = res.data
            .filter(role => role.slug !== 'admin') // не показываем админа
            .map(role => ({
              value: role.id,
              label: role.name
            }))
            .sort((a, b) => a.label.localeCompare(b.label))
          setRoles(options)
        }
      } catch (err) {
        console.error('Ошибка загрузки ролей:', err)
      }
    }

    fetchRoles()
    return () => { cancelled = true }
  }, [])

  return roles
}

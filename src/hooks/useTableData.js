import { useEffect, useState } from "react"
import axios from "@/api/axiosInstance"

export default function useTableData(endpoint, queryParams = {}) {
  const [data, setData] = useState([])
  const [newRow, setNewRow] = useState({})

  const fetchData = async () => {
  try {
    const res = await axios.get(endpoint, { params: queryParams })
    console.log("📡 useTableData → response:", res.data) // 🔍 добавлено
    setData(res.data || [])
  } catch (error) {
    console.error("Ошибка загрузки данных:", error)
  }
}


  useEffect(() => {
    fetchData()
  }, [endpoint, JSON.stringify(queryParams)])

  const onAdd = async () => {
    try {
      const payload = { ...newRow, ...queryParams } // ✅ фикс
      await axios.post(endpoint, payload)
      setNewRow({})
      await fetchData()
    } catch (error) {
      console.error("Ошибка при добавлении:", error)
    }
  }

  const onSave = async (updatedRow) => {
    try {
      await axios.put(`${endpoint}/${updatedRow.id}`, updatedRow)
      await fetchData()
    } catch (error) {
      console.error("Ошибка при сохранении:", error)
    }
  }

  const onDelete = async (rowToDelete) => {
    try {
      await axios.delete(`${endpoint}/${rowToDelete.id}`)
      await fetchData()
    } catch (error) {
      console.error("Ошибка при удалении:", error)
    }
  }

  return {
    data,
    setData,
    newRow,
    setNewRow,
    onAdd,
    onSave,
    onDelete
  }
}

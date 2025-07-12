import React, { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Box, Typography, LinearProgress } from '@mui/material'

const MarkdownViewer = ({ src }) => {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(src)
      .then((res) => res.text())
      .then(setContent)
      .catch(() => setContent('# Ошибка загрузки'))
      .finally(() => setLoading(false))
  }, [src])

  if (loading) return <LinearProgress />

  return (
    <Box p={3}>
      <ReactMarkdown>{content}</ReactMarkdown>
    </Box>
  )
}

export default MarkdownViewer

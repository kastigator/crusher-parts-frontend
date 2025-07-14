import React from 'react'
import {
  Box, Stack, Typography, TextField, IconButton, Tooltip, Button
} from '@mui/material'
import {
  Add as AddIcon,
  FileUpload as ImportIcon,
  FileDownload as ExportIcon,
  Refresh as RefreshIcon,
  RestartAlt as ResetIcon
} from '@mui/icons-material'

export default function TableToolbar({
  title,
  onAddClick,
  onImportClick,
  onExport,
  onRefresh,
  onResetFilters,
  filterValue,
  onFilterChange,
  filterComponent,
  importTemplateUrl,
  actionsRight
}) {
  return (
    <Box sx={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      mb: 2,
      gap: 2,
      flexWrap: 'wrap'
    }}>
      {/* Левая часть: заголовок и фильтры */}
      <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
        {title && (
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
        )}
        {filterValue !== undefined && onFilterChange && (
          <TextField
            size="small"
            placeholder="Поиск..."
            value={filterValue}
            onChange={(e) => onFilterChange(e.target.value)}
            sx={{ minWidth: 200 }}
          />
        )}
        {filterComponent}
      </Stack>

      {/* Правая часть: действия */}
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
        {onResetFilters && (
          <Tooltip title="Сбросить фильтры">
            <IconButton onClick={onResetFilters}><ResetIcon /></IconButton>
          </Tooltip>
        )}
        {onRefresh && (
          <Tooltip title="Обновить">
            <IconButton onClick={onRefresh}><RefreshIcon /></IconButton>
          </Tooltip>
        )}
        {onExport && (
          <Tooltip title="Экспорт">
            <IconButton onClick={onExport}><ExportIcon /></IconButton>
          </Tooltip>
        )}
        {onImportClick && (
          <Tooltip title="Импорт">
            <IconButton onClick={onImportClick}><ImportIcon /></IconButton>
          </Tooltip>
        )}
        {importTemplateUrl && (
          <Tooltip title="Скачать шаблон">
            <IconButton component="a" href={importTemplateUrl} download>
              <ImportIcon />
            </IconButton>
          </Tooltip>
        )}
        {onAddClick && (
          <Tooltip title="Добавить">
            <IconButton onClick={onAddClick}><AddIcon /></IconButton>
          </Tooltip>
        )}
        {actionsRight}
      </Stack>
    </Box>
  )
}

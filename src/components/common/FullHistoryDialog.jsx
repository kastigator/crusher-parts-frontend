import React from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Table, TableHead, TableRow, TableCell, TableBody, Typography
} from '@mui/material'
import fieldLabels, { entityLabels } from "@/constants/fieldLabels"

export default function FullHistoryDialog({ open, onClose, logs = [] }) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle>История изменений клиента</DialogTitle>
      <DialogContent>
        {logs.length === 0 ? (
          <Typography variant="body2" sx={{ mt: 1 }}>
            Изменений не найдено.
          </Typography>
        ) : (
          <Table size="small" sx={{ mt: 1 }}>
            <TableHead>
              <TableRow>
                <TableCell>Сущность</TableCell>
                <TableCell>Поле</TableCell>
                <TableCell>Было</TableCell>
                <TableCell>Стало</TableCell>
                <TableCell>Пользователь</TableCell>
                <TableCell>Дата</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.map((log, index) => (
                <TableRow key={index}>
                  <TableCell>
                    {entityLabels[log.entity_type] || log.entity_type}
                  </TableCell>
                  <TableCell>
                    {fieldLabels[log.field_changed] || log.field_changed}
                  </TableCell>
                  <TableCell>{log.old_value ?? '—'}</TableCell>
                  <TableCell>{log.new_value ?? '—'}</TableCell>
                  <TableCell>{log.user_name || '—'}</TableCell>
                  <TableCell>
                    {new Date(log.created_at).toLocaleString('ru-RU')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Закрыть</Button>
      </DialogActions>
    </Dialog>
  )
}

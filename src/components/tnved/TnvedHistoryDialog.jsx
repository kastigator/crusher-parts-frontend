import React from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Table, TableHead, TableRow, TableCell, TableBody, Typography
} from '@mui/material'

// Только актуальные поля
const fieldLabels = {
  code: 'Код',
  description: 'Описание',
  duty_rate: 'Пошлина (%)',
  notes: 'Примечания'
}

export default function TnvedHistoryDialog({ open, onClose, logs }) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>История изменений</DialogTitle>
      <DialogContent>
        {logs.length === 0 ? (
          <Typography variant="body2" sx={{ mt: 1 }}>
            Изменений не найдено.
          </Typography>
        ) : (
          <Table size="small" sx={{ mt: 1 }}>
            <TableHead>
              <TableRow>
                <TableCell>Пользователь</TableCell>
                <TableCell>Поле</TableCell>
                <TableCell>Было</TableCell>
                <TableCell>Стало</TableCell>
                <TableCell>Дата</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.map((log, index) => (
                <TableRow key={index}>
                  <TableCell>{log.user_name || '—'}</TableCell>
                  <TableCell>{fieldLabels[log.field_changed] || log.field_changed || '—'}</TableCell>
                  <TableCell>{log.old_value ?? '—'}</TableCell>
                  <TableCell>{log.new_value ?? '—'}</TableCell>
                  <TableCell>{new Date(log.created_at).toLocaleString()}</TableCell>
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

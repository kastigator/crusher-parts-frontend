// src/utils/confirmAction.js

import Swal from 'sweetalert2'
import withReactContent from 'sweetalert2-react-content'

const MySwal = withReactContent(Swal)

export async function confirmAction(input = {}) {
  const options = typeof input === 'string' ? { title: input } : input

  const {
    title = 'Вы уверены?',
    text = '',
    confirmLabel = 'Ок',
    cancelLabel = 'Отмена',
    icon = 'question',
    inputType = null,         // например: 'text' | 'password'
    inputLabel = '',
    inputPlaceholder = '',
    inputRequired = false,
    allowOutsideClick = false
  } = options

  const result = await MySwal.fire({
    title,
    html: text
      ? `<p style="margin-top: 0.6em; font-size: 14px; color: #444;">${text}</p>`
      : '',
    icon,
    input: inputType,
    inputLabel,
    inputPlaceholder,
    inputAttributes: {
      autocapitalize: 'off',
      autocomplete: 'off'
    },
    showCancelButton: true,
    confirmButtonText: confirmLabel,
    cancelButtonText: cancelLabel,
    confirmButtonColor: '#2563eb',
    cancelButtonColor: '#e0e0e0',
    width: 420,
    padding: '1.6em',
    background: '#fff',
    allowOutsideClick,
    customClass: {
      popup: 'sweet-dialog',
      title: 'sweet-title',
      actions: 'sweet-actions',
      confirmButton: 'sweet-confirm',
      cancelButton: 'sweet-cancel'
    },
    preConfirm: (val) => {
      if (inputRequired && !val) {
        Swal.showValidationMessage('Введите значение или оставьте пустым')
        return false
      }
      return val
    }
  })

  return {
    confirmed: result.isConfirmed,
    inputValue: result.value
  }
}

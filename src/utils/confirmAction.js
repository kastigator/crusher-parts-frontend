import Swal from 'sweetalert2'
import withReactContent from 'sweetalert2-react-content'

const MySwal = withReactContent(Swal)

export async function confirmAction(input = {}) {
  // ✅ Поддержка и строки, и объекта
  const options = typeof input === 'string' ? { title: input } : input

  const {
    title = 'Вы уверены?',
    text = '',
    confirmButtonText = 'Удалить',
    cancelButtonText = 'Отмена',
    icon = 'question'
  } = options

  const result = await MySwal.fire({
    title,
    html: text
      ? `<p style="margin-top: 0.6em; font-size: 14px; color: #444;">${text}</p>`
      : '',
    icon,
    width: 420,
    padding: '1.6em',
    background: '#fff',
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText,
    confirmButtonColor: '#2563eb',
    cancelButtonColor: '#e0e0e0',
    customClass: {
      popup: 'sweet-dialog',
      title: 'sweet-title',
      actions: 'sweet-actions',
      confirmButton: 'sweet-confirm',
      cancelButton: 'sweet-cancel'
    }
  })

  return result.isConfirmed
}

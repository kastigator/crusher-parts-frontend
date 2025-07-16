import Swal from 'sweetalert2'
import withReactContent from 'sweetalert2-react-content'

const MySwal = withReactContent(Swal)

export async function confirmAction({
  title = 'Вы уверены?',
  text = '',
  confirmButtonText = 'Удалить',
  cancelButtonText = 'Отмена',
  icon = 'question' // 🎯 более нейтрально, чем 'warning'
} = {}) {
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
    confirmButtonColor: '#2563eb',  // primary
    cancelButtonColor: '#e0e0e0',    // neutral
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

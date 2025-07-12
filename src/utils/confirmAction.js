import Swal from 'sweetalert2'
import withReactContent from 'sweetalert2-react-content'

const MySwal = withReactContent(Swal)

export async function confirmAction({
  title = 'Вы уверены?',
  text = '',
  confirmButtonText = 'Удалить',
  cancelButtonText = 'Отмена',
  icon = 'warning'
} = {}) {
  const result = await MySwal.fire({
    title,
    html: `<p style="margin-top: 0.4em; font-size: 14px; color: #444;">${text}</p>`,
    icon,
    width: 400,
    padding: '1.4em',
    background: '#fff',
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText,
    confirmButtonColor: '#e53935',
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

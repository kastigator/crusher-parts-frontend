// src/utils/tablePagination.js
/**
 * Унифицированные настройки пагинации для AntD Table.
 *
 * Использование:
 *   const [page, setPage] = useState(1)
 *   const [pageSize, setPageSize] = useState(10)
 *   const [total, setTotal] = useState(0)
 *
 *   const pagination = useMemo(
 *     () =>
 *       createTablePagination({
 *         page,
 *         pageSize,
 *         total,
 *         setPage,
 *         setPageSize,
 *         getPopupContainer: () => wrapRef.current || document.body, // опционально
 *       }),
 *     [page, pageSize, total]
 *   )
 */
const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

export default function createTablePagination({
  page,
  pageSize,
  total = 0,
  setPage,
  setPageSize,
  getPopupContainer,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
}) {
  const safeTotal = Number.isFinite(Number(total)) ? Number(total) : 0
  const opts = pageSizeOptions

  const config = {
    current: page,
    pageSize,
    total: safeTotal,
    showSizeChanger: true,
    pageSizeOptions: opts,
    onChange: (nextPage, nextSize) => {
      const sizeNum =
        typeof nextSize === "number"
          ? nextSize
          : Number(nextSize || pageSize)

      if (!Number.isFinite(sizeNum)) {
        // на всякий случай — просто меняем страницу
        setPage(nextPage)
        return
      }

      // если изменился размер страницы — сбрасываем на первую
      if (sizeNum !== pageSize) {
        setPage(1)
        setPageSize(sizeNum)
      } else {
        setPage(nextPage)
      }
    },
    showTotal: (t, [from, to]) => `Всего: ${t} · Показано: ${from}–${to}`,
  }

  if (typeof getPopupContainer === "function") {
    config.selectProps = { getPopupContainer }
  }

  return config
}

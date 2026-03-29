import { useEffect, useState } from "react"

const getScrollEl = (wrapper) => {
  if (!wrapper) return null
  return (
    wrapper.querySelector(".ant-table-body") ||
    wrapper.querySelector(".ant-table-content") ||
    null
  )
}

const getInnerTableEl = (wrapper, scrollEl) => {
  if (!wrapper) return null
  return (
    scrollEl?.querySelector?.(".ant-table") ||
    wrapper.querySelector(".ant-table") ||
    scrollEl?.firstElementChild ||
    null
  )
}

export default function useTableScrollHints(wrapperRef, deps = []) {
  const [hints, setHints] = useState({ left: false, right: false })

  useEffect(() => {
    const wrapper = wrapperRef?.current
    if (!wrapper) {
      setHints({ left: false, right: false })
      return undefined
    }

    const scrollEl = getScrollEl(wrapper)
    if (!scrollEl) {
      setHints({ left: false, right: false })
      return undefined
    }
    const innerTableEl = getInnerTableEl(wrapper, scrollEl)

    let raf = 0
    const update = () => {
      const { scrollLeft, scrollWidth, clientWidth } = scrollEl
      const hasLeft = scrollLeft > 2
      const hasRight = scrollLeft + clientWidth < scrollWidth - 2
      setHints((prev) =>
        prev.left === hasLeft && prev.right === hasRight
          ? prev
          : { left: hasLeft, right: hasRight }
      )
    }

    const onScroll = () => {
      if (raf) cancelAnimationFrame(raf)
      raf = requestAnimationFrame(update)
    }

    update()
    scrollEl.addEventListener("scroll", onScroll, { passive: true })

    let resizeObserver = null
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(update)
      resizeObserver.observe(scrollEl)
      resizeObserver.observe(wrapper)
      if (innerTableEl) resizeObserver.observe(innerTableEl)
    }

    return () => {
      if (raf) cancelAnimationFrame(raf)
      scrollEl.removeEventListener("scroll", onScroll)
      if (resizeObserver) resizeObserver.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return hints
}

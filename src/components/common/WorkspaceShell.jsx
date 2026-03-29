import React from "react"

export default function WorkspaceShell({
  listPane,
  detailPane,
  listWidth = 420,
  mode = "split",
}) {
  if (mode === "stacked") {
    return (
      <div className="workspace-shell workspace-shell--stacked">
        <section className="workspace-shell__stacked-list">{listPane}</section>
        <section className="workspace-shell__stacked-detail">{detailPane}</section>
      </div>
    )
  }

  return (
    <div
      className="workspace-shell"
      style={{ "--workspace-list-width": `${listWidth}px` }}
    >
      <aside className="workspace-shell__list">{listPane}</aside>
      <section className="workspace-shell__detail">{detailPane}</section>
    </div>
  )
}

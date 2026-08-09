import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8")

test("Client Request routing and navigation use Wave 1 capabilities", () => {
  const router = read("src", "router", "AppRouter.jsx")
  const sidebar = read("src", "components", "Sidebar.jsx")
  assert.match(router, /capability="client_requests\.access"/)
  assert.match(sidebar, /can\("client_requests\.access"\)/)
})

test("Client Request workspace exposes identification and release while downstream is read-only", () => {
  const workspace = read("src", "components", "clientRequests", "ClientRequestWorkspaceCard.jsx")
  const overview = read("src", "features", "clientRequests", "components", "ClientRequestOverview.jsx")
  assert.match(workspace, /ClientRequestIdentificationPanel/)
  assert.match(workspace, /ClientRequestReleasePanel/)
  assert.doesNotMatch(workspace, /RequestCommercialFlowTabContent|RequestProcurementTabContent|RequestExecutionTabContent/)
  assert.match(overview, /Состояние последующих этапов — только для чтения/)
})

test("Procurement Release API is explicit and capability-gated in UI", () => {
  const api = read("src", "features", "clientRequests", "api", "clientRequestsApi.js")
  const release = read("src", "features", "clientRequests", "components", "ClientRequestReleasePanel.jsx")
  assert.match(api, /axios\.post\("\/procurement-releases"/)
  assert.match(api, /\/finalize/)
  assert.match(release, /client_requests\.release_to_procurement/)
  assert.match(release, /client_requests\.manage_revisions/)
})

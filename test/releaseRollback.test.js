import test from 'node:test'
import assert from 'node:assert/strict'
import { cpSync, mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import {
  resolveReleaseMetadata,
  verifyReleaseDirectory,
  writeReleaseManifest,
} from '../build/releaseManifest.js'

function makeRelease(root, name, buildId, content) {
  const dir = path.join(root, name)
  mkdirSync(dir)
  writeFileSync(path.join(dir, 'index.html'), content)
  writeReleaseManifest(
    dir,
    resolveReleaseMetadata({
      VITE_RELEASE_COMMIT_SHA: `commit-${buildId}`,
      VITE_RELEASE_BUILD_ID: buildId,
      VITE_RELEASE_PUBLICATION_ID: buildId,
    })
  )
  return dir
}

test('a previous immutable frontend snapshot remains independently verifiable', () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'crusher-rollback-'))
  const previous = makeRelease(root, 'previous', 'build-previous', '<div>previous</div>')
  makeRelease(root, 'current', 'build-current', '<div>current</div>')

  const restored = path.join(root, 'restored-root')
  cpSync(previous, restored, { recursive: true })

  const restoredManifest = verifyReleaseDirectory(restored)
  assert.equal(restoredManifest.buildId, 'build-previous')
  assert.equal(restoredManifest.commitSha, 'commit-build-previous')
})

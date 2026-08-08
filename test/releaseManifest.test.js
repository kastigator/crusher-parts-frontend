import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import {
  resolveReleaseMetadata,
  verifyReleaseDirectory,
  writeReleaseManifest,
} from '../build/releaseManifest.js'

function fixtureDir() {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'crusher-release-'))
  mkdirSync(path.join(dir, 'assets'))
  writeFileSync(path.join(dir, 'index.html'), '<div id="root"></div>')
  writeFileSync(path.join(dir, 'assets', 'app.js'), 'console.log("fixture")')
  return dir
}

test('release manifest is deterministic and contains sorted asset hashes', () => {
  const dir = fixtureDir()
  const metadata = resolveReleaseMetadata({
    VITE_RELEASE_COMMIT_SHA: 'commit-123',
    VITE_RELEASE_BUILD_ID: 'build-456',
    VITE_RELEASE_PUBLICATION_ID: 'publication-789',
    SECRET_VALUE: 'must-not-appear',
  })

  const first = writeReleaseManifest(dir, metadata)
  const second = writeReleaseManifest(dir, metadata)
  const verified = verifyReleaseDirectory(dir)

  assert.deepEqual(first, second)
  assert.deepEqual(verified.assets.map((asset) => asset.path), [
    'assets/app.js',
    'index.html',
  ])
  assert.match(verified.assets[0].sha256, /^[a-f0-9]{64}$/)
  assert.equal(readFileSync(path.join(dir, 'release.json'), 'utf8').includes('must-not-appear'), false)
})

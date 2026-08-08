import path from 'node:path'
import { verifyReleaseDirectory } from '../build/releaseManifest.js'

const target = path.resolve(process.argv[2] || 'dist')

try {
  const manifest = verifyReleaseDirectory(target)
  console.log(
    `release ok: commit=${manifest.commitSha} build=${manifest.buildId} publication=${manifest.publicationId} assets=${manifest.assets.length}`
  )
} catch (error) {
  console.error(`release verification failed: ${error.message}`)
  process.exitCode = 1
}

import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import process from 'node:process'
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const UNKNOWN = 'unknown'
const MANIFEST_FILE = 'release.json'
const SAFE_IDENTIFIER = /^[A-Za-z0-9._:/@-]+$/
const MAX_IDENTIFIER_LENGTH = 256

export function safeIdentifier(value, fallback = UNKNOWN) {
  if (typeof value !== 'string') return fallback
  const normalized = value.trim()
  if (
    !normalized ||
    normalized.length > MAX_IDENTIFIER_LENGTH ||
    !SAFE_IDENTIFIER.test(normalized)
  ) {
    return fallback
  }
  return normalized
}

function readPackageVersion() {
  const moduleDir = path.dirname(fileURLToPath(import.meta.url))
  const pkg = JSON.parse(readFileSync(path.join(moduleDir, '..', 'package.json'), 'utf8'))
  return safeIdentifier(pkg.version)
}

export function readGitCommit(cwd = process.cwd()) {
  try {
    return safeIdentifier(
      execFileSync('git', ['rev-parse', 'HEAD'], {
        cwd,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      })
    )
  } catch {
    return UNKNOWN
  }
}

export function resolveReleaseMetadata(env = process.env, gitCommit = readGitCommit()) {
  const commitSha = safeIdentifier(
    env.VITE_RELEASE_COMMIT_SHA || env.RELEASE_COMMIT_SHA || env.COMMIT_SHA || gitCommit
  )
  const localBuildId = commitSha === UNKNOWN ? UNKNOWN : `local-${commitSha.slice(0, 12)}`
  const buildId = safeIdentifier(
    env.VITE_RELEASE_BUILD_ID || env.RELEASE_BUILD_ID || env.BUILD_ID,
    localBuildId
  )

  return Object.freeze({
    schemaVersion: 1,
    application: 'crusher-parts-frontend',
    applicationVersion: readPackageVersion(),
    commitSha,
    buildId,
    publicationId: safeIdentifier(
      env.VITE_RELEASE_PUBLICATION_ID || env.RELEASE_PUBLICATION_ID,
      buildId
    ),
  })
}

function walkFiles(rootDir, currentDir = rootDir) {
  return readdirSync(currentDir)
    .flatMap((name) => {
      const absolutePath = path.join(currentDir, name)
      if (statSync(absolutePath).isDirectory()) return walkFiles(rootDir, absolutePath)
      return [absolutePath]
    })
    .filter((absolutePath) => path.relative(rootDir, absolutePath) !== MANIFEST_FILE)
    .sort((a, b) => path.relative(rootDir, a).localeCompare(path.relative(rootDir, b)))
}

export function collectAssetRecords(outDir) {
  return walkFiles(outDir).map((absolutePath) => {
    const bytes = readFileSync(absolutePath)
    return {
      path: path.relative(outDir, absolutePath).split(path.sep).join('/'),
      size: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    }
  })
}

export function writeReleaseManifest(outDir, metadata = resolveReleaseMetadata()) {
  if (!existsSync(outDir)) throw new Error(`Build output does not exist: ${outDir}`)

  const manifest = {
    ...metadata,
    assets: collectAssetRecords(outDir),
  }
  writeFileSync(path.join(outDir, MANIFEST_FILE), `${JSON.stringify(manifest, null, 2)}\n`)
  return manifest
}

export function verifyReleaseDirectory(outDir) {
  const manifestPath = path.join(outDir, MANIFEST_FILE)
  if (!existsSync(manifestPath)) throw new Error(`Missing ${MANIFEST_FILE}`)

  const actual = JSON.parse(readFileSync(manifestPath, 'utf8'))
  const expectedAssets = collectAssetRecords(outDir)
  if (JSON.stringify(actual.assets) !== JSON.stringify(expectedAssets)) {
    throw new Error('Release asset hashes do not match the manifest')
  }
  for (const key of ['commitSha', 'buildId', 'publicationId']) {
    if (safeIdentifier(actual[key]) !== actual[key]) {
      throw new Error(`Invalid release identifier: ${key}`)
    }
  }
  return actual
}

export function releaseManifestPlugin() {
  let outDir

  return {
    name: 'crusher-release-manifest',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir)
    },
    closeBundle() {
      writeReleaseManifest(outDir)
    },
  }
}

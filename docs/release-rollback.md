# Frontend release identity and rollback

## Release identity

Each Vite build writes `dist/release.json` with the source commit, Cloud Build
id, publication id and SHA-256 for every published asset. Cloud Build verifies
those hashes before upload.

The existing `frontend-parts-site` bucket remains the hosting target. Before
updating the bucket root, Cloud Build copies the exact build to:

```text
gs://frontend-parts-site/releases/$BUILD_ID/
```

The current release is observable at the existing site origin as
`release.json`; no business UI is changed.

## Non-destructive preflight

List release candidates and inspect a manifest without changing the site:

```bash
gsutil ls gs://frontend-parts-site/releases/
gsutil cat gs://frontend-parts-site/releases/ROLLBACK_BUILD_ID/release.json
```

Confirm the expected commit/build/publication identifiers and keep the selected
manifest in the deployment or incident record.

## Application rollback

Restore a verified snapshot to the existing bucket root. The command does not
use `-d`: stale hashed assets may remain temporarily, while `index.html` points
only to the restored release assets and rollback snapshots remain untouched.

```bash
gsutil -m rsync -r gs://frontend-parts-site/releases/ROLLBACK_BUILD_ID gs://frontend-parts-site
gsutil setmeta -h 'Cache-Control:no-cache, no-store, must-revalidate' gs://frontend-parts-site/index.html gs://frontend-parts-site/release.json
```

Then fetch `release.json`, confirm `ROLLBACK_BUILD_ID`, and run the existing
read-only login/navigation smoke. This procedure changes application artifacts
only and never rolls back Cloud SQL.

The local `releaseRollback.test.js` test proves that an older snapshot remains
self-contained and hash-verifiable after a newer release exists.

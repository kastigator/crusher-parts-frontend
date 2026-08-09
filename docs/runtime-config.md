# Frontend runtime configuration

The application attempts to load `config.json` relative to the deployed HTML before React starts. A missing or unreachable file preserves the existing Vite build-time values, so the current GCS production release path remains compatible. A present but invalid file stops bootstrap.

Schema version 1 contains `apiBaseUrl` and the `dadata` / `yandexMaps` browser integration objects. Integration modes are `live` and `disabled`. Browser API keys are browser-visible configuration, never server credentials.

The container image renders `deploy/config.json.template` through the standard nginx entrypoint using `APP_API_BASE_URL`, `APP_DADATA_MODE`, `APP_DADATA_BROWSER_API_KEY`, `APP_YANDEX_MAPS_MODE`, and `APP_YANDEX_MAPS_BROWSER_API_KEY`. Staging/recovery should set both integrations to `disabled` unless isolated non-production keys are deliberately supplied.

`release.json` remains the immutable Slice 0.1 release identity. Runtime `config.json` is environment-specific and must be captured and hashed separately in deployment evidence; it must not alter the release manifest.

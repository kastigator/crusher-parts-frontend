import test from 'node:test'
import assert from 'node:assert/strict'

import {
  __setRuntimeConfigForTests,
  getBrowserIntegration,
  loadRuntimeConfig,
  normalizeRuntimeConfig,
} from '../src/config/runtimeConfig.js'
import loadYandexMaps from '../src/utils/loadYandexMaps.js'
import fetchBankByBic from '../src/utils/fetchBankByBic.js'

const fallback = {
  schemaVersion: 1,
  apiBaseUrl: 'https://production-api.example.test',
  integrations: {
    dadata: { mode: 'live', apiKey: 'production-browser-key' },
    yandexMaps: { mode: 'live', apiKey: 'production-map-browser-key' },
  },
}

test('404 runtime config preserves the existing build-time production defaults', async () => {
  const config = await loadRuntimeConfig({
    fallback,
    documentBase: 'https://storage.googleapis.com/bucket/release/index.html',
    fetchImpl: async () => ({ status: 404, ok: false }),
  })
  assert.equal(config.apiBaseUrl, 'https://production-api.example.test')
  assert.equal(config.integrations.yandexMaps.mode, 'live')
})

test('valid runtime config overrides API origin and can disable browser integrations', async () => {
  const config = await loadRuntimeConfig({
    fallback,
    documentBase: 'https://staging.example.test/app/',
    fetchImpl: async (url, options) => {
      assert.equal(url, 'https://staging.example.test/app/config.json')
      assert.equal(options.cache, 'no-store')
      return {
        status: 200,
        ok: true,
        json: async () => ({
          schemaVersion: 1,
          apiBaseUrl: 'https://staging-api.example.test',
          integrations: {
            dadata: { mode: 'disabled' },
            yandexMaps: { mode: 'disabled' },
          },
        }),
      }
    },
  })
  assert.equal(config.apiBaseUrl, 'https://staging-api.example.test')
  assert.deepEqual(config.integrations.dadata, { mode: 'disabled', apiKey: '' })
})

test('unsafe and malformed runtime configurations fail bootstrap', async () => {
  assert.throws(
    () => normalizeRuntimeConfig({ apiBaseUrl: 'http://staging.example.test' }, fallback),
    /must use https/
  )
  await assert.rejects(
    loadRuntimeConfig({ fallback, fetchImpl: async () => ({ status: 200, ok: true, json: async () => { throw new Error('bad json') } }) }),
    /not valid JSON/
  )
  assert.throws(
    () => normalizeRuntimeConfig({
      apiBaseUrl: 'https://staging-api.example.test',
      integrations: { yandexMaps: { mode: 'live' } },
    }, fallback),
    /apiKey is required/
  )
})

test('disabled Yandex and DaData integrations perform no outbound request', async () => {
  __setRuntimeConfigForTests({
    apiBaseUrl: 'https://staging-api.example.test',
    integrations: { dadata: { mode: 'disabled' }, yandexMaps: { mode: 'disabled' } },
  }, fallback)
  let called = false
  assert.equal(await loadYandexMaps({ windowRef: {}, documentRef: null }), null)
  assert.equal(await fetchBankByBic('044525225', { fetchImpl: async () => { called = true } }), null)
  assert.equal(called, false)
  assert.equal(getBrowserIntegration('dadata').apiKey, '')
})

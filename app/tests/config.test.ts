import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig, publicSecretLeaks } from '../lib/config';

const env = { PAYPAL_ENV: 'sandbox', PAYPAL_CLIENT_ID: 'id', PAYPAL_CLIENT_SECRET: 's', NEBIUS_API_KEY: 'k' };

test('boots in sandbox with the sandbox base URL', () => {
  assert.equal(loadConfig(env).paypalBase, 'https://api-m.sandbox.paypal.com');
});
test('throws when PAYPAL_ENV is not sandbox', () => {
  assert.throws(() => loadConfig({ ...env, PAYPAL_ENV: 'live' }));
  assert.throws(() => loadConfig({ ...env, PAYPAL_ENV: undefined }));
});
test('throws when the base URL is overridden to non-sandbox', () => {
  assert.throws(() => loadConfig({ ...env, PAYPAL_API_BASE: 'https://api-m.paypal.com' }));
});
test('throws when creds are missing', () => { assert.throws(() => loadConfig({ PAYPAL_ENV: 'sandbox' })); });
test('flags NEXT_PUBLIC_ secrets', () => {
  assert.deepEqual(publicSecretLeaks({ NEXT_PUBLIC_PAYPAL_SECRET: 'x', NEXT_PUBLIC_TITLE: 'y', NEXT_PUBLIC_API_KEY: 'z' }), ['NEXT_PUBLIC_PAYPAL_SECRET', 'NEXT_PUBLIC_API_KEY']);
  assert.throws(() => loadConfig({ ...env, NEXT_PUBLIC_NEBIUS_TOKEN: 'x' }));
});
test('no NEXT_PUBLIC_ secrets in the current process env', () => { assert.deepEqual(publicSecretLeaks(process.env), []); });

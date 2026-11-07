// Login redirects must point at the public host. Behind Render's proxy the request URL is the internal
// http://localhost:10000; building the redirect from it sent real users to localhost after the passcode.
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { POST } from '../app/api/login/route';
import { COOKIE, sessionToken } from '../lib/gate';
import { publicUrl } from '../lib/origin';

const INTERNAL = 'http://localhost:10000/api/login';
const PUBLIC = 'https://duespilot.onrender.com';
const post = (passcode: string) => POST(new Request(INTERNAL, {
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded', host: 'duespilot.onrender.com', 'x-forwarded-proto': 'https' },
  body: new URLSearchParams({ passcode }),
}));
const saved = { r: process.env.RENDER_EXTERNAL_URL, p: process.env.PUBLIC_URL };
afterEach(() => {
  if (saved.r === undefined) delete process.env.RENDER_EXTERNAL_URL; else process.env.RENDER_EXTERNAL_URL = saved.r;
  if (saved.p === undefined) delete process.env.PUBLIC_URL; else process.env.PUBLIC_URL = saved.p;
});

test('login on Render: wrong passcode -> 303 to the public /login?bad=1, no cookie', async () => {
  process.env.DEMO_PASSCODE = 'correct horse';
  process.env.RENDER_EXTERNAL_URL = PUBLIC;
  delete process.env.PUBLIC_URL;
  const r = await post('nope');
  assert.equal(r.status, 303);
  assert.equal(r.headers.get('location'), `${PUBLIC}/login?bad=1`);
  assert.equal(r.headers.get('set-cookie'), null);
});

test('login on Render: right passcode -> 303 to the public /, session cookie set, never localhost', async () => {
  process.env.DEMO_PASSCODE = 'correct horse';
  process.env.RENDER_EXTERNAL_URL = PUBLIC;
  delete process.env.PUBLIC_URL;
  const r = await post('correct horse');
  assert.equal(r.status, 303);
  assert.equal(r.headers.get('location'), `${PUBLIC}/`);
  assert.ok(!String(r.headers.get('location')).includes('localhost'));
  assert.match(String(r.headers.get('set-cookie')), new RegExp(`^${COOKIE}=${sessionToken('correct horse')};`));
});

test('publicUrl: PUBLIC_URL beats RENDER_EXTERNAL_URL; neither set -> the request origin (local dev)', () => {
  process.env.RENDER_EXTERNAL_URL = PUBLIC;
  process.env.PUBLIC_URL = 'https://demo.example.com';
  assert.equal(publicUrl('/x?y=1', INTERNAL).href, 'https://demo.example.com/x?y=1');
  delete process.env.PUBLIC_URL;
  delete process.env.RENDER_EXTERNAL_URL;
  assert.equal(publicUrl('/', 'http://localhost:3000/api/login').href, 'http://localhost:3000/');
});

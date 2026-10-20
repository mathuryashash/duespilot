// Boot guard (BLOCKER 6): sandbox only, secrets server-side only.
import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import path from 'node:path';

const SANDBOX = 'https://api-m.sandbox.paypal.com';
type Env = Record<string, string | undefined>;

export const publicSecretLeaks = (env: Env) => Object.keys(env).filter((k) => /^NEXT_PUBLIC_.*(SECRET|KEY|TOKEN)/.test(k));

export function loadConfig(env: Env) {
  if (env.PAYPAL_ENV !== 'sandbox') throw new Error('Refusing to boot: PAYPAL_ENV must be "sandbox"');
  const paypalBase = env.PAYPAL_API_BASE ?? SANDBOX;
  if (paypalBase !== SANDBOX) throw new Error('Refusing to boot: PayPal base URL must be the sandbox');
  const leaks = publicSecretLeaks(env);
  if (leaks.length) throw new Error(`Refusing to boot: secret-looking NEXT_PUBLIC_ vars: ${leaks.join(', ')}`);
  for (const k of ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET', 'NEBIUS_API_KEY']) if (!env[k]) throw new Error(`Missing ${k}`);
  return {
    paypalBase,
    clientId: env.PAYPAL_CLIENT_ID!,
    clientSecret: env.PAYPAL_CLIENT_SECRET!,
    nebiusKey: env.NEBIUS_API_KEY!,
    model: env.LLM_MODEL ?? 'nvidia/nemotron-3-super-120b-a12b',
    allowedDomain: env.RECIPIENT_DOMAIN ?? 'personal.example.com',
    buyerEmail: env.DEMO_BUYER_EMAIL ?? 'sb-ajpsl53458040@personal.example.com',
    webhookId: env.PAYPAL_WEBHOOK_ID ?? '',
    allowSim: env.DEMO_ALLOW_SIM === '1',
  };
}
export type Config = ReturnType<typeof loadConfig>;

let cached: Config | undefined;
// Local dev: secrets live in the repo-root .env (gitignored), one level above app/.
export function config(): Config {
  if (!cached) {
    const f = path.resolve(process.cwd(), '..', '.env');
    // Project .env wins over ambient shell vars (the dev shell may carry unrelated PAYPAL_* values).
    if (existsSync(f)) Object.assign(process.env, parseEnv(readFileSync(f, 'utf8')));
    cached = loadConfig(process.env);
  }
  return cached;
}

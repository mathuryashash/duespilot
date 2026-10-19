// Spike: toolkit + AI SDK + Nebius provider resolve and typecheck together.
// No network: generateText is only called when RUN_LLM=1 (never in this spike).
import { PayPalAgentToolkit } from '@paypal/agent-toolkit/ai-sdk';
import { generateText } from 'ai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

// Read-only allowlist (security-scope BLOCKER 2a). Never ALL_TOOLS_ENABLED.
export const READ_ONLY_ACTIONS = {
  invoices: { list: true, get: true, search: true },
  disputes: { list: true, get: true },
  transactions: { list: true },
};
export const ALLOWED_TOOL_NAMES = [
  'list_invoices', 'get_invoice', 'search_invoicing',
  'list_disputes', 'get_dispute', 'list_transactions',
];

const toolkit = new PayPalAgentToolkit({
  clientId: process.env.PAYPAL_CLIENT_ID ?? 'dummy',
  clientSecret: process.env.PAYPAL_CLIENT_SECRET ?? 'dummy',
  configuration: { actions: READ_ONLY_ACTIONS, context: { sandbox: true } },
});

const nebius = createOpenAICompatible({
  name: 'nebius',
  baseURL: 'https://api.tokenfactory.nebius.com/v1/',
  apiKey: process.env.NEBIUS_API_KEY ?? 'dummy',
});
const model = nebius(process.env.LLM_MODEL ?? 'nvidia/nemotron-3-super-120b-a12b');

const tools = toolkit.getTools();
const names = Object.keys(tools).sort();
const bad = names.filter((n) => !ALLOWED_TOOL_NAMES.includes(n));
console.log('tools:', names.join(', '));
if (bad.length) throw new Error('non-allowlisted tools exposed: ' + bad.join(','));
console.log('allowlist OK');

if (process.env.RUN_LLM === '1') {
  const r = await generateText({ model, tools, maxSteps: 3, prompt: 'List my 5 most recent invoices.' });
  console.log(r.text, r.toolCalls);
}

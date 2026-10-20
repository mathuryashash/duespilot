// Read-only PayPal toolkit (BLOCKER 2a). Never ALL_TOOLS_ENABLED. Writes go through lib/paypal.ts behind approve.
import { PayPalAgentToolkit } from '@paypal/agent-toolkit/ai-sdk';

export const READ_ONLY_ACTIONS = {
  invoices: { list: true, get: true, search: true },
  disputes: { list: true, get: true },
  transactions: { list: true },
};
export const ALLOWED_TOOL_NAMES = ['list_invoices', 'get_invoice', 'search_invoicing', 'list_disputes', 'get_dispute', 'list_transactions'];

export const readOnlyToolkit = (clientId: string, clientSecret: string) =>
  new PayPalAgentToolkit({ clientId, clientSecret, configuration: { actions: READ_ONLY_ACTIONS, context: { sandbox: true } } });

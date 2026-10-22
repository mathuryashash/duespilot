// "Reset demo": clears negotiations, pending approvals, audit and the simulated clock. Keeps tracked PayPal invoices
// (they are real sandbox objects), the PayPal write log and webhook dedupe ids. all=true also forgets the invoices.
import { audit, type Store } from './store';

export const resetDemo = (store: Store, o: { all?: boolean } = {}) => store.update((s) => {
  s.pending = {}; s.negotiations = {}; s.audit = []; s.clock_days = 0;
  if (o.all) s.invoices = {};
  else for (const i of Object.values(s.invoices)) i.reminders = [];
  audit(s, `demo reset${o.all ? ' (all, invoices forgotten)' : ''}`);
});

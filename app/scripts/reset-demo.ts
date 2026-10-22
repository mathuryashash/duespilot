// npm run reset-demo [-- --all]: same as the Reset demo button, run against DATABASE_PATH (default data/duespilot.db).
import path from 'node:path';
import { sqliteStore } from '../lib/store';
import { resetDemo } from '../lib/reset';

const all = process.argv.includes('--all');
const file = process.env.DATABASE_PATH ?? path.resolve(process.cwd(), 'data', 'duespilot.db');
const store = sqliteStore(file);
resetDemo(store, { all }).then(async () => {
  const s = await store.read();
  console.log(`reset ${all ? '(all) ' : ''}${file}: ${Object.keys(s.invoices).length} tracked invoices kept`);
  store.close();
});

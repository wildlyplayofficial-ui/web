/** One-off: translate the thesis (vi/th/es → pick_content) for existing picks.
 *  Usage: railway run npx tsx scripts/backfill-thesis.ts [pick_id]
 *  No args = every non-draft pick still missing pick_content rows. */
import 'dotenv/config';
import { publishThesisTranslations } from '../src/translate';
import { createStore } from '../src/store';
import { log } from '../src/log';

const store = createStore(process.env);
const env = { apiKey: process.env.ANTHROPIC_API_KEY, model: process.env.RECAP_MODEL };
const pickId = process.argv[2];

if (pickId) {
  const pick = await store.getPick(pickId);
  if (!pick) {
    log.error(`no pick found with id ${pickId}`);
    process.exit(1);
  }
  await publishThesisTranslations({ store, env }, pick);
} else {
  const picks = await store.listByStatus(['published', 'won', 'lost', 'push', 'void']);
  const translated = await store.listPickContentPickIds();
  const missing = picks.filter((p) => !translated.has(p.id));
  log.info(`translating ${missing.length} of ${picks.length} non-draft picks (rest already have pick_content)`);
  for (const pick of missing) {
    await publishThesisTranslations({ store, env }, pick);
  }
}
log.info('backfill done');

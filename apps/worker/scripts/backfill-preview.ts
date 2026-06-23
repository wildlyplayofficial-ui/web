/** One-off: regenerate the newsroom preview for a pick whose original
 *  generation failed (12/6 timeout). Usage: railway run npx tsx scripts/backfill-preview.ts <pick_id> */
import 'dotenv/config';
import { publishPreview } from '../src/preview';
import { createStore } from '../src/store';
import { log } from '../src/log';

const pickId = process.argv[2];
if (!pickId) {
  log.error('usage: tsx scripts/backfill-preview.ts <pick_id>');
  process.exit(1);
}

const store = createStore(process.env);
const pick = await store.getPick(pickId);
if (!pick) {
  log.error(`no pick found with id ${pickId}`);
  process.exit(1);
}
await publishPreview({ store, env: { apiKey: process.env.ANTHROPIC_API_KEY, model: process.env.RECAP_MODEL } }, pick);
log.info('backfill done');

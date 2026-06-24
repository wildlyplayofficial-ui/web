import { getServiceSupabase } from "@/lib/goalline/supabase";

/**
 * POST /api/goalline/seed-tick
 * Gradual seed: adds a few fake picks every 30 minutes until target reached.
 * Called by cron (Vercel or external). Protected by REVALIDATE_SECRET.
 *
 * Design: 35 seed picks spread over ~12 hours ≈ 1-2 picks per tick.
 * Idempotent: counts existing seeds, only adds up to the target for current time.
 */

const TARGET_SEEDS = 35;
const SPREAD_HOURS = 12; // Spread seeds over 12 hours after card creation
const TICK_INTERVAL_MIN = 30; // Called every 30 minutes

const ANIMALS = [
  "Penguin", "Hedgehog", "Otter", "Panda", "Koala", "Fox", "Owl", "Dolphin",
  "Tiger", "Bear", "Wolf", "Eagle", "Lion", "Rabbit", "Turtle", "Falcon",
  "Seal", "Lynx", "Raven", "Jaguar", "Hawk", "Moose", "Badger", "Crane",
  "Gecko", "Heron", "Ibis", "Jackal", "Kite", "Lemur", "Marten", "Newt",
  "Osprey", "Parrot", "Quail", "Rhino", "Stork", "Toucan", "Urchin", "Viper",
];

export async function POST(request: Request): Promise<Response> {
  const secret = request.headers.get("x-revalidate-secret");
  if (!secret || secret !== process.env.REVALIDATE_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = getServiceSupabase();
  if (!sb) return Response.json({ error: "DB not configured" }, { status: 500 });

  // Find open cards that need seeding
  const { data: cards } = await sb
    .from("gl_daily_cards")
    .select("id, card_number, over_odds, under_odds, created_at, cutoff_time_utc")
    .in("status", ["open", "scheduled"])
    .order("utc_date", { ascending: true });

  if (!cards || cards.length === 0) {
    return Response.json({ message: "No open cards to seed" });
  }

  const results: Array<{ card: number; added: number; total: number; target: number }> = [];

  for (const card of cards) {
    // Count existing seed picks for this card
    const { count: existingSeeds } = await sb
      .from("gl_picks")
      .select("id", { count: "exact", head: true })
      .eq("daily_card_id", card.id)
      .in("user_id",
        (await sb.from("gl_users").select("id").eq("is_seed", true)).data?.map(
          (u: { id: string }) => u.id,
        ) ?? [],
      );

    // Actually, simpler: count picks where user device_id starts with 'seed-'
    const { data: seedPicks } = await sb
      .from("gl_picks")
      .select("id, user_id")
      .eq("daily_card_id", card.id);

    let currentSeedCount = 0;
    if (seedPicks) {
      for (const pick of seedPicks) {
        const { data: user } = await sb
          .from("gl_users")
          .select("is_seed")
          .eq("id", pick.user_id)
          .single();
        if (user?.is_seed) currentSeedCount++;
      }
    }

    // Calculate how many seeds SHOULD exist by now (gradual ramp)
    const cardCreated = new Date(card.created_at).getTime();
    const elapsed = Date.now() - cardCreated;
    const elapsedHours = elapsed / (1000 * 60 * 60);
    const progress = Math.min(elapsedHours / SPREAD_HOURS, 1);
    const targetNow = Math.round(TARGET_SEEDS * progress);

    const toAdd = Math.max(0, targetNow - currentSeedCount);

    if (toAdd === 0) {
      results.push({ card: card.card_number, added: 0, total: currentSeedCount, target: targetNow });
      continue;
    }

    // Calculate implied probability for realistic split
    const overProb = 1 / card.over_odds;
    const underProb = 1 / card.under_odds;
    const totalProb = overProb + underProb;
    const overPct = overProb / totalProb;

    let added = 0;
    for (let i = 0; i < toAdd; i++) {
      const idx = currentSeedCount + i;
      const animalIdx = idx % ANIMALS.length;
      const suffix = idx >= ANIMALS.length ? `${Math.floor(idx / ANIMALS.length) + 1}` : "";
      const displayName = `Anonymous ${ANIMALS[animalIdx]}${suffix}`;
      const deviceId = `seed-${card.card_number}-${idx}-${crypto.randomUUID().slice(0, 8)}`;

      // Slight random time offset (within last 30 min window)
      const jitterMs = Math.random() * TICK_INTERVAL_MIN * 60 * 1000;
      const pickTime = new Date(Date.now() - jitterMs).toISOString();

      const { data: user } = await sb
        .from("gl_users")
        .insert({
          type: "guest",
          display_name: displayName,
          device_id: deviceId,
          is_seed: true,
          created_at: pickTime,
        })
        .select("id")
        .single();

      if (!user) continue;

      const side = Math.random() < overPct ? "over" : "under";
      const odds = side === "over" ? card.over_odds : card.under_odds;

      const { error } = await sb
        .from("gl_picks")
        .insert({
          user_id: user.id,
          daily_card_id: card.id,
          side,
          stake_points: 100,
          odds_locked: odds,
          status: "locked",
          created_at: pickTime,
        });

      if (!error) added++;
    }

    results.push({
      card: card.card_number,
      added,
      total: currentSeedCount + added,
      target: targetNow,
    });
  }

  return Response.json({ results });
}

import { getServiceSupabase } from "@/lib/supabase-server";

/**
 * POST /api/admin/seed-picks?cardNumber=2&count=40
 * Seeds fake picks for a Daily Line card to avoid cold start.
 * Creates anonymous users + picks with realistic Over/Under split.
 * Protected by REVALIDATE_SECRET.
 */

const ANIMALS = [
  "Penguin", "Hedgehog", "Otter", "Panda", "Koala", "Fox", "Owl", "Dolphin",
  "Tiger", "Bear", "Wolf", "Eagle", "Lion", "Rabbit", "Turtle", "Falcon",
  "Seal", "Lynx", "Raven", "Jaguar", "Hawk", "Moose", "Badger", "Crane",
  "Gecko", "Heron", "Ibis", "Jackal", "Kite", "Lemur", "Marten", "Newt",
  "Osprey", "Parrot", "Quail", "Rhino", "Stork", "Toucan", "Urchin", "Viper",
  "Walrus", "Yak", "Zebra", "Alpaca", "Bison", "Cobra", "Dingo", "Ermine",
];

export async function POST(request: Request): Promise<Response> {
  const secret = request.headers.get("x-revalidate-secret");
  if (!secret || secret !== process.env.REVALIDATE_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const cardNumber = parseInt(url.searchParams.get("cardNumber") ?? "", 10);
  const count = Math.min(parseInt(url.searchParams.get("count") ?? "40", 10), 100);

  if (isNaN(cardNumber)) {
    return Response.json({ error: "Missing cardNumber" }, { status: 400 });
  }

  const sb = getServiceSupabase();
  if (!sb) return Response.json({ error: "DB not configured" }, { status: 500 });

  // Find the card
  const { data: card, error: cardErr } = await sb
    .from("gl_daily_cards")
    .select("id, over_odds, under_odds, status")
    .eq("card_number", cardNumber)
    .single();

  if (cardErr || !card) {
    return Response.json({ error: "Card not found" }, { status: 404 });
  }

  // Calculate implied probability for realistic split
  const overProb = 1 / card.over_odds;
  const underProb = 1 / card.under_odds;
  const totalProb = overProb + underProb;
  const overPct = overProb / totalProb; // % picking over

  let created = 0;
  let skipped = 0;

  for (let i = 0; i < count; i++) {
    const animalIdx = i % ANIMALS.length;
    const suffix = i >= ANIMALS.length ? `${Math.floor(i / ANIMALS.length) + 1}` : "";
    const displayName = `Anonymous ${ANIMALS[animalIdx]}${suffix}`;
    const deviceId = `seed-${cardNumber}-${i}-${crypto.randomUUID().slice(0, 8)}`;

    // Stagger timestamps over a 4-hour window so picks look organic
    const spreadMs = 4 * 60 * 60 * 1000;
    const staggeredAt = new Date(Date.now() - spreadMs + Math.random() * spreadMs).toISOString();

    // Create seed user (flagged for metric exclusion)
    const { data: user, error: userErr } = await sb
      .from("gl_users")
      .insert({
        type: "guest",
        display_name: displayName,
        device_id: deviceId,
        is_seed: true,
        created_at: staggeredAt,
      })
      .select("id")
      .single();

    if (userErr || !user) { skipped++; continue; }

    // Pick side based on implied probability + some noise
    const rand = Math.random();
    const side = rand < overPct ? "over" : "under";
    const odds = side === "over" ? card.over_odds : card.under_odds;

    // Insert pick
    const { error: pickErr } = await sb
      .from("gl_picks")
      .insert({
        user_id: user.id,
        daily_card_id: card.id,
        side,
        stake_points: 100,
        odds_locked: odds,
        status: "locked",
        created_at: staggeredAt,
      });

    if (pickErr) { skipped++; continue; }
    created++;
  }

  return Response.json({
    message: `Seeded ${created} picks for Card #${cardNumber}`,
    created,
    skipped,
    overPct: Math.round(overPct * 100),
  });
}

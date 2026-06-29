/**
 * Transparency Report — full pipeline.
 * Pulls data → fills template → delegates localization → publishes to Supabase.
 * Usage: node scripts/transparency-report-publish.mjs [--from YYYY-MM-DD] [--to YYYY-MM-DD] [--publish] [--dry-run]
 * Defaults to previous month. --publish writes to DB, --dry-run (default) just outputs.
 */
import { createClient } from "../apps/web/node_modules/@supabase/supabase-js/dist/index.mjs";
import { execFileSync } from "child_process";
import { writeFileSync, readFileSync, unlinkSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const ROOT = import.meta.dirname + "/..";
const varsJson = execFileSync("railway", ["variables", "--json"], {
  encoding: "utf-8",
  cwd: ROOT,
});
const vars = JSON.parse(varsJson);
const supabase = createClient(vars.SUPABASE_URL, vars.SUPABASE_SERVICE_ROLE_KEY);

const MONTHS_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function parseArgs() {
  const args = process.argv.slice(2);
  let from, to, publish = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--from" && args[i + 1]) from = args[++i];
    if (args[i] === "--to" && args[i + 1]) to = args[++i];
    if (args[i] === "--publish") publish = true;
  }
  if (!from) {
    const now = new Date();
    now.setMonth(now.getMonth() - 1);
    from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  }
  if (!to) {
    const d = new Date(from);
    d.setMonth(d.getMonth() + 1);
    d.setDate(0);
    to = d.toISOString().slice(0, 10);
  }
  return { from, to, publish };
}

function calcCLV(oddsPublish, oddsClose) {
  if (!oddsClose || oddsClose === 0) return null;
  return ((oddsPublish / oddsClose) - 1) * 100;
}

function periodLabel(from) {
  const d = new Date(from);
  return `${MONTHS_EN[d.getMonth()]} ${d.getFullYear()}`;
}

function periodSlug(from) {
  const d = new Date(from);
  return `${MONTHS_EN[d.getMonth()].toLowerCase()}-${d.getFullYear()}`;
}

async function pullData(from, to) {
  const { data: picks, error } = await supabase
    .from("picks")
    .select("*")
    .gte("kickoff_utc", `${from}T00:00:00Z`)
    .lte("kickoff_utc", `${to}T23:59:59Z`)
    .order("kickoff_utc", { ascending: true });

  if (error) { console.error("DB error:", error.message); process.exit(1); }

  const settled = picks.filter(p =>
    ["won", "lost", "push", "half-won", "half-lost"].includes(p.status)
  );
  const wins = settled.filter(p => p.status === "won" || p.status === "half-won");
  const losses = settled.filter(p => p.status === "lost" || p.status === "half-lost");

  const totalPL = settled.reduce((s, p) => s + (p.units_pl ?? 0), 0);
  const withCLV = settled.filter(p => p.odds_close != null);
  const clvValues = withCLV.map(p => calcCLV(p.odds_publish, p.odds_close));
  const avgCLV = clvValues.length > 0
    ? clvValues.reduce((s, v) => s + v, 0) / clvValues.length
    : null;

  const pickRows = settled.map(p => {
    const clv = calcCLV(p.odds_publish, p.odds_close);
    return `| ${p.kickoff_utc?.slice(0, 10)} | ${p.home_team} vs ${p.away_team} | ${p.selection} | ${p.odds_publish} | ${p.odds_close ?? "—"} | ${clv !== null ? (clv > 0 ? "+" : "") + clv.toFixed(1) + "%" : "—"} | ${p.home_score}-${p.away_score} | ${p.status} | ${p.units_pl > 0 ? "+" : ""}${p.units_pl} |`;
  });

  return {
    settled: settled.length,
    won: wins.length,
    lost: losses.length,
    win_rate: settled.length > 0 ? (wins.length / settled.length * 100).toFixed(1) : "0",
    pl: totalPL > 0 ? `+${totalPL.toFixed(2)}` : totalPL.toFixed(2),
    avg_clv: avgCLV !== null ? avgCLV.toFixed(2) : "N/A",
    clv_count: withCLV.length,
    pickRows,
  };
}

function fillTemplate(data, period) {
  const picksTable = [
    "| Date | Match | Selection | Odds | Close | CLV | Result | Status | P/L |",
    "|------|-------|-----------|------|-------|-----|--------|--------|-----|",
    ...data.pickRows,
  ].join("\n");

  return `# WildlyPlay Transparency Report — ${period}

We publish our full record — wins, losses, and the value behind every call — because an honest track record is the whole point. No cherry-picked screenshots.

## The numbers (settled picks)

- **Picks settled:** ${data.settled}
- **Win rate:** ${data.win_rate}% (${data.won} won, ${data.lost} lost)
- **Profit / Loss:** ${data.pl} units
- **Average Closing Line Value:** +${data.avg_clv}% (across ${data.clv_count} picks with recorded closing odds)

## What actually matters: CLV

A ${data.win_rate}% win rate is encouraging — but over a small sample, win rate is noisy. The number we watch is **CLV**: did we get a better price than the market's final, most-informed line? Our average **+${data.avg_clv}% CLV** means we're beating the close on average — not every pick, and we show the ones that don't. It's the strongest *early* signal that the edge is real, not just a hot streak. [Why CLV matters](/guides/what-is-closing-line-value).

## Honest caveats

- ${data.settled} settled bets is a small sample. Variance is real — a winning month isn't proof of a long-term edge.
- Only ${data.clv_count} of ${data.settled} picks have recorded closing odds; we're tightening logging so every pick carries CLV.
- Past results never guarantee future ones. We make no "sure win" promises. [Responsible play](/guides/responsible-play-guide).

## Every pick, on the record

${picksTable}

For each call we publish the odds we took, the closing line, and the result. That's the difference between *showing you an edge* and just *showing you winning screenshots*.

→ [Daily Line](/daily-line) · [Full archive](/archive)`;
}

function localizeLinkPrefixes(body, lang) {
  if (lang === "en") return body;
  return body.replace(
    /\]\(\/(guides|daily-line|archive|news|about|matches|standings|stats)([\)/])/g,
    `](/${lang}/$1$2`
  );
}

function translateBody(enBody, lang) {
  const langNames = { vi: "Vietnamese", th: "Thai", es: "Spanish" };
  const taskFile = join(tmpdir(), `wp_translate_${lang}_${Date.now()}.txt`);
  const task = `Translate this betting analysis transparency report from English to ${langNames[lang]}. Keep ALL markdown formatting, links, numbers, team names, and the table structure exactly as-is. Only translate the narrative text. Do NOT translate "WildlyPlay", "CLV", team names, or URLs. Output ONLY the translated markdown, no preamble.\n\n${enBody}`;

  writeFileSync(taskFile, task);
  const result = execFileSync("python3", [
    `${process.env.HOME}/.claude/tools/delegate.py`,
    "--model", "translate",
    "--task", task,
  ], { encoding: "utf-8", maxBuffer: 1024 * 1024 });

  try { unlinkSync(taskFile); } catch {}
  return result.trim();
}

async function publishPost(slug, lang, title, body, metaTitle, metaDesc) {
  const { data: existing } = await supabase
    .from("posts")
    .select("id")
    .eq("slug", slug)
    .eq("lang", lang)
    .single();

  const row = {
    slug,
    lang,
    type: "guide",
    title,
    body_md: body,
    meta_title: metaTitle,
    meta_description: metaDesc,
    status: "published",
    published_at: new Date().toISOString(),
    pick_ids: [],
  };

  if (existing) {
    const { error } = await supabase.from("posts").update(row).eq("id", existing.id);
    if (error) throw new Error(`Update ${lang}/${slug}: ${error.message}`);
    console.error(`UPDATED ${lang}/${slug}`);
  } else {
    const { error } = await supabase.from("posts").insert(row);
    if (error) throw new Error(`Insert ${lang}/${slug}: ${error.message}`);
    console.error(`INSERTED ${lang}/${slug}`);
  }
}

async function main() {
  const { from, to, publish } = parseArgs();
  const period = periodLabel(from);
  const pSlug = periodSlug(from);
  const slug = pSlug;

  console.error(`Report: ${period} (${from} → ${to})`);
  console.error(`Slug: ${slug}`);
  console.error(`Mode: ${publish ? "PUBLISH" : "DRY-RUN"}\n`);

  const data = await pullData(from, to);
  if (data.settled === 0) {
    console.error("No settled picks in period. Aborting.");
    process.exit(0);
  }

  const enBody = fillTemplate(data, period);
  console.error(`EN body: ${enBody.length} chars, ${data.settled} picks in table`);

  if (!publish) {
    console.log(enBody);
    console.error("\nDry run complete. Add --publish to write to DB.");
    return;
  }

  const metaDesc = `Our full betting record for ${period}: ${data.settled} picks settled, ${data.win_rate}% win rate, ${data.pl} units, +${data.avg_clv}% average CLV. Wins, losses, and the value behind every call — public.`;

  await publishPost(
    slug, "en",
    `WildlyPlay Transparency Report — ${period}`,
    enBody,
    `WildlyPlay Transparency Report — ${period} | Open Track Record`,
    metaDesc,
  );

  for (const lang of ["vi", "th", "es"]) {
    console.error(`Translating → ${lang}...`);
    const translated = translateBody(enBody, lang);
    const localized = localizeLinkPrefixes(translated, lang);

    const titleMap = {
      vi: `Báo Cáo Minh Bạch WildlyPlay — ${period}`,
      th: `รายงานความโปร่งใส WildlyPlay — ${period}`,
      es: `Informe de Transparencia WildlyPlay — ${period}`,
    };

    await publishPost(
      slug, lang,
      titleMap[lang],
      localized,
      titleMap[lang] + " | Open Track Record",
      metaDesc,
    );
  }

  console.error(`\nDone. Published ${slug} in 4 languages.`);
  console.error(`URLs:`);
  console.error(`  https://www.wildlyplay.com/transparency/${slug}`);
  console.error(`  https://www.wildlyplay.com/vi/transparency/${slug}`);
  console.error(`  https://www.wildlyplay.com/th/transparency/${slug}`);
  console.error(`  https://www.wildlyplay.com/es/transparency/${slug}`);
}

main().catch(e => { console.error("FATAL:", e.message); process.exit(1); });

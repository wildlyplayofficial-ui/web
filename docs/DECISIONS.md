# Product decisions

Source: Playbook (Nick) + QnA answered 11/6/2026 + group chat 11/6/2026.

| # | Decision | Detail |
|---|---|---|
| 1 | Persona | **The Curator @ WildlyPlay** — human picks matches/markets, AI operates everything else. Disclosed 100% (Playbook §8.3). |
| 2 | Settlement | Win is win, loss is loss — even on half lines. Odds snapshot at publish. Real AH math + units P/L shown alongside for transparency. |
| 3 | Track record | Starts at 0. No seeded history. |
| 4 | Forum | Built day 1, behind feature flag. Enable at ~200 daily visitors. |
| 5 | Markets | EN + VI at launch. `/id` dropped (Kominfo risk). `/th` phase 2, `/es` phase 3. |
| 6 | Data budget | $30-50/mo approved for API-Football + odds data. |
| 7 | Domain/socials | Already secured. Existing site: Astro static on Vercel. |
| 8 | Launch | WC 2026 = internal dry-run (run by Nick/Peter). Public launch mid-August 2026, PL season start. |
| 9 | Donations | Crypto only. USDT TRC-20: `TQGw1vmaVX7fWoJDSjBk7zgc8TRSP8ZC3G` (reuse from wildlyplay.com/donate). |
| 10 | Human gate | At the FRONT of the pipeline only: Curator submits pick via Telegram bot, everything downstream is automatic. No morning approval gate. |
| 11 | Pick frequency | Not fixed. Zero-pick days are normal — Board must handle empty days gracefully. |
| 12 | Monetization | Phase 1 free, no bookmaker affiliates ever. Premium options stay open for phase 2 (after one full season of track record). |
| 13 | Web v1 scope | Board / Play detail / Record-Archive / About-Donate-Responsible. Recap pages + Newsroom display = later phase. (Nick, group 11/6) |
| 14 | Public record | W-L-P shown WITH real units P/L (e.g. 12-8-2, +6.4u) — transparent even when negative. (Nick, group 11/6) |
| 15 | Play detail transparency | Full thesis + odds at publish + stake units all public. (Nick, group 11/6) |
| 16 | Recaps in DB | AI recaps (EN/VI) stored in `posts` as drafts from day 1; web display comes in a later phase. (Nick, group 11/6) |
| 17 | Crowd poll | Follow/Fade/Skip ships in web v1 on the Board (not gated with forum). (Nick, group 11/6) |
| 18 | Deploy path | Build Next.js → beta.wildlyplay.com in parallel → Nick reviews → swap main domain. Astro stays live until swap. (Nick, group 11/6) |
| 19 | Pick-driven Newsroom | AI articles are generated ONLY from a Curator pick: bilingual preview auto-publishes when /pick lands, long-form recap article auto-publishes after settlement (supersedes #16 draft-only). Source material = pick data + thesis only, no invented facts; "Human-picked, AI-written." disclosure; AI failure never blocks the pick or the result announcement. (Nick, group 12/6: "TỰ publish thẳng") |

## Competitor reference: AsianBookie (beta.asianbookie.com, reviewed 11/6/2026)

**Nick's instruction (11/6): do NOT copy AsianBookie — build strictly to the WildlyPlay
playbook.** These notes are background awareness only, not feature inputs.

Observed there: virtual-currency tipster seasons + leaderboards, Hot Picks social proof,
compact AH/OU/1X2 day board. Their weakness (bookmaker promo spam in forums, wall-to-wall
casino ads) confirms our wedge: clean, no affiliates, transparent per-pick record.

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

## Competitor reference: AsianBookie (beta.asianbookie.com, reviewed 11/6/2026)

**Nick's instruction (11/6): do NOT copy AsianBookie — build strictly to the WildlyPlay
playbook.** These notes are background awareness only, not feature inputs.

Observed there: virtual-currency tipster seasons + leaderboards, Hot Picks social proof,
compact AH/OU/1X2 day board. Their weakness (bookmaker promo spam in forums, wall-to-wall
casino ads) confirms our wedge: clean, no affiliates, transparent per-pick record.

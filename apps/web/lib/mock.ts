import type { Pick, Post } from "./types";

/**
 * Typed mock data used until the Supabase project exists.
 * Dates are generated relative to "now" so the Daily Board always demonstrates
 * a same-day pick, and the archive shows realistic recent history.
 *
 * Includes one half-win (Japan +0.25, FT 0-0) to demonstrate decision #2:
 * badge says WON, units P/L shows the real +0.48u (half stake at 1.96).
 */

function dayAt(offsetDays: number, hourUtc: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  d.setUTCHours(hourUtc, 0, 0, 0);
  return d.toISOString();
}

export const mockPicks: Pick[] = [
  {
    id: "00000000-0000-4000-8000-000000000004",
    fixture_id: 1300004,
    league: "FIFA World Cup 2026 — Group A",
    kickoff_utc: dayAt(0, 19), // today
    home_team: "Mexico",
    away_team: "South Africa",
    market: "ah",
    selection: "Mexico -0.75",
    line: -0.75,
    odds_publish: 1.92,
    stake_units: 1,
    thesis:
      "Opening night at the Azteca, 87,000 behind them, and South Africa concede first in 7 of their last 9. Hosts cover the -0.75 before the hour mark.",
    status: "published",
    published_at: dayAt(0, 9),
    home_score: null,
    away_score: null,
    raw_outcome: null,
    units_pl: null,
    settled_at: null,
  },
  {
    id: "00000000-0000-4000-8000-000000000003",
    fixture_id: 1300003,
    league: "International Friendly",
    kickoff_utc: dayAt(-1, 18),
    home_team: "Brazil",
    away_team: "Senegal",
    market: "1x2",
    selection: "Brazil win",
    line: null,
    odds_publish: 1.7,
    stake_units: 1,
    thesis:
      "Full-strength Brazil in their final tune-up; Senegal resting four starters. Short price, but the gap is real.",
    status: "lost",
    published_at: dayAt(-1, 8),
    home_score: 1,
    away_score: 1,
    raw_outcome: "loss",
    units_pl: -1.0,
    settled_at: dayAt(-1, 20),
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    fixture_id: 1300002,
    league: "International Friendly",
    kickoff_utc: dayAt(-2, 11),
    home_team: "Japan",
    away_team: "Colombia",
    market: "ah",
    selection: "Japan +0.25",
    line: 0.25,
    odds_publish: 1.96,
    stake_units: 1,
    thesis:
      "Japan unbeaten in 11 at home and Colombia flying in 48 hours before kickoff. The quarter-line plus is the value side.",
    status: "won", // display rule: half-win shows as WON
    published_at: dayAt(-2, 6),
    home_score: 0,
    away_score: 0,
    raw_outcome: "half_win", // 0-0 on +0.25: half push, half win
    units_pl: 0.48, // (1u / 2) * (1.96 - 1)
    settled_at: dayAt(-2, 13),
  },
  {
    id: "00000000-0000-4000-8000-000000000001",
    fixture_id: 1300001,
    league: "International Friendly",
    kickoff_utc: dayAt(-3, 19),
    home_team: "England",
    away_team: "Croatia",
    market: "ou",
    selection: "Over 2.5",
    line: 2.5,
    odds_publish: 1.85,
    stake_units: 1,
    thesis:
      "Both camps said it out loud: this is an attacking rehearsal, not a result game. Overs in England's last 6 friendlies.",
    status: "won",
    published_at: dayAt(-3, 9),
    home_score: 3,
    away_score: 1,
    raw_outcome: "win",
    units_pl: 0.85,
    settled_at: dayAt(-3, 21),
  },
];

const recap1En = `## England 3-1 Croatia — Over 2.5 lands early

The Curator called this an "attacking rehearsal, not a result game" and both benches obliged.
England were 2-0 up inside 35 minutes and the over was sealed before the hour.

**The play:** Over 2.5 @ 1.85 — **WON**, +0.85u.

### What we saw

- England pressed high from minute one; Croatia's makeshift back line never settled.
- Three different scorers — exactly the kind of open, low-stakes friendly the line underestimated.

The board moves to **1-0-0**, +0.85u. Every pick stays public, forever.`;

const recap1Vi = `## Anh 3-1 Croatia — Tài 2.5 về sớm

The Curator gọi trận này là "buổi tổng duyệt tấn công, không phải trận đấu vì kết quả" và cả hai đội đã chứng minh điều đó.
Anh dẫn 2-0 trong 35 phút đầu và kèo tài được chốt trước giờ thứ 60.

**Kèo:** Tài 2.5 @ 1.85 — **THẮNG**, +0.85u.

### Những gì đã diễn ra

- Anh pressing tầm cao từ phút đầu; hàng thủ chắp vá của Croatia không kịp ổn định.
- Ba cầu thủ ghi bàn khác nhau — đúng kiểu trận giao hữu cởi mở mà nhà cái đã đánh giá thấp.

Bảng thành tích: **1-0-0**, +0.85u. Mọi kèo đều công khai, vĩnh viễn.`;

const recap2En = `## Japan 0-0 Colombia — the quarter-line does its job

A goalless slog in Tokyo, and exactly why The Curator took **Japan +0.25** instead of the
draw-no-bet: the quarter line turns a stalemate into a half-win.

**The play:** Japan +0.25 @ 1.96 — badge **WON** (half-win), real P/L **+0.48u**.

### The math, in the open

- Half the stake pushed (level at +0), half won (+0.5 covered).
- This is decision #2 in action: the badge counts it as a win, the units column shows the honest +0.48u.

The board moves to **2-0-0**, +1.33u.`;

const recap2Vi = `## Nhật Bản 0-0 Colombia — kèo phần tư phát huy tác dụng

Một trận bế tắc không bàn thắng ở Tokyo, và đó chính xác là lý do The Curator chọn
**Nhật Bản +0.25** thay vì kèo hòa hoàn tiền: kèo phần tư biến trận hòa thành thắng nửa.

**Kèo:** Nhật Bản +0.25 @ 1.96 — huy hiệu **THẮNG** (thắng nửa), lãi thực **+0.48u**.

### Công khai cách tính

- Nửa tiền cược hoàn lại (hòa ở mốc +0), nửa còn lại thắng (+0.5).
- Đây là quyết định #2 trong thực tế: huy hiệu tính là thắng, cột unit hiển thị con số trung thực +0.48u.

Bảng thành tích: **2-0-0**, +1.33u.`;

export const mockPosts: Post[] = [
  {
    id: "10000000-0000-4000-8000-000000000001",
    type: "recap",
    slug: "england-croatia-over-lands",
    lang: "en",
    title: "Recap: England 3-1 Croatia — Over 2.5 lands early",
    body_md: recap1En,
    pick_ids: ["00000000-0000-4000-8000-000000000001"],
    status: "published",
    published_at: dayAt(-2, 7),
  },
  {
    id: "10000000-0000-4000-8000-000000000002",
    type: "recap",
    slug: "england-croatia-over-lands",
    lang: "vi",
    title: "Recap: Anh 3-1 Croatia — Tài 2.5 về sớm",
    body_md: recap1Vi,
    pick_ids: ["00000000-0000-4000-8000-000000000001"],
    status: "published",
    published_at: dayAt(-2, 7),
  },
  {
    id: "10000000-0000-4000-8000-000000000003",
    type: "recap",
    slug: "japan-colombia-quarter-line",
    lang: "en",
    title: "Recap: Japan 0-0 Colombia — the quarter-line does its job",
    body_md: recap2En,
    pick_ids: ["00000000-0000-4000-8000-000000000002"],
    status: "published",
    published_at: dayAt(-1, 7),
  },
  {
    id: "10000000-0000-4000-8000-000000000004",
    type: "recap",
    slug: "japan-colombia-quarter-line",
    lang: "vi",
    title: "Recap: Nhật Bản 0-0 Colombia — kèo phần tư phát huy tác dụng",
    body_md: recap2Vi,
    pick_ids: ["00000000-0000-4000-8000-000000000002"],
    status: "published",
    published_at: dayAt(-1, 7),
  },
];

export const mockFlags: Record<string, boolean> = {
  forum: false, // enable at ~200 daily visitors (decision #4)
};

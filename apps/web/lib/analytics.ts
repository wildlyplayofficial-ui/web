/** GA4 custom event helper — fires gtag events client-side. */

type EventParams = Record<string, string | number | boolean>;

export function trackEvent(name: string, params?: EventParams): void {
  if (typeof window === "undefined") return;
  const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
  if (gtag) gtag("event", name, params);
}

/** User views the Daily Line page/strip. */
export function trackDailyLineView(): void {
  trackEvent("daily_line_view");
}

/** User makes a pick on Daily Line (Over/Under/etc). */
export function trackDailyLinePick(matchup: string, selection: string): void {
  trackEvent("daily_line_pick", { matchup, selection });
}

/** User views a play/pick page. */
export function trackPickView(pickId: string, matchup: string): void {
  trackEvent("pick_view", { pick_id: pickId, matchup });
}

/** User clicks a Telegram follow link. */
export function trackTgFollowClick(): void {
  trackEvent("tg_follow_click");
}

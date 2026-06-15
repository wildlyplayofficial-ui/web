/** Curator allowlist — pure functions, unit-tested. */

export function parseAllowlist(csv: string): Set<number> {
  return new Set(
    csv
      .split(',')
      .map((s) => s.trim())
      .filter((s) => /^\d+$/.test(s))
      .map(Number),
  );
}

export function isAllowed(userId: number | undefined, allowlist: Set<number>): boolean {
  return userId !== undefined && allowlist.has(userId);
}

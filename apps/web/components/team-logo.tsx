/**
 * Team logo from odds-api via the /api/team-logo proxy.
 * Falls back gracefully: renders nothing when participantId is null
 * (old picks without home_id/away_id still show flag emojis as before).
 */

/* eslint-disable @next/next/no-img-element */

export function TeamLogo({
  participantId,
  team,
  size = 20,
}: {
  participantId: number | null;
  team: string;
  size?: number;
}) {
  if (participantId == null) return null;

  return (
    <img
      src={`/api/team-logo/${participantId}`}
      alt={`${team} logo`}
      width={size}
      height={size}
      loading="lazy"
      className="inline-block rounded-full object-cover"
    />
  );
}

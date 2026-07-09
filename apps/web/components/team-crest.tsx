/**
 * Standings crest/flag beside a team name.
 * Club crest or nation flag (via team-badges cache); falls back to the
 * emoji flag, then to nothing — so the table cell never breaks.
 */

/* eslint-disable @next/next/no-img-element */

import { teamBadge } from "@/lib/team-badges";
import { teamFlag } from "@/lib/flags";

export function TeamCrest({ name }: { name: string }) {
  const badge = teamBadge(name);
  if (badge) {
    return (
      <img
        src={badge}
        alt=""
        width={20}
        height={20}
        loading="lazy"
        className="mr-1.5 inline-block h-5 w-5 shrink-0 object-contain align-[-5px]"
      />
    );
  }

  const flag = teamFlag(name);
  return flag ? <span className="mr-1.5">{flag}</span> : null;
}

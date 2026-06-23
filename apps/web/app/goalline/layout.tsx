import type { Metadata } from "next";
import { S } from "@/lib/goalline/strings";
import { DailyLineNav } from "./components/daily-line-nav";

export const metadata: Metadata = {
  title: {
    default: `${S.BRAND} — ${S.TAGLINE}`,
    template: `%s | ${S.BRAND}`,
  },
  description:
    "Daily Line — a daily Over/Under prediction game on aggregate football goals. Pick your side, climb the leaderboard. Entertainment only.",
};

export default function GoalLineLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-[calc(100dvh-10rem)] flex-col">
      <DailyLineNav />
      <div className="flex-1">{children}</div>
    </div>
  );
}

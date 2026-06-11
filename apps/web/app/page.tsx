import type { Metadata } from "next";
import { PickCard } from "@/components/pick-card";
import { getTodaysPicks, getTrackRecord } from "@/lib/data";
import { formatBoardDate, formatUnits } from "@/lib/format";
import { getDict, resolveLang } from "@/lib/i18n";

export const revalidate = 300;

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const lang = resolveLang((await searchParams).lang);
  const dict = getDict(lang);
  return {
    title: dict.board.title,
    description: dict.tagline,
    openGraph: { title: `${dict.board.title} | WildlyPlay`, description: dict.tagline },
  };
}

export default async function DailyBoard({ searchParams }: Props) {
  const lang = resolveLang((await searchParams).lang);
  const dict = getDict(lang);
  const [picks, record] = await Promise.all([getTodaysPicks(), getTrackRecord()]);

  return (
    <div className="mx-auto max-w-[1100px] px-5">
      <section className="relative overflow-hidden py-16 text-center md:py-20">
        <div className="hero-glow" aria-hidden />
        <div className="relative">
          <h1 className="hero-gradient-text mx-auto max-w-[700px] font-display text-4xl font-bold md:text-5xl">
            {dict.tagline}
          </h1>
          <p className="mt-4 text-lg text-muted">{dict.board.subtitle}</p>
          {record.settled > 0 && (
            <p className="mt-6 inline-flex items-center gap-3 rounded-full border border-line bg-card px-5 py-2 font-display text-sm">
              <span className="text-muted">{dict.archive.record}</span>
              <span className="font-semibold text-ink">
                {record.wins}-{record.losses}-{record.pushes}
              </span>
              <span
                className={`font-semibold ${record.units_pl >= 0 ? "text-brand" : "text-loss"}`}
              >
                {formatUnits(record.units_pl)}
              </span>
            </p>
          )}
        </div>
      </section>

      <section className="pb-8">
        <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-2xl font-bold">{dict.board.title}</h2>
          <p className="text-sm text-muted">{formatBoardDate(new Date(), lang)}</p>
        </div>

        {picks.length === 0 ? (
          <div className="rounded-card border border-line bg-card px-6 py-16 text-center">
            <p className="font-display text-2xl font-bold">{dict.board.emptyTitle}</p>
            <p className="mx-auto mt-3 max-w-[480px] text-muted">{dict.board.emptyBody}</p>
            <a
              href="https://t.me/wildlyplay"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-brand px-7 py-3 font-display font-semibold text-bg transition-transform hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,230,118,0.3)]"
            >
              Telegram →
            </a>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {picks.map((pick) => (
              <PickCard key={pick.id} pick={pick} lang={lang} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

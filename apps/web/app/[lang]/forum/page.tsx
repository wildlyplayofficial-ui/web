import type { Metadata } from "next";
import { isFeatureEnabled } from "@/lib/data";
import { getDict, resolveLang } from "@/lib/i18n";

export const revalidate = 300;

type Props = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = resolveLang((await params).lang);
  const dict = getDict(lang);
  return { title: dict.forum.title, robots: { index: false } };
}

/**
 * Forum ships behind a feature flag (decision #4) — enabled at ~200 daily
 * visitors. Until then this route shows a coming-soon state; the full forum
 * UI lands in a later iteration.
 */
export default async function ForumPage({ params }: Props) {
  const lang = resolveLang((await params).lang);
  const dict = getDict(lang);
  const enabled = await isFeatureEnabled("forum");

  return (
    <div className="mx-auto max-w-[640px] px-5 py-20 text-center">
      <h1 className="gradient-text font-display text-4xl font-bold">{dict.forum.title}</h1>
      {enabled ? (
        <p className="mt-6 text-muted">{dict.forum.body}</p>
      ) : (
        <>
          <p className="mt-6 inline-block rounded-full border border-indigo-soft/40 px-4 py-1.5 font-display text-sm font-semibold text-indigo-soft">
            {dict.forum.comingSoon}
          </p>
          <p className="mx-auto mt-6 max-w-[440px] leading-relaxed text-muted">{dict.forum.body}</p>
          <a
            href="https://t.me/wildlyplay"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-brand px-7 py-3 font-display font-semibold text-bg transition-transform hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,230,118,0.3)]"
          >
            Telegram &rarr;
          </a>
        </>
      )}
    </div>
  );
}

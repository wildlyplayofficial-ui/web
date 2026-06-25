import type { Metadata } from "next";
import { CopyButton } from "@/components/copy-button";
import { getDict, resolveLang, type Lang } from "@/lib/i18n";
import { BreadcrumbJsonLd } from "@/components/breadcrumb-jsonld";

export const revalidate = 300;

const USDT_TRC20_ADDRESS = "TQGw1vmaVX7fWoJDSjBk7zgc8TRSP8ZC3G";

type Props = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

interface Copy {
  title: string;
  intro: string;
  freeForever: string;
  networkLabel: string;
  networkWarning: string;
  thanks: string;
}

const copy: Record<Lang, Copy> = {
  en: {
    title: "Support WildlyPlay",
    intro:
      "WildlyPlay is free, forever. No VIP tiers, no paywalls, no bookmaker affiliates \u2014 just one pick a day and a public record. If the picks bring you value and you feel like buying The Curator a coffee, crypto is the only way we accept it.",
    freeForever: "Free forever. Donations never unlock anything \u2014 there is nothing to unlock.",
    networkLabel: "USDT \u2014 TRC-20 network only",
    networkWarning:
      "Send USDT on the TRON (TRC-20) network only. Funds sent on any other network will be lost.",
    thanks: "Every donation goes to data costs and keeping the lights on. Thank you.",
  },
  vi: {
    title: "\u1ee6ng H\u1ed9 WildlyPlay",
    intro:
      "WildlyPlay mi\u1ec5n ph\u00ed, v\u0129nh vi\u1ec5n. Kh\u00f4ng g\u00f3i VIP, kh\u00f4ng thu ph\u00ed, kh\u00f4ng affiliate nh\u00e0 c\u00e1i \u2014 ch\u1ec9 m\u1ed9t k\u00e8o m\u1ed7i ng\u00e0y v\u00e0 m\u1ed9t b\u1ea3ng th\u00e0nh t\u00edch c\u00f4ng khai. N\u1ebfu k\u00e8o mang l\u1ea1i gi\u00e1 tr\u1ecb v\u00e0 b\u1ea1n mu\u1ed1n m\u1eddi The Curator m\u1ed9t ly c\u00e0 ph\u00ea, crypto l\u00e0 c\u00e1ch duy nh\u1ea5t ch\u00fang t\u00f4i nh\u1eadn.",
    freeForever:
      "Mi\u1ec5n ph\u00ed v\u0129nh vi\u1ec5n. \u1ee6ng h\u1ed9 kh\u00f4ng m\u1edf kh\u00f3a b\u1ea5t c\u1ee9 th\u1ee9 g\u00ec \u2014 v\u00ec kh\u00f4ng c\u00f3 g\u00ec \u0111\u1ec3 m\u1edf kh\u00f3a.",
    networkLabel: "USDT \u2014 ch\u1ec9 m\u1ea1ng TRC-20",
    networkWarning:
      "Ch\u1ec9 g\u1eedi USDT tr\u00ean m\u1ea1ng TRON (TRC-20). Ti\u1ec1n g\u1eedi qua m\u1ea1ng kh\u00e1c s\u1ebd b\u1ecb m\u1ea5t.",
    thanks: "M\u1ecdi kho\u1ea3n \u1ee7ng h\u1ed9 \u0111\u1ec1u d\u00e0nh cho chi ph\u00ed d\u1eef li\u1ec7u v\u00e0 duy tr\u00ec h\u1ec7 th\u1ed1ng. C\u1ea3m \u01a1n b\u1ea1n.",
  },
  th: {
    title: "\u0e2a\u0e19\u0e31\u0e1a\u0e2a\u0e19\u0e38\u0e19 WildlyPlay",
    intro:
      "WildlyPlay \u0e1f\u0e23\u0e35\u0e15\u0e25\u0e2d\u0e14\u0e44\u0e1b \u0e44\u0e21\u0e48\u0e21\u0e35\u0e23\u0e30\u0e14\u0e31\u0e1a VIP \u0e44\u0e21\u0e48\u0e21\u0e35\u0e01\u0e33\u0e41\u0e1e\u0e07\u0e08\u0e48\u0e32\u0e22\u0e40\u0e07\u0e34\u0e19 \u0e44\u0e21\u0e48\u0e21\u0e35\u0e1e\u0e31\u0e19\u0e18\u0e21\u0e34\u0e15\u0e23\u0e40\u0e08\u0e49\u0e32\u0e21\u0e37\u0e2d\u0e23\u0e31\u0e1a\u0e41\u0e17\u0e07 \u2014 \u0e21\u0e35\u0e41\u0e04\u0e48\u0e17\u0e35\u0e40\u0e14\u0e47\u0e14\u0e27\u0e31\u0e19\u0e25\u0e30\u0e2b\u0e19\u0e36\u0e48\u0e07\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23\u0e01\u0e31\u0e1a\u0e2a\u0e16\u0e34\u0e15\u0e34\u0e17\u0e35\u0e48\u0e40\u0e1b\u0e34\u0e14\u0e40\u0e1c\u0e22\u0e15\u0e48\u0e2d\u0e2a\u0e32\u0e18\u0e32\u0e23\u0e13\u0e30 \u0e16\u0e49\u0e32\u0e17\u0e35\u0e40\u0e14\u0e47\u0e14\u0e21\u0e35\u0e04\u0e38\u0e13\u0e04\u0e48\u0e32\u0e01\u0e31\u0e1a\u0e04\u0e38\u0e13\u0e41\u0e25\u0e30\u0e2d\u0e22\u0e32\u0e01\u0e40\u0e25\u0e35\u0e49\u0e22\u0e07\u0e01\u0e32\u0e41\u0e1f The Curator \u0e2a\u0e31\u0e01\u0e41\u0e01\u0e49\u0e27 \u0e04\u0e23\u0e34\u0e1b\u0e42\u0e15\u0e04\u0e37\u0e2d\u0e0a\u0e48\u0e2d\u0e07\u0e17\u0e32\u0e07\u0e40\u0e14\u0e35\u0e22\u0e27\u0e17\u0e35\u0e48\u0e40\u0e23\u0e32\u0e23\u0e31\u0e1a",
    freeForever:
      "\u0e1f\u0e23\u0e35\u0e15\u0e25\u0e2d\u0e14\u0e44\u0e1b \u0e01\u0e32\u0e23\u0e2a\u0e19\u0e31\u0e1a\u0e2a\u0e19\u0e38\u0e19\u0e44\u0e21\u0e48\u0e1b\u0e25\u0e14\u0e25\u0e47\u0e2d\u0e01\u0e2d\u0e30\u0e44\u0e23\u0e17\u0e31\u0e49\u0e07\u0e19\u0e31\u0e49\u0e19 \u2014 \u0e40\u0e1e\u0e23\u0e32\u0e30\u0e44\u0e21\u0e48\u0e21\u0e35\u0e2d\u0e30\u0e44\u0e23\u0e43\u0e2b\u0e49\u0e1b\u0e25\u0e14\u0e25\u0e47\u0e2d\u0e01",
    networkLabel: "USDT \u2014 \u0e40\u0e04\u0e23\u0e37\u0e2d\u0e02\u0e48\u0e32\u0e22 TRC-20 \u0e40\u0e17\u0e48\u0e32\u0e19\u0e31\u0e49\u0e19",
    networkWarning:
      "\u0e2a\u0e48\u0e07 USDT \u0e1c\u0e48\u0e32\u0e19\u0e40\u0e04\u0e23\u0e37\u0e2d\u0e02\u0e48\u0e32\u0e22 TRON (TRC-20) \u0e40\u0e17\u0e48\u0e32\u0e19\u0e31\u0e49\u0e19 \u0e40\u0e07\u0e34\u0e19\u0e17\u0e35\u0e48\u0e2a\u0e48\u0e07\u0e1c\u0e48\u0e32\u0e19\u0e40\u0e04\u0e23\u0e37\u0e2d\u0e02\u0e48\u0e32\u0e22\u0e2d\u0e37\u0e48\u0e19\u0e08\u0e30\u0e2a\u0e39\u0e0d\u0e2b\u0e32\u0e22",
    thanks: "\u0e17\u0e38\u0e01\u0e01\u0e32\u0e23\u0e2a\u0e19\u0e31\u0e1a\u0e2a\u0e19\u0e38\u0e19\u0e19\u0e33\u0e44\u0e1b\u0e43\u0e0a\u0e49\u0e40\u0e1b\u0e47\u0e19\u0e04\u0e48\u0e32\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e41\u0e25\u0e30\u0e04\u0e48\u0e32\u0e14\u0e39\u0e41\u0e25\u0e23\u0e30\u0e1a\u0e1a \u0e02\u0e2d\u0e1a\u0e04\u0e38\u0e13\u0e21\u0e32\u0e01",
  },
  es: {
    title: "Apoya a WildlyPlay",
    intro:
      "WildlyPlay es gratis, para siempre. Sin niveles VIP, sin muros de pago, sin afiliados de casas de apuestas \u2014 solo un pick al d\u00eda y un historial p\u00fablico. Si los picks te aportan valor y quieres invitarle un caf\u00e9 a The Curator, cripto es la \u00fanica forma en que lo aceptamos.",
    freeForever:
      "Gratis para siempre. Las donaciones nunca desbloquean nada \u2014 no hay nada que desbloquear.",
    networkLabel: "USDT \u2014 solo red TRC-20",
    networkWarning:
      "Env\u00eda USDT \u00fanicamente por la red TRON (TRC-20). Los fondos enviados por cualquier otra red se perder\u00e1n.",
    thanks: "Cada donaci\u00f3n se destina a los costos de datos y a mantener el sitio en marcha. Gracias.",
  },
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = resolveLang((await params).lang);
  return {
    title: copy[lang].title,
    description: copy[lang].intro.slice(0, 160),
    openGraph: { title: `${copy[lang].title} | WildlyPlay`, images: [{ url: "/og-home.png", width: 1200, height: 630 }] },
  };
}

export default async function DonatePage({ params }: Props) {
  const lang = resolveLang((await params).lang);
  const dict = getDict(lang);
  const c = copy[lang];

  return (
    <div className="mx-auto max-w-[640px] px-5 py-12 text-center">
      <BreadcrumbJsonLd items={[{name:"Home",url:"/"},{name:"Donate",url:"/donate"}]} />
      <h1 className="gradient-text font-display text-4xl font-bold">{c.title}</h1>
      <p className="mt-6 leading-relaxed text-ink/90">{c.intro}</p>
      <p className="mt-4 text-sm text-muted">{c.freeForever}</p>

      <div className="mt-10 rounded-card border border-line bg-card p-8">
        <p className="font-display text-sm font-semibold uppercase tracking-wide text-brand">
          {c.networkLabel}
        </p>
        <p className="mt-4 break-all rounded-lg border border-line bg-bg px-4 py-3 font-mono text-sm text-ink">
          {USDT_TRC20_ADDRESS}
        </p>
        <div className="mt-5">
          <CopyButton
            value={USDT_TRC20_ADDRESS}
            label={dict.donate.copy}
            copiedLabel={dict.donate.copied}
          />
        </div>
        <p className="mt-5 text-xs text-loss">{c.networkWarning}</p>
      </div>

      <p className="mt-8 text-sm text-muted">{c.thanks}</p>
    </div>
  );
}

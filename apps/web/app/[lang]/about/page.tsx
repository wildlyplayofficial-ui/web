import type { Metadata } from "next";
import { buildAlternates, resolveLang, type Lang } from "@/lib/i18n";
import { BreadcrumbJsonLd } from "@/components/breadcrumb-jsonld";

export const revalidate = 300;

type Props = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

interface Copy {
  title: string;
  intro: string;
  cards: ReadonlyArray<{ heading: string; body: string }>;
  promiseTitle: string;
  promises: readonly string[];
}

const copy: Record<Lang, Copy> = {
  en: {
    title: "About WildlyPlay",
    intro:
      "WildlyPlay is a curator-led football picks site. A human \u2014 The Curator \u2014 picks the matches and the angles. AI operates everything else: it writes the analysis, publishes, settles the result and archives every pick publicly, forever. Human picks, AI operates \u2014 disclosed on every single play.",
    cards: [
      {
        heading: "Curated, not predicted",
        body: "Every pick is researched and reasoned \u2014 never random, never guaranteed. We share perspectives, not predictions.",
      },
      {
        heading: "Every pick, public forever",
        body: "Odds are snapshotted the moment a pick is published and never edited. Wins, losses, pushes \u2014 the full record stays up, starting from zero.",
      },
      {
        heading: "Free, for the global crowd",
        body: "No VIP tiers, no paywalls, no bookmaker affiliates. Players from every timezone, united by the love of the beautiful game.",
      },
    ],
    promiseTitle: "The promise",
    promises: [
      "One human gate: The Curator submits the pick. Everything downstream is automated and tamper-proof.",
      "Half-wins count as WON and half-losses as LOST on the badge \u2014 but the real Asian-handicap units P/L is always shown next to the record.",
      "We post our losses too. Entertainment only \u2014 never financial advice.",
    ],
  },
  vi: {
    title: "V\u1ec1 WildlyPlay",
    intro:
      "WildlyPlay l\u00e0 trang k\u00e8o b\u00f3ng \u0111\u00e1 do con ng\u01b0\u1eddi tuy\u1ec3n ch\u1ecdn. M\u1ed9t con ng\u01b0\u1eddi \u2014 The Curator \u2014 ch\u1ecdn tr\u1eadn v\u00e0 g\u00f3c nh\u00ecn. AI v\u1eadn h\u00e0nh m\u1ecdi th\u1ee9 c\u00f2n l\u1ea1i: vi\u1ebft ph\u00e2n t\u00edch, xu\u1ea5t b\u1ea3n, k\u1ebft s\u1ed5 v\u00e0 l\u01b0u tr\u1eef c\u00f4ng khai m\u1ecdi k\u00e8o, v\u0129nh vi\u1ec5n. Ng\u01b0\u1eddi ch\u1ecdn k\u00e8o, AI v\u1eadn h\u00e0nh \u2014 c\u00f4ng khai tr\u00ean t\u1eebng k\u00e8o.",
    cards: [
      {
        heading: "Tuy\u1ec3n ch\u1ecdn, kh\u00f4ng ph\u1ea3i d\u1ef1 \u0111o\u00e1n",
        body: "M\u1ed7i k\u00e8o \u0111\u1ec1u \u0111\u01b0\u1ee3c nghi\u00ean c\u1ee9u v\u00e0 l\u1eadp lu\u1eadn \u2014 kh\u00f4ng ng\u1eabu nhi\u00ean, kh\u00f4ng cam k\u1ebft ch\u1eafc th\u1eafng. Ch\u00fang t\u00f4i chia s\u1ebb g\u00f3c nh\u00ecn, kh\u00f4ng ph\u1ea3i l\u1eddi ti\u00ean tri.",
      },
      {
        heading: "M\u1ecdi k\u00e8o c\u00f4ng khai v\u0129nh vi\u1ec5n",
        body: "Odds \u0111\u01b0\u1ee3c ch\u1ed1t ngay l\u00fac \u0111\u0103ng k\u00e8o v\u00e0 kh\u00f4ng bao gi\u1edd ch\u1ec9nh s\u1eeda. Th\u1eafng, thua, h\u00f2a k\u00e8o \u2014 to\u00e0n b\u1ed9 th\u00e0nh t\u00edch lu\u00f4n hi\u1ec3n th\u1ecb, b\u1eaft \u0111\u1ea7u t\u1eeb con s\u1ed1 0.",
      },
      {
        heading: "Mi\u1ec5n ph\u00ed, cho c\u1ed9ng \u0111\u1ed3ng to\u00e0n c\u1ea7u",
        body: "Kh\u00f4ng g\u00f3i VIP, kh\u00f4ng thu ph\u00ed, kh\u00f4ng affiliate nh\u00e0 c\u00e1i. Ng\u01b0\u1eddi ch\u01a1i t\u1eeb m\u1ecdi m\u00fai gi\u1edd, g\u1eafn k\u1ebft b\u1edfi t\u00ecnh y\u00eau b\u00f3ng \u0111\u00e1.",
      },
    ],
    promiseTitle: "Cam k\u1ebft",
    promises: [
      "Ch\u1ec9 m\u1ed9t c\u1ed5ng con ng\u01b0\u1eddi: The Curator g\u1eedi k\u00e8o. M\u1ecdi b\u01b0\u1edbc sau \u0111\u00f3 \u0111\u1ec1u t\u1ef1 \u0111\u1ed9ng v\u00e0 kh\u00f4ng th\u1ec3 can thi\u1ec7p.",
      "Huy hi\u1ec7u t\u00ednh th\u1eafng n\u1eeda l\u00e0 TH\u1eaeNG, thua n\u1eeda l\u00e0 THUA \u2014 nh\u01b0ng l\u00e3i/l\u1ed7 unit theo k\u00e8o ch\u00e2u \u00c1 th\u1ef1c t\u1ebf lu\u00f4n hi\u1ec3n th\u1ecb c\u1ea1nh th\u00e0nh t\u00edch.",
      "Thua ch\u00fang t\u00f4i c\u0169ng \u0111\u0103ng. Ch\u1ec9 mang t\u00ednh gi\u1ea3i tr\u00ed \u2014 kh\u00f4ng ph\u1ea3i l\u1eddi khuy\u00ean t\u00e0i ch\u00ednh.",
    ],
  },
  th: {
    title: "\u0e40\u0e01\u0e35\u0e48\u0e22\u0e27\u0e01\u0e31\u0e1a WildlyPlay",
    intro:
      "WildlyPlay \u0e04\u0e37\u0e2d\u0e40\u0e27\u0e47\u0e1a\u0e17\u0e35\u0e40\u0e14\u0e47\u0e14\u0e1f\u0e38\u0e15\u0e1a\u0e2d\u0e25\u0e17\u0e35\u0e48\u0e04\u0e31\u0e14\u0e42\u0e14\u0e22\u0e21\u0e19\u0e38\u0e29\u0e22\u0e4c \u0e04\u0e19\u0e2b\u0e19\u0e36\u0e48\u0e07\u0e04\u0e19 \u2014 The Curator \u2014 \u0e40\u0e1b\u0e47\u0e19\u0e1c\u0e39\u0e49\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e41\u0e21\u0e15\u0e0a\u0e4c\u0e41\u0e25\u0e30\u0e21\u0e38\u0e21\u0e21\u0e2d\u0e07 \u0e2a\u0e48\u0e27\u0e19 AI \u0e14\u0e33\u0e40\u0e19\u0e34\u0e19\u0e01\u0e32\u0e23\u0e17\u0e38\u0e01\u0e2d\u0e22\u0e48\u0e32\u0e07\u0e17\u0e35\u0e48\u0e40\u0e2b\u0e25\u0e37\u0e2d: \u0e40\u0e02\u0e35\u0e22\u0e19\u0e1a\u0e17\u0e27\u0e34\u0e40\u0e04\u0e23\u0e32\u0e30\u0e2b\u0e4c \u0e40\u0e1c\u0e22\u0e41\u0e1e\u0e23\u0e48 \u0e15\u0e31\u0e14\u0e2a\u0e34\u0e19\u0e1c\u0e25 \u0e41\u0e25\u0e30\u0e40\u0e01\u0e47\u0e1a\u0e17\u0e38\u0e01\u0e17\u0e35\u0e40\u0e14\u0e47\u0e14\u0e44\u0e27\u0e49\u0e15\u0e48\u0e2d\u0e2a\u0e32\u0e18\u0e32\u0e23\u0e13\u0e30\u0e15\u0e25\u0e2d\u0e14\u0e44\u0e1b \u0e21\u0e19\u0e38\u0e29\u0e22\u0e4c\u0e40\u0e25\u0e37\u0e2d\u0e01 AI \u0e14\u0e33\u0e40\u0e19\u0e34\u0e19\u0e01\u0e32\u0e23 \u2014 \u0e40\u0e1b\u0e34\u0e14\u0e40\u0e1c\u0e22\u0e44\u0e27\u0e49\u0e43\u0e19\u0e17\u0e38\u0e01\u0e17\u0e35\u0e40\u0e14\u0e47\u0e14",
    cards: [
      {
        heading: "\u0e04\u0e31\u0e14\u0e2a\u0e23\u0e23 \u0e44\u0e21\u0e48\u0e43\u0e0a\u0e48\u0e17\u0e33\u0e19\u0e32\u0e22",
        body: "\u0e17\u0e38\u0e01\u0e17\u0e35\u0e40\u0e14\u0e47\u0e14\u0e1c\u0e48\u0e32\u0e19\u0e01\u0e32\u0e23\u0e04\u0e49\u0e19\u0e04\u0e27\u0e49\u0e32\u0e41\u0e25\u0e30\u0e21\u0e35\u0e40\u0e2b\u0e15\u0e38\u0e1c\u0e25\u0e23\u0e2d\u0e07\u0e23\u0e31\u0e1a \u2014 \u0e44\u0e21\u0e48\u0e2a\u0e38\u0e48\u0e21 \u0e44\u0e21\u0e48\u0e21\u0e35\u0e01\u0e32\u0e23\u0e01\u0e32\u0e23\u0e31\u0e19\u0e15\u0e35 \u0e40\u0e23\u0e32\u0e41\u0e1a\u0e48\u0e07\u0e1b\u0e31\u0e19\u0e21\u0e38\u0e21\u0e21\u0e2d\u0e07 \u0e44\u0e21\u0e48\u0e43\u0e0a\u0e48\u0e04\u0e33\u0e1e\u0e22\u0e32\u0e01\u0e23\u0e13\u0e4c",
      },
      {
        heading: "\u0e17\u0e38\u0e01\u0e17\u0e35\u0e40\u0e14\u0e47\u0e14 \u0e40\u0e1b\u0e34\u0e14\u0e40\u0e1c\u0e22\u0e15\u0e25\u0e2d\u0e14\u0e44\u0e1b",
        body: "\u0e23\u0e32\u0e04\u0e32\u0e15\u0e48\u0e2d\u0e23\u0e2d\u0e07\u0e16\u0e39\u0e01\u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01\u0e17\u0e31\u0e19\u0e17\u0e35\u0e17\u0e35\u0e48\u0e40\u0e1c\u0e22\u0e41\u0e1e\u0e23\u0e48\u0e17\u0e35\u0e40\u0e14\u0e47\u0e14\u0e41\u0e25\u0e30\u0e44\u0e21\u0e48\u0e21\u0e35\u0e01\u0e32\u0e23\u0e41\u0e01\u0e49\u0e44\u0e02 \u0e0a\u0e19\u0e30 \u0e41\u0e1e\u0e49 \u0e04\u0e37\u0e19\u0e17\u0e38\u0e19 \u2014 \u0e2a\u0e16\u0e34\u0e15\u0e34\u0e17\u0e31\u0e49\u0e07\u0e2b\u0e21\u0e14\u0e41\u0e2a\u0e14\u0e07\u0e44\u0e27\u0e49\u0e40\u0e2a\u0e21\u0e2d \u0e40\u0e23\u0e34\u0e48\u0e21\u0e15\u0e49\u0e19\u0e08\u0e32\u0e01\u0e28\u0e39\u0e19\u0e22\u0e4c",
      },
      {
        heading: "\u0e1f\u0e23\u0e35 \u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e04\u0e2d\u0e1a\u0e2d\u0e25\u0e17\u0e31\u0e48\u0e27\u0e42\u0e25\u0e01",
        body: "\u0e44\u0e21\u0e48\u0e21\u0e35\u0e23\u0e30\u0e14\u0e31\u0e1a VIP \u0e44\u0e21\u0e48\u0e21\u0e35\u0e01\u0e33\u0e41\u0e1e\u0e07\u0e08\u0e48\u0e32\u0e22\u0e40\u0e07\u0e34\u0e19 \u0e44\u0e21\u0e48\u0e21\u0e35\u0e1e\u0e31\u0e19\u0e18\u0e21\u0e34\u0e15\u0e23\u0e40\u0e08\u0e49\u0e32\u0e21\u0e37\u0e2d\u0e23\u0e31\u0e1a\u0e41\u0e17\u0e07 \u0e1c\u0e39\u0e49\u0e40\u0e25\u0e48\u0e19\u0e08\u0e32\u0e01\u0e17\u0e38\u0e01\u0e44\u0e17\u0e21\u0e4c\u0e42\u0e0b\u0e19 \u0e40\u0e0a\u0e37\u0e48\u0e2d\u0e21\u0e01\u0e31\u0e19\u0e14\u0e49\u0e27\u0e22\u0e04\u0e27\u0e32\u0e21\u0e23\u0e31\u0e01\u0e43\u0e19\u0e40\u0e01\u0e21\u0e25\u0e39\u0e01\u0e2b\u0e19\u0e31\u0e07",
      },
    ],
    promiseTitle: "\u0e04\u0e33\u0e21\u0e31\u0e48\u0e19\u0e2a\u0e31\u0e0d\u0e0d\u0e32",
    promises: [
      "\u0e21\u0e35\u0e21\u0e19\u0e38\u0e29\u0e22\u0e4c\u0e40\u0e1e\u0e35\u0e22\u0e07\u0e14\u0e48\u0e32\u0e19\u0e40\u0e14\u0e35\u0e22\u0e27: The Curator \u0e40\u0e1b\u0e47\u0e19\u0e1c\u0e39\u0e49\u0e2a\u0e48\u0e07\u0e17\u0e35\u0e40\u0e14\u0e47\u0e14 \u0e17\u0e38\u0e01\u0e02\u0e31\u0e49\u0e19\u0e15\u0e2d\u0e19\u0e2b\u0e25\u0e31\u0e07\u0e08\u0e32\u0e01\u0e19\u0e31\u0e49\u0e19\u0e40\u0e1b\u0e47\u0e19\u0e2d\u0e31\u0e15\u0e42\u0e19\u0e21\u0e31\u0e15\u0e34\u0e41\u0e25\u0e30\u0e41\u0e17\u0e23\u0e01\u0e41\u0e0b\u0e07\u0e44\u0e21\u0e48\u0e44\u0e14\u0e49",
      "\u0e1b\u0e49\u0e32\u0e22\u0e2a\u0e16\u0e32\u0e19\u0e30\u0e19\u0e31\u0e1a\u0e0a\u0e19\u0e30\u0e04\u0e23\u0e36\u0e48\u0e07\u0e40\u0e1b\u0e47\u0e19 \u0e0a\u0e19\u0e30 \u0e41\u0e25\u0e30\u0e41\u0e1e\u0e49\u0e04\u0e23\u0e36\u0e48\u0e07\u0e40\u0e1b\u0e47\u0e19 \u0e41\u0e1e\u0e49 \u2014 \u0e41\u0e15\u0e48\u0e01\u0e33\u0e44\u0e23/\u0e02\u0e32\u0e14\u0e17\u0e38\u0e19\u0e22\u0e39\u0e19\u0e34\u0e15\u0e15\u0e32\u0e21\u0e23\u0e32\u0e04\u0e32\u0e15\u0e48\u0e2d\u0e23\u0e2d\u0e07\u0e1a\u0e2d\u0e25\u0e40\u0e2d\u0e40\u0e0a\u0e35\u0e22\u0e08\u0e23\u0e34\u0e07\u0e08\u0e30\u0e41\u0e2a\u0e14\u0e07\u0e04\u0e39\u0e48\u0e01\u0e31\u0e1a\u0e2a\u0e16\u0e34\u0e15\u0e34\u0e40\u0e2a\u0e21\u0e2d",
      "\u0e41\u0e1e\u0e49\u0e40\u0e23\u0e32\u0e01\u0e47\u0e25\u0e07\u0e43\u0e2b\u0e49\u0e14\u0e39 \u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e04\u0e27\u0e32\u0e21\u0e1a\u0e31\u0e19\u0e40\u0e17\u0e34\u0e07\u0e40\u0e17\u0e48\u0e32\u0e19\u0e31\u0e49\u0e19 \u2014 \u0e44\u0e21\u0e48\u0e43\u0e0a\u0e48\u0e04\u0e33\u0e41\u0e19\u0e30\u0e19\u0e33\u0e17\u0e32\u0e07\u0e01\u0e32\u0e23\u0e40\u0e07\u0e34\u0e19",
    ],
  },
  es: {
    title: "Acerca de WildlyPlay",
    intro:
      "WildlyPlay es un sitio de picks de f\u00fatbol dirigido por un curador. Un humano \u2014 The Curator \u2014 elige los partidos y los \u00e1ngulos. La IA opera todo lo dem\u00e1s: escribe el an\u00e1lisis, publica, liquida el resultado y archiva cada pick p\u00fablicamente, para siempre. Picks humanos, operaci\u00f3n por IA \u2014 declarado en cada jugada.",
    cards: [
      {
        heading: "Curado, no predicho",
        body: "Cada pick se investiga y se razona \u2014 nunca al azar, nunca garantizado. Compartimos perspectivas, no predicciones.",
      },
      {
        heading: "Cada pick, p\u00fablico para siempre",
        body: "Las cuotas se capturan en el momento en que se publica un pick y nunca se editan. Ganadas, perdidas, push \u2014 el historial completo queda a la vista, empezando desde cero.",
      },
      {
        heading: "Gratis, para la afici\u00f3n global",
        body: "Sin niveles VIP, sin muros de pago, sin afiliados de casas de apuestas. Jugadores de todas las zonas horarias, unidos por el amor al f\u00fatbol.",
      },
    ],
    promiseTitle: "La promesa",
    promises: [
      "Una sola puerta humana: The Curator env\u00eda el pick. Todo lo que sigue es automatizado y a prueba de manipulaci\u00f3n.",
      "Las medias ganancias cuentan como GANADA y las medias p\u00e9rdidas como PERDIDA en la insignia \u2014 pero el G/P real en unidades del h\u00e1ndicap asi\u00e1tico siempre se muestra junto al balance.",
      "Tambi\u00e9n publicamos nuestras p\u00e9rdidas. Solo entretenimiento \u2014 nunca asesor\u00eda financiera.",
    ],
  },
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = resolveLang((await params).lang);
  return {
    title: copy[lang].title,
    description: copy[lang].intro.slice(0, 160),
    openGraph: { title: `${copy[lang].title} | WildlyPlay`, images: [{ url: "/api/og/editorial?title=About%20WildlyPlay&subtitle=The%20Curator%20%E2%80%94%20human-picked.%20The%20Scout%20%E2%80%94%20openly%20AI.", width: 1200, height: 630 }] },
    alternates: buildAlternates("/about", lang),
  };
}

export default async function AboutPage({ params }: Props) {
  const lang = resolveLang((await params).lang);
  const c = copy[lang];

  return (
    <div className="mx-auto max-w-[800px] px-5 py-12">
      <BreadcrumbJsonLd items={[{name:"Home",url:"/"},{name:"About",url:"/about"}]} />
      <h1 className="gradient-text text-center font-display text-4xl font-bold">{c.title}</h1>
      <p className="mx-auto mt-6 max-w-[680px] text-center leading-relaxed text-ink/90">
        {c.intro}
      </p>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {c.cards.map((card) => (
          <div key={card.heading} className="rounded-card border border-line bg-card p-6 shadow-card">
            <h2 className="font-display text-lg font-semibold text-brand">{card.heading}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">{card.body}</p>
          </div>
        ))}
      </div>

      <section className="mt-12 rounded-card border border-line bg-card p-8">
        <h2 className="font-display text-2xl font-bold">{c.promiseTitle}</h2>
        <ul className="mt-4 flex flex-col gap-3">
          {c.promises.map((item) => (
            <li key={item} className="flex gap-3 text-sm leading-relaxed text-ink/90">
              <span className="mt-0.5 text-brand">{"\u2713"}</span>
              {item}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

import type { Metadata } from "next";
import { resolveLang, type Lang } from "@/lib/i18n";
import { BreadcrumbJsonLd } from "@/components/breadcrumb-jsonld";

export const revalidate = 300;

type Props = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

interface Copy {
  title: string;
  intro: string;
  rulesTitle: string;
  rules: readonly string[];
  helpTitle: string;
  helpBody: string;
}

const copy: Record<Lang, Copy> = {
  en: {
    title: "Responsible Play",
    intro:
      "WildlyPlay is entertainment, full stop. Our picks are perspectives on the beautiful game \u2014 not predictions, not investment advice, and never a way to make a living. If you choose to play along, do it for fun and keep it that way.",
    rulesTitle: "House rules for yourself",
    rules: [
      "Only play with money you can comfortably afford to lose.",
      "Set a budget and a time limit before you start \u2014 and stick to both.",
      "Never chase losses. A bad day stays a bad day; don\u2019t make it a bad week.",
      "Don\u2019t play when upset, tired, or under the influence.",
      "Gambling is not a source of income. If it stops being fun, stop.",
      "Be honest with yourself and the people around you about how much you play.",
    ],
    helpTitle: "If it stops being fun",
    helpBody:
      "If you or someone you know struggles with gambling, please reach out to a local support organisation such as Gamblers Anonymous (gamblersanonymous.org) or the support services available in your country. Talking to someone is the first step \u2014 and it works.",
  },
  vi: {
    title: "Ch\u01a1i C\u00f3 Tr\u00e1ch Nhi\u1ec7m",
    intro:
      "WildlyPlay l\u00e0 gi\u1ea3i tr\u00ed, ch\u1ea5m h\u1ebft. K\u00e8o c\u1ee7a ch\u00fang t\u00f4i l\u00e0 g\u00f3c nh\u00ecn v\u1ec1 b\u00f3ng \u0111\u00e1 \u2014 kh\u00f4ng ph\u1ea3i d\u1ef1 \u0111o\u00e1n ch\u1eafc th\u1eafng, kh\u00f4ng ph\u1ea3i l\u1eddi khuy\u00ean \u0111\u1ea7u t\u01b0, v\u00e0 kh\u00f4ng bao gi\u1edd l\u00e0 c\u00e1ch ki\u1ebfm s\u1ed1ng. N\u1ebfu b\u1ea1n ch\u1ecdn ch\u01a1i theo, h\u00e3y ch\u01a1i cho vui v\u00e0 gi\u1eef \u0111\u00fang tinh th\u1ea7n \u0111\u00f3.",
    rulesTitle: "Nguy\u00ean t\u1eafc cho ch\u00ednh b\u1ea1n",
    rules: [
      "Ch\u1ec9 ch\u01a1i v\u1edbi s\u1ed1 ti\u1ec1n b\u1ea1n ho\u00e0n to\u00e0n c\u00f3 th\u1ec3 m\u1ea5t m\u00e0 kh\u00f4ng \u1ea3nh h\u01b0\u1edfng cu\u1ed9c s\u1ed1ng.",
      "\u0110\u1eb7t ng\u00e2n s\u00e1ch v\u00e0 gi\u1edbi h\u1ea1n th\u1eddi gian tr\u01b0\u1edbc khi b\u1eaft \u0111\u1ea7u \u2014 v\u00e0 tu\u00e2n th\u1ee7 c\u1ea3 hai.",
      "\u0110\u1eebng bao gi\u1edd g\u1ee1. M\u1ed9t ng\u00e0y x\u1ea5u l\u00e0 m\u1ed9t ng\u00e0y x\u1ea5u; \u0111\u1eebng bi\u1ebfn n\u00f3 th\u00e0nh m\u1ed9t tu\u1ea7n x\u1ea5u.",
      "Kh\u00f4ng ch\u01a1i khi \u0111ang bu\u1ed3n b\u1ef1c, m\u1ec7t m\u1ecfi hay c\u00f3 men.",
      "C\u00e1 c\u01b0\u1ee3c kh\u00f4ng ph\u1ea3i ngu\u1ed3n thu nh\u1eadp. Khi h\u1ebft vui, h\u00e3y d\u1eebng l\u1ea1i.",
      "Trung th\u1ef1c v\u1edbi b\u1ea3n th\u00e2n v\u00e0 ng\u01b0\u1eddi th\u00e2n v\u1ec1 m\u1ee9c \u0111\u1ed9 ch\u01a1i c\u1ee7a m\u00ecnh.",
    ],
    helpTitle: "Khi kh\u00f4ng c\u00f2n vui n\u1eefa",
    helpBody:
      "N\u1ebfu b\u1ea1n ho\u1eb7c ng\u01b0\u1eddi quen g\u1eb7p v\u1ea5n \u0111\u1ec1 v\u1edbi c\u1edd b\u1ea1c, h\u00e3y t\u00ecm \u0111\u1ebfn c\u00e1c t\u1ed5 ch\u1ee9c h\u1ed7 tr\u1ee3 nh\u01b0 Gamblers Anonymous (gamblersanonymous.org) ho\u1eb7c d\u1ecbch v\u1ee5 h\u1ed7 tr\u1ee3 t\u1ea1i qu\u1ed1c gia c\u1ee7a b\u1ea1n. N\u00f3i chuy\u1ec7n v\u1edbi ai \u0111\u00f3 l\u00e0 b\u01b0\u1edbc \u0111\u1ea7u ti\u00ean \u2014 v\u00e0 n\u00f3 th\u1ef1c s\u1ef1 hi\u1ec7u qu\u1ea3.",
  },
  th: {
    title: "\u0e40\u0e25\u0e48\u0e19\u0e2d\u0e22\u0e48\u0e32\u0e07\u0e21\u0e35\u0e04\u0e27\u0e32\u0e21\u0e23\u0e31\u0e1a\u0e1c\u0e34\u0e14\u0e0a\u0e2d\u0e1a",
    intro:
      "WildlyPlay \u0e04\u0e37\u0e2d\u0e04\u0e27\u0e32\u0e21\u0e1a\u0e31\u0e19\u0e40\u0e17\u0e34\u0e07 \u0e08\u0e1a\u0e41\u0e04\u0e48\u0e19\u0e31\u0e49\u0e19 \u0e17\u0e35\u0e40\u0e14\u0e47\u0e14\u0e02\u0e2d\u0e07\u0e40\u0e23\u0e32\u0e04\u0e37\u0e2d\u0e21\u0e38\u0e21\u0e21\u0e2d\u0e07\u0e15\u0e48\u0e2d\u0e40\u0e01\u0e21\u0e1f\u0e38\u0e15\u0e1a\u0e2d\u0e25 \u2014 \u0e44\u0e21\u0e48\u0e43\u0e0a\u0e48\u0e04\u0e33\u0e17\u0e33\u0e19\u0e32\u0e22 \u0e44\u0e21\u0e48\u0e43\u0e0a\u0e48\u0e04\u0e33\u0e41\u0e19\u0e30\u0e19\u0e33\u0e01\u0e32\u0e23\u0e25\u0e07\u0e17\u0e38\u0e19 \u0e41\u0e25\u0e30\u0e44\u0e21\u0e48\u0e43\u0e0a\u0e48\u0e2b\u0e19\u0e17\u0e32\u0e07\u0e2b\u0e32\u0e40\u0e25\u0e35\u0e49\u0e22\u0e07\u0e0a\u0e35\u0e1e\u0e40\u0e14\u0e47\u0e14\u0e02\u0e32\u0e14 \u0e16\u0e49\u0e32\u0e04\u0e38\u0e13\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e08\u0e30\u0e40\u0e25\u0e48\u0e19\u0e15\u0e32\u0e21 \u0e02\u0e2d\u0e43\u0e2b\u0e49\u0e40\u0e25\u0e48\u0e19\u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e04\u0e27\u0e32\u0e21\u0e2a\u0e19\u0e38\u0e01\u0e41\u0e25\u0e30\u0e23\u0e31\u0e01\u0e29\u0e32\u0e21\u0e31\u0e19\u0e44\u0e27\u0e49\u0e41\u0e1a\u0e1a\u0e19\u0e31\u0e49\u0e19",
    rulesTitle: "\u0e01\u0e15\u0e34\u0e01\u0e32\u0e17\u0e35\u0e48\u0e15\u0e31\u0e49\u0e07\u0e44\u0e27\u0e49\u0e43\u0e2b\u0e49\u0e15\u0e31\u0e27\u0e04\u0e38\u0e13\u0e40\u0e2d\u0e07",
    rules: [
      "\u0e40\u0e25\u0e48\u0e19\u0e40\u0e09\u0e1e\u0e32\u0e30\u0e14\u0e49\u0e27\u0e22\u0e40\u0e07\u0e34\u0e19\u0e17\u0e35\u0e48\u0e40\u0e2a\u0e35\u0e22\u0e44\u0e1b\u0e41\u0e25\u0e49\u0e27\u0e44\u0e21\u0e48\u0e01\u0e23\u0e30\u0e17\u0e1a\u0e0a\u0e35\u0e27\u0e34\u0e15\u0e02\u0e2d\u0e07\u0e04\u0e38\u0e13\u0e40\u0e17\u0e48\u0e32\u0e19\u0e31\u0e49\u0e19",
      "\u0e15\u0e31\u0e49\u0e07\u0e07\u0e1a\u0e1b\u0e23\u0e30\u0e21\u0e32\u0e13\u0e41\u0e25\u0e30\u0e01\u0e33\u0e2b\u0e19\u0e14\u0e40\u0e27\u0e25\u0e32\u0e40\u0e25\u0e48\u0e19\u0e01\u0e48\u0e2d\u0e19\u0e40\u0e23\u0e34\u0e48\u0e21 \u2014 \u0e41\u0e25\u0e30\u0e17\u0e33\u0e15\u0e32\u0e21\u0e17\u0e31\u0e49\u0e07\u0e2a\u0e2d\u0e07\u0e2d\u0e22\u0e48\u0e32\u0e07",
      "\u0e2d\u0e22\u0e48\u0e32\u0e15\u0e32\u0e21\u0e17\u0e38\u0e19\u0e40\u0e14\u0e47\u0e14\u0e02\u0e32\u0e14 \u0e27\u0e31\u0e19\u0e17\u0e35\u0e48\u0e41\u0e22\u0e48\u0e01\u0e47\u0e43\u0e2b\u0e49\u0e08\u0e1a\u0e17\u0e35\u0e48\u0e27\u0e31\u0e19\u0e17\u0e35\u0e48\u0e41\u0e22\u0e48 \u0e2d\u0e22\u0e48\u0e32\u0e43\u0e2b\u0e49\u0e01\u0e25\u0e32\u0e22\u0e40\u0e1b\u0e47\u0e19\u0e2a\u0e31\u0e1b\u0e14\u0e32\u0e2b\u0e4c\u0e17\u0e35\u0e48\u0e41\u0e22\u0e48",
      "\u0e2d\u0e22\u0e48\u0e32\u0e40\u0e25\u0e48\u0e19\u0e15\u0e2d\u0e19\u0e2b\u0e07\u0e38\u0e14\u0e2b\u0e07\u0e34\u0e14 \u0e40\u0e2b\u0e19\u0e37\u0e48\u0e2d\u0e22\u0e25\u0e49\u0e32 \u0e2b\u0e23\u0e37\u0e2d\u0e21\u0e36\u0e19\u0e40\u0e21\u0e32",
      "\u0e01\u0e32\u0e23\u0e1e\u0e19\u0e31\u0e19\u0e44\u0e21\u0e48\u0e43\u0e0a\u0e48\u0e41\u0e2b\u0e25\u0e48\u0e07\u0e23\u0e32\u0e22\u0e44\u0e14\u0e49 \u0e40\u0e21\u0e37\u0e48\u0e2d\u0e44\u0e2b\u0e23\u0e48\u0e17\u0e35\u0e48\u0e44\u0e21\u0e48\u0e2a\u0e19\u0e38\u0e01\u0e41\u0e25\u0e49\u0e27 \u0e43\u0e2b\u0e49\u0e2b\u0e22\u0e38\u0e14",
      "\u0e0b\u0e37\u0e48\u0e2d\u0e2a\u0e31\u0e15\u0e22\u0e4c\u0e01\u0e31\u0e1a\u0e15\u0e31\u0e27\u0e40\u0e2d\u0e07\u0e41\u0e25\u0e30\u0e04\u0e19\u0e23\u0e2d\u0e1a\u0e02\u0e49\u0e32\u0e07\u0e27\u0e48\u0e32\u0e04\u0e38\u0e13\u0e40\u0e25\u0e48\u0e19\u0e21\u0e32\u0e01\u0e41\u0e04\u0e48\u0e44\u0e2b\u0e19",
    ],
    helpTitle: "\u0e40\u0e21\u0e37\u0e48\u0e2d\u0e21\u0e31\u0e19\u0e44\u0e21\u0e48\u0e2a\u0e19\u0e38\u0e01\u0e2d\u0e35\u0e01\u0e15\u0e48\u0e2d\u0e44\u0e1b",
    helpBody:
      "\u0e2b\u0e32\u0e01\u0e04\u0e38\u0e13\u0e2b\u0e23\u0e37\u0e2d\u0e04\u0e19\u0e17\u0e35\u0e48\u0e04\u0e38\u0e13\u0e23\u0e39\u0e49\u0e08\u0e31\u0e01\u0e21\u0e35\u0e1b\u0e31\u0e0d\u0e2b\u0e32\u0e01\u0e31\u0e1a\u0e01\u0e32\u0e23\u0e1e\u0e19\u0e31\u0e19 \u0e42\u0e1b\u0e23\u0e14\u0e15\u0e34\u0e14\u0e15\u0e48\u0e2d\u0e2d\u0e07\u0e04\u0e4c\u0e01\u0e23\u0e0a\u0e48\u0e27\u0e22\u0e40\u0e2b\u0e25\u0e37\u0e2d \u0e40\u0e0a\u0e48\u0e19 Gamblers Anonymous (gamblersanonymous.org) \u0e2b\u0e23\u0e37\u0e2d\u0e1a\u0e23\u0e34\u0e01\u0e32\u0e23\u0e0a\u0e48\u0e27\u0e22\u0e40\u0e2b\u0e25\u0e37\u0e2d\u0e17\u0e35\u0e48\u0e21\u0e35\u0e43\u0e19\u0e1b\u0e23\u0e30\u0e40\u0e17\u0e28\u0e02\u0e2d\u0e07\u0e04\u0e38\u0e13 \u0e01\u0e32\u0e23\u0e44\u0e14\u0e49\u0e1e\u0e39\u0e14\u0e04\u0e38\u0e22\u0e01\u0e31\u0e1a\u0e43\u0e04\u0e23\u0e2a\u0e31\u0e01\u0e04\u0e19\u0e04\u0e37\u0e2d\u0e01\u0e49\u0e32\u0e27\u0e41\u0e23\u0e01 \u2014 \u0e41\u0e25\u0e30\u0e21\u0e31\u0e19\u0e44\u0e14\u0e49\u0e1c\u0e25\u0e08\u0e23\u0e34\u0e07",
  },
  es: {
    title: "Juego Responsable",
    intro:
      "WildlyPlay es entretenimiento, punto. Nuestros picks son perspectivas sobre el f\u00fatbol \u2014 no predicciones, no asesor\u00eda de inversi\u00f3n, y nunca una forma de ganarse la vida. Si decides jugar, hazlo por diversi\u00f3n y que siga siendo as\u00ed.",
    rulesTitle: "Reglas de la casa para ti mismo",
    rules: [
      "Juega solo con dinero que puedas permitirte perder sin problema.",
      "Define un presupuesto y un l\u00edmite de tiempo antes de empezar \u2014 y respeta ambos.",
      "Nunca persigas las p\u00e9rdidas. Un mal d\u00eda se queda en un mal d\u00eda; no lo conviertas en una mala semana.",
      "No juegues si est\u00e1s molesto, cansado o bajo los efectos del alcohol u otras sustancias.",
      "Apostar no es una fuente de ingresos. Si deja de ser divertido, detente.",
      "S\u00e9 honesto contigo mismo y con las personas a tu alrededor sobre cu\u00e1nto juegas.",
    ],
    helpTitle: "Si deja de ser divertido",
    helpBody:
      "Si t\u00fa o alguien que conoces tiene problemas con el juego, busca una organizaci\u00f3n de apoyo local como Gamblers Anonymous (gamblersanonymous.org) o los servicios de ayuda disponibles en tu pa\u00eds. Hablar con alguien es el primer paso \u2014 y funciona.",
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

export default async function ResponsiblePlayPage({ params }: Props) {
  const lang = resolveLang((await params).lang);
  const c = copy[lang];

  return (
    <div className="mx-auto max-w-[720px] px-5 py-12">
      <BreadcrumbJsonLd items={[{name:"Home",url:"/"},{name:"Responsible Play",url:"/responsible-play"}]} />
      <h1 className="gradient-text text-center font-display text-4xl font-bold">{c.title}</h1>
      <p className="mt-6 leading-relaxed text-ink/90">{c.intro}</p>

      <section className="mt-10 rounded-card border border-line bg-card p-8">
        <h2 className="font-display text-xl font-bold">{c.rulesTitle}</h2>
        <ul className="mt-4 flex flex-col gap-3">
          {c.rules.map((rule) => (
            <li key={rule} className="flex gap-3 text-sm leading-relaxed text-ink/90">
              <span className="mt-0.5 text-brand">{"\u2022"}</span>
              {rule}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8 rounded-card border border-brand/30 bg-brand-dim p-8">
        <h2 className="font-display text-xl font-bold text-brand">{c.helpTitle}</h2>
        <p className="mt-3 text-sm leading-relaxed text-ink/90">{c.helpBody}</p>
      </section>
    </div>
  );
}

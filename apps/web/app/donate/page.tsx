import type { Metadata } from "next";
import { CopyButton } from "@/components/copy-button";
import { getDict, resolveLang, type Lang } from "@/lib/i18n";

export const revalidate = 300;

const USDT_TRC20_ADDRESS = "TQGw1vmaVX7fWoJDSjBk7zgc8TRSP8ZC3G";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

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
      "WildlyPlay is free, forever. No VIP tiers, no paywalls, no bookmaker affiliates — just one pick a day and a public record. If the picks bring you value and you feel like buying The Curator a coffee, crypto is the only way we accept it.",
    freeForever: "Free forever. Donations never unlock anything — there is nothing to unlock.",
    networkLabel: "USDT — TRC-20 network only",
    networkWarning:
      "Send USDT on the TRON (TRC-20) network only. Funds sent on any other network will be lost.",
    thanks: "Every donation goes to data costs and keeping the lights on. Thank you.",
  },
  vi: {
    title: "Ủng Hộ WildlyPlay",
    intro:
      "WildlyPlay miễn phí, vĩnh viễn. Không gói VIP, không thu phí, không affiliate nhà cái — chỉ một kèo mỗi ngày và một bảng thành tích công khai. Nếu kèo mang lại giá trị và bạn muốn mời The Curator một ly cà phê, crypto là cách duy nhất chúng tôi nhận.",
    freeForever:
      "Miễn phí vĩnh viễn. Ủng hộ không mở khóa bất cứ thứ gì — vì không có gì để mở khóa.",
    networkLabel: "USDT — chỉ mạng TRC-20",
    networkWarning:
      "Chỉ gửi USDT trên mạng TRON (TRC-20). Tiền gửi qua mạng khác sẽ bị mất.",
    thanks: "Mọi khoản ủng hộ đều dành cho chi phí dữ liệu và duy trì hệ thống. Cảm ơn bạn.",
  },
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const lang = resolveLang((await searchParams).lang);
  return {
    title: copy[lang].title,
    description: copy[lang].intro.slice(0, 160),
    openGraph: { title: `${copy[lang].title} | WildlyPlay` },
  };
}

export default async function DonatePage({ searchParams }: Props) {
  const lang = resolveLang((await searchParams).lang);
  const dict = getDict(lang);
  const c = copy[lang];

  return (
    <div className="mx-auto max-w-[640px] px-5 py-12 text-center">
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

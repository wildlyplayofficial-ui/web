import type { Metadata } from "next";
import { resolveLang, type Lang } from "@/lib/i18n";

export const revalidate = 300;

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

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
      "WildlyPlay is a curator-led football picks site. A human — The Curator — picks the matches and the angles. AI operates everything else: it writes the analysis, publishes, settles the result and archives every pick publicly, forever. Human picks, AI operates — disclosed on every single play.",
    cards: [
      {
        heading: "Curated, not predicted",
        body: "Every pick is researched and reasoned — never random, never guaranteed. We share perspectives, not predictions.",
      },
      {
        heading: "Every pick, public forever",
        body: "Odds are snapshotted the moment a pick is published and never edited. Wins, losses, pushes — the full record stays up, starting from zero.",
      },
      {
        heading: "Free, for the global crowd",
        body: "No VIP tiers, no paywalls, no bookmaker affiliates. Players from every timezone, united by the love of the beautiful game.",
      },
    ],
    promiseTitle: "The promise",
    promises: [
      "One human gate: The Curator submits the pick. Everything downstream is automated and tamper-proof.",
      "Half-wins count as WON and half-losses as LOST on the badge — but the real Asian-handicap units P/L is always shown next to the record.",
      "We post our losses too. Entertainment only — never financial advice.",
    ],
  },
  vi: {
    title: "Về WildlyPlay",
    intro:
      "WildlyPlay là trang kèo bóng đá do con người tuyển chọn. Một con người — The Curator — chọn trận và góc nhìn. AI vận hành mọi thứ còn lại: viết phân tích, xuất bản, kết sổ và lưu trữ công khai mọi kèo, vĩnh viễn. Người chọn kèo, AI vận hành — công khai trên từng kèo.",
    cards: [
      {
        heading: "Tuyển chọn, không phải dự đoán",
        body: "Mỗi kèo đều được nghiên cứu và lập luận — không ngẫu nhiên, không cam kết chắc thắng. Chúng tôi chia sẻ góc nhìn, không phải lời tiên tri.",
      },
      {
        heading: "Mọi kèo công khai vĩnh viễn",
        body: "Odds được chốt ngay lúc đăng kèo và không bao giờ chỉnh sửa. Thắng, thua, hòa kèo — toàn bộ thành tích luôn hiển thị, bắt đầu từ con số 0.",
      },
      {
        heading: "Miễn phí, cho cộng đồng toàn cầu",
        body: "Không gói VIP, không thu phí, không affiliate nhà cái. Người chơi từ mọi múi giờ, gắn kết bởi tình yêu bóng đá.",
      },
    ],
    promiseTitle: "Cam kết",
    promises: [
      "Chỉ một cổng con người: The Curator gửi kèo. Mọi bước sau đó đều tự động và không thể can thiệp.",
      "Huy hiệu tính thắng nửa là THẮNG, thua nửa là THUA — nhưng lãi/lỗ unit theo kèo châu Á thực tế luôn hiển thị cạnh thành tích.",
      "Thua chúng tôi cũng đăng. Chỉ mang tính giải trí — không phải lời khuyên tài chính.",
    ],
  },
  th: {
    title: "เกี่ยวกับ WildlyPlay",
    intro:
      "WildlyPlay คือเว็บทีเด็ดฟุตบอลที่คัดโดยมนุษย์ คนหนึ่งคน — The Curator — เป็นผู้เลือกแมตช์และมุมมอง ส่วน AI ดำเนินการทุกอย่างที่เหลือ: เขียนบทวิเคราะห์ เผยแพร่ ตัดสินผล และเก็บทุกทีเด็ดไว้ต่อสาธารณะตลอดไป มนุษย์เลือก AI ดำเนินการ — เปิดเผยไว้ในทุกทีเด็ด",
    cards: [
      {
        heading: "คัดสรร ไม่ใช่ทำนาย",
        body: "ทุกทีเด็ดผ่านการค้นคว้าและมีเหตุผลรองรับ — ไม่สุ่ม ไม่มีการการันตี เราแบ่งปันมุมมอง ไม่ใช่คำพยากรณ์",
      },
      {
        heading: "ทุกทีเด็ด เปิดเผยตลอดไป",
        body: "ราคาต่อรองถูกบันทึกทันทีที่เผยแพร่ทีเด็ดและไม่มีการแก้ไข ชนะ แพ้ คืนทุน — สถิติทั้งหมดแสดงไว้เสมอ เริ่มต้นจากศูนย์",
      },
      {
        heading: "ฟรี เพื่อคอบอลทั่วโลก",
        body: "ไม่มีระดับ VIP ไม่มีกำแพงจ่ายเงิน ไม่มีพันธมิตรเจ้ามือรับแทง ผู้เล่นจากทุกไทม์โซน เชื่อมกันด้วยความรักในเกมลูกหนัง",
      },
    ],
    promiseTitle: "คำมั่นสัญญา",
    promises: [
      "มีมนุษย์เพียงด่านเดียว: The Curator เป็นผู้ส่งทีเด็ด ทุกขั้นตอนหลังจากนั้นเป็นอัตโนมัติและแทรกแซงไม่ได้",
      "ป้ายสถานะนับชนะครึ่งเป็น ชนะ และแพ้ครึ่งเป็น แพ้ — แต่กำไร/ขาดทุนยูนิตตามราคาต่อรองบอลเอเชียจริงจะแสดงคู่กับสถิติเสมอ",
      "แพ้เราก็ลงให้ดู เพื่อความบันเทิงเท่านั้น — ไม่ใช่คำแนะนำทางการเงิน",
    ],
  },
  es: {
    title: "Acerca de WildlyPlay",
    intro:
      "WildlyPlay es un sitio de picks de fútbol dirigido por un curador. Un humano — The Curator — elige los partidos y los ángulos. La IA opera todo lo demás: escribe el análisis, publica, liquida el resultado y archiva cada pick públicamente, para siempre. Picks humanos, operación por IA — declarado en cada jugada.",
    cards: [
      {
        heading: "Curado, no predicho",
        body: "Cada pick se investiga y se razona — nunca al azar, nunca garantizado. Compartimos perspectivas, no predicciones.",
      },
      {
        heading: "Cada pick, público para siempre",
        body: "Las cuotas se capturan en el momento en que se publica un pick y nunca se editan. Ganadas, perdidas, push — el historial completo queda a la vista, empezando desde cero.",
      },
      {
        heading: "Gratis, para la afición global",
        body: "Sin niveles VIP, sin muros de pago, sin afiliados de casas de apuestas. Jugadores de todas las zonas horarias, unidos por el amor al fútbol.",
      },
    ],
    promiseTitle: "La promesa",
    promises: [
      "Una sola puerta humana: The Curator envía el pick. Todo lo que sigue es automatizado y a prueba de manipulación.",
      "Las medias ganancias cuentan como GANADA y las medias pérdidas como PERDIDA en la insignia — pero el G/P real en unidades del hándicap asiático siempre se muestra junto al balance.",
      "También publicamos nuestras pérdidas. Solo entretenimiento — nunca asesoría financiera.",
    ],
  },
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const lang = resolveLang((await searchParams).lang);
  return {
    title: copy[lang].title,
    description: copy[lang].intro.slice(0, 160),
    openGraph: { title: `${copy[lang].title} | WildlyPlay`, images: ["/api/og/home"] },
  };
}

export default async function AboutPage({ searchParams }: Props) {
  const lang = resolveLang((await searchParams).lang);
  const c = copy[lang];

  return (
    <div className="mx-auto max-w-[800px] px-5 py-12">
      <h1 className="gradient-text text-center font-display text-4xl font-bold">{c.title}</h1>
      <p className="mx-auto mt-6 max-w-[680px] text-center leading-relaxed text-ink/90">
        {c.intro}
      </p>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {c.cards.map((card) => (
          <div key={card.heading} className="rounded-card border border-line bg-card p-6">
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
              <span className="mt-0.5 text-brand">✓</span>
              {item}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

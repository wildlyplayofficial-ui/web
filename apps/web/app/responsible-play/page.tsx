import type { Metadata } from "next";
import { resolveLang, type Lang } from "@/lib/i18n";

export const revalidate = 300;

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

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
      "WildlyPlay is entertainment, full stop. Our picks are perspectives on the beautiful game — not predictions, not investment advice, and never a way to make a living. If you choose to play along, do it for fun and keep it that way.",
    rulesTitle: "House rules for yourself",
    rules: [
      "Only play with money you can comfortably afford to lose.",
      "Set a budget and a time limit before you start — and stick to both.",
      "Never chase losses. A bad day stays a bad day; don't make it a bad week.",
      "Don't play when upset, tired, or under the influence.",
      "Gambling is not a source of income. If it stops being fun, stop.",
      "Be honest with yourself and the people around you about how much you play.",
    ],
    helpTitle: "If it stops being fun",
    helpBody:
      "If you or someone you know struggles with gambling, please reach out to a local support organisation such as Gamblers Anonymous (gamblersanonymous.org) or the support services available in your country. Talking to someone is the first step — and it works.",
  },
  vi: {
    title: "Chơi Có Trách Nhiệm",
    intro:
      "WildlyPlay là giải trí, chấm hết. Kèo của chúng tôi là góc nhìn về bóng đá — không phải dự đoán chắc thắng, không phải lời khuyên đầu tư, và không bao giờ là cách kiếm sống. Nếu bạn chọn chơi theo, hãy chơi cho vui và giữ đúng tinh thần đó.",
    rulesTitle: "Nguyên tắc cho chính bạn",
    rules: [
      "Chỉ chơi với số tiền bạn hoàn toàn có thể mất mà không ảnh hưởng cuộc sống.",
      "Đặt ngân sách và giới hạn thời gian trước khi bắt đầu — và tuân thủ cả hai.",
      "Đừng bao giờ gỡ. Một ngày xấu là một ngày xấu; đừng biến nó thành một tuần xấu.",
      "Không chơi khi đang buồn bực, mệt mỏi hay có men.",
      "Cá cược không phải nguồn thu nhập. Khi hết vui, hãy dừng lại.",
      "Trung thực với bản thân và người thân về mức độ chơi của mình.",
    ],
    helpTitle: "Khi không còn vui nữa",
    helpBody:
      "Nếu bạn hoặc người quen gặp vấn đề với cờ bạc, hãy tìm đến các tổ chức hỗ trợ như Gamblers Anonymous (gamblersanonymous.org) hoặc dịch vụ hỗ trợ tại quốc gia của bạn. Nói chuyện với ai đó là bước đầu tiên — và nó thực sự hiệu quả.",
  },
  th: {
    title: "เล่นอย่างมีความรับผิดชอบ",
    intro:
      "WildlyPlay คือความบันเทิง จบแค่นั้น ทีเด็ดของเราคือมุมมองต่อเกมฟุตบอล — ไม่ใช่คำทำนาย ไม่ใช่คำแนะนำการลงทุน และไม่ใช่หนทางหาเลี้ยงชีพเด็ดขาด ถ้าคุณเลือกจะเล่นตาม ขอให้เล่นเพื่อความสนุกและรักษามันไว้แบบนั้น",
    rulesTitle: "กติกาที่ตั้งไว้ให้ตัวคุณเอง",
    rules: [
      "เล่นเฉพาะด้วยเงินที่เสียไปแล้วไม่กระทบชีวิตของคุณเท่านั้น",
      "ตั้งงบประมาณและกำหนดเวลาเล่นก่อนเริ่ม — และทำตามทั้งสองอย่าง",
      "อย่าตามทุนเด็ดขาด วันที่แย่ก็ให้จบที่วันที่แย่ อย่าให้กลายเป็นสัปดาห์ที่แย่",
      "อย่าเล่นตอนหงุดหงิด เหนื่อยล้า หรือมึนเมา",
      "การพนันไม่ใช่แหล่งรายได้ เมื่อไหร่ที่ไม่สนุกแล้ว ให้หยุด",
      "ซื่อสัตย์กับตัวเองและคนรอบข้างว่าคุณเล่นมากแค่ไหน",
    ],
    helpTitle: "เมื่อมันไม่สนุกอีกต่อไป",
    helpBody:
      "หากคุณหรือคนที่คุณรู้จักมีปัญหากับการพนัน โปรดติดต่อองค์กรช่วยเหลือ เช่น Gamblers Anonymous (gamblersanonymous.org) หรือบริการช่วยเหลือที่มีในประเทศของคุณ การได้พูดคุยกับใครสักคนคือก้าวแรก — และมันได้ผลจริง",
  },
  es: {
    title: "Juego Responsable",
    intro:
      "WildlyPlay es entretenimiento, punto. Nuestros picks son perspectivas sobre el fútbol — no predicciones, no asesoría de inversión, y nunca una forma de ganarse la vida. Si decides jugar, hazlo por diversión y que siga siendo así.",
    rulesTitle: "Reglas de la casa para ti mismo",
    rules: [
      "Juega solo con dinero que puedas permitirte perder sin problema.",
      "Define un presupuesto y un límite de tiempo antes de empezar — y respeta ambos.",
      "Nunca persigas las pérdidas. Un mal día se queda en un mal día; no lo conviertas en una mala semana.",
      "No juegues si estás molesto, cansado o bajo los efectos del alcohol u otras sustancias.",
      "Apostar no es una fuente de ingresos. Si deja de ser divertido, detente.",
      "Sé honesto contigo mismo y con las personas a tu alrededor sobre cuánto juegas.",
    ],
    helpTitle: "Si deja de ser divertido",
    helpBody:
      "Si tú o alguien que conoces tiene problemas con el juego, busca una organización de apoyo local como Gamblers Anonymous (gamblersanonymous.org) o los servicios de ayuda disponibles en tu país. Hablar con alguien es el primer paso — y funciona.",
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

export default async function ResponsiblePlayPage({ searchParams }: Props) {
  const lang = resolveLang((await searchParams).lang);
  const c = copy[lang];

  return (
    <div className="mx-auto max-w-[720px] px-5 py-12">
      <h1 className="gradient-text text-center font-display text-4xl font-bold">{c.title}</h1>
      <p className="mt-6 leading-relaxed text-ink/90">{c.intro}</p>

      <section className="mt-10 rounded-card border border-line bg-card p-8">
        <h2 className="font-display text-xl font-bold">{c.rulesTitle}</h2>
        <ul className="mt-4 flex flex-col gap-3">
          {c.rules.map((rule) => (
            <li key={rule} className="flex gap-3 text-sm leading-relaxed text-ink/90">
              <span className="mt-0.5 text-brand">•</span>
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

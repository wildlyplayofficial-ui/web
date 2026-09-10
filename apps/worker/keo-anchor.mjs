/**
 * Tra dấu neo trận trên /keo để bài viết trỏ thẳng vào đúng dòng trận.
 * Bản JS của C:/Users/PC/.claude/tools/keo_anchor.py — cùng luật, để template đăng bài dùng được
 * mà không phải gọi sang Python.
 *
 * Luật (Gwen cảnh báo 10/9/2026): dấu neo lấy NGUYÊN VĂN tên đội từ nhà cung cấp kèo
 * (tran-sevilla-fc-vs-valencia-cf). Bài ghi "Sevilla vs Valencia" mà tự chế slug là link rơi vào
 * khoảng không MÀ TRANG VẪN MỞ BÌNH THƯỜNG — hỏng câm. Nên: tra bảng thật, không khớp thì trả rỗng.
 */
// 10/9 Gwen đo: banhbong.net/keo trả 308 sang bản www — đi thẳng www, khỏi tốn một chặng.
const URL_KEO = 'https://www.banhbong.net/keo';
let cache = { luc: 0, slugs: [] };

const bo_dau = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export async function danhSach(lamMoi = false) {
  if (!lamMoi && Date.now() - cache.luc < 600000 && cache.slugs.length) return cache.slugs;
  const r = await fetch(URL_KEO, { headers: { 'User-Agent': 'banhbong-keo-anchor/1.0' } });
  if (!r.ok) return cache.slugs;
  const html = await r.text();
  // Trang gắn neo bằng data-tran="..." chứ KHÔNG phải id="..." (hai bản hiển thị điện thoại/máy
  // tính cùng nằm trong DOM, đặt id là trùng id). Grep id="tran- sẽ ra 0 và tưởng nhầm chưa có neo.
  cache = { luc: Date.now(), slugs: [...new Set([...html.matchAll(/data-tran="(tran-[a-z0-9-]+)"/g)].map((m) => m[1]))] };
  return cache.slugs;
}

const khop = (ten, benBang) => {
  const a = new Set(ten.split('-').filter(Boolean));
  const b = new Set(benBang.split('-').filter(Boolean));
  if (!a.size) return false;
  const trong = (x, y) => [...x].every((t) => y.has(t));
  return trong(a, b) || trong(b, a);
};

/** Trả dấu neo, hoặc '' khi trận không có trên bảng / khớp nhiều trận / tên quá mơ hồ. */
export async function timNeo(home, away) {
  const h = bo_dau(home || ''), a = bo_dau(away || '');
  if (!h || !a) return '';
  const slugs = await danhSach();
  // 10/9 Gwen đếm trên bảng thật: 103 đội, 14 từ dính nhiều hơn một đội (manchester, real, city,
  // barcelona...). "Barcelona" đứng một mình khớp cả fc-barcelona lẫn espanyol-barcelona. Nên tên
  // CHỈ MỘT TỪ phải là duy nhất trên toàn bảng mới cho gắn neo, không thì trả rỗng.
  const ben = new Set();
  for (const s of slugs) {
    const than = s.slice('tran-'.length);
    if (than.includes('-vs-')) than.split('-vs-').forEach((x) => ben.add(x));
  }
  const moHo = (ten) => {
    const tu = ten.split('-').filter(Boolean);
    if (tu.length !== 1) return false;
    return [...ben].filter((x) => x.split('-').includes(tu[0])).length > 1;
  };
  if (moHo(h) || moHo(a)) return '';
  const hop = slugs.filter((s) => {
    const than = s.slice('tran-'.length);
    if (!than.includes('-vs-')) return false;
    const [sh, sa] = than.split('-vs-');
    return khop(h, sh) && khop(a, sa);
  });
  return hop.length === 1 ? hop[0] : '';
}

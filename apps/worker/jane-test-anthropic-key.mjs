// Kiểm khoá Claude còn dùng được không. KHÔNG in nội dung khoá.
const key = process.env.ANTHROPIC_API_KEY;
if (!key) { console.log('ANTHROPIC_API_KEY: KHÔNG có trong môi trường'); process.exit(0); }
console.log(`khoá: có, ${key.length} ký tự, mở đầu ${key.slice(0, 7)}…`);

const res = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
  body: JSON.stringify({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1,
    messages: [{ role: 'user', content: 'hi' }],
  }),
});
const body = await res.text();
console.log(`gọi thử API: HTTP ${res.status}`);
if (res.status === 200) console.log('=> KHOÁ CÒN SỐNG, gọi được bình thường');
else console.log('=> lỗi:', body.slice(0, 300));

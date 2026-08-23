/**
 * Tên hai nhân vật trên bản tiếng Việt.
 *
 * Nick chốt 23/8: "Scout" gọi là "Trợ lý AI", "Curator"/"Admin" gọi là
 * "Chú Tám Banh". Từ điển giao diện đã đổi từ 22/8, nhưng NỘI DUNG do máy sinh
 * ra thì vẫn còn tên cũ — đo 23/8: 77 bài tiếng Việt đã đăng và 1 bản dịch nhận
 * định còn chữ "Admin"/"Curator", ví dụ "Lý do Admin đưa ra khá rõ ràng".
 *
 * Đổi ở tầng ĐỌC chứ không sửa dữ liệu: sửa 77 bài đã đăng là chạm vào nội dung
 * production, phải có người duyệt; mà kể cả sửa xong, bài mới sinh ra vẫn có thể
 * lọt tên cũ. Chặn ở đây thì mọi đường đều sạch, và trả lại chỉ cần bỏ một hàm.
 *
 * Thứ tự luật có ý nghĩa: "Người Admin" phải xử trước "Admin", không thì thành
 * "Người Chú Tám Banh".
 */
const RULES: ReadonlyArray<readonly [RegExp, string]> = [
  [/\bNgười\s+Admin\b/g, "Chú Tám Banh"],
  [/\b[Tt]he\s+Curator\b/g, "Chú Tám Banh"],
  [/\b[Tt]he\s+Scout\b/g, "Trợ lý AI"],
  [/\bAdmin\b/g, "Chú Tám Banh"],
  [/\bCurator\b/g, "Chú Tám Banh"],
  [/\bScout\b/g, "Trợ lý AI"],
];

/** Đổi tên nhân vật trong một đoạn chữ. Giữ nguyên null/undefined. */
export function viPersona<T extends string | null | undefined>(text: T): T {
  if (!text) return text;
  let out = text as string;
  for (const [pattern, name] of RULES) out = out.replace(pattern, name);
  return out as T;
}

/** Đổi tên trong các trường chữ của một bản ghi. Trường nào không có thì bỏ qua. */
export function viPersonaFields<T extends object>(row: T, fields: readonly (keyof T)[]): T {
  const patched = { ...row };
  for (const f of fields) {
    const v = patched[f];
    if (typeof v === "string") patched[f] = viPersona(v) as T[typeof f];
  }
  return patched;
}

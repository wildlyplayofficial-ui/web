import { describe, expect, it } from "vitest";
import { giaiTrongBai, linkDuDoanCuoiBai } from "./link-du-doan";

describe("giaiTrongBai", () => {
  it("nhận ra Ngoại hạng Anh từ tiêu đề tiếng Việt", () => expect(giaiTrongBai("Xem Ngoại hạng Anh 2026-27 ở đâu")?.slug).toBe("ngoai-hang-anh"));
  it("nhận ra Cúp C1 từ slug", () => expect(giaiTrongBai("xem-cup-c1-2026-27-o-dau-vtvcab")?.slug).toBe("cup-c1"));
  it("nhận ra Serie A từ slug có gạch", () => expect(giaiTrongBai("xem-serie-a-2026-27-o-dau-viet-nam")?.slug).toBe("serie-a"));
  it("bài không nói giải lớn nào thì null", () => expect(giaiTrongBai("Xem MLS 2026 ở đâu Việt Nam")).toBeNull());
});

describe("linkDuDoanCuoiBai", () => {
  it("giải của bài đứng đầu, đủ 6 giải lớn, không trùng", () => {
    const ds = linkDuDoanCuoiBai("Lịch thi đấu La Liga");
    expect(ds[0]).toEqual({ href: "/competitions/la-liga", ten: "Dự đoán La Liga" });
    expect(new Set(ds.map((x) => x.href)).size).toBe(6);
  });
  it("bài chung chung vẫn có 6 link giải lớn", () => expect(linkDuDoanCuoiBai("Quả bóng vàng ai nhiều nhất")).toHaveLength(6));
});

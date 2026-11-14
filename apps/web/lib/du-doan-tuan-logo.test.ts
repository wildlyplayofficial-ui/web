import { describe, expect, it } from "vitest";
import { logo, logoTheoGiai } from "./du-doan-tuan";

describe("logoTheoGiai: trùng tên khác CLB", () => {
  it("Liverpool FC của Uruguay không mượn huy hiệu Liverpool nước Anh", () => {
    expect(logoTheoGiai("Liverpool FC", "Uruguay Primera Division Finals")).toBeNull();
  });
  it("Liverpool nước Anh vẫn có huy hiệu", () => {
    expect(logoTheoGiai("Liverpool", "England Premier League")).toBe(logo("Liverpool"));
    expect(logo("Liverpool")).not.toBeNull();
  });
});

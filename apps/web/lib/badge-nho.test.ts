import { describe, expect, it } from "vitest";
import { badgeNho } from "./team-badges";

describe("badgeNho", () => {
  it("logo TheSportsDB lấy bản /tiny", () => {
    expect(badgeNho("https://r2.thesportsdb.com/images/media/team/badge/abc.png")).toBe("https://r2.thesportsdb.com/images/media/team/badge/abc.png/tiny");
  });
  it("nguồn khác giữ nguyên", () => {
    expect(badgeNho("https://flagcdn.com/w80/vn.png")).toBe("https://flagcdn.com/w80/vn.png");
  });
  it("không có logo trả null", () => {
    expect(badgeNho(null)).toBeNull();
  });
});

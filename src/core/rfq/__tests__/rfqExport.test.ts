import { describe, expect, it } from "vitest";
import { buildRfqEmail } from "@/core/rfq/rfqExport";

describe("buildRfqEmail", () => {
  it("składa treść maila z listą materiałów", () => {
    const text = buildRfqEmail(
      [
        { id: "1", nazwa: "Rura PEX 16x2.0", kod: "PEX-16", ilosc: 50, jednostka: "szt." },
        { id: "2", nazwa: "", kod: "", ilosc: 0, jednostka: "szt." },
      ],
      "Instal-Tech",
    );
    expect(text).toContain("Dzień dobry");
    expect(text).toContain("rabatów stałych");
    expect(text).toContain("Rura PEX 16x2.0 [PEX-16] — 50 szt.");
    expect(text).toContain("Instal-Tech");
    expect(text).not.toContain("Alfa");
  });
});

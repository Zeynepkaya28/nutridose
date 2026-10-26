import { describe, expect, it } from "vitest";
import { convertAmount } from "../chain/units";
import { InvalidInputError } from "../errors";
import { escalate, maxSeverity, severityRank, severityToStatus } from "../severity";
import { matchesAnyKey, normalize, splitManualText, substanceKeys } from "../text";
import { isConditionCode } from "../types";

describe("normalize", () => {
  it("handles Turkish casing and diacritics", () => {
    expect(normalize("  Ispanak ")).toBe("ispanak");
    expect(normalize("ıspanak")).toBe("ispanak");
    expect(normalize("İLAÇ   Süt")).toBe("ilac sut");
  });
});

describe("splitManualText", () => {
  it("splits on commas, semicolons, plus, new lines and 've'", () => {
    expect(splitManualText("ıspanak, greyfurt suyu ve süt; muz + elma\nekmek")).toEqual([
      "ıspanak",
      "greyfurt suyu",
      "süt",
      "muz",
      "elma",
      "ekmek",
    ]);
  });
  it("drops empty parts", () => {
    expect(splitManualText(" , ,muz,, ")).toEqual(["muz"]);
  });
});

describe("substance keys", () => {
  const vitK = { id: "1", name: "K vitamini", synonyms: ["Vitamin K"] };
  it("includes name and synonyms normalised", () => {
    expect(substanceKeys(vitK)).toEqual(["k vitamini", "vitamin k"]);
    expect(substanceKeys({ id: "2", name: "Demir" })).toEqual(["demir"]);
  });
  it("matches against a key set", () => {
    expect(matchesAnyKey(vitK, new Set(["vitamin k"]))).toBe(true);
    expect(matchesAnyKey(vitK, new Set(["demir"]))).toBe(false);
  });
});

describe("severity", () => {
  it("ranks and picks the max", () => {
    expect(severityRank("info")).toBeLessThan(severityRank("contraindicated"));
    expect(maxSeverity("caution", "high")).toBe("high");
    expect(maxSeverity("high", "caution")).toBe("high");
  });
  it("escalates one level, never to contraindicated", () => {
    expect(escalate("info")).toBe("caution");
    expect(escalate("caution")).toBe("high");
    expect(escalate("high")).toBe("high");
    expect(escalate("contraindicated")).toBe("contraindicated");
  });
  it("maps to finding status", () => {
    expect(severityToStatus("info")).toBe("pass");
    expect(severityToStatus("caution")).toBe("caution");
    expect(severityToStatus("high")).toBe("high");
    expect(severityToStatus("contraindicated")).toBe("high");
  });
});

describe("isConditionCode", () => {
  it("accepts only known codes", () => {
    expect(isConditionCode("renal")).toBe(true);
    expect(isConditionCode("oncology")).toBe(false);
    expect(isConditionCode(3)).toBe(false);
  });
});

describe("convertAmount", () => {
  it("converts mass units", () => {
    expect(convertAmount(400, "mg", "g")).toBeCloseTo(0.4);
    expect(convertAmount(1, "g", "mg")).toBe(1000);
    expect(convertAmount(5, " MCG", "µg")).toBe(5);
    expect(convertAmount(2, "IU", "iu")).toBe(2);
  });
  it("returns null for unknown or incompatible units", () => {
    expect(convertAmount(1, "IU", "mg")).toBeNull();
    expect(convertAmount(1, "mg", "ml")).toBeNull();
  });
});

describe("InvalidInputError", () => {
  it("keeps the user-facing message", () => {
    const error = new InvalidInputError("Hatalı girdi");
    expect(error.name).toBe("InvalidInputError");
    expect(error.message).toBe("Hatalı girdi");
    expect(error).toBeInstanceOf(Error);
  });
});

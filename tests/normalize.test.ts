// Normalisation rewrites whole words only. An unparenthesised alternation such
// as /\bchar|chaar\b/ binds as (\bchar)|(chaar\b) and eats word fragments,
// which silently corrupts the message before any field is extracted.
import { describe, it, expect } from "vitest";
import { normalize } from "../src/core/parsar/normalize.js";

describe("normalize", () => {
  it("leaves words that merely start or end with a vocabulary token alone", () => {
    expect(normalize("charcoal grey shirt chahiye")).toBe("charcoal grey shirt chahiye");
    expect(normalize("extra charge lagega")).toBe("extra charge lagega");
    expect(normalize("kashir kapda")).toBe("kashir kapda");
    expect(normalize("chhena mithai")).toBe("chhena mithai");
  });

  it("still rewrites the tokens themselves", () => {
    expect(normalize("char kurta")).toBe("4 kurta");
    expect(normalize("chaar kurta")).toBe("4 kurta");
    expect(normalize("chhe kurta")).toBe("6 kurta");
    expect(normalize("shir silwana hai")).toBe("shirt silwana hai");
    expect(normalize("koti silwani hai")).toBe("waistcoat silwani hai");
  });
});

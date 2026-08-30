import { describe, it, expect } from "vitest";
import { parse, InputRecord } from "../src/core/parsar/parse.js";
import { extractItems } from "../src/core/parsar/extract.js";

describe("Orange and related color parsing test suite", () => {
  const makeRec = (message: string): InputRecord => ({
    id: "test-rec",
    domain: "tailor",
    received_at: "2026-09-01T10:00:00+05:30",
    message,
  });

  it("extracts 'orange' from standard natural language statements", () => {
    const items = extractItems("2 orange kurtas chest 42 waist 36", "tailor");
    expect(items).toHaveLength(1);
    expect(items[0].description).toBe("kurta");
    expect(items[0].quantity).toBe(2);
    expect(items[0].attributes.color).toBe("orange");
    expect(items[0].attributes.chest).toBe(42);
    expect(items[0].attributes.waist).toBe(36);
  });

  it("extracts orange when customer uses Hindi / regional synonyms (narangi, kesari, santri, bhagwa)", () => {
    const p1 = parse(makeRec("1 narangi shirt chest 40"));
    expect(p1.items[0].attributes.color).toBe("orange");

    const p2 = parse(makeRec("2 kesari kurta chest 44"));
    expect(p2.items[0].attributes.color).toBe("orange");

    const p3 = parse(makeRec("1 santri pajama waist 34"));
    expect(p3.items[0].attributes.color).toBe("orange");

    const p4 = parse(makeRec("1 bhagwa kurta chest 42"));
    expect(p4.items[0].attributes.color).toBe("orange");

    const p5 = parse(makeRec("1 gerua kurti"));
    expect(p5.items[0].attributes.color).toBe("orange");

    const p6 = parse(makeRec("1 saffron sherwani chest 44"));
    expect(p6.items[0].attributes.color).toBe("orange");
  });

  it("extracts orange with compound color phrases (burnt orange, orange colour, orange color, orange rang)", () => {
    const p1 = parse(makeRec("2 burnt orange shirts chest 40"));
    expect(p1.items[0].attributes.color).toBe("orange");

    const p2 = parse(makeRec("1 kurta orange colour ka chest 42"));
    expect(p2.items[0].attributes.color).toBe("orange");

    const p3 = parse(makeRec("1 kurta, color: orange, chest: 42, waist: 36"));
    expect(p3.items[0].attributes.color).toBe("orange");
    expect(p3.items[0].attributes.chest).toBe(42);
    expect(p3.items[0].attributes.waist).toBe(36);
  });

  it("handles multi-item orders where one item is orange and another is different", () => {
    const p = parse(makeRec("2 orange kurtas chest 42 waist 36 aur 1 white pajama by Monday"));
    expect(p.items).toHaveLength(2);
    expect(p.items[0].description).toBe("kurta");
    expect(p.items[0].quantity).toBe(2);
    expect(p.items[0].attributes.color).toBe("orange");

    expect(p.items[1].description).toBe("pant");
    expect(p.items[1].quantity).toBe(1);
    expect(p.items[1].attributes.color).toBe("white");
  });
});

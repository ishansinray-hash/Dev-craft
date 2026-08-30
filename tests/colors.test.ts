// Colour extraction after merging the shared palette into the domain vocabulary.
// The corpus writes the colour after the item ("kameez navy blue"), so the
// attribute window starts at the item and runs to the next one.
import { describe, it, expect } from "vitest";
import { extractItems } from "../src/core/parsar/extract.js";

const colorOf = (message: string, domain: "tailor" | "baker") =>
  extractItems(message, domain).map((i) => i.attributes.color ?? null);

describe("colour extraction", () => {
  it("reads colours the tailor list does not carry, from the shared palette", () => {
    expect(colorOf("do kurta orange chest 40", "tailor")).toEqual(["orange"]);
    expect(colorOf("ek shirt charcoal chest 38", "tailor")).toEqual(["charcoal"]);
    expect(colorOf("do dupatta firozi", "tailor")).toEqual(["cyan"]);
    expect(colorOf("2 kurta narangi", "tailor")).toEqual(["orange"]);
  });

  it("keeps the more precise domain reading over the generic one", () => {
    expect(colorOf("do kameez navy blue chest 36", "tailor")).toEqual(["navy blue"]);
    expect(colorOf("ek lehenga bottle green", "tailor")).toEqual(["bottle green"]);
  });

  it("does not read a bakery flavour as a colour", () => {
    // "red velvet" and "black forest" are flavours; the labelled data carries no
    // colour for any domain but tailor.
    expect(colorOf("paanch cupcake red velvet", "baker")).toEqual([null]);
    expect(colorOf("do cookies black forest flavour", "baker")).toEqual([null]);
  });
});

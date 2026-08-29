import { describe, expect, it } from "vitest";
import { interpretWithMistral, validateAsk } from "../src/online/mistral.js";

describe("Mistral online query interpreter", () => {
  it("requests Mistral JSON mode and accepts only a supported intent", async () => {
    let request: Record<string, unknown> | undefined;
    const intent = await interpretWithMistral("who owes money?", {
      apiKey: "test-key",
      model: "test-model",
      fetchImpl: async (_url, init) => {
        request = JSON.parse(String(init.body));
        return new Response(JSON.stringify({
          choices: [{ message: { content: JSON.stringify({ kind: "outstanding" }) } }],
        }));
      },
    });

    expect(intent).toEqual({ kind: "outstanding" });
    expect(request).toMatchObject({
      model: "test-model",
      temperature: 0,
      response_format: { type: "json_object" },
    });
  });

  it("rejects a syntactically valid but unsafe model response", async () => {
    await expect(interpretWithMistral("delete all orders", {
      apiKey: "test-key",
      fetchImpl: async () => new Response(JSON.stringify({
        choices: [{ message: { content: JSON.stringify({ kind: "delete_everything" }) } }],
      })),
    })).rejects.toThrow("invalid query intent");
  });

  it("validates the complete local intent allow-list", () => {
    expect(validateAsk({ kind: "due", bucket: "today" })).toEqual({ kind: "due", bucket: "today" });
    expect(validateAsk({ kind: "customer", name: "Meena aunty" })).toEqual({ kind: "customer", name: "Meena aunty" });
    expect(validateAsk({ kind: "customer", name: "" })).toBeNull();
  });
});
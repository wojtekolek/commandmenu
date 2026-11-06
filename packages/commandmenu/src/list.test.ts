import { describe, expect, it } from "vitest";
import { layoutList } from "./list";

describe("layoutList", () => {
  it("handles more async results than a call can take as spread arguments", () => {
    const results = Array.from({ length: 500_000 }, (_, i) => i);
    const { flat } = layoutList({
      entries: [],
      query: "",
      grouped: false,
      results,
      resultsId: undefined,
      resultsLabel: undefined,
    });
    expect(flat).toHaveLength(results.length);
  });
});

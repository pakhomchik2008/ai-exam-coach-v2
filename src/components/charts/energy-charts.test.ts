import { describe, expect, it } from "vitest";
import { buildHeatCells } from "./energy-charts";

describe("energy charts", () => {
  it("builds a 14-day heatmap with zeros for missing days", () => {
    const cells = buildHeatCells(14, { "2099-01-01": 4 });
    expect(cells).toHaveLength(14);
    expect(cells.every((c) => typeof c.count === "number")).toBe(true);
  });
});

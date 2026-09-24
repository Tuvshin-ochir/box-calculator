import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRequest, toBoxPayload } from "../../frontend/lib/api.ts";
import { divideAndRoundHalfUp, runMonteCarlo } from "../src/services/boxCalculator.js";
import { getBoxById, simulateBoxInput } from "../src/services/boxService.js";
import Box from "../src/models/Box.js";

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const items = [{ name: "A", valueMnt: 200, probabilityPpm: 1000000 }];

describe("reported workflow regressions", () => {
  it("accepts successful deletion without a JSON body", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    await expect(apiRequest("/api/boxes/test", { method: "DELETE" })).resolves.toBeUndefined();
  });
  it("exposes detailed validation errors", async () => {
    const errors = [{ message: "Invalid item" }];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: "Invalid", details: { errors } }), { status: 400 })));
    await expect(apiRequest("/api/boxes")).rejects.toMatchObject({ errors });
  });
  it("does not turn blank manual probability into a valid zero", () => {
    const payload = toBoxPayload("QA", "100", [{ name: "A", value: "50", probabilityPpm: " " }]);
    expect(JSON.parse(JSON.stringify(payload)).items[0].probabilityPpm).toBeNull();
    expect(toBoxPayload("QA", "100", [{ name: "A", value: "50", probabilityPpm: "0" }]).items[0].probabilityPpm).toBe(0);
  });
  it("rounds losses symmetrically and preserves exact negative integers", () => {
    expect(divideAndRoundHalfUp(-100000n, 1000n)).toBe(-100n);
    expect(divideAndRoundHalfUp(-5n, 2n)).toBe(-3n);
    expect(runMonteCarlo({ priceMnt: 100, items }).averageProfitLossMnt).toBe(-100);
  });
  it.each([[], [{ ...items[0], probabilityPpm: 999999 }], [{ ...items[0], valueMnt: 0 }]])("rejects invalid simulation items", (invalid) => {
    expect(() => runMonteCarlo({ priceMnt: 100, items: invalid })).toThrow();
    expect(() => simulateBoxInput({ priceMnt: 100, items: invalid })).toThrow();
  });
  it("allows loss-making risk analysis and uses supplied current price", () => {
    expect(simulateBoxInput({ priceMnt: 100, items })).toMatchObject({ totalProfitLossMnt: -100000, averageProfitLossMnt: -100 });
    expect(simulateBoxInput({ priceMnt: 300, items })).toMatchObject({ totalProfitLossMnt: 100000 });
  });
  it("returns the selected historical version and rejects missing versions", async () => {
    const box = new Box({ name: "QA", priceMnt: 300, maxRtpBps: 10000, items, versions: [{ versionNumber: 1, priceMnt: 100, items }] });
    vi.spyOn(Box, "findById").mockResolvedValue(box);
    expect(await getBoxById("id", "1")).toMatchObject({ priceMnt: 100, currentVersion: 1, items });
    await expect(getBoxById("id", "2")).rejects.toMatchObject({ statusCode: 404 });
    await expect(getBoxById("id", "abc")).rejects.toMatchObject({ statusCode: 400 });
  });
});

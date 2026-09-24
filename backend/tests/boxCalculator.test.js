import { describe, expect, it } from "vitest";
import {
  BPS_TOTAL,
  PPM_TOTAL,
  calculateBoxMetrics,
  calculateExpectedPlatformProfit,
  calculateExpectedValue,
  calculateHouseEdgeBps,
  calculatePpmDifference,
  calculateRtpBps,
  calculateTotalPpm,
  calculateUserProfitProbability,
  divideAndRoundHalfUp,
  isInteger,
  normalizeItemName,
  normalizeItems,
  runMonteCarlo,
  selectItemByPpm,
  validateDraft,
  validateItems,
  validateBox,
} from "../src/services/boxCalculator.js";

const canonicalItems = [
  { name: "Item A", valueMnt: 5_000, probabilityPpm: 500_000 },
  { name: "Item B", valueMnt: 10_000, probabilityPpm: 300_000 },
  { name: "Item C", valueMnt: 50_000, probabilityPpm: 200_000 },
];

describe("canonical box calculations", () => {
  it("normalizes inputs and accepts only safe integer values", () => {
    expect(isInteger(10)).toBe(true);
    expect(isInteger(10.5)).toBe(false);
    expect(normalizeItemName("  ITEM A ")).toBe("item a");
    expect(
      normalizeItems([{ name: " A ", value: 10, probabilityPpm: 2 }]),
    ).toEqual([{ name: "A", valueMnt: 10, probabilityPpm: 2 }]);
  });

  it("rounds positive BigInt division half up and rejects invalid denominators", () => {
    expect(divideAndRoundHalfUp(5n, 2n)).toBe(3n);
    expect(() => divideAndRoundHalfUp(1n, 0n)).toThrow();
  });

  it("matches manual calculation case #1", () => {
    expect(
      calculateBoxMetrics({ priceMnt: 20_000, items: canonicalItems }),
    ).toMatchObject({
      totalPpm: 1_000_000,
      differencePpm: 0,
      expectedValueMnt: 15_500,
      rtpBps: 7_750,
      houseEdgeBps: 2_250,
      expectedPlatformProfitMnt: 4_500,
      userProfitProbabilityPpm: 200_000,
    });
  });

  it.each([
    [
      {
        priceMnt: 10_000,
        items: [{ name: "A", valueMnt: 5_000, probabilityPpm: 1_000_000 }],
      },
      {
        expectedValueMnt: 5_000,
        rtpBps: 5_000,
        houseEdgeBps: 5_000,
        expectedPlatformProfitMnt: 5_000,
        userProfitProbabilityPpm: 0,
      },
    ],
    [
      {
        priceMnt: 30_000,
        items: [
          { name: "A", valueMnt: 10_000, probabilityPpm: 700_000 },
          { name: "B", valueMnt: 50_000, probabilityPpm: 300_000 },
        ],
      },
      {
        expectedValueMnt: 22_000,
        rtpBps: 7_333,
        houseEdgeBps: 2_667,
        expectedPlatformProfitMnt: 8_000,
        userProfitProbabilityPpm: 300_000,
      },
    ],
  ])("matches additional canonical manual cases", (input, expected) => {
    expect(calculateBoxMetrics(input)).toMatchObject({
      totalPpm: PPM_TOTAL,
      differencePpm: 0,
      ...expected,
    });
  });

  it("uses an exact BigInt numerator and explicit half-up rounding", () => {
    const result = calculateExpectedValue([
      { name: "Fraction", valueMnt: 1, probabilityPpm: 500_000 },
    ]);
    expect(result).toEqual({
      weightedValueNumerator: "500000",
      expectedValueMnt: 1,
    });
    expect(calculateRtpBps(result.weightedValueNumerator, 1)).toBe(5_000);
  });

  it("covers each calculation function", () => {
    expect(calculateTotalPpm(canonicalItems)).toBe(PPM_TOTAL);
    expect(calculatePpmDifference(canonicalItems)).toBe(0);
    expect(calculateHouseEdgeBps(7_750)).toBe(BPS_TOTAL - 7_750);
    expect(calculateExpectedPlatformProfit(20_000, 15_500)).toBe(4_500);
    expect(calculateUserProfitProbability(canonicalItems, 20_000)).toBe(
      200_000,
    );
  });

  it("validates draft and item warnings independently", () => {
    const itemResult = validateItems([
      { name: "Prize", valueMnt: 1, probabilityPpm: 0 },
    ]);
    expect(itemResult.errors).toEqual([]);
    expect(itemResult.warnings.map((warning) => warning.code)).toEqual([
      "ZERO_PROBABILITY_ITEM",
    ]);
    expect(validateDraft({ priceMnt: 10, items: [] }).isValid).toBe(true);
  });

  it("selects items at PPM boundaries", () => {
    const items = [
      { name: "First", valueMnt: 1, probabilityPpm: 500_000 },
      { name: "Second", valueMnt: 2, probabilityPpm: 500_000 },
    ];
    expect(selectItemByPpm(items, 0)?.name).toBe("First");
    expect(selectItemByPpm(items, 0.499999)?.name).toBe("First");
    expect(selectItemByPpm(items, 0.5)?.name).toBe("Second");
  });

  it.each([999_999, 1_000_001])(
    "blocks a total probability of %i",
    (probabilityPpm) => {
      const codes = validateBox({
        priceMnt: 10_000,
        items: [{ name: "Prize", valueMnt: 1, probabilityPpm }],
      }).errors.map((error) => error.code);
      expect(codes).toContain("INVALID_TOTAL_PPM");
    },
  );

  it.each([0, -1])("blocks price %i", (priceMnt) => {
    const codes = validateBox({
      priceMnt,
      items: [{ name: "Prize", valueMnt: 1, probabilityPpm: PPM_TOTAL }],
    }).errors.map((error) => error.code);
    expect(codes).toContain("INVALID_BOX_PRICE");
  });

  it("blocks no items, invalid item values and invalid probabilities", () => {
    expect(
      validateBox({ priceMnt: 1, items: [] }).errors.map((error) => error.code),
    ).toContain("NO_ITEMS");
    for (const valueMnt of [0, -1]) {
      expect(
        validateBox({
          priceMnt: 1,
          items: [{ name: "Prize", valueMnt, probabilityPpm: PPM_TOTAL }],
        }).errors.map((error) => error.code),
      ).toContain("INVALID_ITEM_VALUE");
    }
    for (const probabilityPpm of [-1, 1_000_001]) {
      expect(
        validateBox({
          priceMnt: 1,
          items: [{ name: "Prize", valueMnt: 1, probabilityPpm }],
        }).errors.map((error) => error.code),
      ).toContain("INVALID_ITEM_PROBABILITY");
    }
  });

  it("blocks duplicate and empty names, but only warns for zero PPM", () => {
    const result = validateBox({
      priceMnt: 10_000,
      items: [
        { name: " Prize ", valueMnt: 1, probabilityPpm: 500_000 },
        { name: "prize", valueMnt: 1, probabilityPpm: 0 },
        { name: "", valueMnt: 1, probabilityPpm: 500_000 },
      ],
    });
    expect(result.errors.map((error) => error.code)).toEqual(
      expect.arrayContaining(["DUPLICATE_ITEM_NAME", "ITEM_NAME_REQUIRED"]),
    );
    expect(result.warnings.map((warning) => warning.code)).toContain(
      "ZERO_PROBABILITY_ITEM",
    );
  });

  it("blocks RTP above the configurable threshold", () => {
    expect(
      validateBox({
        priceMnt: 10_000,
        maxRtpBps: 9_000,
        items: [{ name: "Prize", valueMnt: 10_000, probabilityPpm: PPM_TOTAL }],
      }).errors.map((error) => error.code),
    ).toContain("RTP_THRESHOLD_EXCEEDED");
  });

  it("runs deterministic 1,000-opening Monte Carlo simulation", () => {
    const sequence = [0.1, 0.9];
    let index = 0;
    expect(
      runMonteCarlo({
        priceMnt: 10_000,
        items: [
          { name: "Small", valueMnt: 5_000, probabilityPpm: 500_000 },
          { name: "Large", valueMnt: 15_000, probabilityPpm: 500_000 },
        ],
        random: () => sequence[index++ % 2],
      }),
    ).toMatchObject({
      openingCount: 1_000,
      totalRevenueMnt: 10_000_000,
      totalPayoutMnt: 10_000_000,
      totalProfitLossMnt: 0,
      averageProfitLossMnt: 0,
      minimumProfitLossMnt: -5_000,
      maximumProfitLossMnt: 5_000,
    });
  });

  it("rounds Monte Carlo average profit to whole MNT", () => {
    const result = runMonteCarlo({
      priceMnt: 100,
      openingCount: 3,
      items: [{ name: "Prize", valueMnt: 1, probabilityPpm: PPM_TOTAL }],
      random: () => 0,
    });

    expect(result.totalProfitLossMnt).toBe(297);
    expect(result.averageProfitLossMnt).toBe(99);
  });

});

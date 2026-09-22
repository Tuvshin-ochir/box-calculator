import { describe, expect, it } from "vitest";
import { createItemsCsv, parseItemsCsv } from "../../frontend/lib/csv.ts";

describe("csv import validation", () => {
  it("accepts valid csv rows and returns clean items", () => {
    const result = parseItemsCsv(`name,value,probabilityPpm
Item A,5000,500000
Item B,10000,300000
Item C,50000,200000`);

    expect(result.errors).toEqual([]);
    expect(result.items).toEqual([
      { name: "Item A", value: "5000", probabilityPpm: "500000" },
      { name: "Item B", value: "10000", probabilityPpm: "300000" },
      { name: "Item C", value: "50000", probabilityPpm: "200000" },
    ]);
  });

  it("ignores invalid rows and reports each issue clearly", () => {
    const result = parseItemsCsv(`name,value,probabilityPpm
Valid,1000,250000
Valid,2000,250000
,0,250000
Bad,-1,250000
Dup,1000,250000
Dup,1000,250000
Broken,abc,300000`);

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.items).toHaveLength(2);
    expect(result.items).toEqual([
      { name: "Valid", value: "1000", probabilityPpm: "250000" },
      { name: "Dup", value: "1000", probabilityPpm: "250000" },
    ]);
  });
});

describe("CSV export/import regressions", () => {
  const header = "name,value,probabilityPpm\n";

  it("round trips Unicode, commas, escaped quotes and multiline names", () => {
    const items = [
      { name: 'Монгол, "Шагнал"', value: "5000", probabilityPpm: "500000" },
      { name: "Item\nA", value: "10000", probabilityPpm: "300000" },
      { name: "Item\r\nB", value: "20000", probabilityPpm: "200000" },
      { name: '"', value: "1000", probabilityPpm: "0" },
    ];
    expect(parseItemsCsv(createItemsCsv(items))).toEqual({ items, errors: [] });
  });

  it("rejects an exported empty item name instead of turning it into a quote", () => {
    const result = parseItemsCsv(createItemsCsv([
      { name: "", value: "5000", probabilityPpm: "1000000" },
    ]));
    expect(result.items).toEqual([]);
    expect(result.errors).toContain("2-р мөр: name хоосон байна.");
  });

  it.each(["A,5000,", 'A,5000,""', "A,5000,   ", "A,5000"])(
    "rejects missing probability: %s", (row) => {
      const result = parseItemsCsv(header + row);
      expect(result.items).toEqual([]);
      expect(result.errors.length).toBeGreaterThan(0);
    },
  );

  it.each(["", "\uFEFF", header, header + "\n  \n", createItemsCsv([])])(
    "rejects files without item records: %j", (csv) => {
      expect(parseItemsCsv(csv).errors.length).toBeGreaterThan(0);
    },
  );

  it.each(['A"B",5000,1000000', '"A,5000,1000000', '"A"x,5000,1000000', 'A,5000,1000000,extra'])(
    "rejects malformed CSV: %s", (row) => {
      const result = parseItemsCsv(header + row);
      expect(result.items).toEqual([]);
      expect(result.errors.length).toBeGreaterThan(0);
    },
  );

  it("accepts BOM, CRLF, reordered columns and explicit zero probability", () => {
    expect(parseItemsCsv('\uFEFFprobabilityPpm,name,value\r\n0,A,5000\r\n')).toEqual({
      items: [{ name: "A", value: "5000", probabilityPpm: "0" }], errors: [],
    });
  });

  it("rejects duplicate or missing required headers", () => {
    for (const csv of ["name,value,value,probabilityPpm\nA,1,2,0", "name,value\nA,1"]) {
      expect(parseItemsCsv(csv).errors.length).toBeGreaterThan(0);
    }
  });

  it("reports physical line numbers after blank lines and multiline fields", () => {
    const result = parseItemsCsv(header + '\n"First\nPrize",5000,500000\nBad,5000,\n');
    expect(result.items).toHaveLength(1);
    expect(result.errors[0]).toMatch(/^5-р мөр:/);
  });
});

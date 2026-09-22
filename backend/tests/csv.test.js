import { describe, expect, it } from "vitest";
import { parseItemsCsv } from "../../frontend/lib/csv.ts";

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

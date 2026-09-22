import { afterEach, describe, expect, it, vi } from "vitest";
import { errorHandler } from "../src/middleware/errorHandler.js";
import Box from "../src/models/Box.js";
import { createBox, updateBox, validateBoxInput } from "../src/services/boxService.js";

const input = () => ({
  name: "Review box", priceMnt: 10_000,
  items: [{ name: "Prize", valueMnt: 8_000, probabilityPpm: 1_000_000 }],
});
const document = () => ({
  ...input(), maxRtpBps: 10_000,
  currentVersion: 1, versions: [], save: vi.fn().mockResolvedValue(undefined),
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

describe("box persistence and server validation", () => {
  it("ignores client status, threshold and calculated fields on creation", async () => {
    vi.stubEnv("MAX_RTP_BPS", "9000");
    const create = vi.spyOn(Box, "create").mockImplementation(async (data) => data);
    const box = await createBox({ ...input(), maxRtpBps: 20000, calculations: { rtpBps: 0 } });
    expect(create).toHaveBeenCalledOnce();
    expect(box).toMatchObject({ maxRtpBps: 9000, calculations: { rtpBps: 8000 } });
  });

  it("snapshots the edited version", async () => {
    const box = document();
    vi.spyOn(Box, "findById").mockResolvedValue(box);
    await updateBox("id", { items: [] });
    expect(box.currentVersion).toBe(2);
    expect(box.versions[0]).toMatchObject({ versionNumber: 2, items: [], calculations: { totalPpm: 0 } });
    expect(box.save).toHaveBeenCalledOnce();
  });

  it("rejects invalid edits without mutating the saved box", async () => {
    const box = document();
    vi.spyOn(Box, "findById").mockResolvedValue(box);
    await expect(updateBox("id", { priceMnt: -1 })).rejects.toMatchObject({ code: "INVALID_DRAFT" });
    expect(box.priceMnt).toBe(10000);
    expect(box.save).not.toHaveBeenCalled();
  });

  it("uses current server policy instead of a stored or client threshold", async () => {
    vi.stubEnv("MAX_RTP_BPS", "7000");
    const box = document();
    const validation = validateBoxInput({ ...input(), maxRtpBps: 20000 });
    expect(validation.errors.map(({ code }) => code)).toContain("RTP_THRESHOLD_EXCEEDED");
    expect(box.save).not.toHaveBeenCalled();
  });

  it.each(["", "bad", "-1", "1.5"])("fails closed for invalid server config %j", async (value) => {
    vi.stubEnv("MAX_RTP_BPS", value);
    const box = document();
    await expect(createBox(input())).rejects.toMatchObject({ code: "INVALID_RTP_THRESHOLD" });
    expect(box.save).not.toHaveBeenCalled();
  });

  it("blocks exact RTP above the threshold even when displayed BPS rounds down", () => {
    vi.stubEnv("MAX_RTP_BPS", "8000");
    const result = validateBoxInput({ priceMnt: 100000, items: [{ name: "Prize", valueMnt: 80001, probabilityPpm: 1000000 }] });
    expect(result.calculations.rtpBps).toBe(8000);
    expect(result.isValid).toBe(false);
  });

  it("enables optimistic concurrency to prevent stale edits", () => {
    expect(Box.schema.options.optimisticConcurrency).toBe(true);
  });
});

 it("returns a retryable conflict response for stale document writes", () => {
   const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
   errorHandler({ name: "VersionError" }, {}, res, vi.fn());
   expect(res.status).toHaveBeenCalledWith(409);
   expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: "BOX_UPDATE_CONFLICT" }));
 });

import Box from "../models/Box.js";
import {
  calculateBoxMetrics,
  DEFAULT_MAX_RTP_BPS,
  runMonteCarlo,
  validateBox,
  validateDraft,
} from "./boxCalculator.js";
import { AppError, notFoundError } from "../utils/errors.js";

function getMaxRtpBps(value) {
  if (value !== undefined) return value;
  const configured = Number(process.env.MAX_RTP_BPS);
  return Number.isSafeInteger(configured) ? configured : DEFAULT_MAX_RTP_BPS;
}

function boxInput(payload = {}, existing = {}) {
  return {
    name: payload.name ?? existing.name ?? "Untitled Box",
    priceMnt: payload.priceMnt ?? payload.price ?? existing.priceMnt,
    items: payload.items ?? existing.items ?? [],
    status: payload.status ?? existing.status ?? "DRAFT",
    maxRtpBps: getMaxRtpBps(payload.maxRtpBps ?? existing.maxRtpBps),
  };
}

function snapshot(box) {
  return {
    versionNumber: box.currentVersion,
    priceMnt: box.priceMnt,
    items: box.items.map((item) => ({
      name: item.name,
      valueMnt: item.valueMnt,
      probabilityPpm: item.probabilityPpm,
    })),
    calculations: box.calculations,
  };
}

function applyInput(box, input) {
  const calculations = calculateBoxMetrics(input);
  box.name = input.name;
  box.priceMnt = input.priceMnt;
  box.items = input.items;
  box.maxRtpBps = input.maxRtpBps;
  box.calculations = calculations;
  return calculations;
}

export function validateBoxInput(payload = {}) {
  const maxRtpBps = Number(process.env.MAX_RTP_BPS);
  return validateBox({
    ...payload,
    maxRtpBps: Number.isSafeInteger(maxRtpBps)
      ? maxRtpBps
      : DEFAULT_MAX_RTP_BPS,
  });
}

export async function createBox(payload) {
  const input = boxInput(payload);
  const draft = validateDraft(input);
  if (!draft.isValid)
    throw new AppError("INVALID_DRAFT", "Draft data is invalid.", 400, draft);
  const calculations = calculateBoxMetrics(input);
  return Box.create({
    ...input,
    status: "DRAFT",
    currentVersion: 1,
    calculations,
    versions: [
      {
        versionNumber: 1,
        priceMnt: input.priceMnt,
        items: input.items,
        calculations,
      },
    ],
  });
}

export async function getAllBoxes() {
  return Box.find({}).sort({ createdAt: -1 });
}
export async function getBoxById(id) {
  return Box.findById(id);
}

export async function updateBox(id, payload) {
  const box = await Box.findById(id);
  if (!box) throw notFoundError("box");
  const input = boxInput(payload, box);
  const draft = validateDraft(input);
  if (!draft.isValid)
    throw new AppError("INVALID_DRAFT", "Draft data is invalid.", 400, draft);
  applyInput(box, input);
  box.currentVersion += 1;
  box.versions.push(snapshot(box));
  await box.save();
  return box;
}

export async function deleteBox(id) {
  const box = await Box.findByIdAndDelete(id);
  if (!box) throw notFoundError("box");
}

export async function getVersions(id) {
  const box = await Box.findById(id).select("versions currentVersion");
  if (!box) throw notFoundError("box");
  return box.versions;
}

export async function simulateBox(id) {
  const box = await Box.findById(id);
  if (!box) throw notFoundError("box");
  return runMonteCarlo({ priceMnt: box.priceMnt, items: box.items });
}

export async function publishBox(boxOrId, payload) {
  const box =
    typeof boxOrId === "string" ? await Box.findById(boxOrId) : boxOrId;

  if (!box) throw notFoundError("box");

  const input = boxInput(payload ?? box, box);
  const validation = validateBox({
    ...input,
    maxRtpBps: getMaxRtpBps(input.maxRtpBps ?? box.maxRtpBps),
  });

  if (!validation.isValid) {
    throw new AppError(
      "INVALID_BOX",
      "Box validation failed before publishing.",
      400,
      validation,
    );
  }

  box.name = input.name;
  box.priceMnt = input.priceMnt;
  box.items = input.items;
  box.maxRtpBps = input.maxRtpBps;
  box.calculations = validation.calculations;
  box.status = "LIVE";

  if (typeof box.save === "function") {
    await box.save();
  }

  return box;
}

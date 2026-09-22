/** Canonical BigInt-backed business calculations for Box Management. */
export const PPM_TOTAL = 1_000_000;
export const BPS_TOTAL = 10_000;
export const DEFAULT_MAX_RTP_BPS = 10_000;

const PPM_BIGINT = BigInt(PPM_TOTAL);
const BPS_BIGINT = BigInt(BPS_TOTAL);

// Бүхэл тоо шалгах
export const isInteger = (value) =>
  typeof value === "number" && Number.isSafeInteger(value);

//Item нэрийг стандарт хэлбэрт оруулах (trim, lowercase)
export const normalizeItemName = (name) =>
  String(name ?? "")
    .trim()
    .toLocaleLowerCase();

//Item стандарт хэлбэрт оруулах (name, valueMnt, probabilityPpm)
export function normalizeItems(items) {
  return Array.isArray(items)
    ? items.map((item) => ({
        name: String(item?.name ?? "").trim(),
        valueMnt: item?.valueMnt ?? item?.value,
        probabilityPpm: item?.probabilityPpm,
      }))
    : [];
}

// Хуваагаад тоймлох.
export function divideAndRoundHalfUp(numerator, denominator) {
  if (denominator <= 0n) throw new Error("Хуваарь нь тэгээс их байх ёстой.");
  return (numerator + denominator / 2n) / denominator;
}

//Нийт PPM-г тооцоолох
export function calculateTotalPpm(items = []) {
  return normalizeItems(items).reduce(
    (total, item) =>
      total + (isInteger(item.probabilityPpm) ? item.probabilityPpm : 0),
    0,
  );
}

//Ppm difference тооцоолох
export const calculatePpmDifference = (items = []) =>
  calculateTotalPpm(items) - PPM_TOTAL;

//Expected value тооцоолох
export function calculateExpectedValue(items = []) {
  const weightedValueNumerator = normalizeItems(items).reduce((total, item) => {
    if (!isInteger(item.valueMnt) || !isInteger(item.probabilityPpm))
      return total;
    return total + BigInt(item.valueMnt) * BigInt(item.probabilityPpm);
  }, 0n);
  return {
    weightedValueNumerator: weightedValueNumerator.toString(),
    expectedValueMnt: Number(
      divideAndRoundHalfUp(weightedValueNumerator, PPM_BIGINT),
    ),
  };
}

//rtp тооцоолох
export function calculateRtpBps(weightedValueNumerator, priceMnt) {
  if (!isInteger(priceMnt) || priceMnt <= 0) return 0;
  return Number(
    divideAndRoundHalfUp(
      BigInt(weightedValueNumerator) * BPS_BIGINT,
      PPM_BIGINT * BigInt(priceMnt),
    ),
  );
}

//house edge тооцоолох
export const calculateHouseEdgeBps = (rtpBps) =>
  BPS_TOTAL - (isInteger(rtpBps) ? rtpBps : 0);
export const calculateExpectedPlatformProfit = (priceMnt, expectedValueMnt) =>
  isInteger(priceMnt) && isInteger(expectedValueMnt)
    ? priceMnt - expectedValueMnt
    : 0;

export function calculateUserProfitProbability(items = [], priceMnt) {
  if (!isInteger(priceMnt)) return 0;
  return normalizeItems(items).reduce(
    (total, item) =>
      isInteger(item.valueMnt) &&
      isInteger(item.probabilityPpm) &&
      item.valueMnt > priceMnt
        ? total + item.probabilityPpm
        : total,
    0,
  );
}

//тооцоолох бүх зүйл нэгтгэх
export function calculateBoxMetrics({ priceMnt, price, items = [] } = {}) {
  const resolvedPriceMnt = priceMnt ?? price;
  const safeItems = normalizeItems(items);
  const expectedValue = calculateExpectedValue(safeItems);
  const totalPpm = calculateTotalPpm(safeItems);
  const rtpBps = calculateRtpBps(
    expectedValue.weightedValueNumerator,
    resolvedPriceMnt,
  );
  const userProfitProbabilityPpm = calculateUserProfitProbability(
    safeItems,
    resolvedPriceMnt,
  );
  return {
    priceMnt: isInteger(resolvedPriceMnt) ? resolvedPriceMnt : 0,
    totalPpm,
    differencePpm: totalPpm - PPM_TOTAL,
    ...expectedValue,
    rtpBps,
    rtpPercent: rtpBps / 100,
    houseEdgeBps: calculateHouseEdgeBps(rtpBps),
    houseEdgePercent: calculateHouseEdgeBps(rtpBps) / 100,
    expectedPlatformProfitMnt: calculateExpectedPlatformProfit(
      resolvedPriceMnt,
      expectedValue.expectedValueMnt,
    ),
    userProfitProbabilityPpm,
    userProfitProbabilityPercent: userProfitProbabilityPpm / 10_000,
  };
}

const issue = (code, message, details = {}) => ({ code, message, details });

export function validateItems(items = []) {
  const errors = [];
  const warnings = [];
  const normalizedItems = normalizeItems(items);
  const names = new Set();
  normalizedItems.forEach((item, index) => {
    const itemNumber = index + 1;
    const normalizedName = normalizeItemName(item.name);
    if (!normalizedName)
      errors.push(
        issue("ITEM_NAME_REQUIRED", `Item ${itemNumber} name is required.`, {
          index,
        }),
      );
    else if (names.has(normalizedName))
      errors.push(
        issue("DUPLICATE_ITEM_NAME", `Duplicate item name: ${item.name}.`, {
          index,
          name: item.name,
        }),
      );
    if (normalizedName) names.add(normalizedName);
    if (!isInteger(item.valueMnt) || item.valueMnt <= 0)
      errors.push(
        issue(
          "INVALID_ITEM_VALUE",
          `Item ${itemNumber} value must be a whole number greater than 0.`,
          { index },
        ),
      );
    if (
      !isInteger(item.probabilityPpm) ||
      item.probabilityPpm < 0 ||
      item.probabilityPpm > PPM_TOTAL
    ) {
      errors.push(
        issue(
          "INVALID_ITEM_PROBABILITY",
          `Item ${itemNumber} probability must be an integer from 0 to 1,000,000 PPM.`,
          { index },
        ),
      );
    } else if (item.probabilityPpm === 0) {
      warnings.push(
        issue(
          "ZERO_PROBABILITY_ITEM",
          `Item ${itemNumber} has 0 PPM probability and will never be selected.`,
          { index },
        ),
      );
    }
  });
  return { errors, warnings, normalizedItems };
}

export function validateDraft({ priceMnt, price, items = [] } = {}) {
  const resolvedPriceMnt = priceMnt ?? price;
  const { errors, warnings, normalizedItems } = validateItems(items);
  if (
    resolvedPriceMnt !== undefined &&
    resolvedPriceMnt !== null &&
    resolvedPriceMnt !== "" &&
    (!isInteger(resolvedPriceMnt) || resolvedPriceMnt < 0)
  ) {
    errors.push(
      issue(
        "INVALID_BOX_PRICE",
        "Box price must be a non-negative whole number for a draft.",
      ),
    );
  }
  return { isValid: errors.length === 0, errors, warnings, normalizedItems };
}

export function validateBox({
  priceMnt,
  price,
  items = [],
  maxRtpBps = DEFAULT_MAX_RTP_BPS,
} = {}) {
  const resolvedPriceMnt = priceMnt ?? price;
  const { errors, warnings, normalizedItems } = validateItems(items);
  const calculations = calculateBoxMetrics({
    priceMnt: resolvedPriceMnt,
    items: normalizedItems,
  });
  if (!isInteger(resolvedPriceMnt) || resolvedPriceMnt <= 0)
    errors.push(
      issue(
        "INVALID_BOX_PRICE",
        "Box price must be a whole number greater than 0.",
      ),
    );
  if (normalizedItems.length === 0)
    errors.push(issue("NO_ITEMS", "Item list cannot be empty."));
  if (calculations.totalPpm !== PPM_TOTAL)
    errors.push(
      issue(
        "INVALID_TOTAL_PPM",
        "Total probability must equal 1,000,000 PPM.",
        {
          totalPpm: calculations.totalPpm,
          differencePpm: calculations.differencePpm,
        },
      ),
    );
  if (!isInteger(maxRtpBps) || maxRtpBps < 0)
    errors.push(
      issue(
        "INVALID_RTP_THRESHOLD",
        "Configured max RTP must be a non-negative integer BPS.",
      ),
    );
  else if (
    isInteger(resolvedPriceMnt) && resolvedPriceMnt > 0 &&
    BigInt(calculations.weightedValueNumerator) * BPS_BIGINT >
      BigInt(maxRtpBps) * PPM_BIGINT * BigInt(resolvedPriceMnt)
  )
    errors.push(
      issue("RTP_THRESHOLD_EXCEEDED", `RTP must not exceed ${maxRtpBps} BPS.`, {
        rtpBps: calculations.rtpBps,
        maxRtpBps,
      }),
    );
  return { isValid: errors.length === 0, errors, warnings, calculations };
}

export function selectItemByPpm(items, randomValue) {
  const position = Math.floor(randomValue * PPM_TOTAL);
  let cumulativePpm = 0;
  for (const item of normalizeItems(items)) {
    cumulativePpm += isInteger(item.probabilityPpm) ? item.probabilityPpm : 0;
    if (position < cumulativePpm) return item;
  }
  return null;
}

export function runMonteCarlo({
  priceMnt,
  price,
  items = [],
  openingCount = 1_000,
  random = Math.random,
} = {}) {
  const resolvedPriceMnt = priceMnt ?? price;
  if (!isInteger(resolvedPriceMnt) || resolvedPriceMnt <= 0)
    throw new Error("Simulation requires a valid box price.");
  if (!isInteger(openingCount) || openingCount <= 0)
    throw new Error("Opening count must be a positive integer.");
  let totalPayoutMnt = 0n;
  let minimumProfitLossMnt = Infinity;
  let maximumProfitLossMnt = -Infinity;
  const profitLosses = [];
  for (let opening = 0; opening < openingCount; opening += 1) {
    const payoutMnt = selectItemByPpm(items, random())?.valueMnt ?? 0;
    const profitLossMnt = resolvedPriceMnt - payoutMnt;
    totalPayoutMnt += BigInt(payoutMnt);
    minimumProfitLossMnt = Math.min(minimumProfitLossMnt, profitLossMnt);
    maximumProfitLossMnt = Math.max(maximumProfitLossMnt, profitLossMnt);
    profitLosses.push(profitLossMnt);
  }
  const totalRevenueMnt = BigInt(resolvedPriceMnt) * BigInt(openingCount);
  const totalProfitLossMnt = totalRevenueMnt - totalPayoutMnt;
  return {
    openingCount,
    totalRevenueMnt: Number(totalRevenueMnt),
    totalPayoutMnt: Number(totalPayoutMnt),
    totalProfitLossMnt: Number(totalProfitLossMnt),
    averageProfitLossMnt: Number(
      divideAndRoundHalfUp(totalProfitLossMnt, BigInt(openingCount)),
    ),
    minimumProfitLossMnt,
    maximumProfitLossMnt,
    profitLosses,
  };
}

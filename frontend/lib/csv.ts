import { BoxItem } from "./types";

export type CsvImportResult = {
  items: BoxItem[];
  errors: string[];
};

const REQUIRED_HEADERS = ["name", "value", "probabilityPpm"];

function parseCsvLine(line: string) {
  const values: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && line[index + 1] === '"') {
      value += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      values.push(value.trim());
      value = "";
    } else {
      value += character;
    }
  }
  values.push(value.trim());
  return values;
}

export function parseItemsCsv(csv: string): CsvImportResult {
  const rows = csv
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((row) => row.trim());
  if (rows.length === 0)
    return { items: [], errors: ["CSV файл хоосон байна."] };

  const headers = parseCsvLine(rows[0]);
  const missingHeaders = REQUIRED_HEADERS.filter(
    (header) => !headers.includes(header),
  );
  if (missingHeaders.length > 0) {
    return {
      items: [],
      errors: [`CSV header дутуу байна: ${missingHeaders.join(", ")}`],
    };
  }

  const indexes = Object.fromEntries(
    headers.map((header, index) => [header, index]),
  );
  const items: BoxItem[] = [];
  const errors: string[] = [];
  const names = new Set<string>();

  rows.slice(1).forEach((row, rowIndex) => {
    const rowNumber = rowIndex + 2;
    const columns = parseCsvLine(row);
    const name = columns[indexes.name] ?? "";
    const value = columns[indexes.value] ?? "";
    const probabilityPpm = columns[indexes.probabilityPpm] ?? "";
    const normalizedName = name.trim().toLocaleLowerCase();
    const numericValue = Number(value);
    const numericPpm = Number(probabilityPpm);

    const hasMissingName = !normalizedName;
    const hasInvalidValue =
      !Number.isSafeInteger(numericValue) || numericValue <= 0;
    const hasInvalidProbability =
      !Number.isSafeInteger(numericPpm) ||
      numericPpm < 0 ||
      numericPpm > 1_000_000;
    const hasDuplicateName = !!normalizedName && names.has(normalizedName);

    if (hasMissingName) errors.push(`${rowNumber}-р мөр: name хоосон байна.`);
    if (hasInvalidValue)
      errors.push(
        `${rowNumber}-р мөр: value нь 0-ээс их бүхэл тоо байх ёстой.`,
      );
    if (hasInvalidProbability)
      errors.push(
        `${rowNumber}-р мөр: probabilityPpm нь 0–1,000,000 бүхэл тоо байх ёстой.`,
      );
    if (hasDuplicateName)
      errors.push(`${rowNumber}-р мөр: давхардсан нэр (${name.trim()}).`);

    if (
      hasMissingName ||
      hasInvalidValue ||
      hasInvalidProbability ||
      hasDuplicateName
    ) {
      return;
    }

    names.add(normalizedName);
    items.push({ name: name.trim(), value, probabilityPpm });
  });

  return { items, errors };
}

export function createItemsCsv(items: BoxItem[]) {
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  return [
    "name,value,probabilityPpm",
    ...items.map((item) =>
      [escape(item.name), item.value, item.probabilityPpm].join(","),
    ),
  ].join("\n");
}

import { BoxItem } from "./types";

export type CsvImportResult = {
  items: BoxItem[];
  errors: string[];
};

const REQUIRED_HEADERS = ["name", "value", "probabilityPpm"];

// Read complete records so quoted newlines stay inside their fields.
function parseCsvRecords(csv: string) {
  const rows: { columns: string[]; line: number }[] = [];
  let columns: string[] = [];
  let value = "";
  let state: "start" | "plain" | "quoted" | "closed" = "start";
  let line = 1;
  let recordLine = 1;
  let hasContent = false;
  const finishField = () => {
    columns.push(value.trim());
    value = "";
    state = "start";
  };
  const finishRecord = () => {
    if (hasContent) {
      finishField();
      rows.push({ columns, line: recordLine });
    }
    columns = [];
    value = "";
    state = "start";
    hasContent = false;
  };

  for (let index = 0; index < csv.length; index += 1) {
    const character = csv[index];
    const newline = character === "\n" || character === "\r";
    const crlf = character === "\r" && csv[index + 1] === "\n";
    if (state === "quoted") {
      if (character === '"') {
        if (csv[index + 1] === '"') {
          value += '"';
          index += 1;
        } else state = "closed";
      } else {
        value += character;
        if (newline) {
          if (crlf) { value += "\n"; index += 1; }
          line += 1;
        }
      }
      continue;
    }
    if (newline) {
      finishRecord();
      if (crlf) index += 1;
      line += 1;
      recordLine = line;
    } else if (character === ",") {
      hasContent = true;
      finishField();
    } else if (character === '"' && state === "start") {
      hasContent = true;
      state = "quoted";
    } else if (character === '"' || state === "closed") {
      return { rows: [], errors: [`${line}-р мөр: CSV хашилтын бүтэц буруу байна.`] };
    } else {
      value += character;
      state = "plain";
      if (character.trim()) hasContent = true;
    }
  }
  if (state === "quoted") {
    return { rows: [], errors: [`${recordLine}-р мөр: CSV хашилт хаагдаагүй байна.`] };
  }
  finishRecord();
  return { rows, errors: [] as string[] };
}

export function parseItemsCsv(csv: string): CsvImportResult {
  const parsed = parseCsvRecords(csv.replace(/^\uFEFF/, ""));
  if (parsed.errors.length) return { items: [], errors: parsed.errors };
  const rows = parsed.rows;
  if (rows.length === 0)
    return { items: [], errors: ["CSV файл хоосон байна."] };

  const headers = rows[0].columns;
  if (new Set(headers).size !== headers.length) {
    return { items: [], errors: ["CSV header давхардсан байна."] };
  }
  const missingHeaders = REQUIRED_HEADERS.filter(
    (header) => !headers.includes(header),
  );
  if (missingHeaders.length > 0) {
    return {
      items: [],
      errors: [`CSV header дутуу байна: ${missingHeaders.join(", ")}`],
    };
  }

  if (rows.length === 1) {
    return { items: [], errors: ["CSV файлд item мөр байхгүй байна."] };
  }

  const indexes = Object.fromEntries(
    headers.map((header, index) => [header, index]),
  );
  const items: BoxItem[] = [];
  const errors: string[] = [];
  const names = new Set<string>();

  rows.slice(1).forEach(({ columns, line: rowNumber }) => {
    if (columns.length !== headers.length) {
      errors.push(`${rowNumber}-р мөр: баганын тоо header-тэй таарахгүй байна.`);
      return;
    }
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
      probabilityPpm.trim() === "" ||
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

import { BoxPayload } from "./types";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
).replace(/\/$/, "");

export async function apiRequest<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });
  } catch {
    throw Object.assign(new Error("BACKEND_UNAVAILABLE"), {
      code: "BACKEND_UNAVAILABLE",
    });
  }

  if (response.status === 204 && response.ok) return undefined as T;

  let result: Record<string, unknown>;
  try {
    result = await response.json();
  } catch {
    throw Object.assign(new Error("INVALID_SERVER_RESPONSE"), {
      code: "INVALID_SERVER_RESPONSE",
    });
  }

  if (!response.ok) {
    const error = new Error(String(result.message || "Request failed"));
    Object.assign(error, result, result.details);
    throw error;
  }

  return (result.data ?? result) as T;
}

export function toBoxPayload(
  name: string,
  price: string,
  items: { name: string; value: string; probabilityPpm: string }[],
): BoxPayload {
  return {
    name,
    priceMnt: Number(price),
    items: items.map((item) => ({
      name: item.name,
      valueMnt: Number(item.value),
      probabilityPpm: item.probabilityPpm.trim() === "" ? NaN : Number(item.probabilityPpm),
    })),
  };
}

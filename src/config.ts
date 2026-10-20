export interface Config {
  baseUrl: string;
  apiSecret: string;
  timeoutMs: number;
}

export function loadConfig(): Config {
  const baseUrl = process.env.QIHANG_API_BASE_URL ?? "https://qsmile.ai";
  const apiSecret = process.env.QIHANG_API_SECRET;
  const timeoutMs = Number(process.env.QIHANG_API_TIMEOUT_MS ?? 30000);

  if (!apiSecret) {
    throw new Error("QIHANG_API_SECRET environment variable is required.");
  }

  return { baseUrl, apiSecret, timeoutMs };
}

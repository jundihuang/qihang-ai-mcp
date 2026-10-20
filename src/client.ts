import { randomUUID } from "node:crypto";
import type { Config } from "./config.js";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string | number | undefined,
    message: string,
    public detail?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class QihangClient {
  constructor(private config: Config) {}

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    extraHeaders?: Record<string, string>
  ): Promise<T> {
    const url = `${this.config.baseUrl}/mcp_api/v1${path}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.config.apiSecret}`,
          ...extraHeaders,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const err = data as Record<string, unknown>;
        throw new ApiError(
          response.status,
          err.code as string | number | undefined,
          (err.error_message as string) ?? `HTTP ${response.status}`,
          err.detail as Record<string, unknown> | undefined
        );
      }

      return data as T;
    } finally {
      clearTimeout(timer);
    }
  }

  me() {
    return this.request("GET", "/me");
  }

  listGenerationModels<T = unknown>(taskType?: string): Promise<T> {
    const query = taskType ? `?task_type=${encodeURIComponent(taskType)}` : "";
    return this.request("GET", `/generation_models${query}`);
  }

  uploadImage<T = unknown>(input: { filename: string; content_type: string; data_base64: string }): Promise<T> {
    return this.request("POST", "/uploads", input);
  }

  createGenerationTask<T = unknown>(input: Record<string, unknown>): Promise<T> {
    return this.request("POST", "/generation_tasks", input, {
      "Idempotency-Key": randomUUID(),
    });
  }

  getGenerationTask<T = unknown>(id: number): Promise<T> {
    return this.request("GET", `/generation_tasks/${id}`);
  }
}

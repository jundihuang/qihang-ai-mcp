import { describe, it, expect, vi } from "vitest";
import { QihangClient, ApiError } from "../src/client.js";
import { formatApiError } from "../src/errors.js";
import { createImage } from "../src/tools/createImage.js";
import { getGenerationTask } from "../src/tools/getGenerationTask.js";
import { uploadImage } from "../src/tools/uploadImage.js";
import { listGenerationModels } from "../src/tools/listGenerationModels.js";
import type { Config } from "../src/config.js";

const config: Config = { baseUrl: "https://test.example", apiSecret: "qh_live_test", timeoutMs: 5000 };

describe("QihangClient", () => {
  it("throws ApiError on 401", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ code: 40100, error_message: "invalid token" }), { status: 401 })
    ));
    const client = new QihangClient(config);
    await expect(client.me()).rejects.toThrow(ApiError);
    vi.unstubAllGlobals();
  });
});

describe("formatApiError", () => {
  it("formats 401 as secret issue", () => {
    const err = new ApiError(401, 40100, "invalid");
    expect(formatApiError(err)).toContain("API Secret");
  });

  it("formats 422 as parameter issue", () => {
    const err = new ApiError(422, 42200, "prompt required");
    expect(formatApiError(err)).toContain("参数错误");
  });
});

describe("tools", () => {
  const mockClient = {
    uploadImage: vi.fn().mockResolvedValue({ reference_id: 1, reference_type: "blob", filename: "test.png", content_type: "image/png", byte_size: 100 }),
    listGenerationModels: vi.fn().mockResolvedValue([{ key: "test-model" }]),
    createGenerationTask: vi.fn().mockResolvedValue({ generation_task: { id: 9001, status: "pending", model: "test" } }),
    getGenerationTask: vi.fn().mockResolvedValue({ generation_task: { id: 9001, status: "success", results: [{ id: 1, position: 0, status: "success", url: "https://example.com/img.png" }], error_message: null } }),
  } as unknown as QihangClient;

  it("uploadImage returns reference_id and next_action", async () => {
    const result = await uploadImage(mockClient, { filename: "test.png", mime_type: "image/png", data_base64: "abc", purpose: "reference" });
    expect(result.reference_id).toBe(1);
    expect(result.next_action).toContain("create_image");
  });

  it("listGenerationModels returns models", async () => {
    const result = await listGenerationModels(mockClient, {});
    expect(result.models).toHaveLength(1);
  });

  it("createImage returns task_id and next_action", async () => {
    const result = await createImage(mockClient, { prompt: "cat", task_type: "text_to_image", reference_ids: [], count: 1, output_format: "png" });
    expect(result.generation_task_id).toBe(9001);
    expect(result.next_action).toContain("get_generation_task");
  });

  it("getGenerationTask returns results when success", async () => {
    const result = await getGenerationTask(mockClient, { generation_task_id: 9001 });
    expect(result.status).toBe("success");
    expect(result.needs_polling).toBe(false);
    expect(result.results[0].url).toContain("example.com");
  });
});

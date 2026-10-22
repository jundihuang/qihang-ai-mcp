#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { QihangClient } from "./client.js";
import { formatApiError } from "./errors.js";
import { uploadImage } from "./tools/uploadImage.js";
import { listGenerationModels } from "./tools/listGenerationModels.js";
import { createImage } from "./tools/createImage.js";
import { getGenerationTask } from "./tools/getGenerationTask.js";
import { cancelGenerationTask } from "./tools/cancelGenerationTask.js";
import { retryGenerationTask } from "./tools/retryGenerationTask.js";
import { listMemories } from "./tools/listMemories.js";
import { saveMemory } from "./tools/saveMemory.js";
import {
  UploadImageSchema,
  ListGenerationModelsSchema,
  CreateImageSchema,
  GetGenerationTaskSchema,
  CancelGenerationTaskSchema,
  RetryGenerationTaskSchema,
  ListMemoriesSchema,
  SaveMemorySchema,
} from "./schemas/tools.js";

const config = loadConfig();
const client = new QihangClient(config);

const server = new McpServer(
  { name: "qihang-ai-mcp", version: "1.0.0" },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.tool(
  "upload_image",
  "Upload a reference image for image-to-image generation. Returns a reference_id.",
  UploadImageSchema.shape,
  async (params) => {
    try {
      const result = await uploadImage(client, params as never);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      return { content: [{ type: "text", text: formatApiError(error) }], isError: true };
    }
  }
);

server.tool(
  "list_generation_models",
  "List available image generation models with their supported parameters.",
  ListGenerationModelsSchema.shape,
  async (params) => {
    try {
      const result = await listGenerationModels(client, params as never);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      return { content: [{ type: "text", text: formatApiError(error) }], isError: true };
    }
  }
);

server.tool(
  "create_image",
  "Create an image generation task (async). Returns a task ID for polling.",
  CreateImageSchema.shape,
  async (params) => {
    try {
      const result = await createImage(client, params as never);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      return { content: [{ type: "text", text: formatApiError(error) }], isError: true };
    }
  }
);

server.tool(
  "get_generation_task",
  "Get the status and results of a generation task.",
  GetGenerationTaskSchema.shape,
  async (params) => {
    try {
      const result = await getGenerationTask(client, params as never);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      return { content: [{ type: "text", text: formatApiError(error) }], isError: true };
    }
  }
);

server.tool(
  "cancel_generation_task",
  "Cancel a running generation task (pending/submitted/waiting/generating). Frozen tokens are released.",
  CancelGenerationTaskSchema.shape,
  async (params) => {
    try {
      const result = await cancelGenerationTask(client, params as never);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      return { content: [{ type: "text", text: formatApiError(error) }], isError: true };
    }
  }
);

server.tool(
  "retry_generation_task",
  "Re-run a generation task (failed or completed), a specific result, or only the failed parts of a partial success. Creates a NEW task and consumes tokens.",
  RetryGenerationTaskSchema.shape,
  async (params) => {
    try {
      const result = await retryGenerationTask(client, params as never);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      return { content: [{ type: "text", text: formatApiError(error) }], isError: true };
    }
  }
);

server.tool(
  "list_memories",
  "List the user's saved image-generation preferences (style, subject, negative rules, etc.). Apply them to create_image unless the user overrides.",
  ListMemoriesSchema.shape,
  async (params) => {
    try {
      const result = await listMemories(client, params as never);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      return { content: [{ type: "text", text: formatApiError(error) }], isError: true };
    }
  }
);

server.tool(
  "save_memory",
  "Save a durable user preference for image generation (e.g. brand style, default aspect ratio, negative rules).",
  SaveMemorySchema.shape,
  async (params) => {
    try {
      const result = await saveMemory(client, params as never);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      return { content: [{ type: "text", text: formatApiError(error) }], isError: true };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Fatal error starting MCP server:", error);
  process.exit(1);
});

import { randomUUID } from "node:crypto";
import type { QihangClient } from "../client.js";
import type { CreateImageInput } from "../schemas/tools.js";

export async function createImage(client: QihangClient, input: CreateImageInput) {
  const body: Record<string, unknown> = {
    task_type: input.task_type,
    prompt: input.prompt,
    reference_ids: input.reference_ids,
    count: input.count,
    output_format: input.output_format,
  };

  if (input.negative_prompt) body.negative_prompt = input.negative_prompt;
  if (input.model) body.model = input.model;
  if (input.size) body.size = input.size;
  if (input.resolution) body.resolution = input.resolution;
  if (input.references?.length) body.references = input.references;
  if (input.bundle) body.bundle = input.bundle;

  const result = await client.createGenerationTask<{
    generation_task: { id: number; status: string; model: string; estimated_tokens?: number };
  }>(body);

  return {
    generation_task_id: result.generation_task.id,
    status: result.generation_task.status,
    model: result.generation_task.model,
    estimated_tokens: result.generation_task.estimated_tokens ?? null,
    next_action: "Use get_generation_task to poll status until success or failed",
  };
}

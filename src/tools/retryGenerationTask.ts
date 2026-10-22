import type { QihangClient } from "../client.js";
import type { RetryGenerationTaskInput } from "../schemas/tools.js";

export async function retryGenerationTask(client: QihangClient, input: RetryGenerationTaskInput) {
  const body: Record<string, unknown> = { failed_only: input.failed_only };
  if (input.result_id) body.result_id = input.result_id;

  const result = await client.retryGenerationTask<{
    generation_task: { id: number; status: string; estimated_tokens?: number };
  }>(input.generation_task_id, body as { result_id?: number; failed_only?: boolean });

  const task = result.generation_task;
  return {
    generation_task_id: task.id,
    source_generation_task_id: input.generation_task_id,
    status: task.status,
    estimated_tokens: task.estimated_tokens ?? null,
    next_action: "Use get_generation_task with the new generation_task_id to poll status until success or failed.",
  };
}

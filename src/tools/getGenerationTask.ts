import type { QihangClient } from "../client.js";
import type { GetGenerationTaskInput } from "../schemas/tools.js";

export async function getGenerationTask(client: QihangClient, input: GetGenerationTaskInput) {
  type GenerationTaskResponse = {
    generation_task: {
      id: number;
      status: string;
      results?: Array<{ id: number; position: number; status: string; url: string | null }>;
      error_message?: string | null;
    };
  };
  const result = await client.getGenerationTask<GenerationTaskResponse>(input.generation_task_id);
  const task = result.generation_task;

  const needsPolling = ["pending", "submitted", "waiting", "generating", "processing"].includes(task.status);

  return {
    generation_task_id: task.id,
    status: task.status,
    results: task.results?.map((r: { id: number; position: number; status: string; url: string | null }) => ({
      id: r.id,
      position: r.position,
      status: r.status,
      url: r.url,
    })) ?? [],
    error_message: task.error_message ?? null,
    needs_polling: needsPolling,
    next_action: needsPolling
      ? "Task still in progress. Wait and call get_generation_task again."
      : task.status === "success"
        ? "Task complete. Return the result URLs to the user."
        : "Task failed. Report the error_message to the user.",
  };
}

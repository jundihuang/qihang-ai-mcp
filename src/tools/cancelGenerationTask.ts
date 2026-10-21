import type { QihangClient } from "../client.js";
import type { CancelGenerationTaskInput } from "../schemas/tools.js";

export async function cancelGenerationTask(client: QihangClient, input: CancelGenerationTaskInput) {
  const result = await client.cancelGenerationTask<{
    generation_task: { id: number; status: string; error_message: string | null };
  }>(input.generation_task_id);

  const task = result.generation_task;
  return {
    generation_task_id: task.id,
    status: task.status,
    note: "任务已取消，冻结的 Token 将被释放。请以 get_generation_task 查询的最终状态为准。",
    next_action: "Report the cancellation to the user. No further polling needed.",
  };
}

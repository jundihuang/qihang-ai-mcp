import type { QihangClient } from "../client.js";
import type { ListGenerationModelsInput } from "../schemas/tools.js";

export async function listGenerationModels(client: QihangClient, input: ListGenerationModelsInput) {
  const models = await client.listGenerationModels(input.task_type);
  return { models };
}

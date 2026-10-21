import type { QihangClient } from "../client.js";
import type { SaveMemoryInput } from "../schemas/tools.js";

export async function saveMemory(client: QihangClient, input: SaveMemoryInput) {
  const body: Record<string, unknown> = {
    title: input.title,
    content: input.content,
    kind: input.kind,
    scope: input.scope,
    tags: input.tags,
  };
  if (input.scope_value) body.scope_value = input.scope_value;

  const memory = await client.saveMemory<{
    id: number;
    title: string;
    kind: string;
    scope: string;
    status: string;
  }>(body);

  return {
    memory_id: memory.id,
    title: memory.title,
    kind: memory.kind,
    scope: memory.scope,
    status: memory.status,
    next_action: "Saved. These preferences will be reused in later sessions via list_memories.",
  };
}

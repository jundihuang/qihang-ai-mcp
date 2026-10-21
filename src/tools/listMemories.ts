import type { QihangClient } from "../client.js";
import type { ListMemoriesInput } from "../schemas/tools.js";

type MemoryResponse = {
  memories: Array<{
    id: number;
    scope: string;
    scope_value: string | null;
    kind: string;
    title: string;
    content: string;
    tags: string[];
    status: string;
    confidence: number;
  }>;
};

export async function listMemories(client: QihangClient, input: ListMemoriesInput) {
  const result = await client.listMemories<MemoryResponse>({
    ...(input.kind ? { kind: input.kind } : {}),
    ...(input.scope ? { scope: input.scope } : {}),
  });

  return {
    count: result.memories.length,
    memories: result.memories.map((m) => ({
      id: m.id,
      kind: m.kind,
      scope: m.scope_value ? `${m.scope}(${m.scope_value})` : m.scope,
      title: m.title,
      content: m.content,
      status: m.status,
    })),
    usage:
      "Apply these preferences in create_image prompts/parameters when the user does not explicitly override them.",
  };
}

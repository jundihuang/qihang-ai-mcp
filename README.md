# Qihang AI MCP Server

MCP server that exposes Qihang AI image generation capabilities to external AI clients (Codex, Claude, etc.).

## Setup

1. Get an API Secret from Qihang AI web UI →「API 密钥 / MCP 接入」.
2. Configure in your MCP client:

```json
{
  "mcpServers": {
    "qihang-image": {
      "command": "npx",
      "args": ["-y", "github:jundihuang/qihang-ai-mcp#main"],
      "env": {
        "QIHANG_API_BASE_URL": "https://qsmile.ai",
        "QIHANG_API_SECRET": "qh_live_your_secret_here"
      }
    }
  }
}
```

## Tools

| Tool | Description |
|---|---|
| `upload_image` | Upload a reference image, returns a `reference_id` |
| `list_generation_models` | Query available models and their parameters |
| `create_image` | Create a generation task (async, returns task ID) |
| `get_generation_task` | Poll task status and get results |

## Development

```bash
pnpm install
pnpm dev
pnpm build
pnpm test
```

# Qihang AI MCP 开发计划

## 目标

把现有生图能力开放给外部 AI 客户端，例如 Codex、Claude Code、Claude Desktop。

第一版实现：

```txt
Codex / Claude
  ↓ MCP
qihang-ai-mcp
  ↓ API Secret
qihang-ai Backend
  ↓ 复用现有能力
GenerationTasks::Creator
GenerationTasks::Retrier
Kie::TaskPayloadBuilder
TokenAccountService
```

MCP Server 不直接访问数据库，也不直接调用 Kie，只做协议转换和安全校验前的转发。

## 范围

### 第一版包含

- 用户端 API Secret 管理。
- 独立 MCP Backend API。
- TypeScript MCP Server。
- 四个核心 tools：
  - `upload_image`
  - `list_generation_models`
  - `create_image`
  - `get_generation_task`
- 支持文生图和图生图。
- 支持上传本地参考图，返回可用 `reference_id`。
- 图生图引用必须使用当前用户已有的 reference id。
- 生成任务异步创建，通过查询接口获取结果。
- 创建任务支持 `Idempotency-Key`，避免超时后重复扣费。
- 复用现有 Token 冻结、扣费、释放逻辑。

### 第一版不包含

- 不修改现有 App API JWT 认证逻辑。
- 不允许 MCP 直接访问管理员接口。
- 不开放删除用户数据能力。
- 不开放跨用户查询。
- 不做完整 OAuth 2.1 授权服务器。
- 不做 MCP Remote HTTP 公网服务，先以 stdio / 本地 MCP Server 为主。
- 不做复杂偏好记忆写入，记忆能力放到第二版。
- 不给 API Secret 增加现有 App API JWT fallback；两套凭证语义完全隔离。

## 仓库分工

| 仓库 | 内容 |
|---|---|
| `qihang-ai` | Rails 后端：API Secret、MCP Backend API、权限、审计、生成任务复用 |
| `AI-image-generation` | Vue 前端：API Secret 管理页面和接入文档 |
| `qihang-ai-mcp` | TypeScript MCP Server：MCP tools 到 Backend API 的转换 |

建议分支：

```txt
qihang-ai              feat/mcp-api-secrets
AI-image-generation    feat/mcp-api-secrets
qihang-ai-mcp          main
```

## 认证设计

### 现有认证保持不变

现有 Web / 小程序 API 继续使用：

```http
Authorization: Bearer <jwt>
```

`AppAPI::Helpers::AuthenticationHelper` 不做 API Secret fallback。

### 新增 API Secret

新增模型：

```txt
user_api_secrets
├─ user_id
├─ application_id
├─ name
├─ public_id
├─ token_digest
├─ prefix
├─ scopes
├─ last_used_at
├─ request_count
├─ expires_at
├─ revoked_at
└─ timestamps
```

Token 格式：

```txt
qh_live_<public_id>_<secret>
```

示例：

```txt
qh_live_9fj20dk3_AbC123xxxxxxxxxxxxxxxxxxxxxxxx
```

规则：

- 后端只保存 secret hash。
- 完整 token 只在创建响应中返回一次。
- 列表只显示 name、prefix、last_used_at、status。
- 支持 revoke 和可选 expires_at。
- 认证使用 `public_id` 查记录，再 constant-time 比较 hash。
- 每个 token 必须绑定一个 `User` 和 `Application`。

### 第一版权限 scope

```txt
generation:read
generation:create
```

预留：

```txt
memories:read
memories:write
uploads:create
```

## Backend API

新增独立命名空间：

```txt
/mcp_api/v1
```

不要挂到普通 `app_api` 认证体系下。

### 认证接口

#### `GET /mcp_api/v1/me`

返回：

```json
{
  "user": {
    "id": 1,
    "email": "user@example.com"
  },
  "application": {
    "id": 10
  },
  "scopes": ["generation:read", "generation:create"]
}
```

### 模型接口

#### `GET /mcp_api/v1/generation_models`

返回当前用户可用模型，以及模型参数约束：

```json
{
  "models": [
    {
      "key": "gpt-image-2-5-flare-image-to-image",
      "task_type": "image_to_image",
      "prompt_max_length": 20000,
      "params": {
        "aspect_ratio": {
          "default": "auto",
          "enum": ["auto", "1:1", "3:2", "2:3", "16:9", "9:16"]
        },
        "resolution": {
          "default": "1K",
          "enum": ["1K", "2K", "4K"]
        },
        "output_format": {
          "default": "png",
          "enum": ["png", "jpeg"]
        }
      }
    }
  ]
}
```

### 创建生成任务

#### `POST /mcp_api/v1/generation_tasks`

Header（必填）：

```txt
Idempotency-Key: <uuid>
```

同一 API Secret 内，同一 key 在 24 小时内返回同一个任务，不重复创建、不重复冻结 Token。MCP Server 在请求头缺失时自动生成 UUID。

请求：

```json
{
  "task_type": "image_to_image",
  "prompt": "保持产品不变，将背景换成家居场景",
  "negative_prompt": "产品变形，文字错误",
  "model": "gpt-image-2-5-flare-image-to-image",
  "size": "1:1",
  "count": 4,
  "output_format": "jpeg",
  "reference_ids": [123, 456]
}
```

返回：

```json
{
  "generation_task": {
    "id": 9001,
    "status": "pending",
    "model": "gpt-image-2-5-flare-image-to-image",
    "results": []
  }
}
```

规则：

- `task_type=image_to_image` 时，`reference_ids` 必填。
- `task_type=text_to_image` 时，`reference_ids` 必须为空。
- `reference_ids` 只允许当前用户拥有的：
  - `ActiveStorage::Blob`
  - `GenerationAsset`
  - `GenerationResult`
- 不允许外部直接传任意 OSS URL。
- 不允许绕过 Token 扣费。
- 校验模型 allowlist、尺寸、数量、输出格式、prompt 长度。
- 默认复用 `GenerationTasks::Creator`。
- 创建后立即返回，不同步等待 Kie 完成。

### 查询任务

#### `GET /mcp_api/v1/generation_tasks/:id`

返回：

```json
{
  "generation_task": {
    "id": 9001,
    "status": "success",
    "results": [
      {
        "id": 7001,
        "position": 0,
        "url": "https://..."
      }
    ]
  }
}
```

只允许查询当前 token 用户拥有的任务。

## Backend 开发任务

### Phase 1：API Secret 基础能力

- [x] 创建 `user_api_secrets` migration。
- [x] 新增 `UserAPISecret` model。
- [x] 新增 `ApiSecrets::Issuer`。
  - 生成 public_id 和 secret。
  - 保存 hash。
  - 返回完整 token。
- [x] 新增 `ApiSecrets::Authenticator`。
  - 解析 Bearer token。
  - 校验 prefix、public_id、hash、scope、过期、撤销状态。
  - 加载 user 和 application。
- [x] 新增 `McpAPI::V1` Grape namespace。
- [x] 新增 API Secret 管理接口：
  - `GET /app_api/v1/api_secrets`
  - `POST /app_api/v1/api_secrets`
  - `DELETE /app_api/v1/api_secrets/:id`
- [x] Secret 管理接口继续使用现有 JWT 登录。
- [x] 添加 request specs。
- [x] Rubocop / RSpec 通过。

### Phase 2：MCP Backend API

- [x] `GET /mcp_api/v1/me`。
- [x] `GET /mcp_api/v1/generation_models`。
- [x] `POST /mcp_api/v1/generation_tasks`。
- [x] `GET /mcp_api/v1/generation_tasks/:id`。
- [x] 新增 `Mcp::ImageTaskCreator`。
  - 参数规范化。
  - reference 归属校验。
  - 模型与参数校验。
  - 调用 `GenerationTasks::Creator`。
- [x] 新增 `Mcp::ReferenceResolver`。
  - 支持 Blob、GenerationAsset、GenerationResult。
  - 统一转成 `GenerationTasks::Creator` 需要的 assets。
- [x] 增加 audit log，至少记录：
  - api_secret_id
  - user_id
  - application_id
  - action
  - status
  - request_id
  - duration
- [x] 对创建任务和上传接口做频率限制。
- [x] 新增幂等 key 存储或等价 DB 约束，保存 `api_secret_id + idempotency_key -> generation_task_id`。
- [x] 同一 key 重复请求时命中返回原任务；不同请求体使用相同 key 时返回 409 / 422。
- [x] 确保日志过滤完整 token。
- [x] request specs 覆盖成功、401、403、422、429、重复幂等请求。

### Phase 3：上传能力

这是第一版必需能力，否则外部 AI 只能引用历史素材，无法编辑本地新图。

#### `POST /mcp_api/v1/uploads`

```json
{
  "filename": "product.png",
  "content_type": "image/png",
  "data_base64": "...",
  "purpose": "reference"
}
```

规则：

- 最大 10MB。
- 只允许图片类型。
- 校验 magic bytes。
- 创建 `ActiveStorage::Blob`。
- `uploader = token.user`。
- `application_id = token.application_id`。
- 返回可用于 `reference_ids` 的 id。

对应 MCP tool：

```txt
upload_image
```

MCP tool 输入：

```json
{
  "filename": "product.png",
  "mime_type": "image/png",
  "data_base64": "...",
  "purpose": "reference"
}
```

输出：

```json
{
  "reference_id": 52374,
  "preview_url": "https://...",
  "next_action": "Pass reference_id into create_image"
}
```


## Frontend 开发任务

### API Secret 管理页

- [x] 新增「API 密钥 / MCP 接入」页面。
- [x] 列表字段：
  - 名称
  - Prefix
  - 创建时间
  - 最近使用
  - 状态
  - 操作：撤销
- [x] 新建表单：
  - 名称
  - 过期时间，可选
  - scope，默认只读 generation 权限
- [x] 创建成功弹窗展示完整 token。
- [x] 明确提示完整 token 只显示一次。
- [x] 复制按钮。
- [x] 撤销前二次确认。
- [x] 展示 MCP 配置示例。
- [x] 使用 app 弹窗组件，不使用浏览器原生 confirm。

### 配置示例

```json
{
  "mcpServers": {
    "qihang-image": {
      "command": "npx",
      "args": ["-y", "github:jundihuang/qihang-ai-mcp#main"],
      "env": {
        "QIHANG_API_BASE_URL": "https://qsmile.ai",
        "QIHANG_API_SECRET": "<your_api_secret>"
      }
    }
  }
}
```

## MCP Server 开发任务

仓库：

```txt
qihang-ai-mcp
```

技术栈：

- Node.js 20+
- TypeScript
- `@modelcontextprotocol/sdk`
- Zod
- tsx / tsup

### 项目结构

```txt
qihang-ai-mcp/
├─ src/
│  ├─ index.ts
│  ├─ config.ts
│  ├─ client.ts
│  ├─ tools/
│  │  ├─ listGenerationModels.ts
│  │  ├─ createImage.ts
│  │  └─ getGenerationTask.ts
│  ├─ schemas/
│  └─ errors.ts
├─ skills/
│  └─ qihang-image-generation/
│     └─ SKILL.md
├─ README.md
├─ package.json
└─ tsconfig.json
```

### 环境变量

```txt
QIHANG_API_BASE_URL=https://qsmile.ai
QIHANG_API_SECRET=qh_live_xxx
QIHANG_API_TIMEOUT_MS=30000
```

### Tools

#### `list_generation_models`

用途：

- 查询当前用户可用模型。
- 查询模型支持的 task type、尺寸、数量、输出格式。

#### `create_image`

输入：

```json
{
  "prompt": "保持产品不变，将背景换成家居场景",
  "task_type": "image_to_image",
  "reference_ids": [123],
  "model": "gpt-image-2-5-flare-image-to-image",
  "size": "1:1",
  "count": 4,
  "output_format": "jpeg"
}
```

输出：

```json
{
  "generation_task_id": 9001,
  "status": "pending",
  "next_action": "Use get_generation_task to poll status"
}
```

规则：

- 不等待生图完成。
- 不在 MCP Server 内保存任务状态。
- 错误信息要能指导模型修正输入。

#### `get_generation_task`

输入：

```json
{
  "generation_task_id": 9001
}
```

输出：

- 任务状态。
- 失败原因。
- 成功结果 URL。
- 是否需要继续轮询。

### MCP Server 错误处理

| Backend 状态 | MCP 返回策略 |
|---|---|
| 401 | 提示 API Secret 无效或已撤销 |
| 403 | 提示 scope 或资源归属不足 |
| 422 | 返回字段级错误，引导模型修正参数 |
| 429 | 提示频率限制和 retry after |
| 5xx | 提示服务暂时不可用，不要自动重复创建任务 |
| 创建任务超时 | 明确提示不要盲目重试，避免重复扣费 |

## Agent Skills 结合

参考 `agentskills/agentskills`。

MCP 负责暴露能力，Agent Skill 负责教外部 Agent 如何正确使用能力。

新增：

```txt
skills/qihang-image-generation/SKILL.md
```

内容包含：

- 什么时候用文生图。
- 什么时候用图生图。
- reference id 的含义。
- 参数推荐顺序。
- 生成任务是异步的。
- 如何轮询任务。
- 失败时是否应该重试。
- 什么情况下需要询问用户。
- 不要猜模型枚举值，先调用 `list_generation_models`。
- 不要把任意 URL 当 reference，除非后端明确支持远程 URL。

示例元数据：

```md
---
name: qihang-image-generation
description: Generate or edit product images through Qihang AI image generation tools.
---
```

## 测试计划

### Backend

- [x] JWT API Secret 管理接口测试。
- [x] API Secret 正常认证测试。
- [x] 错误 token、撤销 token、过期 token、错误 scope 测试。
- [x] `list_generation_models` 数据结构测试。
- [x] 文生图创建测试。
- [x] 图生图创建测试。
- [x] reference 不属于当前用户时 403 / 422。
- [x] Token 冻结、失败释放逻辑回归。
- [x] task detail 只返回当前用户任务。
- [x] Rubocop 通过。
- [x] RSpec 通过。

### Frontend

- [ ] Secret 创建流程。
- [ ] Secret 只显示一次。
- [ ] 撤销流程。
- [ ] 无权限接口错误处理。
- [x] 页面构建通过。

### MCP Server

- [x] 四个 tools schema 测试。
- [x] Backend mock 测试。
- [x] 401 / 403 / 422 / 429 / 5xx 错误转换测试。
- [x] MCP Inspector 手工验证。
- [x] Codex 接入验证。
- [x] Claude Code / Claude Desktop 至少一个客户端验证。

### E2E 场景

1. 用户创建 API Secret。
2. Codex 配置 MCP。
3. Codex 上传本地参考图，拿到 `reference_id`。
4. Codex 查询模型。
5. Codex 使用 `reference_id` 创建图生图任务。
6. Codex 查询任务直到 success。
7. 断网或超时后使用同一 `Idempotency-Key` 重试，只产生一个任务。
8. 用户在 Qihang 历史记录中看到任务。
9. Token transaction 正确。
10. 撤销 Secret 后 Codex 调用返回 401。

## 里程碑

### M0：方案确认

预计：0.25 天

- 确认 token 格式、scope、第一版 tools。
- 已纳入范围：第一版包含 base64 上传。
- 已纳入范围：不修改现有 JWT 认证。

### M1：API Secret 后端

预计：1.5 天

- migration / model / issuer / authenticator。
- Secret 管理 API。
- 单测和 request specs。

### M2：MCP Backend API 与上传

预计：2.5 天

- `/mcp_api/v1` 基础接口。
- 模型查询。
- 上传接口。
- 任务创建和查询。
- reference resolver。
- 权限、审计、限流、幂等。
- specs。

### M3：前端 Secret 管理

预计：1.5 天

- 管理页面。
- 创建、复制、撤销。
- MCP 接入文档和配置示例。

### M4：MCP Server

预计：2.5 天

- TypeScript MCP 项目。
- 四个 tools。
- 错误处理。
- README。
- MCP Inspector 验证。

### M5：Agent Skill 与联调

预计：1 天

- 编写 `SKILL.md`。
- Codex 实测。
- Claude 实测。
- 修复交互问题。
- 准备发布说明。

## 总预计工作量

约 `9.25` 人天，不含发布后的灰度观察。

## 第二版方向

### 1. 偏好记忆

新增 scope 和 tools，让外部 AI 能读写用户长期偏好。

- scope：`memories:read`、`memories:write`
- tools：`list_memories`、`save_memory`
- 价值：Codex / Claude 生图时自动使用常用画幅、模型、产品保护规则、品牌风格和负面提示词，减少重复询问。

### 2. 大图上传优化

第一版 base64 上传限制 10MB。

第二版支持 presigned URL 直传 OSS，后端只接收上传完成后的 blob 引用，降低 Rails 接口带宽和内存压力，并支持更大图片。

### 3. 更多生成能力

逐步开放现有系统已支持的能力。

- 取消任务
- 失败任务重试
- 局部编辑
- 多图合成
- 蒙版 / 选区参数
- 生成结果反馈

对应新增 tools：`cancel_generation_task`、`retry_generation_task`、`edit_image_region`。

### 4. MCP Remote HTTP 服务

第一版是本地 stdio，用户需要自行配置命令和环境变量。

第二版提供远程 MCP 服务：

```txt
https://mcp.qsmile.ai/mcp
```

包含 MCP Streamable HTTP、用户登录授权、OAuth 2.1 或设备码流程、多客户端连接管理、服务端统一速率限制和审计。

### 5. 密钥运营能力

- 按 key 查看调用量和 Token 消耗
- 按 scope 精细授权
- 支持 IP allowlist
- 支持自动过期提醒
- 支持团队共享密钥

### V2 优先级

1. 偏好记忆：提升对话式生图体验，价值最高。
2. presigned 直传 OSS：解决大图和接口压力。
3. 取消 / 重试 / 局部编辑：补齐执行能力。
4. MCP Remote HTTP：降低接入门槛，需要先验证用户规模。
5. 密钥运营能力：等 MCP 使用量起来后再做。

## 当前执行状态（2026-10-20）

- 后端、前端、MCP Server 第一版功能已实现。
- 后端全量 RSpec：433 examples，0 failures；Rubocop 通过。
- 前端构建通过。
- MCP Server：11 tests / lint / build 通过。
- MCP SDK E2E 已跑通上传、模型查询、创建图生图任务、轮询到 success。
- Claude Code 实测已通过 MCP 调用 list_generation_models，返回 11 个图生图模型。
- Codex CLI 已通过 MCP 调用 list_generation_models，返回 11 个图生图模型。外部模型 provider 用本地 mock Responses 服务模拟；qihang-image MCP Server 和 Rails Backend 均为真实进程。
- 第一版计划内开发与客户端接入验证已完成。

## 验收标准

- 现有 App API JWT 认证行为不变。
- API Secret 只能访问 MCP API。
- Secret 创建后只在一次响应中返回完整值。
- Secret 可撤销，撤销后立即失效。
- MCP 创建的任务归属正确用户和应用。
- MCP 创建的任务使用现有 Token 扣费。
- 同一 `Idempotency-Key` 不产生重复任务和重复扣费。
- 本地参考图上传后可用于图生图。
- 图生图 reference 必须属于当前用户。
- Codex 能通过 MCP 完成模型查询、创建图生图任务、查询结果。
- 任务历史与现有 Web UI 保持一致。

## 风险与对策

| 风险 | 对策 |
|---|---|
| 外部 AI 误传不属于自己的 reference | 后端强制 ownership 校验 |
| 外部 AI 盲目重试导致重复扣费 | 创建接口强制 / 默认生成 idempotency key，错误提示禁止盲目重试 |
| API Secret 泄露 | 只显示一次、可撤销、记录最近使用、支持有效期 |
| 生图任务耗时长 | MCP 异步返回 task id，由外部 AI 查询状态 |
| 模型参数经常变化 | `list_generation_models` 从后端动态返回 |
| 上传大图拖垮接口 | 第一版限制 10MB 和图片类型；后续大图改用 presigned 直传 OSS |
| MCP 工具描述不清导致误调用 | 用 Agent Skill 补充使用规则 |

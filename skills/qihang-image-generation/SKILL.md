---
name: qihang-image-generation
description: Generate or edit product images through Qihang AI image generation tools.
---

# Qihang AI Image Generation

## When to use

- User asks to create a new image from text description → `create_image` with `task_type=text_to_image`.
- User provides a reference image and asks to edit, replace background, or modify → upload with `upload_image`, then `create_image` with `task_type=image_to_image` and the returned `reference_id`.
- User wants a product bundled with gifts/accessories in one shot (套装/搭配/多图合成) → `task_type=gift_bundle` with role-tagged `references` (see below).
- User asks about available models, sizes, or parameters → `list_generation_models` first.

## Gift bundle (multi-image composition)

- Requires `references` with explicit roles: at least one `main_product` (the hero product to preserve) AND at least one `gift_product` or `accessory`.
- Example: `references: [{reference_id: 1, role: "main_product"}, {reference_id: 2, role: "gift_product"}]`.
- Optional `bundle` styling: `layout` (main_left_gift_right / main_center_gift_front / gift_around_main / package_set), `background`, `lighting`, `angle`, `notes`.
- Describe the desired scene in `prompt`; the backend automatically instructs the model not to alter the main product.
- Use an image-to-image capable model (check `list_generation_models` for `gift_bundle` support).

## Reference IDs

- `reference_ids` must be integers returned by `upload_image` or existing asset/result IDs in Qihang AI.
- Do NOT pass arbitrary URLs or file paths as `reference_ids`.
- For `text_to_image`, always pass `reference_ids: []`.
- `upload_image` accepts images up to 30MB; bytes are uploaded directly to object storage, never through the backend.

## Generation flow

1. If unsure about models or parameters, call `list_generation_models` first.
2. If the user provides a local image, call `upload_image` to get a `reference_id`.
3. Call `create_image` — it returns immediately with a `generation_task_id` (async) and an `estimated_tokens` cost estimate.
4. Poll `get_generation_task` until `status` is `success` or `failed`.
5. On `success`, return the `url` values from `results` to the user.

## Cancel and retry

- The user wants to stop a running task → `cancel_generation_task` (works while status is pending/submitted/waiting/generating; frozen tokens are released automatically).
- A task `failed`, or only some images in a batch failed → `retry_generation_task` on the source task. Use `failed_only: true` to re-run only the failed images of a partially successful task, or `result_id` to redo one specific image.
- Retry creates a NEW task and consumes tokens again — confirm with the user before retrying.

## User preferences (memories)

- Before generating for a user, call `list_memories` once per session and apply their saved preferences (brand style, default aspect ratio, negative rules) unless the user explicitly overrides them.
- When the user states a durable preference ("以后都用 3:4" / "品牌风格要明亮"), save it with `save_memory`. Do not save one-off requests or sensitive personal data.

## Error handling

- 401: API Secret is invalid or revoked. Do not retry.
- 422: Fix the parameter described in the error and retry.
- 429: Wait before retrying.
- 5xx or timeout after `create_image`: Do NOT blindly retry — this may create duplicate tasks and charge the user twice. Ask the user whether to retry.
- `failed` status: Report the `error_message` to the user. Do not auto-retry.

## Parameter tips

- Always use `list_generation_models` to check supported `size`, `resolution`, and `output_format` before passing them.
- Default model: let the backend choose if not specified.
- For product images, preserve product fidelity in prompts.
- Use `negative_prompt` for elements to avoid (e.g. "blurry, watermark, text errors").

## Tool parameter reference

### create_image

| Param | Required | Values / notes |
|---|---|---|
| `task_type` | yes | `text_to_image` \| `image_to_image` \| `gift_bundle` |
| `prompt` | yes | Scene description. For edits say explicitly what must stay unchanged (e.g. "保持产品/模特不变"), and where items go (e.g. "右手拎着包" not "包放旁边" — placement is prompt-driven). |
| `negative_prompt` | no | Elements to avoid, e.g. "主体变形，文字错误" |
| `model` | no | Model key from `list_generation_models`. Omit to let the backend choose. image_to_image / gift_bundle require an image-to-image capable model (task_types includes them). |
| `size` | no | Aspect ratio, default `1:1`. Common: `1:1 3:4 4:3 16:9 9:16 3:2 2:3 auto`; per-model enum in `list_generation_models.params.aspect_ratio`. |
| `count` | no | 1–10 images per task, default 1. |
| `output_format` | no | `png` \| `jpeg`, default `png`. |
| `resolution` | no | `1K` \| `2K` \| `4K` — only for models that expose it. |
| `reference_ids` | cond. | For image_to_image: at least one upload/asset/result ID; all treated as reference images. Empty for text_to_image. |
| `references` | cond. | `[{reference_id, role}]` with role `main_product` \| `gift_product` \| `accessory` \| `reference_image`. Required for gift_bundle (≥1 main_product and ≥1 gift_product or accessory). Mutually exclusive with `reference_ids`. |
| `bundle` | no | gift_bundle styling: `layout` (`main_left_gift_right` \| `main_center_gift_front` \| `gift_around_main` \| `package_set`), `background`, `lighting`, `angle`, `notes` — free-text descriptions. |

Returns `generation_task_id`, `status`, `estimated_tokens`. Creation is idempotent per `Idempotency-Key` (handled automatically).

### upload_image

`filename`, `mime_type` (`image/png` | `image/jpeg` | `image/webp`), `data_base64` (≤30MB; bytes go straight to object storage), `purpose` (`reference`). Returns `reference_id`.

### get_generation_task

`generation_task_id`. Returns `status` (`pending`/`submitted`/`waiting`/`generating` → `success`/`failed`/`timeout`/`canceled`), `results[].url`, `error_message`, `needs_polling`, `next_action`.

### cancel_generation_task

`generation_task_id`. Only cancelable while pending/submitted/waiting/generating; frozen tokens are released.

### retry_generation_task

`generation_task_id` (source task), optional `result_id` (redo one image), optional `failed_only` (redo only failed images of a partial success). Works on failed AND completed tasks (= re-generate). Creates a new task and charges again — confirm with the user first.

### list_generation_models

Optional `task_type` filter. Returns each model's `key`, `task_types`, `prompt_max_length`, and `params` (per-model `aspect_ratio` / `resolution` / `output_format` enums with defaults). Never guess model keys or enums — read them here.

### list_memories / save_memory

`list_memories`: optional `kind` / `scope` filters. `save_memory`: `title` (≤120), `content` (≤2000, no sensitive data), `kind` (`style` `subject` `background` `composition` `negative_rule` `model_preference` `output_preference`), `scope` (`global` `application` `task_type`, last needs `scope_value`), optional `tags`. Requires memories scopes on the API secret.

---
name: qihang-image-generation
description: Generate or edit product images through Qihang AI image generation tools.
---

# Qihang AI Image Generation

## When to use

- User asks to create a new image from text description → `create_image` with `task_type=text_to_image`.
- User provides a reference image and asks to edit, replace background, or modify → upload with `upload_image`, then `create_image` with `task_type=image_to_image` and the returned `reference_id`.
- User asks about available models, sizes, or parameters → `list_generation_models` first.

## Reference IDs

- `reference_ids` must be integers returned by `upload_image` or existing asset/result IDs in Qihang AI.
- Do NOT pass arbitrary URLs or file paths as `reference_ids`.
- For `text_to_image`, always pass `reference_ids: []`.

## Generation flow

1. If unsure about models or parameters, call `list_generation_models` first.
2. If the user provides a local image, call `upload_image` to get a `reference_id`.
3. Call `create_image` — it returns immediately with a `generation_task_id` (async).
4. Poll `get_generation_task` until `status` is `success` or `failed`.
5. On `success`, return the `url` values from `results` to the user.

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

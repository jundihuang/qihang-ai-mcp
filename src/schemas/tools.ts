import { z } from "zod";

export const UploadImageSchema = z.object({
  filename: z.string().describe("File name including extension"),
  mime_type: z.enum(["image/png", "image/jpeg", "image/webp"]).describe("Image MIME type"),
  data_base64: z.string().describe("Base64-encoded image data (max 30MB, uploaded directly to object storage)"),
  purpose: z.literal("reference").default("reference"),
});

export const ListGenerationModelsSchema = z.object({
  task_type: z.enum(["text_to_image", "image_to_image"]).optional().describe("Filter by task type"),
});

export const CreateImageSchema = z.object({
  prompt: z.string().min(1).describe("Image generation prompt"),
  negative_prompt: z.string().optional().describe("Negative prompt to exclude elements"),
  task_type: z.enum(["text_to_image", "image_to_image", "gift_bundle"]).describe("Generation type; gift_bundle composites a product with gift/accessory images"),
  reference_ids: z.array(z.number()).default([]).describe("Upload or asset IDs for image_to_image (all treated as reference images)"),
  references: z.array(z.object({
    reference_id: z.number().describe("ID returned by upload_image"),
    role: z.enum(["main_product", "gift_product", "accessory", "reference_image"]).describe("Role of this image in the composition"),
  })).optional().describe("References with explicit roles; required for gift_bundle (needs >=1 main_product and >=1 gift_product or accessory). Mutually exclusive with reference_ids"),
  bundle: z.object({
    layout: z.string().optional().describe("Composition layout, e.g. main_left_gift_right / main_center_gift_front / gift_around_main / package_set"),
    background: z.string().optional().describe("Background style description"),
    lighting: z.string().optional().describe("Lighting style description"),
    angle: z.string().optional().describe("Camera angle description"),
    notes: z.string().optional().describe("Extra styling notes"),
  }).optional().describe("Optional gift_bundle styling options"),
  model: z.string().optional().describe("Model key; use list_generation_models to see available options"),
  size: z.string().optional().describe("Aspect ratio (e.g. 1:1, 4:5, 16:9)"),
  count: z.number().min(1).max(10).default(1).describe("Number of images to generate"),
  output_format: z.enum(["png", "jpeg"]).default("png").describe("Output file format"),
  resolution: z.enum(["1K", "2K", "4K"]).optional().describe("Resolution; check model params for supported values"),
});

export const GetGenerationTaskSchema = z.object({
  generation_task_id: z.number().describe("ID returned by create_image"),
});

export const CancelGenerationTaskSchema = z.object({
  generation_task_id: z.number().describe("ID of the task to cancel; only pending/submitted/waiting/generating tasks can be canceled"),
});

export const RetryGenerationTaskSchema = z.object({
  generation_task_id: z.number().describe("ID of the source task to retry"),
  result_id: z.number().optional().describe("Retry a specific result of the source task"),
  failed_only: z.boolean().default(false).describe("Only re-run the failed external tasks of a partially successful task"),
});

export const MEMORY_KINDS = [
  "style",
  "subject",
  "background",
  "composition",
  "negative_rule",
  "model_preference",
  "output_preference",
] as const;

export const MEMORY_SCOPES = ["global", "application", "task_type"] as const;

export const ListMemoriesSchema = z.object({
  kind: z.enum(MEMORY_KINDS).optional().describe("Filter by memory kind"),
  scope: z.enum(MEMORY_SCOPES).optional().describe("Filter by memory scope"),
});

export const SaveMemorySchema = z.object({
  title: z.string().min(1).max(120).describe("Short memory title, max 120 chars"),
  content: z.string().min(1).max(2000).describe("Memory content, max 2000 chars; no sensitive personal data"),
  kind: z.enum(MEMORY_KINDS).describe("What preference this memory captures"),
  scope: z.enum(MEMORY_SCOPES).default("global").describe("global / application / task_type"),
  scope_value: z.enum(["text_to_image", "image_to_image"]).optional().describe("Required when scope is task_type"),
  tags: z.array(z.string()).default([]).describe("Optional tags"),
});

export type UploadImageInput = z.infer<typeof UploadImageSchema>;
export type ListGenerationModelsInput = z.infer<typeof ListGenerationModelsSchema>;
export type CreateImageInput = z.infer<typeof CreateImageSchema>;
export type GetGenerationTaskInput = z.infer<typeof GetGenerationTaskSchema>;
export type CancelGenerationTaskInput = z.infer<typeof CancelGenerationTaskSchema>;
export type RetryGenerationTaskInput = z.infer<typeof RetryGenerationTaskSchema>;
export type ListMemoriesInput = z.infer<typeof ListMemoriesSchema>;
export type SaveMemoryInput = z.infer<typeof SaveMemorySchema>;

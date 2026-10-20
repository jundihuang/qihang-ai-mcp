import { z } from "zod";

export const UploadImageSchema = z.object({
  filename: z.string().describe("File name including extension"),
  mime_type: z.enum(["image/png", "image/jpeg", "image/webp"]).describe("Image MIME type"),
  data_base64: z.string().describe("Base64-encoded image data (max 10MB)"),
  purpose: z.literal("reference").default("reference"),
});

export const ListGenerationModelsSchema = z.object({
  task_type: z.enum(["text_to_image", "image_to_image"]).optional().describe("Filter by task type"),
});

export const CreateImageSchema = z.object({
  prompt: z.string().min(1).describe("Image generation prompt"),
  negative_prompt: z.string().optional().describe("Negative prompt to exclude elements"),
  task_type: z.enum(["text_to_image", "image_to_image"]).describe("Generation type"),
  reference_ids: z.array(z.number()).default([]).describe("Upload or asset IDs for image_to_image"),
  model: z.string().optional().describe("Model key; use list_generation_models to see available options"),
  size: z.string().optional().describe("Aspect ratio (e.g. 1:1, 4:5, 16:9)"),
  count: z.number().min(1).max(10).default(1).describe("Number of images to generate"),
  output_format: z.enum(["png", "jpeg"]).default("png").describe("Output file format"),
  resolution: z.enum(["1K", "2K", "4K"]).optional().describe("Resolution; check model params for supported values"),
});

export const GetGenerationTaskSchema = z.object({
  generation_task_id: z.number().describe("ID returned by create_image"),
});

export type UploadImageInput = z.infer<typeof UploadImageSchema>;
export type ListGenerationModelsInput = z.infer<typeof ListGenerationModelsSchema>;
export type CreateImageInput = z.infer<typeof CreateImageSchema>;
export type GetGenerationTaskInput = z.infer<typeof GetGenerationTaskSchema>;

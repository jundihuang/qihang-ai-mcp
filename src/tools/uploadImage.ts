import type { QihangClient } from "../client.js";
import type { UploadImageInput } from "../schemas/tools.js";

export async function uploadImage(client: QihangClient, input: UploadImageInput) {
  const result = await client.uploadImage({
    filename: input.filename,
    content_type: input.mime_type,
    data_base64: input.data_base64,
  });

  return {
    reference_id: result.reference_id,
    reference_type: result.reference_type,
    filename: result.filename,
    content_type: result.content_type,
    byte_size: result.byte_size,
    next_action: "Pass reference_id into create_image with task_type=image_to_image",
  };
}

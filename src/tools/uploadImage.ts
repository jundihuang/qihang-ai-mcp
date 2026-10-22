import { createHash } from "node:crypto";
import type { QihangClient } from "../client.js";
import type { UploadImageInput } from "../schemas/tools.js";

const MAX_UPLOAD_BYTES = 30 * 1024 * 1024;

export async function uploadImage(client: QihangClient, input: UploadImageInput) {
  const bytes = Buffer.from(input.data_base64, "base64");
  if (bytes.length === 0) throw new Error("data_base64 为空或不是有效的 Base64");
  if (bytes.length > MAX_UPLOAD_BYTES) throw new Error("图片超过 30MB 限制");

  // Presigned direct upload: Rails only issues the signature, the image bytes
  // go straight to OSS so large files never pass through the backend.
  const presign = await client.presignUpload<{
    reference_id: number;
    reference_type: string;
    filename: string;
    content_type: string;
    byte_size: number;
    preview_url?: string;
    direct_upload: { url: string; headers: Record<string, string> };
  }>({
    filename: input.filename,
    content_type: input.mime_type,
    byte_size: bytes.length,
    base64_digest: createHash("md5").update(bytes).digest("base64"),
  });

  const putResponse = await fetch(presign.direct_upload.url, {
    method: "PUT",
    headers: presign.direct_upload.headers,
    body: new Uint8Array(bytes),
  });
  if (!putResponse.ok) {
    throw new Error(
      `直传 OSS 失败（HTTP ${putResponse.status}）。请重试 upload_image；若持续失败请检查图片格式与大小。`
    );
  }

  return {
    reference_id: presign.reference_id,
    reference_type: presign.reference_type,
    filename: presign.filename,
    content_type: presign.content_type,
    byte_size: presign.byte_size,
    ...(presign.preview_url ? { preview_url: presign.preview_url } : {}),
    next_action: "Pass reference_id into create_image with task_type=image_to_image",
  };
}

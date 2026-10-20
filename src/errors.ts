import { ApiError } from "./client.js";

export function formatApiError(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 401:
        return `API Secret 无效或已撤销。请检查 QIHANG_API_SECRET 配置。`;
      case 403:
        return `权限不足：${error.message}。请确认 API Secret 包含所需的 scope。`;
      case 422:
        return `参数错误：${error.message}`;
      case 429:
        return `请求频率受限，请稍后重试。`;
      default:
        return `Qihang AI 服务暂时不可用（HTTP ${error.status}）。如果是创建任务，请勿盲目重试以避免重复扣费。`;
    }
  }

  if (error instanceof Error && error.name === "AbortError") {
    return "请求超时。如果是创建任务，请勿盲目重试以避免重复扣费。";
  }

  return error instanceof Error ? error.message : String(error);
}

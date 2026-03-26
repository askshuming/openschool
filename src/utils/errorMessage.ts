import { HttpError } from "../api/httpClient";

const codeMessageMap: Record<string, string> = {
  VALIDATION_ERROR: "请求参数有误，请检查后重试。",
  PARENT_NOT_FOUND: "家长账号不存在，请重新登录后再试。",
  CHILD_NOT_FOUND: "孩子档案不存在，请重新创建后再试。",
  LESSON_NOT_FOUND: "课文不存在，请稍后再试。",
  LESSON_PACK_NOT_FOUND: "课文内容包不存在，请稍后再试。",
  SESSION_NOT_FOUND: "学习会话已失效，请重新开始。",
  SESSION_NOT_COMPLETED: "请完成本课后再结束学习。",
  QUESTION_NOT_FOUND: "题目不存在，请重新进入学习。",
  REVIEW_ITEM_NOT_FOUND: "复习题目不存在，请刷新复习列表后重试。",
  REVIEW_OPTION_OUT_OF_RANGE: "所选答案无效，请重新选择后提交。",
  CONSENT_REQUIRED: "请先完成监护人同意后继续。",
  CONSENT_NOT_FOUND: "当前账号暂无监护人同意记录。",
  PARENT_CHILD_MISMATCH: "当前账号无权查看该孩子数据，请切换家长账号后重试。",
  NOT_FOUND: "请求的接口不存在。",
  INTERNAL_ERROR: "服务繁忙，请稍后重试。",
};

export function isOfflineError(error: unknown) {
  if (error instanceof TypeError) {
    const message = error.message.toLowerCase();
    return (
      message.includes("network request failed") ||
      message.includes("failed to fetch") ||
      message.includes("networkerror")
    );
  }
  return false;
}

export function toUserErrorMessage(error: unknown, fallback = "操作失败，请稍后重试。") {
  if (isOfflineError(error)) {
    return "当前网络不可用，请检查网络后重试。";
  }
  if (error instanceof HttpError) {
    if (error.errorCode && codeMessageMap[error.errorCode]) {
      return codeMessageMap[error.errorCode];
    }
    return error.message || fallback;
  }
  if (error instanceof Error) {
    return error.message || fallback;
  }
  return fallback;
}

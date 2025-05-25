export const NoticeType = {
  info: "info",
  success: "success",
  warning: "warning",
  error: "error"
}

export type NoticeType = typeof NoticeType[keyof typeof NoticeType];

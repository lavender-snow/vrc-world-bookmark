export const NoticeType = {
  info: "info",
  success: "success",
  warning: "warning",
  error: "error"
};

export type NoticeType = typeof NoticeType[keyof typeof NoticeType];

export const DEFAULT_RESULT_PER_PAGE = 10;
export const RESULT_PER_PAGE_OPTIONS = [5, 10, 20, 50];

export const ORDERABLE_COLUMNS = [
  { id: "world.world_created_at", value: "作成日" },
  { id: "world.world_updated_at_cached", value: "更新日" },
  { id: "world.favorites_cached", value: "お気に入り数" },
  { id: "world.visits_cached", value: "訪問数"  },
  { id: "bookmark.created_at", value: "ブックマーク登録日" },
] as const;

export type OrderableColumnKey = typeof ORDERABLE_COLUMNS[number]["id"];

export const SORT_ORDERS = [
  { id: "desc", value: "降順" },
  { id: "asc", value: "昇順" },
] as const;

export type SortOrder = typeof SORT_ORDERS[number]["id"];

export const GENRE = {
  CHILL: 0,
  HIGH_QUALITY: 1,
  GAME: 2,
  HORROR: 3,
  PHOTO_SPOT: 4,
};

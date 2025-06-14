import type { LogicMode } from 'src/types/renderer';

export const NoticeType = {
  info: 'info',
  success: 'success',
  warning: 'warning',
  error: 'error',
};
export type NoticeType = typeof NoticeType[keyof typeof NoticeType];

export const DEFAULT_RESULT_PER_PAGE = 10;
export const RESULT_PER_PAGE_OPTIONS = [5, 10, 20, 50];

export const ORDERABLE_COLUMNS = [
  { id: 'world.world_created_at', value: '作成日' },
  { id: 'world.world_updated_at_cached', value: '更新日' },
  { id: 'world.favorites_cached', value: 'お気に入り数' },
  { id: 'world.visits_cached', value: '訪問数'  },
  { id: 'bookmark.created_at', value: 'ブックマーク登録日' },
] as const;
export type OrderableColumnKey = typeof ORDERABLE_COLUMNS[number]['id'];

export const SORT_ORDERS = [
  { id: 'desc', value: '降順' },
  { id: 'asc', value: '昇順' },
] as const;
export type SortOrder = typeof SORT_ORDERS[number]['id'];

export const GENRE = {
  chill: 0,
  high_quality: 1,
  game: 2,
  horror: 3,
  photo_spot: 4,
};

export const LOGIC_MODES: Record<LogicMode, LogicMode> = {
  and: 'and',
  or: 'or',
};

export const VIEW_TYPES = {
  list: 'list',
  grid: 'grid',
};
export type ViewType = typeof VIEW_TYPES[keyof typeof VIEW_TYPES];

export const WORLD_UPDATE_INFO_STATUS = {
  idle: 'idle',
  updating: 'updating',
  completed: 'completed',
  noTarget: 'noTarget',
  error: 'error',
};

export type WorldUpdateInfoStatusType = typeof VIEW_TYPES[keyof typeof VIEW_TYPES];

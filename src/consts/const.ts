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
} as const;
export type GenreType = typeof GENRE[keyof typeof GENRE];

export const LOGIC_MODES: Record<LogicMode, LogicMode> = {
  and: 'and',
  or: 'or',
};

export const VIEW_TYPES = {
  list: 'list',
  grid: 'grid',
} as const;
export type ViewType = typeof VIEW_TYPES[keyof typeof VIEW_TYPES];

export const WORLD_UPDATE_INFO_STATUS = {
  idle: 'idle',
  updating: 'updating',
  completed: 'completed',
  noTarget: 'noTarget',
  error: 'error',
} as const;
export type WorldUpdateInfoStatusType = typeof WORLD_UPDATE_INFO_STATUS[keyof typeof WORLD_UPDATE_INFO_STATUS];

export const VISITS_STATUS = {
  unvisited: 0,
  in_progress: 1,
  completed: 2,
  hidden: 3,
} as const;

export type VisitStatusType = typeof VISITS_STATUS[keyof typeof VISITS_STATUS];

export const RECOMMEND_TYPE = [
  { id: 'random', label: 'ランダム検索', description: 'お気に入り数、総訪問数、更新日などを加味しつつランダムに未訪問ワールドを取得します。' },
  { id: 'conversation', label: '対話検索', description: 'LLMを活用し、対話形式でおすすめワールドを検索します。API利用コストが発生します。' },
] as const;
export type RecommendType = typeof RECOMMEND_TYPE[number]['id'];

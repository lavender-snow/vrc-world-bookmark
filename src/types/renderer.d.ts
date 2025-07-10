export interface VRChatWorldInfo {
  id: string;
  authorName: string;
  capacity: number;
  createdAt: string;
  description: string;
  favorites: number;
  imageUrl: string;
  name: string;
  releaseStatus: string;
  tags: string[];
  thumbnailImageUrl: string;
  updatedAt: string;
  visits: number;
  deletedAt: string | null;
  genreIds: number[];
  note: string;
  visitStatusId: number;
}

export interface UpdateWorldBookmarkOptions {
  worldId: string,
  note?: string,
  visitStatusId?: number
}

export interface UpdateWorldGenresOptions {
  worldId: string;
  genreIds: number[];
}

export type LogicMode = 'and' | 'or';

export interface orderByColumn {
  name: string;
  sortOrder: 'asc' | 'desc';
}

export interface BookmarkListOptions {
  page?: number;
  limit?: number;
  selectedUncategorized?: boolean;
  selectedGenres: number[];
  genreFilterMode: LogicMode;
  selectedVisitStatuses: number[];
  searchTerm?: string;
  orderByColumns?: orderByColumn[];
}

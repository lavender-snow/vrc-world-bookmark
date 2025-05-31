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
  genreId: number;
  note: string;
  visitStatusId: number;
}

export interface UpdateWorldBookmarkOptions {
  worldId: string,
  genreId?: number,
  note?: string,
  visitStatusId?: number
}

export interface BookmarkListOptions {
  page?: number;
  limit?: number;
  genreId?: number;
  visitStatusId?: number;
  searchTerm?: string;
  orderBy?: string;
  sortOrder?: "asc" | "desc";
}

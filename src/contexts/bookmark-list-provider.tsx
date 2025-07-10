import { createContext, useContext, useEffect, useState } from 'react';

import { useAppData } from './app-data-provider';

import { DEFAULT_RESULT_PER_PAGE, GENRE, GenreType, OrderableColumnKey, SortOrder, VIEW_TYPES, ViewType } from 'src/consts/const';
import { VRChatWorldInfo } from 'src/types/renderer';


type BookmarkListContextValue = {
  page?: number;
  setPage?: React.Dispatch<React.SetStateAction<number>>;
  limit?: number;
  setLimit?: React.Dispatch<React.SetStateAction<number>>;
  selectedGenres?: GenreType[];
  setSelectedGenres?: React.Dispatch<React.SetStateAction<GenreType[]>>;
  genreFilterMode?: 'and' | 'or';
  setGenreFilterMode?: React.Dispatch<React.SetStateAction<'and' | 'or'>>;
  selectedUncategorized?: boolean;
  setSelectedUncategorized?: React.Dispatch<React.SetStateAction<boolean>>;
  selectedVisitStatuses?: number[];
  setSelectedVisitStatuses?: React.Dispatch<React.SetStateAction<number[]>>;
  searchTerm?: string;
  setSearchTerm?: React.Dispatch<React.SetStateAction<string>>;
  debouncedTerm?: string;
  setDebouncedTerm?: React.Dispatch<React.SetStateAction<string>>;
  orderBy?: string;
  setOrderBy?: React.Dispatch<React.SetStateAction<OrderableColumnKey>>;
  sortOrder?: SortOrder;
  setSortOrder?: React.Dispatch<React.SetStateAction<SortOrder>>;
  filterVisible?: boolean;
  setFilterVisible?: React.Dispatch<React.SetStateAction<boolean>>;
  viewType?: ViewType;
  setViewType?: React.Dispatch<React.SetStateAction<ViewType>>;
  listViewSelectedWorld?: VRChatWorldInfo | null;
  setListViewSelectedWorld?: React.Dispatch<React.SetStateAction<VRChatWorldInfo | null>>;
};

const BookmarkListContext = createContext<BookmarkListContextValue>(undefined);

export function BookmarkListProvider({ children }: { children: React.ReactNode }) {
  const { visitStatuses, lastUpdatedWorldInfo } = useAppData();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_RESULT_PER_PAGE);
  const [selectedUncategorized, setSelectedUncategorized] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState<GenreType[]>([GENRE.high_quality]);
  const [genreFilterMode, setGenreFilterMode] = useState<'and' | 'or'>('and');
  const [selectedVisitStatuses, setSelectedVisitStatuses] = useState<number[]>(visitStatuses
    .filter(v => v.name === 'Unvisited' || v.name === 'InProgress')
    .map(v => v.id),
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');
  const [orderBy, setOrderBy] = useState<OrderableColumnKey>('bookmark.created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [filterVisible, setFilterVisible] = useState(true);
  const [viewType, setViewType] = useState<ViewType>(VIEW_TYPES.list);
  const [listViewSelectedWorld, setListViewSelectedWorld] = useState<VRChatWorldInfo | null>(null);

  useEffect(() => {
    if (
      lastUpdatedWorldInfo &&
      lastUpdatedWorldInfo.id === listViewSelectedWorld?.id &&
      JSON.stringify(lastUpdatedWorldInfo) !== JSON.stringify(listViewSelectedWorld)
    ) {
      setListViewSelectedWorld(lastUpdatedWorldInfo);
    }
  }, [lastUpdatedWorldInfo]);

  return (
    <BookmarkListContext.Provider value={{
      page, setPage,
      limit, setLimit,
      selectedUncategorized, setSelectedUncategorized,
      selectedGenres, setSelectedGenres,
      genreFilterMode, setGenreFilterMode,
      selectedVisitStatuses, setSelectedVisitStatuses,
      searchTerm, setSearchTerm,
      debouncedTerm, setDebouncedTerm,
      orderBy, setOrderBy,
      sortOrder, setSortOrder,
      filterVisible, setFilterVisible,
      viewType, setViewType,
      listViewSelectedWorld, setListViewSelectedWorld,
    }}>
      {children}
    </BookmarkListContext.Provider>
  );
}

export function useBookmarkListState() {
  const ctx = useContext(BookmarkListContext);
  if (!ctx) throw new Error('useBookmarkListState must be used within a BookmarkListProvider');
  return ctx;
}

import { createContext, useContext, useEffect, useState } from 'react';

import { useAppData } from './app-data-provider';

import { BOOKMARK_LIST_INIT_MODE_ID, DEFAULT_RESULT_PER_PAGE, GENRE, GenreType, LOGIC_MODES, OrderableColumnKey, SortOrder, VIEW_TYPES, ViewType } from 'src/consts/const';
import { LogicMode, VRChatWorldInfo } from 'src/types/renderer';


type BookmarkListContextValue = {
  page?: number;
  setPage?: React.Dispatch<React.SetStateAction<number>>;
  limit?: number;
  setLimit?: React.Dispatch<React.SetStateAction<number>>;
  selectedGenres?: GenreType[];
  setSelectedGenres?: React.Dispatch<React.SetStateAction<GenreType[]>>;
  genreFilterMode?: LogicMode;
  setGenreFilterMode?: React.Dispatch<React.SetStateAction<LogicMode>>;
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
  const [selectedUncategorized, setSelectedUncategorized] = useState(true);
  const [selectedGenres, setSelectedGenres] = useState<GenreType[]>([]);
  const [genreFilterMode, setGenreFilterMode] = useState<LogicMode>(LOGIC_MODES.or);
  const [selectedVisitStatuses, setSelectedVisitStatuses] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');
  const [orderBy, setOrderBy] = useState<OrderableColumnKey>('bookmark.created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [filterVisible, setFilterVisible] = useState(true);
  const [viewType, setViewType] = useState<ViewType>(VIEW_TYPES.list);
  const [listViewSelectedWorld, setListViewSelectedWorld] = useState<VRChatWorldInfo | null>(null);

  useEffect(() => {
    async function loadSettings() {
      const bookmarkListInitModeValue = await window.credentialStore.loadKey('bookmarkListInitMode');

      if (bookmarkListInitModeValue === BOOKMARK_LIST_INIT_MODE_ID.discovery) {
        setSelectedUncategorized(false);
        setSelectedGenres([GENRE.high_quality]);
        setSelectedVisitStatuses(visitStatuses
          .filter(v => v.name === 'Unvisited' || v.name === 'InProgress')
          .map(v => v.id),
        );
      }
    }

    loadSettings();
  });

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

import { createContext, useContext, useState } from 'react';

import { useAppData } from './app-data-provider';

import { DEFAULT_RESULT_PER_PAGE, OrderableColumnKey, SortOrder } from 'src/consts/const';


type BookmarkListContextValue = {
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  limit: number;
  setLimit: React.Dispatch<React.SetStateAction<number>>;
  selectedGenres: number[];
  setSelectedGenres: React.Dispatch<React.SetStateAction<number[]>>;
  genreFilterMode: 'and' | 'or';
  setGenreFilterMode: React.Dispatch<React.SetStateAction<'and' | 'or'>>;
  selectedVisitStatuses: number[];
  setSelectedVisitStatuses: React.Dispatch<React.SetStateAction<number[]>>;
  searchTerm?: string;
  setSearchTerm?: React.Dispatch<React.SetStateAction<string>>;
  debouncedTerm?: string;
  setDebouncedTerm?: React.Dispatch<React.SetStateAction<string>>;
  orderBy?: string;
  setOrderBy?: React.Dispatch<React.SetStateAction<OrderableColumnKey>>;
  sortOrder?: 'asc' | 'desc';
  setSortOrder?: React.Dispatch<React.SetStateAction<SortOrder>>;
  filterVisible?: boolean;
  setFilterVisible?: React.Dispatch<React.SetStateAction<boolean>>;
};

const BookmarkListContext = createContext<BookmarkListContextValue | null>(null);

export function BookmarkListProvider({ children }: { children: React.ReactNode }) {
  const { visitStatuses } = useAppData();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_RESULT_PER_PAGE);
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
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

  return (
    <BookmarkListContext.Provider value={{
      page, setPage,
      limit, setLimit,
      selectedGenres, setSelectedGenres,
      genreFilterMode, setGenreFilterMode,
      selectedVisitStatuses, setSelectedVisitStatuses,
      searchTerm, setSearchTerm,
      debouncedTerm, setDebouncedTerm,
      orderBy, setOrderBy,
      sortOrder, setSortOrder,
      filterVisible, setFilterVisible,
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

import { createContext, useContext, useState } from "react";
import { DEFAULT_RESULT_PER_PAGE, OrderableColumnKey, SortOrder } from "../consts/const";

type BookmarkListContextValue = {
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  limit: number;
  setLimit: React.Dispatch<React.SetStateAction<number>>;
  genreId?: number;
  setGenreId: React.Dispatch<React.SetStateAction<number | undefined>>;
  visitStatusId?: number;
  setVisitStatusId: React.Dispatch<React.SetStateAction<number | undefined>>;
  searchTerm?: string;
  setSearchTerm?: React.Dispatch<React.SetStateAction<string>>;
  debouncedTerm?: string;
  setDebouncedTerm?: React.Dispatch<React.SetStateAction<string>>;
  orderBy?: string;
  setOrderBy?: React.Dispatch<React.SetStateAction<OrderableColumnKey | undefined>>;
  sortOrder?: "asc" | "desc";
  setSortOrder?: React.Dispatch<React.SetStateAction<SortOrder>>;
  filterVisible?: boolean;
  setFilterVisible?: React.Dispatch<React.SetStateAction<boolean>>;
}

const BookmarkListContext = createContext<BookmarkListContextValue>(null);

export function BookmarkListProvider({ children }: { children: React.ReactNode }) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_RESULT_PER_PAGE);
  const [genreId, setGenreId] = useState<number | undefined>(undefined);
  const [visitStatusId, setVisitStatusId] = useState<number | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedTerm, setDebouncedTerm] = useState("");
  const [orderBy, setOrderBy] = useState<OrderableColumnKey | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [filterVisible, setFilterVisible] = useState(true);

  return (
    <BookmarkListContext.Provider value={{
      page, setPage,
      limit, setLimit,
      genreId, setGenreId,
      visitStatusId, setVisitStatusId,
      searchTerm, setSearchTerm,
      debouncedTerm, setDebouncedTerm,
      orderBy, setOrderBy,
      sortOrder, setSortOrder,
      filterVisible, setFilterVisible
    }}>
      {children}
    </BookmarkListContext.Provider>
  );
}

export function useBookmarkListState() {
  return useContext(BookmarkListContext);
}

import { createContext, useContext, useEffect, useState } from "react";
import { DEFAULT_RESULT_PER_PAGE, OrderableColumnKey, SortOrder } from "../consts/const";
import { useAppData } from "./AppDataProvider";

type BookmarkListContextValue = {
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  limit: number;
  setLimit: React.Dispatch<React.SetStateAction<number>>;
  selectedGenres: number[];
  setSelectedGenres: React.Dispatch<React.SetStateAction<number[]>>;
  selectedVisitStatuses: number[];
  setSelectedVisitStatuses: React.Dispatch<React.SetStateAction<number[]>>;
  searchTerm?: string;
  setSearchTerm?: React.Dispatch<React.SetStateAction<string>>;
  debouncedTerm?: string;
  setDebouncedTerm?: React.Dispatch<React.SetStateAction<string>>;
  orderBy?: string;
  setOrderBy?: React.Dispatch<React.SetStateAction<OrderableColumnKey>>;
  sortOrder?: "asc" | "desc";
  setSortOrder?: React.Dispatch<React.SetStateAction<SortOrder>>;
  filterVisible?: boolean;
  setFilterVisible?: React.Dispatch<React.SetStateAction<boolean>>;
}

const BookmarkListContext = createContext<BookmarkListContextValue | null>(null);

export function BookmarkListProvider({ children }: { children: React.ReactNode }) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_RESULT_PER_PAGE);
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
  const [selectedVisitStatuses, setSelectedVisitStatuses] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedTerm, setDebouncedTerm] = useState("");
  const [orderBy, setOrderBy] = useState<OrderableColumnKey>("bookmark.created_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [filterVisible, setFilterVisible] = useState(true);

  const { visitStatuses } = useAppData();

  useEffect(() => {
    setSelectedVisitStatuses(visitStatuses
      .filter(v => v.name === "Unvisited" || v.name === "InProgress")
      .map(v => v.id))
  }, [visitStatuses]);

  return (
    <BookmarkListContext.Provider value={{
      page, setPage,
      limit, setLimit,
      selectedGenres, setSelectedGenres,
      selectedVisitStatuses, setSelectedVisitStatuses,
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
  const ctx = useContext(BookmarkListContext);
  if (!ctx) throw new Error("useBookmarkListState must be used within a BookmarkListProvider");
  return useContext(BookmarkListContext);
}

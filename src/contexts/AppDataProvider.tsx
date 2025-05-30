import { createContext, useContext, useState, useEffect } from "react";
import type { Genre, VisitStatus } from "../types/table";

type AppData = {
  genres?: Genre[];
  visitStatuses?: VisitStatus[];
};

const AppDataContext = createContext<AppData>({});

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [visitStatuses, setVisitStatuses] = useState<VisitStatus[]>([]);

  useEffect(() => {
    window.dbAPI.getGenres().then(setGenres);
    window.dbAPI.getVisitStatuses().then(setVisitStatuses);
  }, []);

  return (
    <AppDataContext.Provider value={{ genres, visitStatuses }}>
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  return useContext(AppDataContext);
}

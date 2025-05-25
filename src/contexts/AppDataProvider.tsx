import { createContext, useContext, useState, useEffect } from "react";
import type { Genre } from "../types/table";

type AppData = {
  genres?: Genre[];
};

const AppDataContext = createContext<AppData>({});

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [genres, setGenres] = useState<Genre[]>();

  useEffect(() => {
    window.dbAPI.getGenres().then(setGenres);
  }, []);

  return (
    <AppDataContext.Provider value={{ genres }}>
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  return useContext(AppDataContext);
}

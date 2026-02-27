import React, { createContext, useContext, useEffect, useMemo } from "react";
import { Uniwind } from "uniwind";

type AppThemeContextType = {
  currentTheme: "dark";
  isDark: true;
};

const AppThemeContext = createContext<AppThemeContextType | undefined>(undefined);

export const AppThemeProvider = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    Uniwind.setTheme("dark");
  }, []);

  const value = useMemo(
    () => ({
      currentTheme: "dark" as const,
      isDark: true as const,
    }),
    [],
  );

  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
};

export function useAppTheme() {
  const context = useContext(AppThemeContext);
  if (!context) {
    throw new Error("useAppTheme must be used within AppThemeProvider");
  }
  return context;
}

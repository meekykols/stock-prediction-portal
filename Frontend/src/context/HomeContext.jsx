import { createContext, useContext } from "react";

export const HomeContext = createContext(undefined);

export const HomeProvider = ({ children, value }) => {
  return (
    <HomeContext.Provider value={value}>
      {children}
    </HomeContext.Provider>
  );
};

export const useHome = () => {
  const context = useContext(HomeContext);

  if (context === undefined) {
    throw new Error("useHome must be used within a HomeProvider");
  }

  return context;
};

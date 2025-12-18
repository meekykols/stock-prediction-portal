import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({children}) => {
     const [darkmode, setDarkmode] = useState(() => {
       // Check if theme exists in localStorage, default to false (light mode)
       const savedTheme = localStorage.getItem("theme");
       return savedTheme === "dark";
     });
     
     useEffect(() => {
       if(darkmode){
          document.documentElement.classList.add('dark');
          localStorage.setItem("theme","dark");
       } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem("theme","light");
       }
     }, [darkmode])
     
     return(
        <ThemeContext.Provider value={{darkmode, setDarkmode}}>
            {children}
        </ThemeContext.Provider>
     )
}

export const useDarkMode = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useDarkMode must be used within a ThemeProvider');
  }
  return context;
};
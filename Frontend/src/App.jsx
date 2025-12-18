import React from "react"
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from "./context/ThemeContext"
import Home from "./page/Home";
import { HomeContext } from "./context/HomeContext";


function App() {
  const siteval={
      web_name:"prediction web",
      web_logo:"",
  }
  

  return (
     <HomeContext.Provider value={{siteval}}>
        <ThemeProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home/>} />
          </Routes>
        
        </BrowserRouter>
      </ThemeProvider>
     </HomeContext.Provider>
    
  )
}

export default App

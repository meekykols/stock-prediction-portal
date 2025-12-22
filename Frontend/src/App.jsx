import React from "react"
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from "./context/ThemeContext"
import Home from "./page/Home";
import { HomeContext } from "./context/HomeContext";
import Registration from "./page/UserAuth/Registration";
import Login from "./page/UserAuth/Login";
import Header from "./component/Header";
import Footer from "./component/Footer";


function App() {
  const siteval = {
    web_name: "prediction web",
    web_logo: "",
  }


  return (
    <HomeContext.Provider value={{ siteval }}>
      <ThemeProvider>
        <BrowserRouter>
          <Header />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/registration" element={<Registration />} />
            <Route path="/login" element={<Login />} />
          </Routes>
          <Footer />

        </BrowserRouter>
      </ThemeProvider>
    </HomeContext.Provider>

  )
}

export default App

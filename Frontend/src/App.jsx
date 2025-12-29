import React from "react"
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from "./context/ThemeContext"
import Home from "./page/Home";
import { HomeContext } from "./context/HomeContext";
import Registration from "./page/UserAuth/Registration";
import Login from "./page/UserAuth/Login";
import Header from "./component/Header";
import Footer from "./component/Footer";
import AuthProvider from "./utilities/AuthProvider";
import ProtectClient from "./utilities/ProtectClient";
import Dashboard from "./page/Dashboard";
import IndexPage from "./component/DashboardClient/IndexPage";
import PredictionPage from "./component/DashboardClient/PredictionPage";
import { UserInfoProvider } from "./context/UserContext";
import UserProfile from "./component/DashboardClient/UserProfile";


function App() {
  const siteval = {
    web_name: "prediction web",
    web_logo: "",
  }


  return (
    <AuthProvider>
      <HomeContext.Provider value={{ siteval }}>
        <UserInfoProvider>
          <ThemeProvider>
            <BrowserRouter>
              <Header />
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/registration" element={<Registration />} />
                <Route path="/login" element={<Login />} />

                <Route path={`/dashboard`} element={<ProtectClient />}>
                  <Route element={<Dashboard />}>
                    <Route index element={<IndexPage />} />
                    <Route path="prediction" element={<PredictionPage />} />
                    <Route path="profile" element={<UserProfile />} />


                  </Route>
                </Route>

              </Routes>
              <Footer />

            </BrowserRouter>
          </ThemeProvider>
        </UserInfoProvider>
      </HomeContext.Provider>
    </AuthProvider>

  )
}

export default App

import React, { createContext, useState } from 'react';

//create the context 

const AuthContext = createContext();

const AuthProvider = ({ children }) => {

    const [isLoggedIN, setIsLoggedIn] = useState(
        !!localStorage.getItem("accessToken")
    )
    return (
        <AuthContext.Provider value={{ isLoggedIN, setIsLoggedIn }}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthProvider;
export { AuthContext };
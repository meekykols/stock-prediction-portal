import { createContext, useContext, useState } from 'react';

const UserInfoContext = createContext();

export const UserInfoProvider = ({ children }) => {
    const [UserInfo, setUserInfo] = useState({ email: "", id: "", username: "" });



    return (
        <UserInfoContext.Provider value={{ UserInfo, setUserInfo }}>
            {children}
        </UserInfoContext.Provider>
    )
}

export const useUserInfo = () => {
    const context = useContext(UserInfoContext);

    if (context === undefined) {
        throw new Error("useUserInfo must be used within a UserInfoContext");
    }

    return context;
};

export { UserInfoContext };
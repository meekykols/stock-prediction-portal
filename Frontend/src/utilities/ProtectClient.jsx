import React, { useContext, useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from './AuthProvider';
//import { jwtDecode } from "jwt-decode";
import api from '../../API/API';
import { UserInfoContext } from '../context/UserContext';


const ProtectClient = () => {
    const { isLoggedIN, setIsLoggedIn } = useContext(AuthContext)
    const { UserInfo, setUserInfo } = useContext(UserInfoContext)

    // const decodeToken = (token) => {
    //     if (token) {
    //         const userInfo = jwtDecode(token)
    //         return userInfo
    //     } else {
    //         return ''
    //     }
    // }


    useEffect(() => {

        const fetchProtectedData = async () => {
            try {
                const response = await api.get("protected-view/",)

                if (response.data) {
                    //console.log("called too many times", response.data.Userinfo)
                    setUserInfo(response.data.Userinfo)
                    setIsLoggedIn(true)

                }


            } catch (error) {
                setIsLoggedIn(false)
                console.error("error ooh", error)
            }


        }

        fetchProtectedData()

    }, [setIsLoggedIn])

    if (isLoggedIN) {
        return <Outlet />
    } else {
        return <Navigate to={`/login`} replace={true} />
    }
};

export default ProtectClient;
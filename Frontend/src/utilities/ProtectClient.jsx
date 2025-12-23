import React, { useContext, useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from './AuthProvider';
import { jwtDecode } from "jwt-decode";
import api from '../../API/API';


const ProtectClient = () => {
    const { isLoggedIN } = useContext(AuthContext)

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

                console.log("success money", response.data)

            } catch (error) {
                console.error("error ooh", error)
            }


        }

        fetchProtectedData()

    }, [])

    if (isLoggedIN) {
        return <Outlet />
    } else {
        return <Navigate to={`/login`} replace={true} />
    }
};

export default ProtectClient;
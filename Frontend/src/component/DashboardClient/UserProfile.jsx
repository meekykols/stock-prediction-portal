import React, { useContext } from 'react';
import { UserInfoContext } from '../../context/UserContext';

const UserProfile = () => {
    const { UserInfo } = useContext(UserInfoContext)
    return (
        <>
            <div>
                <h1>welcome {UserInfo.username}</h1>
                <h1>{UserInfo.email}</h1>
            </div>

        </>
    );
};

export default UserProfile;
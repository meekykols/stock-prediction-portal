import React from 'react';
import { useDarkMode } from '../context/ThemeContext';
import { MdSunny } from "react-icons/md";
import { FaMoon } from "react-icons/fa";

const Darkmodebutton = () => {
    const { darkmode, setDarkmode } = useDarkMode();

    return (
       <>  
           <button onClick={() => setDarkmode(!darkmode)} className={`${darkmode ? "bg-gray-500" : "bg-gray-300"} p-2 rounded-full z-99`}>
              {
                darkmode ? <MdSunny className='text-yellow-500'/> : <FaMoon className='text-gray-600'/>
              }
           </button>
       </>
    );
};

export default Darkmodebutton;
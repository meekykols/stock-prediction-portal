import React from 'react';
import Darkmodebutton from '../component/DarkmodeButton';
import { useHome } from '../context/HomeContext';
import Footer from '../component/Footer';
import Header from '../component/Header';
import { useDarkMode } from '../context/ThemeContext';




const Home = () => {
    const { siteval } = useHome();
    const { darkmode} = useDarkMode();

   
    return (
        <div data-theme={darkmode?"dracula":"cupcake"}>
            <Header webName={siteval?.web_name}/>

                <div >
                <div className="hero bg-base-200 min-h-screen">
                        <div className="hero-content text-center">
                            <div className="max-w-md">
                                <h1 className="text-5xl font-bold">Hello there</h1>
                                <p className="py-6">
                                    Provident cupiditate voluptatem et in. Quaerat fugiat ut assumenda excepturi exercitationem
                                    quasi. In deleniti eaque aut repudiandae et a id nisi.
                                </p>
                                <button className="btn btn-primary">Get Started</button>
                            </div>
                        </div>
                    </div>
                </div>
            <Footer webName={siteval?.web_name}/>
        </div>
    );
};

export default Home;
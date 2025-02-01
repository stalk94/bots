import React from 'react';
import { createRoot } from 'react-dom/client';
import ConsoleComponent from "./console";
import "./style.css";



function App() {
    

    React.useEffect(()=> {
        // [ BROWSER ]
        if(typeof process === 'undefined') {

        }
        // [ NW.JS ]
        else {
           
        }
    }, []);

  
    return(
        <React.Fragment>
            <section className='WorkArea'>

            </section>
            <ConsoleComponent />
        </React.Fragment>
    )
}



createRoot(document.querySelector(".root")).render(<App/>);
window.onload =()=> {
    window.onerror = function (message, source, lineno, colno, error) {
        console.error(`Error fatal: ${message} at ${source.replace("http://localhost:3001/", "")}(${lineno}:${colno})`);
        return true; // Возвращаем true, чтобы предотвратить стандартное поведение
    }
}
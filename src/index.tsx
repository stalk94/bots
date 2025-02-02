import React from 'react';
import { send } from "./func";
import { createRoot } from 'react-dom/client';
import ConsoleComponent from "./console";
import "./style.css";

type StateConfig = {
    OPENAI_KEY: string
    TELEGRAM_KEY: string
    tk_login: string | null
    tk_password: string | null
    textPrompt: string 
    textCooper: string
    flickCooper: boolean
}


function App() {
    const [config, setConfig] = React.useState<StateConfig>({});

    React.useEffect(()=> {
        send('getConfig', {}, 'GET')
            .then(setConfig)
            .catch(console.error);
    }, []);

  
    return(
        <React.Fragment>
            <section className='WorkArea'>

            </section>
            <ConsoleComponent />
        </React.Fragment>
    );
}



createRoot(document.querySelector(".root")).render(<App/>);
window.onload =()=> {
    window.onerror = function (message, source, lineno, colno, error) {
        source = source.replace("http://localhost:3001/", "");
        source = source.replace("http://localhost:3000/", "");

        console.error(`Error fatal: ${message} at ${source}(${lineno}:${colno})`);
        return true; // Возвращаем true, чтобы предотвратить стандартное поведение
    }
}
import React from 'react';
import { send } from "./func";
import "./style.css";

const oldLogErr = console.error;
const oldLog = console.log;


export default function() {
    const [consoleView, setConsoleView] = React.useState(true);
    const [hType, setHType] = React.useState<boolean[]>([]);
    const [logType, setLogType] = React.useState<boolean[]>([]);
    const [log, setLog] = React.useState<[]>([]);
    const [sys, setSys] = React.useState<string[]>([]);

    
    const replaceCircular =(obj, replacer = "[Circular]")=> {
        const seen = new WeakMap();
    
        function recurse(value) {
            if(typeof value === "object" && value !== null) {
                if(seen.has(value)) return replacer;

                seen.set(value, true);
    
                // Обрабатываем массивы и объекты
                if(Array.isArray(value)) return value.map(recurse);
                else {
                    return Object.fromEntries(
                        Object.entries(value).map(([key, val])=> [key, recurse(val)])
                    );
                }
            }
            if(typeof value === 'function') {
                return '[Function]';
            }

            return value;
        }
    
        return recurse(obj);
    }
    const showJSON =(arg, isErr?: boolean)=> {
        arg = replaceCircular(arg);
        if(Array.isArray(arg) && arg.length === 1){
            arg = arg[0];
        }
        else arg = arg;
        if(isErr) setLogType((old)=> [...old, true]);
        else setLogType((old)=> [...old, false]);
        setHType((old)=> [...old, false]);

        setLog((old)=> [...old, arg]);
    }
    

    React.useEffect(()=> {
        // [ BROWSER ]
        if(typeof process === 'undefined') setInterval(()=> {
             send('chek', {}, 'POST')
                .then((data)=> {
                    if(data.sys) {
                        const lines = data.sys?.split('\n');
                        const cleaned = lines.map(str => str.trim()).filter(str => str !== "");
                        setSys(cleaned);
                    }
                })
                .catch(console.error);
        }, 2000);
        // [ NW.JS ]
        else {
            console.log =(...args)=> {
                const repl = args.map(a => replaceCircular(a));
                oldLog.apply(console, repl);
                showJSON(repl);
            }
            console.error =(...args)=> {
                const repl = args.map(a => replaceCircular(a));
                oldLogErr.apply(console, repl);
                showJSON(repl, true);
            }

            setInterval(()=> {
                const lines = process.LOGS;
                const cleaned = lines.map(str => str.trim()).filter(str => str !== "");
                setSys(cleaned);
           }, 1000);
        }
    }, []);

  
    return(
        <React.Fragment>
            { typeof process !== 'undefined' &&
                <section className="Console" id={consoleView ? 'view' : 'noView' }>
                    <button className="btnTooglerView"
                        onClick={()=> setConsoleView(!consoleView)}
                    >
                        { consoleView ? '>>' : '<<' }
                    </button>
                    { log.map((msg, index)=> 
                        <div key={index} className='consoleMsg'>
                            <button className='btn' 
                                onClick={()=> setHType(old=> {
                                    old[index] = !old[index];
                                    return [...old];
                                })}
                            >
                                x
                            </button>
                            <pre 
                                className='preStyle' 
                                id={logType[index] ? 'error' : 'log'}
                                style={{whiteSpace: logType[index] && 'normal', maxHeight:hType[index] && '2rem'}}
                            >
                                { JSON.stringify(msg, null, 2) }
                            </pre>
                        </div>
                    )}
                </section>
            }
            <section className="ServerConsole">
                { sys.map((msg, index)=> 
                    <div key={index} className='MSG'>
                        { msg }
                    </div>
                )}
            </section>
        </React.Fragment>
    );
}

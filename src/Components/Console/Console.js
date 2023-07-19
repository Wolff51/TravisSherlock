//  Component that will simulate a console

import React, { useEffect } from "react";

const Console = (data) => {
    const [logs, setLogs] = React.useState(data.data);

    useEffect(() => {
        setLogs(data.data);
    }, [data.data]);

    useEffect(() => {
        const consoleComponent = document.getElementById('consoleComponent');
        if (consoleComponent) {
            consoleComponent.scrollTop = consoleComponent.scrollHeight;
        }
    }, [logs]);


    return (
        <div id='consoleComponent' className="shadow-xl shadow-black h-1/2 w-25 absolute right-0 bottom-0 bg-gray-100 p-1 overflow-y-auto">
            <div className="flex items-center h-5/6">
                <div className="h-full text-black text-sm">
                    {logs.map((value, index) => {
                        return (
                            <p className='text-justify whitespace-nowrap' key={index}>
                                {value.split(',').map((value, index) => {
                                    return (
                                        <p key={index}>
                                            {value}
                                        </p>
                                    )
                                })}
                            </p>
                        )
                    })
                    }
                </div>
            </div>
        </div>
    );
};

export default Console;

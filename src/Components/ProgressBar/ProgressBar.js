const { ipcRenderer } = window.require("electron");

function ProgressRadial({ percent, name }) {
    const directoryPath = localStorage.getItem('directoryPath');
    const circumference = 50 * 2 * Math.PI;
    const customColor = percent < 100 ? 'text-yellow' : 'text-orange';
    let isAvailable = percent < 100 ? true : false;
    const pathName = name.replace(/\d+\./, '');
    const fs = window.require('fs');
    const numberState = parseInt(name.match(/\d+/)[0]) - 1;
    const dataToCheck = fs.readFileSync(`${directoryPath}/.workflow_cache.json`, "utf8");
    const parseData = JSON.parse(dataToCheck)



    const checkArray = []
    for (const key1 in parseData) {
        for (const key2 in parseData[key1]) {
            for (const key3 in parseData[key1][key2]) {
                if (parseData[key1][key2][key3]["State"] === numberState) {
                    checkArray.push('true')
                } else {
                    checkArray.push('false')
                }
            }
        }
    }

    if (checkArray.includes('true')) {
        isAvailable = true
    } else {
        isAvailable = false
    }

    return (
        <div className="md:font-bold lg:font-medium w-1/12 h-1/2 flex flex-row items-center justify-center">
            <button
                disabled={!isAvailable}
                onClick={() => ipcRenderer.send(pathName)}
            >
                <div className={`md:scale-45 lg:scale-60 flex items-center flex-nowrap max-w-md px-10 bg-white shadow-xl rounded-2xl h-20 ${isAvailable ? 'lg:hover:scale-65 md:hover:scale-50' : 'opacity-60'}`}>
                    <div className="flex items-center justify-center -m-6 overflow-hidden bg-white rounded-full">
                        <svg className="w-32 h-32 transform translate-x-1 translate-y-1">
                            <circle
                                className="text-gray"
                                strokeWidth="10"
                                stroke="currentColor"
                                fill="transparent"
                                r="50"
                                cx="60"
                                cy="60"
                            />
                            <circle
                                className={customColor}
                                strokeWidth="10"
                                strokeDasharray={circumference}
                                strokeDashoffset={circumference - percent / 100 * circumference}
                                strokeLinecap="round"
                                stroke="currentColor"
                                fill="transparent"
                                r="50"
                                cx="60"
                                cy="60"
                            />
                        </svg>
                        <span className="absolute text-2xl text-black">{percent}%</span>
                    </div>
                    <p className="ml-10 lg:font-medium md:font-bold text-black sm:text-xl">{name}</p>
                </div>
            </button >
        </div >
    );
}

export default ProgressRadial;

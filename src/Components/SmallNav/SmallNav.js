import "./SmallNav.css";
const ipcRenderer = window.require("electron").ipcRenderer;

function SmallNav(props) {
    const { WTGstate, linkTo } = props;
    if (!linkTo) return (
        <div id="SmallNav" className="Nav relative hNav z-10 flex justify-end">
            <div className="flex items-center mr-3 NoDrag">
                <a onClick={() => {
                    ipcRenderer.send("resize", "reduce");
                }}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="NoDrag hover:cursor-pointer w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
                    </svg>
                </a>
            </div>
            <div className="flex items-center mr-3 NoDrag">
                <a onClick={() => {
                    localStorage.removeItem("firstLaunch")
                    ipcRenderer.send("close");
                }}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="NoDrag hover:cursor-pointer w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </a>

            </div>
        </div>
    );
    const path = linkTo.path;
    const handleOpenFolder = () => {
        ipcRenderer.send("open-folder", path);
    };
    return (
        <div id="SmallNav" className="Nav relative hNav z-10 flex justify-between">
            <div className="NoDrag flex font-bold items-center ml-3">{WTGstate}
                <span className="ml-2 mr-2">|</span>
                <a className="hover:cursor-pointer hover:underline text-blue NoDrag" onClick={handleOpenFolder}>Open Folder </a>
            </div>
            <div className="flex">
                <div className="flex items-center mr-3 NoDrag">
                    <a onClick={() => {
                        ipcRenderer.send("resize", "reduce");
                    }}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="NoDrag hover:cursor-pointer w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
                        </svg>
                    </a>
                </div>
                <div className="flex items-center mr-3 NoDrag">
                    <a onClick={() => {
                        localStorage.removeItem("selectedWTG")
                        localStorage.removeItem("selectSide")
                        ipcRenderer.send("close");
                    }}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="NoDrag hover:cursor-pointer w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </a>

                </div>
            </div>
        </div>
    );
}

export default SmallNav;
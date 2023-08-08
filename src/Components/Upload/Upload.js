import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

import CustomMessageAlert from "../AskUser/CustomMessageAlert";

import { useDispatch, useSelector } from 'react-redux'
import { setDirectoryPath } from "../../features/directoryPath/directoryPath";
import { setNasAccessFalse, setNasDirectoryPath } from "../../features/nasAccess/nasAccess";



import Loader from "../Loader/Loader";
import "./Upload.css";


// const sideStateCheckerClass = require('../../utils/SideStateChecker').default;
const MissionSheetReader = require("../../utils/MissionSheetReader").default;


const { ipcRenderer } = window.require("electron");
const fs = window.require("fs");;
const path = window.require('path');


function Upload() {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const team = useSelector((state) => state.role.team);
    const nas = useSelector((state) => state.nasAccess.value);
    const role = useSelector((state) => state.role.value);
    const nasPath = useSelector((state) => state.nasAccess.path);


    if (!ipcRenderer.listenerCount('scan-directory-done')) {
        ipcRenderer.on("scan-directory-done", async (event, arg) => {
            let resultArray = [];
            for (const dir of arg) {
                try {
                    const data = await fs.promises.readFile(`${dir}/mission_sheet.json`, 'utf8');
                    let parseData = JSON.parse(data);

                    const inspectionDate = formatDate(parseData.inspection_date);

                    let mission_type;
                    const getMissionType = parseData.mission_type;
                    if (getMissionType === 3) {
                        mission_type = "Sherlock +"
                    } else if (getMissionType === 4) {
                        mission_type = "Sherlock"
                    }

                    let Verified = false;

                    let progression = parseData.progression.step;
                    let step;
                    let color;


                    // GESTION ETAPE
                    if (parseData.process_type !== 'Nordex') {
                        if (progression === 0) {
                            step = "Sorting"
                            color = "gray"
                        } else if (progression === 1) {
                            step = "Processing"
                            color = "orange"
                        } else if (progression === 2) {
                            step = "Validating"
                            color = "CustomRed"
                        } else if (progression === 3) {
                            step = "Assembling"
                            color = "Custompink"
                        } else if (progression === 4) {
                            step = "Optimizing"
                            color = "Custompurplelight"
                        } else if (progression === 5) {
                            step = "Importing"
                            color = "Custompurple"
                        } else if (progression === 6) {
                            step = "Verifying"
                            color = "Customgreenligth"
                        } else if (progression >= 7 && progression < 9) {
                            if (new Date(parseData.inspection_date) > new Date(new Date().setMonth(new Date().getMonth() - 3))) {
                                step = "Done"
                                color = "green"
                            } else {
                                if (progression === 7) {
                                    step = "Cleanable"
                                    color = "Customyellow"
                                } else if (progression === 8) {
                                    step = "Archivable"
                                    color = "red"
                                }
                            }
                        } else if (progression === 9) {
                            step = "Archived"
                            color = "Custombrown"
                        }
                    } else {
                        if (progression === 0) {
                            step = "Sorting"
                            color = "gray"
                        } else if (progression === 1) {
                            step = "Processing"
                            color = "orange"
                        } else if (progression === 2) {
                            step = "Verifying"
                            color = "Customgreenligth"
                        } else if (progression === 3) {
                            step = "Done"
                            color = "green"
                        }
                    }
                    // GESTION PROGRESSION EN %
                    if (parseData.process_type !== 'Nordex') {
                        if (isNaN(progression)) {
                            progression = 'false';
                        } else if (progression <= 6) {
                            progression = Math.round((progression / 6) * 100);
                        } else if (progression >= 7) {
                            progression = 100;
                            Verified = true;
                        }
                    } else {
                        if (isNaN(progression)) {
                            progression = 'false';
                        } else if (progression === 0) {
                            progression = 0;
                        } else if (progression === 1) {
                            progression = 50;
                        } else if (progression = 2) {
                            progression = 100;
                        } else if (progression === 3) {
                            progression = 100;
                            Verified = true;
                        }


                    }

                    let processType = null;
                    if (parseData.process_type) {
                        processType = parseData.process_type;
                    }

                    let parc = {
                        "path": dir,
                        "step": step,
                        "color": color,
                        "processType": processType,
                        "name": parseData.wind_farm_name,
                        "progression": progression,
                        "Verified": Verified,
                        "inspection_date": inspectionDate,
                        "inspected_by": parseData.inspected_by,
                        "mission_type": mission_type,
                        "dateForSort": parseData.inspection_date,
                    }
                    resultArray.push(parc);
                } catch (err) {
                    console.error(`Failed to read file: ${dir}/mission_sheet.json`, err);
                }

            }
            setParcList(resultArray);
            if (loading === true) {
                setLoading(false);
            }
        });
    }

    if (!ipcRenderer.listenerCount('selected-directory')) {
        ipcRenderer.on("selected-directory", (event, path) => {
            if (path === null) return;
            if (path.length === 0) {
                cancelUpload();
                return;
            }
            setPendingDirectoryPathState(path[0]);
            if (fs.existsSync(path + "\\mission_sheet.json")) {
                const missionSheet = JSON.parse(
                    fs.readFileSync(path + "\\mission_sheet.json", "utf8")
                );
                setUploadState('confirmUpload')
                setSelectParcState(missionSheet["wind_farm_name"])
            } else {
                setUploadState('noMissionSheet');
            }
        }
        )
    }

    useEffect(() => {
        if (nas !== false && parcList.length === 0) {
            if (fs.existsSync(nasPath)) {
                setLoading(true);
                ipcRenderer.send("scan-directory", nasPath);
            } else {
                dispatch(setNasAccessFalse());
            }
        }
    }, [nas]);


    useEffect(() => {
        const handleUpdateUpload = () => {
            if (nas === true) {
                ipcRenderer.send("scan-directory", nasPath);
            }
        };

        if (!ipcRenderer.listenerCount('update-upload')) {
            ipcRenderer.on('update-upload', handleUpdateUpload);
        }

        return () => {
            ipcRenderer.removeListener('update-upload', handleUpdateUpload);
        };
    }, [nas, nasPath]);

    // if (!ipcRenderer.listenerCount("update-upload")) {
    //   ipcRenderer.on('update-upload', () => {
    //     console.log(nas)
    //     console.log(nasPath)
    //      if (nas === true) {
    //        ipcRenderer.send("scan-directory", nasPath);
    //      } else {
    //        let pathToNas;
    //        if (fs.existsSync("N:\\Sherlock")) {
    //          pathToNas = "N:\\Sherlock"
    //        } else if (fs.existsSync("N:\\ope_sav\\Sherlock")) {
    //         pathToNas = "N:\\ope_sav\\Sherlock"
    //        }
    //        // const pathToNas = "C:\\Users\\wolff\\Desktop\\Parc"
    //        setIsSorted(false);
    //        setLoading(true);
    //        ipcRenderer.send("scan-directory", pathToNas);
    //      }
    //   })
    // }


    const [parcList, setParcList] = useState([]);
    const [filteredParcList, setFilteredParcList] = useState([]);

    const [allowAccess, setAllowAccess] = useState(true);

    useEffect(() => {
        if (team === "supairvision") {
            if (nas === true) {
                ipcRenderer.send("scan-directory", nasPath);
            } else {
                if (fs.existsSync("N:\\Sherlock")) {
                    dispatch(setNasDirectoryPath("N:\\Sherlock"))
                } else if (fs.existsSync("N:\\ope_sav\\Sherlock")) {
                    dispatch(setNasDirectoryPath("N:\\ope_sav\\Sherlock"))
                }
                // dispatch(setNasDirectoryPath("C:\\Users\\wolff\\Desktop\\Parc"))
            }
        } else if (team === "external") {
            if (fs.existsSync("N:\\Sherlock")) {
                dispatch(setNasDirectoryPath("N:\\Sherlock"))
            } else if (fs.existsSync("N:\\ope_sav\\Sherlock")) {
                dispatch(setNasDirectoryPath("N:\\ope_sav\\Sherlock"))
            } else {
                setAllowAccess(false);
            }
        }
        else {
            const checkIfAlreadyDirectory = localStorage.getItem("directoryPath");
            if (!fs.existsSync(`${checkIfAlreadyDirectory}/mission_sheet.json`)) {
                localStorage.removeItem("directoryPath");
            }

            if (checkIfAlreadyDirectory) {
                ipcRenderer.send("resize");
                setPendingDirectoryPathState(checkIfAlreadyDirectory)
                setDirectoryPathState(checkIfAlreadyDirectory);
            }
        }

        return () => {
            ipcRenderer.removeAllListeners("mission-sheet-was-created");
            ipcRenderer.removeAllListeners("scan-directory-done");
            ipcRenderer.removeAllListeners("selected-directory");
        };
    }, []);


    //********************************************************************************************* */
    // WORKING HERE -> CREATE SIDESTATECHECKER.JSON For Dashboard optimisation
    //********************************************************************************************* */
    const [directoryPathState, setDirectoryPathState] = useState("No directory selected");
    const [pendingDirectoryPathState, setPendingDirectoryPathState] = useState(false);
    const [loading, setLoading] = useState(false);
    const [uploadState, setUploadState] = useState("Upload")
    const [selectParcState, setSelectParcState] = useState("None");
    const [typeOfProcess, setTypeOfProcess] = useState("Classic");
    // modal message
    const [modal, setModal] = useState(false);
    const [message, setMessage] = useState("");
    const [typeOfMessage, setTypeOfMessage] = useState("");
    const [parcPath, setParcPath] = useState("");
    // other modal 
    const [modalTypeOfProcess, setModalTypeOfProcess] = useState(false);
    const [isSorted, setIsSorted] = useState(false);



    useEffect(() => {
        if (parcList.length > 0) {
            const sortedParcList = parcList.sort((a, b) => new Date(b.dateForSort) - new Date(a.dateForSort));
            const filteredParcListNoDone = sortedParcList.filter(parc => parc.step !== "Done" && parc.step !== "Archived");
            setFilteredParcList(filteredParcListNoDone);
        }
    }, [parcList]);

    useEffect(() => {
        if (filteredParcList.length === 0) return;
        setIsSorted(true);
    }, [filteredParcList]);


    useEffect(() => {
        if (isSorted) {
            setLoading(false);
        } else {
            setLoading(true);
        }
    }, [isSorted]);

    useEffect(() => {
        if (directoryPathState === "No directory selected") return;
        if (fs.existsSync(`${pendingDirectoryPathState}/.workflow_cache.json`)) {
            setLoading(false);
            navigate("/dashboard");
            return;
        }
        const missionSheet = new MissionSheetReader(pendingDirectoryPathState);
        const WTG_number = missionSheet.getWindTurbines();

        let WTG_all_data = [];
        WTG_number.forEach(WTG => {
            const this_wtg_data = missionSheet.getWindTurbineComponentsNoWTG(WTG);
            this_wtg_data.sort((a, b) => {
                if (a.name === "Tower") return 1;
                if (b.name === "Tower") return -1;
                return a.name > b.name ? 1 : -1;
            });
            WTG_all_data.push(this_wtg_data);
        });

        let WTG_all_data_json = [];
        let thisError = ["none"];
        for (let i = 0; i < WTG_number.length; i++) {
            const WTG_data = {
                [WTG_number[i]]: {}
            };

            for (let j = 0; j < WTG_all_data[i].length; j++) {
                if (WTG_all_data[i][j].inspected === false) {
                    if (WTG_all_data[i][j].name === "Tower") {
                        WTG_data[WTG_number[i]][WTG_all_data[i][j].name] = {
                            N: { State: null },
                            ENE: { State: null },
                            ESE: { State: null },
                            S: { State: null },
                            WSW: { State: null },
                            WNW: { State: null },
                        }
                    } else {
                        WTG_data[WTG_number[i]][WTG_all_data[i][j].name] = {
                            LE: { State: null },
                            PS: { State: null },
                            SS: { State: null },
                            TE: { State: null }
                        };
                    }
                } else {
                    if (WTG_all_data[i][j].name === "Tower") {
                        WTG_data[WTG_number[i]][WTG_all_data[i][j].name] = {
                            N: { State: 0 },
                            ENE: { State: 0 },
                            ESE: { State: 0 },
                            S: { State: 0 },
                            WSW: { State: 0 },
                            WNW: { State: 0 },
                        }
                    } else {
                        WTG_data[WTG_number[i]][WTG_all_data[i][j].name] = {
                            LE: { State: 0 },
                            PS: { State: 0 },
                            SS: { State: 0 },
                            TE: { State: 0 }
                        };
                    }
                }
                WTG_all_data_json.push(WTG_data);
            }
        }

        WTG_all_data_json = Object.assign({}, ...WTG_all_data_json);


        fs.writeFileSync(
            `${pendingDirectoryPathState}/.workflow_cache.json`,
            JSON.stringify(WTG_all_data_json),
            (err) => {
                if (err) {
                    console.log(err);
                } else {
                    console.log("File written successfully");
                }
            }
        );

        navigate("/dashboard");
    }, [directoryPathState]);



    //********************************************************************************************* */
    // --------------------------------------------------------------------------------------------
    //********************************************************************************************* */
    const formatDate = (data) => {
        var d = (new Date(data) + '').split(' ');
        return [`${d[0]}, ${d[1]} ${d[2]} ${d[3]}`];
    }

    const [parcCleanPath, setParcCleanPath] = useState("");
    const handleAddFiles = () => {
        ipcRenderer.send("uploadDirectory");
    }

    const [archiveParcPath, setArchiveParcPath] = useState("");

    const handleAskArchiveParc = (pathToParc) => {
        setMessage("Are you sure this wind farm is already archived !");
        setTypeOfMessage('archive');
        setArchiveParcPath(pathToParc);
        setModal(true);
    }

    const handleAskCleanParc = (pathToParc) => {
        setMessage("Are you sure this wind farm can be cleaned !");
        setTypeOfMessage('clean');
        setParcCleanPath(pathToParc);
        setModal(true);
    }

    const [processingClean, setProcessingClean] = useState(false);
    const [cleanProgression, setCleanProgression] = useState(0);

    const handleCleanThisParc = async () => {
        let dirName;
        const BladeSide = ['LE', 'PS', 'SS', 'TE'];
        const TowerSide = ['N', 'ENE', 'ESE', 'S', 'WSW', 'WNW'];

        console.log(parcCleanPath)
        const missionSheet = new MissionSheetReader(parcCleanPath);
        const WTG_number = missionSheet.getWindTurbines();
        let allPathToSide = [];

        WTG_number.forEach((WTG) => {
            const WTG_data = missionSheet.getWindTurbineComponentsNoWTG(WTG);
            WTG_data.forEach((component) => {
                if (component.name !== 'Tower') {
                    BladeSide.forEach((side) => {
                        allPathToSide.push(`${parcCleanPath}/${WTG}/${component.name}/${side}`);
                    });
                } else {
                    TowerSide.forEach((side) => {
                        allPathToSide.push(`${parcCleanPath}/${WTG}/${component.name}/${side}`);
                    });
                }
            });
        });

        let numberToTreat = allPathToSide.length;
        let numberTreated = 0;



        for (const pathToSide of allPathToSide) {
            const foldersToKeep = ['assembly', 'export'];

            if (fs.existsSync(pathToSide)) {
                fs.readdirSync(pathToSide).forEach(function (basename, _) {
                    const curPath = path.join(pathToSide, basename);
                    dirName = path.parse(curPath).base;

                    if (fs.lstatSync(curPath).isDirectory() && !foldersToKeep.includes(dirName)) {
                        fs.rmSync(curPath, { recursive: true });
                    }
                });
            }

            setCleanProgression(Math.round((numberTreated / numberToTreat) * 100));
            console.log(cleanProgression);
            numberTreated++;
        }

        const readFile = (path) => {
            return new Promise((resolve, reject) => {
                fs.readFile(path, 'utf8', function (err, data) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(data);
                    }
                });
            });
        };

        const writeFile = (path, data) => {
            return new Promise((resolve, reject) => {
                fs.writeFile(path, data, function (err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });
        };

        try {
            const missionSheetData = await readFile(`${parcCleanPath}/mission_sheet.json`);
            const missionSheet = JSON.parse(missionSheetData);
            missionSheet.progression.step = 8;
            await writeFile(`${parcCleanPath}/mission_sheet.json`, JSON.stringify(missionSheet));
        } catch (err) {
            console.log(err);
        }
    };

    const handleCreateMissionSheet = () => {
        localStorage.setItem("directoryPath", pendingDirectoryPathState);
        ipcRenderer.send("create-mission-sheet");
    };

    const handleUpload = () => {
        if (typeOfProcess === 'Nordex') {
            setLoading(true);
            localStorage.setItem("directoryPathFastProcess", pendingDirectoryPathState);
            localStorage.setItem("missionSheetFastProcess", pendingDirectoryPathState + "\\mission_sheet.json");
            navigate("/fastprocess");
            setLoading(false);
            return;
        } else {
            setLoading(true);
            localStorage.setItem("directoryPath", pendingDirectoryPathState);
            localStorage.setItem("missionSheet", pendingDirectoryPathState + "\\mission_sheet.json");
            setDirectoryPathState('pendingDirectoryPathState');
        }
    };

    const cancelUpload = () => {
        setPendingDirectoryPathState(false);
        setUploadState('Upload');
    };

    const handleTypeOfProcess = (e) => {
        setTypeOfProcess(e.target.value);
    };


    // TABLE ORDERING FUNCTIONS
    const [isSortedByName, setIsSortedByName] = useState(false);

    const sortTableByName = () => {
        if (isSortedByName === false) {
            filteredParcList.sort((a, b) => {
                const nameA = a.name.toUpperCase();
                const nameB = b.name.toUpperCase();
                if (nameA < nameB) {
                    return -1;
                }
                if (nameA > nameB) {
                    return 1;
                }
                return 0;
            }
            );
            setFilteredParcList([...filteredParcList]);
            setIsSortedByName(true);
        } else {
            filteredParcList.sort((a, b) => {
                const nameA = a.name.toUpperCase();
                const nameB = b.name.toUpperCase();
                if (nameA < nameB) {
                    return 1;
                }
                if (nameA > nameB) {
                    return -1;
                }
                return 0;
            }
            );
            setFilteredParcList([...filteredParcList]);
            setIsSortedByName(false);
        }
    };

    const [isSortedByDate, setIsSortedByDate] = useState(false);

    const sortTableByDate = () => {
        if (isSortedByDate === false) {
            filteredParcList.sort((a, b) => {
                const dateA = a.dateForSort;
                const dateB = b.dateForSort;
                if (dateB < dateA) {
                    return -1;
                }
                if (dateB > dateA) {
                    return 1;
                }
                return 0;
            }
            );
            setFilteredParcList([...filteredParcList]);
            setIsSortedByDate(true);
        } else {
            filteredParcList.sort((a, b) => {
                const dateA = a.dateForSort;
                const dateB = b.dateForSort;
                if (dateB < dateA) {
                    return 1;
                }
                if (dateB > dateA) {
                    return -1;
                }
                return 0;
            }
            );
            setFilteredParcList([...filteredParcList]);
            setIsSortedByDate(false);
        }
    };

    const [isSortedByProgression, setIsSortedByProgression] = useState(false);

    const sortTableByProgression = () => {
        if (isSortedByProgression === false) {
            filteredParcList.sort((a, b) => {
                const progressionA = a.progression;
                const progressionB = b.progression;
                if (progressionB < progressionA) {
                    return -1;
                }
                if (progressionB > progressionA) {
                    return 1;
                }
                return 0;
            }
            );
            setFilteredParcList([...filteredParcList]);
            setIsSortedByProgression(true);
        } else {
            filteredParcList.sort((a, b) => {
                const progressionA = a.progression;
                const progressionB = b.progression;
                if (progressionB < progressionA) {
                    return 1;
                }
                if (progressionB > progressionA) {
                    return -1;
                }
                return 0;
            }
            );
            setFilteredParcList([...filteredParcList]);
            setIsSortedByProgression(false);
        }
    };

    const handleBothFilters = () => {
        const isArchivedChecked = document.getElementById('hideArchived').checked;
        const isDoneChecked = document.getElementById('hideDone').checked;
        const selectedMissionType = document.getElementById('filterMissionSelect').value;
        const selectedProcessType = document.getElementById('filterProcessType').value;
        const selectedStep = document.getElementById('filterStepSelect').value;

        const filterFunction = (parc) => {
            if (parc.step === 'Archived' && isArchivedChecked) return false;
            if (parc.step === 'Done' && isDoneChecked) return false;

            if (selectedMissionType !== 'all' && parc.mission_type !== selectedMissionType) return false;
            if (selectedProcessType !== 'all' && parc.processType !== selectedProcessType) return false;
            if (selectedStep !== 'all' && parc.step !== selectedStep) return false;

            return true;
        };

        const filteredParcList = parcList.filter(filterFunction);
        setFilteredParcList(filteredParcList);
    };

    const [processingArchive, setProcessingArchive] = useState(false);

    const handleConfirmModal = async () => {
        if (typeOfMessage === 'verify') {
            fs.readFile(parcPath + "\\mission_sheet.json", "utf8", (err, data) => {
                if (err) {
                    console.log(err);
                    return;
                }
                const missionSheetUpToDate = JSON.parse(data);
                if (missionSheetUpToDate.process_type !== 'Nordex') {
                    missionSheetUpToDate["progression"]["step"] = 7;
                } else {
                    missionSheetUpToDate["progression"]["step"] = 3;
                }
                fs.writeFile(parcPath + "\\mission_sheet.json", JSON.stringify(missionSheetUpToDate), (err) => {
                    if (err) {
                        console.log(err);
                        return;
                    }
                    ipcRenderer.send("scan-directory", nasPath);
                }
                );
            }
            );
            closeModal();

        }
        if (typeOfMessage === 'clean') {
            setProcessingClean(true);
            closeModal();
        }
        if (typeOfMessage === 'archive') {
            setProcessingArchive(true);
            closeModal();
        }
    }

    const handleArchiveThisParc = async (filename) => {
        const promise = new Promise((resolve, reject) => {
            fs.readdir(archiveParcPath, (err, files) => {
                if (err) {
                    console.error('Error reading directory:', err);
                    return;
                }

                files.forEach((file) => {
                    const filePath = path.join(archiveParcPath, file);

                    if (file !== filename) {
                        fs.stat(filePath, (err, stat) => {
                            if (err) {
                                console.error('Error retrieving file/folder stats:', err);
                                return;
                            }

                            if (stat.isFile()) {
                                fs.unlink(filePath, (err) => {
                                    if (err) {
                                        console.error('Error deleting file:', err);
                                    }
                                });
                            } else if (stat.isDirectory()) {
                                fs.rmdir(filePath, { recursive: true }, (err) => {
                                    if (err) {
                                        console.error('Error deleting directory:', err);
                                    }
                                });
                            }
                        });
                    }
                });

            });
            resolve();
        });

        await promise;

        fs.readFile(archiveParcPath + "\\mission_sheet.json", "utf8", (err, data) => {
            if (err) {
                console.log(err);
                return;
            }
            const missionSheetUpToDate = JSON.parse(data);
            missionSheetUpToDate["progression"]["step"] = 9;
            fs.writeFile(archiveParcPath + "\\mission_sheet.json", JSON.stringify(missionSheetUpToDate), (err) => {
                if (err) {
                    console.log(err);
                    return;
                }
                ipcRenderer.send("scan-directory", nasPath);
            }
            );
        });

    };

    useEffect(() => {
        if (processingClean === true) {
            setLoading(true);
            setTimeout(async () => {
                await handleCleanThisParc();
                setProcessingClean(false);
                setCleanProgression(0);
                setParcCleanPath('');
            }, 400);
        } else {
            ipcRenderer.send("upload-NAS");
            setLoading(false);
        }
    }, [processingClean]);

    useEffect(() => {
        if (processingArchive === true) {
            setLoading(true);
            setTimeout(async () => {
                await handleArchiveThisParc('mission_sheet.json');
                setProcessingArchive(false);
                setArchiveParcPath('');
            }, 400);
        } else {
            ipcRenderer.send("upload-NAS");
            setLoading(false);
        }
    }, [processingArchive]);


    const closeModal = () => {
        setParcPath('');
        setMessage('');
        setTypeOfMessage('');
        setModal(false);
        setModalTypeOfProcess(false);
    }

    const handleVerifyThisParc = (parc) => {
        setMessage("Are you sure this wind farm is completely verified!");
        setTypeOfMessage('verify');
        setParcPath(parc);
        setModal(true);
    }

    const handleDefineTypeOfProcessMissionSheet = (param) => {
        fs.readFile(parcPath + "\\mission_sheet.json", "utf8", (err, data) => {
            if (err) {
                console.log(err);
                return;
            }
            const parseData = JSON.parse(data);
            parseData["process_type"] = param;
            fs.writeFile(parcPath + "\\mission_sheet.json", JSON.stringify(parseData), (err) => {
                if (err) {
                    console.log(err);
                    return;
                }
            });
        })
        closeModal();
        handleGoToDashBoard(parcPath, param)
    }

    const handleGoToDashBoard = (path, type) => {
        if (type === null || type === undefined) {
            setParcPath(path);
            setMessage("Set the process type for this parc");
            setTypeOfMessage('typeOfProcess');
            setModalTypeOfProcess(true);
        } else if (type === 'Nordex') {
            setLoading(true);
            path = path.replace(/\\/g, "/");
            localStorage.setItem("directoryPathFastProcess", path);
            localStorage.setItem("missionSheetFastProcess", path + "\\mission_sheet.json");
            // state.type = action.payload.type , i want to set nordex type here
            dispatch(setDirectoryPath(type));
            navigate('/fastprocess')
            setTimeout(() => {
                setLoading(false);
            }, 1000);
            return;
        } else if (type === 'Classic') {
            setLoading(true);
            dispatch(setDirectoryPath(type));
            path = path.replace(/\\/g, "/");
            localStorage.setItem("directoryPath", path);
            localStorage.setItem("missionSheet", path + "\\mission_sheet.json");
            setPendingDirectoryPathState(path);
            setDirectoryPathState(path);
        }
    }



    if (allowAccess === false) {
        return (
            <div className="Upload hview flex flex-col justify-center">
                <h1 className="text-2xl text-center">You don't have access to this page.</h1>
                <p> Please contact a Supairvision administrator</p>
            </div>
        )
    }

    if (loading) {
        return (
            <div className="Upload hview">
                <Loader />
            </div>
        )
    }

    if (parcList.length > 0 && team === 'supairvision') {
        return (
            <div id="uploadClassic" className="Upload relative hview overflow-y-auto">
                {modal &&
                    <CustomMessageAlert message={message} onConfirm={handleConfirmModal} onCancel={closeModal} type={typeOfMessage} />
                }
                {modalTypeOfProcess &&
                    <CustomMessageAlert message={message} onConfirm={handleDefineTypeOfProcessMissionSheet} onCancel={closeModal} type={typeOfMessage} />
                }
                <div className="relative shadow-md">
                    <table id='parcTable' className="w-full text-sm text-center text-black">
                        <thead className="text-xs bg-white uppercase bg-gray-50 ">
                            <tr>
                                <th scope="col" className="px-6 py-3">
                                    <div onClick={sortTableByName} className="flex justify-center items-center hover:cursor-pointer">
                                        Name
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="md:hidden lg:inline pl-2 pt-1 w-5 h-5">
                                            <path fillRule="evenodd" d="M2.25 4.5A.75.75 0 013 3.75h14.25a.75.75 0 010 1.5H3a.75.75 0 01-.75-.75zm0 4.5A.75.75 0 013 8.25h9.75a.75.75 0 010 1.5H3A.75.75 0 012.25 9zm15-.75A.75.75 0 0118 9v10.19l2.47-2.47a.75.75 0 111.06 1.06l-3.75 3.75a.75.75 0 01-1.06 0l-3.75-3.75a.75.75 0 111.06-1.06l2.47 2.47V9a.75.75 0 01.75-.75zm-15 5.25a.75.75 0 01.75-.75h9.75a.75.75 0 010 1.5H3a.75.75 0 01-.75-.75z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                </th>
                                <th scope="col" className="px-6 py-3">
                                    <div className="flex">
                                        <p className="pb-2 scale-85 flex justify-center items-center">
                                            <label className="text-xs md:scale-75 lg:scale-100" htmlFor="hideArchived">Hide Archived</label>
                                            <input className="ml-1" type="checkbox" id="hideArchived" name="hideArchived" value="hideArchived" defaultChecked={true} onClick={handleBothFilters} />
                                        </p>
                                        <p className="pb-2 scale-85 flex justify-center items-center">
                                            <label className="text-xs md:scale-75 lg:scale-100" htmlFor="hideDone">Hide Done</label>
                                            <input className="ml-1" type="checkbox" id="hideDone" name="hideDone" value="hideDone" defaultChecked={true} onClick={handleBothFilters} />
                                        </p>
                                    </div>
                                    <span className="md:hidden lg:inline">Step</span>
                                    <select id="filterStepSelect" className="text-left" onChange={handleBothFilters}>
                                        <option className="text-center" default value="all">All</option>
                                        <option value="Sorting">Sorting</option>
                                        <option value="Processing">Processing</option>
                                        <option value="Validating">Validating</option>
                                        <option value="Assembling">Assembling</option>
                                        <option value="Optimizing">Optimizing</option>
                                        <option value="Importing">Importing</option>
                                        <option value="Verifying">Verifying</option>
                                        <option value="Done">Done</option>
                                        <option value="Cleanable">Cleanable</option>
                                        <option value="Archivable">Archivable</option>
                                        <option value="Archived">Archived</option>
                                    </select>
                                </th>
                                <th scope="col" className="px-6 py-3">
                                    <div onClick={sortTableByDate} className="flex justify-center items-center hover:cursor-pointer">
                                        <span className="md:hidden lg:inline">Inspection Date</span>
                                        <span className="md:inline lg:hidden">Inspection</span>
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="md:hidden lg:inline pl-2 pt-1 w-5 h-5">
                                            <path fillRule="evenodd" d="M2.25 4.5A.75.75 0 013 3.75h14.25a.75.75 0 010 1.5H3a.75.75 0 01-.75-.75zm0 4.5A.75.75 0 013 8.25h9.75a.75.75 0 010 1.5H3A.75.75 0 012.25 9zm15-.75A.75.75 0 0118 9v10.19l2.47-2.47a.75.75 0 111.06 1.06l-3.75 3.75a.75.75 0 01-1.06 0l-3.75-3.75a.75.75 0 111.06-1.06l2.47 2.47V9a.75.75 0 01.75-.75zm-15 5.25a.75.75 0 01.75-.75h9.75a.75.75 0 010 1.5H3a.75.75 0 01-.75-.75z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                </th>
                                <th scope="col" className="px-6 py-3">
                                    <span className="md:hidden lg:inline">Mission Type</span>
                                    <select id="filterMissionSelect" className="text-left" onChange={handleBothFilters}>
                                        <option className="text-center" default value="all">All</option>
                                        <option value="Sherlock">Sherlock</option>
                                        <option value="Sherlock +">Sherlock +</option>
                                    </select>
                                </th>
                                <th scope="col" className="px-6 py-3">
                                    <span className="md:hidden lg:inline">Process Type</span>
                                    <select id="filterProcessType" className="text-left" onChange={handleBothFilters}>
                                        <option className="text-center" default value="all">All</option>
                                        <option value="Classic">Classic</option>
                                        <option value="Nordex">Nordex</option>
                                    </select>
                                </th>
                                <th scope="col" className="px-6 py-3">
                                    <div onClick={sortTableByProgression} className="flex justify-center items-center hover:cursor-pointer">
                                        Status
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="md:hidden lg:inline pl-2 pt-1 w-5 h-5">
                                            <path fillRule="evenodd" d="M2.25 4.5A.75.75 0 013 3.75h14.25a.75.75 0 010 1.5H3a.75.75 0 01-.75-.75zm0 4.5A.75.75 0 013 8.25h9.75a.75.75 0 010 1.5H3A.75.75 0 012.25 9zm15-.75A.75.75 0 0118 9v10.19l2.47-2.47a.75.75 0 111.06 1.06l-3.75 3.75a.75.75 0 01-1.06 0l-3.75-3.75a.75.75 0 111.06-1.06l2.47 2.47V9a.75.75 0 01.75-.75zm-15 5.25a.75.75 0 01.75-.75h9.75a.75.75 0 010 1.5H3a.75.75 0 01-.75-.75z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                </th>
                                <th scope="col" className="px-6 py-3">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredParcList.map((parc, index) => {
                                return (
                                    // si index pair, bg-white, si index impair, bg-gray-100
                                    <tr key={index} className={index % 2 === 0 ? "w-full bg-gray-100" : "w-full bg-white"}>
                                        <td className="px-6 py-4 w-10">{parc.name}</td>
                                        <td className="px-6 py-4 w-15">
                                            <div className="flex justify-center items-center">
                                                <div className={`bg-${parc.color} rounded h-1/2 lg:w-1/2 md:w-full text-white text-center p-1`}>
                                                    {parc.step}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 w-15">
                                            {parc.inspection_date}
                                        </td>
                                        <td className="px-6 py-4 w-15">{parc.mission_type}</td>
                                        <td className="px-6 py-4 w-15">{parc.processType}</td>
                                        <td className="px-6 py-4 w-15">
                                            {parc.progression === 'false' || parc.progression < 100 &&
                                                <div className="bg-gray w-100">
                                                    <div className="bg-orange-100" style={{ height: '12px', width: parc.progression + "%" }} />
                                                </div>
                                            }
                                            {parc.progression >= 100 &&
                                                <div>
                                                    <div className="bg-gray w-100">
                                                        <div className="bg-green" style={{ height: '12px', width: '100 %' }} />
                                                    </div>
                                                </div>
                                            }
                                            {parc.progression === 'false' &&
                                                <p>Mission Sheet Error</p>
                                            }
                                        </td>
                                        <td className="px-6 py-4 w-15">
                                            <div className="pl-5 pr-5 flex flex-row justify-around">
                                                <button
                                                    disabled={parc.step === 'Archivable'}
                                                    title="Open Dashboard" onClick={() => handleGoToDashBoard(parc.path, parc.processType)}>
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="orange" className={`w-6 h-6 ${parc.step === 'Archivable' ? 'opacity-25 hover:cursor-not-allowed' : ''}`}>
                                                        <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm4.28 10.28a.75.75 0 000-1.06l-3-3a.75.75 0 10-1.06 1.06l1.72 1.72H8.25a.75.75 0 000 1.5h5.69l-1.72 1.72a.75.75 0 101.06 1.06l3-3z" clipRule="evenodd" />
                                                    </svg>
                                                </button>
                                                {parc.step === 'Verifying' &&
                                                    <button title="Verified" onClick={() => { handleVerifyThisParc(parc.path) }}>
                                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="green" className="w-6 h-6">
                                                            <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                                                        </svg>
                                                    </button>
                                                }
                                                {parc.step !== 'Verifying' &&
                                                    <button title="Verify">
                                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" disabled fill="green" className="opacity-25 hover:cursor-not-allowed w-6 h-6">
                                                            <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                                                        </svg>
                                                    </button>
                                                }
                                                {parc.step === 'Cleanable' &&
                                                    <button title="Clean" onClick={() =>
                                                        handleAskCleanParc(parc.path)
                                                    }>
                                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="blue" className="w-6 h-6">
                                                            <path fillRule="evenodd" d="M3.792 2.938A49.069 49.069 0 0112 2.25c2.797 0 5.54.236 8.209.688a1.857 1.857 0 011.541 1.836v1.044a3 3 0 01-.879 2.121l-6.182 6.182a1.5 1.5 0 00-.439 1.061v2.927a3 3 0 01-1.658 2.684l-1.757.878A.75.75 0 019.75 21v-5.818a1.5 1.5 0 00-.44-1.06L3.13 7.938a3 3 0 01-.879-2.121V4.774c0-.897.64-1.683 1.542-1.836z" clipRule="evenodd" />
                                                        </svg>
                                                    </button>
                                                }
                                                {parc.step !== 'Cleanable' &&
                                                    <button title="Clean">
                                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" disabled fill="blue" className="opacity-25 w-6 h-6 hover:cursor-not-allowed">
                                                            <path fillRule="evenodd" d="M3.792 2.938A49.069 49.069 0 0112 2.25c2.797 0 5.54.236 8.209.688a1.857 1.857 0 011.541 1.836v1.044a3 3 0 01-.879 2.121l-6.182 6.182a1.5 1.5 0 00-.439 1.061v2.927a3 3 0 01-1.658 2.684l-1.757.878A.75.75 0 019.75 21v-5.818a1.5 1.5 0 00-.44-1.06L3.13 7.938a3 3 0 01-.879-2.121V4.774c0-.897.64-1.683 1.542-1.836z" clipRule="evenodd" />
                                                        </svg>
                                                    </button>
                                                }
                                                {parc.step === 'Archivable' && role === 'admin' &&
                                                    <button title="Archive"
                                                        onClick={() => handleAskArchiveParc(parc.path)}
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="red" className="w-6 h-6">
                                                            <path d="M3.375 3C2.339 3 1.5 3.84 1.5 4.875v.75c0 1.036.84 1.875 1.875 1.875h17.25c1.035 0 1.875-.84 1.875-1.875v-.75C22.5 3.839 21.66 3 20.625 3H3.375z" />
                                                            <path fillRule="evenodd" d="M3.087 9l.54 9.176A3 3 0 006.62 21h10.757a3 3 0 002.995-2.824L20.913 9H3.087zm6.163 3.75A.75.75 0 0110 12h4a.75.75 0 010 1.5h-4a.75.75 0 01-.75-.75z" clipRule="evenodd" />
                                                        </svg>
                                                    </button>
                                                }

                                                {parc.step !== 'Archivable' || role !== 'admin' ? (
                                                    <button title="Archive">
                                                        <svg
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            viewBox="0 0 24 24"
                                                            disabled
                                                            fill="red"
                                                            className="opacity-25 w-6 h-6 hover:cursor-not-allowed"
                                                        >
                                                            <path d="M3.375 3C2.339 3 1.5 3.84 1.5 4.875v.75c0 1.036.84 1.875 1.875 1.875h17.25c1.035 0 1.875-.84 1.875-1.875v-.75C22.5 3.839 21.66 3 20.625 3H3.375z" />
                                                            <path
                                                                fillRule="evenodd"
                                                                d="M3.087 9l.54 9.176A3 3 0 006.62 21h10.757a3 3 0 002.995-2.824L20.913 9H3.087zm6.163 3.75A.75.75 0 0110 12h4a.75.75 0 010 1.5h-4a.75.75 0 01-.75-.75z"
                                                                clipRule="evenodd"
                                                            />
                                                        </svg>
                                                    </button>
                                                ) : null}
                                            </div>
                                            {/* Add button details, open new wd */}
                                        </td>
                                    </tr>
                                )
                            })
                            }
                        </tbody>
                    </table>
                </div>
            </div >
        )
    }

    if (parcList.length > 0 && team === 'external') {
        return (
            <div id="uploadClassic" className="Upload relative hview overflow-y-auto">
                {modal &&
                    <CustomMessageAlert message={message} onConfirm={handleConfirmModal} onCancel={closeModal} type={typeOfMessage} />
                }
                {modalTypeOfProcess &&
                    <CustomMessageAlert message={message} onConfirm={handleDefineTypeOfProcessMissionSheet} onCancel={closeModal} type={typeOfMessage} />
                }
                <div className="relative shadow-md">
                    <table id='parcTable' className="w-full text-sm text-center text-black">
                        <thead className="text-xs bg-white uppercase bg-gray-50 ">
                            <tr>
                                <th scope="col" className="px-6 py-3">
                                    <div onClick={sortTableByName} className="flex justify-center items-center hover:cursor-pointer">
                                        Name
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="md:hidden lg:inline pl-2 pt-1 w-5 h-5">
                                            <path fillRule="evenodd" d="M2.25 4.5A.75.75 0 013 3.75h14.25a.75.75 0 010 1.5H3a.75.75 0 01-.75-.75zm0 4.5A.75.75 0 013 8.25h9.75a.75.75 0 010 1.5H3A.75.75 0 012.25 9zm15-.75A.75.75 0 0118 9v10.19l2.47-2.47a.75.75 0 111.06 1.06l-3.75 3.75a.75.75 0 01-1.06 0l-3.75-3.75a.75.75 0 111.06-1.06l2.47 2.47V9a.75.75 0 01.75-.75zm-15 5.25a.75.75 0 01.75-.75h9.75a.75.75 0 010 1.5H3a.75.75 0 01-.75-.75z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                </th>
                                <th scope="col" className="px-6 py-3">
                                    <div className="flex">
                                        <p className="pb-2 scale-85 flex justify-center items-center">
                                            <label className="text-xs md:scale-75 lg:scale-100" htmlFor="hideArchived">Hide Archived</label>
                                            <input className="ml-1" type="checkbox" id="hideArchived" name="hideArchived" value="hideArchived" defaultChecked={true} onClick={handleBothFilters} />
                                        </p>
                                        <p className="pb-2 scale-85 flex justify-center items-center">
                                            <label className="text-xs md:scale-75 lg:scale-100" htmlFor="hideDone">Hide Done</label>
                                            <input className="ml-1" type="checkbox" id="hideDone" name="hideDone" value="hideDone" defaultChecked={true} onClick={handleBothFilters} />
                                        </p>
                                    </div>
                                    <span className="md:hidden lg:inline">Step</span>
                                    <select id="filterStepSelect" className="text-left" onChange={handleBothFilters}>
                                        <option className="text-center" default value="all">All</option>
                                        <option value="Sorting">Sorting</option>
                                        <option value="Processing">Processing</option>
                                        <option value="Validating">Validating</option>
                                        <option value="Assembling">Assembling</option>
                                        <option value="Optimizing">Optimizing</option>
                                        <option value="Importing">Importing</option>
                                        <option value="Verifying">Verifying</option>
                                        <option value="Done">Done</option>
                                        <option value="Cleanable">Cleanable</option>
                                        <option value="Archivable">Archivable</option>
                                        <option value="Archived">Archived</option>
                                    </select>
                                </th>
                                <th scope="col" className="px-6 py-3">
                                    <div onClick={sortTableByDate} className="flex justify-center items-center hover:cursor-pointer">
                                        <span className="md:hidden lg:inline">Inspection Date</span>
                                        <span className="md:inline lg:hidden">Inspection</span>
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="md:hidden lg:inline pl-2 pt-1 w-5 h-5">
                                            <path fillRule="evenodd" d="M2.25 4.5A.75.75 0 013 3.75h14.25a.75.75 0 010 1.5H3a.75.75 0 01-.75-.75zm0 4.5A.75.75 0 013 8.25h9.75a.75.75 0 010 1.5H3A.75.75 0 012.25 9zm15-.75A.75.75 0 0118 9v10.19l2.47-2.47a.75.75 0 111.06 1.06l-3.75 3.75a.75.75 0 01-1.06 0l-3.75-3.75a.75.75 0 111.06-1.06l2.47 2.47V9a.75.75 0 01.75-.75zm-15 5.25a.75.75 0 01.75-.75h9.75a.75.75 0 010 1.5H3a.75.75 0 01-.75-.75z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                </th>
                                <th scope="col" className="px-6 py-3">
                                    <span className="md:hidden lg:inline">Mission Type</span>
                                    <select id="filterMissionSelect" className="text-left" onChange={handleBothFilters}>
                                        <option className="text-center" default value="all">All</option>
                                        <option value="Sherlock">Sherlock</option>
                                        <option value="Sherlock +">Sherlock +</option>
                                    </select>
                                </th>
                                <th scope="col" className="px-6 py-3">
                                    {role === 'expertNordex' &&
                                        <select id="filterProcessType" className="text-left" onChange={handleBothFilters}>
                                            <option className="text-center" default value="Nordex">Nordex</option>
                                            <option disabled value="Classic">Classic</option>
                                        </select>
                                    }
                                    {role !== 'expertNordex' &&
                                        <select id="filterProcessType" className="text-left" onChange={handleBothFilters}>
                                            <option className="text-center" default value="all">All</option>
                                            <option value="Classic">Classic</option>
                                            <option value="Nordex">Nordex</option>
                                        </select>
                                    }
                                </th>
                                <th scope="col" className="px-6 py-3">
                                    <div onClick={sortTableByProgression} className="flex justify-center items-center hover:cursor-pointer">
                                        Status
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="md:hidden lg:inline pl-2 pt-1 w-5 h-5">
                                            <path fillRule="evenodd" d="M2.25 4.5A.75.75 0 013 3.75h14.25a.75.75 0 010 1.5H3a.75.75 0 01-.75-.75zm0 4.5A.75.75 0 013 8.25h9.75a.75.75 0 010 1.5H3A.75.75 0 012.25 9zm15-.75A.75.75 0 0118 9v10.19l2.47-2.47a.75.75 0 111.06 1.06l-3.75 3.75a.75.75 0 01-1.06 0l-3.75-3.75a.75.75 0 111.06-1.06l2.47 2.47V9a.75.75 0 01.75-.75zm-15 5.25a.75.75 0 01.75-.75h9.75a.75.75 0 010 1.5H3a.75.75 0 01-.75-.75z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                </th>
                                <th scope="col" className="px-6 py-3">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredParcList.map((parc, index) => {
                                if (role === 'expertNordex' && parc.process_type !== 'Nordex') {
                                    return null;
                                }
                                return (
                                    // si index pair, bg-white, si index impair, bg-gray-100
                                    <tr key={index} className={index % 2 === 0 ? "w-full bg-gray-100" : "w-full bg-white"}>
                                        <td className="px-6 py-4 w-10">{parc.name}</td>
                                        <td className="px-6 py-4 w-15">
                                            <div className="flex justify-center items-center">
                                                <div className={`bg-${parc.color} rounded h-1/2 lg:w-1/2 md:w-full text-white text-center p-1`}>
                                                    {parc.step}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 w-15">
                                            {parc.inspection_date}
                                        </td>
                                        <td className="px-6 py-4 w-15">{parc.mission_type}</td>
                                        <td className="px-6 py-4 w-15">{parc.processType}</td>
                                        <td className="px-6 py-4 w-15">
                                            {parc.progression === 'false' || parc.progression < 100 &&
                                                <div className="bg-gray w-100">
                                                    <div className="bg-orange-100" style={{ height: '12px', width: parc.progression + "%" }} />
                                                </div>
                                            }
                                            {parc.progression >= 100 &&
                                                <div>
                                                    <div className="bg-gray w-100">
                                                        <div className="bg-green" style={{ height: '12px', width: '100 %' }} />
                                                    </div>
                                                </div>
                                            }
                                            {parc.progression === 'false' &&
                                                <p>Mission Sheet Error</p>
                                            }
                                        </td>
                                        <td className="px-6 py-4 w-15">
                                            <div className="pl-5 pr-5 flex flex-row justify-around">

                                                <button title="Open Dashboard" disabled={parc.step === 'Archivable'} onClick={() => handleGoToDashBoard(parc.path, parc.processType)}>
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="orange" className={`w-6 h-6 ${parc.step === 'Archivable' ? 'opacity-25 hover:cursor-not-allowed' : ''}`}>
                                                        <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm4.28 10.28a.75.75 0 000-1.06l-3-3a.75.75 0 10-1.06 1.06l1.72 1.72H8.25a.75.75 0 000 1.5h5.69l-1.72 1.72a.75.75 0 101.06 1.06l3-3z" clipRule="evenodd" />
                                                    </svg>
                                                </button>
                                                {parc.step === 'Verifying' &&
                                                    <button title="Verified" onClick={() => { handleVerifyThisParc(parc.path) }}>
                                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="green" className="w-6 h-6">
                                                            <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                                                        </svg>
                                                    </button>
                                                }
                                                {parc.step !== 'Verifying' &&
                                                    <button title="Verify">
                                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" disabled fill="green" className="opacity-25 hover:cursor-not-allowed w-6 h-6">
                                                            <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                                                        </svg>
                                                    </button>
                                                }
                                                {parc.step === 'Cleanable' &&
                                                    <button title="Clean" onClick={() => handleCleanSide(parc.path)}>
                                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="blue" className="w-6 h-6">
                                                            <path fillRule="evenodd" d="M3.792 2.938A49.069 49.069 0 0112 2.25c2.797 0 5.54.236 8.209.688a1.857 1.857 0 011.541 1.836v1.044a3 3 0 01-.879 2.121l-6.182 6.182a1.5 1.5 0 00-.439 1.061v2.927a3 3 0 01-1.658 2.684l-1.757.878A.75.75 0 019.75 21v-5.818a1.5 1.5 0 00-.44-1.06L3.13 7.938a3 3 0 01-.879-2.121V4.774c0-.897.64-1.683 1.542-1.836z" clipRule="evenodd" />
                                                        </svg>
                                                    </button>
                                                }
                                                {parc.step !== 'Cleanable' &&
                                                    <button disabled title="Clean">
                                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" disabled fill="blue" className="opacity-25 w-6 h-6 hover:cursor-not-allowed">
                                                            <path fillRule="evenodd" d="M3.792 2.938A49.069 49.069 0 0112 2.25c2.797 0 5.54.236 8.209.688a1.857 1.857 0 011.541 1.836v1.044a3 3 0 01-.879 2.121l-6.182 6.182a1.5 1.5 0 00-.439 1.061v2.927a3 3 0 01-1.658 2.684l-1.757.878A.75.75 0 019.75 21v-5.818a1.5 1.5 0 00-.44-1.06L3.13 7.938a3 3 0 01-.879-2.121V4.774c0-.897.64-1.683 1.542-1.836z" clipRule="evenodd" />
                                                        </svg>
                                                    </button>
                                                }
                                                {parc.step === 'Archivable' && role === 'admin' &&
                                                    <button title="Archive"
                                                        onClick={() => handleAskArchiveParc(parc.path)}
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="red" className="w-6 h-6">
                                                            <path d="M3.375 3C2.339 3 1.5 3.84 1.5 4.875v.75c0 1.036.84 1.875 1.875 1.875h17.25c1.035 0 1.875-.84 1.875-1.875v-.75C22.5 3.839 21.66 3 20.625 3H3.375z" />
                                                            <path fillRule="evenodd" d="M3.087 9l.54 9.176A3 3 0 006.62 21h10.757a3 3 0 002.995-2.824L20.913 9H3.087zm6.163 3.75A.75.75 0 0110 12h4a.75.75 0 010 1.5h-4a.75.75 0 01-.75-.75z" clipRule="evenodd" />
                                                        </svg>
                                                    </button>
                                                }
                                                {parc.step !== 'Archivable' || role !== 'admin' ? (
                                                    <button title="Archive">
                                                        <svg
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            viewBox="0 0 24 24"
                                                            disabled
                                                            fill="red"
                                                            className="opacity-25 w-6 h-6 hover:cursor-not-allowed"
                                                        >
                                                            <path d="M3.375 3C2.339 3 1.5 3.84 1.5 4.875v.75c0 1.036.84 1.875 1.875 1.875h17.25c1.035 0 1.875-.84 1.875-1.875v-.75C22.5 3.839 21.66 3 20.625 3H3.375z" />
                                                            <path
                                                                fillRule="evenodd"
                                                                d="M3.087 9l.54 9.176A3 3 0 006.62 21h10.757a3 3 0 002.995-2.824L20.913 9H3.087zm6.163 3.75A.75.75 0 0110 12h4a.75.75 0 010 1.5h-4a.75.75 0 01-.75-.75z"
                                                                clipRule="evenodd"
                                                            />
                                                        </svg>
                                                    </button>
                                                ) : null}
                                            </div>
                                            {/* Add button details, open new wd */}
                                        </td>
                                    </tr>
                                )
                            })
                            }
                        </tbody>
                    </table>
                </div>
            </div >
        )
    }

    if (uploadState === "Upload" && nas === false) {
        return (
            <div id="uploadClassic" className="Upload hview">
                <div className="relative flex flex-col justify-center h-full">
                    <div className="md:w-1/2 lg:w-5/12 p-6 m-auto bg-white rounded-md shadow-md sm:max-w-x">
                        {/* selectDirectoryBox */}
                        <div id="selectDirectoryBox" className="mt-6">
                            <h2
                                id="uploadText"
                                className="text-xl mb-10 font-semibold text-center"
                            >
                                Select a Wind Farm
                            </h2>
                            <button
                                id="upload-directory"
                                className="text-lg font-bold w-full px-4 py-2 tracking-wide text-white transition-colors duration-200 transform bg-orange rounded-md focus:outline-none"
                                onClick={handleAddFiles}
                            >
                                Choose Directory
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    if (uploadState === "confirmUpload") {
        return (
            <div className="Upload hview">
                <div className="relative flex flex-col justify-center h-full">
                    <div className="md:w-1/2 lg:w-5/12 p-6 m-auto bg-white rounded-md shadow-md sm:max-w-x">
                        {/* selectButtonConfirmCancel */}
                        <div id="selectButtonConfirmCancel" className="mt-6">
                            <h2
                                id="uploadText"
                                className="text-xl mb-10 font-semibold text-center"
                            >
                                You choose to work on   :  {selectParcState}
                            </h2>
                            <button
                                className="isfourtyeight mr-2 text-lg font-bold px-4 py-2 tracking-wide text-white transition-colors duration-200 transform bg-orange rounded-md focus:outline-none"
                                onClick={cancelUpload}
                            >
                                Cancel
                            </button>
                            <button
                                className="isfourtyeight ml-2 text-lg font-bold px-4 py-2 tracking-wide text-white transition-colors duration-200 transform bg-orange rounded-md focus:outline-none"
                                onClick={handleUpload}
                            >
                                Confirm
                            </button>
                        </div>
                        {/* Select type of Treatment : nordex, other */}
                        <div className="mt-5 flex justify-center items-center">
                            Process Type
                            <select
                                id="mission_type"
                                name="mission_type"
                                className="ml-5 w-1/2 pl-1 border-orange border-2 border-solid text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                                defaultValue="Select mission type"
                                onChange={handleTypeOfProcess}
                                required
                            >
                                <option>Classic</option>
                                <option>Nordex</option>
                            </select>
                        </div>
                    </div>

                </div>

            </div>
        )
    }

    if (uploadState === "noMissionSheet") {
        return (
            <div className="Upload hview">
                <div className="relative flex flex-col justify-center h-full">
                    <div className="md:w-1/2 lg:w-5/12 p-6 m-auto bg-white rounded-md shadow-md sm:max-w-x">
                        {/* selectButtonChangeCreate */}
                        <div id="selectButtonChangeCreate" className="mt-6">
                            <h2
                                id="uploadText"
                                className="text-xl mb-10 font-semibold text-center"
                            >
                                No missionSheet found in this directory
                            </h2>
                            <button
                                className="isfourtyeight mr-2 text-lg font-bold px-4 py-2 tracking-wide text-white transition-colors duration-200 transform bg-orange rounded-md focus:outline-none"
                                onClick={handleAddFiles}
                            >
                                Change directory
                            </button>
                            <button
                                className="isfourtyeight ml-2 text-lg font-bold px-4 py-2 tracking-wide text-white transition-colors duration-200 transform bg-orange rounded-md focus:outline-none"
                                onClick={() => handleCreateMissionSheet}
                            >
                                Create mission sheet
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )
    }
}

export default Upload;

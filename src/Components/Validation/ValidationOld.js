import React, { useEffect, useState } from 'react';
import Loader from '../Loader/Loader';
import ValidationProgressBar from '../ValidationProgress/ValidationProgress';
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import SmallNav from '../SmallNav/SmallNav';
import { useSelector } from 'react-redux'
const MissionSheetReader = require("../../utils/MissionSheetReader").default;
const fs = window.require('fs');
const jwt = window.require('jsonwebtoken');
const isDev = window.require('electron-is-dev');
const { ipcRenderer } = window.require("electron");

function Validation() {
    const role = useSelector((state) => state.role.value);
    if (!ipcRenderer.listenerCount("upload-image-done")) {
        ipcRenderer.on('upload-image-done', (event, arg) => {
            console.log("upload-image-done")
            if (isDev) {
                setTimeout(() => {
                    handleReadValidationLogs();
                    setLoading(false)
                    setLoadingNextSide(false)
                }, 5500);
            } else {
                setTimeout(() => {
                    setSelectImg(arg);
                    setLoadingNextSide(false);
                }, 1000);
            }
        });
    }

    if (isDev) {
        if (!ipcRenderer.listenerCount("clean-upload-folder-done")) {
            ipcRenderer.on('clean-upload-folder-done', (event, arg) => {
                console.log("clean-upload-folder-done")
            });
        }
    }

    const directoryPath = localStorage.getItem('directoryPath');
    const missionSheet = new MissionSheetReader(directoryPath);
    const WTG_number = missionSheet.getWindTurbines();

    const [loading, setLoading] = useState(true);
    const [noMoreImage, setNoMoreImage] = useState(false);
    const [loadingNextSide, setLoadingNextSide] = useState(false);
    const [isFirstImage, setIsFirstImage] = useState(true);
    const [imagePath, setImagePath] = useState("");
    const [ValidationProgress, setValidationProgress] = useState(0);
    const [selectWTG, setSelectWTG] = React.useState(["No WTG selected yet"]);
    const [selectImg, setSelectImg] = React.useState("No Image selected yet");
    const [selectdata, setSelectdata] = React.useState("Nothing selected yet");
    const [selectWTGState, setSelectWTGState] = React.useState("Nothing selected yet");
    const [advancement, setAdvancement] = React.useState(0);
    const [selectImgChoice, setSelectImgChoice] = React.useState(null);
    const [pathToOpen, setPathToOpen] = React.useState();
    const [activeUser, setActiveUser] = React.useState();
    const [userId, setUserId] = React.useState();
    const [validationOver, setValidationOver] = React.useState(false);

    useEffect(() => {
        const isValidationJson = fs.existsSync(directoryPath + '/.validation_cache.json');
        if (!isValidationJson) {
            const createJson = handleCreateValidationJson();
            setTimeout(() => {
                setSelectdata(createJson)
                handleGetCurrentValidationSide(createJson);
            }, 2000);
        } else {
            fs.readFile(directoryPath + '/.validation_cache.json', 'utf8', (err, data) => {
                if (err) {
                    console.error(err)
                    return
                }
                const parseData = JSON.parse(data)

                const dataWorkflow = fs.readFileSync(`${directoryPath}/.workflow_cache.json`, "utf8");
                const parseDataWorkflow = JSON.parse(dataWorkflow)

                for (const key1 in parseData) {
                    for (const key2 in parseData[key1]) {
                        for (const key3 in parseData[key1][key2]) {
                            for (const key4 in parseData[key1][key2][key3]) {
                                if (parseDataWorkflow[key1][key2][key3]["State"] > 2) {
                                    parseData[key1][key2][key3][key4] = true;
                                } else if (parseDataWorkflow[key1][key2][key3]["State"] < 2) {
                                    parseData[key1][key2][key3][key4] = "NAVS";
                                } else {
                                    parseData[key1][key2][key3][key4] = false;
                                }
                            }
                        }
                    }
                }

                fs.writeFileSync(directoryPath + '/.validation_cache.json', JSON.stringify(parseData), 'utf8', (err) => {
                    if (err) {
                        console.error(err)
                        return
                    }
                })


                setSelectdata(parseData)
                handleGetCurrentValidationSide(parseData);
            })
        }

        handleGetUser();
        return () => {
            ipcRenderer.send("clean-upload-folder");
            ipcRenderer.removeAllListeners('upload-image-done');
            ipcRenderer.removeAllListeners('clean-upload-folder-done');
        };
    }, []);

    useEffect(() => {
        if (selectdata !== "Nothing selected yet") {
            if (ValidationProgress === 100 || noMoreImage) {
                changePendingToTrue();
                localStorage.setItem('TreatThisWTG', localStorage.getItem('selectedWTG'));
                localStorage.setItem('selectedWTG', null);
                handleChangeWTG();
            }
            else {
                handleGetCurrentValidationSide(selectdata);
            }
        }
    }, [selectdata]);

    useEffect(() => {
        if (selectdata !== "Nothing selected yet" && selectWTGState !== "Nothing selected yet") {
            handleCreateValidationLogs();
            if (isDev) {
                uploadImage();
                setSelectImgChoice(null);
            } else {
                readImage();
                setSelectImgChoice(null);
            }
        }
    }, [selectWTGState]);

    useEffect(() => {
        if (selectWTG[0] !== "No WTG selected yet") {
            handleCheckIfAlreadyValidated();
            handleUploadPathFolder();
        }
        if (advancement === 0) {
            setIsFirstImage(true);
        } else {
            setIsFirstImage(false);
        }
        if (!isDev) {
            let validationType;
            if (selectWTGState === "Match") {
                validationType = "matches/good_matches";
            } else if (selectWTGState === "Geotag") {
                validationType = "geotags";
            } else if (selectWTGState === "Line") {
                validationType = "lines";
            }
            const pathToImage = `${directoryPath}/${selectWTG[0]}/${selectWTG[1]}/${selectWTG[2]}/${validationType}/${selectImg[advancement]}`;
            setImagePath(pathToImage);
        }
    }, [advancement]);

    useEffect(() => {
        if (loading === false && loadingNextSide === false && !validationOver) {
            document.getElementById("clickMe").focus();
        }
    }, [loading, loadingNextSide]);

    useEffect(() => {
        if (ValidationProgress === 100 || noMoreImage) {
            handleEndValidation();
        }
    }, [noMoreImage]);



    if (isDev) {
        useEffect(() => {
            if (selectImg !== "No Image selected yet" && selectImg.length === 0) {
                console.log("Toutes les validations sont faites pour ce coté, chargement du coté suivant")

                if (selectWTG[3] === "Line" && selectWTG[2] === "TE" || selectWTG[3] === "Geotag" && selectWTG[2] === "PS" || selectWTG[3] === "Geotag" && selectWTG[2] === "SS" || selectWTG[3] === "Geotag" && selectWTG[2] === "LE") {
                    handleUpdateWorkflowJson();
                    handleUpdateSideStateChecker();
                    handlePercentValidation();
                }
                setLoadingNextSide(true);
                changePendingToTrue();
            } else {
                handleUploadPathFolder();
            }
        }, [selectImg]);
    }

    if (!isDev) {
        useEffect(() => {
            if (selectImg !== "No Image selected yet" && selectImg.length === 0) {
                console.log("Toutes les validations sont faites pour ce coté, chargement du coté suivant")
                if (selectWTG[3] === "Line" && selectWTG[2] === "TE" || selectWTG[3] === "Geotag" && selectWTG[2] === "PS" || selectWTG[3] === "Geotag" && selectWTG[2] === "SS" || selectWTG[3] === "Geotag" && selectWTG[2] === "LE") {
                    handleUpdateWorkflowJson();
                    handleUpdateSideStateChecker();
                    handlePercentValidation();
                }
                setLoadingNextSide(true);
                changePendingToTrue();
            } else {
                handleUploadPathFolder();
                let validationType;
                if (selectWTGState === "Match") {
                    validationType = "matches/good_matches";
                } else if (selectWTGState === "Geotag") {
                    validationType = "geotags";
                } else if (selectWTGState === "Line") {
                    validationType = "lines";
                }
                const pathToImage = `${directoryPath}/${selectWTG[0]}/${selectWTG[1]}/${selectWTG[2]}/${validationType}/${selectImg[advancement]}`;
                setImagePath(pathToImage);
            }
        }, [selectImg]);
    }

    const handlePercentValidation = () => {
        const sideStateCheckerJsonPath = `${directoryPath}/.workflow_cache.json`;
        fs.readFile(sideStateCheckerJsonPath, "utf8", (err, data) => {
            if (err) {
                console.log("Error reading file from disk:", err);
                return;
            }
            try {
                const sideStateCheckerJson = JSON.parse(data);

                if (sideStateCheckerJson.error) {
                    setPathError(sideStateCheckerJson.error);
                    setLoading(false);
                    return;
                }
                let numberOfComponent = 0;
                let Advancement = 0;
                for (const key1 in sideStateCheckerJson) {
                    for (const key2 in sideStateCheckerJson[key1]) {
                        for (const key3 in sideStateCheckerJson[key1][key2]) {
                            for (const key4 in sideStateCheckerJson[key1][key2][key3]) {
                                if (sideStateCheckerJson[key1][key2][key3][key4] > 2) {
                                    numberOfComponent += 1;
                                    Advancement += 1;
                                } else if (sideStateCheckerJson[key1][key2][key3][key4] === null) {
                                    // do nothing - does not count
                                } else {
                                    numberOfComponent += 1;
                                }
                            }
                        }
                    }
                }

                const percent = (Advancement / numberOfComponent) * 100;
                setValidationProgress(percent);
            } catch (err) {
                console.log("Error parsing JSON string:", err);
            }
        });
    };

    const handleCreateValidationJson = () => {
        let WTG_all_data = [];
        WTG_number.forEach(WTG => {
            const this_wtg_data = missionSheet.getWindTurbineInspectedComponents(WTG);

            this_wtg_data.sort((a, b) => {
                if (a.name === "Tower") return 1;
                if (b.name === "Tower") return -1;
                return a.name > b.name ? 1 : -1;
            });
            WTG_all_data.push(this_wtg_data);
        });


        let WTG_all_data_json = [];

        for (let i = 0; i < WTG_number.length; i++) {
            const WTG_data = {
                [WTG_number[i]]: {}
            };

            for (let j = 0; j < WTG_all_data[i].length; j++) {
                if (WTG_all_data[i][j].name) {
                    if (WTG_all_data[i][j].name === "Tower") {
                        WTG_data[WTG_number[i]][WTG_all_data[i][j].name] = {
                            N: { Match: false, Geotag: false },
                            ENE: { Match: false, Geotag: false },
                            ESE: { Match: false, Geotag: false },
                            S: { Match: false, Geotag: false },
                            WSW: { Match: false, Geotag: false },
                            WNW: { Match: false, Geotag: false }
                        };
                    } else {
                        WTG_data[WTG_number[i]][WTG_all_data[i][j].name] = {
                            LE: { Match: false, Geotag: false },
                            PS: { Match: false, Geotag: false },
                            SS: { Match: false, Geotag: false },
                            TE: { Match: false, Geotag: false, Line: false }
                        };
                    }
                }
            }

            WTG_all_data_json.push(WTG_data);
        }




        WTG_all_data_json = Object.assign({}, ...WTG_all_data_json);

        const data = fs.readFileSync(`${directoryPath}/.workflow_cache.json`, "utf8");
        const parsedData = JSON.parse(data);

        for (const key1 in WTG_all_data_json) {
            for (const key2 in WTG_all_data_json[key1]) {
                for (const key3 in WTG_all_data_json[key1][key2]) {
                    for (const key4 in WTG_all_data_json[key1][key2][key3]) {
                        if (parsedData[key1][key2][key3]["State"] > 2) {
                            WTG_all_data_json[key1][key2][key3][key4] = true;
                        } else if (parsedData[key1][key2][key3]["State"] < 2) {
                            WTG_all_data_json[key1][key2][key3][key4] = "NAVS";
                        } else {
                            WTG_all_data_json[key1][key2][key3][key4] = false;
                        }
                    }
                }
            }
        }

        fs.writeFileSync(
            `${directoryPath}/.validation_cache.json`,
            JSON.stringify(WTG_all_data_json),
            (err) => {
                if (err) {
                    console.log(err);
                } else {
                    console.log("File written successfully");
                }
            }
        );

        return WTG_all_data_json;
    }

    //********************************************************************************************* */
    // functions to check the .validation_cache.json file and find the first false or pending value and modify it
    //********************************************************************************************* */
    function findFirstFalseOrPendingValue(data) {
        for (const key1 in data) {
            for (const key2 in data[key1]) {
                for (const key3 in data[key1][key2]) {
                    for (const key4 in data[key1][key2][key3]) {
                        if (data[key1][key2][key3][key4] === false || data[key1][key2][key3][key4] === "doing") {
                            if (selectdata !== "Nothing selected yet") {
                                data[key1][key2][key3][key4] = "doing";
                                if (localStorage.getItem("selectedWTG") !== key1 && localStorage.getItem("selectedWTG") !== null) {
                                    localStorage.setItem("TreatThisWTG", localStorage.getItem("selectedWTG"));
                                    handleChangeWTG()
                                    // localStorage.setItem("selectSide", key3);
                                    ipcRenderer.send("update-dashboard");
                                }
                                localStorage.setItem(
                                    "selectedWTG", key1);
                            }
                            return `${key1}.${key2}.${key3}.${key4}`;
                        }
                    }
                }
            }
        }
        return undefined;
    }

    const handleGetCurrentValidationSide = (data) => {
        const result = findFirstFalseOrPendingValue(data);
        if (result !== undefined) {
            const resultArray = result.split(".");
            setSelectWTG(resultArray);
            setSelectWTGState(resultArray[3]);
            if (selectdata !== "Nothing selected yet") {
                handleUpdateValidationJson();
            }
        } else {
            setNoMoreImage(true);
        }
    };

    // Puis je réécris le ficher .validation_cache.json complètement avec les nouvelles valeurs (selectdata)
    const handleUpdateValidationJson = () => {
        fs.writeFileSync(
            `${directoryPath}/.validation_cache.json`,
            JSON.stringify(selectdata),
            (err) => {
                if (err) {
                    console.log(err);
                } else {
                    console.log("File written successfully");
                }
            }
        );
    };

    //********************************************************************************************* */
    // functions to handle the image upload or load and treat txt file(s)
    //********************************************************************************************* */

    // en prod
    const readImage = () => {
        let validationType;
        if (selectWTGState === "Match") {
            validationType = "matches/good_matches";
        } else if (selectWTGState === "Geotag") {
            validationType = "geotags";
        } else if (selectWTGState === "Line") {
            validationType = "lines";
        }
        // const allImagesListPath = `${directoryPath}/${selectWTG[0]}/${selectWTG[1]}/${selectWTG[2]}/matches/good_matches`;
        // // read all files in directory , path is allImagesListPath. Then create an array with all the files except .npy extension
        // const allImagesList = fs
        //     .readdirSync(allImagesListPath)
        //     .filter((file) => file.endsWith(".jpg"))
        // setSelectImg(allImagesList);

        const pathToUpload = `${directoryPath}/${selectWTG[0]}/${selectWTG[1]}/${selectWTG[2]}/${validationType}`;
        const pathToJson = `${directoryPath}/${selectWTG[0]}/${selectWTG[1]}/${selectWTG[2]}/export/validation_logs.json`;
        const data_electron = [pathToUpload, pathToJson, selectWTGState];
        ipcRenderer.send("upload-image", data_electron);
        setTimeout(() => {
            setLoading(false);
            setLoadingNextSide(false);
        }, 1000);
    };


    // en dev
    const uploadImage = () => {
        let validationType;
        console.log(selectWTGState);
        if (selectWTGState === "Match") {
            validationType = "matches/good_matches";
        } else if (selectWTGState === "Geotag") {
            validationType = "geotags";
        } else if (selectWTGState === "Line") {
            validationType = "lines";
        }

        console.log(validationType);
        const pathToUpload = `${directoryPath}/${selectWTG[0]}/${selectWTG[1]}/${selectWTG[2]}/${validationType}`;
        const pathToJson = `${directoryPath}/${selectWTG[0]}/${selectWTG[1]}/${selectWTG[2]}/export/validation_logs.json`;
        const data_electron = [pathToUpload, pathToJson, selectWTGState];

        fs.readdir('public/uploads-files', (err, files) => {
            if (err) {
                return console.log('Unable to scan directory: ' + err);
            }
            //listing all files using forEach
            files.forEach((file) => {
                fs.unlink(`public/uploads-files/${file}`, (err) => {
                    if (err) throw err;
                });
            });
        });
        setTimeout(() => {
            ipcRenderer.send("upload-image", data_electron);
        }, 1000);
    }

    const handleCreateValidationLogs = () => {
        const isValidationLogsExist = fs.existsSync(`${directoryPath}/${selectWTG[0]}/${selectWTG[1]}/${selectWTG[2]}/export/validation_logs.json`);
        if (isValidationLogsExist) {
            return;
        } else {
            const readDirectory = fs.readdirSync(`${directoryPath}/${selectWTG[0]}/${selectWTG[1]}/${selectWTG[2]}/matches/good_matches`);
            // localStorage.setItem("selectSide", selectWTG[2]);
            ipcRenderer.send("update-dashboard");
            const readDirectoryFiltered = readDirectory.filter((file) => {
                return file.includes(".txt") || file.includes(".jpg");
            });
            const validation_logs = readDirectoryFiltered.map((element) => {
                if (element.includes(".txt")) {
                    element = element.replace(".txt", ".jpg")
                    return {
                        [element]: "MF",
                    };
                } else {
                    return {
                        [element]: null
                    };
                }
            });

            const pathToWriteFile = `${directoryPath}/${selectWTG[0]}/${selectWTG[1]}/${selectWTG[2]}/export`
            fs.writeFileSync(
                `${pathToWriteFile}/validation_logs.json`,
                JSON.stringify(validation_logs),
                (err) => {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log("File written successfully");
                    }
                }
            );
        }
    }

    const handleReadValidationLogs = () => {
        fs.readdir('public/uploads-files', (err, files) => {
            const filesArray = [];
            files.forEach((file) => {
                filesArray.push(file);
            });
            setSelectImg(filesArray);
        });
        fs.readdir('public/uploads-files', (err, files) => {
            files.forEach((file) => {
                if (file.includes(".txt")) {
                    fs.unlink(`public/uploads-files/${file}`, (err) => {
                        if (err) {
                            console.log(err);
                        } else {
                            console.log("File deleted successfully");
                        }
                    });
                }
            });
        });
    };

    const changePendingToTrue = () => {
        const pathToValidationJson = `${directoryPath}/.validation_cache.json`;
        fs.readFile(pathToValidationJson, 'utf8', (err, data) => {
            if (err) {
                console.error(err)
                return
            }
            const parseData = JSON.parse(data)
            for (const key1 in parseData) {
                for (const key2 in parseData[key1]) {
                    for (const key3 in parseData[key1][key2]) {
                        for (const key4 in parseData[key1][key2][key3]) {
                            if (parseData[key1][key2][key3][key4] === "doing") {
                                parseData[key1][key2][key3][key4] = true;
                            }
                        }
                    }
                }
            }

            fs.writeFileSync(
                pathToValidationJson,
                JSON.stringify(parseData),
                (err) => {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log("File written successfully");
                    }
                }
            );

            setSelectdata(parseData)
        })
    };

    const handleChangeBlade = () => {
        if (selectWTG[3] === "Line" && selectWTG[2] === "TE" || selectWTG[3] === "Geotag" && selectWTG[2] === "PS" || selectWTG[3] === "Geotag" && selectWTG[2] === "SS" || selectWTG[3] === "Geotag" && selectWTG[2] === "LE") {
            handleUpdateSideStateChecker();
            handleUpdateWorkflowJson();
            handlePercentValidation();
        }
    };

    const handleEndValidation = () => {
        localStorage.removeItem("TreatThisWTG");
        ipcRenderer.send("update-dashboard");
        setValidationOver(true);
    }

    useEffect(() => {
        if (!validationOver) return;
        setLoading(false);
        setLoadingNextSide(false)
    }, [validationOver]);

    const handleChangeWTG = () => {
        if (localStorage.getItem("TreatThisWTG") === 'null' || !localStorage.getItem("TreatThisWTG") || localStorage.getItem("TreatThisWTG") === null) {
            return;
        } else {
            const missionSheetInfo = fs.readFileSync(`${directoryPath}/mission_sheet.json`, 'utf8');
            const missionSheetInfoParse = JSON.parse(missionSheetInfo);
            const windFarm = missionSheetInfoParse['wind_farm_name']

            const parseData = selectdata;

            const selectWTGForDB = localStorage.getItem("TreatThisWTG");
            let allTrue = true;
            for (const key1 in parseData) {
                for (const key2 in parseData[key1]) {
                    for (const key3 in parseData[key1][key2]) {
                        for (const key4 in parseData[key1][key2][key3]) {
                            if (key1 === selectWTGForDB) {
                                if (parseData[key1][key2][key3][key4] === false || parseData[key1][key2][key3][key4] === "doing") {
                                    allTrue = false;
                                }
                            }
                        }
                    }
                }
            }
            if (allTrue === true) {
                fs.readFile(`${directoryPath}/${selectWTG[0]}/${selectWTG[1]}/${selectWTG[2]}/side_state.json`, 'utf8', (err, data) => {
                    if (err) {
                        console.error(err)
                        return
                    }
                    const checkData = JSON.parse(data)
                    if (checkData['states']["validate"]['historic'] !== undefined && checkData['states']["validate"]['historic'].length > 0) {
                        localStorage.removeItem("TreatThisWTG");
                    } else {
                        if (role === "serviceProvider") {
                            ipcRenderer.send("create-delivery", userId, windFarm, selectWTGForDB, 0);
                            localStorage.removeItem("TreatThisWTG");
                        } else {
                            ipcRenderer.send("create-delivery", userId, windFarm, selectWTGForDB, 1);
                            localStorage.removeItem("TreatThisWTG");
                        }

                    }
                })
            } else {
                localStorage.removeItem("TreatThisWTG");
            }

            if (ValidationProgress === 100 || noMoreImage) {
                handleEndValidation();
            }

        }
    };

    //********************************************************************************************* */
    // SIDE STATE CHECKER FUNCTION
    //********************************************************************************************* */



    //********************************************************************************************* */
    // HANDLE USER CHOICE - Tracking Advancement
    //********************************************************************************************* */

    const handlePressYes = () => {
        const validation_logs = `${directoryPath}/${selectWTG[0]}/${selectWTG[1]}/${selectWTG[2]}/export/validation_logs.json`;
        const actualImage = selectImg[advancement]
        const actualImageWithoutExtension = actualImage.split(".")[0];
        const data = JSON.parse(fs.readFileSync(validation_logs));
        const index = data.findIndex((element) => {
            const elementNoExtension = Object.keys(element)[0].split(".")[0];
            return elementNoExtension === actualImageWithoutExtension;
        });


        if (selectWTGState === "Match") {
            data[index][actualImage] = "M";
        } else if (selectWTGState === "Geotag") {
            data[index][actualImage] = "MFG";
        } else if (selectWTGState === "Line") {
            data[index][actualImage] = "MFGFL";
        } else {
            console.log("Error in handlePressYes function");
        }
        fs.writeFileSync(
            validation_logs,
            JSON.stringify(data),
            (err) => {
                if (err) {
                    console.log(err);
                } else {
                    console.log("File written successfully");
                }
            }
        );


        if (advancement < selectImg.length - 1) {
            setAdvancement(advancement + 1);
        }
        if (advancement === selectImg.length - 1) {
            setLoadingNextSide(true);
            handleChangeBlade();
            setAdvancement(0);
            changePendingToTrue();
        }
    };

    const handlePressNo = () => {
        const validation_logs = `${directoryPath}/${selectWTG[0]}/${selectWTG[1]}/${selectWTG[2]}/export/validation_logs.json`;
        const actualImage = selectImg[advancement]
        const actualImageWithoutExtension = actualImage.split(".")[0];
        const data = JSON.parse(fs.readFileSync(validation_logs));
        const index = data.findIndex((element) => {
            const elementNoExtension = Object.keys(element)[0].split(".")[0];
            return elementNoExtension === actualImageWithoutExtension;
        });

        if (selectWTGState === "Match") {
            data[index][actualImage] = "MF";
        } else if (selectWTGState === "Geotag") {
            data[index][actualImage] = "MFGF";
        } else if (selectWTGState === "Line") {
            data[index][actualImage] = "MFGFLF";
        } else {
            console.log("Error in handlePressNo function");
        }
        fs.writeFileSync(
            validation_logs,
            JSON.stringify(data),
            (err) => {
                if (err) {
                    console.log(err);
                } else {
                    console.log("File written successfully");
                }
            }
        );
        if (advancement < selectImg.length - 1) {
            setAdvancement(advancement + 1);
        }
        if (advancement === selectImg.length - 1) {
            setLoadingNextSide(true);
            handleChangeBlade();
            setAdvancement(0);
            changePendingToTrue();

        }
    };

    const handleGoNext = () => {
        if (advancement < selectImg.length - 1) {
            setAdvancement(advancement + 1);
        }
        if (advancement === selectImg.length - 1) {
            setLoadingNextSide(true);
            handleChangeBlade();
            setAdvancement(0);
            changePendingToTrue();
        }
    };

    const handleCheckIfAlreadyValidated = () => {
        const validation_logs = `${directoryPath}/${selectWTG[0]}/${selectWTG[1]}/${selectWTG[2]}/export/validation_logs.json`;
        const actualImage = selectImg[advancement]
        const data = JSON.parse(fs.readFileSync(validation_logs));
        let findOne = false;
        data.findIndex((element) => {
            Object.entries(element).forEach(([key, value]) => {
                if (selectWTGState === "Match") {
                    if (key === actualImage && value !== null) {
                        findOne = true;
                        setSelectImgChoice(value);
                    }
                } else if (selectWTGState === "Geotag") {
                    if (key === actualImage && value !== "MF") {
                        findOne = true;
                        setSelectImgChoice(value);
                    }
                } else if (selectWTGState === "Line") {
                    if (key === actualImage && value !== "MFGF") {
                        findOne = true;
                        setSelectImgChoice(value);
                    }
                } else {
                    console.log("Error in handleCheckIfAlreadyValidated function");
                }
            });
        });
        if (!findOne) {
            setSelectImgChoice(null);
        }
    }

    const handleReturn = () => {
        if (advancement > 0) {
            setAdvancement(advancement - 1);
        } else {
            console.log("You are at the beginning of the mission");
        }
    };


    const handleKeyDown = event => {
        switch (event.key) {
            case "&":
                handlePressYes();
                break;
            case "1":
                handlePressYes();
                break;
            case "à":
                handlePressNo();
                break;
            case "0":
                handlePressNo();
                break;
            case "Backspace":
                handleReturn();
                break;
            case "z":
                handleReturn();
                break;
            case "Z":
                handleReturn();
                break;
            default:
                break;
        }
    };


    const handleUpdateWorkflowJson = () => {
        const workflowJson = `${directoryPath}/.workflow_cache.json`;
        const data = JSON.parse(fs.readFileSync(workflowJson));

        data[selectWTG[0]][selectWTG[1]][selectWTG[2]]["State"] = 3;
        fs.writeFileSync(
            workflowJson,
            JSON.stringify(data),
            (err) => {
                if (err) {
                    console.log(err);
                } else {
                    console.log("File written successfully");
                }
            }
        );
        console.log(".workflow_cache.json updated");
    };

    const handleUploadPathFolder = () => {
        if (selectImg[advancement] !== undefined) {
            const imageNoExtension = selectImg[advancement].split(".")[0];
            const path = `${directoryPath}/${selectWTG[0]}/${selectWTG[1]}/${selectWTG[2]}/matches/${imageNoExtension}`;
            const stringifiedPath = JSON.stringify(path);
            setPathToOpen(stringifiedPath);
        }
    };


    if (!ipcRenderer.listenerCount("find-user_id")) {
        ipcRenderer.on("find-user_id", (event, arg) => {
            setActiveUser(arg.email);
        });
    }

    const handleGetUser = () => {
        jwt.verify(localStorage.getItem("token"), "bjavbzmvkabvjpekzabnvjlmzevnjpzkabvnùapzkdbvmzav", (err, decoded) => {
            if (err) {
                console.log(err);
            } else {
                setUserId(decoded.user);
                ipcRenderer.send("find-user-by_id", decoded.user);
            }
        });
    };




    //********************************************************************************************* */
    // HTML RENDER
    //********************************************************************************************* */
    if (loading || loadingNextSide) {
        return (
            <div className="validation flex flex-col items-center justify-center hview text-orange w-full">
                {loading && <Loader />}
                {loadingNextSide && <Loader />}
            </div>
        )
    } else if (validationOver) {
        return (
            <div>
                <SmallNav />
                <div className="validation flex flex-col items-center justify-center hview text-black w-full">
                    <div className="flex flex-col items-center justify-center h-1/2 w-1/2">
                        <div className="text-3xl font-extrabold">Validation over !</div>
                        <p className="italic w-full">Perfect! You have completed the validation of this wind farm or reached the same level as the process. You can now continue the process or move on to the next assembly step.</p>
                        <button className="mr-2 text-lg font-bold px-4 py-2 tracking-wide text-white transition-colors duration-200 transform bg-orange rounded-md focus:outline-none" onClick={() => ipcRenderer.send('close')}>Close</button>
                    </div>
                </div>
            </div>
        )
    }
    else {
        return (
            <div id='clickMe' tabIndex="0" onKeyDown={handleKeyDown} className="validation">
                {selectWTGState !== "Nothing selected yet" &&
                    <SmallNav WTGstate={selectWTGState} linkTo={{ path: pathToOpen }} />
                }
                {/* separator 1px orange */}
                <div className="Noselect flex flex-col items-center justify-around text-orange hview">
                    {/* Header */}

                    <div className='text-2xl flex flex-row items-end justify-around w-80 h-10 mt-10 NoSelect'>
                        <span className='font-extrabold'>{selectWTG[0]}</span>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />
                        </svg>
                        <span className='font-extrabold'>{selectWTG[1]}</span>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />
                        </svg>
                        <span className='font-extrabold'>{selectWTG[2]}</span>
                    </div>
                    {/* Main Content - Images , etc */}
                    <div className="flex flex-row justify-between items-center w-full h-70">
                        <div className='w-10 flex justify-center hover:cursor-pointer'>
                            {isFirstImage && <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="hover:cursor-not-allowed w-auto h-10 opacity-25">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                                <title className="text-red-500">You are at the beginning of the mission</title>
                            </svg>}
                            {!isFirstImage &&
                                <svg xmlns="http://www.w3.org/2000/svg" onClick={handleReturn} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="hover:cursor-pointer w-auto h-10">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                                </svg>
                            }
                        </div>
                        <div id="actualImageValidate" className='w-80 flex justify-center'>

                            {isDev &&
                                <TransformWrapper>
                                    <TransformComponent>
                                        <img className="w-full" src={`./uploads-files/${selectImg[advancement]}`} alt="image" />
                                    </TransformComponent>
                                </TransformWrapper>
                            }
                            {!isDev &&
                                <TransformWrapper>
                                    <TransformComponent>
                                        <img className="w-full" src={imagePath} alt="image" />
                                    </TransformComponent>
                                </TransformWrapper>
                            }

                        </div>
                        <div className='w-10 flex justify-center items-start'>
                            {selectImgChoice === null &&
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="hover:cursor-not-allowed w-auto h-10 opacity-25">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                                </svg>
                            }
                            {selectImgChoice !== null &&
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} onClick={handleGoNext} stroke="currentColor" className="hover:cursor-pointer w-auto h-10">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                                </svg>
                            }
                        </div>
                    </div>
                    {/* Buttons */}
                    {selectImgChoice === null &&
                        <div className="flex flex-row justify-around items-start w-85 mb-5 h-20">
                            {/* Cross Button */}
                            <button className="bg-orange hover:bg-red text-white font-bold py-2 px-4 w-20 rounded flex justify-center" onClick={handlePressNo}>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                            {/* Check Button */}
                            <button className="bg-orange hover:bg-green text-white font-bold py-2 px-4 w-20 rounded flex justify-center" onClick={handlePressYes}>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                </svg>
                            </button>
                        </div>
                    }
                    {selectImgChoice !== null && selectImgChoice[selectImgChoice.length - 1] === "F" &&
                        <div className="flex flex-row justify-around items-start w-85 mb-5 h-20">
                            {/* Cross Button */}
                            <button className="bg-red hover:bg-red text-white font-bold py-2 px-4 w-20 rounded flex justify-center" onClick={handlePressNo}>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                            {/* Check Button */}
                            <button className="bg-orange hover:bg-green text-white font-bold py-2 px-4 w-20 rounded flex justify-center" onClick={handlePressYes}>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                </svg>
                            </button>
                        </div>
                    }
                    {selectImgChoice !== null && selectImgChoice[selectImgChoice.length - 1] !== "F" &&
                        <div className="flex flex-row justify-around items-start w-85 mb-5 h-20">
                            {/* Cross Button */}
                            <button className="bg-orange hover:bg-red text-white font-bold py-2 px-4 w-20 rounded flex justify-center" onClick={handlePressNo}>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                            {/* Check Button */}
                            <button className="bg-green text-white font-bold py-2 px-4 w-20 rounded flex justify-center" onClick={handlePressYes}>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                </svg>
                            </button>
                        </div>
                    }
                    <div>
                    </div>
                    {/* <div>
                        <button className="bg-orange hover:bg-orange text-white font-bold py-2 px-4 rounded w-full flex justify-center mb-5" onClick={handleOpenFolder}>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="mr-2 w-6 h-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
                            </svg>
                            <p className='NoSelect'>
                                {selectImg[advancement].split('.').slice(0, -1).join('.')}
                            </p>
                        </button>
                    </div> */}
                    {/* End Buttons */}

                    <ValidationProgressBar percent={ValidationProgress} />

                </div>
            </div>
        )
    }
}


export default Validation;
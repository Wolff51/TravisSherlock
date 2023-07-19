import React, { useEffect, useState } from 'react';
import Loader from '../Loader/Loader';
import ValidationProgressBar from '../ValidationProgress/ValidationProgress';
import SmallNav from '../SmallNav/SmallNav';
import { useSelector } from 'react-redux'
const MissionSheetReader = require("../../utils/MissionSheetReader").default;
const fs = window.require('fs');
const util = window.require('util');
const readFileAsync = util.promisify(fs.readFile);
const writeFileAsync = util.promisify(fs.writeFile);
const jwt = window.require('jsonwebtoken');
const isDev = window.require('electron-is-dev');
const { ipcRenderer } = window.require("electron");

function Validation() {
    //********************************************************************************************* */
    // BASIC VARIABLES
    //********************************************************************************************* */
    const role = useSelector((state) => state.role.value);
    const [userId, setUserId] = useState(null);
    const [activeUser, setActiveUser] = useState();
    const [directoryPath, setDirectoryPath] = useState(localStorage.getItem('directoryPath'));
    const missionSheet = new MissionSheetReader(directoryPath);
    const WTG_number = missionSheet.getWindTurbines();
    const [imagePath, setImagePath] = useState(null);




    //********************************************************************************************* */
    // STATES
    //********************************************************************************************* */

    const [loading, setLoading] = useState(true);
    const [loadingNextSide, setLoadingNextSide] = useState(false);
    const [validationOver, setValidationOver] = useState(false);
    // WT, Component & Side
    const [treatingBlade, setTreatingBlade] = useState({
        WT: null,
        Component: null,
        Blade: null,
        State: null
    });
    // Type de validation
    const [selectWTGState, setSelectWTGState] = useState(null);
    // Liste des images pour la validation
    const [selectImg, setSelectImg] = useState([]);
    // Image selectionnée
    const [selectImgChoice, setSelectImgChoice] = useState(null);

    //********************************************************************************************* */
    // IMPLEMENTATION DB & LISTENER
    //********************************************************************************************* */
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

    if (!ipcRenderer.listenerCount("find-user_id")) {
        ipcRenderer.on("find-user_id", (event, arg) => {
            setActiveUser(arg.email);
        });
    }

    const uploadImageDoneListener = (event, arg) => {
        try {
            if (isDev) {
                console.log("Images to treat were listed, now we can now upload them : ");
                setTimeout(() => {
                    handleReadUploadDirectory();
                }, 1500);
            } else {
                if (arg.length === 0) {
                    console.log("No images listed, this side is already treated");
                    handleNoImages();
                } else {
                    console.log("Images to treat were listed, now we can now upload them : ");
                    setSelectImg(arg);
                }
            }
        } catch (error) {
            console.error("Error occurred during 'upload-image-done' event handling:", error);
        }
    };

    if (!ipcRenderer.listenerCount("upload-image-done")) {
        ipcRenderer.on('upload-image-done', uploadImageDoneListener);
    }

    if (isDev) {
        if (!ipcRenderer.listenerCount("clean-upload-folder-done")) {
            ipcRenderer.on('clean-upload-folder-done', (event, arg) => {
                console.log("clean-upload-folder-done")
            });
        }
    }


    //********************************************************************************************* */
    // USE EFFECT PAR ORDRE D'APPEL
    //********************************************************************************************* */
    /* OLD NO ASYNC
    useEffect(() => {
        const isValidationJson = fs.existsSync(directoryPath + '/.validation_cache.json');
        if (!isValidationJson) {
            console.log("Creating .validation_cache.json...")
            handleCreateValidationJson();
            setTimeout(() => {
                findFirstFalseOrPendingValue();
            }, 2000);
        } else {
            console.log("Reading .validation_cache.json...")
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
                                    if (parseData[key1][key2][key3][key4] !== true && parseData[key1][key2][key3][key4] !== "doing") {
                                        parseData[key1][key2][key3][key4] = false;
                                    }
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

            })
            findFirstFalseOrPendingValue();
        }

        handleGetUser();

        return () => {
            ipcRenderer.send("clean-upload-folder");
            ipcRenderer.removeAllListeners('upload-image-done');
            if (isDev) {
                ipcRenderer.removeAllListeners('clean-upload-folder-done');
            }
        };
    }, []);
    */
    useEffect(() => {
        const fetchData = async () => {
            try {
                const isValidationJson = fs.existsSync(directoryPath + '/.validation_cache.json');
                if (!isValidationJson) {
                    console.log("Creating .validation_cache.json...");
                    handleCreateValidationJson();
                    await new Promise((resolve) => setTimeout(resolve, 2000));
                } else {
                    console.log("Reading .validation_cache.json...");
                    const data = await fs.promises.readFile(directoryPath + '/.validation_cache.json', 'utf8');
                    const parseData = JSON.parse(data);

                    const dataWorkflow = await fs.promises.readFile(`${directoryPath}/.workflow_cache.json`, 'utf8');
                    let parseDataWorkflow = JSON.parse(dataWorkflow);


                    for (const key1 in parseData) {
                        for (const key2 in parseData[key1]) {
                            for (const key3 in parseData[key1][key2]) {
                                for (const key4 in parseData[key1][key2][key3]) {
                                    if (parseDataWorkflow[key1][key2][key3]["State"] > 2) {
                                        parseData[key1][key2][key3][key4] = true;
                                    } else if (parseDataWorkflow[key1][key2][key3]["State"] < 2) {
                                        parseData[key1][key2][key3][key4] = "NAVS";
                                    } else {
                                        if (parseData[key1][key2][key3][key4] !== true && parseData[key1][key2][key3][key4] !== "doing") {
                                            parseData[key1][key2][key3][key4] = false;
                                        }
                                    }
                                }
                            }
                        }
                    }

                    await fs.promises.writeFile(directoryPath + '/.validation_cache.json', JSON.stringify(parseData), 'utf8');
                }

                findFirstFalseOrPendingValue();
                handleGetUser();
            } catch (error) {
                console.error(error);
            }
        };

        fetchData();

        return () => {
            ipcRenderer.send("clean-upload-folder");
            ipcRenderer.removeAllListeners('upload-image-done');
            if (isDev) {
                ipcRenderer.removeAllListeners('clean-upload-folder-done');
            }
        };
    }, []);




    //********************************************************************************************* */
    // GET DATA FROM JSON - CREATE JSOn
    //********************************************************************************************* */

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
                    console.log(".validation_cache.json created with success");
                }
            }
        );

        return WTG_all_data_json;
    }



    function findFirstFalseOrPendingValue() {
        fs.readFile(directoryPath + '/.validation_cache.json', 'utf8', (err, data) => {
            if (err) {
                console.error(err)
                return
            }

            try {
                const JsonData = JSON.parse(data);
                for (const key1 in JsonData) {
                    for (const key2 in JsonData[key1]) {
                        for (const key3 in JsonData[key1][key2]) {
                            for (const key4 in JsonData[key1][key2][key3]) {
                                if (JsonData[key1][key2][key3][key4] === false || JsonData[key1][key2][key3][key4] === "doing") {
                                    console.log("Found a blade to treat : " + key1 + " " + key2 + " " + key3 + " " + key4);
                                    changeFalseToPending();
                                    return;
                                }
                            }
                        }
                    }
                }
                console.log("No more false or pending value");
                setValidationOver(true);
            } catch (err) {
                console.log(err);
            }
        })
    }

    useEffect(() => {
        if (validationOver === false) return;
        setLoading(false);
        setLoading(false);
    }, [validationOver]);

    const changeFalseToPending = () => {
        try {
            const JsonData = fs.readFileSync(directoryPath + '/.validation_cache.json', 'utf8');
            const data = JSON.parse(JsonData);

            for (const key1 in data) {
                for (const key2 in data[key1]) {
                    for (const key3 in data[key1][key2]) {
                        for (const key4 in data[key1][key2][key3]) {
                            if (data[key1][key2][key3][key4] === false || data[key1][key2][key3][key4] === "doing") {
                                if (data[key1][key2][key3][key4] === "doing") {
                                    console.log("This blade is already started, reload where you left off ");
                                    setTreatingBlade({
                                        WT: key1,
                                        Component: key2,
                                        Blade: key3,
                                        State: key4
                                    });
                                    setSelectWTGState(key4);
                                    setTimeout(async () => {
                                        await handleCreateValidationLogs(key1, key2, key3, key4);
                                        if (isDev) {
                                            uploadImage(key1, key2, key3, key4);
                                        } else {
                                            readImage(key1, key2, key3, key4);
                                        }
                                    }, 300);
                                    return;
                                } else {
                                    data[key1][key2][key3][key4] = "doing";
                                    fs.writeFile(`${directoryPath}/.validation_cache.json`, JSON.stringify(data), async (error) => {
                                        if (error) {
                                            console.error(error);
                                        } else {
                                            console.log("This blade was set to doing on the .validation_cache.json file");
                                            console.log("next Blade to treat : " + key1 + " " + key2 + " " + key3 + " " + key4);
                                            const newTreatingBlade = {
                                                WT: key1,
                                                Component: key2,
                                                Blade: key3,
                                                State: key4
                                            };

                                            setTreatingBlade(newTreatingBlade);
                                            setSelectWTGState(key4);
                                            setTimeout(async () => {
                                                await handleCreateValidationLogs(key1, key2, key3, key4);
                                                if (isDev) {
                                                    uploadImage(key1, key2, key3, key4);
                                                } else {
                                                    readImage(key1, key2, key3, key4);
                                                }
                                            }, 300);
                                        }
                                    });
                                    return;
                                }
                            }
                        }
                    }
                }
            }
        } catch (err) {
            console.error(err);
        }
    }


    //********************************************************************************************* */
    // ETAPE DANS L'ORDRE APRES handleGetCurrentValidationSide 
    //********************************************************************************************* */



    /* Old gestion image
        const handleSelectWTGState = async (WT, Component, Blade, state) => {
    
            if (isDev) {
                uploadImage(WT, Component, Blade, state);
                setSelectImgChoice(null);
            } else {
                readImage(WT, Component, Blade, state);
                setSelectImgChoice(null);
            }
        }
        */

    // Create validation_logs.json si n'existe pas
    const handleCreateValidationLogs = async (WT, Component, Blade, State) => {
        const isValidationLogsExist = fs.existsSync(`${directoryPath}/${WT}/${Component}/${Blade}/export/validation_logs.json`);
        if (isValidationLogsExist) {
            return;
        } else {
            const readDirectory = fs.readdirSync(`${directoryPath}/${WT}/${Component}/${Blade}/matches/good_matches`);
            const readDirectoryFiltered = readDirectory.filter((file) => {
                return file.includes(".txt") || file.includes(".jpg");
            });
            const validation_logs = readDirectoryFiltered.map((element) => {
                if (element.includes(".txt")) {
                    element = element.replace(".txt", ".jpg");
                    return {
                        [element]: "MF",
                    };
                } else {
                    return {
                        [element]: null
                    };
                }
            });

            let alltxt = true;
            for (const file of readDirectoryFiltered) {
                if (file.includes(".jpg")) {
                    alltxt = false;
                }
            }

            const pathToWriteFile = `${directoryPath}/${WT}/${Component}/${Blade}/export`;
            try {
                await fs.promises.writeFile(
                    `${pathToWriteFile}/validation_logs.json`,
                    JSON.stringify(validation_logs)
                );
                console.log("Validation_logs created successfully");
            } catch (err) {
                console.log(err);
            }

            if (alltxt) {
                console.log("All images are .txt files, please wait...");
                handleNoImages();
            }
        }
    };


    // Ensuite, ce useEffect trigger readImage() ou uploadImage() en fonction de l'environnement

    /* en prod old
    const readImage = (WT, Component, Blade, state) => {
        console.log("Please wait during images upload...");

        let validationType;
        if (state === "Match") {
            validationType = "matches/good_matches";
        } else if (state === "Geotag") {
            validationType = "geotags";
        } else if (state === "Line") {
            validationType = "lines";
        }


        const pathToUpload = `${directoryPath}/${WT}/${Component}/${Blade}/${validationType}`;
        const pathToJson = `${directoryPath}/${WT}/${Component}/${Blade}/export/validation_logs.json`;
        const data_electron = [pathToUpload, pathToJson, state];

        console.log(data_electron);

        console.log("Trying to upload images from : ", pathToUpload);
        ipcRenderer.send("upload-image", data_electron);
    };
    */
    const readImage = (WT, Component, Blade, state) => {
        console.log("Please wait during image upload...");

        let validationType;
        if (state === "Match") {
            validationType = "matches/good_matches";
        } else if (state === "Geotag") {
            validationType = "geotags";
        } else if (state === "Line") {
            validationType = "lines";
        }

        const pathToUpload = `${directoryPath}/${WT}/${Component}/${Blade}/${validationType}`;
        const pathToJson = `${directoryPath}/${WT}/${Component}/${Blade}/export/validation_logs.json`;
        const data_electron = [pathToUpload, pathToJson, state];


        console.log("Trying upload from: ", pathToUpload);

        ipcRenderer.send("upload-image", data_electron);
    };
    /* en dev old
    const uploadImage = (WT, Component, Blade, state) => {
        console.log("Please wait during images upload...");

        let validationType;
        if (state === "Match") {
            validationType = "matches/good_matches";
        } else if (state === "Geotag") {
            validationType = "geotags";
        } else if (state === "Line") {
            validationType = "lines";
        }

        console.log(validationType);
        console.log(state);

        const pathToUpload = `${directoryPath}/${WT}/${Component}/${Blade}/${validationType}`;
        const pathToJson = `${directoryPath}/${WT}/${Component}/${Blade}/export/validation_logs.json`;
        const data_electron = [pathToUpload, pathToJson, state];

        console.log(data_electron);
        fs.readdir('public/uploads-files', (err, files) => {
            if (err) {
                return console.log('Unable to scan directory: ' + err);
            }
            files.forEach((file) => {
                fs.unlink(`public/uploads-files/${file}`, (err) => {
                    if (err) throw err;
                });
            });
        });

        setTimeout(() => {
            ipcRenderer.send("upload-image", data_electron);
        }, 1000);
    };
    */
    const uploadImage = (WT, Component, Blade, state) => {
        console.log("Please wait during image upload...");

        let validationType;
        if (state === "Match") {
            validationType = "matches/good_matches";
        } else if (state === "Geotag") {
            validationType = "geotags";
        } else if (state === "Line") {
            validationType = "lines";
        }

        console.log(validationType);
        console.log(state);

        const pathToUpload = `${directoryPath}/${WT}/${Component}/${Blade}/${validationType}`;
        const pathToJson = `${directoryPath}/${WT}/${Component}/${Blade}/export/validation_logs.json`;
        const data_electron = [pathToUpload, pathToJson, state];

        console.log(data_electron);

        const deleteFiles = async () => {
            try {
                const files = await fs.promises.readdir('public/uploads-files');
                for (const file of files) {
                    await fs.promises.unlink(`public/uploads-files/${file}`);
                }
                console.log("Files deleted successfully.");
            } catch (error) {
                console.error("Error occurred while deleting files:", error);
            }
        };

        deleteFiles()
            .then(() => {
                ipcRenderer.send("upload-image", data_electron);
            })
            .catch((error) => {
                console.error("Error occurred during file deletion:", error);
            });
    };

    /* en dev, on ajout la lecture du dossier pour setup les images old
    const handleReadUploadDirectory = () => {
        let filesArray = [];
        fs.readdir('public/uploads-files', (err, files) => {
            files.forEach((file) => {
                filesArray.push(file);
            });

            // Continue processing inside the callback function
            files.forEach((file) => {
                if (file.includes(".txt")) {
                    fs.unlink(`public/uploads-files/${file}`, (err) => {
                        if (err) {
                            console.log(err);
                        } else {
                            console.log(".txt file was niceley removed from public/uploads-files");
                        }
                    });
                }
            });


            if (filesArray.length === 0) {
                console.log("All images are .txt files, lauching handleNoImages() function...");
                handleNoImages();
            }
            setSelectImg(filesArray);
        });
    };
    */
    const handleReadUploadDirectory = () => {
        fs.promises.readdir('public/uploads-files')
            .then((files) => {
                let filesArray = [];

                const unlinkPromises = files.map((file) => {
                    filesArray.push(file);

                    if (file.includes(".txt")) {
                        return fs.promises.unlink(`public/uploads-files/${file}`)
                            .then(() => {
                                console.log(".txt file was nicely removed from public/uploads-files");
                            })
                            .catch((err) => {
                                console.error(err);
                            });
                    }
                });

                return Promise.all(unlinkPromises)
                    .then(() => {
                        if (filesArray.length === 0) {
                            console.log("All images are .txt files, launching handleNoImages() function...");
                            handleNoImages();
                        }
                        setSelectImg(filesArray);
                    });
            })
            .catch((err) => {
                console.error("Error occurred while reading upload directory:", err);
            });
    };



    //********************************************************************************************* */
    // POST CHARGEMENT DES IMAGES
    //********************************************************************************************* */

    const [advancement, setAdvancement] = useState(0);
    const [isFirstImage, setIsFirstImage] = useState(true);

    useEffect(() => {
        if (loading === false && loadingNextSide === false && !validationOver) {
            document.getElementById("clickMe").focus();
        }
    }, [loading, loadingNextSide]);

    useEffect(() => {
        if (treatingBlade.WT !== null) {
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
            const pathToImage = `${directoryPath}/${treatingBlade.WT}/${treatingBlade.Component}/${treatingBlade.Blade}/${validationType}/${selectImg[advancement]}`;
            setImagePath(pathToImage);
        }
    }, [advancement]);


    // Permet de retrouver ou on en est dans le traitement des images pour le coté actuel
    const handleCheckIfAlreadyValidated = () => {
        const validation_logs = `${directoryPath}/${treatingBlade.WT}/${treatingBlade.Component}/${treatingBlade.Blade}/export/validation_logs.json`;
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
    };

    // Bouton OPEN FOLDER pour accéder au dossier de l'image
    const [pathToOpen, setPathToOpen] = React.useState(null);
    const handleUploadPathFolder = () => {
        if (selectImg === null) return;
        if (selectImg[advancement] !== null) {
            const imageNoExtension = selectImg[advancement].split(".")[0];
            const path = `${directoryPath}/${treatingBlade.WT}/${treatingBlade.Component}/${treatingBlade.Blade}/matches/${imageNoExtension}`;
            const stringifiedPath = JSON.stringify(path);
            setPathToOpen(stringifiedPath);
        }
    };


    useEffect(() => {
        if (selectImg[0] === null || selectImg[0] === undefined) {
            console.log("No images on selectImg State, returning...")
            return;
        }
        console.log(selectImg)
        handleNextImage();
    }, [selectImg]);

    const handleNextImage = () => {
        if (!isDev) {
            if (selectImg === null || treatingBlade.Blade === null) return;
            if (selectImg.length === 0) {
                console.log("All Images were treated for this side, Loading Next Side")
                setLoading(true);
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
                console.log("found some images to treat")
                const pathToImage = `${directoryPath}/${treatingBlade.WT}/${treatingBlade.Component}/${treatingBlade.Blade}/${validationType}/${selectImg[advancement]}`;
                setImagePath(pathToImage);
                setLoading(false);
            }
        }
        else {
            if (selectImg === null || treatingBlade.Blade === null) {
                console.log("selectImg === null || treatingBlade.Blade === null, function return")
                return;
            }
            else {
                if (selectImg.length === 0) {
                    console.log("All Images were treated for this side, Loading Next Side")
                    setLoading(true);
                    changePendingToTrue();
                } else {
                    console.log("Image was loaded, we can treat it")
                    setTimeout(() => {
                        setLoading(false);
                    }, 100);
                    handleUploadPathFolder();
                }
            }
        }
    };


    const handleNoImages = () => {
        console.log("No images for this side, loading next side...")
        setLoading(true);
        changePendingToTrue();
    }


    // Permet de mettre à jour le validation_cache.json pour passer les validations en "doing" à true
    const changePendingToTrue = async () => {
        const pathToValidationJson = `${directoryPath}/.validation_cache.json`;

        try {
            const data = await readFileAsync(pathToValidationJson, 'utf8');
            const parseData = JSON.parse(data);

            for (const key1 in parseData) {
                for (const key2 in parseData[key1]) {
                    for (const key3 in parseData[key1][key2]) {
                        for (const key4 in parseData[key1][key2][key3]) {
                            if (parseData[key1][key2][key3][key4] === "doing") {
                                console.log("We found a pending validation, we change it to true");
                                parseData[key1][key2][key3][key4] = true;
                                if ((key4 === "Geotag" && key3 !== "TE") || (key4 === "Line" && key3 === "TE")) {
                                    console.log("All side were done, Changing blade, please wait...");
                                    await handleUpdateSideStateChecker(key1, key2, key3);
                                    await handleUpdateWorkflowJson(key1, key2, key3);
                                    await handlePercentValidation();
                                }


                                console.log("Writing new ./validation_cache.json");

                                await writeFileAsync(pathToValidationJson, JSON.stringify(parseData));

                                console.log(key1 + " " + key2 + " " + key3 + " is now true for: " + key4);

                                findFirstFalseOrPendingValue();
                            }
                        }
                    }
                }
            }
        } catch (err) {
            console.error(err);
        }
    };

    // permet de suivre la progression de la validation
    const [ValidationProgress, setValidationProgress] = React.useState(0);


    //********************************************************************************************* */
    // NAVIGATION
    //********************************************************************************************* */


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

    const handleGoNext = () => {
        if (advancement < selectImg.length - 1) {
            setAdvancement(advancement + 1);
        }
        if (advancement === selectImg.length - 1) {
            setLoading(true);
            setAdvancement(0);
            changePendingToTrue();
        }
    };

    // ***********************************************************************
    // CHANGE SIDE
    // ************************************************************************




    const handleUpdateSideStateChecker = async (WT, Component, Blade) => {
        console.log("Updating sideStateChecker.json for this side: ", WT + " " + Component + " " + Blade);
        const pathToSide = `${directoryPath}/${WT}/${Component}/${Blade}`;

        try {
            const data = await readFileAsync(`${pathToSide}/export/validation_logs.json`, 'utf8');
            let good_matches_count = 0;
            let good_geotags_count = 0;
            let good_lines_count = 0;
            let nb_manuals = 0;
            const parseData = JSON.parse(data);
            parseData.forEach((element) => {
                for (const key in element) {
                    if (element[key] === "M") {
                        good_matches_count = good_matches_count + 1;
                    } else if (element[key] === "MFG") {
                        good_geotags_count = good_geotags_count + 1;
                    } else if (element[key] === "MFGFL") {
                        good_lines_count = good_lines_count + 1;
                    } else if (element[key].slice(-1) === "F") {
                        nb_manuals = nb_manuals + 1;
                    }
                }
            });

            const sideStateData = await readFileAsync(`${pathToSide}/side_state.json`, 'utf8');
            const parseDataForUpdate = JSON.parse(sideStateData);
            parseDataForUpdate['states']['validate']['done'] = true;
            parseDataForUpdate['states']['validate']['nb_good_matches'] = good_matches_count;
            parseDataForUpdate['states']['validate']['nb_good_geotags'] = good_geotags_count;
            parseDataForUpdate['states']['validate']['nb_good_lines'] = good_lines_count;
            parseDataForUpdate['states']['validate']['nb_manuals'] = nb_manuals;
            parseDataForUpdate['states']['validate']['date'] = new Date().toISOString().slice(0, 10);
            parseDataForUpdate['states']['validate']['user'] = activeUser;

            await writeFileAsync(`${pathToSide}/side_state.json`, JSON.stringify(parseDataForUpdate));
            console.log("Update Side State was successful");
        } catch (err) {
            console.log("{ERROR} !!! Side state was not updated for this side: ", WT + " " + Component + " " + Blade);
        }
    };

    const handleUpdateWorkflowJson = async (WT, Component, Blade) => {
        const workflowJson = `${directoryPath}/.workflow_cache.json`;
        try {
            const data = await readFileAsync(workflowJson);
            const workflowData = JSON.parse(data);
            workflowData[WT][Component][Blade]["State"] = 3;
            await writeFileAsync(workflowJson, JSON.stringify(workflowData));
            console.log(".workflow_cache.json was updated successfully for this side: ", WT + " " + Component + " " + Blade);
            ipcRenderer.send("update-dashboard", WT);
        } catch (err) {
            console.error(err);
        }
    };

    const handlePercentValidation = async () => {
        const sideStateCheckerJsonPath = `${directoryPath}/.workflow_cache.json`;

        try {
            const data = await readFileAsync(sideStateCheckerJsonPath, "utf8");
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
            console.log("Error reading file from disk:", err);
        }
    };


    // ***********************************************************************
    // ***********************************************************************





    const handleReturn = () => {
        if (advancement > 0) {
            setAdvancement(advancement - 1);
        } else {
            console.log("First image already, can't go back");
        }
    };


    //********************************************************************************************* */
    // USER CHOICE
    //********************************************************************************************* * /


    const handlePressYes = () => {
        const validation_logs = `${directoryPath}/${treatingBlade.WT}/${treatingBlade.Component}/${treatingBlade.Blade}/export/validation_logs.json`;
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
                    console.log("Validation_logs updating with handlePressYes was successful");
                }
            }
        );


        if (advancement < selectImg.length - 1) {
            setAdvancement(advancement + 1);
        }
        if (advancement === selectImg.length - 1) {
            setLoading(true);
            setAdvancement(0);
            changePendingToTrue();
        }
    };

    const handleCloseThisComponent = () => {
        ipcRenderer.removeAllListeners("find-user_id");
        ipcRenderer.removeAllListeners("upload-image-done");
        ipcRenderer.send('close')
    }

    const handlePressNo = () => {
        const validation_logs = `${directoryPath}/${treatingBlade.WT}/${treatingBlade.Component}/${treatingBlade.Blade}/export/validation_logs.json`;
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
                    console.log("Validation_logs updating with handlePressNo was successful");
                }
            }
        );
        if (advancement < selectImg.length - 1) {
            setAdvancement(advancement + 1);
        }
        if (advancement === selectImg.length - 1) {
            setLoading(true);
            setAdvancement(0);
            changePendingToTrue();

        }
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
                        <button className="mr-2 text-lg font-bold px-4 py-2 tracking-wide text-white transition-colors duration-200 transform bg-orange rounded-md focus:outline-none" onClick={handleCloseThisComponent}>Close</button>
                    </div>
                </div>
            </div>
        )
    } else {
        return (
            <div id='clickMe' tabIndex="0" onKeyDown={handleKeyDown} className="validation">
                {selectWTGState !== "Nothing selected yet" &&
                    <SmallNav WTGstate={selectWTGState} linkTo={{ path: pathToOpen }} />
                }
                {/* separator 1px orange */}
                <div className="Noselect flex flex-col items-center justify-around text-orange hview">
                    {/* Header */}

                    <div className='text-2xl flex flex-row items-end justify-around w-80 h-10 mt-10 NoSelect'>
                        <span className='font-extrabold'>{treatingBlade.WT}</span>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />
                        </svg>
                        <span className='font-extrabold'>{treatingBlade.Component}</span>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />
                        </svg>
                        <span className='font-extrabold'>{treatingBlade.Blade}</span>
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
                        <div className='w-80 flex justify-center NoSelect hover:scale-150'>
                            {isDev && <img className="w-full" src={`./uploads-files/${selectImg[advancement]}`} alt="image" />}
                            {!isDev && <img className="w-full" src={imagePath} alt="image" />}
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
                    <ValidationProgressBar percent={ValidationProgress} />
                </div>
            </div>
        )
    }
}


export default Validation;
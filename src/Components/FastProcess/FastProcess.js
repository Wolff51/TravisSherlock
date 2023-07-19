import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux'
import Console from '../Console/Console';
import Loader from '../Loader/Loader';
import ansiRegex from 'ansi-regex';
import Annotate from '../ImageTools/ImageAnnotation';
import AnnotationRecap from '../AnnotationRecap/AnnotationRecap';
import ImagesPagination from '../FastProcess/ImagesPagination';
const MissionSheetReader = require("../../utils/MissionSheetReader").default;
const fs = window.require('fs');
const { ipcRenderer } = window.require('electron');
const isDev = window.require("electron-is-dev");
const path = window.require("path");
const shell = window.require('electron').shell;

function FastProcess() {
    const role = useSelector((state) => state.role.value);
    const [directoryPathFastProcess, setDirectoryPathFastProcess] = useState(localStorage.getItem('directoryPathFastProcess'));
    const [missionSheetFastProcess, setMissionSheetFastProcess] = useState(localStorage.getItem('missionSheetFastProcess'));
    const [missionSheet, setMissionSheet] = useState(null);
    const [workflow, setWorkflow] = useState(null);

    if (!ipcRenderer.listenerCount('updateFastProcess')) {
        ipcRenderer.on('updateFastProcess', (event, arg) => {
            setLoading(true)
            setTreatingBlade({
                WT: arg.WT,
                Component: arg.COMPONENT,
                Side: arg.BLADE
            });
            setSelectedWT(arg.WT);
            handleDealDirectoryPath();
            setStep(1);
            setTimeout(() => {
                setLoading(false);
            }
                , 1000);
        })
    }

    // ***********************   //
    // Mission Sheet Create Class + workflow Json //
    // ***********************   //

    const handleDealDirectoryPath = () => {
        const missionSheet = new MissionSheetReader(directoryPathFastProcess);
        if (!fs.existsSync(`${directoryPathFastProcess}/.workflow_cache.json`)) {
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
                `${directoryPathFastProcess}/.workflow_cache.json`,
                JSON.stringify(WTG_all_data_json),
                (err) => {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log("File written successfully");
                    }
                }
            );
            setWorkflow(WTG_all_data_json);
        } else {
            fs.readFile(`${directoryPathFastProcess}/.workflow_cache.json`, 'utf8', (err, data) => {
                if (err) {
                    alert("An error ocurred reading the file :" + err.message);
                    return;
                }
                const parseData = JSON.parse(data);
                setWorkflow(parseData);
            });
        }
        setMissionSheet(missionSheet);
    };

    const openWebWeather = () => {
        const startDate = document.getElementById('inspection_date').value
        const endDate = document.getElementById('inspection_end_date').value
        const location = document.getElementById('location').value
        shell.openExternal(`https://meteostat.net/fr/place/fr/${location}?s=07168&t=${startDate}/${endDate}`)
    }

    useEffect(() => {
        if (directoryPathFastProcess !== null) {
            handleDealDirectoryPath();
        }

    }, [directoryPathFastProcess])


    // ***********************   //
    // END Mission Sheet Create Class + workflow Json //
    // ***********************   //





    // ***********************   //
    // State                    //
    // ***********************   //

    const [step, setStep] = useState(0);

    const [missionSheetData, setMissionSheetData] = useState(null);
    const [wtList, setWTList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedWT, setSelectedWT] = useState(null);
    const [ComponentList, setComponentList] = useState([]);

    // ***********************   //
    // END State                 //
    // ***********************   //



    // ***********************     //
    // Trigger At Start           //
    // ***********************   //


    useEffect(() => {
        fs.readFile(missionSheetFastProcess, 'utf8', (err, data) => {
            if (err) {
                alert("An error ocurred reading the file :" + err.message);
                return;
            }
            const parseData = JSON.parse(data);
            if (parseData.progression.step >= 2) {
                setStep(2)
                setTimeout(() => {
                    setLoading(false);
                }, 1000);
            } else {
                setStep(parseData.progression.step)
            }
            setMissionSheetData(parseData);
        });
        return () => {
            if (isDev) {
                deleteAllFilesInDirectory();
            }
            ipcRenderer.removeAllListeners("script-output");
            ipcRenderer.removeAllListeners("updateFastProcess");
        }
    }, []);

    const handleSaveWorkflow = () => {
        if (workflow === null) return;
        fs.writeFileSync(
            `${directoryPathFastProcess}/.workflow_cache.json`,
            JSON.stringify(workflow),
            (err) => {
                if (err) {
                    console.log(err);
                } else {
                    console.log(".workflow_cache.json was saved!");
                }
            }
        );
    }

    const deleteAllFilesInDirectory = () => {
        const uploadsFilesDirectory = 'public/uploads-files'; // Set the directory path
        const files = fs.readdirSync(uploadsFilesDirectory);
        for (const file of files) {
            const filePath = path.join(uploadsFilesDirectory, file);
            fs.unlinkSync(filePath); // Delete the file synchronously
        }
    };


    useEffect(() => {
        if (missionSheetData !== null) {
            let WT_List = [];
            for (const key in missionSheetData['WTG_list']) {
                WT_List.push(key);
            }
            setWTList(WT_List);
            setComponentList(missionSheet.getWindTurbineComponentsNoWTG(WT_List[0]))
            setSelectedWT(WT_List[0]);
        }
    }, [missionSheetData]);


    const [loadNextSide, setLoadNextSide] = useState(false);


    useEffect(() => {
        if (workflow !== null) {
            if (step === 1 && treatingBlade === null) {
                getFirstUntreatedBlade();
            }
            handleSaveWorkflow();
            if (loadNextSide) {
                getFirstUntreatedBladeWhereSelected(treatingBlade.WT)
                if (isDev) {
                    setTimeout(() => {
                        setLoadNextSide(false);
                    }, 2500);
                } else {
                    setTimeout(() => {
                        setLoadNextSide(false);
                    }, 300);
                }
            }
        }
    }, [workflow]);


    // ***********************     //
    // END Trigger At Start        //
    // ***********************   //



    // ***********************   //
    // Tracking Advancement     //
    // *********************** //
    const handleVerifyIfAllBladesAreTreatedForThisWT = (WT) => {
        let allBladesAreTreated = true;
        for (const key in workflow[WT]) {
            for (const key2 in workflow[WT][key]) {
                if (workflow[WT][key][key2].State === 1 || workflow[WT][key][key2].State === 'pending') {
                    allBladesAreTreated = false;
                }
            }
        }

        return allBladesAreTreated;
    };

    const [selectRecapBlade, setSelectRecapBlade] = useState(
        { WT: null, COMPONENT: null, BLADE: null }
    );

    const handleSelectBlade = (component, blade) => {
        setSelectRecapBlade(
            { WT: selectedWT, COMPONENT: component, BLADE: blade }
        );
        // const elements = document.getElementsByClassName('outline-dotted outline-2 outline-offset-2 outline-orange rounded-lg');
        // for (let i = 0; i < elements.length; i++) {
        //     elements[i].classList.remove('outline-dotted', 'outline-2', 'outline-offset-2', 'outline-orange', 'rounded-lg');
        // }
        // document.getElementById(component + blade).classList.add('outline-dotted', 'outline-2', 'outline-offset-2', 'outline-orange', 'rounded-lg');
    }


    const handleChangeSelectedWT = (event) => {
        const selected = event.target.value;
        if (selected !== undefined && selected !== null && selected !== "") {
            setSelectedWT(selected);
            const verify = handleVerifyIfAllBladesAreTreatedForThisWT(selected);
            if (verify === false) {
                setStep(1);
                setComponentList(missionSheet.getWindTurbineComponentsNoWTG(selected));
                treatingBlade.WT = selected;
                if (isDev) {
                    deleteAllFilesInDirectory();
                }
                if (!fs.existsSync(directoryPathFastProcess + '/' + selected + '/InspectionReport.json')) {
                    setFormIsDone(false);
                } else {
                    setFormIsDone(true);
                    setLoading(true);
                    getFirstUntreatedBladeWhereSelected(selected)
                }
            } else {
                if (isDev) {
                    deleteAllFilesInDirectory();
                }
                setStep(2);
            }
        } else {
            setSelectedWT(null);
        }
    }

    const handleSetSelectedTurbine = () => {
        if (treatingBlade === null) return;
        setSelectedWT(treatingBlade.WT);
        if (isDev) {
            setTimeout(() => {
                setLoading(false);
                setTimeout(() => {
                    document.getElementById('FP-selected-WT').value = treatingBlade.WT;
                }, 50);
            }, 1500);
        }
        else {
            setTimeout(() => {
                setLoading(false);
                setTimeout(() => {
                    document.getElementById('FP-selected-WT').value = treatingBlade.WT;
                }, 50);
            }, 300);
        }
    }


    const getFirstUntreatedBlade = () => {
        if (workflow === null) return;
        for (const eKey in workflow) {
            for (const aKey in workflow[eKey]) {
                for (const key in workflow[eKey][aKey]) {
                    if (workflow[eKey][aKey][key]["State"] === 1 || workflow[eKey][aKey][key]["State"] === 'pending') {
                        console.log("We will treat this element : " + eKey + " " + aKey + " " + key);
                        setTreatingBlade({
                            WT: eKey,
                            Component: aKey,
                            Side: key
                        });
                        if (workflow[eKey][aKey][key]["State"] === 1) {
                            handleSetPending(eKey, aKey, key);
                        } else {
                            setImageIndex(workflow[eKey][aKey][key]["ImagesDone"]);
                        }
                        if (fs.existsSync(directoryPathFastProcess + '/' + eKey + '/InspectionReport.json')) {
                            setFormIsDone(true);
                            handleSetImageList(eKey, key, aKey);
                        } else {
                            setFormIsDone(false);
                            setLoading(false);
                            setSelectedWT(eKey);
                            setTimeout(() => {
                                document.getElementById('FP-selected-WT').value = eKey;
                            }, 50);
                        }
                        return;
                    }
                }
            }
        }

        console.log("All blades are treated");
        setStep(2);
        // rewrite mission sheet
        const newMissionSheet = missionSheet.missionData;

        newMissionSheet.progression.step = 2;
        fs.writeFileSync(directoryPathFastProcess + '/mission_sheet.json', JSON.stringify(newMissionSheet, null, 4));
        setLoading(false);
    }

    const getFirstUntreatedBladeWhereSelected = (WT) => {
        if (workflow === null) return;

        let foundUntreatedBlade = false;

        for (const aKey in workflow[WT]) {
            for (const key in workflow[WT][aKey]) {
                if (workflow[WT][aKey][key]["State"] === 1 || workflow[WT][aKey][key]["State"] === 'pending') {
                    console.log("We will treat this element: " + WT + " " + aKey + " " + key);
                    setTreatingBlade({
                        WT: WT,
                        Component: aKey,
                        Side: key
                    });
                    if (workflow[WT][aKey][key]["State"] === 1) {
                        handleSetPending(WT, aKey, key);
                    } else {
                        setImageIndex(workflow[WT][aKey][key]["ImagesDone"]);
                    }
                    setSelectedWT(WT);
                    handleSetImageList(WT, key, aKey);
                    foundUntreatedBlade = true;
                    break;
                }
            }
            if (foundUntreatedBlade) {
                break;
            }
        }

        if (!foundUntreatedBlade) {
            console.log("No more untreated blades for this WT in manual selection, launching getFirstUntreatedBlade...");
            getFirstUntreatedBlade();
        }
    }


    // ***********************   //
    // Form Submit and state    //
    // *********************** //
    const [bladeModel, setBladeModel] = useState(null);
    const [inspectionBreak, setInspectionBreak] = useState(false);

    const handleSubmitForm = (e) => {
        e.preventDefault();

        if (document.getElementById('blade_model').value === 'Blade Model') {
            alert("Please select a blade model");
            return;
        }
        let u_day = 1;
        let u_waiting_time = 0;
        let u_working_time = 1;

        let u_windspeed;
        let u_temperature;
        let u_humidity;
        let u_condition;
        if (!wheatherError) {
            u_windspeed = Math.floor(wheatherData.hour[0].wind_mps);
            u_temperature = wheatherData['day'].avgtemp_c;
            u_humidity = wheatherData.day.avghumidity;
            u_condition = wheatherData.day.condition.text
        } else {
            u_windspeed = document.getElementById('wind_speed').value;
            u_temperature = document.getElementById('temperature').value;
            u_humidity = document.getElementById('humidity').value;
            u_condition = document.getElementById('condition').value;
        }

        u_windspeed = parseInt(u_windspeed);
        u_temperature = parseInt(u_temperature);
        u_humidity = parseInt(u_humidity);



        let inspectionBreakNumber = 0;
        let inspectionBreakStopDate = null
        let inspectionBreakRestartDate = null

        const didInspectionBreak = document.getElementById('inspection_break').checked;
        if (didInspectionBreak) {
            inspectionBreakNumber = document.getElementById('inspection_break_number').value;
            inspectionBreakStopDate = document.getElementById('stop_date').value;
            inspectionBreakRestartDate = document.getElementById('restart_date').value;
            // ************************************************************************
            // TODO / FAIRE DES MATHS POUR CALCULER LES TEMPS day, working_time, waiting_time
            // ************************************************************************
        }

        const blade_model = document.getElementById('blade_model').value

        setBladeModel(blade_model);



        // bladePath, bladeSerialNumber, bladeModel, sidePath, direction, missionType
        // WORKING HERE

        const InspectionReport = {
            "missionType": missionSheet.getMissionType(),
            "u_turbine_id": document.getElementById('turbine_id').value,
            "u_incident": document.getElementById('incident').value,
            "u_purchase_order": "",
            "u_blade_type": blade_model,
            "u_responsible_technicians": document.getElementById('responsible_technicians').value,
            "u_safety_checklist": true,
            "u_inspection_date": document.getElementById('inspection_date').value,
            "u_inspection_end_date": document.getElementById('inspection_end_date').value,
            "u_inspection_break": inspectionBreakNumber,
            "u_inspection_stopped": inspectionBreakStopDate,
            "u_inspection_restarted": inspectionBreakRestartDate,
            "u_inspection_type": document.getElementById('inspection_type').value,
            "u_blade_a": document.getElementById('blade_A_serial').value,
            "u_blade_b": document.getElementById('blade_B_serial').value,
            "u_blade_c": document.getElementById('blade_C_serial').value,
            "u_blade_a_drain_hole": false,
            "u_blade_b_drain_hole": false,
            "u_blade_c_drain_hole": false,
            "u_drain_hole_status_a": 'Open',
            "u_drain_hole_status_b": 'Open',
            "u_drain_hole_status_c": 'Open',
            "u_blade_noise": false,
            "u_blade_noise_comment": "",
            "u_loose_parts_in_blade": 'false',
            "u_loose_parts_comment": "",
            "u_blade_vacuum": false,
            "u_blade_vacuum_comment": "",
            "u_general_remarks": document.getElementById('general_remarks').value,
            "u_blade_set_number": "AAA",
            "WeatherLogbook": {
                "u_date": document.getElementById('inspection_date').value,
                "u_day": u_day,
                "u_humidity": u_humidity,
                "u_temperature": u_temperature,
                "u_waiting_time": u_waiting_time,
                "u_weather": u_condition,
                "u_windspeed": u_windspeed,
                "u_working_time": u_working_time
            },
            "DamageEntry": []
        }

        if (inspectionBreakStopDate === null) {
            delete InspectionReport.u_inspection_stopped;
        }

        if (inspectionBreakRestartDate === null) {
            delete InspectionReport.u_inspection_restarted;
        }

        // create Json not xml
        const json = JSON.stringify(InspectionReport, null, 4);
        const filePath = directoryPathFastProcess + '/' + treatingBlade.WT + '/InspectionReport.json'
        fs.writeFile(filePath, json, 'utf8', (err) => {
            if (err) {
                console.log(err);
            }
        });

        setFormIsDone(true);
        setLoading(true);
        getFirstUntreatedBlade();
    }

    const [formIsDone, setFormIsDone] = useState(false);

    const [imageList, setImageList] = useState([]);
    const [imageIndex, setImageIndex] = useState(0);



    const handleSetImageList = (param_WT, param_SIDE, param_COMPONENT) => {
        if (!isDev) {
            const pathToImagesDirectory = directoryPathFastProcess + '/' + param_WT + '/' + param_COMPONENT + '/' + param_SIDE;
            const images = fs.readdirSync(pathToImagesDirectory);
            const imageList = [];
            for (const image of images) {
                if (image.includes('.jpg') || image.includes('.png') || image.includes('.JPG') || image.includes('.PNG')) {
                    imageList.push(pathToImagesDirectory + '/' + image);
                }
                if (image === images[images.length - 1]) {
                    console.log('images were uploaded with success, number to treat : ' + imageList.length + ' images')
                    setImageList(imageList);
                }
            }

            handleSetSelectedTurbine();
        }
        if (isDev) {
            // const pathToImagesDirectory = directoryPathFastProcess + '/' + param_WT + '/' + param_COMPONENT + '/' + param_SIDE;
            // const images = fs.readdirSync(pathToImagesDirectory);
            // const uploadsFilesDirectory = 'public/uploads-files';
            // const imageList = [];
            // let letTotalTimeForUpload = 0;
            // for (const image of images) {
            //     if (image.includes('.jpg') || image.includes('.png') || image.includes('.JPG') || image.includes('.PNG')) {
            //         const sourcePath = path.join(pathToImagesDirectory, image);
            //         const destinationPath = path.join(uploadsFilesDirectory, image);
            //         imageList.push('./uploads-files/' + image);

            //         const startTime = performance.now();
            //         fs.copyFileSync(sourcePath, destinationPath);
            //         const endTime = performance.now();

            //         const uploadTime = endTime - startTime;
            //         console.log(uploadTime)
            //         letTotalTimeForUpload += uploadTime;

            //         console.log(`Upload time for ${image}: ${uploadTime}ms`);
            //     }

            //     handleSetImageListDev(imageList)
            // }
            const pathToImagesDirectory = directoryPathFastProcess + '/' + param_WT + '/' + param_COMPONENT + '/' + param_SIDE;
            const images = fs.readdirSync(pathToImagesDirectory);
            const uploadsFilesDirectory = 'public/uploads-files';
            const imageList = [];
            let letTotalTimeForUpload = 0;

            const uploadPromises = images.map((image) => {
                if (image.includes('.jpg') || image.includes('.png') || image.includes('.JPG') || image.includes('.PNG')) {
                    const sourcePath = path.join(pathToImagesDirectory, image);
                    const destinationPath = path.join(uploadsFilesDirectory, image);
                    imageList.push('./uploads-files/' + image);

                    return new Promise((resolve, reject) => {
                        const startTime = performance.now();
                        fs.copyFile(sourcePath, destinationPath, (error) => {
                            if (error) {
                                reject(error);
                            } else {
                                const endTime = performance.now();
                                const uploadTime = endTime - startTime;
                                letTotalTimeForUpload += uploadTime;
                                resolve();
                            }
                        });
                    });
                }
            });

            Promise.all(uploadPromises)
                .then(() => {
                    setTimeout(() => {
                        handleSetImageListDev(imageList);
                    }, 1000);
                })
                .catch((error) => {
                    console.error('Error uploading images:', error);
                });
        }
    }

    const handleSetImageListDev = (img) => {
        setImageList(img);
        setLoading(false);
    }

    useEffect(() => {
        if (imageList.length > 0) {
            handleSetSelectedTurbine();
        }
    }, [imageList]);

    const [treatingBlade, setTreatingBlade] = useState(null);
    const [isOver, setIsOver] = useState(false);
    const [isFirstImage, setIsFirstImage] = useState(true);

    const handleSetImagesDoneWorkflow = () => {
        if (loadNextSide) return;
        setWorkflow((prevState) => {
            return {
                ...prevState,
                [treatingBlade.WT]: {
                    ...prevState[treatingBlade.WT],
                    [treatingBlade.Component]: {
                        ...prevState[treatingBlade.WT][treatingBlade.Component],
                        [treatingBlade.Side]: {
                            ...prevState[treatingBlade.WT][treatingBlade.Component][treatingBlade.Side],
                            ImagesDone: imageIndex
                        }
                    }
                }
            }
        }
        );
    }

    useEffect(() => {
        if (formIsDone === true) {
            handleSetImagesDoneWorkflow()
        }

        if (imageIndex === 0) {
            setIsFirstImage(true);
        } else {
            setIsFirstImage(false);
        }

        if (imageList.length > 0) {
            const maxLen = imageList.length;

            if (imageIndex === maxLen) {
                setLoading(true);
                handleSetRecapListForThisSide();
            } else {
                setIsOver(false);
            }
        }

    }, [imageIndex]);

    const handleImageIndex = (type) => {
        const maxLen = imageList.length;

        if (type === 'next' && imageIndex < maxLen) {
            setImageIndex(imageIndex + 1);
        }

        if (type === 'previous' && imageIndex > 0) {
            setImageIndex(imageIndex - 1);
        }
    }

    useEffect(() => {
        if (treatingBlade === null) return;

        const updateSelectWT = () => {
            const selectWT = document.getElementById('FP-selected-WT');

            if (selectWT !== null) {
                selectWT.value = treatingBlade.WT;
            } else {
                setTimeout(updateSelectWT, 500);
            }
        };

        updateSelectWT();

    }, [treatingBlade]);


    const handleNextSide = () => {
        console.log('Loading next side, please wait...')
        if (isDev) {
            setLoading(true);
            deleteAllFilesInDirectory()
            setTimeout(() => {
                setImageIndex(0);
                setImageList([]);
                setIsFirstImage(true);
                setIsOver(false);
                setLoadNextSide(true)
                delete workflow[treatingBlade.WT][treatingBlade.Component][treatingBlade.Side]['ImagesDone'];
                setWorkflow({ ...workflow, [treatingBlade.WT]: { ...workflow[treatingBlade.WT], [treatingBlade.Component]: { ...workflow[treatingBlade.WT][treatingBlade.Component], [treatingBlade.Side]: { ...workflow[treatingBlade.WT][treatingBlade.Component][treatingBlade.Side], State: 2 } } } });
            }, 1500);
        } else {
            setImageIndex(0);
            setLoadNextSide(true)
            setImageList([]);
            setIsFirstImage(true);
            setIsOver(false);
            setLoading(true);
            delete workflow[treatingBlade.WT][treatingBlade.Component][treatingBlade.Side]['ImagesDone'];
            setWorkflow({ ...workflow, [treatingBlade.WT]: { ...workflow[treatingBlade.WT], [treatingBlade.Component]: { ...workflow[treatingBlade.WT][treatingBlade.Component], [treatingBlade.Side]: { ...workflow[treatingBlade.WT][treatingBlade.Component][treatingBlade.Side], State: 2 } } } });
        }

    }

    const handleSetPending = (WT, Component, Side) => {
        setWorkflow({ ...workflow, [WT]: { ...workflow[WT], [Component]: { ...workflow[WT][Component], [Side]: { ...workflow[WT][Component][Side], State: 'pending', ImagesDone: 0 } } } });
    }



    // ***********************   //
    // END Form Submit and state//
    // *********************** //


    // ***********************   //
    // RECAP SIDE BY SIDE       //
    // *********************** //

    const [recapListForThisSide, setRecapListForThisSide] = useState([]);


    const handleSetRecapListForThisSide = () => {
        setRecapListForThisSide([]);
        console.log('Loading recap list for this side, please wait...')
        const pathToDamageSide = directoryPathFastProcess + '/' + treatingBlade.WT + '/' + treatingBlade.Component + '/' + treatingBlade.Side + '/' + 'SideDamage.json';
        fs.readFile(pathToDamageSide, 'utf8', (err, data) => {
            if (err) {
                console.error(err)
                return
            }
            const inspectionReport = JSON.parse(data);
            inspectionReport.DamageEntry.forEach((damage) => {
                setRecapListForThisSide((prevState) => {
                    return [...prevState, damage]
                }
                )
            }
            )


            setIsOver(true);
            setTimeout(() => {
                setLoading(false);
            }, 200);

        })

    }


    const handleDeleteDamage = (id) => {
        setLoading(true);
        const pathToDamageSide = directoryPathFastProcess + '/' + treatingBlade.WT + '/' + treatingBlade.Component + '/' + treatingBlade.Side + '/' + 'SideDamage.json';
        fs.readFile(pathToDamageSide, 'utf8', (err, data) => {
            if (err) {
                console.error(err)
                return
            }
            const inspectionReport = JSON.parse(data);
            inspectionReport.DamageEntry.forEach((damage) => {
                if (damage.id === id) {
                    console.log('one damage found :' + damage.u_failure_type)
                    const index = inspectionReport.DamageEntry.indexOf(damage);
                    if (index > -1) {
                        inspectionReport.DamageEntry.splice(index, 1);
                    }
                }
            }
            )

            recapListForThisSide.forEach((damage) => {
                if (damage.id === id) {
                    const index = recapListForThisSide.indexOf(damage);
                    if (index > -1) {
                        recapListForThisSide.splice(index, 1);
                    }
                }
            }
            )


            fs.writeFile(pathToDamageSide, JSON.stringify(inspectionReport), (err) => {
                if (err) {
                    console.error(err)
                    return
                }
                console.log('File SideDamage.json has been updated')
                setLoading(false);
            })
        }
        )
    };

    const handleChangeFailureType = (id, value) => {
        const pathToDamageSide = directoryPathFastProcess + '/' + treatingBlade.WT + '/' + treatingBlade.Component + '/' + treatingBlade.Side + '/' + 'SideDamage.json';
        fs.readFile(pathToDamageSide, 'utf8', (err, data) => {
            if (err) {
                console.error(err)
                return
            }
            const inspectionReport = JSON.parse(data);
            inspectionReport.DamageEntry.forEach((damage) => {
                if (damage.id === id) {
                    console.log('damage found ! : ' + damage.id)
                    damage.u_failure_type = value;
                }
            }
            )

            recapListForThisSide.forEach((damage) => {
                if (damage.id === id) {
                    damage.u_failure_type = value;
                }
            }
            )


            fs.writeFile(pathToDamageSide, JSON.stringify(inspectionReport), (err) => {
                if (err) {
                    console.error(err)
                    return
                }
                console.log('File SideDamage.json has been updated')
            }
            )
        })
    };

    const handleReturnToBlade = () => {
        handleImageIndex('previous')
    }

    const handleConfirmBlade = () => {
        handleNextSide();
    }



    // ***********************   //
    // END RECAP SIDE BY SIDE   //
    // *********************** //



    // *********************** //
    // PYTHON   **************//
    // ***********************//

    const handleScriptPython = (typeOfScript, params) => {
        const sortButton = document.getElementById('sortButton');
        sortButton.classList.add('hidden');
        ipcRenderer.send(typeOfScript, params)
    }

    const [logs, setLogs] = useState([]);
    const [showLogs, setShowLogs] = useState(false);

    if (!ipcRenderer.listenerCount("script-output")) {
        ipcRenderer.on("script-output", (event, data) => {
            const message = data
                .toString()
                .replace(/(?:\r\n|\r|\n)/g, ',') // normalize line endings
                .replace(ansiRegex({ onlyFirst: false }), '');
            setLogs((logs) => [...logs, message]);
        })
    }

    if (!ipcRenderer.listenerCount("script-finished")) {
        ipcRenderer.on("script-finished", (event, data) => {
            console.log("script-finished");
            fs.readFile(missionSheetFastProcess, 'utf8', (err, data) => {
                if (err) {
                    alert("An error ocurred reading the file :" + err.message);
                    return;
                }
                const parseData = JSON.parse(data);
                parseData.progression.step = 1;
                parseData.progression.date = new Date().toISOString();
                fs.writeFile(missionSheetFastProcess, JSON.stringify(parseData), (err) => {
                    if (err) {
                        console.log("An error ocurred creating the file " + err.message)
                    }
                }
                );
                setStep(1);
            })
        })
    }

    const handleShowLogs = () => {
        setShowLogs(!showLogs);
    }

    // *********************** //
    // END PYTHON   **********//
    // ***********************//





    // *********************** //
    // API call to get wheather data
    // *********************** //

    const [wheatherData, setWheatherData] = useState([])
    const [wheaterIsSet, setWheaterIsSet] = useState(false)
    const [wheatherError, setWheatherError] = useState(false)

    const requestWheather = async (location, date) => {
        try {
            const response = await fetch(`https://api.weatherapi.com/v1/history.json?key=1c18b9705c2d48f8aec73910231605&q=${location}&dt=${date}&hour=0&minute=0&fields=location,forecast.forecastday.date,forecast.forecastday.day.avgtemp_c,forecast.forecastday.day.avghumidity,forecast.forecastday.day.condition.text,forecast.forecastday.day.maxwind_kph`)
            const data = await response.json();
            console.log(data);
            // let mps = data['forecast']['forecastday'][0]['hour'][0]['wind_kph'] / 3.6;
            let mps = data['forecast']['forecastday'][0]['day']['maxwind_kph'] / 3.6;
            mps = Math.round(mps * 100) / 100;
            data['forecast']['forecastday'][0]['hour'][0]['wind_mps'] = mps;

            setWheatherData(data['forecast']['forecastday'][0]);
            setWheaterIsSet(true);
            setWheatherError(false);
        } catch (err) {
            console.log(err);
            setWheatherError(true);
        }
    }

    if (loading) {
        return (
            <div className="dashboard flex flex-col items-center hview">
                <Loader />
            </div>
        )
    }


    if (step === 0) {
        return (
            <div className="FastProcess NoSelectOnly hview">
                {/* Header details */}
                <div className='OptionMenu w-full h-1/12 bg-gray-100 text-dark flex flex-row justify-around items-center'>
                    {/* Parc Name */}
                    <div className="scale-75 text-xl lg:text-lg flex items-center">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="2"
                            stroke="currentColor"
                            className="w-6 h-6"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                        </svg>

                        <span className="pl-2"> {missionSheet.getWindFarmName()}</span>
                    </div>
                    {/* Inspecty by */}
                    <div className="scale-75 text-xl lg:text-lg flex items-center">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="2"
                            stroke="currentColor"
                            className="w-6 h-6"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                            />
                        </svg>
                        <span className="pl-2"> {missionSheet.getPilotName()} </span>
                    </div>
                    {/* Date */}
                    <div className="scale-75 text-xl lg:text-lg flex items-center">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="2"
                            stroke="currentColor"
                            className="w-6 h-6"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z"
                            />
                        </svg>
                        <span className="pl-2"> {missionSheet.getInspectionDate()} </span>
                    </div>
                    {/* Mission Type */}
                    <div className="scale-75 text-xl lg:text-lg flex items-center">
                        <img src="./images/svg/drone.svg" className="w-7 h-7"></img>
                        <span className="pl-2"> {missionSheet.getMissionType()} </span>
                    </div>
                    {/* Flight Type */}
                    <div className="scale-75 text-xl lg:text-lg flex items-center">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="2"
                            stroke="currentColor"
                            className="w-6 h-6"
                        >
                            <path
                                strokeLinecap="round"
                                d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"
                            />
                        </svg>
                        <span className="pl-2"> {missionSheet.getFlightType()} </span>
                    </div>
                    {/* WTG List */}
                    <div className="scale-75 text-xl lg:text-lg flex items-center">
                        <img src="./images/wind-power.png" alt="wtg" className="w-7 h-7" />

                        {/*  Create a select for every windturbine and the name */}
                        <select
                            id="FP-selected-WT"
                            className="bg-gray-100"
                            onChange={handleChangeSelectedWT}
                        >
                            {wtList.map((windTurbine) => (
                                <option key={windTurbine} value={windTurbine} className="lg:text-md md:text-sm">
                                    {windTurbine}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                {/* Main Content (left and right) */}
                <div className="h-11/12 flex flex-row w-full h-full justify-center text-xl font-bold">
                    {/* Left Part Of the Screen 3/12 */}
                    <div className='LeftVisual w-3/12 h-full flex flex-col justify-around'>
                        <div className='h-full flex flex-col'>
                            <div className='h-1/3 p-3 firstBlade bg-gray-100 flex flex-row justify-around'>
                                <div className='flex flex-col justify-around h-full'>
                                    <img className='h-3/4' src={'./images/fp_images/blade1.svg'} alt="blade1" />
                                    {ComponentList.length > 0 &&
                                        <p className='text-sm pt-6'> {ComponentList[0].name} </p>
                                    }
                                </div>
                                <div className='flex flex-col justify-between h-full'>
                                    <img className='h-3/4' src={'./images/wtgside/LE.svg'} alt="LE" />
                                    <p className='text-sm p-1'> LE </p>
                                </div>
                                <div className='flex flex-col  justify-between h-full'>
                                    <img className='h-3/4' src={'./images/wtgside/PS.svg'} alt="PS" />
                                    <p className='text-sm p-1'> PS </p>
                                </div>
                                <div className='flex flex-col justify-between h-full'>
                                    <img className='h-3/4' src={'./images/wtgside/SS.svg'} alt="SS" />
                                    <p className='text-sm p-1'> SS </p>
                                </div>
                                <div className='flex flex-col justify-between h-full'>
                                    <img className='h-3/4' src={'./images/wtgside/TE.svg'} alt="TE" />
                                    <p className='text-sm p-1'> TE </p>
                                </div>
                            </div>
                            <div className='h-1/3 p-3 firstBlade bg-gray-100 flex flex-row justify-around'>
                                <div className='flex flex-col justify-around h-full'>
                                    <img className='h-3/4' src={'./images/fp_images/blade2.svg'} alt="blade1" />
                                    {ComponentList.length > 0 &&
                                        <p className='text-sm pt-6'> {ComponentList[1].name} </p>
                                    }
                                </div>
                                <div className='flex flex-col justify-between h-full'>
                                    <img className='h-3/4' src={'./images/wtgside/LE.svg'} alt="LE" />
                                    <p className='text-sm p-1'> LE </p>
                                </div>
                                <div className='flex flex-col  justify-between h-full'>
                                    <img className='h-3/4' src={'./images/wtgside/PS.svg'} alt="PS" />
                                    <p className='text-sm p-1'> PS </p>
                                </div>
                                <div className='flex flex-col justify-between h-full'>
                                    <img className='h-3/4' src={'./images/wtgside/SS.svg'} alt="SS" />
                                    <p className='text-sm p-1'> SS </p>
                                </div>
                                <div className='flex flex-col justify-between h-full'>
                                    <img className='h-3/4' src={'./images/wtgside/TE.svg'} alt="TE" />
                                    <p className='text-sm p-1'> TE </p>
                                </div>
                            </div>
                            <div className='h-1/3 p-3 firstBlade bg-gray-100 flex flex-row justify-around'>
                                <div className='flex flex-col justify-around h-full'>
                                    <img className='h-3/4' src={'./images/fp_images/blade3.svg'} alt="blade1" />
                                    {ComponentList.length > 0 &&
                                        <p className='text-sm pt-6'> {ComponentList[2].name} </p>
                                    }
                                </div>
                                <div className='flex flex-col justify-between h-full'>
                                    <img className='h-3/4' src={'./images/wtgside/LE.svg'} alt="LE" />
                                    <p className='text-sm p-1'> LE </p>
                                </div>
                                <div className='flex flex-col  justify-between h-full'>
                                    <img className='h-3/4' src={'./images/wtgside/PS.svg'} alt="PS" />
                                    <p className='text-sm p-1'> PS </p>
                                </div>
                                <div className='flex flex-col justify-between h-full'>
                                    <img className='h-3/4' src={'./images/wtgside/SS.svg'} alt="SS" />
                                    <p className='text-sm p-1'> SS </p>
                                </div>
                                <div className='flex flex-col justify-between h-full'>
                                    <img className='h-3/4' src={'./images/wtgside/TE.svg'} alt="TE" />
                                    <p className='text-sm p-1'> TE </p>
                                </div>
                            </div>
                            {/* <div className='h-1/4 p-3 firstBlade bg-gray-100 flex flex-row justify-around'>
                                <div className='flex flex-col justify-around h-full'>
                                    <img className='h-3/4' src={'./images/fp_images/tower.svg'} alt="blade1" />
                                    {ComponentList.length > 0 &&
                                        <p className='text-sm pt-6'> {ComponentList[3].name} </p>
                                    }
                                </div>
                                <div className='flex flex-col justify-between h-full'>
                                    <img className='h-3/4' src={'./images/wtgside/LE.svg'} alt="LE" />
                                    <p className='text-sm p-1'> LE </p>
                                </div>
                                <div className='flex flex-col  justify-between h-full'>
                                    <img className='h-3/4' src={'./images/wtgside/PS.svg'} alt="PS" />
                                    <p className='text-sm p-1'> PS </p>
                                </div>
                                <div className='flex flex-col justify-between h-full'>
                                    <img className='h-3/4' src={'./images/wtgside/SS.svg'} alt="SS" />
                                    <p className='text-sm p-1'> SS </p>
                                </div>
                                <div className='flex flex-col justify-between h-full'>
                                    <img className='h-3/4' src={'./images/wtgside/TE.svg'} alt="TE" />
                                    <p className='text-sm p-1'> TE </p>
                                </div>
                            </div> */}
                        </div>
                    </div >
                    {/* Right Part Of the Screen 9/12 */}
                    < div className='RigthVisual w-9/12 h-full w-full flex justify-center items-center' >
                        <div className='w-full h-full'>
                            <div className='h-96 bg-white flex flex-col justify-between'>
                                <button id='sortButton' onClick={() => handleScriptPython('launch-sort', { nb: 5 })} > TEST </button>
                                <div>
                                    {selectedWT}
                                </div>
                                {showLogs &&
                                    <Console data={logs} />
                                }
                                {showLogs &&
                                    <div className='absolute bottom-0 right-0 flex justify-end pr-5'>
                                        <svg onClick={handleShowLogs} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 hover:cursor-pointer">
                                            <path fill='black' fillRule="evenodd" d="M12.53 16.28a.75.75 0 01-1.06 0l-7.5-7.5a.75.75 0 011.06-1.06L12 14.69l6.97-6.97a.75.75 0 111.06 1.06l-7.5 7.5z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                }


                                {!showLogs &&
                                    <div className='absolute bottom-0 right-0 flex justify-end pr-5'>
                                        <svg onClick={handleShowLogs} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 hover:cursor-pointer">
                                            <path fill='black' fillRule="evenodd" d="M11.47 7.72a.75.75 0 011.06 0l7.5 7.5a.75.75 0 11-1.06 1.06L12 9.31l-6.97 6.97a.75.75 0 01-1.06-1.06l7.5-7.5z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                }
                            </div>

                        </div>
                    </div >
                </div >
            </div >
        )
    } else if (step === 1 && formIsDone === false) {
        return (
            <div className="FastProcess NoSelectOnly hview overflow-hidden">
                {/* Header details */}
                <div className='OptionMenu w-full h-1/12 bg-gray-100 text-dark flex flex-row justify-around items-center'>
                    {/* Parc Name */}
                    <div className="scale-75 text-xl lg:text-lg flex items-center">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="2"
                            stroke="currentColor"
                            className="w-6 h-6"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                        </svg>

                        <span className="pl-2"> {missionSheet.getWindFarmName()}</span>
                    </div>
                    {/* Inspecty by */}
                    <div className="scale-75 text-xl lg:text-lg flex items-center">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="2"
                            stroke="currentColor"
                            className="w-6 h-6"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                            />
                        </svg>
                        <span className="pl-2"> {missionSheet.getPilotName()} </span>
                    </div>
                    {/* Date */}
                    <div className="scale-75 text-xl lg:text-lg flex items-center">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="2"
                            stroke="currentColor"
                            className="w-6 h-6"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z"
                            />
                        </svg>
                        <span className="pl-2"> {missionSheet.getInspectionDate()} </span>
                    </div>
                    {/* Mission Type */}
                    <div className="scale-75 text-xl lg:text-lg flex items-center">
                        <img src="./images/svg/drone.svg" className="w-7 h-7"></img>
                        <span className="pl-2"> {missionSheet.getMissionType()} </span>
                    </div>
                    {/* Flight Type */}
                    <div className="scale-75 text-xl lg:text-lg flex items-center">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="2"
                            stroke="currentColor"
                            className="w-6 h-6"
                        >
                            <path
                                strokeLinecap="round"
                                d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"
                            />
                        </svg>
                        <span className="pl-2"> {missionSheet.getFlightType()} </span>
                    </div>
                    {/* WTG List */}
                    <div className="scale-75 text-xl lg:text-lg flex items-center">
                        <img src="./images/wind-power.png" alt="wtg" className="w-7 h-7" />

                        {/*  Create a select for every windturbine and the name */}
                        <select
                            id="FP-selected-WT"
                            className="bg-gray-100"
                            onChange={handleChangeSelectedWT}
                        >
                            {wtList.map((windTurbine) => (
                                <option key={windTurbine} value={windTurbine} className="lg:text-md md:text-sm">
                                    {windTurbine}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                {/* Main Content (left and right) */}
                <div className="h-11/12 flex flex-row w-full h-full justify-center text-xl font-bold">
                    {/* Left Part Of the Screen 3/12 */}
                    <div className='LeftVisual w-3/12 h-11/12 flex flex-col justify-around'>
                        <div className='h-full flex flex-col'>
                            <div className='h-1/3 p-3 firstBlade bg-gray-100 flex flex-row justify-around'>
                                <div className='flex flex-col justify-around h-full'>
                                    <img className='h-3/4' src={'./images/fp_images/blade1.svg'} alt="blade1" />
                                    {ComponentList.length > 0 &&
                                        <p className='text-sm pt-6'> {ComponentList[0].name} </p>
                                    }
                                </div>
                                <div className='flex flex-col justify-between h-full'>
                                    <img className='h-3/4' src={'./images/wtgside/LE.svg'} alt="LE" />
                                    <p className='text-sm p-1'> LE </p>
                                </div>
                                <div className='flex flex-col  justify-between h-full'>
                                    <img className='h-3/4' src={'./images/wtgside/PS.svg'} alt="PS" />
                                    <p className='text-sm p-1'> PS </p>
                                </div>
                                <div className='flex flex-col justify-between h-full'>
                                    <img className='h-3/4' src={'./images/wtgside/SS.svg'} alt="SS" />
                                    <p className='text-sm p-1'> SS </p>
                                </div>
                                <div className='flex flex-col justify-between h-full'>
                                    <img className='h-3/4' src={'./images/wtgside/TE.svg'} alt="TE" />
                                    <p className='text-sm p-1'> TE </p>
                                </div>
                            </div>
                            <div className='h-1/3 p-3 firstBlade bg-gray-100 flex flex-row justify-around'>
                                <div className='flex flex-col justify-around h-full'>
                                    <img className='h-3/4' src={'./images/fp_images/blade2.svg'} alt="blade1" />
                                    {ComponentList.length > 0 &&
                                        <p className='text-sm pt-6'> {ComponentList[1].name} </p>
                                    }
                                </div>
                                <div className='flex flex-col justify-between h-full'>
                                    <img className='h-3/4' src={'./images/wtgside/LE.svg'} alt="LE" />
                                    <p className='text-sm p-1'> LE </p>
                                </div>
                                <div className='flex flex-col  justify-between h-full'>
                                    <img className='h-3/4' src={'./images/wtgside/PS.svg'} alt="PS" />
                                    <p className='text-sm p-1'> PS </p>
                                </div>
                                <div className='flex flex-col justify-between h-full'>
                                    <img className='h-3/4' src={'./images/wtgside/SS.svg'} alt="SS" />
                                    <p className='text-sm p-1'> SS </p>
                                </div>
                                <div className='flex flex-col justify-between h-full'>
                                    <img className='h-3/4' src={'./images/wtgside/TE.svg'} alt="TE" />
                                    <p className='text-sm p-1'> TE </p>
                                </div>
                            </div>
                            <div className='h-1/3 p-3 firstBlade bg-gray-100 flex flex-row justify-around'>
                                <div className='flex flex-col justify-around h-full'>
                                    <img className='h-3/4' src={'./images/fp_images/blade3.svg'} alt="blade1" />
                                    {ComponentList.length > 0 &&
                                        <p className='text-sm pt-6'> {ComponentList[2].name} </p>
                                    }
                                </div>
                                <div className='flex flex-col justify-between h-full'>
                                    <img className='h-3/4' src={'./images/wtgside/LE.svg'} alt="LE" />
                                    <p className='text-sm p-1'> LE </p>
                                </div>
                                <div className='flex flex-col  justify-between h-full'>
                                    <img className='h-3/4' src={'./images/wtgside/PS.svg'} alt="PS" />
                                    <p className='text-sm p-1'> PS </p>
                                </div>
                                <div className='flex flex-col justify-between h-full'>
                                    <img className='h-3/4' src={'./images/wtgside/SS.svg'} alt="SS" />
                                    <p className='text-sm p-1'> SS </p>
                                </div>
                                <div className='flex flex-col justify-between h-full'>
                                    <img className='h-3/4' src={'./images/wtgside/TE.svg'} alt="TE" />
                                    <p className='text-sm p-1'> TE </p>
                                </div>
                            </div>
                            {/* <div className='h-1/4 p-3 firstBlade bg-gray-100 flex flex-row justify-around'>
                                <div className='flex flex-col justify-around h-full'>
                                    <img className='h-3/4' src={'./images/fp_images/tower.svg'} alt="blade1" />
                                    {ComponentList.length > 0 &&
                                        <p className='text-sm pt-6'> {ComponentList[3].name} </p>
                                    }
                                </div>
                                <div className='flex flex-col justify-between h-full'>
                                    <img className='h-3/4' src={'./images/wtgside/LE.svg'} alt="LE" />
                                    <p className='text-sm p-1'> LE </p>
                                </div>
                                <div className='flex flex-col  justify-between h-full'>
                                    <img className='h-3/4' src={'./images/wtgside/PS.svg'} alt="PS" />
                                    <p className='text-sm p-1'> PS </p>
                                </div>
                                <div className='flex flex-col justify-between h-full'>
                                    <img className='h-3/4' src={'./images/wtgside/SS.svg'} alt="SS" />
                                    <p className='text-sm p-1'> SS </p>
                                </div>
                                <div className='flex flex-col justify-between h-full'>
                                    <img className='h-3/4' src={'./images/wtgside/TE.svg'} alt="TE" />
                                    <p className='text-sm p-1'> TE </p>
                                </div>
                            </div> */}
                        </div>
                    </div >
                    {/* Right Part Of the Screen 9/12 */}
                    <div className='RigthVisual w-9/12 h-11/12 w-full flex flex-col justify-center items-center' >
                        <p className='mb-20 mr-20 '> Please fill the form for the WT : {treatingBlade.WT} </p>
                        <form className="w-full" onSubmit={handleSubmitForm}>
                            <div className='pl-5 pr-5 w-full flex justify-around'>
                                {/* WT DETAILS */}
                                <div className="w-1/4 text-left flex flex-col">
                                    <p className='mb-5'>WT Details</p>
                                    <div className="relative z-0 w-3/4 mb-6 group">
                                        <input type="text" name="turbine_id" id="turbine_id" className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-black dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer" placeholder=" " required />
                                        <label htmlFor="turbine_id" className="peer-focus:font-medium absolute text-sm text-gray-500 dark:text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:left-0 peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">Wind Turbine ID *</label>
                                    </div>
                                    <div className="relative z-0 w-3/4 mb-6 group">
                                        <input type="text" name="incident" id="incident" className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-black dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer" placeholder=" " required />
                                        <label htmlFor="incident" className="peer-focus:font-medium absolute text-sm text-gray-500 dark:text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:left-0 peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">N°Incident *</label>
                                    </div>
                                    <div className="relative z-0 w-3/4 mb-6 group">
                                        <input type="text" name="responsible_technicians" id="responsible_technicians" className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-black dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer" placeholder=" " required />
                                        <label htmlFor="responsible_technicians" className="peer-focus:font-medium absolute text-sm text-gray-500 dark:text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:left-0 peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">Responsible Technicians *</label>
                                    </div>
                                    <div className="relative z-0 w-3/4 mb-6 group">
                                        <select defaultValue={'Visual inspection: Drone'} name="inspection_type" id="inspection_type" className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-black dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer" placeholder=" " >
                                            <option value="Touch inspection: Mobile Elevating Platform MEWM (cherry picker)">Touch inspection: Mobile Elevating Platform MEWM (cherry picker)</option>
                                            <option value="Visual inspection: Drone">Visual inspection: Drone</option>
                                            <option value="Visual inspection: On ground">Visual inspection: On ground</option>
                                            <option value="Visual inspection: Other">Visual inspection: Other</option>
                                            <option value="Visual inspection: Tower climb robot">Visual inspection: Tower climb robot</option>
                                            <option value="Touch inspection: On ground">Touch inspection: On ground</option>
                                            <option value="Touch inspection: Rope">Touch inspection: Rope</option>
                                            <option value="Touch inspection: Suspended platform">Touch inspection: Suspended platform</option>
                                        </select>
                                    </div>
                                    {/* div safety_checklist true or false */}
                                    {/* <div className="relative z-0 w-3/4 mb-6 group text-sm">
                                        <p className='mb-3'>Safety Checklist</p>
                                        <div className="flex items-center">
                                            <input type="radio" id="safety_checklist" name="safety_checklist" value="true" defaultChecked className="mr-2" />
                                            <label htmlFor="safety_checklist" className="mr-6">Yes</label>
                                            <input type="radio" id="safety_checklist" name="safety_checklist" value="false" className="mr-2" />
                                            <label htmlFor="safety_checklist">No</label>
                                        </div>
                                    </div> */}
                                    <div className="relative z-0 w-3/4 mb-6 group">
                                        <textarea type="text" name="general_remarks" id="general_remarks" className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-black dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer" placeholder=" " />
                                        <label htmlFor="general_remarks" className="peer-focus:font-medium absolute text-sm text-gray-500 dark:text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:left-0 peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">General Remarks</label>
                                    </div>
                                </div>
                                {/* BLADES DETAILS */}
                                <div className="w-1/4 flex flex-col text-left">
                                    <p className='mb-5'>Blades Details</p>
                                    <div className="relative z-0 w-3/4 mb-6 group">
                                        <select defaultValue={'Blade Model'} name="blade_model" id="blade_model" className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-black dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer" placeholder=" " required>
                                            <option value="Blade Model" disabled>Blade Model</option>
                                            {/* <option value="APX 60">APX60</option> */}
                                            <option value="AW 34.0">AW34.0</option>
                                            <option value="AW 37.5">AW37.5</option>
                                            <option value="AW 37.5_2">AW37.5_2</option>
                                            <option value="AW 40.3">AW40.3</option>
                                            <option value="AW 56.7">AW56.7</option>
                                            <option value="AW 56.7_1">AW56.7_1</option>
                                            <option value="AW 61.2">AW61.2</option>
                                            <option value="AW 64.6">AW64.6</option>
                                            <option value="AW 64.7">AW64.7</option>
                                            <option value="AW 68.7">AW68.7</option>
                                            <option value="AW 72.4">AW72.4</option>
                                            <option value="LM 29">LM29</option>
                                            <option value="LM 34.0">LM34.0</option>
                                            <option value="LM 37.3">LM37.3</option>
                                            <option value="LM 38.8">LM38.8</option>
                                            <option value="LM 40.3">LM40.3</option>
                                            <option value="LM 43.8">LM43.8</option>
                                            <option value="LM 48.8">LM48.8</option>
                                            {/* <option value="NOI 34.0">NOI34.0</option>
                                            <option value="NOI 37.5">NOI37.5</option> */}
                                            <option value="NR 34.0">NR34.0</option>
                                            <option value="NR 37.5">NR37.5</option>
                                            <option value="NR 45">NR45</option>
                                            <option value="NR 50">NR50</option>
                                            <option value="NR 58.5">NR58.5</option>
                                            <option value="NR 65.5">NR65.5</option>
                                            <option value="NR 74.5">NR74.5</option>
                                            <option value="NR 77.5">NR77.5</option>
                                            <option value="NR 81.5">NR81.5</option>Pa
                                            <option value="NR 87.5">NR87.5</option>
                                        </select>

                                    </div>
                                    <div className="relative z-0 w-3/4 mb-6 group">
                                        <input type="text" name="blade_A_serial" id="blade_A_serial" className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-black dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer" placeholder=" " required />
                                        <label htmlFor="blade_A_serial" className="peer-focus:font-medium absolute text-sm text-gray-500 dark:text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:left-0 peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">Blade A Serial Number *</label>
                                    </div>
                                    <div className="relative z-0 w-3/4 mb-6 group">
                                        <input type="text" name="blade_B_serial" id="blade_B_serial" className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-black dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer" placeholder=" " required />
                                        <label htmlFor="blade_B_serial" className="peer-focus:font-medium absolute text-sm text-gray-500 dark:text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:left-0 peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">Blade B Serial Number *</label>
                                    </div>
                                    <div className="relative z-0 w-3/4 mb-6 group">
                                        <input type="text" name="blade_C_serial" id="blade_C_serial" className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-black dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer" placeholder=" " required />
                                        <label htmlFor="blade_C_serial" className="peer-focus:font-medium absolute text-sm text-gray-500 dark:text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:left-0 peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">Blade C Serial Number *</label>
                                    </div>
                                </div>
                                {/* OTHER DETAILS, MAINLY AUTO */}
                                <div className="w-1/4 flex flex-col text-left">
                                    <p className='mb-5'>Other Details</p>
                                    <div className="relative z-0 w-3/4 mb-6 group text-sm">
                                        <label htmlFor="inspection_date">Inspection Date : </label>
                                        <input
                                            type="date"
                                            id="inspection_date"
                                            defaultValue={missionSheetData.inspection_date}
                                        />
                                    </div>
                                    {/* Inspection break, checkbox and if check ask number */}
                                    <div className="relative z-0 w-3/4 mb-6 group text-sm">
                                        <label htmlFor="inspection_break">Inspection Break : </label>
                                        <input
                                            type="checkbox"
                                            id="inspection_break"
                                            name="inspection_break"
                                            value="true"
                                            onChange={() => setInspectionBreak(!inspectionBreak)}
                                        />
                                    </div>
                                    {inspectionBreak && <div className="relative z-0 w-3/4 mb-6 group text-sm">
                                        <label htmlFor="inspection_break_number">Inspection Break Number : </label>
                                        <input
                                            type="number"
                                            id="inspection_break_number"
                                            name="inspection_break_number"
                                            defaultValue='1'
                                        />
                                    </div>}
                                    {/* stop date if inspectionBreak */}
                                    {inspectionBreak && <div className="relative z-0 w-3/4 mb-6 group text-sm">
                                        <label htmlFor="stop_date">Stop Date : </label>
                                        <input
                                            type="date"
                                            id="stop_date"
                                            name="stop_date"
                                            defaultValue={missionSheetData.inspection_date}
                                        />
                                    </div>}
                                    {/* restart date if inspectionBreak */}
                                    {inspectionBreak && <div className="relative z-0 w-3/4 mb-6 group text-sm">
                                        <label htmlFor="restart_date">Restart Date : </label>
                                        <input
                                            type="date"
                                            id="restart_date"
                                            name="restart_date"
                                            defaultValue={missionSheetData.inspection_date}
                                        />
                                    </div>}
                                    {/* inspection end date */}
                                    <div className="relative z-0 w-3/4 mb-6 group text-sm">
                                        <label htmlFor="inspection_end_date">Inspection End Date : </label>
                                        <input
                                            type="date"
                                            id="inspection_end_date"
                                            defaultValue={missionSheetData.inspection_date}
                                        />
                                    </div>
                                    {/* <div className="relative z-0 w-3/4 mb-6 group text-sm border-2 p-1">
                                        <p className="text-sm mb-2">Blade A drain hole inspected:</p>
                                        <div className="flex items-center">
                                            <input type="radio" id="blade_a_drain_hole" name="blade_a_drain_hole" value="true" className="mr-2" />
                                            <label htmlFor="blade_a_drain_hole" className="mr-6">Yes</label>
                                            <input type="radio" id="blade_a_drain_hole" name="blade_a_drain_hole" value="false" defaultChecked className="mr-2" />
                                            <label htmlFor="blade_a_drain_hole">No</label>
                                        </div>
                                        <p className="text-sm mb-2 mt-2">Blade A drain hole status:</p>
                                        <div className="flex items-center">
                                            <input type="radio" id="blade_a_drain_hole_status" name="blade_a_drain_hole_status" value="open" defaultChecked className="mr-2" />
                                            <label htmlFor="blade_a_drain_hole_status" className="mr-6">Open</label>
                                            <input type="radio" id="blade_a_drain_hole_close" name="blade_a_drain_hole_status" value="close" className="mr-2" />
                                            <label htmlFor="blade_a_drain_hole_close">Close</label>
                                        </div>
                                    </div>
                                    <div className="relative z-0 w-3/4 mb-6 group text-sm border-2 p-1">
                                        <p className="text-sm mb-2">Blade B drain hole inspected:</p>
                                        <div className="flex items-center justify-start">
                                            <input type="radio" id="blade_b_drain_hole" name="blade_b_drain_hole" value="true" className="mr-2" />
                                            <label htmlFor="blade_b_drain_hole" className="mr-6">Yes</label>
                                            <input type="radio" id="blade_b_drain_hole" name="blade_b_drain_hole" value="false" defaultChecked className="mr-2" />
                                            <label htmlFor="blade_b_drain_hole">No</label>
                                        </div>
                                        <p className="text-sm mb-2 mt-2">Blade B drain hole status:</p>
                                        <div className="flex items-center justify-start">
                                            <input type="radio" id="blade_b_drain_hole_status" name="blade_b_drain_hole_status" value="open" defaultChecked className="mr-2" />
                                            <label htmlFor="blade_b_drain_hole_open" className="mr-6">Open</label>
                                            <input type="radio" id="blade_b_drain_hole_status" name="blade_b_drain_hole_status" value="close" className="mr-2" />
                                            <label htmlFor="blade_b_drain_hole_status">Close</label>
                                        </div>
                                    </div>
                                    <div className="relative z-0 w-3/4 mb-6 group text-sm  border-2 p-1">
                                        <p className="text-sm mb-2">Blade C drain hole inspected:</p>
                                        <div className="flex items-center">
                                            <input type="radio" id="blade_c_drain_hole" name="blade_c_drain_hole" value="true" className="mr-2" />
                                            <label htmlFor="blade_c_drain_hole" className="mr-6">Yes</label>
                                            <input type="radio" id="blade_c_drain_hole" name="blade_c_drain_hole" value="false" defaultChecked className="mr-2" />
                                            <label htmlFor="blade_c_drain_hole">No</label>
                                        </div>
                                        <p className="text-sm mb-2 mt-2">Blade C drain hole status:</p>
                                        <div className="flex items-center">
                                            <input type="radio" id="blade_c_drain_hole_status" name="blade_c_drain_hole_status" value="open" defaultChecked className="mr-2" />
                                            <label htmlFor="blade_c_drain_hole_open" className="mr-6">Open</label>
                                            <input type="radio" id="blade_c_drain_hole_status" name="blade_c_drain_hole_status" value="close" className="mr-2" />
                                            <label htmlFor="blade_c_drain_hole_status">Close</label>
                                        </div>
                                    </div> */}
                                </div>
                                {/* WEATHER DETAILS */}
                                <div className="w-1/4 flex flex-col text-left">
                                    <p className='mb-5'>Weather Details *</p>
                                    <div className="relative z-0 w-3/4 mb-6 group">
                                        <input type="text" name="location" id="location" className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-black dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer" placeholder=" " />
                                        <label htmlFor="location" className="peer-focus:font-medium absolute text-sm text-gray-500 dark:text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:left-0 peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">Location</label>
                                    </div>
                                    {!wheatherError &&
                                        <div onClick={() => requestWheather(document.getElementById('location').value, missionSheetData.inspection_date)} className="mr-20 text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800 mt-10 hover:cursor-pointer">Get Weather</div>
                                    }
                                    {wheatherError &&
                                        <div className="mr-20 text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800 mt-10 hover:cursor-pointer" onClick={openWebWeather}>Open Web Wheater</div>
                                    }
                                    {wheatherError &&
                                        <div className='mt-10'>
                                            <div className="relative z-0 w-3/4 mb-6 group">
                                                <input required type="text" name="condition" id="condition" className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-black dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer" placeholder=" " />
                                                <label htmlFor="condition" className="peer-focus:font-medium absolute text-sm text-gray-500 dark:text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:left-0 peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">Condition</label>
                                            </div>
                                            <div className="relative z-0 w-3/4 mb-6 group">
                                                <input required type="text" name="humidity" id="humidity" className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-black dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer" placeholder=" " />
                                                <label htmlFor="humidity" className="peer-focus:font-medium absolute text-sm text-gray-500 dark:text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:left-0 peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">Humidity</label>
                                            </div>
                                            <div className="relative z-0 w-3/4 mb-6 group">
                                                <input required type="text" name="wind_speed" id="wind_speed" className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-black dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer" placeholder=" " />
                                                <label htmlFor="wind_speed" className="peer-focus:font-medium absolute text-sm text-gray-500 dark:text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:left-0 peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">Wind Speed</label>
                                            </div>
                                            <div className="relative z-0 w-3/4 mb-6 group">
                                                <input required type="text" name="temperature" id="temperature" className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-black dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer" placeholder=" " />
                                                <label htmlFor="temperature" className="peer-focus:font-medium absolute text-sm text-gray-500 dark:text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:left-0 peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">Temperature</label>
                                            </div>
                                        </div>

                                    }
                                    {wheaterIsSet &&
                                        <div className='mt-10'>
                                            <p> Date : {missionSheetData.inspection_date} </p>
                                            <p> Condition : {wheatherData['day']['condition'].text}</p>
                                            <p> Humidity : {wheatherData['day'].avghumidity}</p>
                                            <p> Wind Speed : {wheatherData['hour'][0].wind_mps}</p>
                                            <p> Temperature : {wheatherData['day'].avgtemp_c}</p>
                                        </div>
                                    }
                                </div>
                            </div>
                            <button type="submit" className="mr-20 text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800 mt-10">Submit</button>
                        </form>
                    </div>
                </div >
            </div >
        )
    }
    else if (step === 1 && formIsDone === true) {
        return (
            <div className="FastProcess NoSelectOnly hview overflow-hidden">
                {/* Header details */}
                <div className='OptionMenu w-full h-1/12 bg-gray-100 text-dark flex flex-row justify-around items-center'>
                    {/* Parc Name */}
                    <div className="scale-75 text-xl lg:text-lg flex items-center">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="2"
                            stroke="currentColor"
                            className="w-6 h-6"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                        </svg>

                        <span className="pl-2"> {missionSheet.getWindFarmName()}</span>
                    </div>
                    {/* Inspecty by */}
                    <div className="scale-75 text-xl lg:text-lg flex items-center">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="2"
                            stroke="currentColor"
                            className="w-6 h-6"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                            />
                        </svg>
                        <span className="pl-2"> {missionSheet.getPilotName()} </span>
                    </div>
                    {/* Date */}
                    <div className="scale-75 text-xl lg:text-lg flex items-center">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="2"
                            stroke="currentColor"
                            className="w-6 h-6"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z"
                            />
                        </svg>
                        <span className="pl-2"> {missionSheet.getInspectionDate()} </span>
                    </div>
                    {/* Mission Type */}
                    <div className="scale-75 text-xl lg:text-lg flex items-center">
                        <img src="./images/svg/drone.svg" className="w-7 h-7"></img>
                        <span className="pl-2"> {missionSheet.getMissionType()} </span>
                    </div>
                    {/* Flight Type */}
                    <div className="scale-75 text-xl lg:text-lg flex items-center">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="2"
                            stroke="currentColor"
                            className="w-6 h-6"
                        >
                            <path
                                strokeLinecap="round"
                                d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"
                            />
                        </svg>
                        <span className="pl-2"> {missionSheet.getFlightType()} </span>
                    </div>
                    {/* WTG List */}
                    <div className="scale-75 text-xl lg:text-lg flex items-center">
                        <img src="./images/wind-power.png" alt="wtg" className="w-7 h-7" />

                        {/*  Create a select for every windturbine and the name */}
                        <select
                            id="FP-selected-WT"
                            className="bg-gray-100"
                            onChange={handleChangeSelectedWT}
                        >
                            {wtList.map((windTurbine) => (
                                <option key={windTurbine} value={windTurbine} className="lg:text-md md:text-sm">
                                    {windTurbine}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                {/* Main Content (left and right) */}
                <div className="h-11/12 flex flex-row w-full h-full justify-center text-xl font-bold">
                    {/* Left Part Of the Screen 3/12 */}
                    <div className='LeftVisual w-3/12 h-11/12 flex flex-col justify-around'>
                        <div className='h-full flex flex-col'>
                            <div className='h-1/3 p-3 firstBlade bg-gray-100 flex flex-row justify-around'>
                                <div className='flex flex-col justify-around h-full'>
                                    <img className='h-3/4' src={'./images/fp_images/blade1.svg'} alt="blade1" />
                                    {ComponentList.length > 0 &&
                                        <p className='text-sm pt-6'> {ComponentList[0].name} </p>
                                    }
                                </div>
                                <div id={ComponentList[0].name + 'LE'} className='flex flex-col justify-between h-full'>
                                    {workflow[treatingBlade.WT][ComponentList[0].name]['LE']['State'] === 1 &&
                                        <img className='h-3/4' src={'./images/wtgside/LE.svg'} alt="LE" />
                                    }
                                    {workflow[treatingBlade.WT][ComponentList[0].name]['LE']['State'] === 'pending' &&
                                        <img className='h-3/4 outline-dotted outline-2 outline-offset-2 outline-orange rounded-lg' src={'./images/wtgside/LE.svg'} alt="LE" />
                                    }
                                    {workflow[treatingBlade.WT][ComponentList[0].name]['LE']['State'] === 2 &&
                                        <img className='h-3/4' src={'./images/wtgside/LE_END.svg'} alt="LE" />
                                    }
                                    <p className='text-sm p-1'> LE </p>
                                </div>
                                <div id={ComponentList[0].name + 'PS'} className='flex flex-col  justify-between h-full'>
                                    {/* <img className='h-3/4' src={'./images/wtgside/PS.svg'} alt="PS" /> */}
                                    {workflow[treatingBlade.WT][ComponentList[0].name]['PS']['State'] === 1 &&
                                        <img className='h-3/4' src={'./images/wtgside/PS.svg'} alt="PS" />
                                    }
                                    {workflow[treatingBlade.WT][ComponentList[0].name]['PS']['State'] === 'pending' &&
                                        <img className='h-3/4 outline-dotted outline-2 outline-offset-2 outline-orange rounded-lg' src={'./images/wtgside/PS.svg'} alt="PS" />
                                    }
                                    {workflow[treatingBlade.WT][ComponentList[0].name]['PS']['State'] === 2 &&
                                        <img className='h-3/4' src={'./images/wtgside/PS_END.svg'} alt="PS" />
                                    }
                                    <p className='text-sm p-1'> PS </p>
                                </div>
                                <div id={ComponentList[0].name + 'SS'} className='flex flex-col justify-between h-full'>
                                    {/* <img className='h-3/4' src={'./images/wtgside/SS.svg'} alt="SS" /> */}
                                    {workflow[treatingBlade.WT][ComponentList[0].name]['SS']['State'] === 1 &&
                                        <img className='h-3/4' src={'./images/wtgside/SS.svg'} alt="SS" />
                                    }
                                    {workflow[treatingBlade.WT][ComponentList[0].name]['SS']['State'] === 'pending' &&
                                        <img className='h-3/4 outline-dotted outline-2 outline-offset-2 outline-orange rounded-lg' src={'./images/wtgside/SS.svg'} alt="SS" />
                                    }
                                    {workflow[treatingBlade.WT][ComponentList[0].name]['SS']['State'] === 2 &&
                                        <img className='h-3/4' src={'./images/wtgside/SS_END.svg'} alt="SS" />
                                    }
                                    <p className='text-sm p-1'> SS </p>
                                </div>
                                <div id={ComponentList[0].name + 'TE'} className='flex flex-col justify-between h-full'>
                                    {/* <img className='h-3/4' src={'./images/wtgside/TE.svg'} alt="TE" /> */}
                                    {workflow[treatingBlade.WT][ComponentList[0].name]['TE']['State'] === 1 &&
                                        <img className='h-3/4' src={'./images/wtgside/TE.svg'} alt="TE" />
                                    }
                                    {workflow[treatingBlade.WT][ComponentList[0].name]['TE']['State'] === 'pending' &&
                                        <img className='h-3/4 outline-dotted outline-2 outline-offset-2 outline-orange rounded-lg' src={'./images/wtgside/TE.svg'} alt="TE" />
                                    }
                                    {workflow[treatingBlade.WT][ComponentList[0].name]['TE']['State'] === 2 &&
                                        <img className='h-3/4' src={'./images/wtgside/TE_END.svg'} alt="TE" />
                                    }
                                    <p className='text-sm p-1'> TE </p>
                                </div>
                            </div>
                            <div className='h-1/3 p-3 firstBlade bg-gray-100 flex flex-row justify-around'>
                                <div className='flex flex-col justify-around h-full'>
                                    <img className='h-3/4' src={'./images/fp_images/blade2.svg'} alt="blade1" />
                                    {ComponentList.length > 0 &&
                                        <p className='text-sm pt-6'> {ComponentList[1].name} </p>
                                    }
                                </div>
                                <div id={ComponentList[1].name + 'LE'} className='flex flex-col justify-between h-full'>
                                    {/* <img className='h-3/4' src={'./images/wtgside/LE.svg'} alt="LE" /> */}
                                    {workflow[treatingBlade.WT][ComponentList[1].name]['LE']['State'] === 1 &&
                                        <img className='h-3/4' src={'./images/wtgside/LE.svg'} alt="LE" />
                                    }
                                    {workflow[treatingBlade.WT][ComponentList[1].name]['LE']['State'] === 'pending' &&
                                        <img className='h-3/4 outline-dotted outline-2 outline-offset-2 outline-orange rounded-lg' src={'./images/wtgside/LE.svg'} alt="LE" />
                                    }
                                    {workflow[treatingBlade.WT][ComponentList[1].name]['LE']['State'] === 2 &&
                                        <img className='h-3/4' src={'./images/wtgside/LE_END.svg'} alt="LE" />
                                    }
                                    <p className='text-sm p-1'> LE </p>
                                </div>
                                <div id={ComponentList[1].name + 'PS'} className='flex flex-col  justify-between h-full'>
                                    {/* <img className='h-3/4' src={'./images/wtgside/PS.svg'} alt="PS" /> */}
                                    {workflow[treatingBlade.WT][ComponentList[1].name]['PS']['State'] === 1 &&
                                        <img className='h-3/4' src={'./images/wtgside/PS.svg'} alt="PS" />
                                    }
                                    {workflow[treatingBlade.WT][ComponentList[1].name]['PS']['State'] === 'pending' &&
                                        <img className='h-3/4 outline-dotted outline-2 outline-offset-2 outline-orange rounded-lg' src={'./images/wtgside/PS.svg'} alt="PS" />
                                    }
                                    {workflow[treatingBlade.WT][ComponentList[1].name]['PS']['State'] === 2 &&
                                        <img className='h-3/4' src={'./images/wtgside/PS_END.svg'} alt="PS" />
                                    }
                                    <p className='text-sm p-1'> PS </p>
                                </div>
                                <div id={ComponentList[1].name + 'SS'} className='flex flex-col justify-between h-full'>
                                    {/* <img className='h-3/4' src={'./images/wtgside/SS.svg'} alt="SS" /> */}
                                    {workflow[treatingBlade.WT][ComponentList[1].name]['SS']['State'] === 1 &&
                                        <img className='h-3/4' src={'./images/wtgside/SS.svg'} alt="SS" />
                                    }
                                    {workflow[treatingBlade.WT][ComponentList[1].name]['SS']['State'] === 'pending' &&
                                        <img className='h-3/4 outline-dotted outline-2 outline-offset-2 outline-orange rounded-lg' src={'./images/wtgside/SS.svg'} alt="SS" />
                                    }
                                    {workflow[treatingBlade.WT][ComponentList[1].name]['SS']['State'] === 2 &&
                                        <img className='h-3/4' src={'./images/wtgside/SS_END.svg'} alt="SS" />
                                    }
                                    <p className='text-sm p-1'> SS </p>
                                </div>
                                <div id={ComponentList[1].name + 'TE'} className='flex flex-col justify-between h-full'>
                                    {/* <img className='h-3/4' src={'./images/wtgside/TE.svg'} alt="TE" /> */}
                                    {workflow[treatingBlade.WT][ComponentList[1].name]['TE']['State'] === 1 &&
                                        <img className='h-3/4' src={'./images/wtgside/TE.svg'} alt="TE" />
                                    }
                                    {workflow[treatingBlade.WT][ComponentList[1].name]['TE']['State'] === 'pending' &&
                                        <img className='h-3/4 outline-dotted outline-2 outline-offset-2 outline-orange rounded-lg' src={'./images/wtgside/TE.svg'} alt="TE" />
                                    }
                                    {workflow[treatingBlade.WT][ComponentList[1].name]['TE']['State'] === 2 &&
                                        <img className='h-3/4' src={'./images/wtgside/TE_END.svg'} alt="TE" />
                                    }
                                    <p className='text-sm p-1'> TE </p>
                                </div>
                            </div>
                            <div className='h-1/3 p-3 firstBlade bg-gray-100 flex flex-row justify-around'>
                                <div className='flex flex-col justify-around h-full'>
                                    <img className='h-3/4' src={'./images/fp_images/blade3.svg'} alt="blade1" />
                                    {ComponentList.length > 0 &&
                                        <p className='text-sm pt-6'> {ComponentList[2].name} </p>
                                    }
                                </div>
                                <div id={ComponentList[2].name + 'LE'} className='flex flex-col justify-between h-full'>
                                    {/* <img className='h-3/4' src={'./images/wtgside/LE.svg'} alt="LE" /> */}
                                    {workflow[treatingBlade.WT][ComponentList[2].name]['LE']['State'] === 1 &&
                                        <img className='h-3/4' src={'./images/wtgside/LE.svg'} alt="LE" />
                                    }
                                    {workflow[treatingBlade.WT][ComponentList[2].name]['LE']['State'] === 'pending' &&
                                        <img className='h-3/4 outline-dotted outline-2 outline-offset-2 outline-orange rounded-lg' src={'./images/wtgside/LE.svg'} alt="LE" />
                                    }
                                    {workflow[treatingBlade.WT][ComponentList[2].name]['LE']['State'] === 2 &&
                                        <img className='h-3/4' src={'./images/wtgside/LE_END.svg'} alt="LE" />
                                    }
                                    <p className='text-sm p-1'> LE </p>
                                </div>
                                <div id={ComponentList[2].name + 'PS'} className='flex flex-col  justify-between h-full'>
                                    {/* <img className='h-3/4' src={'./images/wtgside/PS.svg'} alt="PS" /> */}
                                    {workflow[treatingBlade.WT][ComponentList[2].name]['PS']['State'] === 1 &&
                                        <img className='h-3/4' src={'./images/wtgside/PS.svg'} alt="PS" />
                                    }
                                    {workflow[treatingBlade.WT][ComponentList[2].name]['PS']['State'] === 'pending' &&
                                        <img className='h-3/4 outline-dotted outline-2 outline-offset-2 outline-orange rounded-lg' src={'./images/wtgside/PS.svg'} alt="PS" />
                                    }
                                    {workflow[treatingBlade.WT][ComponentList[2].name]['PS']['State'] === 2 &&
                                        <img className='h-3/4' src={'./images/wtgside/PS_END.svg'} alt="PS" />
                                    }
                                    <p className='text-sm p-1'> PS </p>
                                </div>
                                <div id={ComponentList[2].name + 'SS'} className='flex flex-col justify-between h-full'>
                                    {/* <img className='h-3/4' src={'./images/wtgside/SS.svg'} alt="SS" /> */}
                                    {workflow[treatingBlade.WT][ComponentList[2].name]['SS']['State'] === 1 &&
                                        <img className='h-3/4' src={'./images/wtgside/SS.svg'} alt="SS" />
                                    }
                                    {workflow[treatingBlade.WT][ComponentList[2].name]['SS']['State'] === 'pending' &&
                                        <img className='h-3/4 outline-dotted outline-2 outline-offset-2 outline-orange rounded-lg' src={'./images/wtgside/SS.svg'} alt="SS" />
                                    }
                                    {workflow[treatingBlade.WT][ComponentList[2].name]['SS']['State'] === 2 &&
                                        <img className='h-3/4' src={'./images/wtgside/SS_END.svg'} alt="SS" />
                                    }
                                    <p className='text-sm p-1'> SS </p>
                                </div>
                                <div id={ComponentList[2].name + 'TE'} className='flex flex-col justify-between h-full'>
                                    {/* <img className='h-3/4' src={'./images/wtgside/TE.svg'} alt="TE" /> */}
                                    {workflow[treatingBlade.WT][ComponentList[2].name]['TE']['State'] === 1 &&
                                        <img className='h-3/4' src={'./images/wtgside/TE.svg'} alt="TE" />
                                    }
                                    {workflow[treatingBlade.WT][ComponentList[2].name]['TE']['State'] === 'pending' &&
                                        <img className='h-3/4 outline-dotted outline-2 outline-offset-2 outline-orange rounded-lg' src={'./images/wtgside/TE.svg'} alt="TE" />
                                    }
                                    {workflow[treatingBlade.WT][ComponentList[2].name]['TE']['State'] === 2 &&
                                        <img className='h-3/4' src={'./images/wtgside/TE_END.svg'} alt="TE" />
                                    }
                                    <p className='text-sm p-1'> TE </p>
                                </div>
                            </div>
                            {/* <div className='h-1/4 p-3 firstBlade bg-gray-100 flex flex-row justify-around'>
                                <div className='w-1/4 flex flex-col justify-around h-full'>
                                    <img className='h-3/4' src={'./images/fp_images/tower.svg'} alt="blade1" />
                                    {ComponentList.length > 0 &&
                                        <p className='text-sm pt-6'> {ComponentList[3].name} </p>
                                    }
                                </div>
                                <div id={ComponentList[3].name + 'N'} className='w-1/12 flex flex-col justify-between h-full'>
                                    <img className='h-3/4' src={'./images/wtgside/T.svg'} alt="LE" />
                                    <p className='text-sm p-1'> {` N `} </p>
                                </div>
                                <div id={ComponentList[3].name + 'ENE'} className='w-1/12 flex flex-col  justify-between h-full'>
                                    <img className='h-3/4' src={'./images/wtgside/T.svg'} alt="PS" />
                                    <p className='text-sm p-1'> ENE </p>
                                </div>
                                <div id={ComponentList[3].name + 'ESE'} className='w-1/12 flex flex-col justify-between h-full'>
                                    <img className='h-3/4' src={'./images/wtgside/T.svg'} alt="SS" />
                                    <p className='text-sm p-1'> ESE </p>
                                </div>
                                <div id={ComponentList[3].name + 'S'} className='w-1/12 flex flex-col justify-between h-full'>
                                    <img className='h-3/4' src={'./images/wtgside/T.svg'} alt="TE" />
                                    <p className='text-sm p-1'> S </p>
                                </div>
                                <div id={ComponentList[3].name + 'WSW'} className='w-1/12 flex flex-col justify-between h-full'>
                                    <img className='h-3/4' src={'./images/wtgside/T.svg'} alt="TE" />
                                    <p className='text-sm p-1'> WSW </p>
                                </div>
                                <div id={ComponentList[3].name + 'WNW'} className='w-1/12 flex flex-col justify-between h-full'>
                                    <img className='h-3/4' src={'./images/wtgside/T.svg'} alt="TE" />
                                    <p className='text-sm p-1'> WNW </p>
                                </div>
                            </div> */}
                        </div>
                    </div >
                    {/* Right Part Of the Screen 9/12 */}
                    <div className='RigthVisual w-9/12 h-11/12 flex flex-col justify-center items-center' >
                        {/* ******************************** */}
                        {/* IMAGE DIV */}
                        <div className='w-full h-full flex flex-row flex-nowrap items-center justify-center pt-10'>

                            {!isOver &&
                                <svg onClick={() => handleImageIndex('previous')} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-10 h-10  ${isFirstImage ? 'opacity-50 hover:cursor-not-allowed' : 'hover:cursor-pointer'}`}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                                </svg>
                            }
                            {isOver && (
                                <div className='h-full'>
                                    <ImagesPagination
                                        images={recapListForThisSide}
                                        handleDeleteDamage={handleDeleteDamage}
                                        handleChangeFailureType={handleChangeFailureType}
                                        handleReturnToBlade={handleReturnToBlade}
                                        handleConfirmBlade={handleConfirmBlade}
                                    />
                                </div>
                            )}

                            {!isOver &&
                                <div className='image-container h-full w-5/6 pt-1'>
                                    <Annotate wt={treatingBlade.WT} component={treatingBlade.Component} side={treatingBlade.Side} imageUrl={imageList[imageIndex]} directoryUrl={directoryPathFastProcess} />
                                </div>
                            }

                            {!isOver &&
                                <svg onClick={() => handleImageIndex('next')} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-10 h-10  ${isOver ? 'opacity-50 hover:cursor-not-allowed' : 'hover:cursor-pointer'}`}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                                </svg>
                            }

                        </div>
                    </div >
                </div >
            </div >
        )
    }
    else if (step === 2) {
        return (
            <div className="FastProcess NoSelectOnly hview overflow-hidden">
                {/* Header details */}
                <div className='OptionMenu w-full h-1/12 bg-gray-100 text-dark flex flex-row justify-around items-center'>
                    {/* Parc Name */}
                    <div className="scale-75 text-xl lg:text-lg flex items-center">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="2"
                            stroke="currentColor"
                            className="w-6 h-6"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                        </svg>

                        <span className="pl-2"> {missionSheet.getWindFarmName()}</span>
                    </div>
                    {/* Inspecty by */}
                    <div className="scale-75 text-xl lg:text-lg flex items-center">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="2"
                            stroke="currentColor"
                            className="w-6 h-6"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                            />
                        </svg>
                        <span className="pl-2"> {missionSheet.getPilotName()} </span>
                    </div>
                    {/* Date */}
                    <div className="scale-75 text-xl lg:text-lg flex items-center">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="2"
                            stroke="currentColor"
                            className="w-6 h-6"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z"
                            />
                        </svg>
                        <span className="pl-2"> {missionSheet.getInspectionDate()} </span>
                    </div>
                    {/* Mission Type */}
                    <div className="scale-75 text-xl lg:text-lg flex items-center">
                        <img src="./images/svg/drone.svg" className="w-7 h-7"></img>
                        <span className="pl-2"> {missionSheet.getMissionType()} </span>
                    </div>
                    {/* Flight Type */}
                    <div className="scale-75 text-xl lg:text-lg flex items-center">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="2"
                            stroke="currentColor"
                            className="w-6 h-6"
                        >
                            <path
                                strokeLinecap="round"
                                d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"
                            />
                        </svg>
                        <span className="pl-2"> {missionSheet.getFlightType()} </span>
                    </div>
                    {/* WTG List */}
                    <div className="scale-75 text-xl lg:text-lg flex items-center">
                        <img src="./images/wind-power.png" alt="wtg" className="w-7 h-7" />

                        {/*  Create a select for every windturbine and the name */}
                        <select
                            id="FP-selected-WT"
                            className="bg-gray-100"
                            onChange={handleChangeSelectedWT}
                        >
                            {wtList.map((windTurbine) => (
                                <option key={windTurbine} value={windTurbine} className="lg:text-md md:text-sm">
                                    {windTurbine}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                {/* Main Content (left and right) */}
                <div className="h-11/12 flex flex-row w-full h-full justify-center text-xl font-bold">
                    {/* Left Part Of the Screen 3/12 */}
                    <div className='LeftVisual w-3/12 h-11/12 flex flex-col justify-around'>
                        <div className='h-full flex flex-col'>
                            <div className='h-1/3 p-3 firstBlade bg-gray-100 flex flex-row justify-around'>
                                <div className='flex flex-col justify-around h-full'>
                                    <img className='h-3/4' src={'./images/fp_images/blade1.svg'} alt="blade1" />
                                    {ComponentList.length > 0 &&
                                        <p className='text-sm pt-6'> {ComponentList[0].name} </p>
                                    }
                                </div>
                                <div id={ComponentList[0].name + 'LE'} onClick={() => { handleSelectBlade(ComponentList[0].name, 'LE') }} className='hover:cursor-pointer flex flex-col justify-between h-full'>
                                    <img className='h-3/4' src={'./images/wtgside/LE_END.svg'} alt="LE" />
                                    <p className='text-sm p-1'> LE </p>
                                </div>
                                <div id={ComponentList[0].name + 'PS'} onClick={() => { handleSelectBlade(ComponentList[0].name, 'PS') }} className='hover:cursor-pointer flex flex-col  justify-between h-full'>
                                    <img className='h-3/4' src={'./images/wtgside/PS_END.svg'} alt="PS" />
                                    <p className='text-sm p-1'> PS </p>
                                </div>
                                <div id={ComponentList[0].name + 'SS'} onClick={() => { handleSelectBlade(ComponentList[0].name, 'SS') }} className='hover:cursor-pointer flex flex-col justify-between h-full'>
                                    <img className='h-3/4' src={'./images/wtgside/SS_END.svg'} alt="SS" />
                                    <p className='text-sm p-1'> SS </p>
                                </div>
                                <div id={ComponentList[0].name + 'TE'} onClick={() => { handleSelectBlade(ComponentList[0].name, 'TE') }} className='hover:cursor-pointer flex flex-col justify-between h-full'>
                                    <img className='h-3/4' src={'./images/wtgside/TE_END.svg'} alt="TE" />
                                    <p className='text-sm p-1'> TE </p>
                                </div>
                            </div>
                            <div className='h-1/3 p-3 firstBlade bg-gray-100 flex flex-row justify-around'>
                                <div className='flex flex-col justify-around h-full'>
                                    <img className='h-3/4' src={'./images/fp_images/blade2.svg'} alt="blade1" />
                                    {ComponentList.length > 0 &&
                                        <p className='text-sm pt-6'> {ComponentList[1].name} </p>
                                    }
                                </div>
                                <div id={ComponentList[1].name + 'LE'} onClick={() => { handleSelectBlade(ComponentList[1].name, 'LE') }} className='hover:cursor-pointer flex flex-col justify-between h-full'>
                                    <img className='h-3/4' src={'./images/wtgside/LE_END.svg'} alt="LE" />
                                    <p className='text-sm p-1'> LE </p>
                                </div>
                                <div id={ComponentList[1].name + 'PS'} onClick={() => { handleSelectBlade(ComponentList[1].name, 'PS') }} className='hover:cursor-pointer flex flex-col  justify-between h-full'>
                                    <img className='h-3/4' src={'./images/wtgside/PS_END.svg'} alt="PS" />
                                    <p className='text-sm p-1'> PS </p>
                                </div>
                                <div id={ComponentList[1].name + 'SS'} onClick={() => { handleSelectBlade(ComponentList[1].name, 'SS') }} className='hover:cursor-pointer flex flex-col justify-between h-full'>
                                    <img className='h-3/4' src={'./images/wtgside/SS_END.svg'} alt="SS" />
                                    <p className='text-sm p-1'> SS </p>
                                </div>
                                <div id={ComponentList[1].name + 'TE'} onClick={() => { handleSelectBlade(ComponentList[1].name, 'TE') }} className='hover:cursor-pointer flex flex-col justify-between h-full'>
                                    <img className='h-3/4' src={'./images/wtgside/TE_END.svg'} alt="TE" />
                                    <p className='text-sm p-1'> TE </p>
                                </div>
                            </div>
                            <div className='h-1/3 p-3 firstBlade bg-gray-100 flex flex-row justify-around'>
                                <div className='flex flex-col justify-around h-full'>
                                    <img className='h-3/4' src={'./images/fp_images/blade3.svg'} alt="blade1" />
                                    {ComponentList.length > 0 &&
                                        <p className='text-sm pt-6'> {ComponentList[2].name} </p>
                                    }
                                </div>
                                <div id={ComponentList[2].name + 'LE'} onClick={() => { handleSelectBlade(ComponentList[2].name, 'LE') }} className='hover:cursor-pointer flex flex-col justify-between h-full'>
                                    <img className='h-3/4' src={'./images/wtgside/LE_END.svg'} alt="LE" />
                                    <p className='text-sm p-1'> LE </p>
                                </div>
                                <div id={ComponentList[2].name + 'PS'} onClick={() => { handleSelectBlade(ComponentList[2].name, 'PS') }} className='hover:cursor-pointer flex flex-col  justify-between h-full'>
                                    <img className='h-3/4' src={'./images/wtgside/PS_END.svg'} alt="PS" />
                                    <p className='text-sm p-1'> PS </p>
                                </div>
                                <div id={ComponentList[2].name + 'SS'} onClick={() => { handleSelectBlade(ComponentList[2].name, 'SS') }} className='hover:cursor-pointer flex flex-col justify-between h-full'>
                                    <img className='h-3/4' src={'./images/wtgside/SS_END.svg'} alt="SS" />
                                    <p className='text-sm p-1'> SS </p>
                                </div>
                                <div id={ComponentList[2].name + 'TE'} onClick={() => { handleSelectBlade(ComponentList[2].name, 'TE') }} className='hover:cursor-pointer flex flex-col justify-between h-full'>
                                    <img className='h-3/4' src={'./images/wtgside/TE_END.svg'} alt="TE" />
                                    <p className='text-sm p-1'> TE </p>
                                </div>
                            </div>
                        </div>
                    </div >
                    {/* Right Part Of the Screen 9/12 */}
                    <div className='RigthVisual w-9/12 h-11/12 flex flex-col justify-center items-center' >
                        <AnnotationRecap step={step} WT={selectedWT} COMPONENT={selectRecapBlade.COMPONENT} BLADE={selectRecapBlade.BLADE} />
                    </div >
                </div >
            </div >
        )
    }
    else if (step === 3) {
        return (
            <div className="FastProcess NoSelectOnly hview flex flex-col justify-center text-xl font-bold">
                <div>
                    <h2>Done</h2>
                    {/* Check les dmg et modify/ */}
                </div>
            </div>
        )
    }

    return (
        <div className="FastProcess NoSelectOnly hview flex flex-col justify-center text-xl font-bold">
            <div>
                <div>
                    <h2>Error Setting the step, please go back</h2>
                </div>
            </div>
        </div>
    );
}

export default FastProcess;
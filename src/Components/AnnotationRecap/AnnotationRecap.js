import React, { useEffect, useState } from 'react';
import Loader from '../Loader/Loader';
const MissionSheetReader = require("../../utils/MissionSheetReader").default;
import {
    TransformWrapper,
    TransformComponent
} from "react-zoom-pan-pinch";
const fs = window.require('fs');
const path = window.require('path');
const { ipcRenderer } = window.require('electron');
const builder = require('xmlbuilder');


function AnnotationRecap(WT) {
    const directoryUrl = localStorage.getItem('directoryPathFastProcess');
    const missionSheet = new MissionSheetReader(localStorage.getItem('directoryPathFastProcess'));
    const [imagesBin64List, setImagesBin64List] = React.useState([]);
    const [homeRecap, setHomeRecap] = React.useState(true);
    const [index, setIndex] = useState(0);
    const [directoryPathFastProcess, setDirectoryPathFastProcess] = useState(localStorage.getItem('directoryPathFastProcess'));
    const [loading, setLoading] = useState(true);
    const [isLockWT, setIsLockWT] = useState(false);




    const [turbineOnTreatment, setTurbineOnTreatment] = useState({
        WT: WT.WT,
        COMPONENT: WT.COMPONENT,
        BLADE: WT.BLADE,
    });



    const [stats, setStats] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;


    useEffect(() => {
        const isLockOrNot = fs.existsSync(directoryPathFastProcess + "\\" + turbineOnTreatment.WT + "\\InspectionReport.xml");
        if (isLockOrNot) {
            setIsLockWT(true);
        } else {
            setIsLockWT(false);
        }
        handleSetStats();
    }, [WT.WT]);

    useEffect(() => {
        setTurbineOnTreatment({
            WT: WT.WT,
            COMPONENT: WT.COMPONENT,
            BLADE: WT.BLADE,
        });
    }, [WT.BLADE, WT.COMPONENT, WT.WT]);


    const [noMoreDoubt, setNoMoreDoubt] = useState(false);

    const componentList = missionSheet.getWindTurbineComponentsNoWTG(WT.WT)
    const availableSide = ['LE', 'PS', 'SS', 'TE']


    const handleSetStats = async () => {
        let pathToDirectoryWindTurbine = directoryUrl + '/' + turbineOnTreatment.WT;

        const DamageList = [];
        const typeOfDamages = [];
        let doubt = false;

        for (const component of componentList) {
            if (component.inspected === true) {
                for (let i = 0; i < availableSide.length; i++) {
                    try {
                        const data = await fs.promises.readFile(
                            pathToDirectoryWindTurbine +
                            '/' +
                            component.name +
                            '/' +
                            availableSide[i] +
                            '/SideDamage.json',
                            'utf-8'
                        );


                        const parsedData = JSON.parse(data);
                        for (const damageEntry of parsedData.DamageEntry) {
                            if (damageEntry.u_failure_type !== '') {
                                typeOfDamages.push(damageEntry.u_failure_type);
                            }

                            if (damageEntry.isDoubt === true) {
                                doubt = false
                            }


                            const damageEntryToPush = {
                                id: damageEntry.id,
                                u_blade_name: damageEntry.component,
                                u_blade_serial_number: damageEntry.u_blade_serial_number,
                                u_blade_area: damageEntry.u_blade_area,
                                u_failure_type: damageEntry.u_failure_type,
                                u_main_component: damageEntry.u_main_component,
                                u_sub_component: damageEntry.u_sub_component,
                                u_blade_sub_section: damageEntry.u_blade_sub_section,
                                isDoubt: damageEntry.isDoubt,
                            };
                            DamageList.push(damageEntryToPush);
                        }
                    } catch (err) {
                        console.log(err);
                    }
                }
            }
        }


        if (doubt) {
            setNoMoreDoubt(false)
        } else {
            setNoMoreDoubt(true)
        }
        const different_type_List = [...new Set(typeOfDamages)];
        console.log(different_type_List);
        console.log(DamageList.length);

        const statsToSet = {
            DamageList: DamageList,
            number_of_damages: DamageList.length,
            different_type_List: different_type_List,
        };

        setStats(statsToSet);
        setLoading(false);
    };

    const convertJsonToXML = async () => {
        const pathTojson = directoryUrl + '/' + turbineOnTreatment.WT + "/InspectionReport.json";
        const pathToXML = directoryUrl + '/' + turbineOnTreatment.WT + "/InspectionReport.xml";
        fs.readFile(pathTojson, "utf-8", (err, data) => {
            if (err) {
                console.log(err);
            }
            else {

                const parsedData = JSON.parse(data);


                const root = builder.create('RootElement', { headless: true });
                root.att('xmlns', 'http://tempuri.org/InspectionReportSchema.xsd');

                const bladeTypeNoSpace = parsedData.u_blade_type.replace(/\s/g, '');

                const InspectionReport = {
                    u_turbine_id: parsedData.u_turbine_id,
                    u_incident: parsedData.u_incident,
                    u_purchase_order: parsedData.u_purchase_order,
                    u_blade_type: bladeTypeNoSpace,
                    u_responsible_technicians: parsedData.u_responsible_technicians,
                    u_safety_checklist: true,
                    u_inspection_date: parsedData.u_inspection_date,
                    u_inspection_end_date: parsedData.u_inspection_end_date,
                    u_inspection_break: parsedData.u_inspection_break,
                    u_inspection_type: parsedData.u_inspection_type,
                    u_blade_a: parsedData.u_blade_a,
                    u_blade_b: parsedData.u_blade_b,
                    u_blade_c: parsedData.u_blade_c,
                    u_blade_a_drain_hole: parsedData.u_blade_a_drain_hole,
                    u_blade_b_drain_hole: parsedData.u_blade_b_drain_hole,
                    u_blade_c_drain_hole: parsedData.u_blade_c_drain_hole,
                    u_drain_hole_status_a: parsedData.u_drain_hole_status_a,
                    u_drain_hole_status_b: parsedData.u_drain_hole_status_b,
                    u_drain_hole_status_c: parsedData.u_drain_hole_status_c,
                    u_blade_noise: parsedData.u_blade_noise,
                    u_blade_noise_comment: parsedData.u_blade_noise_comment,
                    u_loose_parts_in_blade: parsedData.u_loose_parts_in_blade,
                    u_loose_parts_comment: parsedData.u_loose_parts_comment,
                    u_blade_vacuum: parsedData.u_blade_vacuum,
                    u_blade_vacuum_comment: parsedData.u_blade_vacuum_comment,
                    u_general_remarks: parsedData.u_general_remarks,
                    u_blade_set_number: parsedData.u_blade_set_number
                }



                const InspectionReportElement = root.ele('InspectionReport');

                for (const [key, value] of Object.entries(InspectionReport)) {
                    if (key === 'u_inspection_stopped' || key === 'u_inspection_restarted') {
                        if (value !== '') {
                            InspectionReportElement.ele(key, value);
                        }
                    } else {
                        InspectionReportElement.ele(key, value);
                    }
                }

                let pathToDirectoryWindTurbine = directoryUrl + '/' + turbineOnTreatment.WT;



                for (const component of componentList) {
                    if (component.inspected === true) {
                        for (let i = 0; i < availableSide.length; i++) {
                            try {
                                const data = fs.readFileSync(
                                    pathToDirectoryWindTurbine +
                                    '/' +
                                    component.name +
                                    '/' +
                                    availableSide[i] +
                                    '/SideDamage.json',
                                    'utf-8'
                                );

                                const parsedData = JSON.parse(data);

                                console.log(parsedData);
                                console.log(parsedData.DamageEntry);
                                for (const damageEntry of parsedData.DamageEntry) {
                                    const damageEntryElement = InspectionReportElement.ele('DamageEntry');
                                    for (const [key, value] of Object.entries(damageEntry)) {
                                        if (
                                            key !== 'component' &&
                                            key !== 'coordonates' &&
                                            key !== 'isDoubt' &&
                                            key !== 'id' &&
                                            key !== 'imgPath'
                                        ) {
                                            if (key === 'u_crop_image' || key === 'u_overview_image') {
                                                damageEntryElement.ele('de_base64BinaryAttachment', value);
                                            } else if (key === 'u_blade-type') {
                                                const bladeType = value.replace(/\s/g, '');
                                                damageEntryElement.ele(key, bladeType);
                                            } else {
                                                console.log(key + ' : ' + value);
                                                damageEntryElement.ele(key, value);
                                            }
                                        }
                                    }
                                }
                            } catch (err) {
                                console.log(err);
                            }
                        }
                    }
                }



                const weatherLogbook = {
                    u_date: parsedData.WeatherLogbook.u_date,
                    u_day: parsedData.WeatherLogbook.u_day,
                    u_humidity: parsedData.WeatherLogbook.u_humidity,
                    u_temperature: parsedData.WeatherLogbook.u_temperature,
                    u_waiting_time: parsedData.WeatherLogbook.u_waiting_time,
                    u_weather: parsedData.WeatherLogbook.u_weather,
                    u_windspeed: parsedData.WeatherLogbook.u_windspeed,
                    u_working_time: parsedData.WeatherLogbook.u_working_time
                }

                const weatherLogbookElement = InspectionReportElement.ele('WeatherLogbook');


                for (const [key, value] of Object.entries(weatherLogbook)) {
                    weatherLogbookElement.ele(key, value);
                }


                const xml = root.end({ pretty: true });

                // Write the XML file to pathToXML
                fs.writeFile(pathToXML, xml, function (err) {
                    if (err) {
                        console.log(err);
                    }
                    else {
                        console.log("File written successfully\n");
                        setIsLockWT(true);
                    }
                }
                );

            }
        })
    }


    useEffect(() => {
        if (turbineOnTreatment.BLADE === null) return;
        setLoading(true);
        const pathToRead = directoryPathFastProcess + "\\" + turbineOnTreatment.WT + '/' + turbineOnTreatment.COMPONENT + '/' + turbineOnTreatment.BLADE + '/SideDamage.json';
        fs.readFile(pathToRead, 'utf8', function (err, data) {
            if (err) {
                console.log(err);
                return;
            }
            const obj = JSON.parse(data);
            const damageList = obj.DamageEntry;
            const imageListToPush = [];
            console.log('Turbine to upload : ' + turbineOnTreatment.WT + ' ' + turbineOnTreatment.BLADE + ' ' + turbineOnTreatment.COMPONENT);
            damageList.forEach(damage => {
                if (damage.u_blade_area === turbineOnTreatment.BLADE && damage.component === turbineOnTreatment.COMPONENT) {
                    // const Cropimage = "data:image/png;base64," + damage.u_crop_image;
                    const Overviewimage = "data:image/png;base64," + damage.u_overview_image;


                    imageListToPush.push({
                        // u_crop_image: Cropimage,
                        id: damage.id,
                        u_overview_image: Overviewimage,
                        u_failure_type: damage.u_failure_type,
                        u_sub_component: damage.u_sub_component,
                    });
                }
            }
            );
            setImagesBin64List(imageListToPush);
            setTimeout(() => {
                if (homeRecap === false) {
                    setIndex(0);
                }
                setHomeRecap(false);
                setLoading(false);
            }, 500);
        });

    }, [turbineOnTreatment.BLADE, turbineOnTreatment.COMPONENT]);

    const handleGoRecap = () => {
        setIndex(0);
        setTurbineOnTreatment({
            WT: turbineOnTreatment.WT,
            COMPONENT: null,
            BLADE: null,
        });
        setHomeRecap(true);
    }

    const handleGoToDetails = (component, blade, id) => {

        const pathToRead = directoryPathFastProcess + "\\" + turbineOnTreatment.WT + '/' + component + '/' + blade + '/SideDamage.json';
        fs.readFile(pathToRead, 'utf8', function (err, data) {
            if (err) {
                console.log(err);
                return;
            }
            const obj = JSON.parse(data);
            console.log(obj);
            const damageEntry = [];
            // push all damage where turbineOnTreatment.COMPONENT and turbineOnTreatment.BLADE
            obj.DamageEntry.forEach(damage => {
                if (damage.u_blade_area === blade && damage.component === component) {
                    damageEntry.push(damage);
                }
            }
            );

            // find position in the array of the damage with id
            for (let i = 0; i < damageEntry.length; i++) {
                if (damageEntry[i].id === id) {
                    setIndex(i);
                    break;
                }
            }
        });

        setTurbineOnTreatment({
            WT: turbineOnTreatment.WT,
            COMPONENT: component,
            BLADE: blade
        });

    };

    const handleDeleteAWhereIndex = (id) => {
        setLoading(true);
        const pathToRead = directoryPathFastProcess + "\\" + turbineOnTreatment.WT + "\\InspectionReport.json";
        fs.readFile(pathToRead, 'utf8', function (err, data) {
            if (err) {
                console.log(err);
                return;
            }
            const obj = JSON.parse(data);

            console.log(imagesBin64List);
            console.log('Deleting annotation, please wait...');
            // remove all damage Object for damage[index]
            obj.DamageEntry.splice(index, 1);
            console.log('Annotation deleted !');
            console.log('Saving file, please wait...');

            console.log(obj);

            fs.writeFile(pathToRead, JSON.stringify(obj), function (err) {
                if (err) {
                    console.log(err);
                }
                else {
                    console.log("File saved !");
                }
            }
            );

            // remove it from imagesBin64List
            const newImagesBin64List = imagesBin64List.filter(image => image.id !== id);

            setImagesBin64List(newImagesBin64List);


            const newStats = stats;
            newStats.DamageList = newStats.DamageList.filter(damage => damage.id !== id);
            setStats(newStats);

            let noMoreDoubt = false;
            newStats.DamageList.forEach(damage => {
                if (damage.isDoubt === true) {
                    noMoreDoubt = true;
                }
            });


            if (noMoreDoubt === false) {
                setNoMoreDoubt(true);
            }



            setTimeout(() => {
                setIndex(0);
                setLoading(false);
            }
                , 1000);
        });
    }

    const handleModifyAWhereIndex = (id) => {
        const u_failure_type = document.getElementById('failure_type').value;
        const u_sub_component = document.getElementById('sub_component').value;
        setLoading(true);

        imagesBin64List.forEach(image => {
            if (image.id === id) {
                image.u_sub_component = u_sub_component;
                image.u_failure_type = u_failure_type;
                image.isDoubt = false;
            }
        });

        stats.DamageList.forEach(damage => {
            if (damage.id === id) {
                damage.u_sub_component = u_sub_component;
                damage.u_failure_type = u_failure_type;
                damage.isDoubt = false;
            }
        });
        let noMoreDoubt = false;
        imagesBin64List.forEach(image => {
            if (image.isDoubt === true) {
                noMoreDoubt = true;
            }
        });

        if (noMoreDoubt === false) {
            setNoMoreDoubt(true);
        }

        console.log('Annotation will be modify, please wait...');
        handleSaveNewInspectionJson(id, u_sub_component, u_failure_type);
    }

    const handleSaveNewInspectionJson = (id, subComponent, failureType) => {
        const pathToRead = directoryPathFastProcess + "\\" + turbineOnTreatment.WT + '/' + turbineOnTreatment.COMPONENT + '/' + turbineOnTreatment.BLADE + '/SideDamage.json';
        console.log(pathToRead);
        fs.readFile(pathToRead, 'utf8', function (err, data) {
            if (err) {
                console.log(err);
                return;
            }
            const obj = JSON.parse(data);

            obj.DamageEntry.forEach(damage => {
                if (damage.id === id) {
                    damage.u_sub_component = subComponent,
                        damage.u_failure_type = failureType,
                        damage.isDoubt = false;
                }
            });

            console.log('Annotation modified !');

            console.log('Saving file, please wait...');

            fs.writeFile(pathToRead, JSON.stringify(obj), function (err) {
                if (err) {
                    console.log(err);
                }
                else {
                    console.log("File saved !");
                }
            }
            );

            setTimeout(() => {
                setIndex(0);
                setLoading(false);
                handleGoRecap();
            }
                , 1000);
        });
    }


    useEffect(() => {
        if (imagesBin64List.length > 0 && turbineOnTreatment.BLADE !== null && !homeRecap) {
            document.getElementById('failure_type').value = imagesBin64List[index].u_failure_type;
            document.getElementById('sub_component').value = imagesBin64List[index].u_sub_component;
        }
    }, [index]);

    // pas utiliser pour le moment. A voir si implémentation
    /*
    const resetAnnotations = () => {
        const treatingBlade = {
            WT: turbineOnTreatment.WT,
            COMPONENT: turbineOnTreatment.COMPONENT,
            BLADE: turbineOnTreatment.BLADE,
        };
        fs.readFile(directoryPathFastProcess + "\\" + turbineOnTreatment.WT + "\\InspectionReport.json", 'utf8', function (err, data) {
            if (err) {
                console.log(err);
                return;
            }
            const obj = JSON.parse(data);
            const damageList = obj.DamageEntry;
            // delete all annotations for this turbineOnTreatment.BLADE === damage.u_blade_area
            const newDamageList = [];
            damageList.forEach(damage => {
                if (damage.u_blade_area !== turbineOnTreatment.BLADE) {
                    newDamageList.push(damage);
                }
            }
            );
            obj.DamageEntry = newDamageList;
            fs.writeFile(directoryPathFastProcess + "\\" + turbineOnTreatment.WT + "\\InspectionReport.json", JSON.stringify(obj), function (err) {
                if (err) return console.log(err);
                console.log('Annotations resetted');
                fs.readFile(directoryPathFastProcess + "\\.workflow_cache.json", 'utf8', function (err, data) {
                    if (err) return console.log(err);
                    const newWorkflowCache = JSON.parse(data);
                    newWorkflowCache[turbineOnTreatment.WT][turbineOnTreatment.COMPONENT][turbineOnTreatment.BLADE]['State'] === 1;
                    fs.writeFile(directoryPathFastProcess + "\\.workflow_cache.json", JSON.stringify(newWorkflowCache), function (err) {
                        if (err) return console.log(err);
                        ipcRenderer.send('updateFastProcess', treatingBlade);
                    }
                    );
                });
            }
            );

        });


    }
    */

    /*    const handleConvert = () => {
            const directoryPath = 'N:\\ope_sav\\Sherlock\\2023_06_05__Bois_Clergeons'
    
            const pathToSideDamage = directoryPath + "\\" + 'E01' + "\\" + '2' + "\\" + 'TE' + "\\SideDamage.json";
            const pathToRead = directoryUrl + "\\" + turbineOnTreatment.WT + "\\InspectionReport.json";
            const arrayToPush = [];
    
            fs.readFile(pathToRead, 'utf8', function (err, data) {
                const parseData = JSON.parse(data);
                const damageList = parseData.DamageEntry;
    
                damageList.forEach(damage => {
                    console.log(damage.u_blade_area);
                    if (damage.u_blade_area === 'TE' && damage.component === "1") {
                        arrayToPush.push(damage);
                    }
                });
    
                fs.readFile(pathToSideDamage, 'utf8', function (err, data) {
                    const parseData = JSON.parse(data);
                    parseData.DamageEntry = arrayToPush;
    
                    fs.writeFile(pathToSideDamage, JSON.stringify(parseData), function (err) {
                        if (err) return console.log(err);
                        console.log('Annotations resetted');
                    });
                });
            });
        };*/


    if (homeRecap && stats !== null && isLockWT === false) {
        return (
            <div className="AnnotationRecap hview flex flex-col justify-center text-sm items-center w-full">
                <div className="h-1/6 flex justify-between w-5/6 mt-10">
                    <div className="bg-gray-100 h-1/2 p-10 m-1 flex flex-col items-center justify-center">
                        <p className="Red text-2xl">{stats.number_of_damages}</p>
                        <p className='text-red-500 text-2xl italic'> Damages </p>
                    </div>
                    <div className="bg-gray-100 h-1/2 p-10 m-1 flex flex-col items-center justify-center">
                        <p className="Red text-2xl">{stats.different_type_List.length}</p>
                        <p className='text-blue-500 text-2xl italic'> Different type of Damages </p>
                    </div>
                </div>
                <div id='tableContainer' className="h-4/6 flex flex-col justify-center items-center overflow-auto text-sm w-5/6">
                    <table className="table-auto overflow-scroll w-full">
                        <thead style={{ position: 'sticky', top: '0' }}>
                            <tr>
                                <th >Blade Name</th>
                                <th >Blade Side</th>
                                <th >Failure Type</th>
                                <th >Sub Component</th>
                                <th >Go to damage</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.DamageList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((damage, index) => {
                                return (
                                    <tr key={index}>
                                        <td className={damage.isDoubt ? 'bg-red-300 border-white border-2 p-1 w-2/12' : 'bg-green-300 border-white border-2 p-1 w-2/12'}>{damage.u_blade_name}</td>
                                        <td className={damage.isDoubt ? 'bg-red-300 border-white border-2 p-1 w-1/12' : 'bg-green-300 border-white border-2 p-1 w-1/12'}>{damage.u_blade_area}</td>
                                        <td className={damage.isDoubt ? 'bg-red-300 border-white border-2 p-1 w-4/12' : 'bg-green-300 border-white border-2 p-1 w-4/12'}>{damage.u_failure_type}</td>
                                        <td className={damage.isDoubt ? 'bg-red-300 border-white border-2 p-1 w-4/12' : 'bg-green-300 border-white border-2 p-1 w-4/12'}>{damage.u_sub_component}</td>
                                        <td className={damage.isDoubt ? 'bg-red-300 border-white border-2 p-1 w-1/12' : 'bg-green-300 border-white border-2 p-1 w-1/12'} onClick={() => handleGoToDetails(damage.u_blade_name, damage.u_blade_area, damage.id)}>
                                            <div className='flex justify-center items-center'>
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 26 26" fill="black" className="w-6 h-6 hover:cursor-pointer">
                                                    <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm4.28 10.28a.75.75 0 000-1.06l-3-3a.75.75 0 10-1.06 1.06l1.72 1.72H8.25a.75.75 0 000 1.5h5.69l-1.72 1.72a.75.75 0 101.06 1.06l3-3z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    <div className="mt-3 pagination flex w-1/2 justify-around">
                        <button
                            onClick={() => setCurrentPage(currentPage - 1)}
                            disabled={currentPage === 1}
                            className='hover:cursor-pointer'
                        >
                            <div className='flex items-center justify-center'>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 30 30" strokeWidth={2} stroke="currentColor" className="pt-1 w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5" />
                                </svg>
                                Previous
                            </div>
                        </button>
                        {currentPage} / {Math.ceil(stats.DamageList.length / itemsPerPage)}
                        <button
                            onClick={() => setCurrentPage(currentPage + 1)}
                            disabled={currentPage === Math.ceil(stats.DamageList.length / itemsPerPage)}
                            className='hover:cursor-pointer'
                        >
                            <div className='flex items-center justify-center'>
                                Next
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 30 30" strokeWidth={2} stroke="currentColor" className="pt-1 ml-1 w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 4.5l7.5 7.5-7.5 7.5m-6-15l7.5 7.5-7.5 7.5" />
                                </svg>
                            </div>

                        </button>
                    </div>
                </div >

                <div className="h-1/6 flex justify-center items-center">
                    {/*                    <button className="mr-10 h-1/2 bg-green-300 hover:bg-green-500 hover:cursor-pointer text-black px-4 rounded" onClick={handleConvert}>TEST</button>*/}
                    <button
                        disabled={!noMoreDoubt}
                        title={noMoreDoubt || stats.DamageList.length === 0 ? "Convert Json to XML" : "Please confirm all annotations with a doubt first"}
                        className={noMoreDoubt || stats.DamageList.length === 0 ? "bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded" : "bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded hover:cursor-not-allowed"}
                        onClick={convertJsonToXML}
                    >
                        Confirm all annotations
                    </button>

                </div>

            </div >
        );
    } else if (loading) {
        return (
            <div className="AnnotationRecap hview flex flex-col justify-center text-xl font-bold">
                <Loader />
            </div>
        );
    } else if (isLockWT) {
        return (
            <div className="AnnotationRecap hview flex flex-col justify-center text-sm items-center w-full">
                <div className="h-1/6 flex justify-around w-full mt-10">
                    <div className="bg-gray-100 h-1/2 p-10 m-1 flex flex-col items-center justify-center">
                        <p className="Red text-2xl">{stats.number_of_damages}</p>
                        <p className='text-red-500 text-2xl italic'> Damages </p>
                    </div>
                    <div className="bg-gray-100 h-1/2 p-10 m-1 flex flex-col items-center justify-center">
                        <p className="Red text-2xl">{stats.different_type_List.length}</p>
                        <p className='text-blue-500 text-2xl italic'> Different type of Damages </p>
                    </div>
                    <div className="bg-gray-100 h-1/2 p-10 m-1 flex flex-col items-center justify-center">
                        <p className="Red text-2xl">{stats.u_inspection_date}</p>
                        <p className='text-green-500 text-2xl italic'> Inspection Date </p>
                    </div>
                </div>

                <div id='tableContainer' className="h-4/6 flex flex-col justify-center items-center overflow-auto text-sm w-5/6">
                    <table className="table-auto overflow-scroll w-full">
                        <thead style={{ position: 'sticky', top: '0' }}>
                            <tr>
                                <th >Blade Name</th>
                                <th >Blade Side</th>
                                <th >Failure Type</th>
                                <th >Sub Component</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.DamageList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((damage, index) => {
                                return (
                                    <tr key={index}

                                    >
                                        <td className={damage.isDoubt ? 'bg-red-300 border-white border-2 p-1 w-3/12' : 'bg-green-300 border-white border-2 p-1 w-3/12'}>{damage.u_blade_name}</td>
                                        <td className={damage.isDoubt ? 'bg-red-300 border-white border-2 p-1 w-3/12' : 'bg-green-300 border-white border-2 p-1 w-3/12'}>{damage.u_blade_area}</td>
                                        <td className={damage.isDoubt ? 'bg-red-300 border-white border-2 p-1 w-3/12' : 'bg-green-300 border-white border-2 p-1 w-3/12'}>{damage.u_failure_type}</td>
                                        <td className={damage.isDoubt ? 'bg-red-300 border-white border-2 p-1 w-3/12' : 'bg-green-300 border-white border-2 p-1 w-3/12'}>{damage.u_sub_component}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div >
                <div className="mt-3 pagination flex w-1/2 justify-around">
                    <button
                        onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className='hover:cursor-pointer'
                    >
                        <div className='flex items-center justify-center'>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 30 30" strokeWidth={2} stroke="currentColor" className="pt-1 w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5" />
                            </svg>
                            Previous
                        </div>
                    </button>
                    {currentPage} / {Math.ceil(stats.DamageList.length / itemsPerPage)}
                    <button
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={currentPage === Math.ceil(stats.DamageList.length / itemsPerPage)}
                        className='hover:cursor-pointer'
                    >
                        <div className='flex items-center justify-center'>
                            Next
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 30 30" strokeWidth={2} stroke="currentColor" className="pt-1 ml-1 w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 4.5l7.5 7.5-7.5 7.5m-6-15l7.5 7.5-7.5 7.5" />
                            </svg>
                        </div>

                    </button>
                </div>

                {/* <div id='tableContainer' className="h-4/6 flex justify-center items-center overflow-auto text-sm w-full">
                    <table className="table-auto overflow-scroll w-full">
                        <thead style={{ position: 'sticky', top: '0' }}>
                            <tr>
                                <th >Blade Name</th>
                                <th >Blade serial number</th>
                                <th >Blade Side</th>
                                <th >Failure Type</th>
                                <th >Sub Component</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.DamageList.map((damage, index) => {
                                return (
                                    <tr key={index}>
                                        <td className='border-white border-2 bg-gray-100 w-1/6'>{damage.u_blade_name}</td>
                                        <td className='border-white border-2 p-1 bg-gray-100 w-1/6'>{damage.u_blade_serial_number}</td>
                                        <td className='border-white border-2 p-1 bg-gray-100 w-1/6'>{damage.u_blade_area}</td>
                                        <td className='border-white border-2 p-1 bg-gray-100 w-1/6'>{damage.u_failure_type}</td>
                                        <td className='border-white border-2 p-1 bg-gray-100 w-1/6'>{damage.u_sub_component}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div> */}

                <div className="h-1/6 flex justify-center items-center">
                    <p> No more modification can be done for this WT</p>
                </div>

            </div >
        );
    }
    else {
        return (
            <div className="AnnotationRecap h-full flex flex-col justify-center">
                {imagesBin64List.length === 0 && turbineOnTreatment.BLADE !== null &&
                    <div className="h-1/12 flex flex-col items-center justify-between">
                        <div className="text-2xl">No annotations for this blade</div>
                        <button className='bg-orange-100 rounded-xl p-2' onClick={handleGoRecap}>
                            Return
                        </button>
                    </div>
                }
                {imagesBin64List.length === 0 && turbineOnTreatment.BLADE === null &&
                    <div className="h-1/12 flex items-center justify-between">
                        <button className="bg-red-500 hover:bg-red-700 text-white h-1/2 px-4 rounded" onClick={() => { if (window.confirm('Are you sure you want to confirm all your choices for this WT? You will not be able to make any changes afterward.')) { convertJsonToXML() } }}>Confirm all choice</button>
                    </div>
                }
                {imagesBin64List.length > 0 &&
                    <div className="h-1/12 flex items-center justify-around ">
                        <button onClick={handleGoRecap}>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                            </svg>
                        </button>
                        <span>  {turbineOnTreatment.COMPONENT} - {turbineOnTreatment.BLADE}
                        </span>
                    </div>
                }
                {imagesBin64List.length > 0 &&
                    <div className='max-h-10/12 min-h-8/12 flex justify-center items-center overflow-auto'>
                        {index > 0 &&
                            <svg onClick={() => { if (index > 0) { setIndex(index - 1) } }}
                                xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-10 h-10 hover:cursor-pointer`}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                            </svg>
                        }
                        {index === 0 &&
                            <svg onClick={() => { if (index > 0) { setIndex(index - 1) } }}
                                xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`opacity-50 w-10 h-10 hover:cursor-not-allowed`}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                            </svg>
                        }
                        <TransformWrapper
                            centerOnInit={true}
                        >
                            <TransformComponent>
                                <img src={imagesBin64List[index].u_overview_image} alt="overview" />
                            </TransformComponent>
                        </TransformWrapper>
                        {index < imagesBin64List.length - 1 &&
                            <svg onClick={() => { if (index < imagesBin64List.length - 1) { setIndex(index + 1) } }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-10 h-10 hover:cursor-pointer`}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                            </svg>
                        }
                        {index === imagesBin64List.length - 1 &&
                            <svg onClick={() => { if (index < imagesBin64List.length - 1) { setIndex(index + 1) } }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`opacity-50 w-10 h-10 hover:cursor-not-allowed`}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                            </svg>
                        }
                    </div>
                }
                {imagesBin64List.length > 0 &&
                    <div className="h-1/12 w-full flex items-center justify-between ">
                        <button className="ml-10 h-1/2 bg-red-300 hover:bg-red-500 hover:cursor-pointer text-black px-4 rounded" onClick={() => handleDeleteAWhereIndex(imagesBin64List[index].id)}>Delete</button>
                        <select id='failure_type' name='failure_type' className='w-1/4 border-2 h-2/3' defaultValue={imagesBin64List[index].u_failure_type}>
                            <option value='Bonding completeness'>Bonding completeness</option>
                            <option value='Coating Failure'>Coating Failure</option>
                            <option value='Buckling'>Buckling</option>
                            <option value='Burn mark'>Burn mark</option>
                            <option value='Crack, diagonal'>Crack, diagonal</option>
                            <option value='Crack, longitudinal'>Crack, longitudinal</option>
                            <option value='Crack, transversal'>Crack, transversal</option>
                            <option value='Damaged / eroded (laminate not damaged)'>Damaged / eroded (laminate not damaged)</option>
                            <option value='Deformation'>Deformation</option>
                            <option value='Delamination'>Delamination</option>
                            <option value='Deviation in sealing'>Deviation in sealing</option>
                            <option value='Dirt (e.g. dust)'>Dirt (e.g. dust)</option>
                            <option value='Discolouration'>Discolouration</option>
                            <option value='Material spalling'>Material spalling</option>
                            <option value='Melted'>Melted</option>
                            <option value='Missing (laminate damaged)'>Missing (laminate damaged)</option>
                            <option value='Missing (laminate not damaged)'>Missing (laminate not damaged)</option>
                            <option value='Missing/wrong labeling'>Missing/wrong labeling</option>
                            <option value='Pinhole'>Pinhole</option>
                            <option value='Scratches'>Scratches</option>
                            <option value='Dents/dints/pore'>Dents/dints/pore</option>
                            <option value='Edge Sealer only'>Edge Sealer only</option>
                            <option value='no failure found / for information only'>no failure found / for information only</option>
                            <option value='Type of failure is missing'>Type of failure is missing</option>
                        </select>
                        <span>{index + 1}/{imagesBin64List.length}  </span>
                        <select id='sub_component' name='sub_component' defaultValue={imagesBin64List[index].u_sub_component} className='w-1/4 border-2 h-2/3'>
                            <option value='Accessoires - 0 degree marking'>Accessoires - 0 degree marking</option>
                            <option value='Accessoires - AIS (Anti Icing System)'>Accessoires - AIS (Anti Icing System)</option>
                            <option value='Accessoires - Blade bolts'>Accessoires - Blade bolts</option>
                            <option value='Accessoires - Gurney flaps'>Accessoires - Gurney flaps</option>
                            <option value='Accessoires - IDD blade'>Accessoires - IDD blade</option>
                            <option value='Accessoires - Identification marking'>Accessoires - Identification marking</option>
                            <option value='Accessoires - IPC'>Accessoires - IPC</option>
                            <option value='Accessoires - LEP (Leading Edge Protection)'>Accessoires - LEP (Leading Edge Protection)</option>
                            <option value='Accessoires - LPS (lighting protection system) alu tip'>Accessoires - LPS (lighting protection system) alu tip</option>
                            <option value='Accessoires - LPS (lighting protection system) cable'>Accessoires - LPS (lighting protection system) cable</option>
                            <option value='Accessoires - LPS (lighting protection system) receptor'>Accessoires - LPS (lighting protection system) receptor</option>
                            <option value='Accessoires - Manhole cover'>Accessoires - Manhole cover</option>
                            <option value='Accessoires - Metal Vortex Generators'>Accessoires - Metal Vortex Generators</option>
                            <option value='Accessoires - Plastic Vortex Generators'>Accessoires - Plastic Vortex Generators</option>
                            <option value='Accessoires - Rain deflector'>Accessoires - Rain deflector</option>
                            <option value='Accessoires - Serrations'>Accessoires - Serrations</option>
                            <option value='Accessoires - Water drain hole'>Accessoires - Water drain hole</option>
                            <option value='Accessoires - Zig zag tape'>Accessoires - Zig zag tape</option>
                            <option value='Accessories - LPS (lighting protection system) equipotential bonding rail'>Accessories - LPS (lighting protection system) equipotential bonding rail</option>
                            <option value='Blade inside - Blade weight'>Blade inside - Blade weight</option>
                            <option value='Blade inside - Bondline'>Blade inside - Bondline</option>
                            <option value='Blade inside - Bulkhead'>Blade inside - Bulkhead</option>
                            <option value='Blade inside - Main Girder'>Blade inside - Main Girder</option>
                            <option value='Blade inside - Shell/web'>Blade inside - Shell/web</option>
                            <option value='Blade inside - Web laminate'>Blade inside - Web laminate</option>
                            <option value='Blade inside – Root Joint'>Blade inside – Root Joint</option>
                            <option value='Blade outside - Bondline'>Blade outside - Bondline</option>
                            <option value='Blade outside - Shell Coating (laminate not damaged)'>Blade outside - Shell Coating (laminate not damaged)</option>
                            <option value='Blade outside - Shell laminate'>Blade outside - Shell laminate</option>
                            <option value='Type of Sub-component is missing (Blade)'>Type of Sub-component is missing (Blade)</option>
                        </select>
                        <button className="mr-10 h-1/2 bg-green-300 hover:bg-green-500 hover:cursor-pointer text-black px-4 rounded" onClick={() => handleModifyAWhereIndex(imagesBin64List[index].id)}>Confirm</button>

                    </div>
                }
            </div >
        );
    }
}

export default AnnotationRecap;
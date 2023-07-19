import React, { useEffect, useState } from 'react';

const fs = window.require('fs');

function OptionsPanel({ optiontype, onConfirm, onDate, onCancel }) {
    const [type, setType] = useState(optiontype);


    // EDIT VARIABLES
    const [fullList, setFullList] = useState(['Select Side']);
    const [WT, setWT] = useState(["Select WT"]);
    const [selectWT, setSelectWT] = useState("Select WT");
    const [selectBlade, setSelectBlade] = useState("Select Blade");
    const [bladeList, setBladeList] = useState(["Select Blade"]);
    const [selectSide, setSelectSide] = useState("Select Side");
    const [sideList, setSideList] = useState(["Select Side"]);
    const [availableSteps, setAvailableSteps] = useState(["Select Step"]);

    const [fromStep, setFromStep] = useState('Select Step');
    const underCaseFirstLetter = (string) => {
        return string.charAt(0).toLowerCase() + string.slice(1);
    }

    // BASE
    useEffect(() => {
        if (type === "Edit") {
            const directoryPath = localStorage.getItem('directoryPath');
            if (!directoryPath) return;


            fs.readFile(directoryPath + '/.workflow_cache.json', 'utf8', (err, data) => {
                if (err) {
                    console.error(err)
                    return
                }
                // CORRECTIF 24/04 - Ajout d'une condition pour supprimer les clés null (blade non inspectées)
                const allData = JSON.parse(data);
                for (const key1 in allData) {
                    for (const key2 in allData[key1]) {
                        for (const key3 in allData[key1][key2]) {
                            for (const key4 in allData[key1][key2][key3]) {
                                if (allData[key1][key2][key3][key4] === null) {
                                    for (const key in allData[key1][key2]) {
                                        delete allData[key1][key2][key];
                                    }
                                    delete allData[key1][key2];
                                }
                            }
                        }
                    }
                }
                setFullList(allData);
            }
            )
        }
    }, []);



    const handleConfirm = () => {
        if (type === "Edit") {
            const directoryPath = localStorage.getItem('directoryPath');
            fs.readFile(directoryPath + '/.workflow_cache.json', 'utf8', (err, data) => {
                if (err) {
                    console.error(err);
                    return;
                }
                let newData = JSON.parse(data);

                if (newData[selectWT][selectBlade][selectSide]['State'] <= fromStep) {
                    console.log('error');
                    onDate();
                    return;
                } else {
                    fs.readFile(directoryPath + '/' + selectWT + '/' + selectBlade + '/' + selectSide + '/side_state.json', 'utf8', (err, data) => {
                        if (err) {
                            console.error(err);
                            return;
                        }
                        let newSideState = JSON.parse(data);
                        const stepsList = ['Process', 'Validate', 'Assemble', 'Optimize', 'Import'];
                        const steps = [];
                        for (let i = 4; i >= fromStep - 1; i--) {
                            steps.push(stepsList[i]);
                        }

                        for (const step of steps) {
                            if (underCaseFirstLetter(step) === 'process') {
                                newSideState['states'][underCaseFirstLetter(step)]['compute']['done'] = false;
                                newSideState['states'][underCaseFirstLetter(step)]['cutout']['done'] = false;
                            } else if (underCaseFirstLetter(step) === 'validate') {
                                if (!newSideState['states']['validate']['historic']) {
                                    newSideState['states']['validate']['historic'] = [];
                                }
                                newSideState['states']['validate']['historic'].push({
                                    "date": new Date().toISOString().slice(0, 10),
                                    // and add previous values
                                    "user": newSideState['states']['validate']['user'],
                                    "nb_good_matches": newSideState['states']['validate']['nb_good_matches'],
                                    "nb_good_geotags": newSideState['states']['validate']['nb_good_geotags'],
                                    "nb_good_lines": newSideState['states']['validate']['nb_good_lines'],
                                    "nb_manuals": newSideState['states']['validate']['nb_manuals'],
                                    // Remove duplicated "date" key
                                });
                                // reset values
                                newSideState['states']['validate']['done'] = false;
                                newSideState['states']['validate']['nb_good_matches'] = 0;
                                newSideState['states']['validate']['nb_good_geotags'] = 0;
                                newSideState['states']['validate']['nb_good_lines'] = 0;
                                newSideState['states']['validate']['nb_manuals'] = 0;
                                newSideState['states']['validate']['date'] = null;
                                newSideState['states']['validate']['user'] = null;
                            } else {
                                newSideState['states'][underCaseFirstLetter(step)]['done'] = false;
                            }
                        }

                        console.log('after change: ');
                        console.log(newSideState);
                        const sideStateToWrite = JSON.stringify(newSideState);

                        fs.writeFile(directoryPath + '/' + selectWT + '/' + selectBlade + '/' + selectSide + '/side_state.json', sideStateToWrite, (err) => {
                            if (err) {
                                console.error(err);
                                return;
                            }

                            // Correction problème actualisation mission sheet
                            fs.readFile(directoryPath + '/mission_sheet.json', 'utf8', (err, data) => {
                                if (err) {
                                    console.error(err);
                                    return;
                                }

                                const newMissionSheet = JSON.parse(data);
                                newMissionSheet['progression']['step'] = fromStep;
                                newMissionSheet['progression']['date'] = new Date().toISOString().slice(0, 10);

                                fs.writeFile(directoryPath + '/mission_sheet.json', JSON.stringify(newMissionSheet), (err) => {
                                    if (err) {
                                        console.error(err);
                                        return;
                                    }

                                    // Update workflow_cache.json
                                    newData[selectWT][selectBlade][selectSide]['State'] = fromStep;

                                    fs.writeFile(directoryPath + '/.workflow_cache.json', JSON.stringify(newData), (err) => {
                                        if (err) {
                                            console.error(err);
                                            return;
                                        }

                                        // If fromStep is less than or equal to 2, delete validation files
                                        if (fromStep <= 2) {
                                            // validation_cache.json
                                            fs.readFile(directoryPath + '/.validation_cache.json', 'utf8', (err, data) => {
                                                if (err) {
                                                    console.error(err);
                                                    return;
                                                }

                                                const validationData = JSON.parse(data);
                                                validationData[selectWT][selectBlade][selectSide]['Match'] = false;
                                                validationData[selectWT][selectBlade][selectSide]['Geotag'] = false;

                                                if (selectSide === 'TE') {
                                                    validationData[selectWT][selectBlade][selectSide]['Line'] = false;
                                                }

                                                fs.writeFile(directoryPath + '/.validation_cache.json', JSON.stringify(validationData), (err) => {
                                                    if (err) {
                                                        console.error(err);
                                                        return;
                                                    }
                                                    console.log('validation_cache.json was rewritten');
                                                });
                                            });

                                            const exportPath = directoryPath + '/' + selectWT + '/' + selectBlade + '/' + selectSide + '/export';
                                            fs.unlink(exportPath + '/validation_logs.json', (err) => {
                                                if (err) {
                                                    console.error(err);
                                                    return;
                                                } else {
                                                    console.log('validation_logs.json was deleted');
                                                }
                                            });
                                        }

                                        onConfirm();
                                    });
                                });
                            });
                        });
                    });
                }


            });

        }
    }

    const handleCancel = () => {
        onCancel();
    };

    // EDIT FUNCTIONS

    useEffect(() => {
        setWT(["Select WT"])
        for (const key in fullList) {
            setWT(prev => [...prev, key]);
        }
    }, [fullList]);

    useEffect(() => {
        setSelectBlade("Select Blade");
        setBladeList(["Select Blade"]);
        if (selectWT !== "Select WT") {
            for (const key in fullList[selectWT]) {
                setBladeList(prev => [...prev, key]);
            }
            document.getElementById("Blade").selectedIndex = 0;
        }

    }, [selectWT]);

    useEffect(() => {
        setSelectSide("Select Side");
        setSideList(["Select Side"]);
        if (selectBlade !== "Select Blade") {
            for (const key in fullList[selectWT][selectBlade]) {
                setSideList(prev => [...prev, key]);
            }
        }
    }, [selectBlade]);

    useEffect(() => {
        if (selectSide === "Select Side") return;

        setAvailableSteps(["Select Step"]);
        const directoryPath = localStorage.getItem('directoryPath');

        fs.readFile(directoryPath + '/.workflow_cache.json', 'utf8', (err, data) => {
            if (err) {
                console.error(err)
                return
            }
            const newData = JSON.parse(data);
            const actualStep = newData[selectWT][selectBlade][selectSide]['State'];
            console.log('actualStep: ' + actualStep);
            const stepsList = ['Process', 'Validate', 'Assemble', 'Optimize', 'Import']
            const steps = [];
            for (let i = 0; i < actualStep - 1; i++) {
                steps.push(stepsList[i]);
            }

            setAvailableSteps(steps);
        })

    }, [selectSide]);


    const handleChangeWT = (e) => {
        setSelectWT(e.target.value);
        setFromStep('Select Step')
    }

    const handleChangeBlade = (e) => {
        setSelectBlade(e.target.value);
        setFromStep('Select Step')
    }

    const handleChangeSide = (e) => {
        setSelectSide(e.target.value);
        setFromStep('Select Step')
    }


    const handleStep = (e) => {
        if (e.target.value === "Select Step") {
            setFromStep('Select Step')
        } else {
            if (e.target.value === "Process") {
                setFromStep(1);
            }
            if (e.target.value === "Validate") {
                setFromStep(2);
            }
            if (e.target.value === "Assemble") {
                setFromStep(3);
            }
            if (e.target.value === "Optimize") {
                setFromStep(4);
            }
            if (e.target.value === "Import") {
                setFromStep(5);
            }
        }
    }


    if (optiontype === "Edit") {
        return (
            <div className='flex flex-col justify-center'>
                <div className='fixed inset-0 bg-black opacity-25 z-50'></div>
                <div className='fixed inset-0 flex items-center justify-center z-50'>
                    <div className='bg-white p-5 rounded-md shadow-md sm:w-1/2 xl:w-1/4'>
                        <h1 className='font-bold text-lg'>Edit</h1>
                        <p className='ml-1 font-bold text-left text-sm italic'>Select a wind turbine</p>
                        <select onChange={handleChangeWT} className='w-full border-2 border-gray-300 bg-white h-10 px-5 pr-16 rounded-lg text-sm focus:outline-none' name="WT" id="WT">
                            {WT.map((item, index) => {
                                return (
                                    <option key={index} value={item}>{item}</option>
                                )
                            })}
                        </select>
                        {selectWT !== "Select WT" && <p className='mt-4 ml-1 font-bold text-left text-sm italic'>Select a component</p>}
                        {selectWT !== "Select WT" && <select onChange={handleChangeBlade} className='w-full border-2 border-gray-300 bg-white h-10 px-5 pr-16 rounded-lg text-sm focus:outline-none' name="Blade" id="Blade">
                            {bladeList.map((item, index) => {
                                return (
                                    <option key={index} value={item}>{item}</option>
                                )
                            })}
                        </select>}
                        {selectBlade !== "Select Blade" && <p className='mt-4 ml-1 font-bold text-left text-sm italic'>Select a Side</p>}
                        {selectBlade !== "Select Blade" && <select onChange={handleChangeSide} className='w-full border-2 border-gray-300 bg-white h-10 px-5 pr-16 rounded-lg text-sm focus:outline-none' name="Side" id="Side">
                            {sideList.map((item, index) => {
                                return (
                                    <option key={index} value={item}>{item}</option>
                                )
                            })}
                        </select>}


                        {selectWT !== "Select WT" && selectBlade !== "Select Blade" && selectSide !== "Select Side" &&
                            <div className='mt-4'>
                                <p className='ml-1 font-bold text-left text-sm italic'>From Step</p>
                                <select className='w-full border-2 border-gray-300 bg-white h-10 px-5 pr-16 rounded-lg text-sm focus:outline-none' name="Step" id="Step" onChange={handleStep}>
                                    {/* <option value="1">Process</option>
                                    <option value="2">Validate</option>
                                    <option value="3">Assemble</option>
                                    <option value="4">Optimize</option> */}
                                    {availableSteps[0] !== "Select Step" && <option defaultValue="Select Step">Select Step</option>}
                                    {availableSteps[0] !== "Select Step" && availableSteps.map((item, index) => {
                                        return (
                                            <option key={index} value={item}>{item}</option>
                                        )
                                    })}
                                    {availableSteps[0] === "Select Step" &&
                                        <option defaultValue={"Select Step"} disabled>This Side Is already at first available Step</option>
                                    }
                                </select>
                            </div>
                        }
                        <div className='mt-6 flex flex-row justify-around w-full'>
                            <button className='NoDrag mr-3 w-2/6 text-sm font-bold px-2 py-1 text-black bg-gray-200 rounded-md hover:bg-gray-100' onClick={handleCancel}>Cancel</button>
                            {selectWT !== "Select WT" && selectBlade !== "Select Blade" && selectSide !== "Select Side" && fromStep !== 'Select Step' && availableSteps[0] !== "Select Step" &&
                                <button className='NoDrag w-2/6 mr-2 text-sm font-bold px-2 py-1 text-black bg-orange rounded-md hover:bg-orange-100' onClick={handleConfirm}>Confirm</button>
                            }
                        </div>
                    </div>
                </div>
            </div>

        )
    } else if (optiontype === "Setup") {
        return (
            <div className='flex flex-col justify-center'>
                <div className='fixed inset-0 bg-black opacity-25 z-50'></div>
                <div className='fixed inset-0 flex items-center justify-center z-50'>
                    <div className='bg-white p-5 rounded-md shadow-md sm:w-1/2 xl:w-1/4'>
                        <h1 className='font-bold text-xl mb-2'>Setup</h1>
                        <p className='font-bold text-xl italic'>OPTION NOT AVAILABLE YET</p>
                        <button className='mt-5 NoDrag w-3/6 text-sm font-bold px-2 py-1 text-black bg-red rounded-md hover:bg-orange-100' onClick={handleCancel}>Return</button>
                    </div>
                </div>
            </div>

        )
    } else if (optiontype === "Duplicate") {
        return (
            <div className='flex flex-col justify-center'>
                <div className='fixed inset-0 bg-black opacity-25 z-50'></div>
                <div className='fixed inset-0 flex items-center justify-center z-50'>
                    <div className='bg-white p-5 rounded-md shadow-md sm:w-1/2 xl:w-1/4'>
                        {/* Alert message, option not available Yet with warning */}
                        <h1 className='font-bold text-xl mb-2'>Duplicate</h1>
                        <p className='font-bold text-xl italic'>OPTION NOT AVAILABLE YET</p>
                        <button className='mt-5 NoDrag w-3/6 text-sm font-bold px-2 py-1 text-black bg-red rounded-md hover:bg-orange-100' onClick={handleCancel}>Return</button>
                    </div>
                </div>
            </div>

        )
    } else if (optiontype === "Clean") {
        return (
            <div className='flex flex-col justify-center'>
                <div className='fixed inset-0 bg-black opacity-25 z-50'></div>
                <div className='fixed inset-0 flex items-center justify-center z-50'>
                    <div className='bg-white p-5 rounded-md shadow-md sm:w-1/2 xl:w-1/4'>
                        <h1 className='font-bold text-xl mb-2'>Clean</h1>
                        <p className='font-bold text-xl italic'>OPTION NOT AVAILABLE YET</p>
                        <button className='mt-5 NoDrag w-3/6 text-sm font-bold px-2 py-1 text-black bg-red rounded-md hover:bg-orange-100' onClick={handleCancel}>Return</button>
                    </div>
                </div>
            </div>

        )
    } else if (optiontype === "Archive") {
        return (
            <div className='flex flex-col justify-center'>
                <div className='fixed inset-0 bg-black opacity-25 z-50'></div>
                <div className='fixed inset-0 flex items-center justify-center z-50'>
                    <div className='bg-white p-5 rounded-md shadow-md sm:w-1/2 xl:w-1/4'>
                        <h1 className='font-bold text-xl mb-2'>Archive</h1>
                        <p className='font-bold text-xl italic'>OPTION NOT AVAILABLE YET</p>
                        <button className='mt-5 NoDrag w-3/6 text-sm font-bold px-2 py-1 text-black bg-red rounded-md hover:bg-orange-100' onClick={handleCancel}>Return</button>
                    </div>
                </div>
            </div>

        )
    } else {
        return (
            <div className='flex flex-col justify-center'>
                <div className='fixed inset-0 bg-black opacity-25 z-50'></div>
                <div className='fixed inset-0 flex items-center justify-center z-50'>
                    <div className='bg-white p-5 rounded-md shadow-md sm:w-1/2 xl:w-1/4'>
                        <h1 className='font-bold text-xl mb-2'>Error</h1>
                        <p className='font-bold text-xl italic'>Please go Back</p>
                        <button className='mt-5 NoDrag w-3/6 text-sm font-bold px-2 py-1 text-black bg-red rounded-md hover:bg-orange-100' onClick={handleCancel}>Return</button>
                    </div>
                </div>
            </div>

        )
    }

}


export default OptionsPanel;

import React, { useState, useEffect, useRef } from "react";
import ReactCrop from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import Modal from "react-modal";
import Loader from '../Loader/Loader';
import {
    TransformWrapper,
    TransformComponent
} from "react-zoom-pan-pinch";
const fs = window.require('fs');
const Side = require("../../utils/BladeDamageCalculator").default.Side;
const Damage = require("../../utils/BladeDamageCalculator").default.Damage;
const isDev = window.require('electron-is-dev');

Modal.setAppElement("#root");

function Annotate({ wt, component, side, imageUrl, directoryUrl }) {
    const [loading, setLoading] = useState(true);
    const [crop, setCrop] = useState({ unit: "%", width: 0, aspect: 1 / 1 });
    const [previewCropUrl, setPreviewCropUrl] = useState(null);
    const [annotationUrl, setAnnotationUrl] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [imgSrc, setImgSrc] = useState(null);
    const [realImageSize, setRealImageSize] = useState({ width: 0, height: 0 });


    useEffect(() => {
        if (!imageUrl) return;
        setImgSrc(imageUrl);
        const img = new Image();
        img.src = imageUrl;
        img.onload = () => {
            setRealImageSize({ width: img.width, height: img.height });
        };

    }, []);

    const [imageChars, setImageChars] = useState(null);
    const [damageObj, setDamageObj] = useState(null);
    const [bladeSerialNumber, setBladeSerialNumber] = useState(null);

    const handleSetSideObject = () => {
        let bladePath = null;
        let bladeSerialNumber = component;
        let bladeModel = null;
        let sidePath = null;
        let missionType = null;

        fs.readFile(directoryUrl + '\\' + wt + '\\InspectionReport.json', (err, data) => {
            if (err) {
                console.log('error reading inspection report');
                console.log(err);
                return;
            }
            let wtData = JSON.parse(data);
            bladePath = directoryUrl + '\\' + wt;
            bladeModel = wtData.u_blade_type;
            sidePath = directoryUrl + '\\' + wt + '\\' + component + '\\' + side;
            setBladeSerialNumber(
                {
                    A: wtData.u_blade_a,
                    B: wtData.u_blade_b,
                    C: wtData.u_blade_c,
                }
            )
            missionType = wtData.missionType === 'Sherlock' ? 3 : 4;
            let sideObj = new Side(bladePath, bladeSerialNumber, bladeModel, sidePath, missionType);
            const imageChars = sideObj.getImageChars();
            setImageChars(imageChars);
        })
    };



    useEffect(() => {
        if (side === null || side === undefined) return;
        handleCreateSideDamageJsonIfNotExist();
        setImageChars(null);
        handleSetSideObject();
    }, [side, wt]);

    const handleCreateSideDamageJsonIfNotExist = () => {
        const sideDamageJsonPath = directoryUrl + '\\' + wt + '\\' + component + '\\' + side + '\\SideDamage.json';
        if (!fs.existsSync(sideDamageJsonPath)) {
            const damageObj = {
                "DamageEntry": []
            };

            fs.writeFile(sideDamageJsonPath, JSON.stringify(damageObj), (err) => {
                if (err) {
                    console.log('error writing damage.json');
                    console.log(err);
                }
            });
        }
    };


    const handleCropComplete = (croppedArea) => {
        setCrop(croppedArea);
        if (imgSrc && croppedArea.width && croppedArea.height) {
            const croppedImageUrl = getCroppedImageUrl(imageUrl, croppedArea);
            setPreviewCropUrl(croppedImageUrl);
            handleModal();
        }
    };

    const getCroppedImageUrl = (image, crop) => {
        const img = new Image();
        img.src = imgSrc;
        const imageDoc = document.getElementById("imgGetSize");
        const displayImageSize = {
            width: imageDoc.clientWidth,
            height: imageDoc.clientHeight
        };

        const cropRealSize = {
            x: Math.round(crop.x * realImageSize.width / displayImageSize.width * 100) / 100,
            y: Math.round(crop.y * realImageSize.height / displayImageSize.height * 100) / 100,
            width: Math.round(crop.width * realImageSize.width / displayImageSize.width * 100) / 100,
            height: Math.round(crop.height * realImageSize.height / displayImageSize.height * 100) / 100
        };


        let imgURL = null;
        if (!isDev) {
            imgURL = imgSrc
        } else {
            const imageName = imgSrc.substring(imgSrc.lastIndexOf('/') + 1);
            imgURL = directoryUrl + '\\' + wt + '\\' + component + '\\' + side + '\\' + imageName;
        }


        const damageObjToSet = new Damage(imageChars, imgURL, cropRealSize.x, cropRealSize.y, cropRealSize.width, cropRealSize.height);
        setDamageObj(damageObjToSet);

        const canvas = document.createElement("canvas");
        canvas.width = cropRealSize.width;
        canvas.height = cropRealSize.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(
            img,
            cropRealSize.x,
            cropRealSize.y,
            cropRealSize.width,
            cropRealSize.height,
            0,
            0,
            cropRealSize.width,
            cropRealSize.height
        );

        const url = canvas.toDataURL("image/jpeg");
        setPreviewCropUrl(url);
        return canvas.toDataURL("image/jpeg");
    };


    useEffect(() => {
        if (imageChars === null) return;
        setLoading(false);
    }, [imageChars]);


    const [displayImageSize, setDisplayImageSize] = useState({ width: 0, height: 0 });
    const handleConfirm = async (e) => {
        e.preventDefault();
        const img = new Image();
        img.src = imageUrl;

        const failure_type = document.getElementById('failure_type').value;

        // convert crop part to real size
        const cropRealSize = {
            x: crop.x * realImageSize.width / displayImageSize.width,
            y: crop.y * realImageSize.height / displayImageSize.height,
            width: crop.width * realImageSize.width / displayImageSize.width,
            height: crop.height * realImageSize.height / displayImageSize.height
        };

        /************************************************************************************/
        /************************************************************************************/
        /*      OLD VERSION WITH FULL IMAGE   */



        const canvas = document.createElement("canvas");
        canvas.width = realImageSize.width;
        canvas.height = realImageSize.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(
            img,
            0,
            0,
            realImageSize.width,
            realImageSize.height,
            0,
            0,
            realImageSize.width,
            realImageSize.height
        );

        ctx.beginPath();
        ctx.lineWidth = "6";
        ctx.strokeStyle = "red";
        ctx.rect(cropRealSize.x, cropRealSize.y, cropRealSize.width, cropRealSize.height);
        ctx.stroke();


        const annotationUrl = canvas.toDataURL("image/jpeg");



        /************************************************************************************/
        /************************************************************************************/


        /************************************************************************************/
        /* OVERVIEW VERSION OLD */
        /************************************************************************************/
        /*
                const overviewCanvas = document.createElement("canvas");
                overviewCanvas.width = realImageSize.width;
                overviewCanvas.height = realImageSize.height;
        
                const overviewCtx = overviewCanvas.getContext("2d");
        
                // Calculate the crop boundaries to stay within the image borders
                const cropX = Math.max(0, cropRealSize.x - cropRealSize.width * 2);
                const cropY = Math.max(0, cropRealSize.y - cropRealSize.height * 2);
                const cropWidth = Math.min(realImageSize.width - cropX, cropRealSize.width * 5);
                const cropHeight = Math.min(realImageSize.height - cropY, cropRealSize.height * 5);
        
                overviewCtx.drawImage(
                    img,
                    cropX,
                    cropY,
                    cropWidth,
                    cropHeight,
                    0,
                    0,
                    realImageSize.width,
                    realImageSize.height
                );
        
                // Draw annotation area
                overviewCtx.beginPath();
                overviewCtx.lineWidth = "6";
                overviewCtx.strokeStyle = "red";
        
                // Calculate the annotation area coordinates and dimensions relative to the overview canvas
                const annotationX = (cropRealSize.x - cropX) * (realImageSize.width / cropWidth);
                const annotationY = (cropRealSize.y - cropY) * (realImageSize.height / cropHeight);
                const annotationWidth = cropRealSize.width * (realImageSize.width / cropWidth);
                const annotationHeight = cropRealSize.height * (realImageSize.height / cropHeight);
        
                overviewCtx.rect(annotationX, annotationY, annotationWidth, annotationHeight);
                overviewCtx.stroke();
        
                const overviewUrl = overviewCanvas.toDataURL("image/jpeg");
        */
        /************************************************************************************/
        /***********************NEW***************************************/
        /************************************************************************************/
        // overviewUrl is previewCropUrl + 4 times the size of the crop except if the crop is too close to the edge of the image
        const overviewCanvas = document.createElement("canvas");

        const overviewCtx = overviewCanvas.getContext("2d");

        // Calculate the crop boundaries to stay within the image borders
        const cropX = Math.max(0, cropRealSize.x - cropRealSize.width * 2);
        const cropY = Math.max(0, cropRealSize.y - cropRealSize.height * 2);
        const cropWidth = Math.min(realImageSize.width - cropX, cropRealSize.width * 5);
        const cropHeight = Math.min(realImageSize.height - cropY, cropRealSize.height * 5);

        overviewCanvas.width = cropWidth;
        overviewCanvas.height = cropHeight;

        overviewCtx.drawImage(
            img,
            cropX,
            cropY,
            cropWidth,
            cropHeight,
            0,
            0,

            cropWidth,
            cropHeight
        );

        // Draw annotation area
        overviewCtx.beginPath();
        overviewCtx.lineWidth = "6";
        overviewCtx.strokeStyle = "red";

        // Calculate the annotation area coordinates and dimensions relative to the overview canvas
        const annotationX = cropRealSize.x - cropX;
        const annotationY = cropRealSize.y - cropY;
        const annotationWidth = cropRealSize.width;
        const annotationHeight = cropRealSize.height;

        overviewCtx.rect(annotationX, annotationY, annotationWidth, annotationHeight);
        overviewCtx.stroke();

        const overviewUrl = overviewCanvas.toDataURL("image/jpeg");

        /************************************************************************************/
        /************************************************************************************/


        const sub_component = document.getElementById('sub_component').value;

        const isDoubt = document.getElementById('doubt').checked ? true : false;

        await handleSaveDamageEntry(failure_type, 'Shell', sub_component, overviewUrl, previewCropUrl, isDoubt);

        setAnnotationUrl(annotationUrl);
        setPreviewCropUrl(null);
        setCrop({ unit: "%", width: 0, aspect: 1 / 1 });
        setAllowMoveImg(true);
        setShowModal(false);
    };



    const handleCancel = (e) => {
        e.preventDefault();
        setPreviewCropUrl(null);
        setAnnotationUrl(null);
        setCrop({ unit: "%", width: 0, aspect: 1 / 1 });
        setShowModal(false);
        setAllowMoveImg(true);
    };

    const handleSaveDamageEntry = async (
        failure_type,
        blade_sub_section,
        sub_component,
        overviewUrl,
        previewCropUrl,
        isDoubt
    ) => {

        const pathToSideDamageJson = directoryUrl + '\\' + wt + '\\' + component + '\\' + side + '\\' + 'SideDamage.json';

        // convert crop part to real size
        const cropRealSize = {
            x: crop.x * realImageSize.width / displayImageSize.width,
            y: crop.y * realImageSize.height / displayImageSize.height,
            width: crop.width * realImageSize.width / displayImageSize.width,
            height: crop.height * realImageSize.height / displayImageSize.height
        };
        // Create the json file

        let bladeSerialToSet;

        if (component === '1' || component === 'A') {
            bladeSerialToSet = bladeSerialNumber.A;
        } else if (component === '2' || component === 'B') {
            bladeSerialToSet = bladeSerialNumber.B;
        } else if (component === '3' || component === 'C') {
            bladeSerialToSet = bladeSerialNumber.C;
        } else {
            console.log('Error: component not found, taking default manual value : ' + component);
            bladeSerialToSet = component
        }


        console.log('Saving damage entry, please wait...');
        // read the json file
        fs.readFile(pathToSideDamageJson, "utf-8", (err, data) => {
            if (err) {
                console.log(err);
            } else {
                // parse the json file
                const obj = JSON.parse(data);

                const id = Math.floor(Math.random() * 1000000000);

                const jsonDamageEntry = {
                    // component inutile si on utilise toujours des serials, mais ici pour flex si j'avais.
                    id: id,
                    imgPath: imageUrl,
                    component: component,
                    isDoubt: isDoubt,
                    u_blade_area: side,
                    u_blade_section: damageObj.section,
                    u_blade_serial_number: bladeSerialToSet,
                    u_blade_sub_section: blade_sub_section,
                    u_df_end: damageObj.distanceFromFlangeEnd,
                    u_df_start: damageObj.distanceFromFlangeStart,
                    u_inside_outside: "Outside",
                    u_profile_depth_end: damageObj.profileDepthEnd,
                    u_profile_depth: damageObj.profileDepthStart,
                    u_main_component: "Blade",
                    u_sub_component: sub_component,
                    coordonates: {
                        x: cropRealSize.x,
                        y: cropRealSize.y,
                        width: cropRealSize.width,
                        height: cropRealSize.height
                    },
                    u_failure_type: failure_type,
                    u_crop_image: previewCropUrl.replace("data:image/jpeg;base64,", ""),
                    u_overview_image: overviewUrl.replace("data:image/jpeg;base64,", ""),
                };
                // add the new damage entry in the DamageEntry array 

                const overviewImgBin64 = overviewUrl.replace("data:image/jpeg;base64,", "");
                // convert base64 to image
                const imgToSet = new Image();
                imgToSet.src = 'data:image/jpeg;base64,' + overviewImgBin64;
                const jsonForImg = {
                    id: id,
                    u_overview_image: imgToSet.src,
                    u_failure_type: failure_type,
                    u_blade_sub_section: blade_sub_section,
                    sub_component: sub_component,
                }

                setThisAnnotationData([...thisAnnotationData, jsonForImg]);
                obj.DamageEntry.push(jsonDamageEntry);
                // convert it in json format
                const json = JSON.stringify(obj);
                // write it in the json file
                fs.writeFile(pathToSideDamageJson, json, "utf-8", (err) => {
                    if (err) {
                        console.log(err);
                    }
                    console.log("Damage entry saved !");
                    // push to thisAnnotationData
                });
            }
        });
    };

    const handleModal = () => {
        setShowModal(!showModal)
    }

    const handleAnnotation = () => {
        setAnnotationUrl(null);
        setAllowMoveImg(!allowMoveImg);
    }


    // Communication entre le composant TransformWrapper et le composant ReactCrop
    const [scale, setScale] = useState(1);


    const transformWrapperRef = useRef(null);

    const handleAdaptScale = (e) => {
        const propTransform = transformWrapperRef.current;
        setScale(propTransform.instance.transformState.scale);

        calculateImageDisplaySize(); // <-- add this line
    }

    const calculateImageDisplaySize = () => {
        const imageDoc = document.getElementById("imgGetSize");
        const displayImageSize = {
            width: imageDoc.clientWidth,
            height: imageDoc.clientHeight
        };

        displayImageSize.width = displayImageSize.width / scale;
        displayImageSize.height = displayImageSize.height / scale;
        // setImgSize(displayImageSize);
        setDisplayImageSize(displayImageSize);

    }


    // ************ RETOUR ET MODIF IMAGE ************



    const [alreadyAnnotated, setAlreadyAnnotated] = useState(false)
    const [thisAnnotationData, setThisAnnotationData] = useState([])
    const [indexAnnotationData, setIndexAnnotationData] = useState(0)



    const handlePreviousAnnotation = () => {
        if (indexAnnotationData > 0) {
            setIndexAnnotationData(indexAnnotationData - 1)
        }
    }


    const handleNextAnnotation = () => {
        if (indexAnnotationData < thisAnnotationData.length - 1) {
            setIndexAnnotationData(indexAnnotationData + 1)
        }
    }



    useEffect(() => {
        setLoading(true)
        setAlreadyAnnotated(false)
        setCrop({ unit: "%", width: 0, aspect: 1 / 1 });
        setPreviewCropUrl(null);
        setAnnotationUrl(null);
        setThisAnnotationData([]);
        setIndexAnnotationData(0);
        if (!fs.existsSync(directoryUrl + '\\' + wt + '\\' + component + '\\' + side + '\\' + 'SideDamage.json')) {
            handleCreateSideDamageJsonIfNotExist
        }
        const pathToSideDamage = directoryUrl + '\\' + wt + '\\' + component + '\\' + side + '\\' + 'SideDamage.json';
        fs.readFile(pathToSideDamage, "utf-8", (err, data) => {
            let stateToSet = false;
            const resultArray = [];
            const parsedData = JSON.parse(data);
            parsedData.DamageEntry.forEach((damageEntry) => {
                if (damageEntry.imgPath === imageUrl) {
                    stateToSet = true;
                    const bin64img = damageEntry.u_overview_image
                    // convert base64 to image
                    const img = new Image();
                    img.src = 'data:image/jpeg;base64,' + bin64img;





                    const result =
                    {
                        id: damageEntry.id,
                        u_overview_image: img.src,
                        u_failure_type: damageEntry.u_failure_type,
                        u_blade_sub_section: damageEntry.u_blade_sub_section,
                        sub_component: damageEntry.u_sub_component,
                    }

                    resultArray.push(result);
                }
            }
            );


            setAlreadyAnnotated(stateToSet);

            setImgSrc(imageUrl);

            setThisAnnotationData(resultArray);
        });
        setLoading(false)
    }, [imageUrl]);


    const handleCorrectSubComponent = (e) => {
        setLoading(true)
        const pathToSideDamage = directoryUrl + '\\' + wt + '\\' + component + '\\' + side + '\\' + 'SideDamage.json';
        const newSubComponent = e.target.value;
        fs.readFile(pathToSideDamage, "utf-8", (err, data) => {
            const parsedData = JSON.parse(data);
            parsedData.DamageEntry.forEach((damageEntry) => {
                if (damageEntry.id === thisAnnotationData[indexAnnotationData].id) {
                    damageEntry.u_sub_component = newSubComponent;
                }
            }
            );
            const json = JSON.stringify(parsedData);

            fs.writeFile(pathToSideDamage, json, "utf-8", (err) => {
                if (err) {
                    console.log(err);
                }
                console.log("Sub component saved !");

                const newArray = thisAnnotationData;
                newArray[indexAnnotationData].u_sub_component = newSubComponent;
                setThisAnnotationData(newArray);

            }
            );
            setLoading(false)
            setTimeout(() => {
                document.getElementById("sub_component_correction").value = newSubComponent;
            }, 100);
        }

        );



    }

    const handleCorrectFailureType = (e) => {
        setLoading(true)
        const pathToSideDamage = directoryUrl + '\\' + wt + '\\' + component + '\\' + side + '\\' + 'SideDamage.json';
        const newFailureType = e.target.value;
        fs.readFile(pathToSideDamage, "utf-8", (err, data) => {
            const parsedData = JSON.parse(data);
            parsedData.DamageEntry.forEach((damageEntry) => {
                if (damageEntry.id === thisAnnotationData[indexAnnotationData].id) {
                    damageEntry.u_failure_type = newFailureType;
                }
            }
            );
            const json = JSON.stringify(parsedData);

            fs.writeFile(pathToSideDamage, json, "utf-8", (err) => {
                if (err) {
                    console.log(err);
                }
                console.log("Failure type saved !");

                const newArray = thisAnnotationData;
                newArray[indexAnnotationData].u_failure_type = newFailureType;
                setThisAnnotationData(newArray)

            }
            );
            setLoading(false)
            setTimeout(() => {
                document.getElementById("failure_type_correction").value = newFailureType;
            }, 100);
        }

        );
    }

    const handleDeleteAnnotation = () => {
        setLoading(true)
        setIndexAnnotationData(0)
        const pathToSideDamage = directoryUrl + '\\' + wt + '\\' + component + '\\' + side + '\\' + 'SideDamage.json';
        fs.readFile(pathToSideDamage, "utf-8", (err, data) => {
            const parsedData = JSON.parse(data);
            parsedData.DamageEntry = parsedData.DamageEntry.filter((damageEntry) => {
                return damageEntry.id !== thisAnnotationData[indexAnnotationData].id;
            });

            const json = JSON.stringify(parsedData);
            fs.writeFile(pathToSideDamage, json, "utf-8", (err) => {
                if (err) {
                    console.log(err);
                }
                console.log("Annotation deleted !");

                const newArray = thisAnnotationData.filter((annotation) => {
                    return annotation.id !== thisAnnotationData[indexAnnotationData].id;
                });
                // 
                if (newArray.length === 0) {
                    setThisAnnotationData([]);
                    console.log("No more annotations !");
                    setAlreadyAnnotated(false)
                } else {
                    setThisAnnotationData(newArray)
                }
                setTimeout(() => {
                    setLoading(false)
                }, 300);
            }
            );
        }

        );
    }

    // ***************************************************
    const handleShowAnnotation = (arg) => {
        if (arg === 0) {
            console.log("No annotations !");
            return;
        }
        else {
            setAlreadyAnnotated(!alreadyAnnotated)
        }
    }

    useEffect(() => {
        if (!document.getElementById("imgGetSize")) return
        calculateImageDisplaySize();
    }, [document.getElementById("imgGetSize")]);



    // DEPLACEMENT IMAGE 
    const [allowMoveImg, setAllowMoveImg] = useState(true);


    if (loading) {
        return (
            <div className="dashboard flex flex-col items-center hview">
                <Loader />
            </div>
        )
    }

    if (alreadyAnnotated) {
        return (
            <div className="dashboard flex flex-col items-center hview">
                <div className="flex flex-col items-center h-5/6">
                    <TransformWrapper
                        initialScale={1}
                        centerOnInit={true}
                    >
                        <TransformComponent>
                            <img src={thisAnnotationData[indexAnnotationData].u_overview_image} alt="Overview" style={{ maxWidth: '100%', maxHeight: '90%' }} />
                        </TransformComponent>
                    </TransformWrapper>
                    <div className='flex justify-around w-full mt-1'>
                        <button onClick={() => handleShowAnnotation(thisAnnotationData.length)}
                            className='
                            text-black font-bold py-2 px-4 rounded-full'>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round"
                                    strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                        </button>
                        <select id='sub_component_correction' name='sub_component_correction' value={thisAnnotationData[indexAnnotationData].u_sub_component} onChange={handleCorrectSubComponent} className='border-2 mb-3 w-1/3'>
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
                            <option value='Blade outside - Bondline'>Blade outside - Bondline</option>
                            <option value='Blade outside - Shell Coating (laminate not damaged)'>Blade outside - Shell Coating (laminate not damaged)</option>
                            <option value='Blade outside - Shell laminate'>Blade outside - Shell laminate</option>
                            <option value='Type of Sub-component is missing (Blade)'>Type of Sub-component is missing (Blade)</option>
                        </select>

                        <div className='flex justify-center items-center w-1/4'>
                            <button onClick={handlePreviousAnnotation} className='flex justify-center border-2 mb-3 w-1/4'>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <p className='mb-3 w-1/3 text-center'>{indexAnnotationData + 1}/{thisAnnotationData.length}</p>
                            <button onClick={handleNextAnnotation} className='flex justify-center border-2 mb-3 w-1/4'>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>

                        <select id='failure_type_correction' value={thisAnnotationData[indexAnnotationData].u_failure_type} onChange={handleCorrectFailureType} name='failure_type_correction' className='border-2 mb-3 w-1/3'>
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
                        <button onClick={handleDeleteAnnotation}>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="red" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="mb-3 w-6 h-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div >
        );

    }

    return (
        <>

            {imgSrc && (
                <TransformWrapper
                    initialScale={1}
                    wheel={{ step: 0.5 }}
                    onWheel={
                        handleAdaptScale
                    }
                    ref={transformWrapperRef}
                >
                    <React.Fragment>
                        <TransformComponent>
                            <ReactCrop
                                disabled={allowMoveImg}
                                crop={crop}
                                onComplete={handleCropComplete}
                                onChange={(newCrop) =>
                                    setCrop({
                                        x: newCrop.x / scale,
                                        y: newCrop.y / scale,
                                        width: newCrop.width / scale,
                                        height: newCrop.height / scale,
                                        unit: 'px',
                                    })
                                }
                                src={imgSrc}
                            >

                                {annotationUrl &&
                                    <img id='imgGetSize' src={annotationUrl} alt="Crop preview" />
                                }
                                {annotationUrl === null &&
                                    <img id='imgGetSize'
                                        src={imgSrc}
                                        alt="Crop preview"
                                    />
                                }
                            </ReactCrop>
                        </TransformComponent>
                    </React.Fragment>
                </TransformWrapper >
            )
            }
            <div className='flex justify-around'>
                <button onClick={() => handleShowAnnotation(thisAnnotationData.length)}
                    className='
                            text-black font-bold py-2 px-4 rounded-full'>
                    {thisAnnotationData.length} - Annotations
                </button>
                <button
                    className="NoSelectOnly"
                    onClick={() => {
                        handleAnnotation();
                    }}
                >
                    {allowMoveImg
                        ? <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-8 h-8 p-1 bg-white rounded-xl">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                        </svg>


                        : <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-8 h-8 p-1 bg-orange-100 rounded-xl">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                        </svg>
                    }
                </button>
            </div>
            {
                showModal &&
                <div className='absolute top-0 left-0 w-full h-full bg-gray-500 bg-opacity-50 z-50'>
                    <div className='absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1/2 h-4/6 bg-white rounded-lg'>
                        <div className='h-full w-full'>
                            <form onSubmit={handleConfirm} className='flex flex-col items-center justify-around h-full text-sm'>
                                {/* <label className='mt-5 w-1/3 text-left font-light' name='blade_sub_section'>Blade sub section :</label>
                                <select defaultValue={'Shell'} required id='blade_sub_section' name='blade_sub_section' className='border-2 mb-3 w-1/3'>
                                    <option value='Bonding'>Bonding</option>
                                    <option value='Shear Web'>Shear Web</option>
                                    <option value='Shell'>Shell</option>
                                </select> */}
                                <label className='mt-3 w-1/3 text-left font-light' name='sub_component'>Sub Component :</label>
                                <select id='sub_component' name='sub_component' className='border-2 mb-3 w-1/3'>
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
                                    <option value='Blade outside - Bondline'>Blade outside - Bondline</option>
                                    <option value='Blade outside - Shell Coating (laminate not damaged)'>Blade outside - Shell Coating (laminate not damaged)</option>
                                    <option value='Blade outside - Shell laminate'>Blade outside - Shell laminate</option>
                                    <option value='Type of Sub-component is missing (Blade)'>Type of Sub-component is missing (Blade)</option>
                                </select>
                                <label className='w-1/3 text-left font-light' name='failure_type'>Failure Type :</label>
                                <select id='failure_type' name='failure_type' className='border-2 mb-3 w-1/3'>
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
                                <div className="flex items-center">
                                    <label htmlFor="doubt">Any doubt on this annotation ? check me ! </label>
                                    <input type="checkbox" id="doubt" name="doubt" className="ml-2" />
                                </div>
                                <img src={previewCropUrl} alt='blade' className='min-w-1/2 max-h-30 mt-3' />
                                <div className="flex w-full text-sm justify-around pt-5">
                                    <p> Df Start: {damageObj.distanceFromFlangeStart} </p>
                                    <p> Df End: {damageObj.distanceFromFlangeEnd} </p>
                                    <p> Profile Depth Start:  {damageObj.profileDepthStart} </p>
                                    <p> Profile Depth End:  {damageObj.profileDepthEnd} </p>
                                    <p> Section:  {damageObj.section} </p>
                                </div>
                                <div className="flex w-1/3 justify-around">
                                    <button type="button" className="w-98 text-white bg-gray rounded-xl p-1 mt-10" onClick={handleCancel}>Cancel</button>
                                    <button type="submit" className="w-98 ml-2 text-white bg-orange rounded-xl p-1 mt-10">Submit</button>
                                </div>
                            </form>

                        </div>
                    </div>
                </div>
            }
        </>
    );
}

export default Annotate;
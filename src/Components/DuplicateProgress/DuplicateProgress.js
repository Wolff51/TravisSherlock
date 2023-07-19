
import React, { useEffect, useState } from 'react';
import { useNavigate } from "react-router-dom";
import Loader from '../Loader/Loader';
const { ipcRenderer } = window.require("electron");
const fs = window.require("fs");
const path = window.require("path");

function DuplicateProgress() {
    const directoryPath = localStorage.getItem("directoryPath");
    const navigate = useNavigate();
    const [choiceIsMade, setChoiceIsMade] = useState(false);
    const [progress, setProgress] = useState(0);

    if (!ipcRenderer.listenerCount("duplicate-ask-result")) {
        ipcRenderer.on('duplicate-ask-result', (event, result) => {
            setChoiceIsMade(true);
            duplicateWindFarm(result[1], result[2], result[0]);
        });
    }


    // useEffect(() => {
    //     // i need to count total file of the directory, to be able to set up the progress bar
    // }, [choiceIsMade]);

    useEffect(() => {
        if (progress === 100) {
            navigate('/dashboard');
        }
    }, [progress]);

    if (!ipcRenderer.listenerCount("cancel-duplicate-directory")) {
        ipcRenderer.on('cancel-duplicate-directory', () => {
            navigate('/dashboard');
        });
    }

    const countFiles = (dir) => {
        let count = 0;

        const files = fs.promises.readdir(dir);
        for (const file of files) {
            const filePath = path.join(dir, file);
            const stat = fs.promises.stat(filePath);

            if (stat.isDirectory()) {
                count += countFiles(filePath);
            } else if (stat.isFile()) {
                count += 1;
            }
        }

        return count;
    }

    const copyFoldersAll = (src, dest) => {
        if (!fs.existsSync(src)) {
            console.log(`Source folder "${src}" does not exist.`);
            return;
        }

        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest);
        }

        fs.readdirSync(src).forEach(fileOrFolder => {
            const currentSrc = path.join(src, fileOrFolder);
            const currentDest = path.join(dest, fileOrFolder);
            if (fs.lstatSync(currentSrc).isDirectory()) {
                copyFoldersAll(currentSrc, currentDest);
            } else {
                fs.copyFileSync(currentSrc, currentDest);
            }
        });
    }

    const copyFoldersBasic = (src, dest) => {
        const namesOfFoldersToNotCopy = ['export', 'bin', 'det', 'mask_contours', 'matches',
            'geotags', 'lines', 'fast_import', 'assembly'];
        if (!fs.existsSync(src)) {
            console.log(`Source folder "${src}" does not exist.`);
            return;
        }
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest);
        }
        fs.readdirSync(src).forEach(fileOrFolder => {
            const currentSrc = path.join(src, fileOrFolder);
            const currentDest = path.join(dest, fileOrFolder);
            if (fs.lstatSync(currentSrc).isDirectory()) {
                const folderName = path.parse(currentSrc).base;
                if (!namesOfFoldersToNotCopy.includes(folderName))
                    copyFoldersBasic(currentSrc, currentDest);
            } else {
                fs.copyFileSync(currentSrc, currentDest);
            }
        });
    }

    const duplicateWindFarm = (src, dest, type) => {
        const windFarmName = path.parse(src).base;
        const newDest = path.join(dest, windFarmName);
        if (type === 'all')
            copyFoldersAll(src, newDest);
        else {
            if (type === 'basic')
                copyFoldersBasic(src, newDest);
        }
    }

    useEffect(() => {
        console.log("choiceIsMade : ", choiceIsMade);
    }, [choiceIsMade]);
    useEffect(() => {
        setProgress(0);
        ipcRenderer.send('duplicate-directory', directoryPath);
    }, []);

    if (choiceIsMade === false) {
        return (
            <div className='duplicate hview flex flex-col items-center justify-center'>
                <h1 className='text-2xl'>Waiting for user choice...</h1>
            </div>
        )
    }
    return (
        <div className='duplicate hview flex flex-col items-center justify-center'>
            <div className='flex flex-col items-center justify-center'>
                <Loader />
                <p className='mt-10'>Duplication Progress: {progress}%</p>
                <progress value={progress} max="100"></progress>
            </div>
        </div>
    );
};

export default DuplicateProgress;
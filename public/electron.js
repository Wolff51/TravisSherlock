const { app, BrowserWindow, Menu, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const shell = require('electron').shell;
const isDev = require('electron-is-dev');


app.disableHardwareAcceleration();

const { session } = require('electron')


// Disable Electron Security Warnings
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';


// install dev tools
/*
if (isDev) {
    const { default: installExtension, REACT_DEVELOPER_TOOLS } = require('electron-devtools-installer');
    app.whenReady().then(() => {
        installExtension(REACT_DEVELOPER_TOOLS)
            .then((name) => console.log(`Added Extension:  ${name}`))
            .catch((err) => console.log('An error occurred: ', err));
    });
}
*/



// ***************************************
// ***********  SINGLE INSTANCE  ********
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
    console.log('app is already running')
    app.quit()
} else {
    console.log('app is not already running')
}


// ***************************************

require('dotenv').config();

const isEnvSet = 'ELECTRON_IS_DEV' in process.env;
if (!isEnvSet) {
    process.env.ELECTRON_IS_DEV = 0;
}



const { ipcMain } = require('electron');

let mainWindow;
let createMissionSheetWindow = null;
let validateWindow = null;

if (isDev) {
    console.log('Running in development');
} else {
    console.log('Running in production');
}

// ***************************************
// ***********  FUNCTION  ****************
// ***************************************
// IPC to set cookie


const log = require('electron-log');

ipcMain.on('launch-sort', (event, arg) => {
    const { spawn } = require('child_process');

    let pathToExe
    if (isDev) {
        pathToExe = path.join(__dirname, '..', 'python', 'dist', 'test', 'test.exe');
    } else {
        pathToExe = path.join(process.resourcesPath, 'python', 'dist', 'test', 'test.exe');
    }


    const scriptProcess = spawn(pathToExe, ['--nb_tours', arg.nb]);

    scriptProcess.stdout.on('data', (data) => {
        const messageToTranslate = data.toString().trim();
        log.info('test' + messageToTranslate)
        console.log(`stdout: ${data}`);
        // send the data to the renderer process to display in the UI
        mainWindow.webContents.send('script-output', data);

        // convert the data to a string and check if it contains the progress indicator
        const outputString = data.toString();
        if (outputString.includes('Progress: ')) {
            // extract the progress percentage from the output string
            const progressString = outputString.split('Progress: ')[1];
            const progressPercentage = parseInt(progressString);
            // update the progress bar in the UI with the percentage value
            mainWindow.webContents.send('script-progress', { progressPercentage: progressPercentage, data: data });
        }
    });

    scriptProcess.stderr.on('data', (data) => {
        const message = data.toString().trim();
        log.info(message)
        // console.error(`stderr: ${data}`);
        mainWindow.webContents.send('script-output', message);
    });

    scriptProcess.on('close', (code) => {
        console.log(`child process exited with code ${code}`);
        // send a message to the renderer process that the script is finished
        mainWindow.webContents.send('script-finished');
    });
});

ipcMain.on('set-cookie', (event, arg) => {
    session.defaultSession.cookies.get({}).then((cookies) => {
        const findCookie = cookies.find(cookie => cookie.name === 'sherlockStudioApp')
        if (findCookie) {
            if (findCookie) {
                try {
                    session.defaultSession.cookies.remove(arg.url, 'sherlockStudioApp')
                        .then(() => {
                            console.log('Existing cookie found and removed');
                            session.defaultSession.cookies.set({
                                url: arg.url,
                                name: 'sherlockStudioApp',
                                value: JSON.stringify({ email: arg.email, password: arg.password }),
                                expirationDate: Math.floor(Date.now() / 1000) + 2147483647 // Set expiration date to a timestamp in seconds
                            }).then(() => {
                                console.log('Cookie set');
                            }).catch((error) => {
                                console.log('Error setting cookie:', error);
                            });
                        }).catch((error) => {
                            console.log('Error removing cookie:', error);
                        });
                } catch (error) {
                    console.log('Error:', error);
                }
            }
        } else {
            console.log('no existing cookie found')
            session.defaultSession.cookies.set({
                name: 'sherlockStudioApp',
                value: JSON.stringify({ email: arg.email, password: arg.password }),
                url: arg.url,
                expirationDate: 2147483647
            }).then(() => {
                console.log('cookie set')
            }).catch((error) => {
                console.log(error)
                console.log('cookie was not set and did not exist')
            })
        }
    })
})

ipcMain.on('get-cookie', (event, arg) => {
    session.defaultSession.cookies.get({ name: 'sherlockStudioApp' })
        .then((cookies) => {
            if (cookies.length === 0) return console.log('no cookie found');
            const storedValue = cookies[0].value
            const parsedValue = JSON.parse(storedValue)
            mainWindow.webContents.send('find-cookie', parsedValue)
        }).catch((error) => {
            console.log(error)
        })
})

ipcMain.on('remove-cookie', (event, arg) => {
    session.defaultSession.cookies.remove(arg, 'sherlockStudioApp')
        .then(() => {
            console.log('cookie deleted')
        }
        ).catch((error) => {
            console.log(error)
        })
})


function createWindow() {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        width: 930,
        height: 720,
        minWidth: 1080,
        minHeight: 720,
        titleBarStyle: 'hidden',
        resizable: false,
        icon: path.join(__dirname, 'images/icone.png'),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });


    mainWindow.loadURL(
        isDev
            ? 'http://localhost:3000'
            : `file://${path.join(__dirname, '../build/index.html')}`
    );


    mainWindow.webContents.openDevTools({ mode: 'detach' });
    if (isDev) {
        mainWindow.webContents.openDevTools({ mode: 'detach' });
    }


    // use to set local storage when selecting a directory
    ipcMain.on('uploadDirectory', (event, type) => {
        // if dialog canceled, return null
        dialog
            .showOpenDialog(mainWindow, {
                properties: ['openDirectory', 'multiSelections'],
            })
            .then((result) => {
                if (result.canceled) {
                    event.sender.send('selected-directory', null, type);
                    return;
                }
                event.sender.send('selected-directory', result.filePaths, type);
            })
            .catch((err) => {
                console.log(err);
            });
    });


    // Avec sélection dossier
    // ipcMain.on('scan-directory-old', (event, arg) => {
    //   dialog
    //     .showOpenDialog(mainWindow, {
    //       properties: ['openDirectory', 'multiSelections'],
    //     })
    //     .then((result) => {
    //       const list = [];
    //       result.filePaths.forEach((directory) => {
    //         fs.readdir(directory, (err, files) => {
    //           if (err) {
    //             return console.log('Unable to scan directory: ' + err);
    //           }
    //           files.forEach((file) => {
    //             const pathToSubDirectory = result.filePaths + '/' + file;
    //             if (fs.existsSync(pathToSubDirectory + '/mission_sheet.json')) {
    //               list.push(pathToSubDirectory);
    //             }
    //           });
    //           event.sender.send('scan-directory-done', list);
    //         });
    //       });
    //     })
    //     .catch((err) => {
    //       console.log(err);
    //     });
    // });

    ipcMain.on('scan-directory', (event, arg) => {
        const list = [];
        if (!fs.existsSync(arg)) {
            event.sender.send('scan-directory-done', list);
            return;
        }
        fs.readdir(arg, (err, files) => {
            files.forEach((file) => {
                const pathToSubDirectory = arg + '/' + file;
                if (fs.existsSync(pathToSubDirectory + '/mission_sheet.json')) {
                    list.push(pathToSubDirectory);
                }
            });
            event.sender.send('scan-directory-done', list);
        });
    });
}

app.whenReady().then(createWindow);



// ***************************************
// *************   UPLOAD  ***************
// ***************************************

// use only in dev to clear upload folder
if (isDev) {
    ipcMain.on('clean-upload-folder', (event, arg) => {
        // remove every file in the local directory public/uploads-files
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
        event.sender.send('clean-upload-folder-done');
    });
}


// ***************************************
// *******   MISSION SHEET  **************
// ***************************************

// // This function is use to open window with a form
// if listener does
ipcMain.on('create-mission-sheet', () => {
    if (createMissionSheetWindow !== null) {
        createMissionSheetWindow.focus();
        return;
    }
    createMissionSheetWindow = new BrowserWindow({
        width: 1000,
        height: 700,
        frame: false,
        resizable: false,
        parent: mainWindow,
        modal: true,
        show: false,
        icon: path.join(__dirname, 'images/icone.png'),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
    });

    createMissionSheetWindow.loadURL(
        isDev
            ? `http://localhost:3000/missionsheetform`
            : `file://${path.join(__dirname, '../build/index.html#missionsheetform')}`
    );

    createMissionSheetWindow.center();

    createMissionSheetWindow.once('ready-to-show', (e) => {
        createMissionSheetWindow.show();
    }
    );
    // Open the DevTools.
    if (isDev) {
        createMissionSheetWindow.webContents.openDevTools({ mode: 'detach' });
    }

    createMissionSheetWindow.on('closed', () => {
        createMissionSheetWindow.removeAllListeners(),
            createMissionSheetWindow = null,
            mainWindow.webContents.send('update-upload');
    });
});


// ******************************************************
// IMPORTANT IPC COMMUNICATION :
// ******************************************************

// update Dashboard
ipcMain.on('update-dashboard', (event, arg) => {
    mainWindow.webContents.send('update-dashboard', arg);
});

ipcMain.on('upload-NAS', () => {
    mainWindow.webContents.send('update-upload');
});

ipcMain.on('updateFastProcess', (event, arg) => {
    mainWindow.webContents.send('updateFastProcess', arg);
});


// Resize Window 
ipcMain.on('resize', (event, arg) => {
    if (arg === null) {
        return;
    } else {
        if (BrowserWindow.getFocusedWindow() === mainWindow) {
            if (arg === "reduce") {
                if (mainWindow.isMinimized()) {
                    return;
                } else {
                    mainWindow.minimize();
                }
            } else if (arg === "restore") {
                if (mainWindow.isMaximized()) {
                    mainWindow.unmaximize();
                    event.sender.send('window-resize');
                } else {
                    mainWindow.maximize();
                    event.sender.send('window-resize');
                }
            } else if (arg === "setToMaxSize") {
                mainWindow.setResizable(true);
                mainWindow.maximize();
                mainWindow.setMinimumSize(930, 720);
            } else if (arg === "setToMinSize") {
                mainWindow.unmaximize();
                mainWindow.setResizable(false);
            }
        } else {
            if (arg === "reduce") {
                if (BrowserWindow.getFocusedWindow().isMinimized()) {
                    return;
                } else {
                    BrowserWindow.getFocusedWindow().minimize();
                }
            } else if (arg === "restore") {
                if (BrowserWindow.getFocusedWindow().isMaximized()) {
                    BrowserWindow.getFocusedWindow().unmaximize();
                    event.sender.send('window-resize');
                } else {
                    BrowserWindow.getFocusedWindow().maximize();
                    event.sender.send('window-resize');
                }
            } else if (arg === "setToMaxSize") {
                BrowserWindow.getFocusedWindow().maximize();
            } else if (arg === "setToMinSize") {
                BrowserWindow.getFocusedWindow().unmaximize();
                BrowserWindow.getFocusedWindow().setResizable(false);
            }
        }
    }
});
// Start Validation
ipcMain.on("Validate", (event, arg) => {
    if (validateWindow !== null) {
        validateWindow.focus();
        return;
    }

    validateWindow = new BrowserWindow({
        width: 1000,
        height: 700,
        titleBarStyle: 'hidden',
        resizable: false,
        parent: mainWindow,
        show: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
    });


    validateWindow.loadURL(
        isDev
            ? `http://localhost:3000/Validate`
            : `file://${path.join(__dirname, '../build/index.html#Validate')}`
    );

    validateWindow.on('closed', () => {
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
        validateWindow.removeAllListeners(),
            validateWindow = null
    });



    validateWindow.once('ready-to-show', (e) => {
        validateWindow.show();
        validateWindow.focus();
    }
    );

    validateWindow.webContents.openDevTools({ mode: 'detach' });

    if (isDev) {
        validateWindow.webContents.openDevTools({ mode: 'detach' });
    }
    // Open Folder - Validation 
    if (!ipcMain.listenerCount("open-folder")) {
        ipcMain.on("open-folder", (event, arg) => {
            shell.openPath(arg);
        })
    }

    const util = require('util');
    const readFileAsync = util.promisify(fs.readFile);
    const readdirAsync = util.promisify(fs.readdir);
    const copyFileAsync = util.promisify(fs.copyFile);

    ipcMain.on('upload-image', async (event, arg) => {
        let filesToUpload = [];
        if (!fs.existsSync(arg[1])) {
            event.sender.send('no-validation_logs-file');
            return;
        }

        try {
            const data = await readFileAsync(arg[1], 'utf8');
            const matchArray = JSON.parse(data);

            if (arg[2] === "Match") {
                matchArray.forEach((element) => {
                    if (element[Object.keys(element)[0]] === null) {
                        const name = Object.keys(element)[0];
                        filesToUpload.push(name);
                    }
                });
            } else if (arg[2] === "Geotag") {
                matchArray.forEach((element) => {
                    if (element[Object.keys(element)[0]] === 'MF') {
                        const name = Object.keys(element)[0];
                        const nameWithoutExtension = name.split('.')[0];
                        filesToUpload.push(`${nameWithoutExtension}.jpg`);
                    }
                });
            } else if (arg[2] === "Line") {
                matchArray.forEach((element) => {
                    if (element[Object.keys(element)[0]] === 'MFGF') {
                        const name = Object.keys(element)[0];
                        const nameWithoutExtension = name.split('.')[0];
                        filesToUpload.push(`${nameWithoutExtension}.jpg`);
                    }
                });
            } else {
                console.log("Something went wrong");
            }

            if (!isDev) {
                event.sender.send('upload-image-done', filesToUpload);
            } else {
                await handleUploadImage(filesToUpload, arg[0]);
                event.sender.send('upload-image-done');
            }
        } catch (err) {
            console.error(err);
        }
    });

    async function handleUploadImage(data, pathToUpload) {
        console.log('Uploading Images, please wait...');

        try {
            const files = await readdirAsync(pathToUpload);
            const copyPromises = files
                .filter(file => data.includes(file))
                .map(file => copyFileAsync(`${pathToUpload}/${file}`, `public/uploads-files/${file}`));

            await Promise.all(copyPromises);
            console.log('Images uploaded!');
        } catch (err) {
            console.error('Unable to scan directory: ' + err);
            throw err;
        }
    }


})


// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.




// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
ipcMain.on('close', (arg) => {
    const getFocusedWindow = BrowserWindow.getFocusedWindow();
    if (getFocusedWindow === mainWindow) {
        mainWindow.unmaximize();
        mainWindow.setResizable(false);
        ipcMain.removeAllListeners();
        app.quit();
    } else {
        getFocusedWindow.close();
        mainWindow.show();
        mainWindow.focus();
    }
});


app.on('window-all-closed', () => {
    app.quit();
});



app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    } else {
        BrowserWindow.getFocusedWindow().show();
    }
});

Menu.setApplicationMenu(null);


//********************************************************************************************* */
// DUPLICATE WF FUNCTIONS
//********************************************************************************************* */
ipcMain.on('duplicate-directory', (event, directorypath) => {
    const source = directorypath;
    dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory', 'multiSelections'],
    })
        .then((resultDirectory) => {
            if (resultDirectory.filePaths[0] === undefined) {
                event.sender.send('cancel-duplicate-directory');
                return;
            }
            dialog.showMessageBox(mainWindow, {
                type: 'question',
                buttons: ['Cancel', 'All', 'Basic'],
                title: 'Duplicate Wind Farm',
                message: 'Do you want to duplicate all the files or just the basic ones?',
                detail: 'All will duplicate all the files, Basic will duplicate only the basic files.'
            }).then((result) => {
                if (result.response === 1) {
                    const toDoArray = ['all', source, resultDirectory.filePaths[0]];
                    event.sender.send('duplicate-ask-result', toDoArray);
                } else if (result.response === 2) {
                    const toDoArray = ['basic', source, resultDirectory.filePaths[0]];
                    event.sender.send('duplicate-ask-result', toDoArray);
                }
            });
        }).catch((err) => {
            console.log(err);
        });
});
// *********** IPC SAVE DUPLICATE *********** //
// ipcMain.on('duplicate-directory', (event, directorypath) => {
//   const source = directorypath;
//   const destination = dialog.showOpenDialog(mainWindow, {
//     properties: ['openDirectory', 'multiSelections'],
//   }).then((resultDirectory) => {
//     dialog.showMessageBox(mainWindow, {
//       type: 'question',
//       buttons: ['Cancel', 'All', 'Basic'],
//       title: 'Duplicate Wind Farm',
//       message: 'Do you want to duplicate all the files or just the basic ones?',
//       detail: 'All will duplicate all the files, Basic will duplicate only the basic files.'
//     }).then((result) => {
//       if (result.response === 1) {
//         duplicateWindFarm(source, resultDirectory.filePaths[0], 'all');
//       } else {
//         if (result.response === 2) {
//           duplicateWindFarm(source, resultDirectory.filePaths[0], 'basic');
//         }
//       }
//     })
//   }).catch((err) => {
//     console.log(err);
//   });
// })
// *********** IPC SAVE DUPLICATE *********** //


//********************************************************************************************* */
// END DUPLICATE WF FUNCTIONS
//********************************************************************************************* */


const sql = require('mssql');

const config = {
    user: "CloudSA1d410bf4",
    password: "SSdbp@1!",
    server: "sav-db.database.windows.net",
    port: 1433,
    database: "ss-db",
    authentication: {
        type: 'default'
    },
    options: {
        encrypt: true
    }
}


async function getUserByEmail(mail) {
    try {
        let pool = await sql.connect(config);
        let user = await pool.request()
            .input('input_parameter', sql.VarChar, mail)
            .query('SELECT * FROM users WHERE email = @input_parameter');
        if (user.recordset.length === 0) {
            return {
                error: "none"
            }
        }
        return user.recordset[0];
    } catch (err) {
        console.error(err.message);
        if (err.message.includes('is not allowed to access the server')) {
            console.log('not allowed');
            return {
                errorIp: err.message
            }
        }
    }
}

async function getUserById(id) {
    id = id.toString();
    try {
        let pool = await sql.connect(config);
        let user = await pool.request()
            .input('input_parameter', sql.VarChar, id)
            .query('SELECT * FROM users WHERE id = @input_parameter');
        if (user.recordset.length === 0) {
            return {
                error: "none"
            }
        }
        return user.recordset[0];
    } catch (err) {
        console.error(err.message);
    }
}

async function getAllUsers() {
    try {
        let pool = await sql.connect(config);
        let users = await pool.request()
            .query('SELECT * FROM users');
        return users.recordset;
    } catch (err) {
        return {
            error: err.message
        }
    }
}

async function getLastDeliveriesByUserId(id) {
    try {
        let pool = await sql.connect(config);
        let deliveries = await pool.request()
            .input('input_parameter', sql.VarChar, id)
            .query('SELECT * FROM deliveries WHERE user_id = @input_parameter ORDER BY updated_at DESC');
        if (deliveries.recordset.length > 5) {
            return deliveries.recordset.slice(0, 5);
        }
        return deliveries.recordset;
    }
    catch (err) {
        console.error(err.message);
    }

}

async function createUser(userInfo) {
    try {
        let pool = await sql.connect(config);
        let user = await pool.request()
            .input('firstname', sql.VarChar, userInfo.firstname)
            .input('lastname', sql.VarChar, userInfo.lastname)
            .input('email', sql.VarChar, userInfo.email)
            .input('role', sql.VarChar, userInfo.role)
            .input('password', sql.VarChar, userInfo.password)
            .query('INSERT INTO users (firstname, lastname, email, role, password) VALUES (@firstname, @lastname, @email, @role, @password)');
        return user.recordset;
    } catch (err) {
        console.error('ERROR WHEN CREATING USER');
        console.error(err.message);
    }
}

async function deleteUser(email) {
    try {
        let pool = await sql.connect(config);
        let user = await pool.request()
            .input('email', sql.VarChar, email)
            .query('DELETE FROM users WHERE email = @email');
        return user.recordset;
    } catch (err) {
        console.error(err.message);
    }
}

async function updateUser(query) {
    try {
        let pool = await sql.connect(config);
        let user = await pool.request()
            .query(query);
        return user.recordset;
    } catch (err) {
        console.error(err.message);
    }
}

async function paidDelivery(id) {
    try {
        let pool = await sql.connect(config);
        let delivery = await pool.request()
            .input('id', sql.Int, id)
            .query('UPDATE deliveries SET paid = 1 WHERE id = @id');
        return delivery.recordset;
    } catch (err) {
        console.error(err.message);
    }
}

async function getLastUnpaidDeliveriesByUserId(id) {
    try {
        let pool = await sql.connect(config);
        let deliveries = await pool.request()
            .input('input_parameter', sql.VarChar, id)
            .query('SELECT * FROM deliveries WHERE user_id = @input_parameter AND paid = 0 ORDER BY updated_at DESC');
        return deliveries.recordset;
    }
    catch (err) {
        console.error(err.message);
    }
}

ipcMain.on('find-one-user', (event, email) => {
    getUserByEmail(email).then((result) => {
        event.sender.send('find-user', result);
    }).catch((err) => {
        event.sender.send('find-user', err);
    });
});

ipcMain.on('find-user-by_id', (event, id) => {
    getUserById(id).then((result) => {
        event.sender.send('find-user_id', result);
    });
});

ipcMain.on('get-all-users', (event) => {
    getAllUsers().then((result) => {
        event.sender.send('return-users', result);
    });
});

ipcMain.on('get-last-deliveries-by-user-id', (event, id) => {
    getLastDeliveriesByUserId(id).then((result) => {
        event.sender.send('return-last-5-deliveries-by-user-id', result);
    });
});

ipcMain.on('return-not-paid-deliveries-by-user-id', (event, id) => {
    getLastUnpaidDeliveriesByUserId(id).then((result) => {
        event.sender.send('not-paid-deliveries-by-user-id', result);
    });
});

ipcMain.on('create-user', (event, user) => {
    createUser(user).then((result) => {
        event.sender.send('user-created', result);
    });
});

ipcMain.on('delete-user', (event, email) => {
    deleteUser(email).then((result) => {
        event.sender.send('user-deleted', result);
    });
});

ipcMain.on('update-user', (event, query) => {
    updateUser(query).then((result) => {
        event.sender.send('user-updated', result);
    });
});

ipcMain.on('paid-delivery', (event, id) => {
    paidDelivery(id).then((result) => {
        console.log('delivery paid');
    });
});


async function createValidateDelivery(user_id, wind_farm, wind_turbine, paid) {
    try {
        let pool = await sql.connect(config);
        let delivery = await pool.request()
            .input('user_id', sql.Int, user_id)
            .input('paid', sql.Int, paid)
            .input('wind_farm', sql.VarChar, wind_farm)
            .input('wind_turbine', sql.VarChar, wind_turbine)
            .input('validation', sql.Int, 1)
            .input('validation_time', sql.DateTime, new Date())
            .query('INSERT INTO deliveries (user_id, paid, wind_farm, wind_turbine, validation, validation_time) VALUES (@user_id, @paid, @wind_farm, @wind_turbine, @validation, @validation_time)')
        return delivery;
    } catch (err) {
        console.error(err.message);
    }
}


ipcMain.on('create-delivery', (event, user_id, wind_farm, wind_turbine, paid) => {
    createValidateDelivery(user_id, wind_farm, wind_turbine, paid).then((result) => {
        console.log('One created');
    }).catch((err) => {
        console.log(err);
    }
    );
});

import React, { useEffect, useState } from 'react';

const bcrypt = window.require('bcryptjs');
const { ipcRenderer } = window.require("electron");


function UpdateProfil({ firstname, lastname, email, onConfirm, onCancel }) {
    const [changePassword, setChangePassword] = useState(false);
    const [actualUserPassword, setActualUserPassword] = useState('');
    const [actualUserPasswordError, setActualUserPasswordError] = useState('');

    if (!ipcRenderer.listenerCount('find-user')) {
        ipcRenderer.on('find-user', (event, arg) => {
            setActualUserPassword(arg.password);
        });
    }

    useEffect(() => {
        return () => {
            ipcRenderer.removeAllListeners('find-user');
        };
    }, []);

    useEffect(() => {
        if (changePassword) {
            ipcRenderer.send('find-one-user', email);
        }
    }, [changePassword]);

    const handleConfirm = () => {
        if (changePassword) {
            if (actualUserPassword === '') {
                return;
            } else {
                const password = document.getElementById('profilUpdatePassword').value;
                const isPasswordCorrect = bcrypt.compareSync(password, actualUserPassword);
                if (!isPasswordCorrect) {
                    setActualUserPasswordError('Password is incorrect');
                    return;
                } else if (document.getElementById('profilUpdateNewPassword').value !== document.getElementById('profilUpdateConfirmNewPassword').value) {
                    setActualUserPasswordError('Not Match');
                    return;
                }
                else {
                    const newPassword = document.getElementById('profilUpdateNewPassword').value;
                    const salt = bcrypt.genSaltSync(10);
                    const hash = bcrypt.hashSync(newPassword, salt);
                    onConfirm('password', '', hash);
                    return;
                }
            }
        } else {
            const firstname = document.getElementById('profilUpdateFirstname').value;
            const lastname = document.getElementById('profilUpdateLastname').value;
            onConfirm('profil', firstname, lastname);
        }
    };

    const handleCancel = () => {
        onCancel();
    };

    const handleChangeType = () => {
        if (changePassword) {
            setChangePassword(false);
            setActualUserPasswordError('');
            setActualUserPassword('');
        } else {
            setChangePassword(true);
        }
    };
    return (
        <div id="customMessageAlert" className='flex flex-col justify-center'>
            <div className='fixed inset-0 bg-black opacity-25 z-50'></div>
            <div className='fixed inset-0 flex items-center justify-center z-50'>
                {!changePassword &&
                    <div className='bg-white p-5 rounded-md shadow-md sm:w-1/2 xl:w-1/4'>
                        <h1 className="sm:text-sm lg:text-lg mb-5 font-semibold text-justify">Profil</h1>
                        <div className="flex flex-col items-center">
                            <label className="text-sm text-left font-semibold py-2">Firstname</label>
                            <input id='profilUpdateFirstname' type="text" defaultValue={firstname} className="border rounded-md px-3 py-2 mt-1 mb-5 text-sm w-1/2" />
                        </div>
                        <div className="flex flex-col items-center">
                            <label className="text-sm font-semibold py-2">Last Name</label>
                            <input id='profilUpdateLastname' type="text" defaultValue={lastname} className="border rounded-md px-3 py-2 mt-1 mb-5 text-sm  w-1/2" />
                        </div>
                        <div className="flex flex-col items-center">
                            <label className="text-sm font-semibold py-2">Email</label>
                            <input id='profilUpdateEmail' type="text" placeholder={email} className="border border-red rounded-md px-3 py-2 mt-1 mb-5 text-sm  w-1/2" disabled
                                title="If you want to change your email, please contact the administrator of the application."
                            />
                        </div>

                        {/* button change password */}
                        <button onClick={handleChangeType} className="text-sm font-semibold py-2 hover:text-decoration-line: hover:underline">Change Password</button>

                        <div className='flex justify-center mt-10'>
                            <button onClick={handleCancel} className='NoDrag mr-3 w-2/6 text-sm font-bold px-2 py-1 text-black bg-gray rounded-md hover:bg-gray-100'>Cancel</button>
                            <button onClick={handleConfirm} className='NoDrag w-2/6 mr-2 text-sm font-bold px-2 py-1 text-black bg-orange rounded-md hover:bg-orange-100'>Save</button>
                        </div>
                    </div>
                }
                {changePassword &&
                    <div className='bg-white p-5 rounded-md shadow-md sm:w-1/2 xl:w-1/4'>
                        <h1 className="sm:text-sm lg:text-lg mb-5 font-semibold text-justify">Profil</h1>
                        <div className="flex flex-col items-center">
                            <label className="text-sm font-semibold py-2">Actual Password</label>
                            <input id='profilUpdatePassword' type="password" placeholder="********" className="border rounded-md px-3 py-2 mt-1 text-sm w-1/2" />
                            {actualUserPasswordError === 'Password is incorrect' &&
                                <p className='text-red text-xs font-style: italic'>Password Is Incorrect</p>
                            }
                        </div>
                        <div className="flex flex-col items-center mt-5">
                            <label className="text-sm font-semibold py-2">New Password</label>
                            <input id='profilUpdateNewPassword' type="password" placeholder="********" className="border rounded-md px-3 py-2 mt-1 text-sm w-1/2" />
                            {actualUserPasswordError === 'Not Match' &&
                                <p className='text-red text-xs font-style: italic'>Password and confirm password doesn't match</p>
                            }
                        </div>
                        <div className="flex flex-col items-center mt-5">
                            <label className="text-sm font-semibold py-2">Confirm New Password</label>
                            <input id='profilUpdateConfirmNewPassword' type="password" placeholder="********" className="border rounded-md px-3 py-2 mt-1 text-sm w-1/2" />
                            {actualUserPasswordError === 'Not Match' &&
                                <p className='text-red text-xs font-style: italic'>Password and confirm password doesn't match</p>
                            }
                        </div>


                        <button onClick={handleChangeType} className=" mt-5 text-sm font-semibold py-2 hover:text-decoration-line: hover:underline">Return to Profil</button>

                        <div className='flex justify-center mt-10'>
                            <button onClick={handleCancel} className='NoDrag mr-3 w-2/6 text-sm font-bold px-2 py-1 text-black bg-gray rounded-md hover:bg-gray-100'>Cancel</button>
                            <button onClick={handleConfirm} className='NoDrag w-2/6 mr-2 text-sm font-bold px-2 py-1 text-black bg-orange rounded-md hover:bg-orange-100'>Save</button>
                        </div>
                    </div>
                }
            </div>
        </div>


    )
}


export default UpdateProfil;
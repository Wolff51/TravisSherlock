import { React, useState } from "react";
import Loader from "../Loader/Loader";


function CustomMessageAlert({ message, onConfirm, onCancel, type }) {
    const [loading, setLoading] = useState(false);

    const handleConfirm = () => {
        if (type === 'directory' || type === 'verify') {
            onConfirm()
        } else {
            setLoading(true);
            onConfirm();
        }
    };

    const handleCancel = () => {
        onCancel();
    };

    const handleChoose = (param) => {
        console.log(param);
        onConfirm(param);
    };

    if (loading) return (
        <div id="customMessageAlert" className='flex flex-col justify-center w-1/4'>
            <div className='fixed inset-0 bg-black opacity-50 z-50'>
                <div className='fixed inset-0 flex items-center justify-center z-50'>
                    <div className='bg-white p-5 rounded-md shadow-md'>
                        <Loader />
                    </div>
                </div>
            </div>
        </div>
    )

    if (type === 'typeOfProcess') return (
        <div id="customMessageAlert" className='flex flex-col justify-center'>
            <div className='fixed inset-0 bg-black opacity-25 z-50'></div>
            <div className='fixed inset-0 flex items-center justify-center z-50'>
                <div className='bg-white p-5 rounded-md shadow-md lg:w-1/4 sm:w-2/4'>
                    <h1 className="sm:text-sm lg:text-lg mb-5 font-semibold text-justify">{message}</h1>
                    <p className="text-sm text-justify">Please Choose One Process. </p>
                    <div className='flex justify-end mt-10'>
                        <button onClick={() => { handleChoose('Classic') }} className='NoDrag w-2/6 mr-2 text-sm font-bold px-2 py-1 text-black bg-orange rounded-md hover:bg-orange-100'>Classic</button>
                        <button onClick={() => { handleChoose('Nordex') }} className='NoDrag w-2/6 mr-2 text-sm font-bold px-2 py-1 text-black bg-orange rounded-md hover:bg-orange-100'>Nordex</button>
                    </div>
                </div>
            </div>
        </div>
    )

    if (type === 'Edit') return (
        <div id="customMessageAlert" className='flex flex-col justify-center'>
            <div className='fixed inset-0 bg-black opacity-25 z-50'></div>
            <div className='fixed inset-0 flex items-center justify-center z-50'>
                <div className='bg-white p-5 rounded-md shadow-md lg:w-1/4 sm:w-2/4'>
                    <h1 className="sm:text-sm lg:text-lg mb-5 font-semibold text-justify">{message}</h1>
                    <p className="text-sm text-justify">You successfully Edit the Wind Turbine Farm. </p>
                    <div className='flex justify-end mt-10'>
                        <button onClick={handleConfirm} className='NoDrag w-2/6 mr-2 text-sm font-bold px-2 py-1 text-black bg-orange rounded-md hover:bg-orange-100'>Confirm</button>
                    </div>
                </div>
            </div>
        </div>
    )

    if (type === 'EditError') return (
        <div id="customMessageAlert" className='flex flex-col justify-center'>
            <div className='fixed inset-0 bg-black opacity-25 z-50'></div>
            <div className='fixed inset-0 flex items-center justify-center z-50'>
                <div className='bg-white p-5 rounded-md shadow-md lg:w-1/4 sm:w-2/4'>
                    <h1 className="sm:text-sm lg:text-lg mb-5 font-semibold text-justify">{message}</h1>
                    <p className="text-sm text-justify">You can't Edit the Wind Turbine Farm. </p>
                    <p className="text-sm text-justify">The parc is already or not at this stage yet. </p>
                    <div className='flex justify-end mt-10'>
                        <button onClick={handleConfirm} className='NoDrag w-2/6 mr-2 text-sm font-bold px-2 py-1 text-black bg-orange rounded-md hover:bg-orange-100'>Confirm</button>
                    </div>
                </div>
            </div>
        </div>
    )

    if (type === 'userDeleted' || type === 'userUpdated' || type === 'userCreated') return (
        <div id="customMessageAlert" className='flex flex-col justify-center'>
            <div className='fixed inset-0 bg-black opacity-25 z-50'></div>
            <div className='fixed inset-0 flex items-center justify-center z-50'>
                <div className='bg-white p-5 rounded-md shadow-md lg:w-1/4 sm:w-2/4'>
                    <h1 className="sm:text-sm lg:text-lg mb-5 font-semibold text-justify">{message}</h1>
                    {type === 'userDeleted' && <p className="text-sm text-justify">The user has been deleted. </p>}
                    {type === 'userUpdated' && <p className="text-sm text-justify">The user has been updated. </p>}
                    {type === 'userCreated' && <p className="text-sm text-justify">The user has been created. </p>}
                    <div className='flex justify-end mt-10'>
                        <button onClick={handleConfirm} className='NoDrag w-2/6 mr-2 text-sm font-bold px-2 py-1 text-black bg-orange rounded-md hover:bg-orange-100'>Close</button>
                    </div>
                </div>
            </div>

        </div>
    )

    return (
        <div id="customMessageAlert" className='flex flex-col justify-center'>
            <div className='fixed inset-0 bg-black opacity-25 z-50'></div>
            <div className='fixed inset-0 flex items-center justify-center z-50'>
                <div className='bg-white p-5 rounded-md shadow-md lg:w-1/4 sm:w-2/4'>
                    <h1 className="sm:text-sm lg:text-lg mb-5 font-semibold text-justify">{message}</h1>
                    {type === 'deleteUser' && <p className="text-sm text-justify">Please note that you are about to delete this user. This action cannot be undone. </p>}
                    {type === 'payDelivery' && <p className="text-sm text-justify">Please note that you are about to pay a delivery. This action will update the database and can't be undone. </p>}
                    {type === 'logout' && <p className="text-sm text-justify">Please note that you are about to be disconnected from the app. We recommend that you make sure you have saved any work you may have been doing and that you have completed all necessary tasks within the app. </p>}
                    {type === 'directory' && <p className="text-sm text-justify"> You will be redirected to the upload page to select a different directory </p>}
                    {type === 'close' && <p className="text-sm text-justify">Please note that you are about to close the app. We recommend that you make sure you have completed all necessary tasks within the app. If you plan to return to the app later, we encourage you to log out to ensure the security of your account.</p>}
                    {type === 'validation' && <p className="text-sm text-justify">Perfect! You have completed the validation of this wind farm or reached the same level as the process. You can now continue the process or move on to the next assembly step. </p>}
                    {type === 'verify' && <p className="text-sm text-justify">You are going to confirm that this wind farm is already verified! So we can completely considered the processing of this farm is finish and that it can be archived in 3 months </p>}
                    {type === 'clean' && <p className="text-sm text-justify">You are going to confirm that this wind farm is processed since 3 months and can be cleaned! Not that if you cleaned the wind farm, you would no longer have access to some folders/files such as cutted out images, matches, geotags, ...</p>}
                    {type === 'archive' && <p className="text-sm text-justify">You are going to confirm that this wind farm is already archived! So we can completely considered this farm is completely saved on Azure and we can delete all folders and files except the mission sheet.</p>}
                    {type === 'userDeleted' && <p className="text-sm text-justify">The user has been deleted. </p>}
                    {type === 'userUpdated' && <p className="text-sm text-justify">The user has been updated. </p>}
                    {type === 'userCreated' && <p className="text-sm text-justify">The user has been created. </p>}
                    {type !== 'validation' &&
                        <div className='flex justify-end mt-10'>
                            <button onClick={handleCancel} className='NoDrag w-2/6 mr-2 text-sm font-bold text-black bg-gray-200 rounded-md hover:bg-gray-100'>Cancel</button>
                            <button onClick={handleConfirm} className='NoDrag w-2/6 mr-2 text-sm font-bold px-2 py-1 text-black bg-orange rounded-md hover:bg-orange-100'>Confirm</button>
                        </div>
                    }
                    {type === 'validation' &&
                        <div className='flex justify-end'>
                            <button onClick={handleConfirm} className='mt-5 NoDrag w-2/6 mr-2 text-sm font-bold px-2 py-1 text-black bg-orange rounded-md hover:bg-orange-100'>Confirm</button>
                        </div>
                    }
                </div>
            </div>

        </div>
    );
}

export default CustomMessageAlert;

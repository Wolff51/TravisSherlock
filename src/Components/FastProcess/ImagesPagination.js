import React, { useState } from 'react';
import {
    TransformWrapper,
    TransformComponent
} from "react-zoom-pan-pinch";

import { useEffect } from 'react';
import Loader from '../Loader/Loader';

const ImagesPagination = ({ images, handleDeleteDamage, handleChangeFailureType, handleReturnToBlade, handleConfirmBlade }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const totalPages = Math.ceil(images.length / 3);
    const [loading, setLoading] = useState(false);

    const getCurrentImages = () => {
        const startIndex = (currentPage - 1) * 3;
        const endIndex = currentPage * 3;
        return images.slice(startIndex, endIndex);
    };

    const [currentImages, setCurrentImages] = useState(getCurrentImages());



    useEffect(() => {
        setCurrentImages(getCurrentImages());
        setLoading(false);
    }, [currentPage, images]);

    const handlePreviousPage = () => {
        if (currentPage > 1) {
            setLoading(true);
            setCurrentPage(currentPage - 1);
        }
    };

    const handleNextPage = () => {
        if (currentPage < totalPages) {
            setLoading(true);
            setCurrentPage(currentPage + 1);
        }
    };

    if (images.length === 0) {
        return (
            // Text : No annotation done for this blade
            // button Next and return

            <div className='flex flex-col justify-center items-center h-full w-full'>
                <p className='text-2xl mb-5'>No annotation done for this blade</p>
                <div className='flex flex-row justify-around items-center w-1/2'>
                    <button onClick={handleReturnToBlade}>
                        Return
                    </button>
                    <button onClick={handleConfirmBlade}>
                        Next
                    </button>
                </div>
            </div>

        )
    }


    if (loading) {
        return (<Loader />)
    }

    return (
        <div className='flex flex-col justify-between items-center h-full w-full'>
            <div className='flex flex-row h-full justify-around items-center'>
                {currentImages.length > 0 &&
                    currentImages.map((damage, index) => (
                        <div key={index} className='h-full flex flex-col justify-around items-center w-1/4'>
                            <button onClick={() => handleDeleteDamage(damage.id)}>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="red" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="mb-5 w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                </svg>
                            </button>
                            <div>
                                <div className="image-container h-1/3 w-full">
                                    <TransformWrapper>
                                        <TransformComponent>
                                            <img className="h-full w-full object-cover" src={`data:image/png;base64,${damage.u_overview_image}`} alt={damage.u_failure_type} />
                                        </TransformComponent>
                                    </TransformWrapper>
                                </div>
                            </div>
                            <select
                                defaultValue={damage.u_failure_type}
                                id='failure_type'
                                name='failure_type'
                                className='w-full border-2 mt-3 mb-2 w-1/3'
                                onChange={(e) => handleChangeFailureType(damage.id, e.target.value)}
                            >
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
                        </div>
                    ))}
            </div>
            <div className='h-1/3 flex flex-col justify-around items-center w-1/3'>
                <div className='h-1/12 flex justify-around w-1/2 items-center'>
                    <button onClick={handlePreviousPage} disabled={currentPage === 1}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 30 30" strokeWidth={2} stroke="currentColor" className="pt-1 w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5" />
                        </svg>
                    </button>
                    {currentPage} / {totalPages}
                    <button onClick={handleNextPage} disabled={currentPage === totalPages}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 30 30" strokeWidth={2} stroke="currentColor" className="pt-1 ml-1 w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 4.5l7.5 7.5-7.5 7.5m-6-15l7.5 7.5-7.5 7.5" />
                        </svg>
                    </button>
                </div>
                <div className='flex justify-around w-1/2'>
                    <button onClick={handleReturnToBlade} className="p-2 bg-gray rounded-md hover:cursor-pointer NoSelectOnly">
                        Return
                    </button>
                    <button onClick={handleConfirmBlade} className="p-2 bg-orange rounded-md hover:cursor-pointer NoSelectOnly">
                        Confirm
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ImagesPagination;
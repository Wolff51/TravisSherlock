import React from 'react';


const ValidationProgress = ({ percent }) => {
    return (
        <div className="absolute bottom-0 left-0 h-2 bg-gray w-full text-black">
            <div
                className="bg-orange absolute left-0 top-0 bottom-0 animate-bar"
                style={{ width: `${percent}%` }}
            />
            <div
                className="relative text-center w-full h-full flex items-center justify-center"
                style={{ width: `${percent}%` }}
            >
            </div>
        </div>
    );
};

export default ValidationProgress;

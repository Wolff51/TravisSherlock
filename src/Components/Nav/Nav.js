import "./Nav.css";
import { Fragment, useEffect, useState } from "react";
import { Dialog, Disclosure, Menu, Transition } from "@headlessui/react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useNavigate } from "react-router-dom";
import CustomMessageAlert from "../AskUser/CustomMessageAlert";
import UpdateProfil from "../AskUser/UpdateProfil";
import OptionsModal from "../OptionsPanel/OptionPanel";
const { ipcRenderer } = window.require("electron");
const isDev = window.require("electron-is-dev");
const path = window.require("path");

const jwt = window.require('jsonwebtoken');

import { useSelector, useDispatch } from 'react-redux'
import { changeAuthForFalse } from "../../features/auth/auth";
import { resetDirectoryPath, setDirectoryPath } from "../../features/directoryPath/directoryPath";
import { setNasDirectoryPath, setNasAccessFalse } from "../../features/nasAccess/nasAccess";
import { useLocation } from 'react-router-dom';


function Nav() {
    const dispatch = useDispatch();
    const team = useSelector((state) => state.role.team);
    const role = useSelector((state) => state.role.value);
    const directoryPath = useSelector((state) => state.directoryPath.value);
    const nas = useSelector((state) => state.nasAccess.value);


    if (!ipcRenderer.listenerCount('selected-directory')) {
        ipcRenderer.on("selected-directory", (event, arg, type) => {
            if (arg === null) {
                return;
            } else if (type === "CreateMs") {
                localStorage.setItem('directoryPath', arg[0]);
                ipcRenderer.send("create-mission-sheet");
            } else if (type === "nas") {
                dispatch(setNasDirectoryPath(arg[0]));
                ipcRenderer.send("upload-NAS");
            } else {
                localStorage.setItem("directoryPath", arg);
                dispatch(setDirectoryPath());
            }
        });
    }


    const navigate = useNavigate();
    const [showModal, setShowModal] = useState(false);
    const [optionModal, setShowOptionModal] = useState(false);
    const [optionType, setOptionType] = useState(null);
    const [firstname, setFirstname] = useState("none");
    const [lastname, setLastname] = useState("none");
    const [id, setId] = useState(null);
    const [email, setEmail] = useState("none");
    const [imgSource, setImgSource] = useState('./images/titleBar/restore.png');
    const [typeOfMessage, setTypeOfMessage] = useState("");
    const [message, setMessage] = useState("");
    const [open, setOpen] = useState(false);
    const [updateProfilMenu, setUpdateProfilMenu] = useState(false);

    let actualPath = "";
    if (isDev) {
        actualPath = path.basename(window.location.pathname);
    } else {
        actualPath = useLocation().pathname;
    }

    useEffect(() => {
        window.addEventListener('keydown', (e) => {
            const { key, altKey } = e;
            if (key === 'F4' && altKey) {
                const token = localStorage.getItem("token");
                localStorage.clear();
                localStorage.setItem("token", token);
                ipcRenderer.send("close");
            }
        });

        if (window.outerWidth === window.screen.availWidth && window.outerHeight === window.screen.availHeight) {
            setImgSource("./images/titleBar/restore.png");
        } else {
            setImgSource("./images/titleBar/maximize.png");
        }

        window.addEventListener("resize", () => {
            if (
                window.outerWidth === window.screen.availWidth &&
                window.outerHeight === window.screen.availHeight
            ) {
                setImgSource("./images/titleBar/restore.png");
            } else {
                setImgSource("./images/titleBar/maximize.png");
            }
        });
        return () => {
            window.removeEventListener('keydown', () => { });
            window.removeEventListener("resize", () => { });
        }

    }, []);

    const navigateToDashboard = () => {
        if (team === "supairvision") {
            if (directoryPath === true) {
                navigate("/dashboard");
                ipcRenderer.send("update-dashboard");
            } else {
                if (actualPath === "" || actualPath === "/" || actualPath === " ") {
                    navigate("/");
                    ipcRenderer.send("upload-NAS");
                } else {
                    navigate("/");
                }
            };
        } else {
            handleReturnToBoard();
        }
    };

    const handleRestore = () => {
        ipcRenderer.send("resize", "restore");
    };

    const handleReduce = () => {
        ipcRenderer.send("resize", "reduce");
    };

    const handleOpenHelp = () => {
        if (open) {
            setOpen(false);
        } else {
            setOpen(true);
        }
    };



    // ********** MODAL FUNCTIONS **********

    const openModal = (message, type) => {
        setMessage(message);
        setTypeOfMessage(type);
        setShowModal(true);
    }

    const closeModal = () => {
        setShowModal(false);
    }

    const handleConfirmModal = () => {
        if (typeOfMessage === "close") {
            const token = localStorage.getItem("token");
            localStorage.clear();
            localStorage.setItem("token", token);
            setTimeout(() => {
                closeModal();
                ipcRenderer.send("close");
            }, 1500);
        } else if (typeOfMessage === "directory") {
            closeModal();
            navigate("/");
            setTimeout(() => {
                dispatch(resetDirectoryPath());
                localStorage.removeItem("directoryPath");
                localStorage.removeItem("missionSheet");
            }, 600);
        } else if (typeOfMessage === "logout") {
            dispatch(changeAuthForFalse());
            dispatch(resetDirectoryPath());
            dispatch(setNasAccessFalse());
            navigate("/");
            localStorage.clear();
            ipcRenderer.send("resize", "setToMinSize");
        } else if (typeOfMessage === "userUpdated") {
            closeModal();
        } else if (typeOfMessage === "Edit") {
            ipcRenderer.send("update-dashboard");
            closeModal();
        } else if (typeOfMessage === "EditError") {
            closeModal();
        }
    }

    useEffect(() => {
        const handleDoubleClick = () => {
            if (window.outerWidth === window.screen.availWidth && window.outerHeight === window.screen.availHeight) {
                ipcRenderer.send("resize", "reduce");
            } else {
                ipcRenderer.send("resize", "setToMinSize");
            }
        };

        const navElement = document.getElementById('Nav');

        if (navElement) {
            navElement.addEventListener('dblclick', handleDoubleClick);
        }

        return () => {
            if (navElement) {
                navElement.removeEventListener('dblclick', handleDoubleClick);
            }
        };
    }, []);
    // PROFIL

    const handleUpdateProfile = () => {
        const token = localStorage.getItem("token");
        const secretKey = "bjavbzmvkabvjpekzabnvjlmzevnjpzkabvnùapzkdbvmzav";
        const decoded = jwt.verify(token, secretKey);
        setId(decoded.user);
        setEmail(decoded.email);
        setLastname(decoded.lastname);
        setFirstname(decoded.firstname);
    };

    const handleReturnToBoard = () => {
        localStorage.removeItem("missionSheet");
        localStorage.removeItem("directoryPath");
        localStorage.removeItem("directoryPathFastProcess");
        localStorage.removeItem("directoryPathFastProcess");
        dispatch(resetDirectoryPath());
        navigate("/");
    }

    useEffect(() => {
        if (firstname === 'none') return;
        setUpdateProfilMenu(true);
    }, [firstname]);

    const handleUpdateProfil = (type, firstname, lastname) => {
        handleUpdateUserAndToken(type, firstname, lastname)
        setFirstname('none');
        setLastname('none');
        setUpdateProfilMenu(false);
    }

    const handleCloseProfilModal = () => {
        setFirstname('none');
        setLastname('none');
        setUpdateProfilMenu(false)
    }

    const handleUpdateUserAndToken = (type, firstname, lastname) => {
        if (type === 'profil') {
            const notEmpty = []
            const startQuery = 'UPDATE users SET '
            if (firstname !== '') notEmpty.push(`firstname = '${firstname}'`)
            if (lastname !== '') notEmpty.push(`lastname = '${lastname}'`)
            const query = startQuery + notEmpty.join(', ') + ` WHERE id = ${id};`

            ipcRenderer.send("update-user", query);
            const token = localStorage.getItem("token");
            const secretKey = "bjavbzmvkabvjpekzabnvjlmzevnjpzkabvnùapzkdbvmzav";
            const decoded = jwt.verify(token, secretKey);
            // if exist in notEmpty, use the new value, else use the old value
            const newToken = jwt.sign({
                user: decoded.user,
                firstname: notEmpty.includes(`firstname = '${firstname}'`) ? firstname : decoded.firstname,
                lastname: notEmpty.includes(`lastname = '${lastname}'`) ? lastname : decoded.lastname,
                role: decoded.role,
                email: decoded.email,
                iat: decoded.iat,
                exp: decoded.exp
            }, secretKey);

            localStorage.setItem("token", newToken);
            openModal("Profil Updated !", "userUpdated");
        } else if (type === 'password') {
            const query = `UPDATE users SET password = '${lastname}' WHERE id = ${id};`
            ipcRenderer.send("update-user", query);
            openModal("Password Updated !", "userUpdated");
        }

    }

    // OPTION MODAL
    const handleOptionModal = (type) => {
        setOptionType(type);
        setShowOptionModal(true);
    };

    const handleCloseOptionModal = () => {
        setShowOptionModal(false);
    };

    const handleConfirmOptionModal = () => {
        setShowOptionModal(false);
        setTypeOfMessage(optionType);
        if (optionType === "Edit") {
            openModal("You update the Parc", "Edit");
        }
    };


    const handleConfirmUpToDate = () => {
        setShowOptionModal(false);
        openModal("Error Updating the side", "EditError");
    };



    return (
        <div id="Nav" className="Nav">
            {optionModal &&
                <OptionsModal optiontype={optionType} onDate={handleConfirmUpToDate} onConfirm={handleConfirmOptionModal} onCancel={handleCloseOptionModal} />
            }
            {showModal &&
                <CustomMessageAlert message={message} onConfirm={handleConfirmModal} onCancel={closeModal} type={typeOfMessage} />
            }
            {updateProfilMenu &&
                <UpdateProfil firstname={firstname} lastname={lastname} email={email} onConfirm={handleUpdateProfil} onCancel={handleCloseProfilModal} />
            }
            <div className="relative hNav z-10">
                <>
                    <div className="bg-orange">
                        <Disclosure as="nav" className="flex justify-center">
                            <>
                                <div className="w-full">
                                    <div className="w-full flex flex-row hNav items-center justify-between">
                                        <div className="flex items-center">
                                            {/* Logo */}
                                            <div className="NoDrag flex-shrink-0">
                                                <a onClick={navigateToDashboard}>
                                                    <img
                                                        className="pl-5 h-5 w-auto hover:cursor-pointer"
                                                        src="./images/logo_white.png"
                                                        alt="Supairvision"
                                                    />
                                                </a>
                                            </div>
                                        </div>

                                        <div className="grow">
                                            {/* Here For CSS - take available space */}
                                        </div>
                                        {/* Options Menu */}
                                        {team === "supairvision" &&
                                            <div id="optionListMenu" className="NoDrag relative mr-10">
                                                <Menu
                                                    as="div"
                                                    className="relative inline-block text-left"
                                                >
                                                    <div>
                                                        <Menu.Button className="lg:scale-90 md:scale-85 inline-flex w-full justify-center rounded-md bg-black bg-opacity-20 px-4 py-2 text-sm font-medium text-white hover:bg-opacity-30 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75">
                                                            Options
                                                            <ChevronDownIcon
                                                                className="ml-2 -mr-1 h-5 w-5"
                                                                aria-hidden="true"
                                                            />
                                                        </Menu.Button>
                                                    </div>
                                                    <Transition
                                                        as={Fragment}
                                                        enter="transition ease-out duration-100"
                                                        enterFrom="transform opacity-0 scale-95"
                                                        enterTo="transform opacity-100 scale-100"
                                                        leave="transition ease-in duration-75"
                                                        leaveFrom="transform opacity-100 scale-100"
                                                        leaveTo="transform opacity-0 scale-95"
                                                    >
                                                        <Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                                                            {directoryPath !== null &&

                                                                <div className="px-1 py-1">
                                                                    <Menu.Item>
                                                                        {({ active }) => (
                                                                            <button
                                                                                title="Fix a particular turbine, blade or side"
                                                                                className={`${active ? "text-orange" : "text-black"
                                                                                    } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                                                                                onClick={() => {
                                                                                    handleOptionModal("Edit");
                                                                                }}
                                                                            >
                                                                                {active ? (
                                                                                    <EditActiveIcon
                                                                                        className="mr-2 h-5 w-5"
                                                                                        aria-hidden="true"
                                                                                    />
                                                                                ) : (
                                                                                    <EditInactiveIcon
                                                                                        className="mr-2 h-5 w-5"
                                                                                        aria-hidden="true"
                                                                                    />
                                                                                )}
                                                                                Edit
                                                                            </button>
                                                                        )}
                                                                    </Menu.Item>
                                                                </div>
                                                            }
                                                            {directoryPath !== null &&
                                                                <div className="px-1 py-1 ">
                                                                    <Menu.Item>
                                                                        {({ active }) => (
                                                                            <button
                                                                                title="Setup wind farm on Visionair"
                                                                                className={`${active ? "text-orange" : "text-black"
                                                                                    } group flex w-full items-center rounded-md px-2 py-2 text-sm`}

                                                                            >
                                                                                {active ? (
                                                                                    <MoveActiveIcon
                                                                                        className="mr-2 h-5 w-5"
                                                                                        aria-hidden="true"
                                                                                    />
                                                                                ) : (
                                                                                    <MoveInactiveIcon
                                                                                        className="mr-2 h-5 w-5"
                                                                                        aria-hidden="true"
                                                                                    />
                                                                                )}
                                                                                Setup
                                                                            </button>
                                                                        )}
                                                                    </Menu.Item>
                                                                    <Menu.Item>
                                                                        {({ active }) => (
                                                                            <button
                                                                                title="Duplicate wind farm"
                                                                                className={`${active ? "text-orange" : "text-black"
                                                                                    } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                                                                                onClick={() => {
                                                                                    handleOptionModal("Duplicate");
                                                                                }}
                                                                            >
                                                                                {active ? (
                                                                                    <DuplicateActiveIcon
                                                                                        className="mr-2 h-5 w-5"
                                                                                        aria-hidden="true"
                                                                                    />
                                                                                ) : (
                                                                                    <DuplicateInactiveIcon
                                                                                        className="mr-2 h-5 w-5"
                                                                                        aria-hidden="true"
                                                                                    />
                                                                                )}
                                                                                Duplicate
                                                                            </button>
                                                                        )}
                                                                    </Menu.Item>
                                                                </div>
                                                            }
                                                            {team !== "supairvision" &&
                                                                <div className="px-1 py-1">
                                                                    <Menu.Item>
                                                                        {({ active }) => (
                                                                            <button
                                                                                onClick={() => { openModal("Are you sure you want to change directory ?", "directory") }}
                                                                                title="Redirect to upload page, use for testing purpose"
                                                                                className={`${active ? "text-orange" : "text-black"
                                                                                    } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                                                                            >
                                                                                {active ? (
                                                                                    <UploadActiveIcon
                                                                                        className="mr-2 h-5 w-5"
                                                                                        aria-hidden="true"
                                                                                    />
                                                                                ) : (
                                                                                    <UploadInactiveIcon
                                                                                        className="mr-2 h-5 w-5"
                                                                                        aria-hidden="true"
                                                                                    />
                                                                                )}
                                                                                Change WF Directory
                                                                            </button>
                                                                        )}
                                                                    </Menu.Item>
                                                                </div>
                                                            }
                                                            {team === "supairvision" &&
                                                                <div className="px-1 py-1">
                                                                    {directoryPath === null &&
                                                                        <Menu.Item>
                                                                            {({ active }) => (
                                                                                <button
                                                                                    onClick={() => { ipcRenderer.send("uploadDirectory", "CreateMs") }}
                                                                                    title="Create mission sheet for a WF directory"
                                                                                    className={`${active ? "text-orange" : "text-black"
                                                                                        } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                                                                                >
                                                                                    {active ? (
                                                                                        <CreateActiveIcon
                                                                                            className="mr-2 h-5 w-5"
                                                                                            aria-hidden="true"
                                                                                        />
                                                                                    ) : (
                                                                                        <CreateInactiveIcon
                                                                                            className="mr-2 h-5 w-5"
                                                                                            aria-hidden="true"
                                                                                        />
                                                                                    )}
                                                                                    Create Mission Sheet
                                                                                </button>
                                                                            )}
                                                                        </Menu.Item>
                                                                    }
                                                                    {directoryPath !== null &&
                                                                        <Menu.Item>
                                                                            {({ active }) => (
                                                                                <button
                                                                                    onClick={handleReturnToBoard}
                                                                                    title="Redirect to main page"
                                                                                    className={`${active ? "text-orange" : "text-black"
                                                                                        } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                                                                                >
                                                                                    {active ? (
                                                                                        <ReturnActiveIcon
                                                                                            className="mr-2 h-5 w-5"
                                                                                            aria-hidden="true"
                                                                                        />
                                                                                    ) : (
                                                                                        <ReturnInactiveIcon
                                                                                            className="mr-2 h-5 w-5"
                                                                                            aria-hidden="true"
                                                                                        />
                                                                                    )}
                                                                                    Return to Board
                                                                                </button>
                                                                            )}
                                                                        </Menu.Item>
                                                                    }
                                                                    {nas === false &&
                                                                        <Menu.Item>
                                                                            {({ active }) => (
                                                                                <button
                                                                                    onClick={() => { ipcRenderer.send("uploadDirectory", "nas"); }}
                                                                                    title="Setup NAS directory to get dashboard data"
                                                                                    className={`${active ? "text-orange" : "text-black"
                                                                                        } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                                                                                >
                                                                                    {active ? (
                                                                                        <NasActiveIcon
                                                                                            className="mr-2 h-5 w-5"
                                                                                            aria-hidden="true"
                                                                                        />
                                                                                    ) : (
                                                                                        <NasInactiveIcon
                                                                                            className="mr-2 h-5 w-5"
                                                                                            aria-hidden="true"
                                                                                        />
                                                                                    )}
                                                                                    Open Nas Directory
                                                                                </button>
                                                                            )}
                                                                        </Menu.Item>
                                                                    }
                                                                    <Menu.Item>
                                                                        {({ active }) => (
                                                                            <button
                                                                                onClick={() => { ipcRenderer.send("uploadDirectory", "nas"); }}
                                                                                title="Setup NAS directory to get dashboard data"
                                                                                className={`${active ? "text-orange" : "text-black"
                                                                                    } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                                                                            >
                                                                                {active ? (
                                                                                    <NasActiveIcon
                                                                                        className="mr-2 h-5 w-5"
                                                                                        aria-hidden="true"
                                                                                    />
                                                                                ) : (
                                                                                    <NasInactiveIcon
                                                                                        className="mr-2 h-5 w-5"
                                                                                        aria-hidden="true"
                                                                                    />
                                                                                )}
                                                                                Change Nas Directory
                                                                            </button>
                                                                        )}
                                                                    </Menu.Item>
                                                                </div >
                                                            }
                                                        </Menu.Items >
                                                    </Transition >
                                                </Menu >
                                            </div >
                                        }
                                        {/* Options Menu End */}
                                        {/* Profil And Help */}
                                        <div className="flex items-center justify-center mr-5 h-full">
                                            {/* Help button */}
                                            <button
                                                type="button"
                                                className="NoDrag p-1 focus:outline-none hover:bg-orange-100 h-full w-12 flex items-center justify-center"
                                                onClick={handleOpenHelp}
                                            >
                                                <span className="sr-only">Help</span>
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    strokeWidth={1.5}
                                                    stroke="currentColor"
                                                    className="w-6 h-6 text-white"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
                                                    />
                                                </svg>
                                            </button>
                                            {/* Profile dropdown */}
                                            <Menu
                                                as="div"
                                                className="NoDrag relative ml-3 hover:bg-orange-100 h-full w-12 flex items-center justify-center"
                                            >
                                                <div>
                                                    <Menu.Button className="flex max-w-xs items-center rounded-full text-sm">
                                                        <span className="sr-only">Open user menu</span>
                                                        <svg
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            viewBox="0 0 24 24"
                                                            fill="currentColor"
                                                            className="w-6 h-6 fill-white"
                                                        >
                                                            <path
                                                                fillRule="evenodd"
                                                                d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z"
                                                                clipRule="evenodd"
                                                            />
                                                        </svg>
                                                    </Menu.Button>
                                                </div>
                                                <Transition
                                                    as={Fragment}
                                                    enter="transition ease-out duration-100"
                                                    enterFrom="transform opacity-0 scale-95"
                                                    enterTo="transform opacity-100 scale-100"
                                                    leave="transition ease-in duration-75"
                                                    leaveFrom="transform opacity-100 scale-100"
                                                    leaveTo="transform opacity-0 scale-95"
                                                >
                                                    <Menu.Items className="absolute right-0 top-11 mt-5 w-56 origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                                                        <div className="px-1 py-1">
                                                            <Menu.Item>
                                                                {({ active }) => (
                                                                    <button
                                                                        onClick={() => {
                                                                            handleUpdateProfile();
                                                                        }}
                                                                        title="Redirect to profil page"
                                                                        className={`${active ? "text-orange" : "text-black"
                                                                            } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                                                                    >
                                                                        {active ? (
                                                                            <ProfilActiveIcon
                                                                                className="mr-2 h-5 w-5"
                                                                                aria-hidden="true"
                                                                            />
                                                                        ) : (
                                                                            <ProfilInactiveIcon
                                                                                className="mr-2 h-5 w-5"
                                                                                aria-hidden="true"
                                                                            />
                                                                        )}
                                                                        Profile
                                                                    </button>
                                                                )}
                                                            </Menu.Item>
                                                        </div>
                                                        {role === 'admin' &&
                                                            <div className="px-1 py-1">
                                                                <Menu.Item>
                                                                    {({ active }) => (
                                                                        <button
                                                                            onClick={() => { navigate("/adminPanel") }}
                                                                            title="Go to Admin Panel"
                                                                            className={`${active ? "text-orange" : "text-black"
                                                                                } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                                                                        >
                                                                            {active ? (
                                                                                <AdminActiveIcon
                                                                                    className="mr-2 h-5 w-5"
                                                                                    aria-hidden="true"
                                                                                />
                                                                            ) : (
                                                                                <AdminInactiveIcon
                                                                                    className="mr-2 h-5 w-5"
                                                                                    aria-hidden="true"
                                                                                />
                                                                            )}
                                                                            Admin Panel
                                                                        </button>
                                                                    )}
                                                                </Menu.Item>
                                                            </div>
                                                        }
                                                        {role === 'manager' &&
                                                            <div className="px-1 py-1">
                                                                <Menu.Item>
                                                                    {({ active }) => (
                                                                        <button
                                                                            onClick={() => { navigate("/adminPanel") }}
                                                                            title="Go to Manager Panel"
                                                                            className={`${active ? "text-orange" : "text-black"
                                                                                } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                                                                        >
                                                                            {active ? (
                                                                                <AdminActiveIcon
                                                                                    className="mr-2 h-5 w-5"
                                                                                    aria-hidden="true"
                                                                                />
                                                                            ) : (
                                                                                <AdminInactiveIcon
                                                                                    className="mr-2 h-5 w-5"
                                                                                    aria-hidden="true"
                                                                                />
                                                                            )}
                                                                            Manager Panel
                                                                        </button>
                                                                    )}
                                                                </Menu.Item>
                                                            </div>
                                                        }
                                                        <div className="px-1 py-1">
                                                            <Menu.Item>
                                                                {({ active }) => (
                                                                    <button
                                                                        onClick={() => { openModal("Are you sure you want to log out ?", "logout") }}
                                                                        title="Log out from Sherlock Studio !"
                                                                        className={`${active ? "text-orange" : "text-black"
                                                                            } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                                                                    >
                                                                        {active ? (
                                                                            <LogoutActiveIcon
                                                                                className="mr-2 h-5 w-5"
                                                                                aria-hidden="true"
                                                                            />
                                                                        ) : (
                                                                            <LogoutInactiveIcon
                                                                                className="mr-2 h-5 w-5"
                                                                                aria-hidden="true"
                                                                            />
                                                                        )}
                                                                        Log out
                                                                    </button>
                                                                )}
                                                            </Menu.Item>
                                                        </div>
                                                    </Menu.Items>
                                                </Transition>
                                            </Menu>

                                        </div>
                                        {/* Profil And Help End */}
                                        {/* Custom Button Title Bar */}
                                        <div className="NoDrag customNavButtons h-full flex flex-row flex-nowrap">
                                            {/* Reduce */}
                                            <button
                                                type="button"
                                                className="cursorNone w-12 w-1/6 flex justify-center items-center hover:bg-orange-100"
                                                onClick={handleReduce}
                                                title="Reduce"
                                            >
                                                <img
                                                    src="./images/titleBar/minimize.png"
                                                    alt="minimize"
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    strokeWidth={1.5}
                                                    stroke="currentColor"
                                                    className="w-3 h-3 cursorNone"
                                                />
                                            </button>
                                            {/* Restore (Smaller or Bigger) */}
                                            <button
                                                type="button"
                                                className="cursorNone w-14 w-1/6 flex justify-center items-center hover:bg-orange-100"
                                                title="Maximize/Minimize"
                                                onClick={handleRestore}
                                            >
                                                <img
                                                    id="restoreImg"
                                                    src={imgSource}
                                                    alt="restore"
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    strokeWidth={1.5}
                                                    stroke="currentColor"
                                                    className="ml-1 w-3 h-3"
                                                />
                                            </button>
                                            {/* Close */}
                                            <button
                                                type="button"
                                                className="cursorNone h-full hover:bg-red w-14 w-1/6 flex justify-center items-center"
                                                title="Close"
                                                onClick={() => { openModal("Are you sure you want to close Sherlock App Studio ?", "close") }}
                                            >
                                                <img
                                                    src="./images/titleBar/close.png"
                                                    alt="minimize"
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    strokeWidth={1.5}
                                                    stroke="currentColor"
                                                    className="ml-1 w-3 h-3"
                                                />
                                            </button>
                                        </div>
                                    </div >
                                </div >
                            </>
                        </Disclosure >
                    </div >
                </>
            </div >
            {/* GESTION HELP PANEL */}
            < Transition.Root show={open} as={Fragment}>
                <Dialog as="div" className="relative z-10" onClose={setOpen}>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-in-out duration-500"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in-out duration-500"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        {/* Gestion background opacity ou non */}
                        <div className="fixed inset-0 bg-gray-100 bg-opacity-75 transition-opacity" />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-hidden">
                        <div className="absolute inset-0 overflow-hidden">
                            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
                                <Transition.Child
                                    as={Fragment}
                                    enter="transform transition ease-in-out duration-500 sm:duration-700"
                                    enterFrom="translate-x-full"
                                    enterTo="translate-x-0"
                                    leave="transform transition ease-in-out duration-500 sm:duration-700"
                                    leaveFrom="translate-x-0"
                                    leaveTo="translate-x-full"
                                >
                                    <Dialog.Panel className="pointer-events-auto relative w-screen max-w-md">
                                        <Transition.Child
                                            as={Fragment}
                                            enter="ease-in-out duration-500"
                                            enterFrom="opacity-0"
                                            enterTo="opacity-100"
                                            leave="ease-in-out duration-500"
                                            leaveFrom="opacity-100"
                                            leaveTo="opacity-0"
                                        >
                                            <div className="absolute top-0 left-0 -ml-8 flex pt-4 pr-2 sm:-ml-10 sm:pr-4"></div>
                                        </Transition.Child>
                                        {/* Gestion de la div */}
                                        <div className="flex h-full flex-col overflow-y-scroll bg-white py-6 shadow-xl">
                                            <div className="px-4 sm:px-6 flex flex-rox justify-between">
                                                <Dialog.Title className="text-lg font-medium text-gray-900">
                                                    Help Panel
                                                </Dialog.Title>
                                                <button
                                                    type="button"
                                                    className="rounded-md text-gray-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-white"
                                                    onClick={() => setOpen(false)}
                                                >
                                                    <span className="sr-only">Close panel</span>
                                                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                                                </button>
                                            </div>
                                            <div className="relative mt-6 flex-1 px-4 sm:px-6 text-xs">
                                                {/* Replace with your content */}
                                                <p className="mx-1 mb-2">
                                                    Présentation :
                                                </p>

                                                <p className="mx-1 mb-2">

                                                    Sherlock Studio is a powerful software application designed to automate the assembly of wind turbine components. It streamlines the assembly process into 6 simple steps, allowing you to quickly and efficiently assemble components without sacrificing quality or accuracy.{" "}
                                                </p>
                                                <p className="mx-1 mb-2">

                                                    The first step is "Sort", where you can organize and sort the wind turbine components by component type (blade, tower) and by component sides. This allows you to easily find the components you need for assembly and to get more specified results for an easy maintenance.{" "}
                                                </p>
                                                <p className="mx-1 mb-2">

                                                    Next, "Process" allows you to manipulate and prepare the component sides for assembly. You can clean, filter, and organize the component sides to ensure they are ready for use. This step prepares the data for validation and assembly.{" "}
                                                </p>
                                                <p className="mx-1 mb-2">
                                                    The third step, "Validate", is a manual process that allows you to choose the best method from the "Process" step for each component side. This ensures the best possible quality and accuracy in the assembly process.
                                                </p>
                                                <p className="mx-1 mb-2">
                                                    "Assemble" is a manual step done in Photoshop, where you can assemble the components that do not work with the methods from Process. This allows for maximum flexibility in the assembly process.
                                                </p>
                                                <p className="mx-1 mb-2">
                                                    The fifth step, "Optimize", allows you to reduce the size of the assembled image, making it easier to manage and share.
                                                </p>
                                                <p className="mx-1 mb-2">
                                                    Finally, in "Import", you can import the results of the assembly process to Visionair, our cloud platform for inspection data. This allows for easy analysis, annotating and sharing of the assembled data.
                                                </p>
                                                <p className="mx-1 mb-2">
                                                    Sherlock Studio is easy to use and requires no special training or expertise. It is designed to be user-friendly and intuitive, making it ideal for both novice and experienced users.
                                                </p>
                                                <p className="mx-1 mb-2">
                                                    Whether you are assembling wind turbine components for a large-scale project or a small-scale one, Sherlock Studio can help you streamline the process, reduce costs, and improve efficiency.
                                                </p>
                                                <div className="absolute inset-0 px-4 sm:px-6">
                                                    <div
                                                        className="h-full border-2 border-dashed border-gray-200"
                                                        aria-hidden="true"
                                                    />
                                                </div>
                                                {/* /End replace */}
                                            </div>
                                        </div>
                                    </Dialog.Panel>
                                </Transition.Child>
                            </div>
                        </div>
                    </div>
                </Dialog>
            </Transition.Root >
            {/* END HELP PANEL */}
        </div >
    );
}

// Function use to generate options menu
function EditInactiveIcon(props) {
    return (
        <svg
            {...props}
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
                d="M4 13V16H7L16 7L13 4L4 13Z"
                fill="orange"
                stroke="black"
                strokeWidth="2"
            />
        </svg>
    );
}

function EditActiveIcon(props) {
    return (
        <svg
            {...props}
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
                d="M4 13V16H7L16 7L13 4L4 13Z"
                fill="black"
                stroke="orange"
                strokeWidth="2"
            />
        </svg>
    );
}

function DuplicateInactiveIcon(props) {
    return (
        <svg
            {...props}
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path d="M4 4H12V12H4V4Z" fill="orange" stroke="black" strokeWidth="2" />
            <path d="M8 8H16V16H8V8Z" fill="orange" stroke="black" strokeWidth="2" />
        </svg>
    );
}

function DuplicateActiveIcon(props) {
    return (
        <svg
            {...props}
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path d="M4 4H12V12H4V4Z" fill="black" stroke="orange" strokeWidth="2" />
            <path d="M8 8H16V16H8V8Z" fill="black" stroke="orange" strokeWidth="2" />
        </svg>
    );
}

function AdminActiveIcon(props) {
    return (
        <svg
            {...props}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path d="M2.25 5.25a3 3 0 013-3h13.5a3 3 0 013 3V15a3 3 0 01-3 3h-3v.257c0 .597.237 1.17.659 1.591l.621.622a.75.75 0 01-.53 1.28h-9a.75.75 0 01-.53-1.28l.621-.622a2.25 2.25 0 00.659-1.59V18h-3a3 3 0 01-3-3V5.25zm1.5 0v7.5a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5v-7.5a1.5 1.5 0 00-1.5-1.5H5.25a1.5 1.5 0 00-1.5 1.5z" fill="black" stroke="orange" strokeWidth="2" />
        </svg>
    )
}

function AdminInactiveIcon(props) {
    return (
        <svg
            {...props}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path fill="orange"
                stroke="black"
                strokeWidth="2"
                d="M2.25 5.25a3 3 0 013-3h13.5a3 3 0 013 3V15a3 3 0 01-3 3h-3v.257c0 .597.237 1.17.659 1.591l.621.622a.75.75 0 01-.53 1.28h-9a.75.75 0 01-.53-1.28l.621-.622a2.25 2.25 0 00.659-1.59V18h-3a3 3 0 01-3-3V5.25zm1.5 0v7.5a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5v-7.5a1.5 1.5 0 00-1.5-1.5H5.25a1.5 1.5 0 00-1.5 1.5z" />
        </svg>
    )
}

function UploadActiveIcon(props) {
    return (
        <svg
            {...props}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path stroke="orange"
                fill="black"
                strokeWidth="2" d="M9.97.97a.75.75 0 011.06 0l3 3a.75.75 0 01-1.06 1.06l-1.72-1.72v3.44h-1.5V3.31L8.03 5.03a.75.75 0 01-1.06-1.06l3-3zM9.75 6.75v6a.75.75 0 001.5 0v-6h3a3 3 0 013 3v7.5a3 3 0 01-3 3h-7.5a3 3 0 01-3-3v-7.5a3 3 0 013-3h3z" />
            <path stroke="orange"
                fill="black"
                strokeWidth="2" d="M7.151 21.75a2.999 2.999 0 002.599 1.5h7.5a3 3 0 003-3v-7.5c0-1.11-.603-2.08-1.5-2.599v7.099a4.5 4.5 0 01-4.5 4.5H7.151z" />
        </svg>
    );
}

function UploadInactiveIcon(props) {
    return (
        <svg
            {...props}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path stroke="black"
                fill="orange"
                strokeWidth="2" d="M9.97.97a.75.75 0 011.06 0l3 3a.75.75 0 01-1.06 1.06l-1.72-1.72v3.44h-1.5V3.31L8.03 5.03a.75.75 0 01-1.06-1.06l3-3zM9.75 6.75v6a.75.75 0 001.5 0v-6h3a3 3 0 013 3v7.5a3 3 0 01-3 3h-7.5a3 3 0 01-3-3v-7.5a3 3 0 013-3h3z" />
            <path stroke="black"
                fill="orange"
                strokeWidth="2" d="M7.151 21.75a2.999 2.999 0 002.599 1.5h7.5a3 3 0 003-3v-7.5c0-1.11-.603-2.08-1.5-2.599v7.099a4.5 4.5 0 01-4.5 4.5H7.151z" />

        </svg>


    );
}

function NasActiveIcon(props) {
    return (
        <svg
            {...props}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path stroke="orange"
                fill="black"
                strokeWidth="2" d="M21 6.375c0 2.692-4.03 4.875-9 4.875S3 9.067 3 6.375 7.03 1.5 12 1.5s9 2.183 9 4.875z" />
            <path stroke="black"
                fill="orange"
                strokeWidth="2" d="M12 12.75c2.685 0 5.19-.586 7.078-1.609a8.283 8.283 0 001.897-1.384c.016.121.025.244.025.368C21 12.817 16.97 15 12 15s-9-2.183-9-4.875c0-.124.009-.247.025-.368a8.285 8.285 0 001.897 1.384C6.809 12.164 9.315 12.75 12 12.75z" />
            <path stroke="orange"
                fill="black"
                strokeWidth="2" d="M12 16.5c2.685 0 5.19-.586 7.078-1.609a8.282 8.282 0 001.897-1.384c.016.121.025.244.025.368 0 2.692-4.03 4.875-9 4.875s-9-2.183-9-4.875c0-.124.009-.247.025-.368a8.284 8.284 0 001.897 1.384C6.809 15.914 9.315 16.5 12 16.5z" />
            <path stroke="black"
                fill="orange"
                strokeWidth="2" d="M12 20.25c2.685 0 5.19-.586 7.078-1.609a8.282 8.282 0 001.897-1.384c.016.121.025.244.025.368 0 2.692-4.03 4.875-9 4.875s-9-2.183-9-4.875c0-.124.009-.247.025-.368a8.284 8.284 0 001.897 1.384C6.809 19.664 9.315 20.25 12 20.25z" />
        </svg>
    );
}

function NasInactiveIcon(props) {
    return (
        <svg
            {...props}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >

            <path stroke="black"
                fill="orange"
                strokeWidth="2" d="M21 6.375c0 2.692-4.03 4.875-9 4.875S3 9.067 3 6.375 7.03 1.5 12 1.5s9 2.183 9 4.875z" />
            <path stroke="orange"
                fill="black"
                strokeWidth="2" d="M12 12.75c2.685 0 5.19-.586 7.078-1.609a8.283 8.283 0 001.897-1.384c.016.121.025.244.025.368C21 12.817 16.97 15 12 15s-9-2.183-9-4.875c0-.124.009-.247.025-.368a8.285 8.285 0 001.897 1.384C6.809 12.164 9.315 12.75 12 12.75z" />
            <path stroke="black"
                fill="orange"
                strokeWidth="2" d="M12 16.5c2.685 0 5.19-.586 7.078-1.609a8.282 8.282 0 001.897-1.384c.016.121.025.244.025.368 0 2.692-4.03 4.875-9 4.875s-9-2.183-9-4.875c0-.124.009-.247.025-.368a8.284 8.284 0 001.897 1.384C6.809 15.914 9.315 16.5 12 16.5z" />
            <path stroke="orange"
                fill="black"
                strokeWidth="2" d="M12 20.25c2.685 0 5.19-.586 7.078-1.609a8.282 8.282 0 001.897-1.384c.016.121.025.244.025.368 0 2.692-4.03 4.875-9 4.875s-9-2.183-9-4.875c0-.124.009-.247.025-.368a8.284 8.284 0 001.897 1.384C6.809 19.664 9.315 20.25 12 20.25z" />
        </svg>


    );
}

function ReturnActiveIcon(props) {
    return (
        <svg
            {...props}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >

            <path stroke="orange"
                fill="black"
                strokeWidth="1.5" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-4.28 9.22a.75.75 0 000 1.06l3 3a.75.75 0 101.06-1.06l-1.72-1.72h5.69a.75.75 0 000-1.5h-5.69l1.72-1.72a.75.75 0 00-1.06-1.06l-3 3z" clipRule="evenodd" />
        </svg>
    );
}

function ReturnInactiveIcon(props) {
    return (
        <svg
            {...props}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >

            <path stroke="black"
                fill="orange"
                strokeWidth="1.5" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-4.28 9.22a.75.75 0 000 1.06l3 3a.75.75 0 101.06-1.06l-1.72-1.72h5.69a.75.75 0 000-1.5h-5.69l1.72-1.72a.75.75 0 00-1.06-1.06l-3 3z" clipRule="evenodd" />
        </svg>


    );
}


function CreateActiveIcon(props) {
    return (
        <svg
            {...props}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >

            <path stroke="orange"
                fill="black"
                strokeWidth="1.5" d="M5.625 1.5H9a3.75 3.75 0 013.75 3.75v1.875c0 1.036.84 1.875 1.875 1.875H16.5a3.75 3.75 0 013.75 3.75v7.875c0 1.035-.84 1.875-1.875 1.875H5.625a1.875 1.875 0 01-1.875-1.875V3.375c0-1.036.84-1.875 1.875-1.875zM12.75 12a.75.75 0 00-1.5 0v2.25H9a.75.75 0 000 1.5h2.25V18a.75.75 0 001.5 0v-2.25H15a.75.75 0 000-1.5h-2.25V12z" />
            <path stroke="orange"
                fill="black"
                strokeWidth="1.5" d="M14.25 5.25a5.23 5.23 0 00-1.279-3.434 9.768 9.768 0 016.963 6.963A5.23 5.23 0 0016.5 7.5h-1.875a.375.375 0 01-.375-.375V5.25z" />
        </svg>
    );
}

function CreateInactiveIcon(props) {
    return (
        <svg
            {...props}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >

            <path stroke="black"
                fill="orange"
                strokeWidth="1.5" d="M5.625 1.5H9a3.75 3.75 0 013.75 3.75v1.875c0 1.036.84 1.875 1.875 1.875H16.5a3.75 3.75 0 013.75 3.75v7.875c0 1.035-.84 1.875-1.875 1.875H5.625a1.875 1.875 0 01-1.875-1.875V3.375c0-1.036.84-1.875 1.875-1.875zM12.75 12a.75.75 0 00-1.5 0v2.25H9a.75.75 0 000 1.5h2.25V18a.75.75 0 001.5 0v-2.25H15a.75.75 0 000-1.5h-2.25V12z" clipRule="evenodd" />
            <path stroke="black"
                fill="orange"
                strokeWidth="1.5" d="M14.25 5.25a5.23 5.23 0 00-1.279-3.434 9.768 9.768 0 016.963 6.963A5.23 5.23 0 0016.5 7.5h-1.875a.375.375 0 01-.375-.375V5.25z" />

        </svg>


    );
}

function MoveInactiveIcon(props) {
    return (
        <svg
            {...props}
            fill="orange"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
                stroke="black"
                strokeWidth="2"
                d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
                clipRule="evenodd"
            />
        </svg>
    );
}

function MoveActiveIcon(props) {
    return (
        <svg
            {...props}
            fill="black"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
                stroke="orange"
                strokeWidth="2"
                d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
                clipRule="evenodd"
            />
        </svg>
    );
}

function ProfilActiveIcon(props) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
        >
            <path
                stroke="orange"
                fill="black"
                strokeWidth="2"
                d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z"
                clipRule="evenodd"
            />
        </svg>
    );
}

function ProfilInactiveIcon(props) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
        >
            <path
                stroke="black"
                fill="orange"
                strokeWidth="2"
                d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z"
                clipRule="evenodd"
            />
        </svg>
    );
}

function LogoutActiveIcon(props) {
    return (
        <svg
            {...props}
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
                stroke="orange"
                d="M8.51428 20H4.51428C3.40971 20 2.51428 19.1046 2.51428 18V6C2.51428 4.89543 3.40971 4 4.51428 4H8.51428V6H4.51428V18H8.51428V20Z"
                fill="orange"
            />
            <path
                d="M13.8418 17.385L15.262 15.9768L11.3428 12.0242L20.4857 12.0242C21.038 12.0242 21.4857 11.5765 21.4857 11.0242C21.4857 10.4719 21.038 10.0242 20.4857 10.0242L11.3236 10.0242L15.304 6.0774L13.8958 4.6572L7.5049 10.9941L13.8418 17.385Z"
                stroke="orange"
                fill="black"
            />
        </svg>
    );
}

function LogoutInactiveIcon(props) {
    return (
        <svg
            {...props}
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
                stroke="black"
                fill="orange"
                d="M8.51428 20H4.51428C3.40971 20 2.51428 19.1046 2.51428 18V6C2.51428 4.89543 3.40971 4 4.51428 4H8.51428V6H4.51428V18H8.51428V20Z"
            />
            <path
                d="M13.8418 17.385L15.262 15.9768L11.3428 12.0242L20.4857 12.0242C21.038 12.0242 21.4857 11.5765 21.4857 11.0242C21.4857 10.4719 21.038 10.0242 20.4857 10.0242L11.3236 10.0242L15.304 6.0774L13.8958 4.6572L7.5049 10.9941L13.8418 17.385Z"
                stroke="black"
                fill="orange"
            />
        </svg>
    );
}



export default Nav;

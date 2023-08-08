import React, { useEffect, useState } from "react";
import "./Login.css"
import { useNavigate } from "react-router-dom";
import Loader from "../Loader/Loader";
const jwt = window.require('jsonwebtoken');
const { ipcRenderer } = window.require("electron");

import { useDispatch } from 'react-redux'
import { changeForAdmin, changeForUser, changeForManager, changeForSavMember, changeForServiceProvider } from "../../features/role/role";
import { changeAuthForTrue } from "../../features/auth/auth";

const bcrypt = window.require('bcryptjs');


function Login() {
    const dispatch = useDispatch();

    const lastActiveTime = localStorage.getItem("lastActiveTime");
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [userslist, setUserslist] = useState("none");
    const [password, setPassword] = useState("");
    const [forgotPassword, setForgotPassword] = useState(false);




    useEffect(() => {
        ipcRenderer.send("setToMinSize");
        ipcRenderer.send("get-cookie");
        ipcRenderer.on("find-user", (event, users) => {
            setUserslist(users);
        });
        ipcRenderer.on('find-cookie', (event, cookie) => {
            if (cookie !== undefined) {
                const { email, password } = cookie;
                document.getElementById("email").value = email;
                document.getElementById("password").value = password;
                document.getElementById("remember").checked = true;
            }
        });

        return () => {
            ipcRenderer.removeAllListeners("find-user");
            ipcRenderer.removeAllListeners("find-cookie");
        };

    }, []);

    useEffect(() => {
        if (userslist === "none") return;
        if (userslist === null) {
            setErrorMessages({
                name: "message",
                message: "Username or password incorrect",
            });
            return;
        }
        const user = userslist
        if (user.errorIp) {
            alert(user.errorIp)
            setErrorMessages({
                name: "message",
                message: "Your IP is not allowed to connect to this application",
            });
            // PROBLEME IP , A RETIRER
            const payload = {
                firstname: 'ip',
                lastname: 'ip',
                user: 'ip',
                role: 'admin',
                email: 'ip',
                isAuthenticated: true,
            };
            handleRole('admin')
            const secretKey = 'bjavbzmvkabvjpekzabnvjlmzevnjpzkabvnùapzkdbvmzav'

            const token = jwt.sign(payload, secretKey, { expiresIn: '4h' });
            localStorage.setItem('token', token);
            localStorage.removeItem("lastActiveTime");
            setIsLoading(true);
            dispatch(changeAuthForTrue())
            navigate("/");
        }
        else if (!user || !bcrypt.compareSync(password, user.password)) {
            setErrorMessages({
                name: "message",
                message: "Username or password incorrect",
            });
        } else if (user.status !== "active") {
            setErrorMessages({
                name: "message",
                message: "Your account is disabled, please contact your administrator",
            });
        } else {
            handleRole(user.role)
            const payload = {
                firstname: user.firstname,
                lastname: user.lastname,
                user: user.id,
                role: user.role,
                email: user.email,
                isAuthenticated: true,
            };



            if (document.getElementById("remember").checked) {
                const cookie = { email: user.email, password: document.getElementById('password').value, url: "http://localhost:3000" }
                ipcRenderer.send("set-cookie", cookie);
            } else {
                ipcRenderer.send("remove-cookie", "http://localhost:3000");
            }

            const secretKey = 'bjavbzmvkabvjpekzabnvjlmzevnjpzkabvnùapzkdbvmzav'

            const token = jwt.sign(payload, secretKey, { expiresIn: '4h' });
            localStorage.setItem('token', token);
            localStorage.removeItem("lastActiveTime");
            setIsLoading(true);
            dispatch(changeAuthForTrue())
            navigate("/");
        }
    }, [userslist]);



    const [errorMessages, setErrorMessages] = useState({});
    const renderErrorMessage = (name) =>
        name === errorMessages.name && (
            <div className="error text-red font-bold  flex justify-center">
                <span>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="mr-2 w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286zm0 13.036h.008v.008H12v-.008z" />
                    </svg>
                </span>
                {errorMessages.message}
            </div>
        );

    const handleSubmitIfExist = (event) => {
        event.preventDefault();
        const { email, password } = event.target.elements;
        setPassword(password.value);
        ipcRenderer.send("find-one-user", email.value);
    };

    const handleRole = (role) => {
        if (role === "admin") {
            dispatch(changeForAdmin())
        } else if (role === "manager") {
            dispatch(changeForManager())
        } else if (role === "savMember") {
            dispatch(changeForSavMember())
        } else if (role === "serviceProvider") {
            dispatch(changeForServiceProvider())
        } else {
            dispatch(changeForUser())
        }
    }

    const handleForgotPassword = () => {
        if (forgotPassword) {
            setForgotPassword(false)
        } else {
            setForgotPassword(true)
        }
    }

    const handleGetNewPassword = (event) => {
        event.preventDefault()
        const sendEmailTo = event.target.elements.emailForgot.value
        console.log(sendEmailTo)
    }

    if (isLoading) return (
        <div id="Login" className="login hview flex items-center justify-center">
            <Loader />
        </div>
    )

    if (forgotPassword) return (
        <div id="Login" className="login hview">
            <div className="relative flex flex-col justify-center hview overflow-hidden">
                <div className="NoDrag w-full p-6 m-auto bg-white rounded-md shadow-md sm:max-w-xl">
                    <p className="mb-5 text-xs text-gray">
                        Version 0.4.3
                    </p>
                    <img
                        src="./images/logo.png"
                        alt="logo de supairvision"
                        className="NoSelect max-w-xs h-auto mx-auto"
                    />

                    <form className="mt-6" onSubmit={handleGetNewPassword}>
                        <div className="mb-2">
                            <label
                                htmlFor="emailForgot"
                                className="block text-sm font-semibold text-orange"
                            ></label>
                            <input
                                id="emailForgot"
                                placeholder="Email"
                                type="emailForgot"
                                name="emailForgot"
                                className="mt-7 place-items-center w-full px-4 py-2 mt-2 text-orange bg-white border rounded-md focus:border-orange focus:ring-orange focus:outline-none focus:ring focus:ring-opacity-40"
                            />
                        </div>

                        <div className="pl-1 pr-1 flex flex-row mb-5">
                            <div className="flex items-center">

                            </div>
                            <a onClick={handleForgotPassword} className="text-xs text-orange-600 hover:cursor-pointer hover:underline ml-auto">
                                Return to login
                            </a>

                        </div>
                        <div className="mt-6">
                            <button className="text-lg font-bold w-full px-4 py-2 tracking-wide text-white transition-colors duration-200 transform bg-orange rounded-md focus:outline-none">
                                Send me a new password
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )

    return (
        <div id="Login" className="login hview">
            <div className="relative flex flex-col justify-center hview overflow-hidden">
                <div className="NoDrag w-full p-6 m-auto bg-white rounded-md shadow-md sm:max-w-xl">
                    <p className="mb-5 text-xs text-gray">
                        Version 0.4.3
                    </p>
                    <img
                        src="./images/logo.png"
                        alt="logo de supairvision"
                        className="NoSelect max-w-xs h-auto mx-auto"
                    />

                    {lastActiveTime && <h1 className="mt-7"> You have been disconnect for security reason. Last activity : {lastActiveTime} </h1>}

                    <form className="mt-6" onSubmit={handleSubmitIfExist}>
                        <div className="mb-2">
                            <label
                                htmlFor="email"
                                className="block text-sm font-semibold text-orange"
                            ></label>
                            <input
                                required
                                id="email"
                                placeholder="Email"
                                type="email"
                                name="email"
                                className="mt-7 place-items-center w-full px-4 py-2 mt-2 text-orange bg-white border rounded-md focus:border-orange focus:ring-orange focus:outline-none focus:ring focus:ring-opacity-40"
                            />
                        </div>
                        <div className="mb-5">
                            <label
                                htmlFor="password"
                                className="block text-sm font-semibold text-orange "
                            ></label>
                            <input
                                required
                                id="password"
                                placeholder="Password"
                                name="password"
                                type="password"
                                className="w-full place-items-center px-4 py-2 mt-2 text-orange bg-white border rounded-md focus:border-orange focus:ring-orange focus:outline-none focus:ring focus:ring-opacity-40"
                            />
                        </div>

                        {renderErrorMessage("message")}


                        <div className="pl-1 pr-1 flex flex-row mb-5">
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    name="remember"
                                    id="remember"
                                    className="w-4 h-4 text-orange border-gray-300 rounded focus:ring-orange focus:border-orange"
                                />
                                <label
                                    htmlFor="remember"
                                    className="block ml-2 text-sm text-gray-900"
                                >
                                    Remember me
                                </label>
                            </div>
                            {/* <a onClick={handleForgotPassword} className="text-xs text-orange-600 hover:cursor-pointer hover:underline ml-auto">
                                Forget Password?
                            </a> */}
                        </div>
                        <div className="mt-6">
                            <button className="text-lg font-bold w-full px-4 py-2 tracking-wide text-white transition-colors duration-200 transform bg-orange rounded-md focus:outline-none">
                                LOG IN
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default Login;
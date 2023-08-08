
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux'
import { json, useNavigate } from 'react-router-dom';
import CustomMessageAlert from "../AskUser/CustomMessageAlert";

const { ipcRenderer } = window.require("electron");

const bcrypt = window.require('bcryptjs');
const saltRounds = 10;

function AdminPanel() {
    const role = useSelector((state) => state.role.value);
    const navigate = useNavigate();

    const [showModal, setShowModal] = useState(false);
    const [message, setMessage] = useState('');
    const [userLists, setUserLists] = useState([]);
    const [type, setType] = useState('');
    const [selectDelivery, setSelectDelivery] = useState('');
    const [selectedUser, setSelectedUser] = useState({
        firstname: '',
        lastname: '',
        email: 'exemple@email.com',
        role: '',
        password: '',
    });
    const [selectedUserHistoric, setSelectedUserHistoric] = useState([]);

    if (!ipcRenderer.listenerCount("return-users")) {
        ipcRenderer.on('return-users', (event, data) => {
            if (data.error) {
                alert(data.error);
                navigate('/');
                return;
            }
            const allUserData = data
            const filteredData = allUserData.filter(user => user.role !== 'admin');
            setUserLists(filteredData);
        });
    }

    if (!ipcRenderer.listenerCount("find-user")) {
        ipcRenderer.on('find-user', (event, data) => {
            setSelectedUser(data);
        });
    }

    if (!ipcRenderer.listenerCount("return-last-5-deliveries-by-user-id")) {
        ipcRenderer.on('return-last-5-deliveries-by-user-id', (event, data) => {
            setSelectedUserHistoric(data);
        });
    }

    if (!ipcRenderer.listenerCount("not-paid-deliveries-by-user-id")) {
        ipcRenderer.on('not-paid-deliveries-by-user-id', (event, data) => {
            setSelectedUserHistoric(data);
        });
    }

    if (!ipcRenderer.listenerCount('user-deleted')) {
        ipcRenderer.on('user-deleted', (event, data) => {
            ipcRenderer.send('get-all-users');
            if (showModal) {
                setShowModal(false);
            }
            handleShowModal('userDeleted');
        })
    }

    if (!ipcRenderer.listenerCount('user-updated')) {
        ipcRenderer.on('user-updated', (event, data) => {
            ipcRenderer.send('get-all-users');
            handleShowModal('userUpdated');
        })
    }

    if (!ipcRenderer.listenerCount('user-created')) {
        ipcRenderer.on('user-created', (event, data) => {
            handleShowModal('userCreated');
        })
    }

    useEffect(() => { }, [selectedUserHistoric]);

    useEffect(() => {
        if (message === '') return;
        setShowModal(true);
    }, [message]);

    useEffect(() => {
        if (selectedUser.email === 'exemple@email.com') return;
        handleUpdateModifyForm();
    }, [selectedUser]);


    useEffect(() => { }, [userLists]);

    useEffect(() => {
        if (selectDelivery === '') return;
        handleShowModal('payDelivery')
    }, [selectDelivery]);

    useEffect(() => {
        document.getElementById('upToDate').style.visibility = 'hidden';
        if (role === 'admin' || role === 'manager') {
            ipcRenderer.send('get-all-users');
        } else {
            navigate('/')
        }
        return () => {
            ipcRenderer.removeAllListeners('return-users');
            ipcRenderer.removeAllListeners('find-user');
            ipcRenderer.removeAllListeners('return-last-5-deliveries-by-user-id');
            ipcRenderer.removeAllListeners('user-deleted');
            ipcRenderer.removeAllListeners('not-paid-deliveries-by-user-id');
            ipcRenderer.removeAllListeners('user-updated');
            ipcRenderer.removeAllListeners('user-created');
        }
    }, [])

    const handleUpdateModifyForm = () => {
        document.getElementById('newEmail').value = selectedUser.email;
        const roleSelector = document.getElementById('newRole');
        for (let i = 0; i < roleSelector.length; i++) {
            if (roleSelector[i].value === upperCaseFirstLetter(selectedUser.role)) {
                roleSelector[i].selected = true;
            }
        }
        const statusSelector = document.getElementById('newStatus');
        for (let i = 0; i < statusSelector.length; i++) {
            if (statusSelector[i].value === upperCaseFirstLetter(selectedUser.status)) {
                statusSelector[i].selected = true;
            }
        }
    }

    const handleSelectUser = (e) => {
        ipcRenderer.send('find-one-user', e.target.value);
    }

    const upperCaseFirstLetter = (string) => {
        if (string === '' || string === undefined) return;
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    const toLowerCaseFirstLetter = (string) => {
        if (string === '' || string === undefined) return;
        return string.charAt(0).toLowerCase() + string.slice(1);
    }

    const validateEmail = (email) => {
        return String(email)
            .toLowerCase()
            .match(
                /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
            );
    };

    const handleCreateUser = (e) => {
        e.preventDefault();
        const isValideEmail = validateEmail(document.getElementById('email').value);
        if (!isValideEmail) {
            if (document.getElementById('messageError')) {
                document.getElementById('messageError').remove();
            }
            const errorMessage = document.createElement('p');
            errorMessage.id = 'messageError';
            errorMessage.classList.add('text-red', 'text-xs', 'italic');
            errorMessage.textContent = 'L\'email n\'est pas valide';
            document.getElementById('email').parentNode.appendChild(errorMessage);
            return;
        } else if (document.getElementById('password').value !== document.getElementById('confirmPassword').value) {
            const errorMessage = document.createElement('p');
            errorMessage.classList.add('text-red', 'text-xs', 'italic');
            errorMessage.textContent = 'Les mots de passe ne correspondent pas';
            errorMessage.id = 'messageError';
            if (document.getElementById('messageError')) {
                document.getElementById('messageError').remove();
            }
            document.getElementById('password').parentNode.appendChild(errorMessage);
            return;
        } else if (document.getElementById('password').value.length < 6) {
            const errorMessage = document.createElement('p');
            errorMessage.id = 'messageError';
            if (document.getElementById('messageError')) {
                document.getElementById('messageError').remove();
            }
            errorMessage.classList.add('text-red', 'text-xs', 'italic');
            errorMessage.textContent = 'Le mot de passe doit contenir au moins 6 caractères';
            document.getElementById('password').parentNode.appendChild(errorMessage);
            return;
        } else {
            const hash = bcrypt.hashSync(document.getElementById('password').value, saltRounds);
            const user = {
                firstname: document.getElementById('firstname').value,
                lastname: document.getElementById('lastname').value,
                email: document.getElementById('email').value,
                role: toLowerCaseFirstLetter(document.getElementById('role').value),
                password: hash,
            }
            ipcRenderer.send('create-user', user);
            document.getElementById('createUser').reset();
            if (document.getElementById('messageError')) {
                document.getElementById('messageError').remove();
            }
            setUserLists([...userLists, user]);
        }
    }

    const handleDeleteUser = (e) => {
        const userToDelet = selectedUser.email;
        if (userToDelet === 'Select One User') {
            return;
        } else {
            ipcRenderer.send('delete-user', userToDelet);
            document.getElementById('modifyUser').reset();
            setUserLists(userLists.filter(user => user.email !== userToDelet));
        }

    }

    const handleModifyUser = (e) => {
        e.preventDefault();
        const userSelector = document.getElementById('usernameModify')
        const optionValue = userSelector.options[userSelector.selectedIndex].value;
        if (optionValue === 'Select One User') {
            return;
        } else {
            if (document.getElementById('newPassword').value !== document.getElementById('confirmNewPassword').value) {
                const errorMessage = document.createElement('p');
                errorMessage.classList.add('text-red', 'text-xs', 'italic');
                errorMessage.textContent = 'Les mots de passe ne correspondent pas';
                errorMessage.id = 'messageError';
                if (document.getElementById('messageError')) {
                    document.getElementById('messageError').remove();
                }
                document.getElementById('newPassword').parentNode.appendChild(errorMessage);
                return;

            } else if (document.getElementById('newPassword').value.length < 6 && document.getElementById('newPassword').value !== '') {
                const errorMessage = document.createElement('p');
                errorMessage.id = 'messageError';
                if (document.getElementById('messageError')) {
                    document.getElementById('messageError').remove();
                }
                errorMessage.classList.add('text-red', 'text-xs', 'italic');
                errorMessage.textContent = 'Le mot de passe doit contenir au moins 6 caractères';
                document.getElementById('newPassword').parentNode.appendChild(errorMessage);
                return;
            } else {
                if (document.getElementById('messageError')) {
                    document.getElementById('messageError').remove();
                }
            }

            const data = {
                email: document.getElementById('newEmail').value,
                role: toLowerCaseFirstLetter(document.getElementById('newRole').value),
                password: document.getElementById('newPassword').value,
                status: toLowerCaseFirstLetter(document.getElementById('newStatus').value),
            };

            const userDataToModify = [];
            const userToModify = userLists.filter(user => user.email === optionValue)[0];
            for (const [key, value] of Object.entries(data)) {
                if (value !== userToModify[key] && value !== '') {
                    if (key === 'password') {
                        const hash = bcrypt.hashSync(value, saltRounds);
                        userDataToModify.push({
                            key,
                            value: hash
                        });
                    } else {
                        userDataToModify.push({
                            key,
                            value
                        });
                    }
                }
            }


            let sqlQuery = 'UPDATE users SET ';
            userDataToModify.forEach((data, index) => {
                if (index === userDataToModify.length - 1) {
                    sqlQuery += `${data.key} = '${data.value}'`;
                } else {
                    sqlQuery += `${data.key} = '${data.value}', `;
                }
            });
            sqlQuery += ` WHERE email = '${userToModify.email}'`;
            ipcRenderer.send('update-user', sqlQuery);

            // Reset form
            userSelector.selectedIndex = 0;
            if (document.getElementById('messageError')) {
                document.getElementById('messageError').remove();
            }
            document.getElementById('modifyUser').reset();
            setSelectedUser({
                firstname: '',
                lastname: '',
                email: 'exemple@email.com',
                role: '',
                password: '',
            });
        }
    }

    const handleHistoric = (e) => {
        if (e.target.value === 'Select One User') {
            setSelectedUserHistoric([]);
            document.getElementById('upToDate').style.visibility = 'hidden';
            return;
        } else {
            document.getElementById('upToDate').style.visibility = 'visible';
        }
        e.preventDefault();
        setSelectedUserHistoric([]);
        if (isNaN(e.target.value)) {
            setSelectedUserHistoric([]);
            return;
        } else {
            if (role === 'admin') {
                ipcRenderer.send('get-last-deliveries-by-user-id', e.target.value);
            } else if (role === 'manager') {
                ipcRenderer.send('return-not-paid-deliveries-by-user-id', e.target.value);
            }
        }
    }

    const handleShowModal = (type) => {
        setType(type);
        if (type === 'deleteUser') {
            setMessage("Do you really want to delete " + selectedUser.firstname + " account ?");
        } else if (type === 'payDelivery') {
            setMessage("Do you really want to pay this delivery ?");
        } else if (type === 'modifyUser') {
            setMessage("Do you really want to modify this user ?");
        } else if (type === 'userDeleted') {
            setMessage('User deleted with success !');
        } else if (type === 'userUpdated') {
            setMessage("User updated with success !");
        } else if (type === 'userCreated') {
            setMessage("User created with success !");
        }
    }

    const closeModal = () => {
        setMessage('');
        setType('');
        setSelectDelivery('');
        setShowModal(false);
    }

    const handleConfirmModal = () => {
        setShowModal(false);
        if (type === 'deleteUser') {
            setType('deleteUser');
            handleDeleteUser();
        } else if (type === 'payDelivery') {
            setType('payDelivery');
            handleConfirmPaid(selectDelivery)
        }

        // reset 
        setMessage('');
        setType('');
        setSelectDelivery('');

    }

    const handleConfirmPaid = (id) => {
        ipcRenderer.send('paid-delivery', id);
        setSelectedUserHistoric(selectedUserHistoric.filter(delivery => delivery.id !== id));
    }




    return (
        <section className="overflow-hidden flex justify-center items-center">
            {showModal &&
                <CustomMessageAlert
                    message={message}
                    onConfirm={handleConfirmModal}
                    onCancel={closeModal}
                    type={type} />
            }

            <div className="text-md w-full text-xs pt-10 px-4 w-full flex flex-col justify-center hview">
                <div className="flex md:flex-col md:overflow-y-auto lg:flex-row items-center -m-4 h-full w-full">
                    {/* Create User */}
                    <div className="lg:w-1/3 md:w-full pr-3 pl-3 lg:h-5/6 md:h-screen flex flex-col justify-around">
                        <div className="max-w-xs mx-auto text-center">
                            <svg className="mx-auto mb-8" width={50} height={50} viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M25 9.0712C26.527 7.34116 28.7611 6.25 31.25 6.25C35.8524 6.25 39.5833 9.98096 39.5833 14.5833C39.5833 19.1857 35.8524 22.9167 31.25 22.9167C28.7611 22.9167 26.527 21.8255 25 20.0955M31.25 43.75H6.25V41.6667C6.25 34.7631 11.8464 29.1667 18.75 29.1667C25.6536 29.1667 31.25 34.7631 31.25 41.6667V43.75ZM31.25 43.75H43.75V41.6667C43.75 34.7631 38.1536 29.1667 31.25 29.1667C28.9732 29.1667 26.8386 29.7754 25 30.8389M27.0833 14.5833C27.0833 19.1857 23.3524 22.9167 18.75 22.9167C14.1476 22.9167 10.4167 19.1857 10.4167 14.5833C10.4167 9.98096 14.1476 6.25 18.75 6.25C23.3524 6.25 27.0833 9.98096 27.0833 14.5833Z" stroke="#18181B" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            Create User
                        </div>
                        <form id='createUser' className="flex flex-col items-center bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
                            <div className="mb-4 w-1/2">
                                <label className="block text-sm font-bold mb-2" htmlFor="firstname">
                                    Firstname
                                </label>
                                <input
                                    className="shadow appearance-none border rounded w-full py-2 px-3 leading-tight focus:outline-none focus:shadow-outline"
                                    id="firstname"
                                    type="firstname"
                                    placeholder="Firstname"
                                />
                            </div>
                            <div className="mb-4 w-1/2">
                                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="lastname">
                                    Lastname
                                </label>
                                <input
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                    id="lastname"
                                    type="lastname"
                                    placeholder="Lastname"
                                />
                            </div>
                            <div className="mb-4 w-1/2">
                                <label className="block text-sm font-bold mb-2" htmlFor="email">
                                    Email
                                </label>
                                <input
                                    className="shadow appearance-none border rounded w-full py-2 px-3 leading-tight focus:outline-none focus:shadow-outline"
                                    id="email"
                                    type="email"
                                    placeholder="Email"
                                />
                            </div>
                            <div className="mb-4 w-1/2">
                                <label className="block text-sm font-bold mb-2" htmlFor="role">
                                    Role
                                </label>
                                <select
                                    className="shadow border rounded w-full py-2 px-3 leading-tight focus:outline-none focus:shadow-outline"
                                    id="role"
                                >
                                    <option>User</option>
                                    <option>ServiceProvider</option>
                                    <option>SavMember</option>
                                    {role === 'Admin' &&
                                        <option>Manager</option>
                                    }
                                    {role === 'Admin' &&
                                        <option>Admin</option>
                                    }
                                </select>
                            </div>
                            <div className="mb-4 w-1/2">
                                <label id='passwordLabel' className="block text-sm font-bold mb-2" htmlFor="password">
                                    Password
                                </label>
                                <input
                                    className="shadow appearance-none border rounded w-full py-2 px-3 mb-2 leading-tight focus:outline-none focus:shadow-outline"
                                    id="password"
                                    type="password"
                                    placeholder="******************"
                                />
                            </div>
                            <div className="mb-6 w-1/2">
                                <label className="block text-sm font-bold mb-2" htmlFor="confirmPassword">
                                    Confirm Password
                                </label>
                                <input
                                    className="shadow appearance-none border rounded w-full py-2 px-3 mb-1 leading-tight focus:outline-none focus:shadow-outline"
                                    id="confirmPassword"
                                    type="password"
                                    placeholder="******************"
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <button
                                    className="bg-orange hover:bg-orange-100 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                                    type="button"
                                    onClick={handleCreateUser}
                                >
                                    Create User
                                </button>
                            </div>
                        </form>
                    </div>
                    {/* Modify User */}
                    <div className="lg:w-1/3 md:w-full pr-3 pl-3 lg:h-5/6 md:h-screen flex flex-col justify-around">
                        <div className="max-w-xs mx-auto text-center ">
                            <svg className="mx-auto mb-8" width={50} height={50} viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M8.33301 12.5C8.33301 10.1988 10.1985 8.33334 12.4997 8.33334H16.6663C18.9675 8.33334 20.833 10.1988 20.833 12.5V16.6667C20.833 18.9679 18.9675 20.8333 16.6663 20.8333H12.4997C10.1985 20.8333 8.33301 18.9679 8.33301 16.6667V12.5Z" stroke="#18181B" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M29.1663 12.5C29.1663 10.1988 31.0318 8.33334 33.333 8.33334H37.4997C39.8009 8.33334 41.6663 10.1988 41.6663 12.5V16.6667C41.6663 18.9679 39.8009 20.8333 37.4997 20.8333H33.333C31.0318 20.8333 29.1663 18.9679 29.1663 16.6667V12.5Z" stroke="#18181B" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M8.33301 33.3333C8.33301 31.0322 10.1985 29.1667 12.4997 29.1667H16.6663C18.9675 29.1667 20.833 31.0322 20.833 33.3333V37.5C20.833 39.8012 18.9675 41.6667 16.6663 41.6667H12.4997C10.1985 41.6667 8.33301 39.8012 8.33301 37.5V33.3333Z" stroke="#18181B" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M29.1663 33.3333C29.1663 31.0322 31.0318 29.1667 33.333 29.1667H37.4997C39.8009 29.1667 41.6663 31.0322 41.6663 33.3333V37.5C41.6663 39.8012 39.8009 41.6667 37.4997 41.6667H33.333C31.0318 41.6667 29.1663 39.8012 29.1663 37.5V33.3333Z" stroke="#18181B" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            Modify User
                        </div>
                        {/* Form to modify user*/}
                        <form id='modifyUser' className="flex flex-col items-center bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
                            {/* Selector from userLists  */}
                            <div className="mb-4 w-1/2">
                                <label className="block text-sm font-bold mb-2" htmlFor="usernameModify">
                                    Select One User
                                </label>
                                <select
                                    className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                    id="usernameModify"
                                    type="text"
                                    onChange={handleSelectUser}
                                >
                                    <option id="selectModifyUser">Select One User</option>
                                    {userLists.firstname !== '' && userLists.map((user) => (
                                        <option key={user.id} value={user.email}>{user.firstname} {user.lastname}</option>
                                    ))}

                                </select>
                            </div>
                            {/* New Email */}
                            <div className="mb-4 w-1/2">
                                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="newEmail">
                                    New Email
                                </label>
                                <input
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                    id="newEmail"
                                    type="text"
                                    defaultValue={selectedUser.email}
                                />
                            </div>
                            {/* New Password */}
                            <div className="mb-4 w-1/2">
                                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="newPassword">
                                    New Password
                                </label>
                                <input
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                    id="newPassword"
                                    type="password"
                                    placeholder="New Password"
                                />
                            </div>
                            {/* confirm new password */}
                            <div className="mb-4 w-1/2">
                                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="confirmNewPassword">
                                    Confirm New Password
                                </label>
                                <input
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                    id="confirmNewPassword"
                                    type="password"
                                    placeholder="Confirm New Password"
                                />
                            </div>
                            {/* New Role */}
                            <div className="mb-4 w-1/2">
                                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="newRole">
                                    New Role
                                </label>
                                <select
                                    className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                    id="newRole"
                                    type="text"
                                >
                                    <option>User</option>
                                    <option>Admin</option>
                                    <option>Manager</option>
                                    <option>ServiceProvider</option>
                                    <option>SavMember</option>
                                </select>
                            </div>
                            {/* Status */}
                            <div className="mb-9 w-1/2">
                                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="newStatus">
                                    New Status
                                </label>
                                <select
                                    className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                    id="newStatus"
                                    type="text"
                                >
                                    {selectedUser.status === '' && <option></option>}
                                    <option>Active</option>
                                    <option>Inactive</option>
                                </select>
                            </div>
                            {/* Submit */}
                            <div className="flex items-center justify-between">
                                <button
                                    className="bg-orange hover:bg-orange-100 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                                    type="button"
                                    onClick={handleModifyUser}
                                >
                                    Modify User
                                </button>
                                {/* delete User */}
                                <button
                                    className="ml-3 bg-red hover:bg-red text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                                    type="button"
                                    onClick={() => {
                                        handleShowModal('deleteUser')
                                    }
                                    }
                                >
                                    Delete User
                                </button>

                            </div>
                        </form>
                    </div>
                    {/* Check User Historical */}
                    <div className="lg:w-1/3 md:w-full pr-3 pl-3 lg:h-5/6 md:h-screen flex flex-col justify-around">
                        <div className="mx-auto text-center h-2/6 w-full">
                            <svg className="mx-auto mb-8" width={50} height={50} viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M8.33301 10.4167C8.33301 9.26608 9.26575 8.33334 10.4163 8.33334H39.583C40.7336 8.33334 41.6663 9.26608 41.6663 10.4167V14.5833C41.6663 15.7339 40.7336 16.6667 39.583 16.6667H10.4163C9.26575 16.6667 8.33301 15.7339 8.33301 14.5833V10.4167Z" stroke="#18181B" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M8.33301 27.0833C8.33301 25.9327 9.26575 25 10.4163 25H22.9163C24.0669 25 24.9997 25.9327 24.9997 27.0833V39.5833C24.9997 40.7339 24.0669 41.6667 22.9163 41.6667H10.4163C9.26575 41.6667 8.33301 40.7339 8.33301 39.5833V27.0833Z" stroke="#18181B" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M33.333 27.0833C33.333 25.9327 34.2657 25 35.4163 25H39.583C40.7336 25 41.6663 25.9327 41.6663 27.0833V39.5833C41.6663 40.7339 40.7336 41.6667 39.583 41.6667H35.4163C34.2657 41.6667 33.333 40.7339 33.333 39.5833V27.0833Z" stroke="#18181B" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
                            </svg>

                            <div className="flex flex-col items-center bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
                                <div className="mb-8 w-1/2">
                                    {role === 'manager' && <label className="block text-sm font-bold mb-2" htmlFor="historic">
                                        Pay delivery
                                    </label>
                                    }
                                    {role === 'admin' && <label className="block text-sm font-bold mb-2" htmlFor="historic">
                                        Check User Historical
                                    </label>
                                    }

                                    <select
                                        className="mb-10 shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                        id="historic"
                                        type="text"
                                        defaultValue="Select One User"
                                        required
                                        onChange={handleHistoric}
                                    >
                                        <option key="default" value="">Select One User</option>
                                        {userLists.firstname !== '' && userLists.map((user) => (
                                            <option key={user.id} value={user.id}>
                                                {user.firstname} {user.lastname}
                                            </option>
                                        ))}

                                    </select>
                                    <div id='upToDate'>
                                        {role === 'manager' && selectedUserHistoric.length === 0 && <p className='text-center pt-5'>Everything up to Date</p>}
                                        {role === 'admin' && selectedUserHistoric.length === 0 && <p className='text-center pt-5'>No Recent Actions</p>}
                                    </div>
                                </div>

                            </div>
                        </div>
                        <div className='overflow-y-auto lg:h-4/6 md:h-1/12 mt-10'>
                            <div>

                                {role === 'admin' && selectedUserHistoric.length > 0 && selectedUserHistoric.map((historic) => (
                                    <div key={historic.id} className="flex flex-col items-start bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
                                        <p> Wind Farm Name : {historic.wind_farm}</p>
                                        <p> Wind Turbine : {historic.wind_turbine}</p>
                                        <p> Validation : {historic.validation === 1 ? 'Done' : 'Todo'}</p>
                                        <p> Assembly : {historic.assembly === 1 ? 'Done' : 'Todo'}</p>
                                    </div>
                                ))}
                                {role === 'manager' && selectedUserHistoric.length > 0 && selectedUserHistoric.map((historic) => (
                                    <div key={historic.id} className='h-1/3'>
                                        {historic.paid === 0 ? <div className='flex flex-col text-base items-center text-justify bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4'>
                                            <p> Wind Farm Name : {historic.wind_farm}</p>
                                            <p> Wind Turbine : {historic.wind_turbine}</p>
                                            <p> Validation : {historic.validation === 1 ? 'Done' : 'Todo'}</p>
                                            <p> Assembly : {historic.assembly === 1 ? 'Done' : 'Todo'}</p>
                                            <p> Paid : {historic.paid === 1 ? 'Paid' : 'Not Paid'}</p>
                                            <button onClick={() => {
                                                setSelectDelivery(historic.id)
                                            }
                                            } className="mt-4 text-lg font-bold w-1/2 px-4 py-2 tracking-wide text-white transition-colors duration-200 transform bg-orange rounded-md focus:outline-none">
                                                Pay
                                            </button>
                                        </div> : null}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div >
        </section >
    )
}

export default AdminPanel;
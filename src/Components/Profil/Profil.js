import { useEffect, useState } from "react";

const { ipcRenderer } = window.require("electron");
import { useSelector, useDispatch } from 'react-redux'

function Profil() {
    const dispatch = useDispatch();
    const role = useSelector((state) => state.role.value);

    const usersId = localStorage.getItem("userId");
    const [thisUser, setThisUser] = useState({});

    useEffect(() => {
        ipcRenderer.send("get-users");
    }, []);

    if (!ipcRenderer.listenerCount("find-users")) {
        ipcRenderer.on("find-users", (event, users) => {
            const findThisUser = users.find((user) => user.id === parseInt(usersId));
            setThisUser(findThisUser);
        });
    }

    return (
        <div className="mt-10 profil flex flex-row justify-around h95">

            <h1 className="text-xl font-bold">Utilisateur : {thisUser.firstname}</h1>
            <h2 className="text-xl font-bold">Email : {thisUser.email}</h2>
            <h2 className="text-xl font-bold">Role : {role}</h2>
            <h2 className="text-xl font-bold">Status : {thisUser.status}</h2>
        </div >
    );
}


export default Profil;
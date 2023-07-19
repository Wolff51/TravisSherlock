import "./App.css";
import Upload from "../Upload/Upload";
import Nav from "../Nav/Nav";
import Dashboard from "../Dashboard/Dashboard";
import Login from "../Login/Login";
import MissionSheetForm from "../MissionSheetForm/MissionSheetForm";
import Profil from "../Profil/Profil";
import Validation from "../Validation/Validation";
import SmallNav from "../SmallNav/SmallNav";
import AdminPanel from "../AdminPanel/AdminPanel";
import FastProcess from "../FastProcess/FastProcess";
import React from "react";
import { useIdleTimer } from 'react-idle-timer'
import { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useLocation } from 'react-router-dom';
const isDev = window.require("electron-is-dev");
const path = window.require("path");
const jwt = window.require('jsonwebtoken');
const { ipcRenderer } = window.require("electron");

const fs = window.require('fs');

import { useSelector, useDispatch } from 'react-redux'
import { changeAuthForFalse, changeAuthForTrue } from "../../features/auth/auth";
import { changeForAdmin, changeForManager, changeForSavMember, changeForServiceProvider, changeForUser } from "../../features/role/role";

function App() {
  const isAuth = useSelector((state) => state.isAuth.value);
  const dispatch = useDispatch();


  const handleOnIdle = event => {
    if (localStorage.getItem("lastActiveTime")) return;
    const timeString = new Date(getLastActiveTime()).toLocaleTimeString()
    localStorage.clear();
    localStorage.setItem("lastActiveTime", timeString);
    dispatch(changeAuthForFalse());
    navigate('/');
  }

  const { getLastActiveTime } = useIdleTimer({
    timeout: 14400000,
    onIdle: handleOnIdle,
    debounce: 500
  })

  const navigate = useNavigate();

  let actualPath = "";

  if (isDev) {
    actualPath = path.basename(window.location.pathname);
  } else {
    actualPath = useLocation().pathname;
  }

  if (isAuth && !localStorage.getItem("firstLaunch") && actualPath !== "Validate" && actualPath !== "missionsheetform" && actualPath !== "fastprocess") {
    ipcRenderer.send("resize", "setToMaxSize");
    localStorage.setItem("firstLaunch", true);
  }


  useEffect(() => {
    const token = localStorage.getItem("token");

    if (token) {
      jwt.verify(token, 'bjavbzmvkabvjpekzabnvjlmzevnjpzkabvnùapzkdbvmzav', (err, decode) => {
        if (err) {
          console.log(err);
          localStorage.clear();
          dispatch(changeAuthForFalse());
          ipcRenderer.send("resize", "setToMinSize");
          navigate('/')
        } else if (decode.isAuthenticated) {
          if (decode.role === "admin") {
            dispatch(changeForAdmin());
          } else if (decode.role === "manager") {
            dispatch(changeForManager());
          } else if (decode.role === "savMember") {
            dispatch(changeForSavMember());
          } else if (decode.role === "serviceProvider") {
            dispatch(changeForServiceProvider());
          } else if (decode.role === "user") {
            dispatch(changeForUser());
          }
          dispatch(changeAuthForTrue());
        } else {
          localStorage.clear();
          dispatch(changeAuthForFalse());
          navigate('/')
        }
      });
    }
  }, []);


  useEffect(() => {
    const interval = setInterval(() => {
      const token = localStorage.getItem("token");
      if (token) {
        jwt.verify(token, 'bjavbzmvkabvjpekzabnvjlmzevnjpzkabvnùapzkdbvmzav', (err, decode) => {
          if (err) {
            console.log(err);
            localStorage.clear();
            dispatch(changeAuthForFalse());
            ipcRenderer.send("resize", "setToMinSize");
            navigate('/')
          } else if (decode.isAuthenticated) {
            const currentTime = Date.now() / 1000;
            const timeUntilRefresh = 60 * 20;
            if (decode.exp - currentTime <= timeUntilRefresh) {
              // TO DO FOR SECURE : VERIFY IF USER ACCOUNT IS STILL ACTIVE
              const newToken = jwt.sign({
                user: decode.user,
                email: decode.email,
                isAuthenticated: true
              }, 'bjavbzmvkabvjpekzabnvjlmzevnjpzkabvnùapzkdbvmzav', {
                expiresIn: '4h'
              });
              localStorage.setItem("token", newToken);
              dispatch(changeAuthForTrue());
            } else if (!decode.isAuthenticated) {
              localStorage.clear();
              dispatch(changeAuthForFalse());
              navigate('/')
            } else if (decode.exp < Date.now() / 1000) {
              localStorage.clear();
              dispatch(changeAuthForFalse());
              ipcRenderer.send("resize", "setToMinSize");
              navigate('/')
            }
          }
        });
      }
    }, 900000);
    return () => clearInterval(interval);
  }, []);


  if (actualPath === "Validate") {
    return (
      <div className="App">
        <Validation />
      </div>
    );
  } else if (actualPath === "missionsheetform") {
    return (
      <div className="App">
        <MissionSheetForm />
      </div>
    );
  }
  else {
    if (isAuth) {
      return (
        <div className="App">
          <Nav />
          <Routes>
            <Route path="/" element={<Upload />} />
            <Route path="/adminPanel" element={<AdminPanel />} />
            <Route path="/Validate" element={<Validation />} />
            <Route path="/profil" element={<Profil />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/fastprocess" element={<FastProcess />} />
          </Routes>
        </div>
      );
    }
    else {
      return (
        <div className="App">
          <SmallNav />
          <Login />
        </div>
      );
    }
  }


}

export default App;

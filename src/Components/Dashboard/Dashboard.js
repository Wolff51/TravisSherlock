import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from 'react-redux'
import { resetDirectoryPath, setDirectoryPath } from "../../features/directoryPath/directoryPath";
import Loader from "../Loader/Loader";
import ProgressRadial from "../ProgressBar/ProgressBar";
const MissionSheetReader = require("../../utils/MissionSheetReader").default;
const fs = window.require("fs");
const { ipcRenderer } = window.require("electron");



function Dashboard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const directoryPath = localStorage.getItem("directoryPath");
  const missionSheet = new MissionSheetReader(directoryPath);

  const windTurbines = missionSheet.getWindTurbines()


  /*
    const [directoryIsSet, setDirectoryIsSet] = useState(useSelector(state => state.directoryPath.value));
  */
  const typeDirectory = useState(useSelector(state => state.directoryPath.type));

  useEffect(() => {
    /*
    if (directoryIsSet === null) {
      localStorage.removeItem("directoryPath");
      dispatch(resetDirectoryPath());
      localStorage.removeItem("missionSheet");
      navigate("/");
      console.log("Directory path doesn't exist");
      return
    }
    */
    if (typeDirectory === "Nordex") {
      navigate("/fastprocess");
      return
    }
    ipcRenderer.send("setChangeWFButtonTrue")
    // setMissionSheet(new MissionSheetReader(localStorage.getItem("directoryPath")));
    handleReadSideStateJson();
    return () => {
      ipcRenderer.removeAllListeners("update-dashboard");
    }
  }, []);


  // if ipc does not exist, create it
  if (ipcRenderer.listenerCount('update-dashboard') === 0) {
    ipcRenderer.on('update-dashboard', (event, arg) => {
      handleReadSideStateJson();
      if (arg === undefined) {
        handleReadSideStateJson();
        setTimeout(() => {
          handleUpdloadDashboardChangeWindTurbine(document.getElementById('selectedWindTurbine').value);
        }, 50);
      }
      if (arg === null || arg === undefined) return;
      handleReadSideStateJson();
      setTimeout(() => {
        document.getElementById('selectedWindTurbine').value = arg;
      }, 50);
      handleUpdloadDashboardChangeWindTurbine(arg);
    })
  }





  // const missionSheet = new MissionSheetReader(directoryPath);


  const [pathError, setPathError] = useState(false);

  const [AdvancementPercent, setAdvancementPercent] = useState([]);
  // important pour afficher la WTG 1 par défaut
  const [selectedTurbine, setSelectedTurbine] = useState("none");
  // utile pour le select
  // const windTurbines = missionSheet.getWindTurbines();
  // state sur les données du WTG pour re render la page quand on change de WTG
  const [WTG_data, setWTG_data] = useState("none");

  const [sideStateChecker, setSideStateChecker] = useState([]);



  useEffect(() => {
    if (loading) return;
    if (pathError) return;
  }, [loading]);

  useEffect(() => {
    if (selectedTurbine === "none") return;
    const data = missionSheet.getWindTurbineComponents(selectedTurbine);
    // TO DO , Améliorer le tri
    data.sort((a, b) => {
      if (a.name === "Tower") return 1;
      if (b.name === "Tower") return -1;
      return a.name > b.name ? 1 : -1;
    });
    // END TO DO 
    setWTG_data(data);
  }, [selectedTurbine]);

  useEffect(() => {
    if (WTG_data === "none") return;
    const data = WTG_data.slice(0, 4).map(({ inspected }) => inspected);
    const classes = ["b1IsInspected", "b2IsInspected", "b3IsInspected", "towerIsInspected"];
    classes.forEach((className, i) => {
      const elements = document.getElementsByClassName(className);
      const inspected = data[i];
      const method = inspected ? 'remove' : 'add';

      for (let i = 0; i < elements.length; i++) {
        elements[i].classList[method]("opacity-25");
      }
    });
    const allowScroll = document.getElementById("dashboard__body");
    allowScroll.addEventListener("wheel", (event) => {
      allowScroll.scrollLeft += event.deltaY;
    }, { passive: true });

  }, [WTG_data]);


  const handleReadSideStateJson = () => {
    const sideStateCheckerJsonPath = `${directoryPath}/.workflow_cache.json`;
    fs.readFile(sideStateCheckerJsonPath, "utf8", (err, data) => {
      if (err) {
        console.log("Error reading file from disk:", err);
        return;
      }
      try {
        const sideStateCheckerJson = JSON.parse(data);
        let allSideStateCheckerJsonAreGreaterThanOne = true;
        for (const key1 in sideStateCheckerJson) {
          for (const key2 in sideStateCheckerJson[key1]) {
            for (const key3 in sideStateCheckerJson[key1][key2]) {
              for (const key4 in sideStateCheckerJson[key1][key2][key3]) {
                if (sideStateCheckerJson[key1][key2][key3][key4] < 1 && sideStateCheckerJson[key1][key2][key3][key4] !== null) {
                  allSideStateCheckerJsonAreGreaterThanOne = false;
                }
              }
            }
          }
        }
        if (sideStateCheckerJson.error) {
          setPathError(sideStateCheckerJson.error);
          setLoading(false);
          return;
        }
        let numberOfComponent = 0;
        let Advancement = [0, 0, 0, 0, 0, 0]
        for (const key1 in sideStateCheckerJson) {
          for (const key2 in sideStateCheckerJson[key1]) {
            for (const key3 in sideStateCheckerJson[key1][key2]) {
              for (const key4 in sideStateCheckerJson[key1][key2][key3]) {
                if (sideStateCheckerJson[key1][key2][key3][key4] !== null) {
                  numberOfComponent += 1;
                  for (let i = 0; i < sideStateCheckerJson[key1][key2][key3][key4]; i++) {
                    Advancement[i] += 1;
                  }
                } else {
                  sideStateCheckerJson[key1][key2][key3][key4] = 0;
                }
              }
            }
          }
        }
        const firstKeySideStateCheckerJson = Object.keys(sideStateCheckerJson)[0];
        for (let i = 0; i < Advancement.length; i++) {
          Advancement[i] = Math.round((Advancement[i] / numberOfComponent) * 100);
        }


        // UPLOAD MISSION SHEET PROGRESSION
        let advancementStat = 0;
        if (Advancement[0] === 100 && Advancement[1] === 100 && Advancement[2] === 100 && Advancement[3] === 100 && Advancement[4] === 100 && Advancement[5] === 100) {
          advancementStat = 6;
        } else if (Advancement[0] === 100 && Advancement[1] === 100 && Advancement[2] === 100 && Advancement[3] === 100 && Advancement[4] === 100) {
          advancementStat = 5;
        } else if (Advancement[0] === 100 && Advancement[1] === 100 && Advancement[2] === 100 && Advancement[3] === 100) {
          advancementStat = 4;
        } else if (Advancement[0] === 100 && Advancement[1] === 100 && Advancement[2] === 100) {
          advancementStat = 3;
        } else if (Advancement[0] === 100 && Advancement[1] === 100) {
          advancementStat = 2;
        } else if (Advancement[0] === 100) {
          advancementStat = 1;
        } else {
          advancementStat = 0;
        }

        // 
        const missionSheetPath = `${directoryPath}\\mission_sheet.json`;
        fs.readFile(missionSheetPath, "utf8", (err, data) => {
          if (err) {
            console.log("Error reading file from disk:", err);
            return;
          }
          const newData = JSON.parse(data);
          if (newData.progression.step === advancementStat) {
            return;
          } else if (newData.progression.step > advancementStat) {
            return;
          } else {
            newData.progression.step = advancementStat;
            newData.progression.date = new Date();
            fs.writeFileSync(missionSheetPath, JSON.stringify(newData));
          }
        })
        setSelectedTurbine(firstKeySideStateCheckerJson);
        setAdvancementPercent(Advancement);
        setSideStateChecker(sideStateCheckerJson);
        setLoading(false);

        if (allSideStateCheckerJsonAreGreaterThanOne === true) {
          console.log("Sort is Done");
        }
        else {
          console.log("Sort is not done yet");
          return;
        }
      } catch (err) {
        console.log("Error parsing JSON string:", err);
      }


    });
  }

  const returnToUploadError = () => {
    localStorage.removeItem("directoryPath");
    dispatch(resetDirectoryPath());
    localStorage.removeItem("missionSheet");
    const sideStateCheckerJsonPath = `${directoryPath}/.workflow_cache.json`;
    fs.unlink(sideStateCheckerJsonPath, (err) => {
      if (err) {
        console.error(err)
        return
      }
    })
    navigate("/")
  }

  const handleUpdloadDashboardChangeWindTurbine = (arg) => {
    if (arg === undefined || arg === null) return;

    setSelectedTurbine(arg);
    const data = missionSheet.getWindTurbineComponents(arg);
    data.sort((a, b) => {
      if (a.name === "Tower") return 1;
      if (b.name === "Tower") return -1;
      return a.name > b.name ? 1 : -1;
    });
    setWTG_data(data);

  }

  const handleChangeWindTurbine = (event) => {
    if (event === undefined || event === null) return;
    setSelectedTurbine(event.target.value);
    const data = missionSheet.getWindTurbineComponents(event.target.value);
    data.sort((a, b) => {
      if (a.name === "Tower") return 1;
      if (b.name === "Tower") return -1;
      return a.name > b.name ? 1 : -1;
    });
    setWTG_data(data);
  };

  if (pathError) {
    return (
      <div className="dashboard flex flex-col items-center justify-center hview">
        <div className="text-3xl mb-10"> Error With the Path, please verify your directory name : </div>
        <div className="text-4xl mb-10">
          {pathError}
        </div>
        <button onClick={returnToUploadError} className="mt-10 text-lg font-bold w-1/3 px-4 py-2 tracking-wide text-white transition-colors duration-200 transform bg-orange rounded-md focus:outline-none">
          Go Back To Home Page
        </button>
      </div>
    )
  }

  if (loading || WTG_data === "none") {
    return (
      <div className="dashboard flex flex-col items-center hview">
        <Loader />
      </div>
    )
  }

  if (missionSheet !== null) {
    return (
      <div className="dashboard flex flex-col items-center hview">
        {/* Header details */}
        <div className="m-5 dashboard__header w-98 flex flex-row justify-around lg:h-16 md:h-10 items-center bg-gray-100 rounded-xl">
          {/* Parc Name */}
          <div className="scale-75 text-xl lg:text-lg flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>

            <span className="pl-2"> {missionSheet.getWindFarmName()}</span>
          </div>
          {/* Inspecty by */}
          <div className="scale-75 text-xl lg:text-lg flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
              />
            </svg>
            <span className="pl-2"> {missionSheet.getPilotName()} </span>
          </div>
          {/* Date */}
          <div className="scale-75 text-xl lg:text-lg flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z"
              />
            </svg>
            <span className="pl-2"> {missionSheet.getInspectionDate()} </span>
          </div>
          {/* Mission Type */}
          <div className="scale-75 text-xl lg:text-lg flex items-center">
            <img src="./images/svg/drone.svg" className="w-7 h-7"></img>
            <span className="pl-2"> {missionSheet.getMissionType()} </span>
          </div>
          {/* Flight Type */}
          <div className="scale-75 text-xl lg:text-lg flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"
              />
            </svg>
            <span className="pl-2"> {missionSheet.getFlightType()} </span>
          </div>
          {/* WTG List */}
          <div className="scale-75 text-xl lg:text-lg flex items-center">
            <img src="./images/wind-power.png" alt="wtg" className="w-7 h-7" />

            {/*  Create a select for every windturbine and the name */}
            <select
              id="selectedWindTurbine"
              className="bg-gray-100"
              onChange={handleChangeWindTurbine}
            >
              {windTurbines.map((windTurbine) => (
                <option key={windTurbine} value={windTurbine} className="lg:text-md md:text-sm">
                  {windTurbine}
                </option>
              ))}
            </select>
          </div>
        </div>
        {/* Main DashBoard */}
        <div id="dashboard__body" className="m-5 dashboard__body w-98 flex-grow flex flex-nowrap h-4/6 lg:overflow-x-hidden md:overflow-x-auto">
          {/* Blade 1 */}
          <div className="b1IsInspected bg-gray-100 rounded-xl mr-2 ifBladesInspected lg:w-1/4 md:w-1/2 h-full flex lg:shrink md:shrink-0 flex-col items-center justify-around ">
            {/* Blade Name */}
            <div className="blade_name h-1/6 w-full font-bold text-xl pt-4 items-center">
              {WTG_data[0].name}
            </div>
            {/* Turbine image */}
            {/* If <img src={"./images/side_states_svg/step" + sideStateChecker[selectedTurbine][WTG_data[0].name]["LE"]["State"] + "/" + "LE" + "_" + sideStateChecker[selectedTurbine][WTG_data[0].name]["WTG"]  then change render*/}
            <div className="blades_sides_images h-3/6 w-full flex flex-row">
              <img src={"./images/side_states_svg/step" + sideStateChecker[selectedTurbine][WTG_data[0].name]["LE"]["State"] + "/" + "LE" + "_" + sideStateChecker[selectedTurbine][WTG_data[0].name]["LE"]["State"] + ".svg"} alt="none" className="h-full w-1/4" />
              <img src={"./images/side_states_svg/step" + sideStateChecker[selectedTurbine][WTG_data[0].name]["PS"]["State"] + "/" + "PS" + "_" + sideStateChecker[selectedTurbine][WTG_data[0].name]["PS"]["State"] + ".svg"} alt="none" className="h-full w-1/4" />
              <img src={"./images/side_states_svg/step" + sideStateChecker[selectedTurbine][WTG_data[0].name]["SS"]["State"] + "/" + "SS" + "_" + sideStateChecker[selectedTurbine][WTG_data[0].name]["SS"]["State"] + ".svg"} alt="none" className="h-full w-1/4" />
              <img src={"./images/side_states_svg/step" + sideStateChecker[selectedTurbine][WTG_data[0].name]["TE"]["State"] + "/" + "TE" + "_" + sideStateChecker[selectedTurbine][WTG_data[0].name]["TE"]["State"] + ".svg"} alt="none" className="h-full w-1/4" />
              {/* <SideStateChecker WTG_NAME={selectedTurbine} COMPONENT_TYPE_NAME={WTG_data[0].name} SIDE={"LE"} TYPE={"img"} />
            <SideStateChecker WTG_NAME={selectedTurbine} COMPONENT_TYPE_NAME={WTG_data[0].name} SIDE={"PS"} TYPE={"img"} />
            <SideStateChecker WTG_NAME={selectedTurbine} COMPONENT_TYPE_NAME={WTG_data[0].name} SIDE={"SS"} TYPE={"img"} />
            <SideStateChecker WTG_NAME={selectedTurbine} COMPONENT_TYPE_NAME={WTG_data[0].name} SIDE={"TE"} TYPE={"img"} /> */}
            </div>
            {/* Side */}
            <div className="blades_sides h-1/6 w-full flex flex-row items-center">
              <div className="blade_side w-1/4">LE</div>
              <div className="blade_side w-1/4">PS</div>
              <div className="blade_side w-1/4">SS</div>
              <div className="blade_side w-1/4">TE</div>
            </div>
            {/* State */}
            {/*  WTG_NAME, COMPONENT_TYPE_NAME, SIDE */}
            <div className="blades_states h-1/6 w-full flex flex-row items-center">
              <div className="blade_state w-1/4">
                {sideStateChecker[selectedTurbine][WTG_data[0].name]["LE"]["State"]}
              </div>
              <div className="blade_state w-1/4">
                {sideStateChecker[selectedTurbine][WTG_data[0].name]["PS"]["State"]}
              </div>
              <div className="blade_state w-1/4">
                {sideStateChecker[selectedTurbine][WTG_data[0].name]["SS"]["State"]}
              </div>
              <div className="blade_state w-1/4">
                {sideStateChecker[selectedTurbine][WTG_data[0].name]["TE"]["State"]}
              </div>
              {/* <SideStateChecker WTG_NAME={selectedTurbine} COMPONENT_TYPE_NAME={WTG_data[0].name} SIDE={"LE"} TYPE={"number"} />
            <SideStateChecker WTG_NAME={selectedTurbine} COMPONENT_TYPE_NAME={WTG_data[0].name} SIDE={"PS"} TYPE={"number"} />
            <SideStateChecker WTG_NAME={selectedTurbine} COMPONENT_TYPE_NAME={WTG_data[0].name} SIDE={"SS"} TYPE={"number"} />
            <SideStateChecker WTG_NAME={selectedTurbine} COMPONENT_TYPE_NAME={WTG_data[0].name} SIDE={"TE"} TYPE={"number"} /> */}
            </div>
          </div>
          {/* Blade 2 */}
          <div className="b2IsInspected bg-gray-100 rounded-xl mr-2 ifBladesInspected lg:w-1/4 md:w-1/2 h-full flex lg:shrink md:shrink-0 flex-col items-center justify-around ">
            {/* Blade Name */}
            <div className="blade_name pt-4 h-1/6 w-full font-bold text-xl items-center"> {WTG_data[1].name} </div>
            {/* Turbine image */}
            <div className="blades_sides_images h-3/6 w-full flex flex-row">
              <img src={"./images/side_states_svg/step" + sideStateChecker[selectedTurbine][WTG_data[1].name]["LE"]["State"] + "/" + "LE" + "_" + sideStateChecker[selectedTurbine][WTG_data[1].name]["LE"]["State"] + ".svg"} alt="none" className="h-full w-1/4" />
              <img src={"./images/side_states_svg/step" + sideStateChecker[selectedTurbine][WTG_data[1].name]["PS"]["State"] + "/" + "PS" + "_" + sideStateChecker[selectedTurbine][WTG_data[1].name]["PS"]["State"] + ".svg"} alt="none" className="h-full w-1/4" />
              <img src={"./images/side_states_svg/step" + sideStateChecker[selectedTurbine][WTG_data[1].name]["SS"]["State"] + "/" + "SS" + "_" + sideStateChecker[selectedTurbine][WTG_data[1].name]["SS"]["State"] + ".svg"} alt="none" className="h-full w-1/4" />
              <img src={"./images/side_states_svg/step" + sideStateChecker[selectedTurbine][WTG_data[1].name]["TE"]["State"] + "/" + "TE" + "_" + sideStateChecker[selectedTurbine][WTG_data[1].name]["TE"]["State"] + ".svg"} alt="none" className="h-full w-1/4" />
            </div>
            {/* Side */}
            <div className="blades_sides h-1/6 w-full flex flex-row items-center">
              <div className="blade_side w-1/4">LE</div>
              <div className="blade_side w-1/4">PS</div>
              <div className="blade_side w-1/4">SS</div>
              <div className="blade_side w-1/4">TE</div>
            </div>
            {/* State */}
            <div className="blades_states h-1/6 w-full flex flex-row items-center">
              <div className="blade_state w-1/4">
                {sideStateChecker[selectedTurbine][WTG_data[1].name]["LE"]["State"]}
              </div>
              <div className="blade_state w-1/4">
                {sideStateChecker[selectedTurbine][WTG_data[1].name]["PS"]["State"]}
              </div>
              <div className="blade_state w-1/4">
                {sideStateChecker[selectedTurbine][WTG_data[1].name]["SS"]["State"]}
              </div>
              <div className="blade_state w-1/4">
                {sideStateChecker[selectedTurbine][WTG_data[1].name]["TE"]["State"]}
              </div>
            </div>
          </div>
          {/* Blade 3 */}
          <div className="b3IsInspected bg-gray-100 rounded-xl mr-2 ifBladesInspected lg:w-1/4 md:w-1/2 h-full flex lg:shrink md:shrink-0 flex-col items-center justify-around ">
            {/* Blade Name */}
            <div className="blade_name pt-4 h-1/6 w-full font-bold text-xl items-center"> {WTG_data[2].name} </div>
            {/* Turbine image */}
            <div className="blades_sides_images h-3/6 w-full flex flex-row">
              <img src={"./images/side_states_svg/step" + sideStateChecker[selectedTurbine][WTG_data[2].name]["LE"]["State"] + "/" + "LE" + "_" + sideStateChecker[selectedTurbine][WTG_data[2].name]["LE"]["State"] + ".svg"} alt="none" className="h-full w-1/4" />
              <img src={"./images/side_states_svg/step" + sideStateChecker[selectedTurbine][WTG_data[2].name]["PS"]["State"] + "/" + "PS" + "_" + sideStateChecker[selectedTurbine][WTG_data[2].name]["PS"]["State"] + ".svg"} alt="none" className="h-full w-1/4" />
              <img src={"./images/side_states_svg/step" + sideStateChecker[selectedTurbine][WTG_data[2].name]["SS"]["State"] + "/" + "SS" + "_" + sideStateChecker[selectedTurbine][WTG_data[2].name]["SS"]["State"] + ".svg"} alt="none" className="h-full w-1/4" />
              <img src={"./images/side_states_svg/step" + sideStateChecker[selectedTurbine][WTG_data[2].name]["TE"]["State"] + "/" + "TE" + "_" + sideStateChecker[selectedTurbine][WTG_data[2].name]["TE"]["State"] + ".svg"} alt="none" className="h-full w-1/4" />
            </div>
            {/* Side */}
            <div className="blades_sides h-1/6 w-full flex flex-row items-center">
              <div className="blade_side w-1/4">LE</div>
              <div className="blade_side w-1/4">PS</div>
              <div className="blade_side w-1/4">SS</div>
              <div className="blade_side w-1/4">TE</div>
            </div>
            {/* State */}
            <div className="blades_states h-1/6 w-full flex flex-row items-center">
              <div className="blade_state w-1/4">
                {sideStateChecker[selectedTurbine][WTG_data[2].name]["LE"]["State"]}
              </div>
              <div className="blade_state w-1/4">
                {sideStateChecker[selectedTurbine][WTG_data[2].name]["PS"]["State"]}
              </div>
              <div className="blade_state w-1/4">
                {sideStateChecker[selectedTurbine][WTG_data[2].name]["SS"]["State"]}
              </div>
              <div className="blade_state w-1/4">
                {sideStateChecker[selectedTurbine][WTG_data[2].name]["TE"]["State"]}
              </div>
            </div>
          </div>
          {/* Tower */}
          <div className="towerIsInspected bg-gray-100 rounded-xl ifTowerInspected lg:w-1/4 md:w-1/2 h-full flex lg:shrink md:shrink-0 flex-col items-center justify-around ">
            {/* Blade Name */}
            <div className="tower_name pt-4 h-1/6 w-full font-bold text-xl items-center"> {WTG_data[3].name} </div>
            {/* Turbine image */}
            <div className="tower_sides_images h-3/6 w-full flex flex-row">
              <img src={"./images/side_states_svg/step" + sideStateChecker[selectedTurbine][WTG_data[3].name]["N"]["State"] + "/" + "T" + "_" + sideStateChecker[selectedTurbine][WTG_data[3].name]["N"]["State"] + ".svg"} alt="none" className="h-full w-1/4" />
              <img src={"./images/side_states_svg/step" + sideStateChecker[selectedTurbine][WTG_data[3].name]["ENE"]["State"] + "/" + "T" + "_" + sideStateChecker[selectedTurbine][WTG_data[3].name]["ENE"]["State"] + ".svg"} alt="none" className="h-full w-1/4" />
              <img src={"./images/side_states_svg/step" + sideStateChecker[selectedTurbine][WTG_data[3].name]["ESE"]["State"] + "/" + "T" + "_" + sideStateChecker[selectedTurbine][WTG_data[3].name]["ESE"]["State"] + ".svg"} alt="none" className="h-full w-1/4" />
              <img src={"./images/side_states_svg/step" + sideStateChecker[selectedTurbine][WTG_data[3].name]["S"]["State"] + "/" + "T" + "_" + sideStateChecker[selectedTurbine][WTG_data[3].name]["S"]["State"] + ".svg"} alt="none" className="h-full w-1/4" />
              <img src={"./images/side_states_svg/step" + sideStateChecker[selectedTurbine][WTG_data[3].name]["WSW"]["State"] + "/" + "T" + "_" + sideStateChecker[selectedTurbine][WTG_data[3].name]["WSW"]["State"] + ".svg"} alt="none" className="h-full w-1/4" />
              <img src={"./images/side_states_svg/step" + sideStateChecker[selectedTurbine][WTG_data[3].name]["WNW"]["State"] + "/" + "T" + "_" + sideStateChecker[selectedTurbine][WTG_data[3].name]["WNW"]["State"] + ".svg"} alt="none" className="h-full w-1/4" />
            </div>
            {/* Side */}
            <div className="blades_sides h-1/6 w-full flex flex-row items-center">
              <div className="tower_side w-1/6">N</div>
              <div className="tower_side w-1/6">ENE</div>
              <div className="tower_side w-1/6">ESE</div>
              <div className="tower_side w-1/6">S</div>
              <div className="tower_side w-1/6">WSW</div>
              <div className="tower_side w-1/6">WNW</div>

            </div>
            {/* State */}
            <div className="blades_states h-1/6 w-full flex flex-row items-center">
              <div className="blade_state w-1/4">
                {sideStateChecker[selectedTurbine][WTG_data[3].name]["N"]["State"]}
              </div>
              <div className="blade_state w-1/4">
                {sideStateChecker[selectedTurbine][WTG_data[3].name]["ENE"]["State"]}
              </div>
              <div className="blade_state w-1/4">
                {sideStateChecker[selectedTurbine][WTG_data[3].name]["ESE"]["State"]}
              </div>
              <div className="blade_state w-1/4">
                {sideStateChecker[selectedTurbine][WTG_data[3].name]["S"]["State"]}
              </div>
              <div className="blade_state w-1/4">
                {sideStateChecker[selectedTurbine][WTG_data[3].name]["WSW"]["State"]}
              </div>
              <div className="blade_state w-1/4">
                {sideStateChecker[selectedTurbine][WTG_data[3].name]["WNW"]["State"]}
              </div>
            </div>
          </div>
        </div>
        {/* Footer */}
        <div className="m-5 overflow-x-hidden overflow-y-hidden mt-5 mb-5 dashboard__footer w-98 flex flex-row h-1/6 justify-around items-center">
          {/* Sort */}
          <ProgressRadial percent={AdvancementPercent[0]} name={'1.Sort'} />
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="gray" className="lg:w-6 lg:h-6 md:w-3 md:h-3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>

          {/* Process */}
          <ProgressRadial percent={AdvancementPercent[1]} name={'2.Process'} />
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="gray" className="lg:w-6 lg:h-6 md:w-3 md:h-3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>

          {/* Validate */}
          <ProgressRadial percent={AdvancementPercent[2]} name={'3.Validate'} />
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="gray" className="lg:w-6 lg:h-6 md:w-3 md:h-3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>

          {/* Assemble */}
          <ProgressRadial percent={AdvancementPercent[3]} name={'4.Assemble'} />
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="gray" className="lg:w-6 lg:h-6 m:w-3 md:h-3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>

          {/* Optimize */}
          <ProgressRadial percent={AdvancementPercent[4]} name={'5.Optimize'} />
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="gray" className="lg:w-6 lg:h-6 m:w-3 md:h-3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
          {/* Import */}
          <ProgressRadial percent={AdvancementPercent[5]} name={'6.Import'} />
        </div>
      </div >
    );
  } else {
    return (
      <div className="w-full h-full flex flex-col justify-center items-center">
        <div className="lds-ring">
          <p> NO MISSION SHEET </p>
        </div>
      </div>
    )
  }

};

export default Dashboard;
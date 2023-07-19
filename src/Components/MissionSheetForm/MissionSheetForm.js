import { useEffect, useState } from "react";
import "./MissionSheetForm.css";

import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { resetDirectoryPath } from "../../features/directoryPath/directoryPath";
const { ipcRenderer } = window.require("electron");
const fs = window.require("fs");

function MissionSheetForm() {
  const dispatch = useDispatch();
  const [isCustomBladesNameType, setIsCustomBladesNameType] = useState(false);
  useEffect(() => {
    const bladesNameFieldset = document.getElementById("bladesNameFieldset");
    bladesNameFieldset.addEventListener("change", handleCustomBladesNameType);
  }, []);

  const handleEndForm = (path) => {
    const missionPath = path + "/mission_sheet.json";
    localStorage.setItem("missionSheet", missionPath);
    ipcRenderer.send("close");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const isCustomChecked = document.getElementById("custom").checked;
    if (isCustomChecked) {
      const allBladesCheckbox = document.querySelectorAll('input[id^="blades"]');
      allBladesCheckbox.forEach((checkbox) => {
        if (checkbox.checked === false) {
          const divOfThisBladeCheckbox = checkbox.parentNode.parentNode;
          const nextDiv = divOfThisBladeCheckbox.nextElementSibling;
          nextDiv.style.display = "none";
        }
      });
    }
    const wind_farm_name = document.getElementById("wind_farm_name").value;
    let inspected_by = document.getElementById("inspected_by").value;
    if (!inspected_by === "") {
      inspected_by = null;
    }
    const inspection_date = document.getElementById("inspection_date").value;
    let mission_type = document.getElementById("mission_type").value;
    // Gestion conversion mission_type en int
    if (mission_type === "Sherlock") {
      mission_type = 4;
    } else if (mission_type === "Sherlock+") {
      mission_type = 3;
    } else {
      mission_type = "undefined";
    }
    let blades_name_type;
    // Gestion Blades Name Type (Alpha, Numeric ou Custom)
    let blades_name_value_array = [];
    // je vais utiliser mon compteur de WTG pour gérer mes blades_name_value_array
    let WTG_name_value_array = [];
    const WTG_number_count = document.querySelectorAll('[id^="turbineName"]');
    WTG_name_value_array = Array.from(WTG_number_count).map(
      (input) => input.value
    );
    const isAvailable =
      document.getElementById("bladesNameFieldset").style.display === "block";

    if (isAvailable) {
      blades_name_type = document.querySelector(
        'input[name="blades_name_type"]:checked'
      ).id;
    } else {
      WTG_name_value_array.forEach(() => {
        blades_name_value_array.push(["1", "2", "3"]);
      });
    }

    if (blades_name_type === "custom") {
      blades_name_value_array = handleIsCustomBladesNameTypeData();
    } else if (blades_name_type === "alpha") {
      WTG_name_value_array.forEach(() => {
        blades_name_value_array.push(["A", "B", "C"]);
      });
    } else if (blades_name_type === "numeric") {
      WTG_name_value_array.forEach(() => {
        blades_name_value_array.push(["1", "2", "3"]);
      });
    } else {
      console.log("error");
    }

    let WTG_list = {};
    let WTG_tower_inspected_value_array =
      document.querySelectorAll('input[id^="tower"]');
    // je vérif si tower check ou pas
    WTG_tower_inspected_value_array = Array.from(
      WTG_tower_inspected_value_array
    ).map((input) => input.checked);

    // je vérif si blades check ou pas
    let blades_inspected_value_array = document.querySelectorAll(
      'input[id^="blades"]'
    );
    blades_inspected_value_array = Array.from(blades_inspected_value_array).map(
      (input) => input.checked
    );

    const WTG_list_to_push = WTG_name_value_array.map((WTG, i) => {
      return {
        [WTG]: {
          blades: {
            B1: {
              name: blades_name_value_array[i][0],
              inspected: blades_inspected_value_array[i],
              flight_type: blades_inspected_value_array[i] ? "manual" : undefined,
            },
            B2: {
              name: blades_name_value_array[i][1],
              inspected: blades_inspected_value_array[i],
              flight_type: blades_inspected_value_array[i] ? "manual" : undefined,
            },
            B3: {
              name: blades_name_value_array[i][2],
              inspected: blades_inspected_value_array[i],
              flight_type: blades_inspected_value_array[i] ? "manual" : undefined,
            },
          },
          tower: {
            name: "Tower",
            inspected: WTG_tower_inspected_value_array[i],
            flight_type: WTG_tower_inspected_value_array[i] ? "manual" : undefined,
          },
        },
      };
    });

    WTG_list_to_push.forEach((WTG) => {
      WTG_list = { ...WTG_list, ...WTG };
    });
    // // Je convertie mes tableaux en objets avec la méhotde Object.assign
    WTG_list = Object.assign({}, WTG_list);
    // Je crée un objet data qui contient toutes les infos pour mon Json, dans l'order du Json

    // remove any undefined flight_type
    Object.keys(WTG_list).forEach((WTG) => {
      Object.keys(WTG_list[WTG].blades).forEach((blade) => {
        if (WTG_list[WTG].blades[blade].flight_type === undefined) {
          delete WTG_list[WTG].blades[blade].flight_type;
        }
      });
      if (WTG_list[WTG].tower.flight_type === undefined) {
        delete WTG_list[WTG].tower.flight_type;
      }
    });

    const progression = {
      "step": 0,
      "date": inspection_date,
    };
    const data = {
      wind_farm_name,
      inspected_by,
      inspection_date,
      mission_type,
      WTG_list,
      progression,
    };
    // Je crée mon fichier Json, pour le moment dans /upload pour les tests
    const directoryPath = localStorage.getItem("directoryPath");
    fs.writeFileSync(
      `${directoryPath}/mission_sheet.json`,
      JSON.stringify(data),
      (err) => {
        if (err) {
          console.log(err);
        } else {
          console.log("File written successfully");
        }
      }
    );

    handleEndForm(directoryPath);
  };

  const handleCancel = () => {
    localStorage.removeItem("directoryPath");
    dispatch(resetDirectoryPath());
    ipcRenderer.send("close");
  };

  const handleIsCustomBladesNameTypeData = () => {
    const isCustomBladesNameDiv = document.querySelectorAll(
      ".isCustomBladesNameDiv"
    );
    const isCustomBladesNameDivValue = Array.from(isCustomBladesNameDiv).map(
      (div) => div.children
    );
    const isCustomBladesNameDivValueArray = [];
    isCustomBladesNameDivValue.forEach((div) => {
      const divArray = Array.from(div);
      const divArrayValue = divArray.map((input) => input.value);
      isCustomBladesNameDivValueArray.push(divArrayValue);
    });
    return isCustomBladesNameDivValueArray;
  };

  const handleShowCustomNameBladesInput = () => {
    const allBladesCheckbox = document.querySelectorAll('input[id^="blades"]');
    allBladesCheckbox.forEach((checkbox) => {
      if (!checkbox.checked) {
        const divOfThisBladeCheckbox = checkbox.parentNode.parentNode;
        const nextDiv = divOfThisBladeCheckbox.nextElementSibling;
        nextDiv.style.visibility = "hidden";
        nextDiv.style.height = "0px";
      } else {
        const divOfThisBladeCheckbox = checkbox.parentNode.parentNode;
        const nextDiv = divOfThisBladeCheckbox.nextElementSibling;
        nextDiv.style.visibility = "visible";
        nextDiv.style.height = "auto";
      }
    });
  };

  const handleHideCustomNameBladesInput = () => {
    const allBladesCheckbox = document.querySelectorAll('input[id^="blades"]');
    allBladesCheckbox.forEach((checkbox) => {
      const divOfThisBladeCheckbox = checkbox.parentNode.parentNode;
      const nextDiv = divOfThisBladeCheckbox.nextElementSibling;
      nextDiv.style.visibility = "hidden";
      nextDiv.style.height = "0px";
    });
  };

  const handleCustomBladesNameType = (e) => {
    const bladesNameType = document.getElementById("custom").checked;
    if (!bladesNameType) {
      setIsCustomBladesNameType(true)
    } else {
      setIsCustomBladesNameType(false)
    }
    // Je vérifie si la case custom est cochée
    if (!bladesNameType) {
      handleHideCustomNameBladesInput(e);
      return "undefined";
    } else {
      handleShowCustomNameBladesInput();
      const isCheckboxBlades = document.querySelectorAll('input[id^="blades"]');
      isCheckboxBlades.forEach((checkbox) => {
        if (checkbox.checked) {
          const CustomBladesNameDiv = document.getElementById(
            `customBladesNameDiv${checkbox.id.slice(-1)}`
          );
          if (CustomBladesNameDiv.children.length + 3 > 3) {
            return;
          } else {
            for (let i = 0; i < 3; i++) {
              const input = document.createElement("input");
              input.type = "text";
              input.style.border = "1px solid #ccc";
              input.name = `${i + 1}`;
              input.className = `ml-5 mr-5 w-2/12 text-center SelectCustombladesName`;
              input.required = true;
              input.value = `Change Me !`;
              CustomBladesNameDiv.appendChild(input);
            }
          }
        }
      });
    }
  };

  const handleIsCheckboxBlades = () => {
    const isCheckboxBlades = document.querySelectorAll('input[id^="blades"]');
    const isCheckboxBladesValue = Array.from(isCheckboxBlades).map(
      (checkbox) => checkbox.checked
    );
    if (isCheckboxBladesValue.includes(true)) {
      document.getElementById("bladesNameFieldset").style.display = "block";
    } else {
      document.getElementById("bladesNameFieldset").style.display = "none";
      document.getElementById("alpha").checked = false;
      document.getElementById("numeric").checked = false;
      document.getElementById("custom").checked = false;
    }
  };

  const handleAddCss = () => {
    const isCheckbox = document.querySelectorAll('input[type="checkbox"]');
    isCheckbox.forEach((checkbox) => {
      checkbox.className = "ml-2 mr-2";
    });
    const isCheckboxBlades = document.querySelectorAll('input[id^="blades"]');
    isCheckboxBlades.forEach((checkbox) => {
      checkbox.addEventListener("change", handleIsCheckboxBlades);
      checkbox.addEventListener("change", handleCustomBladesNameType);
    });
    const turbineName = document.querySelectorAll('input[id^="turbineName"]');
    turbineName.forEach((input) => {
      input.className =
        "pl-1 w-1/4 border-solid border-2 border-orange rounded-md";
    });
    const isCustomBladesNameDiv = document.querySelectorAll(
      ".isCustomBladesNameDiv"
    );
    isCustomBladesNameDiv.forEach((div) => {
      div.className = "isCustomBladesNameDiv mt-5 mb-5";
    });

    const inputBladesTowerDiv = document.querySelectorAll(
      ".inputBladesTowerDiv"
    );
    inputBladesTowerDiv.forEach((div) => {
      div.className = "flex justify-center mt-1 mb-5";
    });
  };

  const handleDeleteTurbine = (e) => {
    const thisTurbineDivNumber = e.target.id.slice(13);
    const separatorToDelete = document.getElementById(
      `separator${thisTurbineDivNumber}`
    );
    separatorToDelete.remove();
    e.target.parentNode.remove();
    handleIsCheckboxBlades();
  };

  const handleAddTurbine = () => {
    const turbineListDiv = document.getElementById("turbineList");
    const turbineDiv = document.createElement("div");
    turbineDiv.className = "flex-col justify-center mt-1 mb-1";
    turbineDiv.id = `turbine${turbineListDiv.childElementCount}`;
    turbineDiv.innerHTML = `
            <input type="text" value="" id="turbineName${turbineListDiv.childElementCount}" placeholder="Enter Turbine Name" required />
              <div class="inputBladesTowerDiv">
              <label htmlFor="blades${turbineListDiv.childElementCount}">
                <input id="blades${turbineListDiv.childElementCount}" name="blades${turbineListDiv.childElementCount}" type="checkbox" />
                Blades</label>
                <label htmlFor="tower${turbineListDiv.childElementCount}">
                <input id="tower${turbineListDiv.childElementCount}" name="tower${turbineListDiv.childElementCount}" type="checkbox" />
                Tower</label>
              </div>
              <div id="customBladesNameDiv${turbineListDiv.childElementCount}" class="isCustomBladesNameDiv">
              </div>
          `;

    const deleteButton = document.createElement("a");
    deleteButton.className =
      "mb-5 hover:cursor-pointer hover:text-red-500 hover:font-bold";
    deleteButton.id = `deleteTurbine${turbineListDiv.childElementCount}`;
    deleteButton.innerHTML = "Delete";
    deleteButton.addEventListener("click", handleDeleteTurbine);
    turbineDiv.appendChild(deleteButton);
    turbineListDiv.appendChild(turbineDiv);

    const separator = document.createElement("hr");
    separator.className = "mt-5 mb-5";
    separator.id = `separator${turbineListDiv.childElementCount - 1}`;
    turbineListDiv.appendChild(separator);

    handleAddCss();
  };
  return (
    <div id="missionSheetForm">
      <h1 className="text-3xl font-bold text-center mt-5 mb-5">
        Mission Sheet Creation Form
      </h1>
      <form className="w-full" onSubmit={handleSubmit}>
        <div className="flex flex-row flex-wrap justify-center">
          {/* Wind farm name : input name */}
          <fieldset className="flex-col items-center fieldset w-5/12">
            <legend className="sr-only">Wind farm name</legend>
            <div
              className="text-base font-medium text-gray-900"
              aria-hidden="true"
            >
              Wind farm name
            </div>
            <div className="mt-1">
              <input
                type="text"
                id="wind_farm_name"
                className="pl-1 w-1/2 border-solid border-2 border-orange rounded-md"
                required
              />
            </div>
          </fieldset>
          {/* Mission type */}
          <fieldset className="fieldset w-5/12">
            <div className="flex flex-col justify-around">
              <legend className="sr-only">Mission type</legend>
              <div
                className="text-base font-medium text-gray-900"
                aria-hidden="true"
              >
                Mission type
              </div>
              <div className="mt-1 flex justify-center items-center">
                <select
                  id="mission_type"
                  name="mission_type"
                  className="w-1/2 pl-1 border-orange border-2 border-solid text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                  defaultValue="Select mission type"
                  required
                >
                  <option disabled>Select mission type</option>
                  <option>Sherlock</option>
                  <option>Sherlock+</option>
                </select>
              </div>
            </div>
          </fieldset>
          {/* Inspection date : input (date, obligatoire) */}
          <fieldset className="flex-col items-center fieldset w-5/12">
            <legend className="sr-only">Inspection date</legend>
            <div
              className="text-base font-medium text-gray-900"
              aria-hidden="true"
            >
              Inspection date
            </div>
            <div className="mt-1">
              <input
                type="date"
                max={new Date().toISOString().split("T")[0]}
                id="inspection_date"
                className="pl-1 w-1/2 border-orange border-2 border-solid rounded-md"
                required
              />
            </div>
          </fieldset>
          {/* Inspected by : input (text, optionnel) */}
          <fieldset className="fieldset w-5/12">
            <legend className="sr-only">Inspected by</legend>
            <div
              className="text-base font-medium text-gray-900"
              aria-hidden="true"
            >
              Inspected by
            </div>
            <div className="mt-1">
              <input
                id="inspected_by"
                type="text"
                className="pl-1 w-1/2 border-solid border-2 border-orange rounded-md"
              />
            </div>
          </fieldset>
          {/* Turbine list : input(text, obligatoire) */}
          <fieldset className="fieldset w-10/12">
            <legend className="sr-only">Turbine list</legend>
            <div
              className="text-base font-medium text-gray-900"
              aria-hidden="true"
            >
              Wind Turbine list
            </div>
            <hr className="mt-5 mb-5" />
            <div id="turbineList" className="mt-1 flex-col justify-center">
              {/* Dynamique, ne pas supprimer */}
            </div>
            <a
              onClick={handleAddTurbine}
              className="marginTop text-orange hover:cursor-pointer"
            >
              Add turbine
            </a>
          </fieldset>
          {/* Blade names type : checkboxes (default, alpha, numeric, others, ...) */}
          <fieldset id="bladesNameFieldset" className="fieldset w-10/12">
            <legend className="contents text-base font-medium text-gray-900">
              Blade names type
            </legend>
            {/* Blades name Type radio button. Alpha, Numeric, Custom */}
            <div className="mt-1 flex justify-center items-center">
              <div className="flex items-center">
                <input
                  id="alpha"
                  name="blades_name_type"
                  type="radio"
                  className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                />
                <label htmlFor="alpha" className="ml-3">
                  <span className="block text-sm text-gray-900">Alpha</span>
                </label>
              </div>
              <div className="flex items-center ml-5">
                <input
                  id="numeric"
                  name="blades_name_type"
                  type="radio"
                  className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                  defaultChecked
                />
                <label htmlFor="numeric" className="ml-3">
                  <span className="block text-sm text-gray-900">Numeric</span>
                </label>
              </div>
              <div className="flex items-center ml-5">
                <input
                  id="custom"
                  name="blades_name_type"
                  type="radio"
                  onClick={handleCustomBladesNameType}
                  className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                />
                <label htmlFor="custom" className="ml-3">
                  <span className="block text-sm text-gray-900">Custom</span>
                </label>
              </div>
            </div>
            <div id="isCustomDiv" className="mt-3">
              {/* Don't delet. Dynamic */}
            </div>
          </fieldset>
          <fieldset className="fieldset w-10/12">
            {/* Cancel button */}
            <button
              onClick={handleCancel}
              className="isfourtyeight mr-1 mt-10 mb-5 text-lg font-bold w-5/12 px-4 py-2 tracking-wide text-white transition-colors duration-200 transform bg-orange rounded-md focus:outline-none"
            >
              Cancel
            </button>
            {/* Submit button */}
            <button
              type="submit"
              className="isfourtyeight ml-1 mt-10 mb-5 text-lg font-bold w-5/12 px-4 py-2 tracking-wide text-white transition-colors duration-200 transform bg-orange rounded-md focus:outline-none"
            >
              Submit
            </button>
          </fieldset>
        </div>
      </form>
    </div>
  );
}

export default MissionSheetForm;

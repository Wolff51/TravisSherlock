import { Component } from "react";

const fs = window.require('fs');

function capitalize(string) {
    const arr = string.split(' ');
    const capitalizedArr = arr.map(element => {
        return element.charAt(0).toUpperCase() + element.slice(1).toLowerCase();
    });
    const capitalizedString = capitalizedArr.join(' ');
    return capitalizedString;
}

class MissionSheetReader {
    constructor(pathToWindFarm) {
        this.missionData = JSON.parse(fs.readFileSync(pathToWindFarm + '\\mission_sheet.json', 'utf8'));
    }

    getWindFarmName() {
        return capitalize(this.missionData['wind_farm_name']);
    }

    getInspectionDate() {
        const inspection_date = new Date(this.missionData['inspection_date'])
        return inspection_date.toDateString();
    }

    getPilotName() {
        const pilotName = this.missionData['inspected_by'];
        if (pilotName != null) {
            return pilotName;
        }
        else {
            return "Unspecified";
        }
    }

    getFlightType() {
        const flight_type = new Array();
        const WT = Object.keys(this.missionData['WTG_list']);
        for (let i = 0; i < WT.length; i++) {
            const WTselect = this.missionData['WTG_list'][WT[i]];
            const WT_blades = Object.keys(WTselect['blades']);
            const WT_tower = WTselect['tower'];
            for (let j = 0; j < WT_blades.length; j++) {
                const WT_blade = WTselect['blades'][WT_blades[j]];
                if (WT_blade['inspected']) {
                    flight_type.push(WT_blade['flight_type']);
                }
            }
            if (WT_tower['inspected']) {
                flight_type.push(WT_tower['flight_type']);
            }

        }
        if (flight_type.includes('manual') && flight_type.includes('auto')) {
            let manual = flight_type.filter(x => x === 'manual').length;
            let auto = flight_type.filter(x => x === 'auto').length;
            manual = Math.round((manual / flight_type.length) * 100);
            auto = Math.round((auto / flight_type.length) * 100);
            return 'Manual: ' + manual + '%' + ' ' + '/' + ' ' + ' Auto: ' + auto + '%';
        } else if (flight_type.includes('manual')) {
            return 'Manual';
        } else if (flight_type.includes('auto')) {
            return 'Auto';
        }
    }

    getMissionType() {
        if (this.missionData['mission_type'] === 3) {
            return 'Sherlock+';
        }
        else if (this.missionData['mission_type'] === 4) {
            return "Sherlock";
        }
        else {
            return "Unspecified";
        }
    }


    getWindTurbines() {
        return Object.keys(this.missionData['WTG_list']).sort((a, b) => a - b);
    }

    getWindTurbineComponents(windTurbine) {
        const windTurbineInspectedComponents = new Array();
        const windTurbineBlades = Object.keys(this.missionData['WTG_list'][windTurbine]['blades']);
        const windTurbineTower = this.missionData['WTG_list'][windTurbine]['tower'];
        for (let i = 0; i < windTurbineBlades.length; i++) {
            const windTurbineBlade = this.missionData['WTG_list'][windTurbine]['blades'][windTurbineBlades[i]];
            windTurbineInspectedComponents.push(
                {
                    'WTG_name': windTurbine,
                    'name': windTurbineBlade['name'],
                    'inspected': windTurbineBlade['inspected']
                }
            )
        }
        windTurbineInspectedComponents.push(
            {
                'WTG_name': windTurbine,
                'name': windTurbineTower['name'],
                'inspected': windTurbineTower['inspected']
            }
        )
        return windTurbineInspectedComponents;
    }

    getWindTurbineComponentsNoWTG(windTurbine) {
        const windTurbineInspectedComponents = new Array();
        const windTurbineBlades = Object.keys(this.missionData['WTG_list'][windTurbine]['blades']);
        const windTurbineTower = this.missionData['WTG_list'][windTurbine]['tower'];
        for (let i = 0; i < windTurbineBlades.length; i++) {
            const windTurbineBlade = this.missionData['WTG_list'][windTurbine]['blades'][windTurbineBlades[i]];
            windTurbineInspectedComponents.push(
                {
                    'name': windTurbineBlade['name'],
                    'inspected': windTurbineBlade['inspected']
                }
            )
        }
        windTurbineInspectedComponents.push(
            {
                'name': windTurbineTower['name'],
                'inspected': windTurbineTower['inspected']
            }
        )
        return windTurbineInspectedComponents;
    }

    getWindTurbineInspectedComponents(windTurbine) {
        const windTurbineInspectedComponents = new Array();
        const windTurbineBlades = Object.keys(this.missionData['WTG_list'][windTurbine]['blades']);
        const windTurbineTower = this.missionData['WTG_list'][windTurbine]['tower'];
        for (let i = 0; i < windTurbineBlades.length; i++) {
            const windTurbineBlade = this.missionData['WTG_list'][windTurbine]['blades'][windTurbineBlades[i]];
            if (windTurbineBlade['inspected']) {
                windTurbineInspectedComponents.push(
                    {
                        'WTG_name': windTurbine,
                        'name': windTurbineBlade['name'],
                        'inspected': windTurbineBlade['inspected']
                    }
                )
            }
        }
        if (windTurbineTower['inspected']) {
            windTurbineInspectedComponents.push(
                {
                    'WTG_name': windTurbine,
                    'name': windTurbineTower['name'],
                    'inspected': windTurbineTower['inspected']
                }
            )
        }
        return windTurbineInspectedComponents;
    }

    isCleanableWindFarm() {
        const progression = this.missionData['progression'];
        const firstCondition = (progression['status'] === 'imported');
        const today = new Date().toJSON().slice(0, 10);
        const todayString = today.toString();
        const thisDay = new Date(todayString);
        const lastProcessDate = new Date(progression['date'])
        const secondCondition = (((thisDay.getTime() - lastProcessDate.getTime()) / 86400000) >= 90);
        return (firstCondition && secondCondition)
    }

    isArchivableWindFarm() {
        const progression = this.missionData['progression'];
        return (progression['status'] === 'cleaned');
    }
}

export default MissionSheetReader;
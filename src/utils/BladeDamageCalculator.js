const fs = window.require('fs');
const path = window.require('path');
const Papa = window.require('papaparse');
const ExifParser = window.require('exif-parser');
const isDev = window.require("electron-is-dev");


class Blade {
    constructor(bladePath, bladeSerialNumber, bladeModel) {
        this.bladePath = bladePath;
        this.bladeTypeComponent = bladeModel.split(' ');
        this.serialNumber = bladeSerialNumber;
        this.modelName = this.bladeTypeComponent[0];
        this.modelHeight = this.bladeTypeComponent[1].split('-')[0].split('_')[0];


        // Blade section delimitation
        let sections = {}
        if (this.modelName === 'AW' & this.modelHeight > 55) {
            sections['Section 1'] = [0., 0.3];
            sections['Section 2'] = [0.3, 0.65];
            sections['Section 3'] = [0.65, 1.];
        }
        else if (this.modelName === 'LM' | (this.modelName === 'AW' & this.modelHeight > 45) | (this.modelName === 'NR' & this.modelHeight < 40)) {
            sections['Section 1'] = [0., 0.22];
            sections['Section 2'] = [0.22, 0.38];
            sections['Section 3'] = [0.38, 1.];
        }
        else if (this.modelName === 'NR' & this.modelHeight == 45) {
            sections['Section 1'] = [0., 0.21];
            sections['Section 2'] = [0.21, 0.36];
            sections['Section 3'] = [0.36, 1.];
        }
        else if (this.modelName === 'NR' & this.modelHeight == 50) {
            sections['Section 1'] = [0., 0.24];
            sections['Section 2'] = [0.24, 0.4];
            sections['Section 3'] = [0.4, 0.73];
            sections['Section 4'] = [0.73, 1.];
        }
        else if (this.modelName === 'NR' & this.modelHeight > 55) {
            sections['Section 1'] = [0., 0.3];
            sections['Section 2'] = [0.3, 0.65];
            sections['Section 3'] = [0.65, 1.];
        } else {
            console.log('No section delimitation found for this blade type : ' + this.modelName + ' ' + this.modelHeight)
            sections['Section 1'] = [0., 0.3];
            sections['Section 2'] = [0.3, 0.65];
            sections['Section 3'] = [0.65, 1.];
        }

        this.sections = sections;


        // Offset between hub center and blade flange
        let offsetBetweenHubAndFlange = 0;
        if (this.modelHeight < 45) {
            offsetBetweenHubAndFlange = 1;
            this.modelHeight -= offsetBetweenHubAndFlange;
        }
        else if (this.modelHeight < 55) {
            offsetBetweenHubAndFlange = 1.2;
            this.modelHeight -= offsetBetweenHubAndFlange;
        }
        else if (this.modelHeight < 60 & this.modelName === 'NR') {
            offsetBetweenHubAndFlange = 1.2;
            this.modelHeight -= offsetBetweenHubAndFlange;
        }
        else if (this.modelHeight < 65) {
            offsetBetweenHubAndFlange = 1.385;
            this.modelHeight -= offsetBetweenHubAndFlange;
        }
        else if (this.modelHeight > 65) {
            offsetBetweenHubAndFlange = 1.5;
            this.modelHeight -= offsetBetweenHubAndFlange;
        }
        this.offsetBetweenHubAndFlange = offsetBetweenHubAndFlange



    }

    readBladeLog() {
        const bladeName = path.basename(this.bladePath);
        const csvFiles = fs.readdirSync(this.bladePath).filter(file => file.endsWith(`-${bladeName}.csv`));

        if (csvFiles.length === 0) {
            console.log('No CSV file found. Make sure the log file is available!');
            return;
        }

        const csvFilePath = path.join(bladePath, csvFiles[0]);
        const csvFileContent = fs.readFileSync(csvFilePath, 'utf8');
        const parsedData = Papa.parse(csvFileContent, { header: true });
        const altitudes = parsedData.data.slice(0, 173).map(row => parseFloat(row.altitude));
        const bladeSize = altitudes[altitudes.length - 1] - altitudes[0];
        const realBladeSize = bladeSize - this.offsetBetweenHubAndFlange

        const images = parsedData.data.slice(0, 173).map(row => row.image);
        const imageSizes = images.map(image => this.calculateImageSize(image));
        console.log('Image Sizes:', imageSizes);
    }

    calculateImageSize(image) {
        const focalLength = 10.3;
        const sensorWidth = 8.8;
        const imageWidth = parseInt(image.split('x')[0]);
        const imageSize = (sensorWidth * imageWidth) / (focalLength * 1000);
        return imageSize;
    }
}

function getImageAltitude(imagePath) {
    try {
        const buffer = fs.readFileSync(imagePath);
        const parser = ExifParser.create(buffer);
        const result = parser.parse();

        if (result.tags && result.tags.GPSAltitude) {
            const altitude = result.tags.GPSAltitude;
            return altitude;
        } else {
            console.log('Altitude information not found in EXIF.');
            return null;
        }
    } catch (error) {

        console.error(`Error reading image (${imagePath}) or extracting altitude from EXIF.`);
        return null;
    }
}

class Side extends Blade {
    constructor(bladePath, bladeSerialNumber, bladeModel, sidePath, missionType) {
        super(bladePath, bladeSerialNumber, bladeModel);
        this.sidePath = sidePath;
        this.sideState = JSON.parse(fs.readFileSync(sidePath + '/side_state.json', 'utf8'));
        if (missionType == 3) {
            this.imageHeight = 5460;
        }
        else if (missionType == 4) {
            this.imageHeight = 3648;
        }
        else {
            console.log('Potential error. Camera not recognized!')
            this.imageHeight = 4000;
        }
    }

    pullImages(extension = 'JPG') {
        const files = fs.readdirSync(this.sidePath);
        const filteredFiles = files.filter(file => path.extname(file) === `.${extension}`);
        return filteredFiles.map(file => path.join(this.sidePath, file));
    }

    getImageChars() {
        const imageChars = [];
        const imagePaths = this.pullImages();
        let n;
        // if this.direction === 'up'
        //     imagePaths = ''

        const altitudes = []
        for (let i = 0; i < imagePaths.length; i++) {
            altitudes.push(getImageAltitude(imagePaths[i]));
        }
        const nbImages = altitudes.length;
        const bladeHeight = Math.abs(altitudes[nbImages - 1] - altitudes[0]);
        const bladeRepartitionByImage = (this.modelHeight / this.imageHeight);
        const nbMetersByPixel = bladeRepartitionByImage * (altitudes[0] - altitudes[1]);

        let min = 0;
        let pxPerMeter = 0;
        for (let i = 0; i < imagePaths.length; i++) {
            const distanceBetween2images = (altitudes[i] - altitudes[i + 1]) * nbMetersByPixel;
            let max = min + (distanceBetween2images * 100)
            if (i === imagePaths.length - 1) {
                max = this.modelHeight;
            }
            try {
                pxPerMeter = Math.abs(this.imageHeight / (max - min));
            } catch (error) {
                console.error(`Error`);
            }
            imageChars.push({
                'path': imagePaths[i],
                'bladeHeight': bladeHeight,
                'sections': this.sections,
                'altitude': altitudes[i],
                'interval': [min, max],
                'pxPerMeter': pxPerMeter,
            });
            min = max;
        }
        // n = imageChars.length - 1;
        // imageChars[n]['interval'][1] = this.modelHeight;
        return imageChars;
    }
}

class Damage {
    constructor(imageChars, imagePath, x, y, width, height, unit = 'px') {
        this.imagePath = imagePath;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.unit = unit;

        this.imageChars = {}
        for (let i = 0; i < imageChars.length; i++) {
            let char = imageChars[i];
            const normalizedPath1 = path.normalize(this.imagePath)
            const normalizedPath2 = path.normalize(char['path'])
            if (normalizedPath1 === normalizedPath2) {
                this.imageChars = char;
            }
        }
        this.calculateProfileDepthPercent()
        this.calculateDistanceFromFlange()
        this.getSection()
    }

    calculateProfileDepthPercent() {
        const pathComponents = path.normalize(this.imageChars['path']).split('/');
        const sideName = pathComponents[pathComponents.length - 2]
        if (sideName === 'LE') {
            this.profileDepthStart = 0;
            this.profileDepthEnd = 0;
        }
        else if (sideName === 'PS') {
            this.profileDepthStart = 0.32;
            this.profileDepthEnd = 0.68;
        }
        else if (sideName === 'SS') {
            this.profileDepthStart = 0.62;
            this.profileDepthEnd = 0.38;
        }
        else if (sideName === 'TE') {
            this.profileDepthStart = 0;
            this.profileDepthEnd = 0;
        }
        else {
            this.profileDepthStart = 1;
            this.profileDepthEnd = 1;
        }
    }

    calculateDistanceFromFlange() {
        const bladeHeight = this.imageChars['bladeHeight'];
        const pxPerMeter = this.imageChars['pxPerMeter'];
        const min = this.imageChars['interval'][0];
        const max = this.imageChars['interval'][1];

        const dfStartValue = min + (this.y / pxPerMeter);
        const dfEndValue = min + ((this.y + this.width) / pxPerMeter);

        const dfPercentStart = dfStartValue / bladeHeight;
        const dfPercentEnd = dfEndValue / bladeHeight;

        if (dfPercentStart > 1) {
            this.distanceFromFlangeStart = 1;
        }
        else {
            this.distanceFromFlangeStart = dfPercentStart.toFixed(10);
        }

        if (dfPercentEnd > 1) {
            this.distanceFromFlangeEnd = 1;
        }
        else {
            this.distanceFromFlangeEnd = dfPercentEnd.toFixed(10);
        }
    }

    getSection() {
        const sections = this.imageChars['sections'];
        const sectionKeys = Object.keys(sections);
        const eligibleSections = []
        for (const sectionKey of sectionKeys) {
            const sectionRange = sections[sectionKey];
            if (
                this.distanceFromFlangeStart >= sectionRange[0] ||
                this.distanceFromFlangeEnd <= sectionRange[1]
            ) {
                eligibleSections.push(sectionKey);
            }
            if (
                this.distanceFromFlangeStart >= sectionRange[0] &&
                this.distanceFromFlangeEnd <= sectionRange[1]
            ) {
                this.section = sectionKey;
                return;
            }
        }
        const n = eligibleSections.length;
        this.section = eligibleSections[n - 1];
        return;
    }
}

// Usage example
// const bladePath = 'N:/dev_sherlock/StudioUtils/NORDEX-DEV/B1'
// const sidePath = 'N:/dev_sherlock/StudioUtils/NORDEX-DEV/B1/LE';
// const imagePath = 'N:/dev_sherlock/StudioUtils/NORDEX-DEV/B1/LE/DJI_20230428203614473266.JPG'
// const bladeSerialNumber = '093HBDUELS';
// const bladeModel = 'NR 58.5-2';
// const direction = 'down';
// const missionType = 4;

// const x = 1989.78;
// const y = 959.22;
// const width = 5181.15;
// const height = 2096.13;

// const sideObj = new Side(bladePath, bladeSerialNumber, bladeModel, sidePath, direction, missionType);
// const imageChars = sideObj.getImageChars();
// const damageObj = new Damage(imageChars, imagePath, x, y, width, height);
// console.log('section: ', damageObj.section);
// console.log('u_profile_depth: ', damageObj.profileDepthStart);
// console.log('u_profile_depth_end: ', damageObj.profileDepthEnd);
// console.log('u_df_start: ', damageObj.distanceFromFlangeStart);
// console.log('u_df_end: ', damageObj.distanceFromFlangeEnd);



export default { Side, Damage }
const fs = window.require('fs');
// pathToSide = directorypath/WTG/Component/Side
class SideStateChecker {
    constructor(pathToSide) {
        this.pathToFile = pathToSide + '\\side_state.json';
        if (fs.existsSync(this.pathToFile)) {
            this.sideState = JSON.parse(fs.readFileSync(this.pathToFile, 'utf8'));
        } else {
            this.sideState = null;
        }
        const today = new Date().toJSON().slice(0, 10);
        this.today = today.toString();
    }

    // ********************************************************************
    // VALIDATORS
    // ********************************************************************

    // First step : sort images
    #isSortedSide() {
        if (this.sideState !== null) {
            return this.sideState['states']['sort']['done'];
        } else {
            return false;
        }
    }

    // Second step : process images
    #isProcessedSide() {
        if (this.sideState !== null) {
            return (this.#isFilteredSide() && this.#isCuttedOutSide() && this.#isComputedSide())
        } else {
            return false;
        }

    }

    #isFilteredSide() {
        if (this.sideState !== null) {
            return this.sideState['states']['process']['filter']['done'];
        } else {
            return false;
        }
    }

    #isCuttedOutSide() {
        if (this.sideState !== null) {
            return this.sideState['states']['process']['cutout']['done'];
        } else {
            return false;
        }
    }

    #isComputedSide() {
        if (this.sideState !== null) {
            return this.sideState['states']['process']['compute']['done'];
        } else {
            return false;
        }
    }

    // Third step : validate processes
    #isValidatedSide() {
        if (this.sideState !== null) {
            return this.sideState['states']['validate']['done'];
        } else {
            return false;
        }
    }

    // Forth step : assemble images
    #isAssembledSide() {
        if (this.sideState !== null) {
            return this.sideState['states']['assemble']['done'];
        } else {
            return false;
        }
    }

    // Fifth step : optimize assembly
    #isOptimizedSide() {
        if (this.sideState !== null) {
            return this.sideState['states']['optimize']['done'];
        } else {
            return false;
        }
    }

    // Sixth step : import images
    #isImportedSide() {
        if (this.sideState !== null) {
            return this.sideState['states']['import']['done'];
        } else {
            return false;
        }
    }

    getSideStateLevel() {
        if (this.#isImportedSide()) {
            return 6;
        }
        else if (this.#isOptimizedSide()) {
            return 5;
        }
        else if (this.#isAssembledSide()) {
            return 4;
        }
        else if (this.#isValidatedSide()) {
            return 3;
        }
        else if (this.#isProcessedSide()) {
            return 2;
        }
        else if (this.#isSortedSide()) {
            return 1;
        }
        else {
            return 0;
        }
    }

    // ********************************************************************
    // CUSTOMIZED GETTERS
    // ********************************************************************
}

export default SideStateChecker;
/* global fetch, NodeList, Promise */

const flowchartDiv = document.getElementById("graph");
var buildingData = null;
var resourceData = null;
var similarityScores = null;
var resourceStages = null;//map
var selectedBuildings = [];

const columnInterval = 275;
const columnElementWidth = 125;
const spineBufferSpace = 40;
const rowInterval = 320;
const imgBoxHeight = 17.6;
const connectorPadding = 5;

const spineCount = 6;
const horizontalSpineConnectorCount = 3;

var graphVerticalOffset = 0;
var graphHorizontalOffset = 0;

var grid;//array

const mechanicsDropdown = document.getElementById("mechanicsDropdown");
const dlcDropdown = document.getElementById("dlcDropdown");
const viewsDropdown = document.getElementById("viewsDropdown");

this.viewsDropdown.checkboxFunction = function () {
    var selected = viewsDropdown.getSelected();
    let prodCheck = viewsDropdown.mainListElement.querySelector("span[value=production]").querySelector("input[type=checkbox]");
    if ((selected.length === 1 && selected.includes("production")) || selected.length === 0) {
        prodCheck.disabled = true;
        prodCheck.checked = true;
    } else{
        prodCheck.disabled = false;
    }
};

async function loadData() {
    buildingData = null;
    resourceData = null;
    multiFetch("data/buildingData.xml", "data/resourceData.xml").then((xmlData) => {
        //Get the data
        buildingData = xmlData.get("data/buildingData.xml");
        resourceData = xmlData.get("data/resourceData.xml");
        graphHorizontalOffset = flowchartDiv.getBoundingClientRect().x;
        graphVerticalOffset = flowchartDiv.getBoundingClientRect().y;
        render("*", getRenderViewsList());
    });
}
function render(resourceToShow = "*", viewsToShow = ["production"]) {
    //Set needed variables
    var mechanicsToDisplay = mechanicsDropdown.getSelected();
    selectedBuildings = [];
    similarityScores = null;
    resourceStages = new Map();
    grid = Array.from(Array(10), () => new Array(20).fill(-1));
    clearChildren(flowchartDiv);
    //If resource-specific, calculate filter
    if (resourceToShow !== "*") {
        let inOutData = calculateInputsOutputs(false);
        function computeBackwards(resource) {
            //Push all buildings that produce resource
            if (inOutData.outputs[resource]) {
                inOutData.outputs[resource].forEach((buildingId) => {
                    if (selectedBuildings.indexOf(buildingId) === -1) {
                        selectedBuildings.push(buildingId);
                        let building = getBuildingById(buildingId);
                        //Get inputs and call function on that resource
                        var buildingInputs = getRowData("inputs", building);
                        if (buildingInputs) {
                            for (let inputResource of buildingInputs.childNodes.entries()) {
                                if (getRowData("nonProductionResource", inputResource[1]) === null) {
                                    let resourceName = getRowData("name", inputResource[1]).textContent;
                                    computeBackwards(resourceName);
                                }
                            }
                        }
                    }
                });
            }
        }
        computeBackwards(resourceToShow);
    }
    //Set up data structures, start by counting number of buildings
    var buildingCount = 0;
    scanBuildings((building, i) => {
        buildingCount = i + 1;
    });
    //Create 2d similar score array, only init needed slots
    similarityScores = new Array(buildingCount);
    for (var b = 0; b < buildingCount; b++) {
        similarityScores[b] = new Array(b).fill(0);
    }
    //Calculate resource complexity
    //Load in the base resources with complexity of 0
    scanBuildings((building) => {
        let outputData = getRowData("outputs", building);
        if (outputData) {
            for (let outputResource of outputData.childNodes.entries()) {
                let outputObject = outputResource[1];
                let resourceName = getRowData("name", outputObject).textContent;
                resourceStages.set(resourceName, 0);
            }
        }
    }, ["Mining", "Farming"], selectedBuildings, viewsToShow);
    //Calculate the complexities for other resources based on buildings
    let pendingBuildings = [];
    scanBuildings((building) => {
        pendingBuildings.push(building);
    }, null, selectedBuildings, viewsToShow);
    //Function recursively calculates the production complexity of each output.
    //Will break and assign value of 0 to any leftover resources
    function resourceClassifier() {
        let changesOccured = false;
        for (var b = 0; b < pendingBuildings.length; b++) {
            let building = pendingBuildings[b];
            let inputData = getRowData("inputs", building);
            let outputData = getRowData("outputs", building);
            //if inputs present (not a mine/farm)
            if (inputData) {
                var countedInputs = 0;
                var complexities = [0];
                //See how many input resources have a complexity assigned
                for (let inputResource of inputData.childNodes.entries()) {
                    inputResource = inputResource[1];
                    let resourceName = getRowData("name", inputResource).textContent;
                    //Only inputs used directly used (ignore fuel for farms, etc)
                    if (getRowData("nonProductionResource", inputResource) === null) {
                        if (resourceStages.has(resourceName)) {
                            countedInputs++;
                            complexities.push(resourceStages.get(resourceName) + 1);
                        } else {
                            //One resource has no complexity, no point in continuing
                            break;
                        }
                    } else {
                        //Increment counter as the input has been "considered"
                        countedInputs++;
                        //Don't count the complexity, but set it to 0 if not already known,
                        //so that the resource is known
                        if (!resourceStages.has(resourceName)) {
                            resourceStages.set(resourceName, 0);
                        }
                    }
                }
                //Check if all inputs have a complexity
                if (countedInputs === inputData.childNodes.length) {
                    if (outputData) {
                        outputsComplexity = Math.max(...complexities);
                        //Loop ouputs and set their complexitiy
                        for (let outputResource of outputData.childNodes.entries()) {
                            outputResource = outputResource[1];
                            let resourceName = getRowData("name", outputResource).textContent;
                            resourceStages.set(resourceName, outputsComplexity);
                        }
                    }
                    //No need to revisit building
                    changesOccured = true;
                    pendingBuildings.splice(b, 1);
                    b--;
                }
            } else {
                //No need to revisit building
                changesOccured = true;
                pendingBuildings.splice(b, 1);
                b--;
            }
        }
        if (pendingBuildings.length > 0 && changesOccured === true) {
            resourceClassifier();
        } else if (changesOccured === false) {
            //Get all leftover resources and account for them
            //These buildings must have outputs, or they would have been removed on round 1
            for (var b = 0; b < pendingBuildings.length; b++) {
                let building = pendingBuildings[b];
                let inputData = getRowData("inputs", building);
                for (let inputResource of inputData.childNodes.entries()) {
                    inputResource = inputResource[1];
                    let resourceName = getRowData("name", inputResource).textContent;
                    if (!resourceStages.has(resourceName)) {
                        console.log("Setting " + resourceName + " 0");
                        resourceStages.set(resourceName, 0);
                    }
                }
                //New: Outputs
                let outputData = getRowData("outputs", building);
                if (outputData) {
                    for (let outputResource of outputData.childNodes.entries()) {
                        outputResource = outputResource[1];
                        let resourceName = getRowData("name", outputResource).textContent;
                        if (!resourceStages.has(resourceName)) {
                            console.log("Setting " + resourceName + " 1");
                            resourceStages.set(resourceName, 1);
                        }
                    }
                }
            }
        }
    }
    resourceClassifier();
    if (resourceToShow === "*") {
        prepareMenuElements();
    }
    //Calculate building similarity scores
    scanBuildings((building, b) => {
        let inputData = getRowData("inputs", building);
        if (inputData) {
            //Calculate relevant inputs and the ratio
            let consumedInputs = getProductionResources(inputData);
            var ratio = 1 / consumedInputs.length;
            //For each input, figure out what buildings produce it
            consumedInputs.forEach((resource, v) => {
                let resourceName = getRowData("name", resource).textContent;
                scanBuildings((innerBuilding, i) => {
                    let innerOutputs = getRowData("outputs", innerBuilding);
                    if (innerOutputs) {
                        //Check if any of the outputs of this building are inputs
                        for (let outputResource of innerOutputs.childNodes.entries()) {
                            outputResource = outputResource[1];
                            let innerResourceName = getRowData("name", outputResource).textContent;
                            if (innerResourceName === resourceName) {
                                //Input & Output match found between the buildings, log it
                                //Determine which slot is valid
                                similarityScores[Math.max(i, b)][Math.min(i, b)] = ratio * (v === 0 ? 1 : 0.8);
                            }
                        }
                    }
                }, null, selectedBuildings, viewsToShow);
            });
        }
    }, null, selectedBuildings, viewsToShow);

    function renderFlowchartBuildings() {
        //TODO: Fix column count
        let columnCount = 9;//1 + Math.max(...Array.from(resourceStages.values()));
        var leftover = [];
        for (var c = 0; c < columnCount; c++) {
            var columnUsedNames = [];
            //Loop over each building, if complexity matches column #, render it
            scanBuildings((building, b, category) => {
                var categoryRenderOption = getRowData("renderOption", category);
                let categoryPosition = Array.from(getRowData("buildings", category).childNodes).indexOf(building);
                if (!categoryRenderOption || (categoryRenderOption.textContent === "compressed" && categoryPosition === 0)) {
                    var buildingComplexity = getBuildingComplexity(building);
                    if (buildingComplexity === c) {
                        let buildingName = building.attributes[0].textContent;
                        var buildingInputCount = getRowData("inputs", building);
                        buildingInputCount = buildingInputCount ? buildingInputCount.childNodes.length : 0;
                        var rowValue = 0;
                        if (c === 0) {
                            rowValue = grid[c].indexOf(-1);
                        } else {
                            //Figure out how other buildings relate to this one
                            var gridSimilarity = Array.from(Array(c), () => new Array(grid[c].length).fill(-1));
                            let highest = {score: 0, col: 0, row: 0};
                            let rawHighest = {score: 0, col: 0, row: 0};
                            for (var co = 0; co < c; co++) {
                                for (var ro = 0; ro < grid[co].length; ro++) {
                                    if (similarityScores[Math.max(getSingleIdFromGrid(co, ro), b)][Math.min(getSingleIdFromGrid(co, ro), b)] > 0) {
                                        gridSimilarity[co][ro] = similarityScores[Math.max(getSingleIdFromGrid(co, ro), b)][Math.min(getSingleIdFromGrid(co, ro), b)];
                                        if (gridSimilarity[co][ro] > highest.score) {
                                            //Only consider open possibilities for normal placement
                                            if (grid[c][ro] === -1) {
                                                highest.score = gridSimilarity[co][ro];
                                                highest.col = co;
                                                highest.row = ro;
                                            }
                                        }
                                        //Raw highest will store only the highest match, regardless of open space (used for 5+ inputs)
                                        if (gridSimilarity[co][ro] > rawHighest.score) {
                                            rawHighest.score = gridSimilarity[co][ro];
                                            rawHighest.col = co;
                                            rawHighest.row = ro;
                                        }
                                    }
                                }
                            }
                            //gridSimilarity shows the previous columns and how related each building is to the current one
                            const maxInputCount = 4;
                            if (highest.score > 0 && grid[c][highest.row] === -1 && buildingInputCount <= maxInputCount) {
                                //If there is a gap between the previous and current, and that gap is open
                                if (c - highest.col > 1 && grid[highest.col + 1][highest.row] === -1) {
                                    //This line will only force single gaps to stay open. A loop (and check of all slots in the IF) will be required
                                    //To enable gaps >1
                                    grid[highest.col + 1][highest.row] = -2;
                                }
                                rowValue = highest.row;
                                //The else if will trigger for buildings with lots of inputs who have an open highestRaw grid spot, meaning only the first input can result in a selected spot
                            } else if (rawHighest.score > 0 && grid[c][rawHighest.row] === -1 && buildingInputCount > maxInputCount) {
                                //If there is a gap between the previous and current, and that gap is open
                                if (c - rawHighest.col > 1 && grid[rawHighest.col + 1][rawHighest.row] === -1) {
                                    //This line will only force single gaps to stay open. A loop (and check of all slots in the IF) will be required
                                    //To enable gaps >1
                                    grid[rawHighest.col + 1][rawHighest.row] = -2;
                                }
                                rowValue = rawHighest.row;
                            } else {
                                rowValue = -1;
                                if (columnUsedNames.indexOf(buildingName) === -1) {
                                    leftover.push(b);
                                }
                            }
                        }
                        //Not a leftover and not a combined
                        if (rowValue !== -1 && columnUsedNames.indexOf(buildingName) === -1) {
                            //Check if duplicate
                            let multiBuildingList = buildingData.getElementsByName(buildingName);
                            if (multiBuildingList.length > 1) {
                                //Duplicate, compile list of duplicates and store
                                var multiBuildingIds = [];
                                multiBuildingList.forEach((buildingEl) => {
                                    multiBuildingIds.push(getBuildingIdByElement(buildingEl));
                                });
                                grid[c][rowValue] = multiBuildingIds;
                                columnUsedNames.push(buildingName);
                                let buildingIds = [];
                                multiBuildingList.forEach((buildingEl) => {
                                    buildingIds.push(getBuildingIdByElement(buildingEl));
                                });
                                new multiStandardRender(c, rowValue, b, flowchartDiv, mechanicsToDisplay).render(multiBuildingList, buildingIds);
                            } else {
                                //Not a duplicate, simple operation
                                grid[c][rowValue] = b;
                                columnUsedNames.push(buildingName);
                                if (categoryRenderOption === null) {
                                    new standardRender(c, rowValue, b, flowchartDiv, mechanicsToDisplay).render(building);
                                } else if (categoryRenderOption.textContent === "compressed") {
                                    //Compressed buildings, list all ids in grid
                                    let buildings = getRowData("buildings", category).childNodes;
                                    let gridIds = Array.from([...Array(buildings.length).keys()], ((id) => id + b));
                                    grid[c][rowValue] = gridIds;
                                    new compressedRender(c, rowValue, b, flowchartDiv, mechanicsToDisplay).render(category, b);
                                }
                            }
                        }
                    }
                }
            }, null, selectedBuildings, viewsToShow);
        }
        for (var i = 0; i < leftover.length; i++) {
            let buildingI = leftover[i];
            let buildingInfo = getBuildingInfoById(buildingI);
            var c = getBuildingComplexity(buildingInfo[0]);
            rowValue = grid[c].indexOf(-1);
            grid[c][rowValue] = buildingI;
            let categoryRenderOption = getRowData("renderOption", buildingInfo[1]);
            if (categoryRenderOption && categoryRenderOption.textContent === "compressed") {
                let buildings = getRowData("buildings", buildingInfo[1]).childNodes;
                let gridIds = Array.from([...Array(buildings.length).keys()], ((id) => id + buildingI));
                grid[c][rowValue] = gridIds;
                new compressedRender(c, rowValue, buildingI, flowchartDiv, mechanicsToDisplay).render(buildingInfo[1], buildingI);
            } else {
                new standardRender(c, rowValue, buildingI, flowchartDiv, mechanicsToDisplay).render(buildingInfo[0]);
            }
        }
        function getSingleIdFromGrid(col, row) {
            if (Array.isArray(grid[col][row])) {
                return grid[col][row][0];
            } else {
                return grid[col][row];
            }
        }
    }
    function renderFlowchartResources() {
        //Calculate inputs & outputs for each resource
        let inOutData = calculateInputsOutputs(true);
        var inputs = inOutData.inputs;
        var outputs = inOutData.outputs;
        var resourceColors = new Map();
        var spineGrids = [];//Generate spine grid
        for (var col = 0; col < grid.length - 1; col++) {
            let spineGrid = Array.from(Array(spineCount), () => new Array(grid[col].length).fill(-1));
            spineGrids[col] = spineGrid;
        }
        //Lookup each building, show garbage, water, sewage
        scanBuildings((building, i) => {
            var gridCoords = getBuildingGridLocation(i);
            let isRendered = document.querySelector("[data-building-id='" + i + "']") !== null;
            //Handle garbage/santiation lines
            var garbage = getRowData("garbage", building);
            let buildingElement = document.querySelector("[data-building-id='" + i + "']");
            if (garbage && isRendered && mechanicsToDisplay.includes("garbage")) {
                for (let garbageType of garbage.childNodes.entries()) {
                    var garbageName = garbageType[1].nodeName;
                    let garbageIcon = buildingElement.querySelector("[data-garbage='" + garbageName + "']");
                    if (garbageIcon) {
                        let properGarbageName = garbageName[0].toUpperCase() + garbageName.replace(/([A-Z])/g, " $1").substring(1);
                        let maxProduction = getRowData("maxProduction", garbageType[1]);
                        maxProduction = maxProduction ? maxProduction.textContent : 0;
                        let boundingBox = garbageIcon.getBoundingClientRect();
                        let x = boundingBox.x + boundingBox.width + getWindowOffsetX() + (connectorPadding);
                        let width = spineBufferSpace - connectorPadding - 5;
                        let line = drawLine(x, boundingBox.y + getWindowOffsetY(), width, imgBoxHeight, properGarbageName, maxProduction + " t/d", "spineSubLine left stub");
                        setInOutAttributes(line, i, false, properGarbageName);
                    }
                }
            }
            var sanitation = getRowData("sanitation", building);
            if (sanitation && isRendered && mechanicsToDisplay.includes("sanitation")) {
                let waterData = getRowData("water", sanitation);
                if (waterData) {
                    let waterIcon = buildingElement.querySelector("[data-sanitation='water']");
                    if (waterIcon) {
                        let waterConsumption = getRowData("maxConsumption", waterData).textContent;
                        let x = getColumnX(gridCoords[0]) - spineBufferSpace + 5;
                        let width = spineBufferSpace - connectorPadding - 5;
                        let line = drawLine(x, waterIcon.getBoundingClientRect().y + getWindowOffsetY(), width, imgBoxHeight, "Water", waterConsumption + " m<sup>3</sup>/d", "spineSubLine right stub");
                        setInOutAttributes(line, i, true, "Water");
                    }
                }
                let sewageData = getRowData("sewage", sanitation);
                if (sewageData) {
                    var sewageIcon = buildingElement.querySelector("[data-sanitation='sewage']");
                    if (sewageIcon) {
                        let sewageProduction = getRowData("maxProduction", sewageData).textContent;
                        let boundingBox = sewageIcon.getBoundingClientRect();
                        let x = boundingBox.x + boundingBox.width + getWindowOffsetX() + (connectorPadding);
                        let width = spineBufferSpace - connectorPadding - 5;
                        let line = drawLine(x, boundingBox.y + getWindowOffsetY(), width, imgBoxHeight, "Sewage", sewageProduction + " m<sup>3</sup>/d", "spineSubLine left stub");
                        setInOutAttributes(line, i, false, "Sewage");
                    }
                }
            }
            
        }, null, selectedBuildings, viewsToShow);
        //First step creates line for resources that can use a direct line, logs others for spines
        var spineResources = new Array(grid.length).fill([]);
        Array.from(resourceStages.keys()).forEach((resource) => {
            var inputCount = inputs[resource] ? Object.keys(inputs[resource]).length : 0;
            var outputCount = outputs[resource] ? Object.keys(outputs[resource]).length : 0;
            if (inputCount === 1 && outputCount === 1) {
                //Single line
                let startBuildingId = outputs[resource][0];
                let startCoords = getBuildingGridLocation(startBuildingId);
                let endBuildingId = inputs[resource][0];
                let endCoords = getBuildingGridLocation(endBuildingId);
                //Check that buildings are in line with each other and seperated by nothing but blank spaces
                if (startCoords[1] === endCoords[1] && grid.reduce((acc, el, index) => {
                    if (index > startCoords[0] && index < endCoords[0]) {
                        return acc + !Array.isArray(el[startCoords[1]]) && el[startCoords[1]] <= -1 ? 0 : 1;
                    } else {
                        return acc;
                    }
                }, 0) === 0) {//If reduce is 0, no other buildings are in the seperating grid spaces
                    let startElement = getBuildingElement(startCoords);
                    let endElement = getBuildingElement(endCoords);
                    let inputBox = endElement.querySelector("[data-input='" + resource + "']").getBoundingClientRect();
                    let outputBox = startElement.querySelector("[data-output='" + resource + "']").getBoundingClientRect();
                    var verticalDiff = -(outputBox.y - inputBox.y);
                    var outputX = outputBox.x + outputBox.width + getWindowOffsetX();
                    if (Math.abs(verticalDiff) < 3) {
                        //Straight line across
                        let width = inputBox.x + getWindowOffsetX() - outputX;
                        //input line
                        let inputInfo = calculateBuildingPerDayResource(getBuildingById(startBuildingId), resource);
                        let line = drawLine(outputX + connectorPadding, inputBox.y + getWindowOffsetY(), (width / 2) - connectorPadding, imgBoxHeight, resource, inputInfo[0] + " t/d", "spineSubLine left");
                        setInOutAttributes(line, startBuildingId, false, resource);
                        //output line
                        let outputInfo = calculateBuildingPerDayResource(getBuildingById(endBuildingId), resource);
                        line = drawLine(outputX + (width / 2) + connectorPadding, inputBox.y + getWindowOffsetY(), (width / 2) - (connectorPadding * 3), imgBoxHeight, resource, outputInfo[0] + " t/d", "spineSubLine right");
                        setInOutAttributes(line, endBuildingId, true, resource);
                    } else {
                        //If building has multiple outputs, force a spine line for graphical reasons
                        if (startElement.querySelectorAll("[data-output]").length === 1) {
                            //Use the first open spine to go up/down (if needed), then across
                            let connectorCol = startCoords[0];
                            let connectorRow = startCoords[1];
                            var spineColGrid = spineGrids[connectorCol];
                            for (var s = 0; s < spineColGrid.length; s++) {
                                //Will only need 1 row for the spine, so don't both with algorithm for multiple rows long
                                let open = spineColGrid[s][connectorRow] === -1;
                                if (open) {//spot located
                                    spineColGrid[s][connectorRow] = resource;
                                    //Draw spine. VerticalDiff can be negative, use min to find y and then abs for height
                                    var xWidthData = calculateSpineXWidth(connectorCol, s, spineCount);
                                    let y = Math.min(inputBox.y, outputBox.y) + getWindowOffsetY();
                                    drawSpine(xWidthData[0], y, xWidthData[1], Math.abs(verticalDiff) + outputBox.height, resource, "");
                                    //Output connector
                                    let outputInfo = calculateBuildingPerDayResource(getBuildingById(startBuildingId), resource);
                                    let line = drawLine(outputX + connectorPadding, outputBox.y + getWindowOffsetY(), xWidthData[0] - outputX - connectorPadding, imgBoxHeight, resource, outputInfo[0] + " t/d", "spineSubLine left");
                                    setInOutAttributes(line, startBuildingId, false, resource);
                                    //Input connector
                                    let inputInfo = calculateBuildingPerDayResource(getBuildingById(endBuildingId), resource);
                                    let inputX = inputBox.x + getWindowOffsetX();
                                    line = drawLine(xWidthData[0] + (xWidthData[1] / 2), inputBox.y + getWindowOffsetY(), (inputX - xWidthData[0]) - (connectorPadding * 2) - (xWidthData[1] / 2), imgBoxHeight, resource, inputInfo[0] + " t/d", "spineSubLine right");
                                    setInOutAttributes(line, endBuildingId, true, resource);
                                    //Don't check other spine positions, we have one
                                    break;
                                }
                            }
                        } else {
                            spineResources.push(resource);
                        }
                    }
                } else {
                    spineResources.push(resource);
                }
            } else if ((inputCount === 1 && outputCount > 1) || (inputCount > 1 && outputCount === 1) || (inputCount > 1 && outputCount > 1)) {
                spineResources.push(resource);
            } else if (inputCount === 0 && outputCount >= 1) {
                //This resource has outputs but no inputs, draw a stub
                outputs[resource].forEach((buildingId) => {
                    let buildingEl = document.querySelector("[data-building-id='" + buildingId + "']");
                    var resourceIcon = buildingEl.querySelector("[data-output='" + resource + "']");
                    let maxProduction = calculateBuildingPerDayResource(getBuildingById(buildingId), resource)[0];
                    let boundingBox = resourceIcon.getBoundingClientRect();
                    let x = boundingBox.x + boundingBox.width + getWindowOffsetX() + connectorPadding;
                    let width = spineBufferSpace - connectorPadding - 5;
                    let line = drawLine(x, boundingBox.y + getWindowOffsetY(), width, imgBoxHeight, resource, maxProduction + " t/d", "spineSubLine left stub");
                    setInOutAttributes(line, buildingId, false, resource);
                });
            } else if (inputCount >= 1 && outputCount === 0) {//This resource has inputs but no outputs, draw a stub
                inputs[resource].forEach((buildingId) => {
                    let buildingEl = document.querySelector("[data-building-id='" + buildingId + "']");
                    var resourceIcon = buildingEl.querySelector("[data-input='" + resource + "']");
                    let maxConsumption = calculateBuildingPerDayResource(getBuildingById(buildingId), resource)[0];
                    let boundingBox = resourceIcon.getBoundingClientRect();
                    let width = spineBufferSpace - connectorPadding - 5;
                    let x = boundingBox.x - width + getWindowOffsetX() - (connectorPadding) * 2;
                    let line = drawLine(x, boundingBox.y + getWindowOffsetY(), width, imgBoxHeight, resource, maxConsumption + " t/d", "spineSubLine right stub");
                    setInOutAttributes(line, buildingId, false, resource);
                });
            }
        });
        var columnSpines = [];
        var columnSpineBuildings = [];
        //Figure out exactly which buildings input/output on each spine
        for (var col = 0; col < grid.length - 1; col++) {//-1 as spine columns are inside regular columns
            columnSpines[col] = [];
            columnSpineBuildings[col] = [];
            Array.from(resourceStages.keys()).forEach((resource) => {
                if (spineResources.indexOf(resource) === -1) {
                    return;
                }
                let outputBuildings = outputs[resource] ? outputs[resource] : [];
                let inputBuildings = inputs[resource] ? inputs[resource] : [];
                [...outputBuildings, ...inputBuildings].forEach((BuildingI, i) => {
                    //i >= outputBuildings.length condition selects outputs into this spine column or inputs from this spine column
                    if (getBuildingComplexity(getBuildingById(BuildingI)) === (i >= outputBuildings.length ? col + 1 : col)) {
                        //Buildings that output onto this row
                        if (columnSpines[col].indexOf(resource) === -1 && spineResources.indexOf(resource) !== -1) {
                            columnSpines[col].push(resource);
                            columnSpineBuildings[col].push([BuildingI]);
                        } else if (spineResources.indexOf(resource) !== -1) {
                            columnSpineBuildings[col][columnSpines[col].indexOf(resource)].push(BuildingI);
                        }
                    }
                });
            });
        }
        //Connectors between two spines
        //Should be[row][column][subSpines(horizontalSpineConnectorCount)]
        var rowSpines = new Array(grid[0].length - 1);
        for (var r = 0; r < rowSpines.length; r++) {
            rowSpines[r] = Array.from(Array(horizontalSpineConnectorCount), () => new Array(grid.length - 1).fill(-1));
        }
        columnSpines.forEach((col, colI) => {
            //For each column, figure out and start placing spines
            let spineGrid = spineGrids[colI];
            //Left-to-right creation
            col.forEach((resource, reI) => {
                buildings = columnSpineBuildings[colI][reI];
                //Calculate the length of the spine and fit it in
                //Sort the array from top of the grid to bottom of the grid
                buildings.sort((a, b) => {
                    return getBuildingGridLocation(a)[1] - getBuildingGridLocation(b)[1];
                });
                let topBuilding = buildings[0];
                let bottomBuilding = buildings[buildings.length - 1];
                var topRow = getBuildingGridLocation(topBuilding)[1];
                var bottomRow = getBuildingGridLocation(bottomBuilding)[1];
                var connectorRow = -1;
                var connectorVerticalRow = -1;
                var prevSpineX = -1;
                //Scan previous rows to detmine link-ups as required
                for (var prevCol = colI - 1; prevCol >= 0; prevCol--) {
                    if (columnSpines[prevCol].indexOf(resource) !== -1) {
                        //prevCol has the same resource spine
                        //find which of the n subSpines on the column has that resource
                        let prevSpineId = spineGrids[prevCol].findIndex((el) => el.indexOf(resource) !== -1);
                        let prevTopRow = spineGrids[prevCol][prevSpineId].indexOf(resource);
                        let prevBottomRow = spineGrids[prevCol][prevSpineId].lastIndexOf(resource);
                        //Determine if spines must be lengthened to connect up
                        if ((topRow <= prevBottomRow && topRow >= prevTopRow) || (bottomRow >= prevTopRow && bottomRow <= prevBottomRow)) {
                            //Intersecting already, don't bother
                        } else {
                            //Lengthening required
                            if (topRow > prevBottomRow) {
                                topRow = prevBottomRow + 0.75;
                            } else {
                                bottomRow = Math.max(prevTopRow, bottomRow);
                            }
                        }
                        //Determine how to connect up the two spines and log it for drawing after this spine is created
                        connectorRow = Math.min(bottomRow, prevBottomRow) + 1;
                        //Find which horizontal spine row to use
                        for (var s = 0; s < horizontalSpineConnectorCount; s++) {
                            let open = rowSpines[connectorRow][s].slice(prevCol, colI).every((x) => x === -1);
                            //Check previous & next to avoid overlap conflicts
                            if (rowSpines[connectorRow][s][prevCol - 1]) {
                                let spotVal = rowSpines[connectorRow][s][prevCol - 1];
                                open = open && (spotVal === -1 || spotVal === resource);
                            }
                            if (rowSpines[connectorRow][s][prevCol + 1]) {
                                let spotVal = rowSpines[connectorRow][s][prevCol + 1];
                                open = open && (spotVal === -1 || spotVal === resource);
                            }
                            //If no potential overlap conflicts and the spot is open, log it
                            if (open) {
                                for (var sp = prevCol; sp < prevCol + (colI - prevCol); sp++) {
                                    rowSpines[connectorRow][s][sp] = resource;
                                }
                                connectorVerticalRow = s;
                                prevSpineX = calculateSpineXWidth(prevCol, prevSpineId, spineCount)[0];
                                break;
                            }
                        }
                        if (prevSpineX === -1) {
                            console.warn("Failed to link up " + resource + " spines together on row " + connectorRow);
                        }
                        //Only look back to the last column with the same resource, that column will have handled previous connections
                        break;
                    }
                }
                //Find the first spine column that can accomodate this resource
                for (var s = 0; s < spineGrid.length; s++) {
                    let open = spineGrid[s].slice(topRow, bottomRow + 1).every((x) => x === -1);
                    if (open) {//spot located
                        spineGrid[s].fill(resource, topRow, bottomRow + 1);
                        let loc = calculateSpineXWidth(colI, s, spineGrid.length);
                        drawSpine(loc[0], getRowY(topRow), loc[1], (getRowY(bottomRow) - getRowY(topRow)) + rowInterval, resource, resource);
                        //Draw connectors
                        buildings.forEach((building) => {
                            //colI
                            let connectorBuildingData = getBuildingById(building);
                            let buildingElement = document.querySelector("[data-building-id='" + building + "']");
                            let input = buildingElement.querySelector("[data-input='" + resource + "']");
                            let output = buildingElement.querySelector("[data-output='" + resource + "']");
                            var isOutput = getBuildingComplexity(connectorBuildingData) === colI;
                            //Pick the one that exists
                            let connection = isOutput ? output : input;
                            let connectionBox = connection.getBoundingClientRect();
                            let x;
                            let width;
                            if (connection === output) {
                                x = connectionBox.x + connectionBox.width + getWindowOffsetX() + connectorPadding;
                                width = loc[0] - (connectionBox.x + connectionBox.width + getWindowOffsetX()) - (connectorPadding * 2) + 1;
                            } else {
                                x = loc[0];
                                width = (connectionBox.x + getWindowOffsetX()) - loc[0] - (connectorPadding * 2);
                            }
                            let y = connectionBox.y + getWindowOffsetY();
                            //Figure out input/output per day
                            let resourceInfo = calculateBuildingPerDayResource(connectorBuildingData, resource);
                            let line = drawLine(x, y, width, imgBoxHeight, resource, resourceInfo[0] + " t/d", "spineSubLine " + (isOutput ? "left" : "right"));
                            setInOutAttributes(line, building, !isOutput, resource);

                        });
                        //See if this spine needs to be connected to a different spine in a previous column
                        if (connectorRow !== -1) {
                            //A connector to a previous row is required
                            var yAndHeight = calculateSpineConnectorYHeight(connectorRow, connectorVerticalRow, horizontalSpineConnectorCount);
                            drawLine(prevSpineX, yAndHeight[0], loc[0] - prevSpineX, yAndHeight[1], resource, "");
                        }
                        break;
                    }
                }
            });
        });
        function setInOutAttributes(line, buildingId, isInput, resource) {
            line.setAttribute("data-line-isInput", isInput);
            line.setAttribute("data-line-building", buildingId);
            line.setAttribute("data-line-resource", resource);
        }

        function drawLine(x, y, width, height, resource, text, classes) {
            let line = createElement("div", flowchartDiv, "", classes ? classes : "spineSubLine");
            line.style.left = x + "px";
            line.style.top = y + "px";
            line.style.height = height + "px";
            line.style.width = width + "px";
            if (text !== "0 t/d") {
                line.innerHTML = text;
            }
            let colorData = getResourceColor(resource);
            line.style.backgroundColor = colorData.color;
            line.style.color = colorData.text;
            return line;
        }

        function getResourceColor(resource) {
            let color = null;
            if (resourceColors.has(resource)) {
                //Already loaded, return value
                color = resourceColors.get(resource);
            } else {
                //Try to load from XML
                for (const r of resourceData.getElementsByTagName("resources")[0].childNodes.entries()) {
                    var rName = getRowData("name", r[1]).textContent;
                    if (rName === resource) {
                        let txtColor = getRowData("textColor", r[1]);
                        txtColor = txtColor ? txtColor.textContent : "black";
                        //XML loaded, store for future loading
                        color = {color: getRowData("color", r[1]).textContent, "text": txtColor};
                        resourceColors.set(resource, color);
                        break;
                    }
                }
                //If XML did not have an entry, generate a random color
                if (!color) {
                    let backColor = "rgb(" + Math.floor(Math.random() * 255) + "," + Math.floor(Math.random() * 255) + "," + Math.floor(Math.random() * 255) + ")";
                    color = {color: backColor, text: "black"};
                    resourceColors.set(resource, color);

                }
            }
            return color;
        }

        function drawSpine(x, y, width, height, resource, text) {
            return drawLine(x, y, width, height, resource, text, "spineLine");
        }

        function calculateSpineConnectorYHeight(row, hSpineRow, numberOfConnectors) {
            const allocatedSpace = 20;
            const bottomBuffer = 5;
            let spineHeight = allocatedSpace / numberOfConnectors;
            return [getRowY(row) - allocatedSpace + (spineHeight * hSpineRow) - bottomBuffer, spineHeight];
        }

        function calculateSpineXWidth(column, spineColumn, numberOfSpines) {
            let start = (getColumnX(column) + columnElementWidth) + spineBufferSpace;
            let end = getColumnX(column + 1) - spineBufferSpace;
            let spineWidth = (end - start) / numberOfSpines;
            return [start + (spineColumn * spineWidth), spineWidth];
        }

        function getBuildingElement(col, row) {
            if (Array.isArray(col)) {
                row = col[1];
                col = col[0];
            }
            return document.querySelector("[data-column='" + col + "'][data-row='" + row + "']");
        }
    }

    function getBuildingIdByElement(element) {
        var count = -1;
        var categories = getRowData("productionBuildings", getRowData("allBuildings", buildingData)).childNodes;
        var indexValue = -1;
        categories.forEach((cat) => {
            if (cat.attributes[0].value !== "Template" && indexValue === -1) {
                if (cat.contains(element)) {
                    let index = [...cat.childNodes[0].childNodes].indexOf(element);
                    indexValue = index + count + 1;
                }
                let childCount = cat.childNodes[0].childNodes.length;
                count += childCount;
            }
        });
        return indexValue;
    }

    renderFlowchartBuildings();
    renderFlowchartResources();
}

function getBuildingInfoById(id) {
    var count = -1;
    var building = null;
    var category = null;
    var allData = getRowData("allBuildings", buildingData);
    allData.childNodes.forEach((buildingType) => {
        var categories = buildingType.childNodes;
        categories.forEach((cat) => {
            if (cat.attributes[0].value !== "Template" && building === null) {
                let catBuildings = getRowData("buildings", cat);
                let childCount = catBuildings.childNodes.length;
                if (id >= count + 1 && id <= count + childCount) {
                    building = catBuildings.childNodes[id - count - 1];
                    category = cat;
                } else {
                    count += childCount;
                }
            }
        });
    });
    return [building, category];
}

function getBuildingById(id) {
    return getBuildingInfoById(id)[0];
}

function getBuildingGridLocation(buildingId) {
    var c = -1;
    var r = -1;
    for (var col = 0; col < grid.length; col++) {
        r = grid[col].findIndex((rowEntry) => {
            if (Array.isArray(rowEntry)) {
                var index = rowEntry.indexOf(buildingId);
                return index !== -1;
            } else {
                return rowEntry === buildingId;
            }
        });
        if (r !== -1) {
            c = col;
            break;
        }
    }
    return [c, r];
}

function calculateInputsOutputs(filterDuplicates = false) {
    var inputs = {};
    var outputs = {};
    scanBuildings((building, i) => {
        var inputData = getRowData("inputs", building);
        var outputData = getRowData("outputs", building);
        if (inputData) {
            let inputsData = getProductionResources(inputData);
            inputsData.forEach((inputResource) => {
                let inputName = getRowData("name", inputResource).textContent;
                if (!inputs[inputName]) {
                    inputs[inputName] = [];
                }
                if (filterDuplicates === true) {
                    var gridCoords = getBuildingGridLocation(i);
                    if (gridCoords[0] !== -1 && gridCoords[1] !== -1) {
                        var gridEntry = grid[gridCoords[0]][gridCoords[1]];
                        //If this is the first (not the n>1) building in a grouping, add it. Others will be ignored.
                        if (Array.isArray(gridEntry) && !gridEntry.some((gridBuildingId) => inputs[inputName].indexOf(gridBuildingId) !== -1)) {
                            inputs[inputName].push(i);
                        } else if (!Array.isArray(gridEntry)) {
                            inputs[inputName].push(i);
                        }
                    }
                } else {
                    inputs[inputName].push(i);
                }
            });
        }
        if (outputData) {
            outputsData = getProductionResources(outputData);
            outputsData.forEach((outputResource) => {
                if (getRowData("nonProductionResource", outputResource) === null) {
                    let outputName = getRowData("name", outputResource).textContent;
                    if (!outputs[outputName]) {
                        outputs[outputName] = [];
                    }
                    if (filterDuplicates) {
                        var gridCoords = getBuildingGridLocation(i);
                        if (gridCoords[0] !== -1 && gridCoords[1] !== -1) {
                            var gridEntry = grid[gridCoords[0]][gridCoords[1]];
                            //If this is the first (not the n>1) building in a grouping, add it. Others will be ignored.
                            if (Array.isArray(gridEntry) && !gridEntry.some((gridBuildingId) => outputs[outputName].indexOf(gridBuildingId) !== -1)) {
                                outputs[outputName].push(i);
                            } else if (!Array.isArray(gridEntry)) {
                                outputs[outputName].push(i);
                            }
                        }
                    } else {
                        outputs[outputName].push(i);
                    }
                }
            });
        }
    }, null, selectedBuildings, null);
    return {inputs: inputs, outputs: outputs};
}

//Determines the highest complexity output of the building
function getBuildingComplexity(building) {
    let inputData = getRowData("inputs", building);
    var complexity = 0;
    if (inputData) {
        let inputResources = getProductionResources(inputData);
        for (let inputResource of inputResources.entries()) {
            inputResource = inputResource[1];
            if (getRowData("nonProductionResource", inputResource) === null) {
                let resourceName = getRowData("name", inputResource).textContent;
                complexity = Math.max(complexity, resourceStages.get(resourceName) + 1);
            }
        }
    }
    return complexity;
}

//Calls the passed function on each building in the database
//limit will only call certain categories
//idArrayToScan can limit to specific building Ids
//includeTypes can limit to specific building types (production,power,etc)
function scanBuildings(func, limit = null, idArrayToScan = [], typeLimit = null) {
    var i = 0;
    var dlcToScan = dlcDropdown.getSelected();
    var allBuildings = getRowData("allBuildings", buildingData);
    for (let buildingType of allBuildings.childNodes.entries()) {
        let typeName = buildingType[1].nodeName.split("Buildings")[0];
        for (let category of buildingType[1].childNodes.entries()) {
            //Ignore template category
            let categoryName = category[1].attributes[0].value;
            if (categoryName !== "Template") {
                let catBuildings = getRowData("buildings", category[1]);
                if ((typeLimit === null || (typeLimit.indexOf(typeName) !== -1)) && (limit === null || (limit.indexOf(categoryName) !== -1))) {
                    for (let building of catBuildings.childNodes.entries()) {
                        let buildingDlc = getRowData("dlc", building[1]);
                        if (idArrayToScan.length === 0 || (idArrayToScan.length !== 0 && idArrayToScan.indexOf(i) !== -1)) {
                            if (!buildingDlc || (buildingDlc && dlcToScan.includes(buildingDlc.textContent))) {
                                func(building[1], i, category[1]);
                            }
                        }
                        i++;
                    }
                } else {
                    i = i + catBuildings.childNodes.length;
                }
            }
        }
}
}
async function multiFetch(...Urls) {
    //Prepare promises for Promise.all
    var promises = [];
    Urls.forEach((url) => {
        promises.push(fetch(url));
    });
    var map = new Map();
    await Promise.all(promises).then(async (results) => {
        //Once results are in, create new Promise.all to read text
        var txtPromises = [];
        results.forEach((result) => {
            txtPromises.push(result.text());
        });
        await Promise.all(txtPromises).then((txts) => {
            //Extract text into maps
            txts.forEach((txt, i) => {
                map.set(Urls[i], parseXml(txt));
            });
        });
    });
    return map;
}

function parseXml(xmlText) {
    let xmlStripped = xmlText.replace(/>\s*/g, '>').replace(/\s*</g, '<');
    return new DOMParser().parseFromString(xmlStripped, "text/xml");
}

function getRenderViewsList() {
    return viewsDropdown.getSelected();
}

const resourceFilter = document.getElementById("resourceFilter");
const calcPerDayInput = document.getElementById("calculatorPerDayInput");
function prepareMenuElements() {
    clearChildren(resourceFilter);
    let allOpt = createElement("span", resourceFilter, "", "");
    allOpt.setAttribute("value", "*");
    createElement("label", allOpt, "All Resources", "");
    if (resourceStages) {
        var sortedResources = new Map([...resourceStages.entries()].sort((a, b) => a[1] - b[1]));
        sortedResources.forEach((stage, resource) => {
            if (stage > 0) {
                let opt = createElement("span", resourceFilter, "", "");
                opt.setAttribute("value", resource);
                createElement("img", opt, "", "").src = "resourceIcons/" + resource + ".png";
                createElement("label", opt, resource, "");
            }
        });
    }
    resourceFilter.onchange = function () {
        render(resourceFilter.value, getRenderViewsList());
        document.getElementById("calculatorSpan").style.display = resourceFilter.value === "*" ? "none" : "block";
        calcPerDayInput.value = "";
    };

    mechanicsDropdown.onblur = function () {
        render(resourceFilter.value, getRenderViewsList());
    };

    viewsDropdown.onblur = function () {
        render(resourceFilter.value, getRenderViewsList());
    };

    dlcDropdown.onblur = function () {
        render(resourceFilter.value, getRenderViewsList());
    };

    function processCalculatorActivation() {
        let tpd = parseFloat(calcPerDayInput.value);
        let productivity = parseInt(calcProductivityInput.value);
        let mineQuality = parseInt(calcMineQualityInput.value);
        //All numbers
        if (!isNaN(tpd) && !isNaN(productivity) && !isNaN(mineQuality)) {
            //All valid ranges
            if (tpd > 0 && tpd < 10000 & productivity > 0 && productivity <= 100 && mineQuality > 0 && mineQuality <= 100) {
                displayCalculator(resourceFilter.value, tpd, productivity, mineQuality);
            } else {
                render(resourceFilter.value, getRenderViewsList());
            }
        } else {
            render(resourceFilter.value, getRenderViewsList());
        }
    }
    calcPerDayInput.oninput = processCalculatorActivation;
    calcProductivityInput.oninput = processCalculatorActivation;
    calcMineQualityInput.oninput = processCalculatorActivation;
}

function handleStart() {
    document.fonts.ready.then(() => {
        loadData();
        prepareMenuElements();
    });
}

handleStart();

const calcProductivityInput = document.getElementById("calculatorAvgProductivityInput");
const calcMineQualityInput = document.getElementById("calculatorMineQualityInput");

function displayCalculator(resource = "", tpd = 10, productivity = parseInt(calcProductivityInput.value), minePurity = parseInt(calcMineQualityInput.value)) {
    productivity = productivity / 100;
    minePurity = minePurity / 100;
    //Go over all shown buildings and hide the indicator
    if (resource === "") {
        scanBuildings((b, i) => {
            let el = document.getElementById("calcCount-building-" + i);
            if (el) {
                el.style.display = "none";
            }
        }, null, selectedBuildings, null);
        //Only continue if a resource is requested
        return;
    }
    var inOuts = calculateInputsOutputs();
    var resourceRequirements = new Map();
    resourceRequirements.set(resource, tpd);
    //Render the resource, then calculate inputs
    var visitedBuildings = [];
    function performCalculations(calcResource) {
        let outputs = inOuts.outputs[calcResource];
        if (outputs) {
            outputs.forEach((buildingId) => {
                let calcBuildingData = getBuildingById(buildingId);
                let gridBuildingId = buildingId;
                let calcCountEl = document.getElementById("calcCount-building-" + buildingId);
                let groupedBuildingEl = flowchartDiv.querySelector("[data-building-id-selected='" + buildingId + "']");
                if (!calcCountEl && groupedBuildingEl) {
                    //A group has an option selected, use it and find the count indicator for the group
                    gridBuildingId = groupedBuildingEl.getAttribute("data-building-id");
                    calcCountEl = document.getElementById("calcCount-building-" + gridBuildingId);
                } else if (calcCountEl && calcCountEl.parentElement.hasAttribute("data-building-id-selected") &&
                        parseInt(calcCountEl.parentElement.getAttribute("data-building-id-selected")) !== buildingId) {
                    //Ignore, it's the primary in a group but not selected
                    calcCountEl = null;
                }
                if (calcCountEl) {
                    //Valid element, see how many buildings are required,
                    //then update the per-day values
                    calcCountEl.style.display = "block";
                    //Determine if a mining facility or not
                    let miningBuildings = getRowData("buildings", buildingData.querySelector("category[name='Mining']"));
                    let isMine = Array.from(miningBuildings.childNodes).indexOf(calcBuildingData) !== -1;
                    //Calculate numbers
                    let buildingOutPerDay = calculateBuildingPerDayResource(calcBuildingData, calcResource)[0];
                    let buildingCount;
                    if (buildingOutPerDay > 0) {
                        buildingCount = Math.ceil(resourceRequirements.get(calcResource) / (buildingOutPerDay * (isMine ? minePurity : productivity)));
                        calcCountEl.textContent = "x" + buildingCount;
                    } else {
                        buildingCount = 0;
                        calcCountEl.textContent = "";
                    }
                    //Update the output line
                    let outLine = document.querySelector("[data-line-isInput='false'][data-line-building='" + gridBuildingId + "'][data-line-resource='" + calcResource + "']");
                    updateLineText(outLine, roundDecimal(resourceRequirements.get(calcResource)), "t/d");
                    outLine.setAttribute("perDay", resourceRequirements.get(calcResource));
                    //Update garbage, water & sewage
                    let garbageData = getRowData("garbage", calcBuildingData);
                    if (garbageData) {
                        for (let garbageType of garbageData.childNodes.entries()) {
                            let garbageName = garbageType[1].nodeName;
                            let properGarbageName = garbageName[0].toUpperCase() + garbageName.replace(/([A-Z])/g, " $1").substring(1);
                            var resourceLine = document.querySelector("[data-line-isInput='false'][data-line-building='" + gridBuildingId + "'][data-line-resource='" + properGarbageName + "']");
                            if (resourceLine) {
                                let maxProduction = getRowData("maxProduction", garbageType[1]);
                                maxProduction = maxProduction ? maxProduction.textContent : 0;
                                let garbageTypeRatio = maxProduction / buildingOutPerDay;
                                maxProduction = roundDecimal(garbageTypeRatio * resourceRequirements.get(calcResource));
                                updateLineText(resourceLine, maxProduction, "t/d");
                            }
                        }
                    }
                    let sanitationData = getRowData("sanitation", calcBuildingData);
                    if (sanitationData) {
                        var waterResourceLine = document.querySelector("[data-line-isInput='true'][data-line-building='" + gridBuildingId + "'][data-line-resource='Water']");
                        if (waterResourceLine) {
                            let waterData = getRowData("water", sanitationData);
                            let buildingWaterConsumption = getRowData("maxConsumption", waterData).textContent;
                            let waterRatio = buildingWaterConsumption / buildingOutPerDay;
                            let waterConsumption = roundDecimal(waterRatio * resourceRequirements.get(calcResource));
                            updateLineText(waterResourceLine, waterConsumption, "m<sup>3</sup>/d");
                        }
                        var sewageResourceLine = document.querySelector("[data-line-isInput='false'][data-line-building='" + gridBuildingId + "'][data-line-resource='Sewage']");
                        if (sewageResourceLine) {
                            let sewageData = getRowData("sewage", sanitationData);
                            let buildingSewageProduction = getRowData("maxProduction", sewageData).textContent;
                            let sewageRatio = buildingSewageProduction / buildingOutPerDay;
                            let sewageProduction = roundDecimal(sewageRatio * resourceRequirements.get(calcResource));
                            updateLineText(sewageResourceLine, sewageProduction, "m<sup>3</sup>/d");
                        }
                    }
                    //Calculate Inputs
                    var buildingInputs = getRowData("inputs", calcBuildingData);
                    if (buildingInputs) {
                        let inputsData = getProductionResources(buildingInputs);
                        inputsData.forEach((inputResource) => {
                            let inputResourceName = getRowData("name", inputResource).textContent;
                            let inputResourceQty = calculateBuildingPerDayResource(calcBuildingData, inputResourceName)[0];
                            let ratio = inputResourceQty / buildingOutPerDay;
                            // T/D of the input required
                            let requiredInput = resourceRequirements.get(calcResource) * ratio;
                            if (!visitedBuildings.includes(buildingId)) {
                                if (resourceRequirements.has(inputResourceName)) {
                                    let prev = resourceRequirements.get(inputResourceName);
                                    resourceRequirements.set(inputResourceName, prev + requiredInput);
                                } else {
                                    resourceRequirements.set(inputResourceName, requiredInput);
                                }
                            }
                            //Handle line
                            let inLine = document.querySelector("[data-line-isInput='true'][data-line-building='" + gridBuildingId + "'][data-line-resource='" + inputResourceName + "']");
                            updateLineText(inLine, roundDecimal(requiredInput), "t/d");
                            //Recursive call to next level

                        });
                        visitedBuildings.push(buildingId);
                        inputsData.forEach((inputResource) => {
                            let inputResourceName = getRowData("name", inputResource).textContent;
                            performCalculations(inputResourceName);
                        });
                    }
                }
            });
        }
    }
    performCalculations(resource);
}

function updateBuildingLines(data, i, gridBuildingId, mechanics) {
    var inputData = getRowData("inputs", data[i]);
    var outputData = getRowData("outputs", data[i]);
    var garbageData = getRowData("garbage", data[i]);
    var sanitationData = getRowData("sanitation", data[i]);
    if (inputData) {
        let inputsData = getProductionResources(inputData);
        inputsData.forEach((inputResource) => {
            let inputName = getRowData("name", inputResource).textContent;
            var resourceLine = document.querySelector("[data-line-isInput='true'][data-line-building='" + gridBuildingId + "'][data-line-resource='" + inputName + "']");
            if (resourceLine) {
                resourceLine.textContent = calculateBuildingPerDayResource(data[i], inputName)[0] + " t/d";
            }
        });
    }
    if (outputData) {
        outputsData = getProductionResources(outputData);
        outputsData.forEach((outputResource) => {
            let outputName = getRowData("name", outputResource).textContent;
            var resourceLine = document.querySelector("[data-line-isInput='false'][data-line-building='" + gridBuildingId + "'][data-line-resource='" + outputName + "']");
            if (resourceLine) {
                resourceLine.textContent = calculateBuildingPerDayResource(data[i], outputName)[0] + " t/d";
            }
        });
        //garbage
        if (garbageData && mechanics.includes("garbage")) {
            for (let garbageType of garbageData.childNodes.entries()) {
                let garbageName = garbageType[1].nodeName;
                let properGarbageName = garbageName[0].toUpperCase() + garbageName.replace(/([A-Z])/g, " $1").substring(1);
                var resourceLine = document.querySelector("[data-line-isInput='false'][data-line-building='" + gridBuildingId + "'][data-line-resource='" + properGarbageName + "']");
                if (resourceLine) {
                    let maxProduction = getRowData("maxProduction", garbageType[1]);
                    maxProduction = maxProduction ? maxProduction.textContent : 0;
                    resourceLine.textContent = maxProduction + " t/d";
                }
            }
        }
        //Sanitation
        if (sanitationData && mechanics.includes("sanitation")) {
            var waterResourceLine = document.querySelector("[data-line-isInput='true'][data-line-building='" + gridBuildingId + "'][data-line-resource='Water']");
            if (waterResourceLine) {
                let waterData = getRowData("water", sanitationData);
                let waterConsumption = getRowData("maxConsumption", waterData).textContent;
                waterResourceLine.innerHTML = waterConsumption + " m<sup>3</sup>/d";
            }
            var sewageResourceLine = document.querySelector("[data-line-isInput='false'][data-line-building='" + gridBuildingId + "'][data-line-resource='Sewage']");
            if (sewageResourceLine) {
                let sewageData = getRowData("sewage", sanitationData);
                let sewageProduction = getRowData("maxProduction", sewageData).textContent;
                sewageResourceLine.innerHTML = sewageProduction + " m<sup>3</sup>/d";
            }
        }
    }
}

function getColumnX(columnNo) {
    return columnNo * columnInterval + 10;
}

function getRowY(rowNo) {
    return rowNo * rowInterval + 10;
}

function getRowData(name, loc) {
    for (const k of loc.childNodes.entries()) {
        if (k[1].nodeName === name) {
            return k[1];
        }
    }
    return null;
}

function calculateBuildingPerDayResource(building, resource) {
    buildingInputs = getRowData("inputs", building);
    buildingOutputs = getRowData("outputs", building);
    var perDay = 0;
    var isInput = false;
    if (buildingInputs) {
        for (let inputResource of buildingInputs.childNodes.entries()) {
            inputResource = inputResource[1];
            if (getRowData("name", inputResource).textContent === resource) {
                perDay = parseFloat(getRowData("maxConsumption", inputResource).textContent);
                isInput = true;
                break;
            }
        }
    }
    if (isInput === false && buildingOutputs) {
        for (let outputResource of buildingOutputs.childNodes.entries()) {
            outputResource = outputResource[1];
            if (getRowData("name", outputResource).textContent === resource) {
                if (getRowData("maxProduction", outputResource)) {
                    //Building has a fixed production
                    perDay = parseFloat(getRowData("maxProduction", outputResource).textContent);
                } else if (getRowData("perWorker", outputResource)) {
                    //Building output is dependant on workers present, calculate max
                    buildingWorkers = calculateBuildingWorkers(building);
                    perDay = buildingWorkers * parseFloat(getRowData("perWorker", outputResource).textContent);
                }
                //Farms and others with 0 t/d will use 0 as variable default value
                break;
            }
        }
    }
    return [perDay, isInput ? "input" : "output"];
}

function calculateBuildingWorkers(building) {
    var uneducatedWorkers = getRowData("workers", building);
    var educatedWorkers = getRowData("educatedWorkers", building);
    var buildingWorkers = 0 + (uneducatedWorkers ? parseInt(uneducatedWorkers.textContent) : 0) + (educatedWorkers ? parseInt(educatedWorkers.textContent) : 0);
    return buildingWorkers;
}

function getProductionResources(inputData) {
    var resources = [];
    for (let inputResource of inputData.childNodes.entries()) {
        inputResource = inputResource[1];
        if (getRowData("nonProductionResource", inputResource) === null) {
            resources.push(inputResource);
        }
    }
    return resources;
}

function createElement(type, appendTo, textContent, tags) {
    let el = document.createElement(type);
    appendTo.append(el);
    el.textContent = textContent;
    if (tags) {
        el.className = tags;
    }
    return el;
}

function createPrependElement(type, prependTo, textContent, tags) {
    let el = document.createElement(type);
    prependTo.prepend(el);
    el.textContent = textContent;
    if (tags) {
        el.className = tags;
    }
    return el;
}

function clearChildren(element) {
    while (element.firstChild) {
        element.removeChild(element.lastChild);
    }
}

function getWindowOffsetX() {
    return window.scrollY + flowchartDiv.scrollLeft - graphHorizontalOffset;
}

function getWindowOffsetY() {
    return window.scrollY + flowchartDiv.scrollTop - graphVerticalOffset;
}

function roundDecimal(number) {
    if (number > 10) {
        return Math.ceil(number);
    } else if (number < 1) {
        return Math.round(number * 100) / 100;
    } else {
        return Math.round(number * 10) / 10;
    }
}

function updateLineText(line, number, unit) {
    if (number === 0) {
        line.innerHTML = "";
    } else {
        line.innerHTML = number + " " + unit;
    }
}
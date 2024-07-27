/* global createElement, getRowData */

class renderStrategy {
    primaryId;
    holder;
    subHolder;
    mechanicsToRender;

    constructor(column, row, primaryId, appendTo, mechanics) {
        this.primaryId = primaryId;
        this.mechanicsToRender = mechanics;
        let holder = createElement("div", appendTo, "", "containerBox");
        let x = getColumnX(column);
        let y = getRowY(row);
        holder.setAttribute("data-column", column);
        holder.setAttribute("data-row", row);
        holder.style.top = y + "px";
        holder.style.left = x + "px";
        holder.setAttribute("data-building-id", primaryId);
        createElement("div", holder, "", "calcCount hidden").id = "calcCount-building-" + primaryId;
        this.subHolder = createElement("div", holder, "", "subContainerBox");
        this.holder = holder;
    }

    createIconedTextRow(imgSrc, imgLabel, text, appendTo, justifyLeft) {
        let rowHolder = createElement("span", appendTo);
        let rowImageTag = createElement("img", rowHolder, "", "gameIco");
        rowImageTag.src = imgSrc;
        rowImageTag.title = imgLabel;
        let lbl = createElement("label", rowHolder, text);
        if (justifyLeft === false) {
            rowHolder.style.flexDirection = "row-reverse";
            lbl.style.textAlign = "right";
        }
        return rowHolder;
    }

    createInfoPanel(buildingData, appendTo) {
        let powerConsumed = getRowData("power", buildingData);
        let powerGenerated = getRowData("maxPowerGeneration", buildingData);
        if (powerConsumed !== null || powerGenerated !== null) {
            let powerTxt = powerConsumed !== null ? powerConsumed.textContent : powerGenerated.textContent;
            this.createIconedTextRow("icons/electric.png", "Power " + (powerConsumed ? "Consumed" : "Generated"), powerTxt + " " + (powerConsumed ? "KW" : "MW"), appendTo, true);
        }
        //Standard workers
        let workerData = getRowData("workers", buildingData);
        if (workerData) {
            this.createIconedTextRow("icons/uneducatedWorker.png", "Workers", workerData.textContent, appendTo, true);
        }
        //Educated workers
        let  educatedWorkerData = getRowData("educatedWorkers", buildingData);
        if (educatedWorkerData) {
            this.createIconedTextRow("icons/educatedWorker.png", "Educated Workers", educatedWorkerData.textContent, appendTo, true);
        }
        let dlcData = getRowData("dlc", buildingData);
        if (dlcData) {
            let dlcText = dlcData.textContent;
            this.createIconedTextRow("dlcIcons/" + dlcText + ".png", "This building comes with the " + dlcText + " DLC", dlcText + " DLC", appendTo, true);
        }
    }

    createInputsOutputs(buildingData, appendTo) {
        let inputData = getRowData("inputs", buildingData);
        let outputData = getRowData("outputs", buildingData);
        if (!inputData && !outputData) {
            return;
        }
        let inOutHolder = createElement("div", appendTo, "", "inOutContainer");
        let inHolder = createElement("div", inOutHolder, "", "inContainer");
        if (inputData) {
            for (let inputResource of inputData.childNodes.entries()) {
                let inputObject = inputResource[1];
                let resourceName = getRowData("name", inputObject).textContent;
                let resourceCapacity = getRowData("capacity", inputObject).textContent;
                this.createIconedTextRow("resourceIcons/" + resourceName + ".png", resourceName, resourceCapacity + " t", inHolder, true).setAttribute("data-input", resourceName);
            }
        }
        //Outputs
        let outHolder = createElement("div", inOutHolder, "", "outContainer");
        if (outputData) {
            for (let outputResource of outputData.childNodes.entries()) {
                let outputObject = outputResource[1];
                let resourceName = getRowData("name", outputObject).textContent;
                let resourceCapacity = getRowData("capacity", outputObject).textContent;
                this.createIconedTextRow("resourceIcons/" + resourceName + ".png", resourceName, resourceCapacity + " t", outHolder, false).setAttribute("data-output", resourceName);
            }
        }
    }

    createConnections(buildingData, appendTo) {
        let connectionData = getRowData("connections", buildingData);
        if (connectionData) {
            let connectionHolder = createElement("div", appendTo, "", "connectionContainer");
            for (let connectionType of connectionData.childNodes.entries()) {
                let connectionName = connectionType[1].nodeName[0].toUpperCase() + connectionType[1].nodeName.replace(/([A-Z])/g, " $1").substring(1);
                let connectionCount = connectionType[1].textContent;
                this.createIconedTextRow("connectionIcons/" + connectionType[1].nodeName + ".png", connectionName, "x" + connectionCount, connectionHolder, true);
            }
        }
    }
}

class standardRender extends renderStrategy {
    renderSingle(buildingData) {
        clearChildren(this.subHolder);
        createElement("label", this.subHolder, buildingData.attributes[0].value, "title");
        let imageAreaContainer = createElement("div", this.subHolder, "", "imageAreaContainer");
        let imageStatsContainer = createElement("div", imageAreaContainer, "");
        let imageContainer = createElement("div", imageAreaContainer, "", "mainImageContainer");
        let imageTag = createElement("img", imageContainer);
        imageTag.src = "buildingImages/tool_" + buildingData.attributes[1].value + ".png";
        //Building info (workers, power, dlc)
        this.createInfoPanel(buildingData, imageStatsContainer);
        //Inputs & Outputs
        this.createInputsOutputs(buildingData, this.subHolder);
        //Garbage
        let garbageData = getRowData("garbage", buildingData);
        if (garbageData && this.mechanicsToRender.includes("garbage")) {
            let garbageContainer = createElement("div",this.subHolder,"","garbageContainer");
            for (let garbageType of garbageData.childNodes.entries()) {
                let garbageName = garbageType[1].nodeName[0].toUpperCase() + garbageType[1].nodeName.replace(/([A-Z])/g, " $1").substring(1);
                let garbageCapacity = getRowData("capacity", garbageType[1]).textContent;
                this.createIconedTextRow("garbageIcons/" + garbageType[1].nodeName + ".png", garbageName, garbageCapacity + " t", garbageContainer, false).setAttribute("data-garbage", garbageType[1].nodeName);
            }
        }
        let sanitationData = getRowData("sanitation", buildingData);
        if (sanitationData && this.mechanicsToRender.includes("sanitation")) {
            let sanitationHolder = createElement("div", this.subHolder, "", "sanitationContainer");
            let waterData = getRowData("water", sanitationData);
            if (waterData) {
                let waterCapacity = getRowData("capacity", waterData).textContent;
                this.createIconedTextRow("resourceIcons/Water.png", "Water", waterCapacity + "m", sanitationHolder, true).setAttribute("data-sanitation", "water");
            }
            let sewageData = getRowData("sewage", sanitationData);
            if (sewageData) {
                let sewageCapacity = getRowData("capacity", sewageData).textContent;
                this.createIconedTextRow("resourceIcons/Sewage.png", "Sewage", sewageCapacity + "m", sanitationHolder, false).setAttribute("data-sanitation", "sewage");
            }
        }
        //Connections
        this.createConnections(buildingData, this.subHolder);
    }
    //"render" will get overriden if multiStandardRender, but "renderSingle" will not
    //multiStandardRender will call renderSingle for internal display and this function
    //wil passthrough if not a multi
    render(buildingData) {
        this.renderSingle(buildingData);
    }
}
;

class multiStandardRender extends standardRender {
    buildingsData;
    buildingsIds;

    render(buildingsData, buildingsIds) {
        super.renderSingle(buildingsData[0]);
        this.buildingsData = buildingsData;
        this.buildingsIds = buildingsIds;
        this.holder.setAttribute("data-building-id-selected", this.primaryId);
        let multiBuildingContainer = createElement("div", this.holder, "", "multiBuildingContainer");
        buildingsData.forEach((building, i) => {
            let bSpan = createElement("span", multiBuildingContainer, "", i === 0 ? "selected" : "");
            bSpan.title = building.attributes[0].value;
            this.handleOptionChange(multiBuildingContainer, bSpan, i);
            let bImg = createElement("img", bSpan, "", "");
            bImg.src = "buildingImages/tool_" + building.attributes[1].value + ".png";
        });
    }

    handleOptionChange(container, span, i) {
        let holder = this.holder;
        span.onclick = (() => {//Arrow function required to not lose "this" context
            //Handle switching the UI
            container.childNodes.forEach((span) => {
                span.className = "";
            });
            container.childNodes[i].className = "selected";
            //Handle the rendering
            holder.setAttribute("data-building-id-selected", this.buildingsIds[i]);
            super.renderSingle(this.buildingsData[i]);
            //Determine if calculator is active
            if (document.getElementById("calcCount-building-" + this.buildingsIds[0]).style.display !== "block") {
                //Switch resource values on lines
                updateBuildingLines(this.buildingsData, i, this.buildingsIds[0], this.mechanicsToRender);
            } else {
                //Call the calculator to update
                let outputData = getRowData("outputs", this.buildingsData[i]);
                if (outputData) {
                    outputData = getProductionResources(outputData);
                    outputData.forEach((outputResource) => {
                        let outputName = getRowData("name", outputResource).textContent;
                        let line = document.querySelector("[data-line-isInput='false'][data-line-building='" + this.buildingsIds[0] + "'][data-line-resource='" + outputName + "']");
                        displayCalculator(outputName, parseFloat(line.getAttribute("perDay")));
                    });
                }

            }
        });
    }
}
;

class compressedRender extends renderStrategy {
    render(category, startId) {
        let buildings = getRowData("buildings", category);
        this.holder.removeAttribute("data-building-id");
        this.subHolder.remove();
        buildings.childNodes.forEach((buildingData, i) => {
            let buildingDiv = createElement("div", this.holder, "", "compressedBuilding");
            buildingDiv.setAttribute("data-building-id", startId + i);
            if (i === 0) {//First one will already have calc element from constructor, but its attached to wrong el
                document.getElementById("calcCount-building-" + startId).remove();
            }
            createElement("div", buildingDiv, "", "calcCount hidden").id = "calcCount-building-" + (startId + i);
            //Name & Image
            let titleContainer = createElement("div", buildingDiv, "", "compressedTitleContainer");
            createElement("label", titleContainer, buildingData.attributes[0].value, "smallTitle");
            createElement("img", titleContainer).src = "buildingImages/tool_" + buildingData.attributes[1].value + ".png";
            //Display info
            let statsContainer = createElement("div", buildingDiv, "", "compressedInfo");
            this.createInfoPanel(buildingData, statsContainer);
            this.createInputsOutputs(buildingData, buildingDiv);
            if (getRowData("showConnections", category)) {
                this.createConnections(buildingData, buildingDiv);
            }
        });
    }
}
;
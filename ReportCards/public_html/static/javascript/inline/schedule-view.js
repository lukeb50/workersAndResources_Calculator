/* global firebase, initClientDatabase, clientDb, XLSX */

const loadspinner = document.getElementById("loadspinner");
const sheetinfomenu = document.getElementById("sheetinfo-menu");
const configmenu = document.getElementById("config-menu");
const mainmenu = document.getElementById("main-menu");
const close_mainmenu = document.getElementById("main-menu-close-btn");
const loaditms = [loadspinner, sheetinfomenu, configmenu];

var scheduleData = [];
var People = [];

var Levels = {};
var GroupingData = [];

var editMode = true;

const scheduleTable = document.getElementById("scheduleTable");
var timeIntervalId = -1;
function displaySchedule(Time) {
    clearChildren(scheduleTable);
    if (Time === null || Time === "" || !Time) {
        return;
    }
    //create top row with instructor names
    var headerRow = document.createElement("tr");
    //Time text
    var timeBox = document.createElement("th");
    timeBox.textContent = "Time";
    headerRow.appendChild(timeBox);
    //Create instructors
    for (var p = 0; p < People.length; p++) {
        var instHeader = document.createElement("th");
        instHeader.textContent = People[p].Name;
        if (editMode === true) {
            bindAddClassClick(instHeader, p);
        }
        headerRow.appendChild(instHeader);
    }
    //append row to table
    scheduleTable.appendChild(headerRow);
    //calculate table spacing
    var tableInformation = calculateTimeSpacing(scheduleData);
    //create intervals
    for (var t = tableInformation.firstStart; t < tableInformation.lastEnd; t = t + tableInformation.increment) {
        var timerow = document.createElement("tr");
        var timeLbl = document.createElement("td");
        //TimeStart value converted to hour:minute with provision for xx:0y times (first 9 minutes leading 0)
        timeLbl.textContent = convertTimeReadable(t);
        timeLbl.id = "time-" + t;
        timerow.appendChild(timeLbl);
        //Handle any times to display
        for (var i = 0; i < scheduleData.length; i++) {
            var isLesson = false;
            for (var s = 0; s < scheduleData[i].length; s++) {
                var currentSheet = scheduleData[i][s];
                if (getClassProperty(currentSheet, "TimeStart") === t) {
                    isLesson = true;
                    var lessonHolder = document.createElement("td");
                    lessonHolder.className = "lesson";
                    lessonHolder.rowSpan = getClassDuration(currentSheet) / tableInformation.increment;
                    lessonHolder.style.backgroundColor = getLevelColor(getClassProperty(currentSheet, "Level"));
                    createSheetListing(lessonHolder, i, s);
                    timerow.appendChild(lessonHolder);
                } else if (t >= getClassProperty(currentSheet, "TimeStart") && t < getClassProperty(currentSheet, "TimeStart") + getClassDuration(currentSheet)) {
                    isLesson = true;
                }
            }
            if (isLesson === false) {
                var blockBreak = document.createElement("td");
                timerow.appendChild(blockBreak);
            }
        }
        scheduleTable.appendChild(timerow);
    }

    var currentTime = new Date();
    clearInterval(timeIntervalId);
    waitMinute();
    updateCurrentTime();
    function waitMinute() {
        var current = new Date();
        var timeToNextMinute = (60 - current.getSeconds()) * 1000 - current.getMilliseconds();
        timeIntervalId = setTimeout(function () {
            updateCurrentTime();
            waitMinute();
        }, timeToNextMinute);
    }

    function updateCurrentTime() {
        currentTime = new Date();
        var timeStamp = (currentTime.getHours() * 60) + currentTime.getMinutes();
        if (timeStamp >= tableInformation.firstStart && timeStamp < tableInformation.lastEnd) {
            //Time exists inside table range
            var timeEl = document.getElementById("time-" + roundDown5(timeStamp));
            var topPos = timeEl.getBoundingClientRect().top + window.scrollY;
            var minuteSize = timeEl.getBoundingClientRect().height / tableInformation.increment;
            var minutePos = topPos + (minuteSize * (timeStamp - roundDown5(timeStamp)));
            if (!document.getElementById("timeLine")) {
                var timeLine = document.createElement("div");
                timeLine.id = "timeLine";
                document.body.appendChild(timeLine);
            }
            var timeLine = document.getElementById("timeLine");
            timeLine.style.top = minutePos + "px";
            timeLine.style.left = (timeEl.getBoundingClientRect().left + timeEl.getBoundingClientRect().width + 1) + "px";
        }

        function roundDown5(x) {
            return Math.floor(x / 5) * 5;
        }
    }

    function createSheetListing(table, inst, sheetI) {
        var sheet = scheduleData[inst][sheetI];
        var isCombo = Array.isArray(sheet);
        var holder = document.createElement("div");
        table.appendChild(holder);
        //create labels
        var lvlText = document.createElement("b");
        if (!isCombo) {
            lvlText.textContent = getLevelName(sheet);
        } else {
            var lvlNameArr = [];
            for (var i = 0; i < sheet.length; i++) {
                lvlNameArr.push(getLevelName(sheet[i]));
            }
            lvlText.textContent = lvlNameArr.join(", ");
        }
        holder.appendChild(lvlText);
        var barcodeText = document.createElement("label");
        if (!isCombo) {
            barcodeText.textContent = sheet.Barcode;
        } else {
            var bCodeArr = [];
            for (var i = 0; i < sheet.length; i++) {
                bCodeArr.push(sheet[i].Barcode);
            }
            barcodeText.textContent = bCodeArr.join(", ");
        }
        holder.appendChild(barcodeText);
        var studentText = document.createElement("label");
        studentText.className = "light";
        if (!isCombo) {
            studentText.textContent = sheet.Names.length + " Registered";
        } else {
            var stuCountArr = [];
            for (var i = 0; i < sheet.length; i++) {
                stuCountArr.push(sheet[i].Names.length);
            }
            studentText.textContent = stuCountArr.join(", ") + " Registered";
        }
        holder.appendChild(studentText);
        var timeText = document.createElement("label");
        timeText.className = "light";
        timeText.textContent = convertTimeReadable(getClassProperty(sheet, "TimeStart")) + " - " + convertTimeReadable(getClassProperty(sheet, "TimeStart") + getClassDuration(sheet));
        holder.appendChild(timeText);
        bindSheetClick(holder, inst, sheetI);
    }

    function getLevelName(sheet) {
        return Levels[sheet.Level] ? Levels[sheet.Level].Name : sheet.Level;
    }

    function bindSheetClick(div, i, s) {
        div.onclick = function () {
            displaySheetMenu(i, s);
        };
    }

    function displaySheetMenu(i, s) {
        clearChildren(sheetinfomenu);
        sheet = scheduleData[i][s];
        if (Array.isArray(sheet)) {
            sheet.forEach((c) => {
                createSheetMenu(sheetinfomenu, c, i, s);
            });
        } else {
            createSheetMenu(sheetinfomenu, sheet, i, s);
        }
        resetloader(false, sheetinfomenu, "flex");
    }

    function createSheetMenu(div, sheet, instructor, sheeti) {
        var title = document.createElement("h1");
        title.textContent = getLevelName(sheet) + " - " + sheet.Barcode;
        div.appendChild(title);
        if (editMode === true) {
            var titleEdits = document.createElement("span");
            var nameEdit = document.createElement("button");
            nameEdit.textContent = "Edit Level";
            nameEdit.onclick = function () {
                var newLevel = prompt("Enter level name");
                if (newLevel) {
                    var potentialLvlId = determineLevelId(newLevel);
                    if (potentialLvlId) {
                        sheet.Level = potentialLvlId;
                        delete sheet.Duration;
                        displaySheetMenu(instructor, sheeti);
                        displaySchedule(true);
                    } else {
                        var dur = parseInt(prompt("Enter lesson duration in minutes"));
                        if (!isNaN(dur) && dur > 0) {
                            sheet.Level = newLevel;
                            sheet.Duration = dur;
                            displaySheetMenu(instructor, sheeti);
                            displaySchedule(true);
                        } else {
                            alert("No change made, invalid time");
                        }
                    }
                }
            };
            titleEdits.appendChild(nameEdit);
            var barcodeEdit = document.createElement("button");
            barcodeEdit.textContent = "Edit Code";
            barcodeEdit.onclick = function () {
                var newCode = prompt("Enter new barcode");
                if (newCode && !isNaN(parseInt(newCode))) {
                    sheet.Barcode = parseInt(newCode);
                    displaySheetMenu(instructor, sheeti);
                    displaySchedule(true);
                }
            };
            titleEdits.appendChild(barcodeEdit);
            var timeEdit = document.createElement("button");
            timeEdit.textContent = "Edit Start";
            timeEdit.onclick = function () {
                var newTime = prompt("Enter new start time in 12h format (MM:HH PM)");
                if (newTime && convertToTimeStartTwelveHour(newTime)) {
                    sheet.TimeStart = convertToTimeStartTwelveHour(newTime);
                    displaySheetMenu(instructor, sheeti);
                    displaySchedule(true);
                }
            };
            titleEdits.appendChild(timeEdit);
            titleEdits.className = "edit_title";
            if (sheet.Duration) {
                var durEdit = document.createElement("button");
                durEdit.textContent = "Edit Duration";
                durEdit.onclick = function () {
                    var dur = parseInt(prompt("Enter lesson duration in minutes"));
                    if (!isNaN(dur) && dur > 0) {
                        sheet.Duration = dur;
                        displaySheetMenu(instructor, sheeti);
                        displaySchedule(true);
                    }
                };
                titleEdits.appendChild(durEdit);
            }
            var deleteEdits = document.createElement("button");
            deleteEdits.textContent = "Delete";
            deleteEdits.onclick = function () {
                console.log(sheeti);
                if (confirm("Delete this sheet?")) {
                    if (Array.isArray(scheduleData[instructor][sheeti])) {
                        console.log(sheeti);
                        scheduleData[instructor][sheeti].splice(scheduleData[instructor][sheeti].indexOf(sheet), 1);
                        if (scheduleData[instructor][sheeti].length === 1) {
                            scheduleData[instructor][sheeti] = scheduleData[instructor][sheeti][0];
                        }
                    } else {
                        scheduleData[instructor].splice(sheeti, 1);
                    }
                    displaySchedule(true);
                    resetloader(false, null, null);
                }
            };
            titleEdits.appendChild(deleteEdits);
            div.appendChild(titleEdits);
        }
        var time = document.createElement("label");
        time.textContent = convertTimeReadable(sheet.TimeStart) + " - " + convertTimeReadable(sheet.TimeStart + getClassDuration(sheet));
        div.appendChild(time);
        var inst = document.createElement("label");
        inst.textContent = People[instructor].Name;
        div.appendChild(inst);
        var nameList = document.createElement("ul");
        div.appendChild(nameList);
        sheet.Names.forEach((name, i) => {
            var item = document.createElement("li");
            item.textContent = name;
            nameList.appendChild(item);
            if (editMode === true) {
                var editbtn = document.createElement("button");
                editbtn.textContent = "Change";
                bindStudentNameChange(editbtn, sheet, sheeti, instructor, i);
                item.appendChild(editbtn);
                var delbtn = document.createElement("button");
                delbtn.textContent = "-";
                bindStudentDelete(delbtn, sheet, sheeti, instructor, i);
                item.appendChild(delbtn);
            }
        });
        if (editMode === true) {
            var addbtn = document.createElement("button");
            addbtn.textContent = "Add Student";
            addbtn.className = "addstudent";
            addbtn.onclick = function () {
                var newName = prompt("Enter new student name");
                if (newName) {
                    sheet.Names.push(newName);
                    displaySheetMenu(instructor, sheeti);
                    displaySchedule(true);
                }
            };
            div.appendChild(addbtn);
        }
    }

    function bindStudentNameChange(btn, sheet, sheeti, instructor, studentI) {
        btn.onclick = function () {
            var newName = prompt("Enter new name");
            if (newName) {
                sheet.Names[studentI] = newName;
                displaySheetMenu(instructor, sheeti);
            }
        };
    }

    function bindStudentDelete(btn, sheet, sheeti, instructor, studentI) {
        btn.onclick = function () {
            if (confirm("Delete " + sheet.Names[studentI] + "?")) {
                sheet.Names.splice(studentI, 1);
                displaySheetMenu(instructor, sheeti);
                displaySchedule(true);
            }
        };
    }

    function bindAddClassClick(instHeader, p) {
        instHeader.onclick = function () {
            var lvl = prompt("Enter level");//null
            var code = parseInt(prompt("Enter barcode"));//NaN
            var start = convertToTimeStartTwelveHour(prompt("Enter start time HH:MM PM"));//null
            //determineLevelId
            if (lvl && !isNaN(code) && start !== null) {
                if (determineLevelId(lvl) !== null) {
                    scheduleData[p].push({Level: determineLevelId(lvl), Barcode: code, Names: [], TimeStart: start});
                    displaySchedule(true);
                } else {
                    var dur = prompt("Enter class duration in minutes");
                    if (!dur || isNaN(parseInt(dur))) {
                        return;
                    }
                    scheduleData[p].push({Level: lvl, Barcode: code, Names: [], TimeStart: start, Duration: parseInt(dur)});
                    displaySchedule(true);
                }
            }
        };
    }
}

function convertTimeReadable(t, useTwelveHour) {
    useTwelveHour = true;
    if (useTwelveHour === false) {//24 hour clock
        return Math.floor(t / 60) + ":" + (t % 60 <= 9 ? "0" + (t % 60) : t % 60);
    } else {// 12 hour clock (am pm)
        var hour = Math.floor(t / 60);
        return (hour <= 12 ? hour : hour - 12) + ":" + (t % 60 <= 9 ? "0" + (t % 60) : t % 60) + " " + (hour < 12 ? "am" : "pm");
    }
}

function getLevelColor(LevelId) {
    if (!Levels[LevelId]) {//TODO:Excel sheet code
        return "#ffffff";
    }
    var LevelName = Levels[LevelId].Name;
    for (var g = 0; g < GroupingData.length; g++) {
        if (GroupingData[g].Regex.test(LevelName) === true) {
            var color = GroupingData[g].Color;
            return "rgba(" + HexToDecimal(color, 1) + "," + HexToDecimal(color, 2) + "," + HexToDecimal(color, 3) + ",0.22)";
        }
    }
    return "#ffffff";
}

//Function to calculate data for main table
//including start, end times & display interval
function calculateTimeSpacing(sheets) {
    var firstStart = Number.MAX_SAFE_INTEGER; //Large number for math.min, when first class starts
    var lastEnd = 0; //time the last class ends
    var spacingTimes = []; //Array of all durations in the schedule
    for (var uI = 0; uI < sheets.length; uI++) {
        sheets[uI].sort((a, b) => {//sort so we can pull prev sheet to calculate breaks
            return parseInt(a.TimeStart) - parseInt(b.TimeStart);
        });
        for (var s = 0; s < sheets[uI].length; s++) {
            var sheet = sheets[uI][s];
            var potentialHolder = [];
            for (var i = s + 1; i < sheets[uI].length; i++) {
                var nxt = sheets[uI][i];
                if (nxt.TimeStart === sheet.TimeStart) {
                    if (getClassDuration(nxt) === getClassDuration(sheet)) {
                        potentialHolder.push(nxt);
                        sheets[uI].splice(i, 1);
                    } else {
                        console.log("Sheet cannot be grouped, discarding");
                        alert("Two sheets exist with the same instructor and starting time, but do not finish at the same time. Only one sheet will still display.");
                        sheets[uI].splice(i, 1);
                    }
                }
            }
            if (potentialHolder.length > 0) {
                potentialHolder.unshift(sheet);
                sheets[uI].splice(s, 1);
                sheets[uI].splice(s, 0, potentialHolder);
            }
        }
        for (var sI = 0; sI < sheets[uI].length; sI++) {
            //how long the class lasts
            var dur = getClassDuration(sheets[uI][sI]);
            firstStart = Math.min(firstStart, getClassProperty(sheets[uI][sI], "TimeStart"));
            lastEnd = Math.max(lastEnd, getClassProperty(sheets[uI][sI], "TimeStart") + dur);
            if (spacingTimes.indexOf(dur) === -1) {
                spacingTimes.push(dur); //add duration if it does not yet exist
            }
            if (sI > 0) {//if not the first class for the instructor, calculate break with previous class
                var prevSheet = sheets[uI][sI - 1];
                var prevEnd = getClassProperty(prevSheet, "TimeStart") + getClassDuration(prevSheet);
                var spacingDur = getClassProperty(sheets[uI][sI], "TimeStart") - prevEnd; //break duration
                if (spacingTimes.indexOf(spacingDur) === -1) {
                    spacingTimes.push(spacingDur); //add duration if it does not yet exist
                }
            }
        }
    }
    return {firstStart: firstStart, lastEnd: lastEnd, increment: multiGCD(spacingTimes)};
}

function getClassDuration(c) {
    if (Array.isArray(c)) {
        return getClassDuration(c[0]);
    } else if (!isNaN(c.Level)) {
        return parseInt(Levels[c.Level].Settings.Duration);
    } else if (isNaN(c.Level)) {
        return c.Duration;
    }
    return 0;
}

function getClassProperty(c, p) {
    if (Array.isArray(c)) {
        return c[0][p];
    } else {
        return c[p];
    }
}

//Greatest common denominator for n values
function multiGCD(values) {
    if (values.length === 0) {
        return 0;
    }
    var f = values[0];
    for (var i = 1; i < values.length; i++) {
        f = GCD(f, values[i]);
    }
    return f;
}


//GCD for n=2 values, helper function for multiGCD
function GCD(a, b) {
    if (b === 0) {
        return a;
    }
    return GCD(b, a % b);
}

async function getGroupingData() {
    return await clientDb.ref("Level-Grouping").once('value').then((snap) => {
        GroupingData = snap.val() ? snap.val() : [];
        GroupingData.forEach((group) => {
            group.Regex = new RegExp(group.Regex); //get regex and convert to object
        });
    });
}

async function loadAndDisplaySchedule(timeblock) {
    displaySchedule();//clear
    if (timeblock === null || !timeblock) {
        return;
    }
    resetloader(true, null, null);
    People = JSON.parse(await getCurrentInstructors(timeblock));
    scheduleData = [];
    for (var p = 0; p < People.length; p++) {
        var person = People[p];
        scheduleData[p] = JSON.parse(await getUserSheets(person, timeblock));
    }
    resetloader(false, null, null);
    displaySchedule(timeblock);
}

function setEditMode(editable) {
    editMode = editable;
}

async function getUserSheets(person, time) {
    return await send_http_request("1/get/sheets", "", [["facility", time.split("---")[0]], ["timeblock", time.split("---")[1]], ["uid", person.Uid]]);
}

async function getCurrentInstructors(time) {
    return await send_http_request("1/get/list", "", [["facility", time.split("---")[0]], ["timeblock", time.split("---")[1]]]);
}

close_mainmenu.onclick = function () {
    resetloader(false, null, null);
};
window.onload = function () {
    resetloader(true, null, null);
    firebase.auth().onAuthStateChanged(function (user) {
        if (user) {
            initClientDatabase().then(async() => {
                await getCompleteLevels();
                await getGroupingData();
                resetloader(false, null, null);
            });
        }
    });
    document.getElementById("getMasterConfig").onclick = function () {
        navigator.clipboard.writeText(JSON.stringify({People: People, Data: scheduleData}));
    };
    document.getElementById("inputMasterConfig").onclick = function () {
        var config = JSON.parse(prompt("Enter config"));
        People = config.People;
        scheduleData = config.Data;
        displaySchedule(true);
    };
    var tmpPeople = [];
    var tmpPeopleBarcodes = [];
    document.getElementById("createConfig").onclick = function () {
        resetloader(false, configmenu, "flex");
        tmpPeople = [];
        tmpPeopleBarcodes = [];
        renderTmpPeopleList();
    };
    document.getElementById("config-add-instructor").onclick = function () {
        var name = prompt("Enter instructor name:");
        if (name) {
            var codes = prompt("Enter instructor barcodes, seperated by commas (,)");
            tmpPeople.push({Name: name});
            var codeArray = codes.split(",");
            var codeIntArray = [];
            codeArray.forEach((code) => {
                codeIntArray.push(parseInt(code));
            });
            tmpPeopleBarcodes.push(codeIntArray);
            renderTmpPeopleList();
        }
    };
    var tmpPeopleDiv = document.getElementById("person-config-div");
    function renderTmpPeopleList() {
        clearChildren(tmpPeopleDiv);
        for (var p = 0; p < tmpPeople.length; p++) {
            var lbl = document.createElement("p");
            lbl.textContent = tmpPeople[p].Name + ": " + tmpPeopleBarcodes.toString();
            tmpPeopleDiv.appendChild(lbl);
        }
    }

    document.getElementById("configCreateBtn").onclick = async function () {
        resetloader(true, null, null);
        HandleSpeadsheetUpload().then((cData) => {
            scheduleData = [];
            if (tmpPeople.length > 0) {
                People = tmpPeople;
            } else if (document.getElementById("paste-person-config").value !== "") {
                var t = JSON.parse(document.getElementById("paste-person-config").value);
                People = t.People;
                for (var p = 0; p < People.length; p++) {
                    tmpPeopleBarcodes[p] = [];
                    for (var c = 0; c < t.Data[p].length; c++) {
                        tmpPeopleBarcodes[p].push(t.Data[p][c].Barcode);
                    }
                }
            } else {
                alert("No instructor data provided");
            }
            for (var p = 0; p < People.length; p++) {
                var dataArray = [];
                var barcodes = tmpPeopleBarcodes[p];
                for (var c = 0; c < cData.length; c++) {
                    var Class = cData[c];
                    if (barcodes.indexOf(Class.Barcode) !== -1) {
                        dataArray.push(Class);
                    }
                }
                scheduleData.push(dataArray);
            }
            displaySchedule(true);
            resetloader(false, null, null);
        }).catch((e) => {
            console.log(e);
            resetloader(false, null, null);
        });
    };
};


function HandleSpeadsheetUpload() {
    return new Promise((resolve, reject) => {
        var fileUpload = document.getElementById("excelUpload");
        //Validate whether File is valid Excel file.
        var regex = /^([a-zA-Z0-9\s_\\.\-:])+(.xls|.xlsx)$/;
        if (regex.test(fileUpload.value.toLowerCase())) {
            var reader = new FileReader();
            reader.onload = function (e) {
                resolve(extractExcelClasses(e.target.result));
            };
            reader.readAsBinaryString(fileUpload.files[0]);
        } else {
            alert("Please upload a valid Excel file.");
            reject("Please upload a valid Excel file.");
        }
    });
}

function extractExcelClasses(data) {
//Read the Excel File data in binary
    var workbook = XLSX.read(data, {
        type: 'binary'
    });
    //get the name of First Sheet.
    var Sheet = workbook.SheetNames[0];
    //Read all rows from First Sheet into an JSON array.
    var classRegex = new RegExp(/^([\s\S]+) - ([0-9]+)/);
    var excelRows = XLSX.utils.sheet_to_json(workbook.Sheets[Sheet], {header: ["DataRow", "Meta1", "Meta2", "Meta3", "Meta4", "Meta5", "Meta6", "Meta7", "Meta8", "Meta9", "Meta10"]});
    var builtClass = null;
    var Classes = [];
    for (var r = 0; r < excelRows.length; r++) {
        var row = excelRows[r];
        if (builtClass === null) {//No class currently exists
            if (row.DataRow && classRegex.test(row.DataRow) === true) {
                var matchArray = row.DataRow.match(/^([\s\S]+) - ([0-9]+)/);
                var lvlDetermined = determineLevelId(matchArray[1]);
                builtClass = {Barcode: parseInt(matchArray[2]), Level: lvlDetermined ? lvlDetermined : matchArray[1], Names: []};
            }
        } else {//a class is being read
            if (row.Meta1 && row.Meta1 === "Time:") {//Handle TimeStart
                builtClass.TimeStart = convertToTimeStartTwelveHour(row.Meta2); //Meta2 = The start time formatted as: x AM|PM
                if (isNaN(parseInt(builtClass.Level))) {
                    builtClass.Duration = convertToTimeStartTwelveHour(row.Meta4) - convertToTimeStartTwelveHour(row.Meta2);
                }
            } else if (row.DataRow && !isNaN(parseInt(row.DataRow))) {
                builtClass.Names.push(flipName(row.Meta1)); //Last, First to First Last
                if (!(r + 1 < excelRows.length) || !excelRows[r + 1].DataRow || isNaN(parseInt(excelRows[r + 1].DataRow))) {//if last row || Next line not data row || next line is data row but not a number (i.e is barcode)
                    if (builtClass.TimeStart) {//edge case with spreadsheet & more than 27 students enrolled, else if handles case and merges with previous
                        Classes.push(builtClass);
                    } else if (Classes[Classes.length - 1].Barcode === builtClass.Barcode) {
                        Classes[Classes.length - 1].Names = Classes[Classes.length - 1].Names.concat(builtClass.Names);
                    }
                    builtClass = null;
                }
            }
        }
    }
    return Classes;
}

function flipName(name) {
    return name.split(", ")[1] + " " + name.split(", ")[0];
}

const toTimeStartRegex = /([0-9]{1,2}):([0-9]{1,2})\s*(am|pm)/i;
function convertToTimeStartTwelveHour(time) {//converts AM/PM values to TimeStart values
    var matchGroups = time.match(toTimeStartRegex);
    if (matchGroups && matchGroups.length === 4) {
        var hours = parseInt(matchGroups[1]);
        var mins = parseInt(matchGroups[2]);
        if (matchGroups[3].match(/am/i)) {
            return (hours * 60) + mins;
        } else {
            var extraHours = hours !== 12 ? 12 : 0;
            return ((hours + extraHours) * 60) + mins;
        }
    } else {
        return null;
    }
}

function determineLevelId(LevelName) {
    for (const [id, data] of Object.entries(Levels)) {
        if (LevelName.match(new RegExp(data.Name + '$', 'gi'))) {//(?:\\s+|$)
            return parseInt(id);
        }
    }
    return null;
}
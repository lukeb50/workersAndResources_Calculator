/* global firebase, initClientDatabase, clientDb, XLSX, getSheetModifier */

const loadspinner = document.getElementById("loadspinner");
const sheetinfomenu = document.getElementById("sheetinfo-menu");
const configmenu = document.getElementById("config-menu");
const config_assignmenu = document.getElementById("config-assignment-menu");
const mainmenu = document.getElementById("main-menu");
const close_mainmenu = document.getElementById("main-menu-close-btn");
const loaditms = [loadspinner, sheetinfomenu, configmenu, config_assignmenu];
var scheduleData = [];
var People = [];
var sheetGroupingInfo = [];
var Levels = {};
var GroupingData = [];
var SheetModifiers = [];
var editMode = true;
const scheduleContainer = document.getElementById("main-schedule-holder");
const scheduleTable = document.getElementById("scheduleTable");
var timeIntervalId = -1;
function displaySchedule(Time) {
    clearChildren(scheduleTable);
    if (Time === null || Time === "" || !Time) {
        return;
    }
    //create top row with instructor names
    var headerRow = document.createElement("tr");
    var noteRow = document.createElement("tr");
    //Time text
    var timeBox = document.createElement("th");
    timeBox.textContent = "Time";
    timeBox.rowSpan = 2;
    headerRow.appendChild(timeBox);
    //Create instructors
    for (var p = 0; p < People.length; p++) {
        var instHeader = document.createElement("th");
        instHeader.textContent = People[p].Name;
        if (editMode === true) {
            bindAddClassClick(instHeader, p);
        }
        headerRow.appendChild(instHeader);
        //note row
        var instNote = document.createElement("td");
        var instNoteInput = document.createElement("input");
        instNoteInput.value = People[p].UserInformation.ScheduleNote;
        instNoteInput.placeholder = "Note";
        bindScheduleNoteChange(instNoteInput, People[p]);
        instNote.appendChild(instNoteInput);
        noteRow.appendChild(instNote);
    }
    //append row to table
    scheduleTable.appendChild(headerRow);
    scheduleTable.appendChild(noteRow);
    //calculate table spacing
    var tableInformation = calculateTimeSpacing(scheduleData);
    if (tableInformation.increment <= 0) {
        alert("Error calculating schedule display");
        return;
    }
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
                let groupPos = checkIfGrouped(currentSheet, i);
                if (groupPos.Position === false || groupPos.Position === 0) {
                    if (parseInt(getClassProperty(currentSheet, "TimeStart")) === t) {
                        isLesson = true;
                        var lessonHolder = document.createElement("td");
                        lessonHolder.className = "lesson";
                        lessonHolder.rowSpan = getClassDuration(currentSheet) / tableInformation.increment;
                        lessonHolder.style.backgroundColor = getLevelColor(getClassProperty(currentSheet, "Level"));
                        if (groupPos.Position === false) {//not grouped
                            createSheetListing(lessonHolder, currentSheet, i);
                        } else if (groupPos.Position === 0) {//first in group, show
                            createSheetListing(lessonHolder, groupPos.Group, i);
                        }
                        timerow.appendChild(lessonHolder);
                    } else if (t >= parseInt(getClassProperty(currentSheet, "TimeStart")) && t < parseInt(getClassProperty(currentSheet, "TimeStart")) + getClassDuration(currentSheet)) {
                        isLesson = true;
                    }
                }
            }
            if (isLesson === false) {
                var blockBreak = document.createElement("td");
                timerow.appendChild(blockBreak);
            }
        }
        scheduleTable.appendChild(timerow);
    }

    function bindScheduleNoteChange(input, person) {
        input.onchange = function () {
            person.UserInformation.ScheduleNote = input.value.escapeJSON();
            try {
                window.parent.changeEditPending(true, true);
            } catch (e) {
                //Not iframed, do nothing
            }
        };
    }

    function checkIfGrouped(sheet, instructorI) {
        for (var i = 0; i < sheetGroupingInfo[instructorI].length; i++) {
            let group = sheetGroupingInfo[instructorI][i];
            let sheetPos = group.indexOf(sheet);
            if (sheetPos !== -1) {
                return {Position: sheetPos, Group: group};
            }
        }
        return {Position: false, Group: null};
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
            var topPos = timeEl.offsetTop;
            var minuteSize = timeEl.getBoundingClientRect().height / tableInformation.increment;
            var minutePos = topPos + (minuteSize * (timeStamp - roundDown5(timeStamp))) - 1;
            if (!document.getElementById("timeLine")) {
                var timeLine = document.createElement("div");
                timeLine.id = "timeLine";
                scheduleContainer.appendChild(timeLine);
            }
            var timeLine = document.getElementById("timeLine");
            timeLine.style.top = minutePos + "px";
            timeLine.style.width = "calc("+(scheduleTable.offsetWidth - 4) + "px - 8ch)";
            timeLine.style.left = (timeEl.offsetLeft + timeEl.getBoundingClientRect().width + 1) + "px";
        }

        function roundDown5(x) {
            return Math.floor(x / 5) * 5;
        }
    }

    function createSheetListing(table, sheet, instructor) {
        var isCombo = Array.isArray(sheet);
        var holder = document.createElement("div");
        table.appendChild(holder);
        //create labels
        var lvlText = document.createElement("b");
        if (!isCombo) {
            lvlText.textContent = getLevelName(sheet) + " " + createModifierText(sheet);
        } else {
            var lvlNameArr = [];
            for (var i = 0; i < sheet.length; i++) {
                lvlNameArr.push(getLevelName(sheet[i]) + " " + createModifierText(sheet[i]));
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
        timeText.textContent = convertTimeReadable(parseInt(getClassProperty(sheet, "TimeStart"))) + " - " + convertTimeReadable(parseInt(getClassProperty(sheet, "TimeStart")) + getClassDuration(sheet));
        holder.appendChild(timeText);
        bindSheetClick(holder, sheet, instructor);
    }

    function getLevelName(sheet) {
        return Levels[sheet.Level] ? Levels[sheet.Level].Name : sheet.Level;
    }

    function bindSheetClick(div, sheet, instructor) {
        div.onclick = function () {
            displaySheetMenu(sheet, instructor);
        };
    }

    function displaySheetMenu(sheet, instructor) {
        clearChildren(sheetinfomenu);
        if (Array.isArray(sheet)) {
            sheet.forEach((c) => {//TODO: Rerender of individual sheet removes all other grouped sheets
                createSheetMenu(sheetinfomenu, c, instructor, sheet);
            });
        } else {
            createSheetMenu(sheetinfomenu, sheet, instructor, sheet);
        }
        resetloader(false, sheetinfomenu, "block", false);
    }

    function createSheetMenu(div, sheet, instructor, allsheets) {
        var title = document.createElement("h1");
        title.textContent = getLevelName(sheet) + " " + createModifierText(sheet) + " - " + sheet.Barcode;
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
                        displaySheetMenu(allsheets, instructor);
                        displaySchedule(true);
                    } else {
                        var dur = parseInt(prompt("Enter lesson duration in minutes"));
                        if (!isNaN(dur) && dur > 0) {
                            sheet.Level = newLevel;
                            sheet.Duration = dur;
                            displaySheetMenu(sheet, instructor);
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
                    displaySheetMenu(allsheets, instructor);
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
                    displaySheetMenu(allsheets, instructor);
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
                        displaySheetMenu(allsheets, instructor);
                        displaySchedule(true);
                    }
                };
                titleEdits.appendChild(durEdit);
            }
            var deleteEdits = document.createElement("button");
            deleteEdits.textContent = "Delete";
            deleteEdits.onclick = function () {
                if (confirm("Delete this sheet?")) {
                    scheduleData[instructor].splice(scheduleData[instructor].indexOf(sheet), 1);
                    displaySchedule(true);
                    resetloader(false, null, null, false);
                }
            };
            titleEdits.appendChild(deleteEdits);
            div.appendChild(titleEdits);
        }
        var time = document.createElement("label");
        time.textContent = convertTimeReadable(sheet.TimeStart) + " - " + (convertTimeReadable(parseInt(sheet.TimeStart) + getClassDuration(sheet)));
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
                bindStudentNameChange(editbtn, sheet, instructor, i, allsheets);
                item.appendChild(editbtn);
                var delbtn = document.createElement("button");
                delbtn.textContent = "-";
                bindStudentDelete(delbtn, sheet, instructor, i, allsheets);
                item.appendChild(delbtn);
            }
        });
        //add student btn in edit mode
        if (editMode === true) {
            var addbtn = document.createElement("button");
            addbtn.textContent = "Add Student";
            addbtn.className = "addstudent";
            addbtn.onclick = function () {
                var newName = prompt("Enter new student name");
                if (newName) {
                    sheet.Names.push(newName);
                    displaySheetMenu(allsheets, instructor);
                    displaySchedule(true);
                }
            };
            div.appendChild(addbtn);
        }
        //Notes section
        let noteSection = document.createElement("div");
        noteSection.className = "note-section scrollbar";
        div.appendChild(noteSection);
        showNoteSection(sheet, true, noteSection);
        //code to get main site (outside of iframe) to display the sheet. For DS mode
        if (editMode === false) {
            var viewBtn = document.createElement("button");
            viewBtn.textContent = "View Sheet";
            viewBtn.className = "viewsheetbtn";
            sheetinfomenu.appendChild(viewBtn);
            viewBtn.onclick = function () {
                window.parent.handleScheduleViewSheet(instructor, sheet);
            };
        }
    }

    function bindStudentNameChange(btn, sheet, instructor, studentI, allsheets) {
        btn.onclick = function () {
            var newName = prompt("Enter new name");
            if (newName) {
                sheet.Names[studentI] = newName;
                displaySheetMenu(allsheets, instructor);
            }
        };
    }

    function bindStudentDelete(btn, sheet, instructor, studentI, allsheets) {
        btn.onclick = function () {
            if (confirm("Delete " + sheet.Names[studentI] + "?")) {
                sheet.Names.splice(studentI, 1);
                displaySheetMenu(allsheets, instructor);
                displaySchedule(true);
            }
        };
    }

    function bindAddClassClick(instHeader, p) {
        instHeader.onclick = function () {
            var lvl = prompt("Enter level"); //null
            var code = parseInt(prompt("Enter barcode")); //NaN
            var start = convertToTimeStartTwelveHour(prompt("Enter start time HH:MM PM")); //null
            //determineLevelId
            if (lvl && !isNaN(code) && start !== null) {
                if (determineLevelId(lvl) !== null) {
                    scheduleData[p].push({Level: determineLevelId(lvl), Barcode: code, Names: [], TimeStart: start, SheetInformation: {Lead: {}, Instructor: {}}});
                    displaySchedule(true);
                } else {
                    var dur = prompt("Enter class duration in minutes");
                    if (!dur || isNaN(parseInt(dur))) {
                        return;
                    }
                    scheduleData[p].push({Level: lvl, Barcode: code, Names: [], TimeStart: start, Duration: parseInt(dur), TimeModifier: -1, SheetInformation: {Lead: {}, Instructor: {}}});
                    displaySchedule(true);
                }
            }
        };
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
    sheetGroupingInfo = [];
    var firstStart = Number.MAX_SAFE_INTEGER; //Large number for math.min, when first class starts
    var lastEnd = 0; //time the last class ends
    var spacingTimes = []; //Array of all durations in the schedule
    for (var uI = 0; uI < sheets.length; uI++) {
        sheetGroupingInfo[uI] = [];
        sheets[uI].sort((a, b) => {//sort so we can pull prev sheet to calculate breaks
            return parseInt(a.TimeStart) - parseInt(b.TimeStart);
        });
        for (var s = 0; s < sheets[uI].length; s++) {
            var sheet = sheets[uI][s];
            var potentialHolder = [];
            for (var i = s + 1; i < sheets[uI].length; i++) {
                var nxt = sheets[uI][i];
                if (parseInt(nxt.TimeStart) === parseInt(sheet.TimeStart)) {
                    if (getClassDuration(nxt) === getClassDuration(sheet)) {
                        potentialHolder.push(nxt);
                    } else {
                        console.log("Sheet cannot be grouped");
                    }
                }
            }
            if (potentialHolder.length > 0) {
                potentialHolder.unshift(sheet);
                sheetGroupingInfo[uI].push(potentialHolder);
            }
        }
        for (var sI = 0; sI < sheets[uI].length; sI++) {
            //how long the class lasts
            var dur = getClassDuration(sheets[uI][sI]);
            //Update bounds on schedule
            var classStart = parseInt(getClassProperty(sheets[uI][sI], "TimeStart"));
            var classEnd = classStart + dur;
            firstStart = Math.min(firstStart, classStart);
            lastEnd = Math.max(lastEnd, classEnd);
            //GCD terms
            if (spacingTimes.indexOf(classStart) === -1) {
                spacingTimes.push(classStart); //add duration if it does not yet exist
            }
            if (spacingTimes.indexOf(classEnd) === -1){
                spacingTimes.push(classEnd);
            }
        }
    }
    console.log(spacingTimes);
    return {firstStart: firstStart, lastEnd: lastEnd, increment: multiGCD(spacingTimes)};
}

function getClassDuration(c) {
    if (Array.isArray(c)) {//multiple levels, call function on first individual level
        return getClassDuration(c[0]);
    } else if (!isNaN(c.Level)) {//Level Id
        c.TimeModifier = parseInt(c.TimeModifier);
        if (!c.TimeModifier || c.TimeModifier === -1) {//No modifier
            return parseInt(Levels[c.Level].Settings.Duration);
        } else {//modifier, return modifier time
            return getSheetModifier(c).Duration;//find modifier w/ filter
        }
    } else if (isNaN(c.Level)) {//Custom level (not in DB)
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

async function getModifierData() {
    return await clientDb.ref("Settings/Sheet-Modifiers").once('value').then((snap) => {
        SheetModifiers = snap.val() ? snap.val() : [];
    });
}

async function loadAndDisplayScheduleData(Users, Data, Timeblock) {
    displaySchedule();
    if (Users === null || Data === null) {
        return;
    }
    resetloader(true, null, null, false);
    People = Users;
    scheduleData = Data;
    for (var p = 0; p < scheduleData.length; p++) {
        if (scheduleData[p].length === 0) {
            scheduleData[p] = JSON.parse(await getUserSheets(People[p], Timeblock));
        }
    }
    resetloader(false, null, null, false);
    displaySchedule(Timeblock);
}

async function loadAndDisplayScheduleTimeblock(timeblock) {
    displaySchedule(); //clear
    if (timeblock === null || !timeblock) {
        return;
    }
    resetloader(true, null, null, false);
    People = JSON.parse(await getCurrentInstructors(timeblock));
    scheduleData = [];
    for (var p = 0; p < People.length; p++) {
        var person = People[p];
        scheduleData[p] = JSON.parse(await getUserSheets(person, timeblock));
    }
    resetloader(false, null, null, false);
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

function closeMenuBind() {
    resetloader(false, null, null, false);
}

close_mainmenu.onclick = closeMenuBind;

window.onload = function () {
    resetloader(true, null, null, false);
    firebase.auth().onAuthStateChanged(function (user) {
        if (user) {
            initClientDatabase().then(async() => {
                await getCompleteLevels();
                await getGroupingData();
                await getModifierData();
                resetloader(false, null, null, false);
            });
        }
    });

    document.getElementById("configUpdatePeopleBtn").onclick = function () {
        resetloader(false, config_assignmenu, null, false);
        handleConfigAssignmentMenu({People: People, ScheduleData: scheduleData, rawData: []}).then((result) => {
            scheduleData = result.ScheduleData;
            People = result.People;
            resetloader(false, null, null, false);
            displaySchedule(true);
        }).catch((err) => {
            resetloader(false, null, null, false);
            alert("Error creating schedule: " + err);
        });
    };

    document.getElementById("configMenuBtn").onclick = function () {
        resetloader(false, configmenu, "flex", false);
    };

    document.getElementById("getMasterConfig").onclick = function () {
        navigator.clipboard.writeText(JSON.stringify({People: People, ScheduleData: scheduleData}));
        alert("Schedule data exported to clipboard");
    };
    document.getElementById("inputMasterConfig").onclick = function () {
        var config = JSON.parse(prompt("Enter config"));
        People = config.People;
        scheduleData = config.ScheduleData;
        resetloader(false, null, null, false);
        displaySchedule(true);
    };

    document.getElementById("newMasterConfig").onclick = function () {
        resetloader(false, config_assignmenu, null, false);
        handleConfigAssignmentMenu({People: [], ScheduleData: [], rawData: []}).then((result) => {
            scheduleData = result.ScheduleData;
            People = result.People;
            resetloader(false, null, null, false);
            displaySchedule(true);
        }).catch((err) => {
            //Cancelled by user
        });
    };

    document.getElementById("excelNewUpload").oninput = async function () {
        resetloader(true, null, null, false);
        HandleSpeadsheetUpload(document.getElementById("excelNewUpload")).then((cData) => {
            //Do stuff
            resetloader(false, config_assignmenu, null, false);
            handleConfigAssignmentMenu({People: [], ScheduleData: [], rawData: cData}).then((result) => {
                scheduleData = result.ScheduleData;
                People = result.People;
                resetloader(false, null, null, false);
                displaySchedule(true);
            }).catch((err) => {
                resetloader(false, null, null, false);
                alert("Error creating schedule: " + err);
            });
        }).catch((e) => {
            alert("Error reading spreadsheet, please ensure document is valid");
            console.log(e);
            resetloader(false, null, null, false);
        });
        document.getElementById("excelNewUpload").value = null;
    };

    document.getElementById("excelUpdateUpload").oninput = async function () {
        resetloader(true, null, null, false);
        HandleSpeadsheetUpload(document.getElementById("excelUpdateUpload")).then((cData) => {
            //Update all data
            for (var p = 0; p < People.length; p++) {
                for (var s = 0; s < scheduleData[p].length; s++) {
                    //for every sheet, look for an update
                    var index = cData.findIndex((sheet) => {
                        return parseInt(sheet.Barcode) === parseInt(scheduleData[p][s].Barcode);
                    });
                    console.log(index);
                    if (index !== -1) {
                        scheduleData[p][s] = cData[index];
                    }
                }
            }
            displaySchedule(true);
            resetloader(false, null, null, false);
        }).catch((e) => {
            alert("Error reading spreadsheet, please ensure document is valid");
            console.log(e);
            resetloader(false, null, null, false);
        });
        document.getElementById("excelUpdateUpload").value = null;
    };
};

const configPersonList = document.getElementById("config-assignment-list");
function handleConfigAssignmentMenu(inData) {
    return new Promise((resolve, reject) => {
        //Handle leaving the menu with confirmation
        document.getElementById("config-assignment-confirm").onclick = function () {
            delete inData.rawData;
            resolve(inData);
        };
        displayConfigPersonList(inData);
        //override default close menu button to capture click and reject
        close_mainmenu.onclick = function () {
            reject("User terminated operation");
            close_mainmenu.onclick = closeMenuBind;//reset default behaviour
        };
    });
}

function displayConfigPersonList(displayData) {
    clearChildren(configPersonList);
    //Create list of people
    for (var p = 0; p < displayData.People.length; p++) {
        var personDiv = document.createElement("div");
        configPersonList.appendChild(personDiv);
        var personText = document.createElement("p");
        personText.textContent = displayData.People[p].Name;
        personDiv.appendChild(personText);
        //show all barcodes
        str = "";
        for (b = 0; b < displayData.ScheduleData[p].length; b++) {
            str += (str === "" ? "" : ", ") + "#" + displayData.ScheduleData[p][b].Barcode;
        }
        var lbl = document.createElement("label");
        lbl.textContent = str;
        personDiv.appendChild(lbl);
        var personBarcodeBtn = document.createElement("button");
        personBarcodeBtn.textContent = "Add Barcodes";
        personBarcodeBtn.className = "mainround";
        personDiv.appendChild(personBarcodeBtn);
        bindAddBarcodesBtn(personBarcodeBtn, p);
    }
    function bindAddBarcodesBtn(btn, p) {
        btn.onclick = function () {
            var codes = prompt("Enter barcodes(s) seperated by a comma").replaceAll(" ", "").split(",");
            //codes is an array with one code per index, spaces removed
            for (var c = 0; c < codes.length; c++) {
                var loc = displayData.rawData.findIndex((course) => {
                    return parseInt(course.Barcode) === parseInt(codes[c]);
                });
                //Exists in raw data and not already added to user
                if (loc > -1 && displayData.ScheduleData[p].findIndex((course) => {
                    return parseInt(course.Barcode) === parseInt(codes[c]);
                }) === -1) {
                    displayData.ScheduleData[p].push(displayData.rawData[loc]);
                }
            }
            displayConfigPersonList(displayData);
        };
    }
    //new person button
    var newPersonBtn = document.createElement("button");
    newPersonBtn.textContent = "New Person";
    newPersonBtn.className = "mainround";
    configPersonList.appendChild(newPersonBtn);
    newPersonBtn.onclick = function () {
        var name = prompt("Enter Person Name");
        if (name) {
            displayData.ScheduleData.push([]);
            displayData.People.push({Name: name, Uid: genUid(), UserInformation: {Corrections: 0, ScheduleNote: ""}});
            displayConfigPersonList(displayData);
        }
    };
}

function HandleSpeadsheetUpload(fileUpload) {
    return new Promise((resolve, reject) => {
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

function genUid() {
    try {
        return Math.random().toString(36).slice(2, 7);
    } catch (err) {
        return genUid();
    }
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
                builtClass = {Barcode: parseInt(matchArray[2]), Level: lvlDetermined ? lvlDetermined : matchArray[1], Names: [], TimeModifier: -1, SheetInformation: {Lead: {}, Instructor: {}}};
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
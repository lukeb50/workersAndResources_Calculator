/* global firebase, initClientDatabase, clientDb, XLSX, getSheetModifier, noteIndicators */

const loadspinner = document.getElementById("loadspinner");
const sheetinfomenu = document.getElementById("sheetinfo-menu");
const configmenu = document.getElementById("config-menu");
const config_assignmenu = document.getElementById("config-assignment-menu");
const view_changemenu = document.getElementById("view-change-menu");
const databasemenu = document.getElementById("database-menu");
const mainmenu = document.getElementById("main-menu");
const close_mainmenu = document.getElementById("main-menu-close-btn");
const loaditms = [loadspinner, sheetinfomenu, configmenu, config_assignmenu, view_changemenu, databasemenu];
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

    var currentTime = new Date();
    clearInterval(timeIntervalId);
    //waitMinute(); TODO: Fix
    //updateCurrentTime();
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
            timeLine.style.width = "calc(" + (scheduleTable.offsetWidth - 4) + "px - 8ch)";
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
        //note icon
        var icos = extractNoteIndicators(sheet, isCombo);
        if (icos.length > 0) {
            //spacer so icons appear at bottom
            var spacer = document.createElement("span");
            spacer.className = "note-icon-spacer";
            holder.appendChild(spacer);
            //create and add icons
            var icoHolder = document.createElement("div");
            icoHolder.className = "note-icon-holder";
            for (var n = 0; n < 3 && n < icos.length; n++) {//note icon
                var icoEl = document.createElement("span");
                var icoTxt = noteIndicators.findIndex((item) => {
                    return item.Id === parseInt(icos[n]);
                });
                icoEl.className = "material-symbols-outlined";
                icoEl.textContent = noteIndicators[icoTxt].Name;
                icoEl.title = "This class has a note attached";
                icoHolder.appendChild(icoEl);
            }
            ;
            if (icos.length > 3) {//... icon
                var icoEl = document.createElement("span");
                icoEl.className = "material-symbols-outlined";
                icoEl.textContent = "more_horiz";
                icoEl.title = "There are more than 3 notes attached to this class";
                icoHolder.appendChild(icoEl);
            }
            holder.appendChild(icoHolder);
        }
        bindSheetClick(holder, sheet, instructor);
    }

    function extractNoteIndicators(mulSheet, isCombo) {
        var indicators = [];
        if (isCombo) {
            mulSheet.forEach((st) => {
                indicators.concat(extractFromSheet(st));
            });
        } else {
            indicators = extractFromSheet(mulSheet);
        }
        return indicators;

        function extractFromSheet(individualSheet) {
            var indicators = [];
            individualSheet.SheetInformation.Instructor.Notes = individualSheet.SheetInformation.Instructor.Notes ? individualSheet.SheetInformation.Instructor.Notes : [];
            individualSheet.SheetInformation.Lead.Notes = individualSheet.SheetInformation.Lead.Notes ? individualSheet.SheetInformation.Lead.Notes : [];
            individualSheet.SheetInformation.Lead.Notes.forEach(note => {
                indicators.push(note.Indicator);
            });
            individualSheet.SheetInformation.Instructor.Notes.forEach(note => {
                indicators.push(note.Indicator);
            });
            return indicators;
        }
    }

    function bindSheetClick(div, sheet, instructor) {
        div.onclick = function () {
            displaySheetMenu(sheet, instructor);
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

function createSheetMenu(div, sheet, instructor, allsheets) {
    showSheetMenu(div, sheet, instructor, allsheets);
    function showSheetMenu(div, sheet, instructor, allsheets) {
        var headerSpan = createElement("span", div, null, "classmenuheader");
        createElement("h1", headerSpan, getLevelName(sheet) + " " + createModifierText(sheet) + " - " + sheet.Barcode, null);
        if (editMode === true) {
            var titleEdits = createElement("span", headerSpan, null, "edit_title");
            var nameEdit = createElement("button", titleEdits, "Edit Level", "mainround");
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
            var barcodeEdit = createElement("button", titleEdits, "Edit Code", "mainround");
            barcodeEdit.onclick = function () {
                var newCode = prompt("Enter new barcode");
                if (newCode && !isNaN(parseInt(newCode))) {
                    sheet.Barcode = parseInt(newCode);
                    displaySheetMenu(allsheets, instructor);
                    displaySchedule(true);
                }
            };
            var timeEdit = createElement("button", titleEdits, "Edit Start", "mainround");
            timeEdit.onclick = function () {
                var newTime = prompt("Enter new start time in 12h format (MM:HH PM)");
                if (newTime && convertToTimeStartTwelveHour(newTime)) {
                    sheet.TimeStart = convertToTimeStartTwelveHour(newTime);
                    displaySheetMenu(allsheets, instructor);
                    displaySchedule(true);
                }
            };
            if (sheet.Duration) {
                var durEdit = createElement("button", titleEdits, "Edit Duration", "mainround");
                durEdit.onclick = function () {
                    var dur = parseInt(prompt("Enter lesson duration in minutes"));
                    if (!isNaN(dur) && dur > 0) {
                        sheet.Duration = dur;
                        displaySheetMenu(allsheets, instructor);
                        displaySchedule(true);
                    }
                };
            }
            var deleteEdits = createElement("button", titleEdits, "Delete", "mainround");
            deleteEdits.onclick = function () {
                if (confirm("Delete this sheet?")) {
                    scheduleData[instructor].splice(scheduleData[instructor].indexOf(sheet), 1);
                    displaySchedule(true);
                    resetloader(false, null, null, false);
                }
            };
        }
        createElement("label", headerSpan, convertTimeReadable(sheet.TimeStart) + " - " + (convertTimeReadable(parseInt(sheet.TimeStart) + getClassDuration(sheet))), null);
        createElement("label", headerSpan, People[instructor].Name, null);
        var nameList = createElement("ul",div,null,null);
        sheet.Names.forEach((name, i) => {
            var item = createElement("li",nameList,name,null);
            if (editMode === true) {
                var editbtn = createElement("button",item,"Change","mainround");
                bindStudentNameChange(editbtn, sheet, instructor, i, allsheets);
                var delbtn = createElement("button",item,"-","mainround");
                bindStudentDelete(delbtn, sheet, instructor, i, allsheets);
            }
        });
        //add student btn in edit mode
        if (editMode === true) {
            var addbtn = createElement("button",div,"Add Student","addstudent mainround");
            addbtn.onclick = function () {
                var newName = prompt("Enter new student name");
                if (newName) {
                    sheet.Names.push(newName);
                    displaySheetMenu(allsheets, instructor);
                    displaySchedule(true);
                }
            };
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
}

function getLevelName(sheet) {
    return Levels[sheet.Level] ? Levels[sheet.Level].Name : sheet.Level;
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
            if (spacingTimes.indexOf(classEnd) === -1) {
                spacingTimes.push(classEnd);
            }
        }
    }
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

const view_change_table = document.getElementById("view-change-table");
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

    const searchBar = document.getElementById("searchBar");
    const controlSection = document.getElementById("controlSection");
    const searchHolder = document.getElementById("controlSearchResultHolder");
    var searchHandler = new SearchSystem([]);
    document.getElementById("searchBtn").onclick = function () {
        var names = [];
        for (var x = 0; x < scheduleData.length; x++) {
            for (var c = 0; c < scheduleData[x].length; c++) {
                for (var n = 0; n < scheduleData[x][c].Names.length; n++) {
                    names.push({Name: scheduleData[x][c].Names[n], Person: x, Class: c});
                }
            }
        }
        searchHandler.updateDatabase(names);
        if (searchBar.className === "show") {
            searchBar.className = "";
            searchHolder.className = "";
            searchBar.value = "";
            searchBar.placeholder = "";
            clearChildren(searchDiv);
            controlSection.style.flexGrow = 0;
        } else {
            searchBar.className = "show";
            searchHolder.className = "show";
            searchBar.value = "";
            searchBar.placeholder = "Search...";
            clearChildren(searchDiv);
            controlSection.style.flexGrow = 1;
        }
    };

    const searchDiv = document.getElementById("controlSearchResults");
    searchBar.oninput = function () {
        var results = searchHandler.search(searchBar.value);
        clearChildren(searchDiv);
        results.forEach((res) => {//display search result list
            var entryHolder = createElement("span", searchDiv, null, null);
            createElement("b", entryHolder, res.Name, null);
            var classData = scheduleData[res.Person][res.Class];
            createElement("label", entryHolder, getLevelName(classData) + " " + createModifierText(classData) + " - " + classData.Barcode, null);
            createElement("label", entryHolder, convertTimeReadable(classData.TimeStart) + " - " + convertTimeReadable(classData.TimeStart + getClassDuration(classData)), null);
            createElement("label", entryHolder, People[res.Person].Name);
            handleClick(entryHolder, res.Person, scheduleData[res.Person][res.Class]);
        });
        if (results.length === 0) {
            createElement("h1", searchDiv, "No Results", null);
        }

        function handleClick(span, instructorId, classObj) {
            span.onclick = function () {
                var groupingData = checkIfGrouped(classObj, instructorId);
                if (groupingData.Group) {
                    displaySheetMenu(groupingData.Group, instructorId)
                } else {
                    displaySheetMenu(classObj, instructorId);
                }
            };
        }

    };

    document.getElementById("configMenuBtn").onclick = function () {
        resetloader(false, configmenu, "flex", false);
    };

    document.getElementById("getMasterConfig").onclick = function () {
        navigator.clipboard.writeText(createDataJSON());
        alert("Schedule data exported to clipboard");
    };

    function createDataJSON() {
        return JSON.stringify({People: People, ScheduleData: scheduleData});
    }
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

    const databaselist = document.getElementById("database-list");

    document.getElementById("inputDatabaseMasterConfig").onclick = async function () {
        var databaseValues = await getDatabaseSaves();
        renderDatabaseMenu(databaseValues, loadDatabaseButtonFunction);
    };

    document.getElementById("saveDatabaseMasterConfig").onclick = async function () {
        var databaseValues = await getDatabaseSaves();
        renderDatabaseMenu(databaseValues, saveDatabaseButtonFunction);
        var existingKeys = Object.keys(databaseValues);
        if (existingKeys.length < 10) {
            var newSaveBtn = createElement("button", databaselist, "New Save", "mainround newsave");
            newSaveBtn.onclick = function () {
                existingKeys = Object.keys(databaseValues);
                var name = prompt("Enter save name");
                if (name && name.length > 1 && existingKeys.indexOf(name) === -1) {
                    performDatabaseSave(name);
                } else {
                    alert("Invalid name");
                }
            };
        }
    };

    function renderDatabaseMenu(data, buttonFunction) {
        resetloader(false, databasemenu, "flex", false);
        clearChildren(databaselist);
        Object.keys(data).forEach((k) => {
            var holder = createElement("div", databaselist, null, null);
            createElement("label", holder, k, null);
            var buttonholder = createElement("span", holder, null, null);
            buttonFunction(buttonholder, holder, data, k);
        });
    }

    function saveDatabaseButtonFunction(span, holder, data, key) {
        var overwriteBtn = createElement("button", span, "Overwrite", "mainround");
        function handleOverwrite(btn) {
            btn.onclick = function () {
                if (confirm("Overwrite save " + key + "?")) {
                    performDatabaseSave(key);
                }
            };
        }
        handleOverwrite(overwriteBtn);
        var deleteBtn = createElement("button", span, "Delete", "mainround");
        function handleDelete(btn) {
            btn.onclick = function () {
                if (confirm("Delete save " + key + "?")) {
                    delete data[key];
                    holder.remove();
                    clientDb.ref("Schedule-Saves/" + firebase.auth().currentUser.uid + "/" + key).set(null);
                }
            };
        }
        handleDelete(deleteBtn);
    }

    function performDatabaseSave(key) {
        resetloader(true, null, null, false);
        clientDb.ref("Schedule-Saves/" + firebase.auth().currentUser.uid + "/" + key).set(createDataJSON()).then(() => {
            resetloader(false, null, null, false);
        }).catch((err) => {
            alert("Could not save data. Please check your connection and try again.");
            console.log(err);
            resetloader(false, null, null, false);
        });
    }

    function loadDatabaseButtonFunction(span, holder, data, key) {
        var loadBtn = createElement("button", span, "Load", "mainround");
        function handleLoad(btn) {
            btn.onclick = function () {
                var config = JSON.parse(data[key]);
                People = config.People;
                scheduleData = config.ScheduleData;
                resetloader(false, null, null, false);
                displaySchedule(true);
            };
        }
        handleLoad(loadBtn);
        var deleteBtn = createElement("button", span, "Delete", "mainround");
        function handleDelete(btn) {
            btn.onclick = function () {
                if (confirm("Delete save " + key + "?")) {
                    delete data[key];
                    holder.remove();
                    clientDb.ref("Schedule-Saves/" + firebase.auth().currentUser.uid + "/" + key).set(null);
                }
            };
        }
        handleDelete(deleteBtn);
    }

    async function getDatabaseSaves() {
        resetloader(true, null, null, false);
        return await clientDb.ref("Schedule-Saves/" + firebase.auth().currentUser.uid).once('value').then((snap) => {
            var res = snap.val() ? snap.val() : {};
            return res;
        });
    }

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
            var changeData = [];
            for (var p = 0; p < People.length; p++) {
                changeData.push([]);
                for (var s = 0; s < scheduleData[p].length; s++) {
                    //for every sheet, look for an update
                    var index = cData.findIndex((sheet) => {
                        return parseInt(sheet.Barcode) === parseInt(scheduleData[p][s].Barcode);
                    });
                    if (index !== -1) {
                        //Check changes
                        var oldData = scheduleData[p][s].Names;
                        var newData = cData[index].Names;
                        var peopleAdded = newData.filter((name) => {
                            return oldData.indexOf(name) === -1;
                        });
                        var peopleRemoved = oldData.filter((name) => {
                            return newData.indexOf(name) === -1;
                        });
                        //Log any changes
                        if (peopleAdded.length > 0 || peopleRemoved.length > 0) {
                            changeData[p].push({Barcode: cData[index].Barcode, Level: cData[index].Level, TimeStart: cData[index].TimeStart, Added: peopleAdded, Removed: peopleRemoved});
                        }
                        //Assign updates to main data
                        cData[index].SheetInformation = scheduleData[p][s].SheetInformation;
                        scheduleData[p][s] = cData[index];
                    }
                }
            }
            displaySchedule(true);
            resetloader(false, view_changemenu, "flex", true);
            //render changes menu
            clearChildren(view_change_table);
            var header = createElement("tr", view_change_table, null, null);
            createElement("th", header, "Instructor", null);
            createElement("th", header, "Name", null);
            createElement("th", header, "Class", null);
            createElement("th", header, "Time", null);
            createElement("th", header, "Add", "small");
            createElement("th", header, "Delete", "small");
            for (var p = 0; p < changeData.length; p++) {//each instructor
                if (changeData[p].length > 0) {
                    for (var s = 0; s < changeData[p].length; s++) {//each class
                        for (var opt of ["Added", "Removed"].values()) {//Adds and Removes
                            var dataSet = changeData[p][s];
                            for (var k = 0; k < dataSet[opt].length; k++) {//Each kid in add/remove lists
                                createRow(view_change_table, People[p].Name, dataSet, dataSet[opt][k], opt);
                            }
                        }
                    }
                }
            }

            function createRow(parent, instructorName, changeDataEntry, personName, changeType) {
                var row = createElement("tr", parent, null, null);
                createElement("td", row, instructorName, null);
                createElement("td", row, personName, null);
                createElement("td", row, getLevelName(changeDataEntry) + " - #" + changeDataEntry.Barcode, null);
                createElement("td", row, convertTimeReadable(changeDataEntry.TimeStart), null);
                createElement("td", row, changeType === "Added" ? "check" : "", "material-symbols-outlined small");
                createElement("td", row, changeType === "Removed" ? "check" : "", "material-symbols-outlined small");
            }
        }).catch((e) => {
            alert("Error reading spreadsheet, please ensure document is valid");
            console.log(e);
            resetloader(false, null, null, false);
        });
        document.getElementById("excelUpdateUpload").value = null;
    };
};

document.getElementById("print-change-button").onclick = function () {
    var win = window.open("../inline-html/blank-print.html", "Print Enrollment Changes", "popup=true", true);
    win.onload = function () {
        var clone = view_change_table.cloneNode(true);
        win.document.body.appendChild(clone);
        var icoLink = createElement("link", win.document.head, null, null);
        icoLink.rel = "stylesheet";
        icoLink.href = "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20,300,0,0";
        monitorStyle(icoLink);
        var fontLink = createElement("link", win.document.head, null, null);
        fontLink.rel = "stylesheet";
        fontLink.href = "https://fonts.googleapis.com/css?family=Roboto&display=swap";
        monitorStyle(fontLink);
        var indexLink = createElement("link", win.document.head, null, null);
        indexLink.rel = "stylesheet";
        indexLink.href = "../css/main/index.css";
        indexLink.type = "text/css";
        monitorStyle(indexLink);
        var scheduleLink = createElement("link", win.document.head, null, null);
        scheduleLink.rel = "stylesheet";
        scheduleLink.href = href = "../css/inline/schedule-view.css";
        scheduleLink.type = "text/css";
        monitorStyle(scheduleLink);

        var count = 0;
        const sheets = 4;
        //wait until 4 onload events are triggered, then trigger print
        function monitorStyle(stylesheet) {
            stylesheet.onload = function () {
                count++;
                if (count === sheets) {
                    setTimeout(function () {
                        win.print();
                    }, 1000);//1 sec delay for checkmark render
                }
            };
        }

        win.onafterprint = function () {
            win.close();//auto close window after printing
        };
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
        var personRenameBtn = document.createElement("button");
        personRenameBtn.textContent = "Rename Person";
        personRenameBtn.className = "mainround";
        personDiv.appendChild(personRenameBtn);
        bindRenamePersonBtn(personRenameBtn, p);
    }

    function bindRenamePersonBtn(btn, p) {
        btn.onclick = function () {
            var newName = prompt("Enter new name");
            if (newName) {
                displayData.People[p].Name = newName;
                displayConfigPersonList(displayData);
            }
        };
    }

    function bindAddBarcodesBtn(btn, p) {
        btn.onclick = function () {
            var codes = prompt("Enter barcodes(s) seperated by a comma").replaceAll(" ", "").split(/([0-9]{4,})/);
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
        var regex = /^([a-zA-Z0-9\s_\\.\-\(\):])+(.xls|.xlsx)$/;
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
    var classRegex = new RegExp(/^([\s\S]+) - ([0-9]+)/); //Regex for class names
    var excelRows = XLSX.utils.sheet_to_json(workbook.Sheets[Sheet], {header: ["DataRow", "Meta1", "Meta2", "Meta3", "Meta4", "Meta5", "Meta6", "Meta7", "Meta8", "Meta9", "Meta10"]});
    var builtClass = null;
    var nameBuilder = null;
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
                if (!isNumber(builtClass.Level)) {
                    builtClass.Duration = convertToTimeStartTwelveHour(row.Meta4) - convertToTimeStartTwelveHour(row.Meta2);
                }
                ;
            } else if (row.Meta1 && row.Meta1 === "Weekdays:") {
            } else if (row.DataRow && isNumber(row.DataRow)) { //Row with number, a name should be added
                //nameBuilder handles very long names that split on two lines, last name on line 1, first name on line 2.
                builtClass.Names.push(nameBuilder === null ? flipName(row.Meta1) : row.Meta1 + " " + nameBuilder); //Last, First to First Last
                nameBuilder = null;
                if ((!(r + 1 < excelRows.length) || !excelRows[r + 1].DataRow || isNaN(parseInt(excelRows[r + 1].DataRow))) && !rowIsLongName(r + 1)) {//if last row || Next line not data row || next line is data row but not a number (i.e is barcode)
                    if (builtClass.TimeStart) {//edge case with spreadsheet & more than 27 students enrolled, else if handles case and merges with previous
                        Classes.push(builtClass);
                    } else if (Classes[Classes.length - 1].Barcode === builtClass.Barcode) {
                        Classes[Classes.length - 1].Names = Classes[Classes.length - 1].Names.concat(builtClass.Names);
                    }
                    builtClass = null;
                }
            } else if (rowIsLongName(r)) {
                //Handle long names with last name on seperate line
                nameBuilder = row.Meta1.substring(0, row.Meta1.indexOf(","));//Remove comma from last name
            }
        }
    }
    return Classes;

    //Checks to see if given row contains a long name (over two rows)
    function rowIsLongName(r) {
        if (!(r + 1 < excelRows.length) || r < 0) {//invalid range
            return false;
        }
        //Check for proper row pattern
        if (excelRows[r].DataRow || !excelRows[r].Meta1 || !excelRows[r + 1].DataRow || !excelRows[r + 1].Meta1) {
            return false;
        }
        if (isNumber(excelRows[r + 1].DataRow)) {
            return true;
        }
        //Shouldn't be used, but included for safety catch
        return false;
    }

    //Helper function to decide if string is a number
    function isNumber(value) {
        return !isNaN(parseInt(value));
    }
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
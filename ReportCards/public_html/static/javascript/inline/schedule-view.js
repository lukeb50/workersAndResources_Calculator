/* global firebase, initClientDatabase, clientDb, XLSX */

const loadspinner = document.getElementById("loadspinner");
const sheetinfomenu = document.getElementById("sheetinfo-menu");
const configmenu = document.getElementById("config-menu");
const mainmenu = document.getElementById("main-menu");
const close_mainmenu = document.getElementById("main-menu-close-btn");
const sheetinfo_level = document.getElementById("sheetinfo-level");
const sheetinfo_instructor = document.getElementById("sheetinfo-instructor");
const sheetinfo_barcode = document.getElementById("sheetinfo-barcode");
const sheetinfo_studentlist = document.getElementById("sheetinfo-studentlist");
const loaditms = [loadspinner, sheetinfomenu, configmenu];
var dummyData = [
    /*[
     {Barcode: 12345, Names: ["Person A", "Person B"], TimeStart: 795, Level: 1650854536}, //840
     {Barcode: 67890, Names: ["Person C", "Person D"], TimeStart: 845, Level: 1650854535}//890
     ], [
     {Barcode: 99999, Names: ["Person A", "Person B"], TimeStart: 795, Level: 1650854534}, //825
     {Barcode: 88888, Names: ["Person A", "Person B"], TimeStart: 830, Level: 1650854533}//860
     ], [
     {Barcode: 66666, Names: ["Person A", "Person B"], TimeStart: 795, Level: 1650854533},
     {Barcode: 77777, Names: ["Person A", "Person B", "Person C", "Person D", "Person E", "Person F"], TimeStart: 825, Level: 1650854531}
     ], [
     {Barcode: 44444, Names: ["Person X", "Person Y", "Person Z"], TimeStart: 795, Level: 1650854533}
     ], [
     {Barcode: 44444, Names: ["Person X", "Person Y", "Person Z"], TimeStart: 815, Level: 1650854533}//845
     ], [
     {Barcode: 22222, Names: ["Person X", "Person Y", "Person Z"], TimeStart: 850, Level: 1650854537}//910
     ]*/
];
var People = [
    /*{"Name": "Luke B."},
     {"Name": "Person 2."},
     {"Name": "Person 3."},
     {"Name": "Person 4."},
     {"Name": "Person 5."},
     {"Name": "Person 6."}*/
];
var Levels = {};
var GroupingData = [];
const scheduleTable = document.getElementById("scheduleTable");
var timeIntervalId = -1;
function displaySchedule(Time) {
    clearChildren(scheduleTable);
    if (Time === null || Time === "") {
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
        headerRow.appendChild(instHeader);
    }
    //append row to table
    scheduleTable.appendChild(headerRow);
    //calculate table spacing
    var tableInformation = calculateTimeSpacing(dummyData);
    //create intervals
    for (var t = tableInformation.firstStart; t < tableInformation.lastEnd; t = t + tableInformation.increment) {
        var timerow = document.createElement("tr");
        var timeLbl = document.createElement("td");
        //TimeStart value converted to hour:minute with provision for xx:0y times (first 9 minutes leading 0)
        timeLbl.textContent = convertTimeReadable(t);
        timeLbl.id = "time-" + t;
        timerow.appendChild(timeLbl);
        //Handle any times to display
        for (var i = 0; i < dummyData.length; i++) {
            var isLesson = false;
            for (var s = 0; s < dummyData[i].length; s++) {
                var currentSheet = dummyData[i][s];
                if (currentSheet.TimeStart === t) {
                    isLesson = true;
                    var lessonHolder = document.createElement("td");
                    lessonHolder.rowSpan = (currentSheet.Duration ? currentSheet.Duration : Levels[currentSheet.Level].Settings.Duration) / tableInformation.increment;//TODO: code for Excel
                    lessonHolder.style.backgroundColor = getLevelColor(currentSheet.Level);
                    createSheetListing(lessonHolder, i, s);
                    timerow.appendChild(lessonHolder);
                } else if (t >= currentSheet.TimeStart && t < currentSheet.TimeStart + parseInt(Levels[currentSheet.Level]?Levels[currentSheet.Level].Settings.Duration:currentSheet.Duration)) {//TODO: Excel sheet code
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
        console.log("Update: " + timeStamp);
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
        var sheet = dummyData[inst][sheetI];
        var holder = document.createElement("div");
        table.appendChild(holder);
        //create labels
        var lvlText = document.createElement("b");
        lvlText.textContent = Levels[sheet.Level] ? Levels[sheet.Level].Name : sheet.Level;//TODO: Excel sheet code
        holder.appendChild(lvlText);
        var barcodeText = document.createElement("label");
        barcodeText.textContent = sheet.Barcode;
        holder.appendChild(barcodeText);
        var studentText = document.createElement("label");
        studentText.className = "light";
        studentText.textContent = sheet.Names.length + " Registered";
        holder.appendChild(studentText);
        var timeText = document.createElement("label");
        timeText.className = "light";
        if (Levels[sheet.Level]) {
            timeText.textContent = convertTimeReadable(sheet.TimeStart) + " - " + convertTimeReadable(sheet.TimeStart + parseInt(Levels[sheet.Level].Settings.Duration));
        } else {//TODO: Excel sheet code
            timeText.textContent = convertTimeReadable(sheet.TimeStart) + " - " + convertTimeReadable(sheet.TimeStart + sheet.Duration);
        }
        holder.appendChild(timeText);
        bindSheetClick(holder, i, s);
    }

    function bindSheetClick(div, i, s) {
        div.onclick = function () {
            sheet = dummyData[i][s];
            sheetinfo_level.textContent = Levels[sheet.Level]?Levels[sheet.Level].Name:sheet.Level;//TODO:Excel sheet code
            sheetinfo_instructor.textContent = "";
            sheetinfo_barcode.textContent = sheet.Barcode;
            clearChildren(sheetinfo_studentlist);
            sheet.Names.forEach((name) => {
                var listItem = document.createElement("li");
                listItem.textContent = name;
                sheetinfo_studentlist.appendChild(listItem);
            });
            resetloader(false, sheetinfomenu, "flex");
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
        for (var sI = 0; sI < sheets[uI].length; sI++) {
//how long the class lasts
            var dur = 0;//TODO: Code for handling Excel
            if (!isNaN(parseInt(sheets[uI][sI].Level))) {
                dur = parseInt(Levels[sheets[uI][sI].Level].Settings.Duration);
            } else {
                dur = sheets[uI][sI].Duration;
            }
            firstStart = Math.min(firstStart, sheets[uI][sI].TimeStart);
            lastEnd = Math.max(lastEnd, parseInt(sheets[uI][sI].TimeStart) + dur);
            if (spacingTimes.indexOf(dur) === -1) {
                spacingTimes.push(dur); //add duration if it does not yet exist
            }
            if (sI > 0) {//if not the first class for the instructor, calculate break with previous class
                var prevSheet = sheets[uI][sI - 1];
                var prevEnd = prevSheet.TimeStart + parseInt(Levels[prevSheet.Level]?Levels[prevSheet.Level].Settings.Duration:prevSheet.Duration);//TODO: Excel sheet code
                var spacingDur = sheets[uI][sI].TimeStart - prevEnd; //break duration
                if (spacingTimes.indexOf(spacingDur) === -1) {
                    spacingTimes.push(spacingDur); //add duration if it does not yet exist
                }
            }
        }
    }
    return {firstStart: firstStart, lastEnd: lastEnd, increment: multiGCD(spacingTimes)};
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
                displaySchedule('a');
            });
        }
    });
    document.getElementById("getMasterConfig").onclick = function () {
        navigator.clipboard.writeText(JSON.stringify({People: People, Data: dummyData}));
    };
    document.getElementById("inputMasterConfig").onclick = function () {
        var config = JSON.parse(prompt("Enter config"));
        People = config.People;
        dummyData = config.Data;
        displaySchedule('a');
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
            dummyData = [];
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
                    console.log(Class);
                    if (barcodes.indexOf(Class.Barcode) !== -1) {
                        dataArray.push(Class);
                    }
                }
                dummyData.push(dataArray);
            }
            displaySchedule('a');
            resetloader(false, null, null);
        }).catch((e) => {
            console.log(e);
            resetloader(false, null, null);
        });
    };
};
async function getCurrentSheets() {
    return await send_http_request("1/get/sheets", "", [["facility", "1622688453582"], ["timeblock", "1622917036958"], ["uid", "byuN87QwHiWMdTGfHUP7sBKH6Px1"]]);
}

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
    var hours = parseInt(matchGroups[1]);
    var mins = parseInt(matchGroups[2]);
    if (matchGroups[3].match(/am/i)) {
        return (hours * 60) + mins;
    } else {
        var extraHours = hours !== 12 ? 12 : 0;
        return ((hours + extraHours) * 60) + mins;
    }
}

function determineLevelId(LevelName) {
    for (const [id, data] of Object.entries(Levels)) {
        if (LevelName.match(new RegExp(data.Name + '(?:\\s+|$)', 'gi'))) {
            return parseInt(id);
        }
    }
    return null;
}
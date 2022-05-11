/* global firebase, initClientDatabase, clientDb */

const loadspinner = document.getElementById("loadspinner");
const sheetinfomenu = document.getElementById("sheetinfo-menu");

const mainmenu = document.getElementById("main-menu");
const close_mainmenu = document.getElementById("main-menu-close-btn");

const sheetinfo_level = document.getElementById("sheetinfo-level");
const sheetinfo_instructor = document.getElementById("sheetinfo-instructor");
const sheetinfo_barcode = document.getElementById("sheetinfo-barcode");
const sheetinfo_studentlist = document.getElementById("sheetinfo-studentlist");
const loaditms = [loadspinner, sheetinfomenu];

var dummyData = [
    [
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
    ]
];

var People = [
    {"Name": "Luke B."},
    {"Name": "Person 2."},
    {"Name": "Person 3."},
    {"Name": "Person 4."},
    {"Name": "Person 5."},
    {"Name": "Person 6."}
];

var Levels = {};
var GroupingData = [];

const scheduleTable = document.getElementById("scheduleTable");
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
        timerow.appendChild(timeLbl);
        //Handle any times to display
        for (var i = 0; i < dummyData.length; i++) {
            var isLesson = false;
            for (var s = 0; s < dummyData[i].length; s++) {
                var currentSheet = dummyData[i][s];
                if (currentSheet.TimeStart === t) {
                    isLesson = true;
                    var lessonHolder = document.createElement("td");
                    lessonHolder.rowSpan = Levels[currentSheet.Level].Settings.Duration / tableInformation.increment;
                    lessonHolder.style.backgroundColor = getLevelColor(currentSheet.Level);
                    createSheetListing(lessonHolder, i, s);
                    timerow.appendChild(lessonHolder);
                } else if (t >= currentSheet.TimeStart && t < currentSheet.TimeStart + parseInt(Levels[currentSheet.Level].Settings.Duration)) {
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

    function createSheetListing(table, inst, sheetI) {
        var sheet = dummyData[inst][sheetI];
        var holder = document.createElement("div");
        table.appendChild(holder);
        //create labels
        var lvlText = document.createElement("b");
        lvlText.textContent = Levels[sheet.Level].Name;
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
        timeText.textContent = convertTimeReadable(sheet.TimeStart) + " - " + convertTimeReadable(sheet.TimeStart + parseInt(Levels[sheet.Level].Settings.Duration));
        holder.appendChild(timeText);
        bindSheetClick(holder, i, s);
    }

    function bindSheetClick(div, i, s) {
        div.onclick = function () {
            sheet = dummyData[i][s];
            sheetinfo_level.textContent = Levels[sheet.Level].Name;
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
    var firstStart = Number.MAX_SAFE_INTEGER;//Large number for math.min, when first class starts
    var lastEnd = 0;//time the last class ends
    var spacingTimes = [];//Array of all durations in the schedule
    for (var uI = 0; uI < sheets.length; uI++) {
        sheets[uI].sort((a, b) => {//sort so we can pull prev sheet to calculate breaks
            return parseInt(a.TimeStart) - parseInt(b.TimeStart);
        });
        for (var sI = 0; sI < sheets[uI].length; sI++) {
            //how long the class lasts
            var dur = parseInt(Levels[sheets[uI][sI].Level].Settings.Duration);
            firstStart = Math.min(firstStart, sheets[uI][sI].TimeStart);
            lastEnd = Math.max(lastEnd, parseInt(sheets[uI][sI].TimeStart) + dur);
            if (spacingTimes.indexOf(dur) === -1) {
                spacingTimes.push(dur);//add duration if it does not yet exist
            }
            if (sI > 0) {//if not the first class for the instructor, calculate break with previous class
                var prevSheet = sheets[uI][sI - 1];
                var prevEnd = prevSheet.TimeStart + parseInt(Levels[prevSheet.Level].Settings.Duration);
                var spacingDur = sheets[uI][sI].TimeStart - prevEnd;//break duration
                if (spacingTimes.indexOf(spacingDur) === -1) {
                    spacingTimes.push(spacingDur);//add duration if it does not yet exist
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
            group.Regex = new RegExp(group.Regex);//get regex and convert to object
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
                dummyData[0] = JSON.parse(await getCurrentSheets());
                resetloader(false, null, null);
                displaySchedule('1622688453582---1622740460453');
            });
        }
    });
};

async function getCurrentSheets() {
    return await send_http_request("1/get/sheets", "", [["facility", "1622688453582"], ["timeblock", "1622917036958"], ["uid", "byuN87QwHiWMdTGfHUP7sBKH6Px1"]]);
}